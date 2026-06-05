'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import api from '@/lib/api'
import { useAuthStore } from '@/store/authStore'
import { HomeIcon, SearchIcon, ProfileIcon, LogoutIcon } from './icons'

export default function BottomNav() {
  const pathname = usePathname()
  const currentUser = useAuthStore((state) => state.user)
  const clearAuth = useAuthStore((state) => state.clearAuth)

  const profileHref = currentUser ? `/users/${currentUser.username}` : '/login'

  const navItems = [
    { href: '/', label: 'Inicio', Icon: HomeIcon },
    { href: '/search', label: 'Explorar', Icon: SearchIcon },
    { href: profileHref, label: 'Perfil', Icon: ProfileIcon },
  ]

  async function handleLogout() {
    try { await api.post('/auth/logout') } catch { /* best effort */ }
    clearAuth()
    window.location.assign('/login')
  }

  return (
    <nav className="flex sm:hidden fixed bottom-0 left-0 right-0 bg-white/90 dark:bg-black/90 backdrop-blur border-t border-x-border dark:border-[#2f3336] z-50">
      {navItems.map(({ href, label, Icon }) => {
        const active = pathname === href
        return (
          <Link
            key={label}
            href={href}
            aria-label={label}
            className="flex-1 flex items-center justify-center py-3.5"
          >
            <Icon
              active={active}
              className={`w-6 h-6 ${active ? 'text-x-black dark:text-[#e7e9ea]' : 'text-x-gray'}`}
            />
          </Link>
        )
      })}
      <button
        onClick={handleLogout}
        aria-label="Cerrar sesión"
        className="flex-1 flex items-center justify-center py-3.5"
      >
        <LogoutIcon className="w-6 h-6 text-x-gray" />
      </button>
    </nav>
  )
}
