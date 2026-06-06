import { create } from 'zustand'

const THEME_KEY = 'theme'

function applyTheme(dark: boolean) {
  if (typeof document !== 'undefined') {
    document.documentElement.classList.toggle('dark', dark)
  }
}

interface ThemeState {
  isDark: boolean
  toggle: () => void
  init: () => void
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  isDark: false,

  init: () => {
    if (typeof window === 'undefined') return
    const saved = localStorage.getItem(THEME_KEY)
    const dark = saved ? saved === 'dark' : true
    applyTheme(dark)
    set({ isDark: dark })
  },

  toggle: () => {
    const next = !get().isDark
    applyTheme(next)
    localStorage.setItem(THEME_KEY, next ? 'dark' : 'light')
    set({ isDark: next })
  },
}))
