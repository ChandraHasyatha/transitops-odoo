import { useEffect, useState } from 'react'
import { tripsApi, vehiclesApi, driversApi } from '../api/client'
import { useAuth, canWrite } from '../context/AuthContext'
import { PageHeader, Modal, EmptyState, Field, inputClass, Banner } from '../components/ui'
import StatusBadge from '../components/StatusBadge'

const EMPTY_FORM = {
  source: '',
  destination: '',
  vehicle: '',
  driver: '',
  cargo_weight_kg: '',
  planned_distance_km: '',
}

function licenseExpired(driver) {
  return driver.license_expiry && new Date(driver.license_expiry) < new Date()
}

export default function Trips() {
  const { user } = useAuth()
  const writable = canWrite(user, 'trips')

  const [trips, setTrips] = useState([])
  const [vehicles, setVehicles] = useState([])
  const [drivers, setDrivers] = useState([])
  const [modalOpen, setModalOpen] = useState(false)
  const [completeTarget, setCompleteTarget] = useState(null)
  const [completeForm, setCompleteForm] = useState({ final_odometer: '', fuel_consumed_l: '' })
  const [form, setForm] = useState(EMPTY_FORM)
  const [err, setErr] = useState('')
  const [search, setSearch] = useState('')

  useEffect(() => {
    load()
  }, [])

  async function load() {
    try {
      const [t, v, d] = await Promise.all([
        tripsApi.list(),
        vehiclesApi.list({ status: 'available' }),
        driversApi.list({ status: 'available' }),
      ])
      setTrips(t.data.results || t.data)
      setVehicles(v.data.results || v.data)
      // Rule 3: exclude expired/suspended drivers from the assignment pool
      setDrivers((d.data.results || d.data).filter((dr) => !licenseExpired(dr)))
      setErr('')
    } catch {
      setErr('Could not load trips. Confirm the Trip endpoints are live (see B).')
    }
  }

  function openCreate() {
    setForm(EMPTY_FORM)
    setModalOpen(true)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const vehicle = vehicles.find((v) => String(v.id) === String(form.vehicle))
    // Rule 5 client-side pre-check; the server is the source of truth
    if (vehicle && Number(form.cargo_weight_kg) > Number(vehicle.max_load_kg)) {
      setErr(`Cargo (${form.cargo_weight_kg}kg) exceeds ${vehicle.registration_number}'s capacity (${vehicle.max_load_kg}kg).`)
      return
    }
    try {
      await tripsApi.create(form)
      setModalOpen(false)
      load()
    } catch (err) {
      setErr(err.response?.data?.detail || 'Could not create trip — check the business rules (capacity, availability, license).')
    }
  }

  async function handleDispatch(id) {
    try {
      await tripsApi.dispatch(id)
      load()
    } catch (err) {
      setErr(err.response?.data?.detail || 'Could not dispatch trip.')
    }
  }

  async function handleCancel(id) {
    if (!confirm('Cancel this trip? Vehicle and driver will be restored to Available.')) return
    await tripsApi.cancel(id)
    load()
  }

  function openComplete(trip) {
    setCompleteTarget(trip)
    setCompleteForm({ final_odometer: '', fuel_consumed_l: '' })
  }

  async function handleComplete(e) {
    e.preventDefault()
    try {
      await tripsApi.complete(completeTarget.id, completeForm)
      setCompleteTarget(null)
      load()
    } catch (err) {
      setErr(err.response?.data?.detail || 'Could not complete trip.')
    }
  }

  const visible = search
  ? trips.filter(t =>
      t.source.toLowerCase().includes(search.toLowerCase()) ||
      t.destination.toLowerCase().includes(search.toLowerCase())
    )
  : trips

  return (
    <div>
      <PageHeader
        eyebrow="Dispatcher"
        title="Trip Management"
        action={
          writable && (
            <button onClick={openCreate} className="rounded-md bg-console-bg px-4 py-2 text-sm font-medium text-white hover:brightness-110">
              + Create Trip
            </button>
          )
        }
      />

      {err && <Banner>{err}</Banner>}
      <div className="mb-4">
        <input
          placeholder="Search by source or destination..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={inputClass + ' w-auto bg-white'}
        />
      </div>
      {visible.length === 0 ? (
        <EmptyState label="No trips yet" hint={writable ? 'Create the first trip.' : 'Ask a Dispatcher to create a trip.'} />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-400 dark:bg-slate-900 dark:text-slate-500">
              <tr>
                <th className="px-4 py-3">Route</th>
                <th className="px-4 py-3">Vehicle</th>
                <th className="px-4 py-3">Driver</th>
                <th className="px-4 py-3">Cargo</th>
                <th className="px-4 py-3">Distance</th>
                <th className="px-4 py-3">Status</th>
                {writable && <th className="px-4 py-3"></th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {visible.map((t) => (
                <tr key={t.id}>
                  <td className="px-4 py-3 dark:text-slate-300">{t.source} → {t.destination}</td>
                  <td className="mono px-4 py-3 dark:text-slate-300">{t.vehicle_registration || t.vehicle}</td>
                  <td className="px-4 py-3 dark:text-slate-300">{t.driver_name || t.driver}</td>
                  <td className="mono px-4 py-3 dark:text-slate-300">{t.cargo_weight_kg} kg</td>
                  <td className="mono px-4 py-3 dark:text-slate-300">{t.planned_distance_km} km</td>
                  <td className="px-4 py-3"><StatusBadge status={t.status} /></td>
                  {writable && (
                    <td className="space-x-3 px-4 py-3 text-right">
                      {t.status === 'draft' && (
                        <button onClick={() => handleDispatch(t.id)} className="text-signal-blue hover:underline">Dispatch</button>
                      )}
                      {t.status === 'dispatched' && (
                        <>
                          <button onClick={() => openComplete(t)} className="text-emerald-600 hover:underline">Complete</button>
                          <button onClick={() => handleCancel(t.id)} className="text-signal-red hover:underline">Cancel</button>
                        </>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Create Trip">
        <form onSubmit={handleSubmit}>
          <Field label="Source">
            <input required className={inputClass} value={form.source} onChange={(e) => setForm((f) => ({ ...f, source: e.target.value }))} />
          </Field>
          <Field label="Destination">
            <input required className={inputClass} value={form.destination} onChange={(e) => setForm((f) => ({ ...f, destination: e.target.value }))} />
          </Field>
          <Field label="Vehicle (available only)">
            <select required className={inputClass} value={form.vehicle} onChange={(e) => setForm((f) => ({ ...f, vehicle: e.target.value }))}>
              <option value="">Select a vehicle…</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>{v.registration_number} — {v.model_name} (max {v.max_load_kg}kg)</option>
              ))}
            </select>
          </Field>
          <Field label="Driver (available, licensed only)">
            <select required className={inputClass} value={form.driver} onChange={(e) => setForm((f) => ({ ...f, driver: e.target.value }))}>
              <option value="">Select a driver…</option>
              {drivers.map((d) => (
                <option key={d.id} value={d.id}>{d.name} — license {d.license_number}</option>
              ))}
            </select>
          </Field>
          <Field label="Cargo Weight (kg)">
            <input required type="number" step="0.01" className={inputClass} value={form.cargo_weight_kg} onChange={(e) => setForm((f) => ({ ...f, cargo_weight_kg: e.target.value }))} />
          </Field>
          <Field label="Planned Distance (km)">
            <input required type="number" step="0.01" className={inputClass} value={form.planned_distance_km} onChange={(e) => setForm((f) => ({ ...f, planned_distance_km: e.target.value }))} />
          </Field>
          <button type="submit" className="mt-2 w-full rounded-md bg-console-bg px-4 py-2 text-sm font-medium text-white">
            Create Trip (Draft)
          </button>
        </form>
      </Modal>

      <Modal open={!!completeTarget} onClose={() => setCompleteTarget(null)} title={`Complete Trip: ${completeTarget?.source} → ${completeTarget?.destination}`}>
        <form onSubmit={handleComplete}>
          <Field label="Final Odometer (km)">
            <input required type="number" step="0.01" className={inputClass} value={completeForm.final_odometer}
              onChange={(e) => setCompleteForm((f) => ({ ...f, final_odometer: e.target.value }))} />
          </Field>
          <Field label="Fuel Consumed (L)">
            <input required type="number" step="0.01" className={inputClass} value={completeForm.fuel_consumed_l}
              onChange={(e) => setCompleteForm((f) => ({ ...f, fuel_consumed_l: e.target.value }))} />
          </Field>
          <button type="submit" className="mt-2 w-full rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white">
            Mark Completed
          </button>
        </form>
      </Modal>
    </div>
  )
}
