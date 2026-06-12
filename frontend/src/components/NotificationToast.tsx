'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import { useNotificationStore } from '@/store/notificationStore'
import Avatar from './Avatar'
import type { AppNotification } from '@/store/notificationStore'

function toastMessage(n: AppNotification): string {
  const name = n.actor.display_name ?? n.actor.username
  switch (n.type) {
    case 'like':    return `${name} le dio Me gusta a tu tweet`
    case 'follow':  return `${name} te empezó a seguir`
    case 'reply':   return `${name} respondió a tu tweet`
    case 'mention': return `${name} te mencionó`
    default:        return 'Nueva notificación'
  }
}

function toastHref(n: AppNotification): string {
  if (n.type === 'follow') return `/users/${n.actor.username}`
  if (n.tweet_id) return `/tweet/${n.tweet_id}`
  return '/notifications'
}

export default function NotificationToast() {
  const toast = useNotificationStore((s) => s.toastNotification)
  const setToast = useNotificationStore((s) => s.setToastNotification)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!toast) return
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => setToast(null), 4000)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [toast, setToast])

  if (!toast) return null

  return (
    <Link
      href={toastHref(toast)}
      onClick={() => setToast(null)}
      className="fixed bottom-20 sm:bottom-6 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-3 bg-x-blue text-white px-4 py-3 rounded-2xl shadow-lg max-w-sm w-[calc(100%-2rem)] animate-slide-up"
    >
      <Avatar user={toast.actor} className="w-9 h-9 shrink-0 ring-2 ring-white/30" />
      <p className="text-[14px] font-medium leading-snug flex-1 min-w-0 truncate">
        {toastMessage(toast)}
      </p>
      <button
        onClick={(e) => { e.preventDefault(); setToast(null) }}
        className="shrink-0 opacity-70 hover:opacity-100 text-white text-lg leading-none"
        aria-label="Cerrar"
      >
        ✕
      </button>
    </Link>
  )
}
