import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const { user, login, error, loading } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')

  if (user) return <Navigate to="/" replace />

  async function handleSubmit(e) {
    e.preventDefault()
    await login(username, password)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-console-bg px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <p className="mono text-sm tracking-widest text-signal-amber">TRANSITOPS</p>
          <h1 className="mt-1 text-xl font-semibold text-white">Fleet Operations Console</h1>
        </div>

        <form onSubmit={handleSubmit} className="rounded-lg bg-console-panel p-6 shadow-xl">
          {error && (
            <p className="mb-4 rounded-md border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
              {error}
            </p>
          )}

          <label className="mb-4 block">
            <span className="mb-1 block text-sm text-slate-300">Username</span>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoFocus
              required
              className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-signal-blue focus:outline-none"
              placeholder="alex.dispatcher"
            />
          </label>

          <label className="mb-6 block">
            <span className="mb-1 block text-sm text-slate-300">Password</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-signal-blue focus:outline-none"
              placeholder="••••••••"
            />
          </label>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-signal-amber px-4 py-2.5 text-sm font-semibold text-console-bg transition hover:brightness-95 disabled:opacity-60"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>

          <p className="mt-4 text-center text-xs text-slate-500">
            Accounts are pre-created by the Fleet Manager in Django admin — there's no self-signup.
          </p>
        </form>
      </div>
    </div>
  )
}
