'use client'

import { usePathname } from 'next/navigation'
import Sidebar from './Sidebar'
import BottomNav from './BottomNav'
import RightSidebar from './RightSidebar'

const AUTH_ROUTES = ['/login', '/register']

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isAuthRoute = AUTH_ROUTES.includes(pathname)

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
    </>
  )
}
