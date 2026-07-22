import { useEffect, useState } from 'react'
import { maintenanceApi, vehiclesApi } from '../api/client'
import { useAuth, canWrite } from '../context/AuthContext'
import { PageHeader, Modal, EmptyState, Field, inputClass, Banner } from '../components/ui'

const EMPTY_FORM = { vehicle: '', description: '', cost: '' }

export default function Maintenance() {
  const { user } = useAuth()
  const writable = canWrite(user, 'maintenance')

  const [logs, setLogs] = useState([])
  const [vehicles, setVehicles] = useState([])
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [err, setErr] = useState('')

  useEffect(() => {
    load()
  }, [])

  async function load() {
    try {
      const [l, v] = await Promise.all([maintenanceApi.list(), vehiclesApi.list()])
      setLogs(l.data.results || l.data)
      setVehicles(v.data.results || v.data)
      setErr('')
    } catch {
      setErr('Could not load maintenance logs.')
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    try {
      await maintenanceApi.create(form)
      setModalOpen(false)
      setForm(EMPTY_FORM)
      load()
    } catch {
      setErr('Could not create maintenance record.')
    }
  }

  async function handleClose(id) {
    await maintenanceApi.close(id)
    load()
  }

  return (
    <div>
      <PageHeader
        eyebrow="Fleet Manager"
        title="Maintenance"
        action={
          writable && (
            <button onClick={() => setModalOpen(true)} className="rounded-md bg-console-bg px-4 py-2 text-sm font-medium text-white hover:brightness-110">
              + New Maintenance Record
            </button>
          )
        }
      />

      {err && <Banner>{err}</Banner>}

      {logs.length === 0 ? (
        <EmptyState label="No maintenance records" hint="Opening one automatically moves the vehicle to In Shop and hides it from dispatch." />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-400 dark:bg-slate-900 dark:text-slate-500">
              <tr>
                <th className="px-4 py-3">Vehicle</th>
                <th className="px-4 py-3">Description</th>
                <th className="px-4 py-3">Cost</th>
                <th className="px-4 py-3">Opened</th>
                <th className="px-4 py-3">Status</th>
                {writable && <th className="px-4 py-3"></th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {logs.map((log) => (
                <tr key={log.id}>
                  <td className="mono px-4 py-3 dark:text-slate-300">{log.vehicle_registration || log.vehicle}</td>
                  <td className="px-4 py-3 dark:text-slate-300">{log.description}</td>
                  <td className="mono px-4 py-3 dark:text-slate-300">₹{log.cost}</td>
                  <td className="px-4 py-3 text-slate-500 dark:text-slate-300">{new Date(log.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    {log.is_active
                      ? <span className="rounded-full border border-red-200 bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">In Shop</span>
                      : <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">Closed</span>}
                  </td>
                  {writable && (
                    <td className="px-4 py-3 text-right">
                      {log.is_active && (
                        <button onClick={() => handleClose(log.id)} className="text-signal-blue hover:underline">Close</button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="New Maintenance Record">
        <form onSubmit={handleSubmit}>
          <Field label="Vehicle">
            <select required className={inputClass} value={form.vehicle} onChange={(e) => setForm((f) => ({ ...f, vehicle: e.target.value }))}>
              <option value="">Select a vehicle…</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>{v.registration_number} — {v.model_name}</option>
              ))}
            </select>
          </Field>
          <Field label="Description">
            <input required placeholder="e.g. Oil Change" className={inputClass} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
          </Field>
          <Field label="Cost">
            <input required type="number" step="0.01" className={inputClass} value={form.cost} onChange={(e) => setForm((f) => ({ ...f, cost: e.target.value }))} />
          </Field>
          <button type="submit" className="mt-2 w-full rounded-md bg-console-bg px-4 py-2 text-sm font-medium text-white">
            Open Maintenance Record
          </button>
        </form>
      </Modal>
    </div>
  )
}
