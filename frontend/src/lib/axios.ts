import axios from 'axios'

const rawBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
const normalizedBaseUrl = rawBaseUrl.replace(/\/+$/, '')
const BASE_URL = normalizedBaseUrl.endsWith('/api')
  ? normalizedBaseUrl
  : `${normalizedBaseUrl}/api`

const axiosClient = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
})

function getCookie(name: string): string | undefined {
  const match = document.cookie
    .split('; ')
    .find((c) => c.startsWith(`${name}=`))
  return match?.split('=').slice(1).join('=')
}

axiosClient.interceptors.request.use((config) => {
  const method = (config.method ?? 'get').toUpperCase()
  if (method !== 'get' && method !== 'head') {
    const csrf = getCookie('csrf_access_token')
    if (csrf) config.headers['X-CSRF-TOKEN'] = csrf
  }
  return config
})

export interface ApiError {
  error?: string
  details?: { field: string; message: string }[]
}

axiosClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const data = error.response?.data as ApiError | undefined
    const normalized = new Error(data?.error || error.message || 'Request failed')
    ;(normalized as Error & { status?: number; details?: ApiError['details'] }).status =
      error.response?.status
    ;(normalized as Error & { details?: ApiError['details'] }).details = data?.details
    return Promise.reject(normalized)
  },
)

export default axiosClient
