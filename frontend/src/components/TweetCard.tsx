'use client'

import { useRouter } from 'next/navigation'
import api from '@/lib/api'
import { useTimelineStore, Tweet } from '@/store/timelineStore'
import { HeartIcon, CommentIcon, TrashIcon } from './icons'
import Avatar from './Avatar'
import MentionText from './MentionText'

interface TweetCardProps {
  tweet: Tweet
  currentUserId: string | null
  onDelete?: (id: string) => void
  threadLineAbove?: boolean
  threadLineBelow?: boolean
}

export default function TweetCard({ tweet, currentUserId, onDelete, threadLineAbove, threadLineBelow }: TweetCardProps) {
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
      onDelete?.(tweet.id)
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
      className="relative border-b border-x-line px-4 py-3 flex items-start gap-3 hover:bg-x-card cursor-pointer transition-colors animate-fade-in"
      onClick={() => router.push(`/tweet/${tweet.id}`)}
      role="link"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && router.push(`/tweet/${tweet.id}`)}
    >
      {/* Thread connector lines anchored to article — left-9 = px-4(16px) + w-10/2(20px) = 36px */}
      {threadLineAbove && (
        <div className="absolute left-9 top-0 h-8 w-0.5 bg-x-line pointer-events-none" />
      )}
      {threadLineBelow && (
        <div className="absolute left-9 top-8 bottom-0 w-0.5 bg-x-line pointer-events-none" />
      )}
      <div className="shrink-0">
        <button
          onClick={goToProfile}
          className="hover:opacity-90"
          aria-label={`Ver perfil de ${tweet.user.username}`}
        >
          <Avatar user={tweet.user} className="w-10 h-10" />
        </button>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1 text-[15px]">
          <span
            onClick={goToProfile}
            className="font-bold text-x-fg truncate hover:underline"
          >
            {tweet.user.display_name ?? tweet.user.username}
          </span>
          <span className="text-x-muted truncate">@{tweet.user.username}</span>
          <span className="text-x-muted">·</span>
          <span className="text-x-muted hover:underline">{formattedDate}</span>
        </div>

        <MentionText content={tweet.content} />

        {tweet.image_url && (
          <img
            src={tweet.image_url}
            alt="Imagen del tweet"
            className="mt-3 rounded-2xl border border-x-line max-h-80 w-full object-cover"
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
            {tweet.replies_count > 0 && (
              <span className="text-[13px]">{tweet.replies_count}</span>
            )}
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
