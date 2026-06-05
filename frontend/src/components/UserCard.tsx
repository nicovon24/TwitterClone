'use client'

import { useState } from 'react'
import Link from 'next/link'
import api from '@/lib/api'
import { useAuthStore } from '@/store/authStore'

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
    <div className="flex items-center gap-3 px-4 py-3 border-b border-x-border hover:bg-x-light transition-colors">
      <Link href={`/users/${user.username}`} className="flex items-center gap-3 flex-1 min-w-0">
        <div className="w-11 h-11 rounded-full bg-x-blue flex items-center justify-center text-white font-bold uppercase shrink-0">
          {user.username[0]}
        </div>
        <div className="min-w-0">
          <p className="font-bold text-[15px] text-x-black truncate hover:underline">
            {user.display_name ?? user.username}
          </p>
          <p className="text-x-gray text-[15px]">@{user.username}</p>
          {user.bio && <p className="text-x-gray text-sm truncate mt-0.5">{user.bio}</p>}
        </div>
      </Link>

      {!isSelf && (
        <button
          onClick={handleFollow}
          disabled={loading}
          className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-bold transition-colors border ${
            following
              ? 'border-[#cfd9de] text-x-black hover:border-red-300 hover:text-red-500 hover:bg-red-50'
              : 'bg-x-black text-white border-x-black hover:bg-black/85'
          }`}
        >
          {following ? 'Siguiendo' : 'Seguir'}
        </button>
      )}
    </div>
  )
}
