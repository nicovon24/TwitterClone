import { create } from 'zustand'

export const ACCESS_TOKEN_KEY = 'accessToken'
export const REFRESH_TOKEN_KEY = 'refreshToken'

interface User {
  id: string
  username: string
  email: string
  displayName?: string
}

interface AuthState {
  user: User | null
  accessToken: string | null
  setAuth: (payload: { user: User; accessToken: string; refreshToken: string }) => void
  clearAuth: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken:
    typeof window !== 'undefined'
      ? localStorage.getItem(ACCESS_TOKEN_KEY)
      : null,

  setAuth({ user, accessToken, refreshToken }) {
    if (typeof window !== 'undefined') {
      localStorage.setItem(ACCESS_TOKEN_KEY, accessToken)
      localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken)
    }
    set({ user, accessToken })
  },

  clearAuth() {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(ACCESS_TOKEN_KEY)
      localStorage.removeItem(REFRESH_TOKEN_KEY)
    }
    set({ user: null, accessToken: null })
  },
}))
