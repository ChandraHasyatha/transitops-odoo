import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useDarkMode } from "../hooks/useDarkMode";
import logo from "../assets/logo.jpg";

import {
  FaTachometerAlt,
  FaTruck,
  FaUserTie,
  FaRoute,
  FaTools,
  FaGasPump,
  FaChartBar,
  FaSignOutAlt,
  FaUserCircle,
  FaIdBadge,
  FaBars,
  FaTimes,
  FaMoon,
  FaSun,
} from "react-icons/fa";

const NAV = [
  { to: "/", label: "Dashboard", icon: <FaTachometerAlt /> },
  { to: "/vehicles", label: "Vehicles", icon: <FaTruck /> },
  { to: "/drivers", label: "Drivers", icon: <FaUserTie /> },
  { to: "/trips", label: "Trips", icon: <FaRoute /> },
  { to: "/maintenance", label: "Maintenance", icon: <FaTools /> },
  { to: "/fuel-expenses", label: "Fuel & Expenses", icon: <FaGasPump /> },
  { to: "/reports", label: "Reports", icon: <FaChartBar /> },
];

const ROLE_LABEL = {
  fleet_manager: "Fleet Manager",
  dispatcher: "Dispatcher",
  safety_officer: "Safety Officer",
  financial_analyst: "Financial Analyst",
};

export default function Layout() {
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dark, setDark] = useDarkMode();

  return (
    <div className="flex min-h-screen bg-[#F5F6F8] dark:bg-slate-900">
      {/* Mobile topbar — visible below md, hidden on desktop */}
      <div className="fixed inset-x-0 top-0 z-30 flex items-center justify-between bg-console-bg px-4 py-3 text-white md:hidden">
        <div className="flex items-center gap-2">
          <img src={logo} alt="TransitOps" className="h-8 w-8 rounded-full object-cover" />
          <span className="mono text-lg font-bold tracking-widest text-amber-400">TRANSITOPS</span>
        </div>
        <button
          onClick={() => setMobileOpen(true)}
          aria-label="Open menu"
          className="rounded-md p-2 hover:bg-white/10"
        >
          <FaBars className="text-xl" />
        </button>
      </div>

      {/* Backdrop, mobile only, shown when drawer is open */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar — fixed on desktop (md+), off-canvas drawer on mobile */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 shrink-0 flex-col bg-console-bg text-slate-300 transition-transform duration-300 md:sticky md:top-0 md:h-screen md:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Close button, mobile only */}
        <button
          onClick={() => setMobileOpen(false)}
          aria-label="Close menu"
          className="absolute right-3 top-3 rounded-md p-2 text-slate-300 hover:bg-white/10 md:hidden"
        >
          <FaTimes className="text-xl" />
        </button>

        {/* Logo Section */}
        <div className="bg-gradient-to-r from-slate-800 to-blue-900 border-b border-white/10 flex flex-col items-center px-5 py-6">

          <img
            src={logo}
            alt="TransitOps"
            className="h-20 w-20 rounded-full object-cover shadow-xl mb-4"
          />

          <h1 className="mono text-2xl font-bold tracking-widest text-amber-400">
            TRANSITOPS
          </h1>

          <p className="mt-2 text-center text-sm text-slate-200">
            Fleet Operations Console
          </p>

          <div className="mt-4 h-1 w-20 rounded-full bg-amber-400"></div>

        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-2 overflow-y-auto px-3 py-4">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-4 py-3 text-base font-medium transition-all duration-300 ${
                  isActive
                    ? "bg-amber-500 text-white shadow-lg"
                    : "text-slate-400 hover:bg-white/10 hover:text-white hover:translate-x-2"
                }`
              }
            >
              <span className="text-lg">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* User Card */}
        <div className="border-t border-white/10 p-5">

          <div className="rounded-xl bg-white/5 p-4 shadow-lg">

            <div className="flex items-center gap-2">
              <FaUserCircle className="text-amber-400 text-lg" />
              <span className="text-sm text-slate-300">Username</span>
            </div>

            <p className="mt-1 text-lg font-semibold text-white">
              {user?.username}
            </p>

            <div className="mt-4 flex items-center gap-2">
              <FaIdBadge className="text-amber-400 text-lg" />
              <span className="text-sm text-slate-300">Role</span>
            </div>

            <p className="mt-1 text-base font-medium text-amber-400">
              {ROLE_LABEL[user?.role] || user?.role}
            </p>

          </div>

          <button
            onClick={() => setDark((d) => !d)}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg bg-white/10 py-3 text-white font-semibold transition hover:bg-white/20"
          >
            {dark ? <FaSun /> : <FaMoon />}
            {dark ? "Light Mode" : "Dark Mode"}
          </button>

          <button
            onClick={logout}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-red-500 py-3 text-white font-semibold transition hover:bg-red-600"
          >
            <FaSignOutAlt />
            Sign Out
          </button>

        </div>

      </aside>

      {/* Main Content — top padding on mobile clears the fixed topbar */}
      <main className="flex-1 overflow-y-auto px-4 py-6 pt-20 md:px-8 md:py-8 md:pt-8">
        <Outlet />
      </main>
    </div>
  );
}