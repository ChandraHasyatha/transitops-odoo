import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const NAV = [
  { to: '/', label: 'Dashboard', icon: '◧' },
  { to: '/vehicles', label: 'Vehicles', icon: '▢' },
  { to: '/drivers', label: 'Drivers', icon: '☺' },
  { to: '/trips', label: 'Trips', icon: '→' },
  { to: '/maintenance', label: 'Maintenance', icon: '⚙' },
  { to: '/fuel-expenses', label: 'Fuel & Expenses', icon: '⛽' },
  { to: '/reports', label: 'Reports', icon: '▤' },
]

const ROLE_LABEL = {
  fleet_manager: 'Fleet Manager',
  dispatcher: 'Dispatcher',
  safety_officer: 'Safety Officer',
  financial_analyst: 'Financial Analyst',
}

export default function Layout() {
  const { user, logout } = useAuth()

  return (
    <div className="flex min-h-screen bg-[#F5F6F8]">
      <aside className="flex w-60 shrink-0 flex-col bg-console-bg text-slate-300">
        <div className="border-b border-white/10 px-5 py-5">
          <p className="mono text-xs tracking-widest text-signal-amber">TRANSITOPS</p>
          <p className="text-xs text-slate-400">Fleet Operations Console</p>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
                  isActive
                    ? 'bg-white/10 text-white'
                    : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                }`
              }
            >
              <span className="mono w-4 text-center">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-white/10 px-5 py-4">
          <p className="text-sm font-medium text-white">{user?.username}</p>
          <p className="mono text-xs text-signal-amber">{ROLE_LABEL[user?.role] || user?.role}</p>
          <button
            onClick={logout}
            className="mt-3 text-xs text-slate-400 underline decoration-dotted hover:text-slate-200"
          >
            Sign out
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto px-8 py-8">
        <Outlet />
      </main>
    </div>
  )
}
