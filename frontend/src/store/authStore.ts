import { create } from 'zustand'

export const ACCESS_TOKEN_KEY = 'accessToken'
export const REFRESH_TOKEN_KEY = 'refreshToken'
const USER_KEY = 'user'

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

function readUser(): User | null {
  if (typeof window === 'undefined') return null
  try {
    return JSON.parse(localStorage.getItem(USER_KEY) ?? 'null')
  } catch {
    return null
  }
}

export const useAuthStore = create<AuthState>((set) => ({
  user: readUser(),
  accessToken:
    typeof window !== 'undefined'
      ? localStorage.getItem(ACCESS_TOKEN_KEY)
      : null,

  setAuth({ user, accessToken, refreshToken }) {
    if (typeof window !== 'undefined') {
      localStorage.setItem(ACCESS_TOKEN_KEY, accessToken)
      localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken)
      localStorage.setItem(USER_KEY, JSON.stringify(user))
    }
    set({ user, accessToken })
  },

  clearAuth() {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(ACCESS_TOKEN_KEY)
      localStorage.removeItem(REFRESH_TOKEN_KEY)
      localStorage.removeItem(USER_KEY)
    }
    set({ user: null, accessToken: null })
  },
}))
