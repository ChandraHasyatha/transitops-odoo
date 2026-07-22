import { useEffect, useState } from 'react'
import { vehiclesApi } from '../api/client'
import { useAuth, canWrite } from '../context/AuthContext'
import { PageHeader, Modal, EmptyState, Field, inputClass, Banner } from '../components/ui'
import StatusBadge from '../components/StatusBadge'

const STATUS_OPTIONS = ['available', 'on_trip', 'in_shop', 'retired']

const EMPTY_FORM = {
  registration_number: '',
  model_name: '',
  vehicle_type: '',
  max_load_kg: '',
  odometer: 0,
  acquisition_cost: '',
  status: 'available',
  region: '',
}

export default function Vehicles() {
  const { user } = useAuth()
  const writable = canWrite(user, 'vehicles')

  const [vehicles, setVehicles] = useState([])
  const [filters, setFilters] = useState({ vehicle_type: '', status: '', region: '', search: '' })
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [err, setErr] = useState('')

  useEffect(() => {
    load()
  }, [filters])

  async function load() {
  try {
    const { search, ...apiFilters } = filters
    const params = Object.fromEntries(Object.entries(apiFilters).filter(([, v]) => v))
    const { data } = await vehiclesApi.list(params)
    setVehicles(data.results || data)
    setErr('')
  } catch {
    setErr('Could not load vehicles.')
  }
}

  function openCreate() {
    setEditing(null)
    setForm(EMPTY_FORM)
    setModalOpen(true)
  }

  function openEdit(v) {
    setEditing(v)
    setForm(v)
    setModalOpen(true)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    try {
      if (editing) {
        await vehiclesApi.update(editing.id, form)
      } else {
        await vehiclesApi.create(form)
      }
      setModalOpen(false)
      load()
    } catch (err) {
      setErr(
        // Rule 1: registration number must be unique — surface the server's
        // validation error rather than a generic failure.
        err.response?.data?.registration_number?.[0] ||
          'Could not save vehicle. Check the registration number is unique.'
      )
    }
  }

  async function handleDelete(id) {
    if (!confirm('Remove this vehicle?')) return
    await vehiclesApi.remove(id)
    load()
  }

  const visible = filters.search
  ? vehicles.filter(v =>
      v.registration_number.toLowerCase().includes(filters.search.toLowerCase()) ||
      v.model_name.toLowerCase().includes(filters.search.toLowerCase())
    )
  : vehicles

  return (
    <div>
      <PageHeader
        eyebrow="Fleet Manager"
        title="Vehicle Registry"
        action={
          writable && (
            <button
              onClick={openCreate}
              className="rounded-md bg-console-bg px-4 py-2 text-sm font-medium text-white hover:brightness-110"
            >
              + Add Vehicle
            </button>
          )
        }
      />

      {err && <Banner>{err}</Banner>}

      <div className="mb-4 flex flex-col gap-3 md:flex-row">
        <select
          value={filters.status}
          onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
          className={inputClass + ' w-auto bg-white'}
        >
          <option value="">All statuses</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>{s.replace('_', ' ')}</option>
          ))}
        </select>
        <input
          placeholder="Vehicle type"
          value={filters.vehicle_type}
          onChange={(e) => setFilters((f) => ({ ...f, vehicle_type: e.target.value }))}
          className={inputClass + ' w-auto bg-white'}
        />
        <input
          placeholder="Region"
          value={filters.region}
          onChange={(e) => setFilters((f) => ({ ...f, region: e.target.value }))}
          className={inputClass + ' w-auto bg-white'}
        />
        <input
          placeholder="Search registration or model..."
          value={filters.search}
          onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
          className={inputClass + ' w-auto bg-white'}
        />
      </div>

      {visible.length === 0 ? (
        <EmptyState label="No vehicles yet" hint={writable ? 'Add the first vehicle to get started.' : 'Ask a Fleet Manager to register vehicles.'} />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-4 py-3">Registration</th>
                <th className="px-4 py-3">Model</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Max Load</th>
                <th className="px-4 py-3">Odometer</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Region</th>
                {writable && <th className="px-4 py-3"></th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visible.map((v) => (
                <tr key={v.id}>
                  <td className="mono px-4 py-3 font-medium">{v.registration_number}</td>
                  <td className="px-4 py-3">{v.model_name}</td>
                  <td className="px-4 py-3">{v.vehicle_type}</td>
                  <td className="mono px-4 py-3">{v.max_load_kg} kg</td>
                  <td className="mono px-4 py-3">{v.odometer} km</td>
                  <td className="px-4 py-3"><StatusBadge status={v.status} /></td>
                  <td className="px-4 py-3">{v.region || '—'}</td>
                  {writable && (
                    <td className="space-x-3 px-4 py-3 text-right">
                      <button onClick={() => openEdit(v)} className="text-signal-blue hover:underline">Edit</button>
                      <button onClick={() => handleDelete(v.id)} className="text-signal-red hover:underline">Delete</button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Vehicle' : 'Add Vehicle'}>
        <form onSubmit={handleSubmit}>
          <Field label="Registration Number">
            <input required className={inputClass} value={form.registration_number}
              onChange={(e) => setForm((f) => ({ ...f, registration_number: e.target.value }))} />
          </Field>
          <Field label="Model">
            <input required className={inputClass} value={form.model_name}
              onChange={(e) => setForm((f) => ({ ...f, model_name: e.target.value }))} />
          </Field>
          <Field label="Vehicle Type">
            <input required className={inputClass} value={form.vehicle_type}
              onChange={(e) => setForm((f) => ({ ...f, vehicle_type: e.target.value }))} />
          </Field>
          <Field label="Max Load (kg)">
            <input required type="number" step="0.01" className={inputClass} value={form.max_load_kg}
              onChange={(e) => setForm((f) => ({ ...f, max_load_kg: e.target.value }))} />
          </Field>
          <Field label="Acquisition Cost">
            <input required type="number" step="0.01" className={inputClass} value={form.acquisition_cost}
              onChange={(e) => setForm((f) => ({ ...f, acquisition_cost: e.target.value }))} />
          </Field>
          <Field label="Region">
            <input className={inputClass} value={form.region}
              onChange={(e) => setForm((f) => ({ ...f, region: e.target.value }))} />
          </Field>
          <Field label="Status">
            <select className={inputClass} value={form.status}
              onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}>
              {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
            </select>
          </Field>
          <button type="submit" className="mt-2 w-full rounded-md bg-console-bg px-4 py-2 text-sm font-medium text-white">
            {editing ? 'Save Changes' : 'Add Vehicle'}
          </button>
        </form>
      </Modal>
    </div>
  )
}
