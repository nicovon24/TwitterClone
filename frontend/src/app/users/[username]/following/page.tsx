'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import api from '@/lib/api'
import { useAuthStore } from '@/store/authStore'
import UserCard, { UserSummary } from '@/components/UserCard'
import { BackIcon } from '@/components/icons'

export default function FollowingPage() {
  const params = useParams<{ username: string }>()
  const username = params.username
  const router = useRouter()
  const accessToken = useAuthStore((s) => s.accessToken)

  const [users, setUsers] = useState<UserSummary[]>([])
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!accessToken) { router.replace('/login'); return }
    api.get(`/users/${username}/following`)
      .then((res) => {
        setUsers(res.data.users)
        setNextCursor(res.data.next_cursor)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [username, accessToken, router])

  async function loadMore() {
    if (!nextCursor) return
    const res = await api.get(`/users/${username}/following`, { params: { cursor: nextCursor } })
    setUsers((prev) => {
      const existingIds = new Set(prev.map((u) => u.id))
      const unique = res.data.users.filter((u: UserSummary) => !existingIds.has(u.id))
      return [...prev, ...unique]
    })
    setNextCursor(res.data.next_cursor)
  }

  return (
    <>
      <header className="sticky top-0 bg-x-bgblur backdrop-blur-md border-b border-x-line px-4 py-2 flex items-center gap-6 z-20">
        <button
          onClick={() => router.back()}
          aria-label="Volver"
          className="p-2 -ml-2 rounded-full text-x-black hover:bg-x-border transition-colors"
        >
          <BackIcon className="w-5 h-5" />
        </button>
        <div>
          <p className="font-bold text-[17px] text-x-black">Siguiendo</p>
          <p className="text-[13px] text-x-gray">@{username}</p>
        </div>
      </header>

      {loading && <p className="text-center p-4 text-x-gray text-sm">Cargando...</p>}

      {!loading && users.length === 0 && (
        <p className="text-center p-8 text-x-gray text-sm">
          @{username} todavía no sigue a nadie.
        </p>
      )}

      {users.map((user) => (
        <UserCard key={user.id} user={user} />
      ))}

      {nextCursor && (
        <button
          onClick={loadMore}
          className="w-full p-4 text-x-blue hover:bg-x-light text-sm font-medium transition-colors"
        >
          Cargar más
        </button>
      )}
    </>
  )
}
