import { useEffect, useState } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts'
import { dashboardApi } from '../api/client'
import { PageHeader, Banner } from '../components/ui'

const KPI_DEFS = [
  { key: 'active_vehicles', label: 'Active Vehicles' },
  { key: 'available_vehicles', label: 'Available Vehicles' },
  { key: 'vehicles_in_maintenance', label: 'In Maintenance' },
  { key: 'active_trips', label: 'Active Trips' },
  { key: 'pending_trips', label: 'Pending Trips' },
  { key: 'drivers_on_duty', label: 'Drivers On Duty' },
  { key: 'fleet_utilization_pct', label: 'Fleet Utilization', suffix: '%' },
]

const COLORS = ['#2ECC71', '#F5A524', '#EF4444']

export default function Dashboard() {
  const [data, setData] = useState(null)
  const [filters, setFilters] = useState({ vehicle_type: '', region: '' })
  const [err, setErr] = useState('')

  useEffect(() => {
    load()
  }, [filters])

  async function load() {
    try {
      const params = Object.fromEntries(Object.entries(filters).filter(([, v]) => v))
      const { data } = await dashboardApi.get(params)
      setData(data)
      setErr('')
    } catch {
      setErr('Could not load dashboard data. Is the backend running?')
    }
  }

  const pieData = data
    ? [
        { name: 'Available', value: data.available_vehicles },
        { name: 'On Trip / Active', value: data.active_vehicles - data.available_vehicles },
        { name: 'In Maintenance', value: data.vehicles_in_maintenance },
      ].filter((d) => d.value > 0)
    : []

  return (
    <div>
      <PageHeader eyebrow="Overview" title="Dashboard" />

      {err && <Banner>{err}</Banner>}

      <div className="mb-6 flex gap-3">
        <input
          placeholder="Filter by vehicle type"
          value={filters.vehicle_type}
          onChange={(e) => setFilters((f) => ({ ...f, vehicle_type: e.target.value }))}
          className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
        />
        <input
          placeholder="Filter by region"
          value={filters.region}
          onChange={(e) => setFilters((f) => ({ ...f, region: e.target.value }))}
          className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
        />
      </div>

      {!data ? (
        <p className="text-sm text-slate-400">Loading…</p>
      ) : (
        <>
          <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4">
            {KPI_DEFS.map((kpi) => (
              <div key={kpi.key} className="rounded-lg border border-slate-200 bg-white p-4">
                <p className="text-xs uppercase tracking-wide text-slate-400">{kpi.label}</p>
                <p className="mono mt-1 text-2xl font-semibold text-console-bg">
                  {data[kpi.key]}
                  {kpi.suffix || ''}
                </p>
              </div>
            ))}
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-6">
            <h2 className="mb-4 text-sm font-semibold text-slate-500">Fleet Status Breakdown</h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85}>
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
