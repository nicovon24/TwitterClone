'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import api from '@/lib/api'
import { useAuthStore } from '@/store/authStore'
import { useNotificationStore, AppNotification } from '@/store/notificationStore'
import Avatar from '@/components/Avatar'

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })
}

function NotificationMessage({ notification }: { notification: AppNotification }) {
  const name = notification.actor.display_name ?? notification.actor.username
  const snippet = notification.tweet?.content
    ? `"${notification.tweet.content.slice(0, 60)}${notification.tweet.content.length > 60 ? '…' : ''}"`
    : ''

  switch (notification.type) {
    case 'like':
      return <><span className="font-bold text-x-fg">@{notification.actor.username}</span> le dio Me gusta a tu tweet {snippet && <span className="text-x-muted">{snippet}</span>}</>
    case 'follow':
      return <><span className="font-bold text-x-fg">@{notification.actor.username}</span> te empezó a seguir</>
    case 'reply':
      return <><span className="font-bold text-x-fg">@{notification.actor.username}</span> respondió a tu tweet {snippet && <span className="text-x-muted">{snippet}</span>}</>
    case 'mention':
      return <><span className="font-bold text-x-fg">@{notification.actor.username}</span> te mencionó {snippet && <span className="text-x-muted">{snippet}</span>}</>
    default:
      return <span className="text-x-fg">Nueva notificación</span>
  }
}

function NotificationItem({ notification, isNew }: { notification: AppNotification; isNew: boolean }) {
  const href =
    notification.type === 'follow'
      ? `/users/${notification.actor.username}`
      : notification.tweet_id
      ? `/tweet/${notification.tweet_id}`
      : '#'

  const highlight = isNew || !notification.read

  return (
    <Link
      href={href}
      className={`flex items-start gap-3 px-4 py-3 border-b border-x-line hover:bg-x-card transition-colors ${
        highlight ? 'bg-x-blue/10' : ''
      }`}
    >
      <Avatar user={notification.actor} className="w-10 h-10 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-[15px] text-x-muted leading-snug">
          <NotificationMessage notification={notification} />
        </p>
        <p className="text-[13px] text-x-muted mt-0.5">{formatDate(notification.created_at)}</p>
      </div>
      {highlight && (
        <span className="w-2 h-2 bg-x-blue rounded-full shrink-0 mt-1.5" />
      )}
    </Link>
  )
}

export default function NotificationsPage() {
  const router = useRouter()
  const accessToken = useAuthStore((state) => state.accessToken)
  const {
    notifications,
    nextCursor,
    isLoading,
    appendNotifications,
    markAllRead,
    setLoading,
  } = useNotificationStore()
  const [newIds, setNewIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!accessToken) { router.replace('/login'); return }

    async function load() {
      setLoading(true)
      try {
        const [notifRes] = await Promise.all([
          api.get('/notifications'),
          api.post('/notifications/read-all').catch(() => {}),
        ])
        const list: AppNotification[] = notifRes.data.notifications ?? []
        setNewIds(new Set(list.filter((n) => !n.read).map((n) => n.id)))
        appendNotifications(list, notifRes.data.next_cursor ?? null)
        markAllRead()
      } catch {
        // ignore
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [accessToken, router])

  async function loadMore() {
    if (!nextCursor || isLoading) return
    setLoading(true)
    try {
      const { data } = await api.get('/notifications', { params: { cursor: nextCursor } })
      appendNotifications(data.notifications ?? [], data.next_cursor ?? null)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <header className="sticky top-0 bg-x-bgblur backdrop-blur-md border-b border-x-line px-4 py-3 z-20">
        <h1 className="font-bold text-[20px] text-x-fg">Notificaciones</h1>
      </header>

      {isLoading && notifications.length === 0 && (
        <p className="p-8 text-center text-x-muted">Cargando...</p>
      )}

      {!isLoading && notifications.length === 0 && (
        <p className="p-8 text-center text-x-muted">No tenés notificaciones todavía.</p>
      )}

      <div>
        {notifications.map((n) => (
          <NotificationItem key={n.id} notification={n} isNew={newIds.has(n.id)} />
        ))}
      </div>

      {nextCursor && (
        <button
          onClick={loadMore}
          disabled={isLoading}
          className="w-full py-4 text-x-blue hover:bg-x-card transition-colors text-[15px] disabled:opacity-50"
        >
          {isLoading ? 'Cargando...' : 'Cargar más'}
        </button>
      )}
    </>
  )
}
