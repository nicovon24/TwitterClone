'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useNotificationStore } from '@/store/notificationStore'
import { BellIcon } from './icons'

interface NotificationBellProps {
  className?: string
}

export default function NotificationBell({ className }: NotificationBellProps) {
  const pathname = usePathname()
  const unreadCount = useNotificationStore((state) => state.unreadCount)
  const active = pathname === '/notifications'
  const displayCount = unreadCount > 99 ? '99+' : unreadCount
  const iconClass = className ?? `w-7 h-7 ${unreadCount > 0 ? 'text-x-blue' : 'text-x-fg'}`

  return (
    <Link
      href="/notifications"
      aria-label={`Notificaciones${unreadCount > 0 ? `, ${displayCount} sin leer` : ''}`}
      className="relative group flex items-center gap-4 rounded-full px-3 xl:pr-6 py-3 hover:bg-x-hover transition-colors w-full"
    >
      <span className="relative shrink-0">
        <BellIcon active={active} className={iconClass} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-x-blue text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 leading-none">
            {displayCount}
          </span>
        )}
      </span>
      <span className={`hidden xl:inline text-xl text-x-fg ${active ? 'font-bold' : 'font-normal'}`}>
        Notificaciones
      </span>
    </Link>
  )
}
