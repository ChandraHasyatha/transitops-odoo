import { createContext, useContext, useEffect, useState } from 'react'
import { jwtDecode } from 'jwt-decode'
import { authApi } from '../api/client'

const AuthContext = createContext(null)

// Person A puts `role` and `username` directly in the JWT payload (Step 3 of
// the backend guide) so we never need a separate /me call.
function decodeUser(accessToken) {
  try {
    const payload = jwtDecode(accessToken)
    return { username: payload.username, role: payload.role }
  } catch {
    return null
  }
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

  async function login(username, password) {
    setLoading(true)
    setError('')
    try {
      const { data } = await authApi.login(username, password)
      localStorage.setItem('access', data.access)
      localStorage.setItem('refresh', data.refresh)
      setUser(decodeUser(data.access))
      return true
    } catch (err) {
      setError(
        err.response?.status === 401
          ? 'Incorrect username or password.'
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

  return (
    <AuthContext.Provider value={{ user, login, logout, error, loading }}>
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
