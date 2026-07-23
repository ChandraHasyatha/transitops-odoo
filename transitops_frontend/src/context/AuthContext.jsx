import { createContext, useContext, useEffect, useState } from 'react'
import { jwtDecode } from 'jwt-decode'
import { authApi, profileApi } from '../api/client'

const AuthContext = createContext(null)

// The backend puts `role`, `username`, `email`, and `full_name` directly in
// the JWT payload (see RoleTokenSerializer.get_token in core/serializers.py)
// so we never need a separate /me call.
function decodeUser(accessToken) {
  try {
    const payload = jwtDecode(accessToken)
    return {
      username: payload.username,
      role: payload.role,
      email: payload.email,
      fullName: payload.full_name,
    }
  } catch {
    return null
  }
}

// Pulls the first useful error message out of a DRF error response, whatever
// shape it comes in (field errors, {detail: [...]}, or a plain string).
function extractErrorMessage(err, fallback) {
  const data = err.response?.data
  if (!data) return fallback
  if (typeof data === 'string') return data
  const firstKey = Object.keys(data)[0]
  if (!firstKey) return fallback
  const value = data[firstKey]
  return Array.isArray(value) ? value[0] : value
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const token = localStorage.getItem('access')
    return token ? decodeUser(token) : null
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // keep state in sync if another tab logs out
    const onStorage = () => {
      const token = localStorage.getItem('access')
      setUser(token ? decodeUser(token) : null)
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  async function login(email, password) {
    setLoading(true)
    setError('')
    try {
      const { data } = await authApi.login(email, password)
      localStorage.setItem('access', data.access)
      localStorage.setItem('refresh', data.refresh)
      setUser(decodeUser(data.access))
      return true
    } catch (err) {
      setError(
        err.response
          ? extractErrorMessage(err, 'Incorrect email or password.')
          : 'Could not reach the server. Check the API is running.'
      )
      return false
    } finally {
      setLoading(false)
    }
  }

  async function register(payload) {
    setLoading(true)
    setError('')
    try {
      await authApi.register(payload)
      return true
    } catch (err) {
      setError(
        err.response
          ? extractErrorMessage(err, 'Registration failed. Please check your details.')
          : 'Could not reach the server. Check the API is running.'
      )
      return false
    } finally {
      setLoading(false)
    }
  }

  function logout() {
    localStorage.removeItem('access')
    localStorage.removeItem('refresh')
    setUser(null)
  }

  async function updateUsername(username) {
    const { data } = await profileApi.updateUsername(username)
    setUser((prev) => ({ ...prev, username: data.username }))
  }

  return (
    <AuthContext.Provider value={{ user, login, register, logout, updateUsername, error, loading, setError }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}

// Which role "owns" write access to each resource, per the problem statement's
// target-user list. Read access is broader (IsAuthenticated) — see Step 4 of
// the backend guide, which deliberately keeps GET open across roles.
export const OWNER_ROLE = {
  vehicles: 'fleet_manager',
  drivers: 'safety_officer',
  trips: 'dispatcher',
  maintenance: 'fleet_manager',
  finance: 'financial_analyst',
}

export function canWrite(user, resource) {
  return !!user && user.role === OWNER_ROLE[resource]
}

// Used by the Register page dropdown, and kept in one place so it stays in
// sync with core/models.py User.ROLE_CHOICES on the backend.
export const ROLE_OPTIONS = [
  { value: 'fleet_manager', label: 'Fleet Manager' },
  { value: 'dispatcher', label: 'Dispatcher' },
  { value: 'safety_officer', label: 'Safety Officer' },
  { value: 'financial_analyst', label: 'Financial Analyst' },
]
