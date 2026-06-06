'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import api from '@/lib/api'
import { useAuthStore } from '@/store/authStore'
import { useDebounce } from '@/hooks/useDebounce'
import { UserCardSkeleton } from '@/components/Skeletons'
import Avatar from '@/components/Avatar'

interface SearchUser {
  id: string
  username: string
  display_name: string | null
  bio: string | null
  avatar_url: string | null
  is_following: boolean
}

export default function SearchPage() {
  const router = useRouter()
  const currentUser = useAuthStore((state) => state.user)
  const accessToken = useAuthStore((state) => state.accessToken)

  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchUser[]>([])
  const [loading, setLoading] = useState(false)
  const [followingMap, setFollowingMap] = useState<Record<string, boolean>>({})

  const debouncedQuery = useDebounce(query, 300)

  useEffect(() => {
    if (!accessToken) { router.replace('/login'); return }
    // Load all users on mount
    setLoading(true)
    api.get('/search/users', { params: { q: '' } })
      .then((res) => {
        setResults(res.data.users)
        const map: Record<string, boolean> = {}
        res.data.users.forEach((u: SearchUser) => { map[u.id] = u.is_following })
        setFollowingMap(map)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken])

  useEffect(() => {
    setLoading(true)
    api.get('/search/users', { params: { q: debouncedQuery } })
      .then((res) => {
        setResults(res.data.users)
        const map: Record<string, boolean> = {}
        res.data.users.forEach((u: SearchUser) => { map[u.id] = u.is_following })
        setFollowingMap(map)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [debouncedQuery])

  async function handleFollow(user: SearchUser) {
    const currently = followingMap[user.id] ?? false
    setFollowingMap((m) => ({ ...m, [user.id]: !currently }))
    try {
      if (currently) {
        await api.delete(`/follows/${user.username}`)
      } else {
        await api.post(`/follows/${user.username}`)
      }
    } catch {
      setFollowingMap((m) => ({ ...m, [user.id]: currently }))
    }
  }

  return (
    <>
      <header className="sticky top-0 bg-x-bgblur backdrop-blur-md border-b border-x-line px-4 py-3 z-20">
        <div className="flex items-center gap-3 bg-x-card rounded-full px-4 py-2.5 border border-transparent focus-within:border-x-blue transition-colors">
          <svg viewBox="0 0 24 24" className="w-5 h-5 text-x-muted shrink-0" fill="currentColor" aria-hidden>
            <path d="M21.53 20.47l-3.66-3.66C19.195 15.24 20 13.214 20 11c0-4.97-4.03-9-9-9s-9 4.03-9 9 4.03 9 9 9c2.215 0 4.24-.804 5.808-2.13l3.66 3.66c.147.146.34.22.53.22s.385-.073.53-.22c.295-.293.295-.767.002-1.06zM3.5 11c0-4.135 3.365-7.5 7.5-7.5s7.5 3.365 7.5 7.5-3.365 7.5-7.5 7.5-7.5-3.365-7.5-7.5z" />
          </svg>
          <input
            type="text"
            placeholder="Buscar usuarios"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-transparent text-x-fg text-[15px] focus:outline-none placeholder-x-muted"
          />
        </div>
      </header>

      <div>
        {!loading && results.length > 0 && (
          <p className="px-4 py-3 text-[17px] font-bold text-x-fg border-b border-x-line">
            {debouncedQuery.trim() ? 'Resultados' : 'Usuarios'}
          </p>
        )}

        {loading && (
          <>
            <UserCardSkeleton />
            <UserCardSkeleton />
            <UserCardSkeleton />
          </>
        )}

        {!loading && results.length === 0 && debouncedQuery.trim().length > 0 && (
          <p className="text-center p-8 text-x-gray text-sm">
            Sin resultados para &ldquo;{debouncedQuery}&rdquo;
          </p>
        )}

        {!loading && results.length === 0 && debouncedQuery.trim().length === 0 && (
          <p className="text-center p-8 text-x-gray text-sm">No hay usuarios para mostrar.</p>
        )}

        {results.map((user) => {
          const isSelf = currentUser?.id === user.id
          const following = followingMap[user.id] ?? user.is_following
          return (
            <div key={user.id} className="flex items-center gap-3 px-4 py-3 border-b border-x-line hover:bg-x-card transition-colors">
              <Link href={`/users/${user.username}`} className="flex items-center gap-3 flex-1 min-w-0">
                <Avatar user={user} className="w-11 h-11 shrink-0" />
                <div className="min-w-0">
                  <p className="font-bold text-[15px] text-x-fg truncate hover:underline">{user.display_name ?? user.username}</p>
                  <p className="text-x-muted text-[15px]">@{user.username}</p>
                  {user.bio && <p className="text-x-muted text-sm truncate mt-0.5">{user.bio}</p>}
                </div>
              </Link>
              {!isSelf && (
                <button
                  onClick={() => handleFollow(user)}
                  className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-bold border transition-colors ${
                    following
                      ? 'border-x-line text-x-fg hover:border-red-400 hover:text-red-500 hover:bg-red-500/10'
                      : 'bg-x-solid text-x-solidfg border-x-solid hover:opacity-90'
                  }`}
                >
                  {following ? 'Siguiendo' : 'Seguir'}
                </button>
              )}
            </div>
          )
        })}
      </div>
    </>
  )
}
