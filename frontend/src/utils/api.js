import axios from 'axios'

// Ensure baseURL ends with /api for production, or just /api for local Vite proxy
let baseURL = '/api'
if (import.meta.env.VITE_API_URL) {
  baseURL = import.meta.env.VITE_API_URL
  if (!baseURL.endsWith('/api')) {
    // Remove trailing slash if it exists before adding /api
    baseURL = baseURL.replace(/\/$/, '') + '/api'
  }
}

const api = axios.create({
  baseURL
})

api.interceptors.request.use(config => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error("API Error intercepted:", error)
    if (!import.meta.env.VITE_API_URL) {
      console.warn("VITE_API_URL might be missing!")
    }
    return Promise.reject(error)
  }
)

export default api