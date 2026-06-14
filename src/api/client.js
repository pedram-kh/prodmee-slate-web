import axios from 'axios'

// Single axios instance. Base is empty in dev (Vite proxies /api), or set via
// VITE_API_BASE in production (e.g. https://api.prodmee.app).
const api = axios.create({
  baseURL: (import.meta.env.VITE_API_BASE || '') + '/api',
  headers: { Accept: 'application/json' },
})

const TOKEN_KEY = 'prodmee_token'

export function getToken() {
  return localStorage.getItem(TOKEN_KEY)
}
export function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token)
  else localStorage.removeItem(TOKEN_KEY)
}

api.interceptors.request.use((config) => {
  const token = getToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// On 401, clear the token so the router guard bounces to /login.
api.interceptors.response.use(
  (r) => r,
  (error) => {
    if (error.response && error.response.status === 401) {
      setToken(null)
      if (location.pathname !== '/login' && !location.pathname.startsWith('/share/')) {
        location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

export default api
