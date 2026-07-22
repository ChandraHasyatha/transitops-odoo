import { useEffect, useState } from 'react'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { vehiclesApi, tripsApi, fuelApi, maintenanceApi, expenseApi } from '../api/client'
import { PageHeader, EmptyState, Banner } from '../components/ui'

function buildReport({ vehicles, trips, fuelLogs, maintenanceLogs, expenses }) {
  return vehicles.map((v) => {
    const vTrips = trips.filter((t) => t.vehicle === v.id && t.status === 'completed')
    const totalDistance = vTrips.reduce((sum, t) => sum + Number(t.planned_distance_km || 0), 0)
    const totalFuelFromTrips = vTrips.reduce((sum, t) => sum + Number(t.fuel_consumed_l || 0), 0)
    const revenue = vTrips.reduce((sum, t) => sum + Number(t.revenue || 0), 0)

    const fuelCost = fuelLogs.filter((f) => f.vehicle === v.id).reduce((s, f) => s + Number(f.cost || 0), 0)
    const fuelLiters = fuelLogs.filter((f) => f.vehicle === v.id).reduce((s, f) => s + Number(f.liters || 0), 0)
    const maintenanceCost = maintenanceLogs.filter((m) => m.vehicle === v.id).reduce((s, m) => s + Number(m.cost || 0), 0)
    const otherExpenses = expenses.filter((e) => e.vehicle === v.id).reduce((s, e) => s + Number(e.amount || 0), 0)

    const fuelForEfficiency = totalFuelFromTrips || fuelLiters
    const fuelEfficiency = fuelForEfficiency > 0 ? totalDistance / fuelForEfficiency : null
    const operationalCost = fuelCost + maintenanceCost + otherExpenses
    const roi = Number(v.acquisition_cost) > 0 ? (revenue - (fuelCost + maintenanceCost)) / Number(v.acquisition_cost) : null

    return {
      registration: v.registration_number,
      status: v.status,
      fuelEfficiency,
      operationalCost,
      revenue,
      roi,
    }
  })
}

function toCSV(rows) {
  const headers = ['Registration', 'Status', 'Fuel Efficiency (km/L)', 'Operational Cost', 'Revenue', 'ROI']
  const lines = rows.map((r) =>
    [
      r.registration,
      r.status,
      r.fuelEfficiency !== null ? r.fuelEfficiency.toFixed(2) : '',
      r.operationalCost.toFixed(2),
      r.revenue.toFixed(2),
      r.roi !== null ? r.roi.toFixed(3) : '',
    ].join(',')
  )
  return [headers.join(','), ...lines].join('\n')
}

function downloadCSV(rows) {
  const blob = new Blob([toCSV(rows)], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `transitops_report_${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

function downloadPDF(rows) {
  const doc = new jsPDF()

  doc.setFontSize(14)
  doc.text('TransitOps Fleet Report', 14, 15)
  doc.setFontSize(9)
  doc.setTextColor(120)
  doc.text(`Generated ${new Date().toLocaleDateString()}`, 14, 21)

  autoTable(doc, {
    startY: 26,
    head: [['Registration', 'Status', 'Fuel Efficiency (km/L)', 'Operational Cost', 'Revenue', 'ROI']],
    body: rows.map((r) => [
      r.registration,
      r.status.replace('_', ' '),
      r.fuelEfficiency !== null ? `${r.fuelEfficiency.toFixed(2)} km/L` : '-',
      `Rs ${r.operationalCost.toFixed(2)}`,
      `Rs ${r.revenue.toFixed(2)}`,
      r.roi !== null ? r.roi.toFixed(3) : '-',
    ]),
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: [15, 23, 42] },
    alternateRowStyles: { fillColor: [248, 250, 252] },
  })

  doc.save(`transitops_report_${new Date().toISOString().slice(0, 10)}.pdf`)
}

export default function Reports() {
  const [rows, setRows] = useState([])
  const [err, setErr] = useState('')

  useEffect(() => {
    load()
  }, [])

  async function load() {
    try {
      const [v, t, f, m, e] = await Promise.all([
        vehiclesApi.list(),
        tripsApi.list(),
        fuelApi.list(),
        maintenanceApi.list(),
        expenseApi.list(),
      ])
      setRows(
        buildReport({
          vehicles: v.data.results || v.data,
          trips: t.data.results || t.data,
          fuelLogs: f.data.results || f.data,
          maintenanceLogs: m.data.results || m.data,
          expenses: e.data.results || e.data,
        })
      )
      setErr('')
    } catch {
      setErr('Could not build the report — one of the source endpoints failed.')
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="Financial Analyst"
        title="Reports & Analytics"
        action={
          rows.length > 0 && (
            <div className="flex gap-2">
              <button
                onClick={() => downloadCSV(rows)}
                className="rounded-md bg-console-bg px-4 py-2 text-sm font-medium text-white hover:brightness-110"
              >
                Export CSV
              </button>
              <button
                onClick={() => downloadPDF(rows)}
                className="rounded-md border border-white/40 px-4 py-2 text-sm font-medium text-white hover:bg-white/10"
              >
                Export PDF
              </button>
            </div>
          )
        }
      />

      {err && <Banner>{err}</Banner>}

      {rows.length === 0 ? (
        <EmptyState label="No data to report yet" hint="Reports populate once vehicles have completed trips, fuel logs, and expenses." />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-4 py-3">Vehicle</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Fuel Efficiency</th>
                <th className="px-4 py-3">Operational Cost</th>
                <th className="px-4 py-3">Revenue</th>
                <th className="px-4 py-3">ROI</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((r) => (
                <tr key={r.registration}>
                  <td className="mono px-4 py-3 font-medium">{r.registration}</td>
                  <td className="px-4 py-3 capitalize">{r.status.replace('_', ' ')}</td>
                  <td className="mono px-4 py-3">{r.fuelEfficiency !== null ? `${r.fuelEfficiency.toFixed(1)} km/L` : '—'}</td>
                  <td className="mono px-4 py-3">₹{r.operationalCost.toFixed(2)}</td>
                  <td className="mono px-4 py-3">₹{r.revenue.toFixed(2)}</td>
                  <td className={`mono px-4 py-3 font-medium ${r.roi !== null && r.roi < 0 ? 'text-signal-red' : 'text-emerald-600'}`}>
                    {r.roi !== null ? r.roi.toFixed(2) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
