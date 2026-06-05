'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import api from '@/lib/api'
import { useAuthStore } from '@/store/authStore'
import { useThemeStore } from '@/store/themeStore'
import {
  LogoIcon,
  HomeIcon,
  SearchIcon,
  ProfileIcon,
  LogoutIcon,
} from './icons'

export default function Sidebar() {
  const pathname = usePathname()
  const currentUser = useAuthStore((state) => state.user)
  const clearAuth = useAuthStore((state) => state.clearAuth)
  const { isDark, toggle: toggleTheme } = useThemeStore()

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
    <header className="hidden sm:flex flex-col items-center xl:items-start h-screen sticky top-0 px-2 xl:px-4 w-[88px] xl:w-[275px] shrink-0 dark:bg-black">
      {/* Logo */}
      <Link
        href="/"
        className="flex items-center justify-center w-12 h-12 rounded-full hover:bg-x-border transition-colors my-1"
        aria-label="Inicio"
      >
        <LogoIcon className="w-7 h-7 text-x-black dark:text-[#e7e9ea]" />
      </Link>

      {/* Nav */}
      <nav className="flex flex-col gap-1 mt-1 w-full items-center xl:items-start">
        {navItems.map(({ href, label, Icon }) => {
          const active = pathname === href
          return (
            <Link
              key={label}
              href={href}
              className="group flex items-center gap-4 rounded-full px-3 xl:pr-6 py-3 hover:bg-x-border dark:hover:bg-[#2f3336] transition-colors"
            >
              <Icon active={active} className="w-7 h-7 text-x-black dark:text-[#e7e9ea]" />
              <span
                className={`hidden xl:inline text-xl text-x-black dark:text-[#e7e9ea] ${
                  active ? 'font-bold' : 'font-normal'
                }`}
              >
                {label}
              </span>
            </Link>
          )
        })}
      </nav>

      {/* Post button */}
      <Link
        href="/"
        className="bg-x-black dark:bg-white text-white dark:text-x-black font-bold rounded-full mt-4 transition-colors hover:bg-black/80 dark:hover:bg-white/90 w-12 h-12 xl:w-full xl:h-auto xl:py-3.5 flex items-center justify-center text-lg"
      >
        <span className="hidden xl:inline">Postear</span>
        <span className="xl:hidden text-2xl leading-none">+</span>
      </Link>

      {/* Dark mode toggle */}
      <button
        onClick={toggleTheme}
        aria-label={isDark ? 'Activar modo claro' : 'Activar modo oscuro'}
        className="flex items-center gap-4 rounded-full px-3 xl:pr-6 py-3 hover:bg-x-border dark:hover:bg-[#2f3336] transition-colors w-full justify-center xl:justify-start"
      >
        {isDark ? (
          <svg viewBox="0 0 24 24" className="w-7 h-7 text-x-black dark:text-[#e7e9ea]" fill="currentColor" aria-hidden>
            <path d="M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zM2 13h2c.55 0 1-.45 1-1s-.45-1-1-1H2c-.55 0-1 .45-1 1s.45 1 1 1zm18 0h2c.55 0 1-.45 1-1s-.45-1-1-1h-2c-.55 0-1 .45-1 1s.45 1 1 1zM11 2v2c0 .55.45 1 1 1s1-.45 1-1V2c0-.55-.45-1-1-1s-1 .45-1 1zm0 18v2c0 .55.45 1 1 1s1-.45 1-1v-2c0-.55-.45-1-1-1s-1 .45-1 1zM5.99 4.58c-.39-.39-1.03-.39-1.41 0-.39.39-.39 1.03 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0s.39-1.03 0-1.41L5.99 4.58zm12.37 12.37c-.39-.39-1.03-.39-1.41 0-.39.39-.39 1.03 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0 .39-.39.39-1.03 0-1.41l-1.06-1.06zm1.06-12.37l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06c.39-.39.39-1.03 0-1.41s-1.03-.39-1.41 0zM7.05 18.36l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06c.39-.39.39-1.03 0-1.41s-1.03-.39-1.41 0z" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" className="w-7 h-7 text-x-black" fill="currentColor" aria-hidden>
            <path d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9 9-4.03 9-9c0-.46-.04-.92-.1-1.36-.98 1.37-2.58 2.26-4.4 2.26-2.98 0-5.4-2.42-5.4-5.4 0-1.81.89-3.42 2.26-4.4-.44-.06-.9-.1-1.36-.1z" />
          </svg>
        )}
      </button>

      {/* Account chip */}
      {currentUser && (
        <button
          onClick={handleLogout}
          className="mt-auto mb-3 flex items-center gap-3 rounded-full p-2 xl:p-3 hover:bg-x-border dark:hover:bg-[#2f3336] transition-colors w-full"
          title="Cerrar sesión"
        >
          <div className="w-10 h-10 rounded-full bg-x-blue flex items-center justify-center text-white font-bold uppercase shrink-0">
            {currentUser.username[0]}
          </div>
          <div className="hidden xl:flex flex-col items-start min-w-0 flex-1">
            <span className="font-bold text-sm text-x-black dark:text-[#e7e9ea] truncate max-w-[140px]">
              {currentUser.username}
            </span>
            <span className="text-x-gray text-sm truncate max-w-[140px]">
              @{currentUser.username}
            </span>
          </div>
          <LogoutIcon className="hidden xl:block w-5 h-5 text-x-gray shrink-0" />
        </button>
      )}
    </header>
  )
}
