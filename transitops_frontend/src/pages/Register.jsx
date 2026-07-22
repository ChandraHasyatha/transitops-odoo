import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useAuth, ROLE_OPTIONS } from '../context/AuthContext'

export default function Register() {
  const { user, register, error, loading, setError } = useAuth()
  const navigate = useNavigate()

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [role, setRole] = useState('')

  if (user) return <Navigate to="/" replace />

  async function handleSubmit(e) {
    e.preventDefault()

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }
    if (!role) {
      setError('Please select a role.')
      return
    }

    const ok = await register({
      full_name: fullName,
      email,
      password,
      confirm_password: confirmPassword,
      role,
    })

    if (ok) {
      navigate('/login', { state: { justRegistered: true } })
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-console-bg px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <p className="mono text-sm tracking-widest text-signal-amber">TRANSITOPS</p>
          <h1 className="mt-1 text-xl font-semibold text-white">Create your account</h1>
        </div>

        <form onSubmit={handleSubmit} className="rounded-lg bg-console-panel p-6 shadow-xl">
          {error && (
            <p className="mb-4 rounded-md border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
              {error}
            </p>
          )}

          <label className="mb-4 block">
            <span className="mb-1 block text-sm text-slate-300">Full Name</span>
            <input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              autoFocus
              required
              className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-signal-blue focus:outline-none"
              placeholder="Alex Kumar"
            />
          </label>

          <label className="mb-4 block">
            <span className="mb-1 block text-sm text-slate-300">Email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-signal-blue focus:outline-none"
              placeholder="alex.dispatcher@example.com"
            />
          </label>

          <label className="mb-4 block">
            <span className="mb-1 block text-sm text-slate-300">Role</span>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              required
              className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-signal-blue focus:outline-none"
            >
              <option value="" disabled className="text-slate-500">
                Select a role
              </option>
              {ROLE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value} className="bg-console-panel text-white">
                  {opt.label}
                </option>
              ))}
            </select>
          </label>

          <label className="mb-4 block">
            <span className="mb-1 block text-sm text-slate-300">Password</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-signal-blue focus:outline-none"
              placeholder="At least 8 characters"
            />
          </label>

          <label className="mb-6 block">
            <span className="mb-1 block text-sm text-slate-300">Confirm Password</span>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-signal-blue focus:outline-none"
              placeholder="Re-enter your password"
            />
          </label>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-signal-amber px-4 py-2.5 text-sm font-semibold text-console-bg transition hover:brightness-95 disabled:opacity-60"
          >
            {loading ? 'Creating account…' : 'Register'}
          </button>

          <p className="mt-4 text-center text-xs text-slate-500">
            Already have an account?{' '}
            <Link to="/login" className="text-signal-amber hover:underline">
              Sign in
            </Link>
          </p>
        </form>
      </div>
    </div>
  )
}
