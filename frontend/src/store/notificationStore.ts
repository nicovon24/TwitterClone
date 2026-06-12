import { create } from 'zustand'

export interface NotificationActor {
  id: string
  username: string
  display_name: string | null
  avatar_url: string | null
}

export interface AppNotification {
  id: string
  type: 'like' | 'follow' | 'reply' | 'mention'
  tweet_id: string | null
  read: boolean
  created_at: string
  actor: NotificationActor
  tweet?: { id: string; content: string }
}

interface NotificationState {
  notifications: AppNotification[]
  unreadCount: number
  nextCursor: string | null
  isLoading: boolean
  toastNotification: AppNotification | null
  prependNotification: (n: AppNotification) => void
  appendNotifications: (list: AppNotification[], cursor: string | null) => void
  markRead: (id: string) => void
  markAllRead: () => void
  setUnreadCount: (n: number) => void
  incrementUnread: () => void
  setToastNotification: (n: AppNotification | null) => void
  setLoading: (v: boolean) => void
  reset: () => void
}

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: [],
  unreadCount: 0,
  nextCursor: null,
  isLoading: false,
  toastNotification: null,

  prependNotification: (n) =>
    set((state) => ({
      notifications: state.notifications.some((x) => x.id === n.id)
        ? state.notifications
        : [n, ...state.notifications],
    })),

  appendNotifications: (list, cursor) =>
    set((state) => {
      const existingIds = new Set(state.notifications.map((x) => x.id))
      const unique = list.filter((x) => !existingIds.has(x.id))
      return { notifications: [...state.notifications, ...unique], nextCursor: cursor }
    }),

  markRead: (id) =>
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n,
      ),
      unreadCount: Math.max(0, state.unreadCount - 1),
    })),

  markAllRead: () =>
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, read: true })),
      unreadCount: 0,
    })),

  setUnreadCount: (n) => set({ unreadCount: n }),

  incrementUnread: () => set((state) => ({ unreadCount: state.unreadCount + 1 })),

  setToastNotification: (n) => set({ toastNotification: n }),

  setLoading: (v) => set({ isLoading: v }),

  reset: () => set({ notifications: [], unreadCount: 0, nextCursor: null, isLoading: false, toastNotification: null }),
}))
