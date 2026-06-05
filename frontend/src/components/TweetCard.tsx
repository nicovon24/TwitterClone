'use client'

import { useRouter } from 'next/navigation'
import api from '@/lib/api'
import { useTimelineStore, Tweet } from '@/store/timelineStore'
import { HeartIcon, CommentIcon, TrashIcon } from './icons'

interface TweetCardProps {
  tweet: Tweet
  currentUserId: string | null
}

export default function TweetCard({ tweet, currentUserId }: TweetCardProps) {
  const router = useRouter()
  const { toggleLike, deleteTweet } = useTimelineStore()
  const isOwner = currentUserId !== null && tweet.user.id === currentUserId

  async function handleLike(e: React.MouseEvent) {
    e.stopPropagation()
    const newLiked = !tweet.liked_by_me
    const optimisticCount = tweet.likes_count + (newLiked ? 1 : -1)
    toggleLike(tweet.id, newLiked, optimisticCount)
    try {
      if (newLiked) {
        const { data } = await api.post(`/likes/${tweet.id}`)
        toggleLike(tweet.id, true, data.likes_count)
      } else {
        const { data } = await api.delete(`/likes/${tweet.id}`)
        toggleLike(tweet.id, false, data.likes_count)
      }
    } catch {
      toggleLike(tweet.id, tweet.liked_by_me, tweet.likes_count)
    }
  }

  async function handleDelete(e: React.MouseEvent) {
    e.stopPropagation()
    try {
      await api.delete(`/tweets/${tweet.id}`)
      deleteTweet(tweet.id)
    } catch {
      /* silently ignore */
    }
  }

  function goToProfile(e: React.MouseEvent) {
    e.stopPropagation()
    router.push(`/users/${tweet.user.username}`)
  }

  const formattedDate = new Date(tweet.created_at).toLocaleDateString('es-AR', {
    day: 'numeric',
    month: 'short',
  })

  return (
    <article
      className="border-b border-x-border dark:border-[#2f3336] px-4 py-3 flex gap-3 hover:bg-x-light dark:hover:bg-[#16181c] cursor-pointer transition-colors animate-fade-in"
      onClick={() => router.push(`/tweet/${tweet.id}`)}
      role="link"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && router.push(`/tweet/${tweet.id}`)}
    >
      <button
        onClick={goToProfile}
        className="w-10 h-10 rounded-full shrink-0 hover:opacity-90 overflow-hidden"
        aria-label={`Ver perfil de ${tweet.user.username}`}
      >
        {tweet.user.avatar_url ? (
          <img src={tweet.user.avatar_url} alt={tweet.user.username} className="w-full h-full object-cover" />
        ) : (
          <span className="w-full h-full bg-x-blue flex items-center justify-center text-white font-bold uppercase">
              {tweet.user.username[0]}
            </span>
        )}
      </button>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1 text-[15px]">
          <span
            onClick={goToProfile}
            className="font-bold text-x-black dark:text-[#e7e9ea] truncate hover:underline"
          >
            {tweet.user.display_name ?? tweet.user.username}
          </span>
          <span className="text-x-gray truncate">@{tweet.user.username}</span>
          <span className="text-x-gray">·</span>
          <span className="text-x-gray hover:underline">{formattedDate}</span>
        </div>

        <p className="mt-0.5 text-[15px] leading-normal whitespace-pre-wrap break-words text-x-black dark:text-[#e7e9ea]">
          {tweet.content}
        </p>

        {tweet.image_url && (
          <img
            src={tweet.image_url}
            alt="Imagen del tweet"
            className="mt-3 rounded-2xl border border-x-border max-h-80 w-full object-cover"
          />
        )}

        <div className="flex items-center justify-between max-w-[280px] mt-3 -ml-2">
          <button
            className="group flex items-center gap-1 text-x-gray hover:text-x-blue transition-colors"
            onClick={(e) => {
              e.stopPropagation()
              router.push(`/tweet/${tweet.id}`)
            }}
            aria-label="Responder"
          >
            <span className="p-2 rounded-full group-hover:bg-x-blue/10 transition-colors">
              <CommentIcon className="w-[18px] h-[18px]" />
            </span>
          </button>

          <button
            onClick={handleLike}
            aria-label={tweet.liked_by_me ? 'Quitar me gusta' : 'Me gusta'}
            className={`group flex items-center gap-1 transition-colors ${
              tweet.liked_by_me ? 'text-x-like' : 'text-x-gray hover:text-x-like'
            }`}
          >
            <span className="p-2 rounded-full group-hover:bg-x-like/10 transition-colors">
              <HeartIcon filled={tweet.liked_by_me} className="w-[18px] h-[18px]" />
            </span>
            {tweet.likes_count > 0 && (
              <span className="text-[13px]">{tweet.likes_count}</span>
            )}
          </button>

          {isOwner && (
            <button
              onClick={handleDelete}
              aria-label="Eliminar tweet"
              className="group flex items-center text-x-gray hover:text-red-500 transition-colors"
            >
              <span className="p-2 rounded-full group-hover:bg-red-500/10 transition-colors">
                <TrashIcon className="w-[18px] h-[18px]" />
              </span>
            </button>
          )}
        </div>
      </div>
    </article>
  )
}
