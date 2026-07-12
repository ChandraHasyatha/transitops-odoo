import axios from 'axios'

// Person A's Django server. Override with a .env file: VITE_API_URL=http://localhost:8000
export const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const client = axios.create({
  baseURL: BASE_URL,
})

// Attach the JWT access token to every request
client.interceptors.request.use((config) => {
  const token = localStorage.getItem('access')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// If a request 401s, try one silent refresh via /api/token/refresh/ before giving up
let isRefreshing = false
let queue = []

function flushQueue(error, token = null) {
  queue.forEach(({ resolve, reject }) => {
    if (error) reject(error)
    else resolve(token)
  })
  queue = []
}

client.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config
    const refresh = localStorage.getItem('refresh')

    if (error.response?.status === 401 && refresh && !original._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          queue.push({ resolve, reject })
        }).then((token) => {
          original.headers.Authorization = `Bearer ${token}`
          return client(original)
        })
      }

      original._retry = true
      isRefreshing = true
      try {
        const { data } = await axios.post(`${BASE_URL}/api/token/refresh/`, { refresh })
        localStorage.setItem('access', data.access)
        flushQueue(null, data.access)
        original.headers.Authorization = `Bearer ${data.access}`
        return client(original)
      } catch (refreshErr) {
        flushQueue(refreshErr, null)
        localStorage.removeItem('access')
        localStorage.removeItem('refresh')
        window.location.href = '/login'
        return Promise.reject(refreshErr)
      } finally {
        isRefreshing = false
      }
    }

    return Promise.reject(error)
  }
)

export default client

// ---- Endpoint helpers, one place to keep them in sync with the backend ----

export const authApi = {
  login: (username, password) => axios.post(`${BASE_URL}/api/token/`, { username, password }),
}

export const vehiclesApi = {
  list: (params) => client.get('/api/vehicles/', { params }),
  create: (payload) => client.post('/api/vehicles/', payload),
  update: (id, payload) => client.put(`/api/vehicles/${id}/`, payload),
  remove: (id) => client.delete(`/api/vehicles/${id}/`),
}

export const driversApi = {
  list: (params) => client.get('/api/drivers/', { params }),
  create: (payload) => client.post('/api/drivers/', payload),
  update: (id, payload) => client.put(`/api/drivers/${id}/`, payload),
  remove: (id) => client.delete(`/api/drivers/${id}/`),
}

// Trip endpoints follow the same ModelViewSet + @action pattern A used for
// Maintenance (see Step 6 of the backend guide). Confirm exact paths with B;
// this is the agreed contract: create as draft, then explicit action endpoints
// for each lifecycle transition (Rules 6/7 + cancel).
export const tripsApi = {
  list: (params) => client.get('/api/trips/', { params }),
  create: (payload) => client.post('/api/trips/', payload),
  dispatch: (id) => client.post(`/api/trips/${id}/dispatch/`),
  complete: (id, payload) => client.post(`/api/trips/${id}/complete/`, payload),
  cancel: (id) => client.post(`/api/trips/${id}/cancel/`),
}

export const maintenanceApi = {
  list: (params) => client.get('/api/maintenance/', { params }),
  create: (payload) => client.post('/api/maintenance/', payload),
  close: (id) => client.post(`/api/maintenance/${id}/close/`),
}

export const fuelApi = {
  list: (params) => client.get('/api/fuel-logs/', { params }),
  create: (payload) => client.post('/api/fuel-logs/', payload),
}

export const expenseApi = {
  list: (params) => client.get('/api/expenses/', { params }),
  create: (payload) => client.post('/api/expenses/', payload),
}

export const dashboardApi = {
  get: (params) => client.get('/api/dashboard/', { params }),
}
