import { useEffect, useState } from 'react'
import { driversApi } from '../api/client'
import { useAuth, canWrite } from '../context/AuthContext'
import { PageHeader, Modal, EmptyState, Field, inputClass, Banner } from '../components/ui'
import StatusBadge from '../components/StatusBadge'

const STATUS_OPTIONS = ['available', 'on_trip', 'off_duty', 'suspended']

const EMPTY_FORM = {
  name: '',
  license_number: '',
  license_category: '',
  license_expiry: '',
  contact_number: '',
  safety_score: 100,
  status: 'available',
}

function daysUntil(dateStr) {
  if (!dateStr) return null
  const diff = (new Date(dateStr) - new Date()) / (1000 * 60 * 60 * 24)
  return Math.ceil(diff)
}

export default function Drivers() {
  const { user } = useAuth()
  const writable = canWrite(user, 'drivers')

  const [drivers, setDrivers] = useState([])
  const [statusFilter, setStatusFilter] = useState('')
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [err, setErr] = useState('')

  useEffect(() => {
    load()
  }, [statusFilter])

  async function load() {
    try {
      const { data } = await driversApi.list(statusFilter ? { status: statusFilter } : {})
      setDrivers(data.results || data)
      setErr('')
    } catch {
      setErr('Could not load drivers.')
    }
  }

  function openCreate() {
    setEditing(null)
    setForm(EMPTY_FORM)
    setModalOpen(true)
  }

  function openEdit(d) {
    setEditing(d)
    setForm(d)
    setModalOpen(true)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    try {
      if (editing) await driversApi.update(editing.id, form)
      else await driversApi.create(form)
      setModalOpen(false)
      load()
    } catch (err) {
      setErr(err.response?.data?.license_number?.[0] || 'Could not save driver. Check the license number is unique.')
    }
  }

  async function handleDelete(id) {
    if (!confirm('Remove this driver?')) return
    await driversApi.remove(id)
    load()
  }

  async function suspend(d) {
    await driversApi.update(d.id, { ...d, status: 'suspended' })
    load()
  }
  const visible = search
  ? drivers.filter(d =>
      d.name.toLowerCase().includes(search.toLowerCase()) ||
      d.license_number.toLowerCase().includes(search.toLowerCase())
    )
  : drivers

  return (
    <div>
      <PageHeader
        eyebrow="Safety Officer"
        title="Driver Management"
        action={
          writable && (
            <button onClick={openCreate} className="rounded-md bg-console-bg px-4 py-2 text-sm font-medium text-white hover:brightness-110">
              + Add Driver
            </button>
          )
        }
      />

      {err && <Banner>{err}</Banner>}

      <div className="mb-4">
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={inputClass + ' w-auto bg-white'}>
          <option value="">All statuses</option>
          {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
        </select>
        <input
          placeholder="Search by name or license..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={inputClass + ' w-auto bg-white'}
        />
      </div>

      {visible.length === 0 ? (
        <EmptyState label="No drivers yet" hint={writable ? 'Add the first driver profile.' : 'Ask a Safety Officer to register drivers.'} />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-400 dark:bg-slate-900 dark:text-slate-500">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">License</th>
                <th className="px-4 py-3">Expiry</th>
                <th className="px-4 py-3">Safety Score</th>
                <th className="px-4 py-3">Status</th>
                {writable && <th className="px-4 py-3"></th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {visible.map((d) => {
                const left = daysUntil(d.license_expiry)
                const expired = left !== null && left < 0
                const expiringSoon = left !== null && left >= 0 && left <= 30
                return (
                  <tr key={d.id}>
                    <td className="px-4 py-3 font-medium dark:text-slate-200">{d.name}</td>
                    <td className="mono px-4 py-3 dark:text-slate-300">{d.license_number}</td>
                    <td className="px-4 py-3">
                      <span className={expired ? 'text-signal-red font-medium' : expiringSoon ? 'text-signal-amber font-medium' : ''}>
                        {d.license_expiry}
                      </span>
                      {expired && <span className="ml-2 text-xs text-signal-red">Expired — cannot be assigned</span>}
                      {!expired && expiringSoon && <span className="ml-2 text-xs text-signal-amber">Expires in {left}d</span>}
                    </td>
                    <td className="mono px-4 py-3 dark:text-slate-300">{d.safety_score}</td>
                    <td className="px-4 py-3"><StatusBadge status={d.status} /></td>
                    {writable && (
                      <td className="space-x-3 px-4 py-3 text-right">
                        <button onClick={() => openEdit(d)} className="text-signal-blue hover:underline">Edit</button>
                        {d.status !== 'suspended' && (
                          <button onClick={() => suspend(d)} className="text-signal-red hover:underline">Suspend</button>
                        )}
                        <button onClick={() => handleDelete(d.id)} className="text-slate-400 hover:underline">Delete</button>
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Driver' : 'Add Driver'}>
        <form onSubmit={handleSubmit}>
          <Field label="Name">
            <input required className={inputClass} value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          </Field>
          <Field label="License Number">
            <input required className={inputClass} value={form.license_number} onChange={(e) => setForm((f) => ({ ...f, license_number: e.target.value }))} />
          </Field>
          <Field label="License Category">
            <input className={inputClass} value={form.license_category} onChange={(e) => setForm((f) => ({ ...f, license_category: e.target.value }))} />
          </Field>
          <Field label="License Expiry">
            <input required type="date" className={inputClass} value={form.license_expiry} onChange={(e) => setForm((f) => ({ ...f, license_expiry: e.target.value }))} />
          </Field>
          <Field label="Contact Number">
            <input className={inputClass} value={form.contact_number} onChange={(e) => setForm((f) => ({ ...f, contact_number: e.target.value }))} />
          </Field>
          <Field label="Safety Score">
            <input type="number" min="0" max="100" className={inputClass} value={form.safety_score} onChange={(e) => setForm((f) => ({ ...f, safety_score: e.target.value }))} />
          </Field>
          <Field label="Status">
            <select className={inputClass} value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}>
              {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
            </select>
          </Field>
          <button type="submit" className="mt-2 w-full rounded-md bg-console-bg px-4 py-2 text-sm font-medium text-white">
            {editing ? 'Save Changes' : 'Add Driver'}
          </button>
        </form>
      </Modal>
    </div>
  )
}
