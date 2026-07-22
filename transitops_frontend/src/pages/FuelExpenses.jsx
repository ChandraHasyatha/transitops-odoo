import { useEffect, useState } from 'react'
import { fuelApi, expenseApi, vehiclesApi } from '../api/client'
import { PageHeader, Modal, EmptyState, Field, inputClass, Banner } from '../components/ui'

const EXPENSE_CATEGORIES = ['toll', 'repair', 'other']

export default function FuelExpenses() {
  const [fuelLogs, setFuelLogs] = useState([])
  const [expenses, setExpenses] = useState([])
  const [vehicles, setVehicles] = useState([])
  const [fuelModal, setFuelModal] = useState(false)
  const [expenseModal, setExpenseModal] = useState(false)
  const [fuelForm, setFuelForm] = useState({ vehicle: '', liters: '', cost: '', date: '' })
  const [expenseForm, setExpenseForm] = useState({ vehicle: '', category: 'toll', amount: '', date: '' })
  const [err, setErr] = useState('')

  useEffect(() => {
    load()
  }, [])

  async function load() {
    try {
      const [f, e, v] = await Promise.all([fuelApi.list(), expenseApi.list(), vehiclesApi.list()])
      setFuelLogs(f.data.results || f.data)
      setExpenses(e.data.results || e.data)
      setVehicles(v.data.results || v.data)
      setErr('')
    } catch {
      setErr('Could not load fuel logs and expenses.')
    }
  }

  async function submitFuel(e) {
    e.preventDefault()
    await fuelApi.create(fuelForm)
    setFuelModal(false)
    setFuelForm({ vehicle: '', liters: '', cost: '', date: '' })
    load()
  }

  async function submitExpense(e) {
    e.preventDefault()
    await expenseApi.create(expenseForm)
    setExpenseModal(false)
    setExpenseForm({ vehicle: '', category: 'toll', amount: '', date: '' })
    load()
  }

  const vehicleLabel = (id) => vehicles.find((v) => v.id === id)?.registration_number || id

  return (
    <div>
      <PageHeader eyebrow="Financial Analyst" title="Fuel & Expense Tracking" />
      {err && <Banner>{err}</Banner>}

      <div className="grid gap-8 lg:grid-cols-2">
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-500">Fuel Logs</h2>
            <button onClick={() => setFuelModal(true)} className="text-sm font-medium text-signal-blue hover:underline">+ Log Fuel</button>
          </div>
          {fuelLogs.length === 0 ? (
            <EmptyState label="No fuel logs yet" />
          ) : (
            <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-400">
                  <tr><th className="px-4 py-3">Vehicle</th><th className="px-4 py-3">Liters</th><th className="px-4 py-3">Cost</th><th className="px-4 py-3">Date</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {fuelLogs.map((f) => (
                    <tr key={f.id}>
                      <td className="mono px-4 py-3">{f.vehicle_registration || vehicleLabel(f.vehicle)}</td>
                      <td className="mono px-4 py-3">{f.liters} L</td>
                      <td className="mono px-4 py-3">₹{f.cost}</td>
                      <td className="px-4 py-3 text-slate-500">{f.date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-500">Other Expenses</h2>
            <button onClick={() => setExpenseModal(true)} className="text-sm font-medium text-signal-blue hover:underline">+ Log Expense</button>
          </div>
          {expenses.length === 0 ? (
            <EmptyState label="No expenses yet" />
          ) : (
            <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-400">
                  <tr><th className="px-4 py-3">Vehicle</th><th className="px-4 py-3">Category</th><th className="px-4 py-3">Amount</th><th className="px-4 py-3">Date</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {expenses.map((e) => (
                    <tr key={e.id}>
                      <td className="mono px-4 py-3">{e.vehicle_registration || vehicleLabel(e.vehicle)}</td>
                      <td className="px-4 py-3 capitalize">{e.category}</td>
                      <td className="mono px-4 py-3">₹{e.amount}</td>
                      <td className="px-4 py-3 text-slate-500">{e.date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      <Modal open={fuelModal} onClose={() => setFuelModal(false)} title="Log Fuel">
        <form onSubmit={submitFuel}>
          <Field label="Vehicle">
            <select required className={inputClass} value={fuelForm.vehicle} onChange={(e) => setFuelForm((f) => ({ ...f, vehicle: e.target.value }))}>
              <option value="">Select a vehicle…</option>
              {vehicles.map((v) => <option key={v.id} value={v.id}>{v.registration_number}</option>)}
            </select>
          </Field>
          <Field label="Liters"><input required type="number" step="0.01" className={inputClass} value={fuelForm.liters} onChange={(e) => setFuelForm((f) => ({ ...f, liters: e.target.value }))} /></Field>
          <Field label="Cost"><input required type="number" step="0.01" className={inputClass} value={fuelForm.cost} onChange={(e) => setFuelForm((f) => ({ ...f, cost: e.target.value }))} /></Field>
          <Field label="Date"><input required type="date" className={inputClass} value={fuelForm.date} onChange={(e) => setFuelForm((f) => ({ ...f, date: e.target.value }))} /></Field>
          <button type="submit" className="mt-2 w-full rounded-md bg-console-bg px-4 py-2 text-sm font-medium text-white">Save Fuel Log</button>
        </form>
      </Modal>

      <Modal open={expenseModal} onClose={() => setExpenseModal(false)} title="Log Expense">
        <form onSubmit={submitExpense}>
          <Field label="Vehicle">
            <select required className={inputClass} value={expenseForm.vehicle} onChange={(e) => setExpenseForm((f) => ({ ...f, vehicle: e.target.value }))}>
              <option value="">Select a vehicle…</option>
              {vehicles.map((v) => <option key={v.id} value={v.id}>{v.registration_number}</option>)}
            </select>
          </Field>
          <Field label="Category">
            <select className={inputClass} value={expenseForm.category} onChange={(e) => setExpenseForm((f) => ({ ...f, category: e.target.value }))}>
              {EXPENSE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="Amount"><input required type="number" step="0.01" className={inputClass} value={expenseForm.amount} onChange={(e) => setExpenseForm((f) => ({ ...f, amount: e.target.value }))} /></Field>
          <Field label="Date"><input required type="date" className={inputClass} value={expenseForm.date} onChange={(e) => setExpenseForm((f) => ({ ...f, date: e.target.value }))} /></Field>
          <button type="submit" className="mt-2 w-full rounded-md bg-console-bg px-4 py-2 text-sm font-medium text-white">Save Expense</button>
        </form>
      </Modal>
    </div>
  )
}
