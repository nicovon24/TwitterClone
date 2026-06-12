'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import Sidebar from './Sidebar'
import BottomNav from './BottomNav'
import RightSidebar from './RightSidebar'
import NotificationToast from './NotificationToast'

const AUTH_ROUTES = ['/login', '/register']

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isAuthRoute = AUTH_ROUTES.includes(pathname)

  // Auth state is read from localStorage, which only exists on the client.
  // Defer rendering until after mount so the first client render matches the
  // server-rendered HTML and React doesn't throw a hydration error (#423).
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  if (!mounted) return null

  if (isAuthRoute) {
    return <>{children}</>
  }

  return (
    <>
      <div className="flex justify-center min-h-screen mx-auto max-w-[1300px]">
        <Sidebar />
        <main className="w-full max-w-[600px] border-x border-x-line min-h-screen pb-16 sm:pb-0">
          {children}
        </main>
        <RightSidebar />
      </div>
      <BottomNav />
      <NotificationToast />
    </>
  )
}
