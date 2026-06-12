'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import api from '@/lib/api'
import { useAuthStore } from '@/store/authStore'
import Avatar from './Avatar'
import {
  LogoIcon,
  HomeIcon,
  SearchIcon,
  ProfileIcon,
  LogoutIcon,
} from './icons'
import NotificationBell from './NotificationBell'

export default function Sidebar() {
  const pathname = usePathname()
  const currentUser = useAuthStore((state) => state.user)
  const clearAuth = useAuthStore((state) => state.clearAuth)

  async function handleLogout() {
    try {
      await api.post('/auth/logout')
    } catch {
      /* best effort */
    }
    clearAuth()
    window.location.assign('/login')
  }

  const profileHref = currentUser ? `/users/${currentUser.username}` : '/login'

  const navItems = [
    { href: '/', label: 'Inicio', Icon: HomeIcon },
    { href: '/search', label: 'Explorar', Icon: SearchIcon },
    { href: profileHref, label: 'Perfil', Icon: ProfileIcon },
  ]

  return (
    <header className="hidden sm:flex flex-col items-center xl:items-start h-screen sticky top-0 px-2 xl:px-4 w-[88px] xl:w-[275px] shrink-0">
      {/* Logo */}
      <Link
        href="/"
        className="flex items-center justify-center w-12 h-12 rounded-full hover:bg-x-hover transition-colors my-1"
        aria-label="Inicio"
      >
        <LogoIcon className="w-7 h-7 text-x-fg" />
      </Link>

      {/* Nav */}
      <nav className="flex flex-col gap-1 mt-1 w-full items-center xl:items-start">
        {navItems.map(({ href, label, Icon }) => {
          const active = pathname === href
          return (
            <Link
              key={label}
              href={href}
              className="group flex items-center gap-4 rounded-full px-3 xl:pr-6 py-3 hover:bg-x-hover transition-colors"
            >
              <Icon active={active} className="w-7 h-7 text-x-fg" />
              <span
                className={`hidden xl:inline text-xl text-x-fg ${
                  active ? 'font-bold' : 'font-normal'
                }`}
              >
                {label}
              </span>
            </Link>
          )
        })}
        <NotificationBell />
      </nav>

      {/* Post button */}
      <Link
        href="/"
        className="bg-x-solid text-x-solidfg font-bold rounded-full mt-4 transition-opacity hover:opacity-90 w-12 h-12 xl:w-full xl:h-auto xl:py-3.5 flex items-center justify-center text-lg"
      >
        <span className="hidden xl:inline">Postear</span>
        <span className="xl:hidden text-2xl leading-none">+</span>
      </Link>

      {/* Account chip */}
      {currentUser && (
        <div className="mt-auto mb-3 flex items-center gap-3 rounded-full p-2 xl:p-3 w-full">
          <Link
            href={profileHref}
            className="flex items-center gap-3 min-w-0 flex-1 rounded-full hover:bg-x-hover transition-colors p-1 -m-1"
          >
          <Avatar user={currentUser} className="w-10 h-10 shrink-0" />
            <div className="hidden xl:flex flex-col items-start min-w-0">
              <span className="font-bold text-sm text-x-fg truncate max-w-[140px]">
                {currentUser.username}
              </span>
              <span className="text-x-muted text-sm truncate max-w-[140px]">
                @{currentUser.username}
              </span>
            </div>
          </Link>
          <button
            onClick={handleLogout}
            className="hidden xl:flex items-center justify-center shrink-0 rounded-full p-2 hover:bg-x-hover transition-colors"
            aria-label="Cerrar sesión"
            title="Cerrar sesión"
          >
            <LogoutIcon className="w-5 h-5 text-x-muted" />
          </button>
        </div>
      )}
    </header>
  )
}
