'use client'

import { useState } from 'react'
import Link from 'next/link'
import api from '@/lib/api'
import { useAuthStore } from '@/store/authStore'
import Avatar from './Avatar'

export interface UserSummary {
  id: string
  username: string
  display_name: string | null
  bio: string | null
  avatar_url: string | null
  is_following: boolean
}

interface UserCardProps {
  user: UserSummary
}

export default function UserCard({ user }: UserCardProps) {
  const currentUserId = useAuthStore((s) => s.user?.id)
  const isSelf = currentUserId === user.id

  const [following, setFollowing] = useState(user.is_following)
  const [loading, setLoading] = useState(false)

  async function handleFollow(e: React.MouseEvent) {
    e.stopPropagation()
    e.preventDefault()
    setLoading(true)
    const prev = following
    setFollowing(!prev)
    try {
      if (prev) {
        await api.delete(`/follows/${user.username}`)
      } else {
        await api.post(`/follows/${user.username}`)
      }
    } catch {
      setFollowing(prev)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-x-line hover:bg-x-card transition-colors">
      <Link href={`/users/${user.username}`} className="flex items-center gap-3 flex-1 min-w-0">
        <Avatar user={user} className="w-11 h-11 shrink-0" />
        <div className="min-w-0">
          <p className="font-bold text-[15px] text-x-fg truncate hover:underline">
            {user.display_name ?? user.username}
          </p>
          <p className="text-x-muted text-[15px]">@{user.username}</p>
          {user.bio && <p className="text-x-muted text-sm truncate mt-0.5">{user.bio}</p>}
        </div>
      </Link>

      {!isSelf && (
        <button
          onClick={handleFollow}
          disabled={loading}
          className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-bold transition-colors border ${
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
}
