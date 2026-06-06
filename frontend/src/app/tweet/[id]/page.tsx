'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import api from '@/lib/api'
import { useAuthStore } from '@/store/authStore'
import { BackIcon, HeartIcon, TrashIcon } from '@/components/icons'
import Avatar from '@/components/Avatar'

interface TweetUser {
  id: string
  username: string
  avatar_url: string | null
}

interface Tweet {
  id: string
  content: string
  created_at: string
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

  const [tweet, setTweet] = useState<Tweet | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [likedByMe, setLikedByMe] = useState(false)
  const [likesCount, setLikesCount] = useState(0)

  useEffect(() => {
    if (!accessToken) { router.replace('/login'); return }
    api.get(`/tweets/${id}`)
      .then((res) => {
        setTweet(res.data)
        setLikedByMe(res.data.liked_by_me)
        setLikesCount(res.data.likes_count)
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

  const isOwner = currentUser?.id === tweet?.user.id

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
        <span className="font-bold text-[17px] text-x-black">Post</span>
      </header>

      {loading && <p className="p-8 text-center text-x-gray">Cargando...</p>}

      {notFound && (
        <p className="p-8 text-center text-x-gray">Este tweet no existe o fue eliminado.</p>
      )}

      {tweet && !loading && (
        <div className="px-4 pt-3">
          <button
            onClick={() => router.push(`/users/${tweet.user.username}`)}
            className="flex items-center gap-3 mb-3 group"
          >
            <Avatar user={tweet.user} className="w-12 h-12" />
            <div className="text-left">
              <p className="font-bold text-[15px] text-x-black group-hover:underline">{tweet.user.username}</p>
              <p className="text-x-gray text-[15px]">@{tweet.user.username}</p>
            </div>
          </button>

          <p className="text-[23px] leading-relaxed whitespace-pre-wrap break-words mb-4 text-x-black">
            {tweet.content}
          </p>

          <p className="text-[15px] text-x-gray border-b border-x-border pb-4">
            {new Date(tweet.created_at).toLocaleString('es-AR', {
              hour: '2-digit', minute: '2-digit',
              day: 'numeric', month: 'long', year: 'numeric',
            })}
          </p>

          <div className="flex items-center gap-8 py-3 border-b border-x-border">
            <button
              onClick={handleLike}
              aria-label={likedByMe ? 'Quitar me gusta' : 'Me gusta'}
              className={`flex items-center gap-2 text-[15px] transition-colors group ${
                likedByMe ? 'text-x-like' : 'text-x-gray hover:text-x-like'
              }`}
            >
              <span className="p-2 -m-2 rounded-full group-hover:bg-x-like/10 transition-colors">
                <HeartIcon filled={likedByMe} className="w-5 h-5" />
              </span>
              <span className="font-semibold">{likesCount}</span>
              <span className="text-x-gray">{likesCount === 1 ? 'Me gusta' : 'Me gusta'}</span>
            </button>

            {isOwner && (
              <button
                onClick={handleDelete}
                className="flex items-center gap-2 text-x-gray hover:text-red-500 text-[15px] transition-colors group"
              >
                <span className="p-2 -m-2 rounded-full group-hover:bg-red-500/10 transition-colors">
                  <TrashIcon className="w-5 h-5" />
                </span>
                <span className="font-semibold">Eliminar</span>
              </button>
            )}
          </div>
        </div>
      )}
    </>
  )
}
