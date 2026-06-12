'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import api from '@/lib/api'
import { useAuthStore } from '@/store/authStore'
import { BackIcon, HeartIcon, TrashIcon, CommentIcon } from '@/components/icons'
import Avatar from '@/components/Avatar'
import MentionText from '@/components/MentionText'
import ReplyComposer from '@/components/ReplyComposer'
import TweetCard from '@/components/TweetCard'
import { Tweet } from '@/store/timelineStore'

interface TweetUser {
  id: string
  username: string
  display_name: string | null
  avatar_url: string | null
}

interface TweetDetail {
  id: string
  content: string
  image_url: string | null
  created_at: string
  parent_tweet_id: string | null
  replies_count: number
  user: TweetUser
  likes_count: number
  liked_by_me: boolean
}

export default function TweetDetailPage() {
  const params = useParams<{ id: string }>()
  const id = params.id
  const router = useRouter()
  const currentUser = useAuthStore((state) => state.user)
  const accessToken = useAuthStore((state) => state.accessToken)

  const [tweet, setTweet] = useState<TweetDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [likedByMe, setLikedByMe] = useState(false)
  const [likesCount, setLikesCount] = useState(0)
  const [replies, setReplies] = useState<Tweet[]>([])
  const [repliesLoading, setRepliesLoading] = useState(false)

  useEffect(() => {
    if (!accessToken) { router.replace('/login'); return }

    Promise.all([
      api.get(`/tweets/${id}`),
      api.get(`/tweets/${id}/replies`).catch(() => ({ data: { tweets: [] } })),
    ])
      .then(([tweetRes, repliesRes]) => {
        setTweet(tweetRes.data)
        setLikedByMe(tweetRes.data.liked_by_me)
        setLikesCount(tweetRes.data.likes_count)
        setReplies(repliesRes.data.tweets ?? [])
      })
      .catch((err) => {
        if (err.response?.status === 404) setNotFound(true)
      })
      .finally(() => setLoading(false))
  }, [id, accessToken, router])

  async function handleLike() {
    if (!tweet) return
    const newLiked = !likedByMe
    setLikedByMe(newLiked)
    setLikesCount((c) => c + (newLiked ? 1 : -1))
    try {
      if (newLiked) {
        const { data } = await api.post(`/likes/${tweet.id}`)
        setLikesCount(data.likes_count)
      } else {
        const { data } = await api.delete(`/likes/${tweet.id}`)
        setLikesCount(data.likes_count)
      }
    } catch {
      setLikedByMe(!newLiked)
      setLikesCount((c) => c + (!newLiked ? 1 : -1))
    }
  }

  async function handleDelete() {
    if (!tweet) return
    try {
      await api.delete(`/tweets/${tweet.id}`)
      router.back()
    } catch {
      // silently ignore
    }
  }

  function handleReplyPosted(newTweet: Tweet) {
    setReplies((prev) => [newTweet, ...prev])
    if (tweet) {
      setTweet({ ...tweet, replies_count: (tweet.replies_count ?? 0) + 1 })
    }
  }

  const isOwner = currentUser?.id === tweet?.user.id

  return (
    <>
      <header className="sticky top-0 bg-x-bgblur backdrop-blur-md border-b border-x-line px-4 py-2 flex items-center gap-6 z-20">
        <button
          onClick={() => router.back()}
          aria-label="Volver"
          className="p-2 -ml-2 rounded-full text-x-fg hover:bg-x-hover transition-colors"
        >
          <BackIcon className="w-5 h-5" />
        </button>
        <span className="font-bold text-[17px] text-x-fg">Post</span>
      </header>

      {loading && <p className="p-8 text-center text-x-muted">Cargando...</p>}

      {notFound && (
        <p className="p-8 text-center text-x-muted">Este tweet no existe o fue eliminado.</p>
      )}

      {tweet && !loading && (
        <>
          <div className="px-4 pt-3">
            {/* Author row with thread connector below avatar when replies exist */}
            <div className="flex gap-3 mb-3">
              <button
                onClick={() => router.push(`/users/${tweet.user.username}`)}
                className="hover:opacity-90 shrink-0"
                aria-label={`Ver perfil de ${tweet.user.username}`}
              >
                <Avatar user={tweet.user} className="w-12 h-12" />
              </button>
              <button
                onClick={() => router.push(`/users/${tweet.user.username}`)}
                className="flex flex-col justify-center text-left group"
              >
                <p className="font-bold text-[15px] text-x-fg group-hover:underline leading-tight">
                  {tweet.user.display_name ?? tweet.user.username}
                </p>
                <p className="text-x-muted text-[15px]">@{tweet.user.username}</p>
              </button>
            </div>

            <MentionText
              content={tweet.content}
              className="text-[23px] leading-relaxed whitespace-pre-wrap break-words mb-4 text-x-fg"
            />

            {tweet.image_url && (
              <img
                src={tweet.image_url}
                alt="Imagen del tweet"
                className="mt-3 rounded-2xl border border-x-line max-h-96 w-full object-cover"
              />
            )}

            <p className="text-[15px] text-x-muted border-b border-x-line pb-4 mt-4">
              {new Date(tweet.created_at).toLocaleString('es-AR', {
                hour: '2-digit', minute: '2-digit',
                day: 'numeric', month: 'long', year: 'numeric',
              })}
            </p>

            <div className="flex items-center gap-8 py-3 border-b border-x-line">
              {replies.length > 0 && (
                <div className="flex items-center gap-2 text-[15px] text-x-muted">
                  <CommentIcon className="w-5 h-5" />
                  <span>
                    <span className="font-semibold text-x-fg">{tweet.replies_count}</span>
                    {' '}Respuestas
                  </span>
                </div>
              )}
              <button
                onClick={handleLike}
                aria-label={likedByMe ? 'Quitar me gusta' : 'Me gusta'}
                className={`flex items-center gap-2 text-[15px] transition-colors group ${
                  likedByMe ? 'text-x-like' : 'text-x-muted hover:text-x-like'
                }`}
              >
                <span className="p-2 -m-2 rounded-full group-hover:bg-x-like/10 transition-colors">
                  <HeartIcon filled={likedByMe} className="w-5 h-5" />
                </span>
                <span className="font-semibold">{likesCount}</span>
                <span className="text-x-muted">Me gusta</span>
              </button>

              {isOwner && (
                <button
                  onClick={handleDelete}
                  className="flex items-center gap-2 text-x-muted hover:text-red-500 text-[15px] transition-colors group"
                >
                  <span className="p-2 -m-2 rounded-full group-hover:bg-red-500/10 transition-colors">
                    <TrashIcon className="w-5 h-5" />
                  </span>
                  <span className="font-semibold">Eliminar</span>
                </button>
              )}
            </div>
          </div>

          {currentUser && (
            <ReplyComposer
              parentTweetId={tweet.id}
              onReplyPosted={handleReplyPosted}
            />
          )}

          <div>
            {replies.map((reply, index) => (
              <TweetCard
                key={reply.id}
                tweet={reply}
                currentUserId={currentUser?.id ?? null}
                threadLineAbove={index > 0}
                threadLineBelow={index < replies.length - 1}
              />
            ))}
          </div>
        </>
      )}
    </>
  )
}
