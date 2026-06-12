'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import api from '@/lib/api'
import { useAuthStore } from '@/store/authStore'
import { useNotificationStore } from '@/store/notificationStore'
import { HomeIcon, SearchIcon, ProfileIcon, LogoutIcon, BellIcon } from './icons'

export default function BottomNav() {
  const pathname = usePathname()
  const currentUser = useAuthStore((state) => state.user)
  const clearAuth = useAuthStore((state) => state.clearAuth)
  const unreadCount = useNotificationStore((state) => state.unreadCount)

  const profileHref = currentUser ? `/users/${currentUser.username}` : '/login'

  const navItems = [
    { href: '/', label: 'Inicio', Icon: HomeIcon },
    { href: '/search', label: 'Explorar', Icon: SearchIcon },
    { href: '/notifications', label: 'Notificaciones', Icon: BellIcon, badge: unreadCount },
    { href: profileHref, label: 'Perfil', Icon: ProfileIcon },
  ]

  async function handleLogout() {
    try { await api.post('/auth/logout') } catch { /* best effort */ }
    clearAuth()
    window.location.assign('/login')
  }

  return (
    <nav className="flex sm:hidden fixed bottom-0 left-0 right-0 bg-x-bgblur backdrop-blur border-t border-x-line z-50">
      {navItems.map(({ href, label, Icon, badge }) => {
        const active = pathname === href
        return (
          <Link
            key={label}
            href={href}
            aria-label={label}
            className="flex-1 flex items-center justify-center py-3.5"
          >
            <span className="relative">
              <Icon
                active={active}
                className={`w-6 h-6 ${active ? 'text-x-fg' : badge && badge > 0 ? 'text-x-blue' : 'text-x-muted'}`}
              />
              {badge && badge > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[16px] h-[16px] bg-x-blue text-white text-[9px] font-bold rounded-full flex items-center justify-center px-0.5 leading-none">
                  {badge > 99 ? '99+' : badge}
                </span>
              )}
            </span>
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
