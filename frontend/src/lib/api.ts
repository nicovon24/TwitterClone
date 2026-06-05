import axios from 'axios'
import { ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY, useAuthStore } from '@/store/authStore'

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
})

// Attach Authorization header from localStorage on every request (SSR-safe)
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem(ACCESS_TOKEN_KEY)
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
  }
  return config
})

// On 401, attempt a silent token refresh once, then retry the original request.
// On refresh failure, clear tokens and redirect to /login.
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config as typeof error.config & { _retry?: boolean }

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true

      const refreshToken =
        typeof window !== 'undefined'
          ? localStorage.getItem(REFRESH_TOKEN_KEY)
          : null

      if (refreshToken) {
        try {
          // Use a bare axios call (not the instance) to avoid interceptor recursion
          const { data } = await axios.post(
            `${process.env.NEXT_PUBLIC_API_URL}/auth/refresh`,
            { refreshToken },
          )

          const newAccessToken: string = data.accessToken

          if (typeof window !== 'undefined') {
            localStorage.setItem(ACCESS_TOKEN_KEY, newAccessToken)
          }
          // Keep the Zustand store in sync with the refreshed token
          useAuthStore.setState({ accessToken: newAccessToken })

          originalRequest.headers = originalRequest.headers ?? {}
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`

          return api(originalRequest)
        } catch {
          // Refresh failed — clear tokens and force re-login
          useAuthStore.getState().clearAuth()
          if (typeof window !== 'undefined') {
            window.location.assign('/login')
          }
        }
      } else {
        // No refresh token available — clear and redirect
        useAuthStore.getState().clearAuth()
        if (typeof window !== 'undefined') {
          window.location.assign('/login')
        }
      }
    }

    return Promise.reject(error)
  },
)

export default api
