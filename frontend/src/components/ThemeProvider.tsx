'use client'

import { useEffect } from 'react'
import { useThemeStore } from '@/store/themeStore'

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  const init = useThemeStore((s) => s.init)
  useEffect(() => { init() }, [init])
  return <>{children}</>
}
