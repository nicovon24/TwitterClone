'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import api from '@/lib/api'
import { useAuthStore } from '@/store/authStore'
import { useThemeStore } from '@/store/themeStore'
import { BackIcon } from '@/components/icons'
import Avatar from '@/components/Avatar'
import TweetCard from '@/components/TweetCard'
import type { Tweet } from '@/store/timelineStore'
import { ProfileSkeleton } from '@/components/Skeletons'

interface UserProfile {
  id: string
  username: string
  display_name: string | null
  bio: string | null
  avatar_url: string | null
  followers_count: number
  following_count: number
  tweets_count: number
  is_following: boolean
}

export default function UserProfilePage() {
  const params = useParams<{ username: string }>()
  const username = params.username
  const router = useRouter()
  const currentUser = useAuthStore((state) => state.user)
  const accessToken = useAuthStore((state) => state.accessToken)
  const clearAuth = useAuthStore((state) => state.clearAuth)
  const { isDark, toggle: toggleTheme } = useThemeStore()

  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [tweets, setTweets] = useState<Tweet[]>([])
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [isFollowing, setIsFollowing] = useState(false)
  const [loadingFollow, setLoadingFollow] = useState(false)
  const [notFound, setNotFound] = useState(false)

  // Edit modal
  const [editOpen, setEditOpen] = useState(false)
  const [editDisplayName, setEditDisplayName] = useState('')
  const [editBio, setEditBio] = useState('')
  const [editLoading, setEditLoading] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)

  // Delete confirmation
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)

  useEffect(() => {
    if (!accessToken) { router.replace('/login'); return }
    api.get(`/users/${username}`)
      .then((res) => {
        setProfile(res.data)
        setIsFollowing(res.data.is_following)
      })
      .catch((err) => {
        if (err.response?.status === 404) setNotFound(true)
      })
    api.get(`/users/${username}/tweets`)
      .then((res) => {
        setTweets(res.data.tweets)
        setNextCursor(res.data.next_cursor)
      })
      .catch(() => {})
  }, [username, accessToken, router])

  async function handleFollow() {
    if (!profile) return
    setLoadingFollow(true)
    try {
      if (isFollowing) {
        await api.delete(`/follows/${profile.username}`)
        setIsFollowing(false)
        setProfile((p) => p ? { ...p, followers_count: p.followers_count - 1 } : p)
      } else {
        await api.post(`/follows/${profile.username}`)
        setIsFollowing(true)
        setProfile((p) => p ? { ...p, followers_count: p.followers_count + 1 } : p)
      }
    } catch {
      // silently ignore
    } finally {
      setLoadingFollow(false)
    }
  }

  async function loadMore() {
    if (!nextCursor) return
    try {
      const res = await api.get(`/users/${username}/tweets`, { params: { cursor: nextCursor } })
      setTweets((prev) => [...prev, ...res.data.tweets])
      setNextCursor(res.data.next_cursor)
    } catch {
      // silently ignore
    }
  }

  function openEdit() {
    setEditDisplayName(profile?.display_name ?? '')
    setEditBio(profile?.bio ?? '')
    setEditError(null)
    setEditOpen(true)
  }

  async function handleEditSave() {
    setEditLoading(true)
    setEditError(null)
    try {
      const { data } = await api.patch('/users/me', {
        display_name: editDisplayName.trim() || null,
        bio: editBio.trim() || null,
      })
      setProfile((p) => p ? { ...p, ...data } : p)
      setEditOpen(false)
    } catch {
      setEditError('No se pudo guardar los cambios. Intentá de nuevo.')
    } finally {
      setEditLoading(false)
    }
  }

  async function handleDeleteAccount() {
    setDeleteLoading(true)
    try {
      await api.delete('/users/me')
      clearAuth()
      router.replace('/login')
    } catch {
      setDeleteLoading(false)
      setDeleteConfirm(false)
    }
  }

  const isOwnProfile = currentUser?.username === username

  if (notFound) {
    return <div className="p-8 text-center text-x-gray">Usuario no encontrado.</div>
  }

  if (!profile) {
    return <ProfileSkeleton />
  }

  return (
    <>
      <header className="sticky top-0 bg-x-bgblur backdrop-blur-md border-b border-x-border dark:border-[#2f3336] px-4 py-2 flex items-center gap-6 z-20">
        <button
          onClick={() => router.back()}
          aria-label="Volver"
          className="p-2 -ml-2 rounded-full text-x-black hover:bg-x-border transition-colors"
        >
          <BackIcon className="w-5 h-5" />
        </button>
        <div>
          <p className="font-bold text-[17px] text-x-black dark:text-[#e7e9ea] leading-tight">{profile.display_name ?? profile.username}</p>
          <p className="text-[13px] text-x-gray">{profile.tweets_count} posts</p>
        </div>
      </header>

      {/* Banner */}
      <div className="h-32 sm:h-44 bg-gradient-to-r from-x-blue/80 to-black" />

      {/* Profile header */}
      <div className="px-4 pb-3 border-b border-x-border dark:border-[#2f3336]">
        <div className="flex items-end justify-between -mt-10 sm:-mt-12">
          <div className="rounded-full ring-4 ring-white dark:ring-[#181a1b] shrink-0">
            <Avatar user={profile} className="w-20 h-20 sm:w-28 sm:h-28" />
          </div>

          {isOwnProfile ? (
            <div className="flex items-center gap-2 mb-1">
              <button
                onClick={toggleTheme}
                aria-label={isDark ? 'Activar modo claro' : 'Activar modo oscuro'}
                title={isDark ? 'Activar modo claro' : 'Activar modo oscuro'}
                className="w-9 h-9 flex items-center justify-center rounded-full border border-[#cfd9de] dark:border-[#2f3336] text-x-black dark:text-[#e7e9ea] hover:bg-x-light dark:hover:bg-[#2f3336] transition-colors"
              >
                {isDark ? (
                  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor" aria-hidden>
                    <path d="M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zM2 13h2c.55 0 1-.45 1-1s-.45-1-1-1H2c-.55 0-1 .45-1 1s.45 1 1 1zm18 0h2c.55 0 1-.45 1-1s-.45-1-1-1h-2c-.55 0-1 .45-1 1s.45 1 1 1zM11 2v2c0 .55.45 1 1 1s1-.45 1-1V2c0-.55-.45-1-1-1s-1 .45-1 1zm0 18v2c0 .55.45 1 1 1s1-.45 1-1v-2c0-.55-.45-1-1-1s-1 .45-1 1zM5.99 4.58c-.39-.39-1.03-.39-1.41 0-.39.39-.39 1.03 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0s.39-1.03 0-1.41L5.99 4.58zm12.37 12.37c-.39-.39-1.03-.39-1.41 0-.39.39-.39 1.03 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0 .39-.39.39-1.03 0-1.41l-1.06-1.06zm1.06-12.37l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06c.39-.39.39-1.03 0-1.41s-1.03-.39-1.41 0zM7.05 18.36l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06c.39-.39.39-1.03 0-1.41s-1.03-.39-1.41 0z" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor" aria-hidden>
                    <path d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9 9-4.03 9-9c0-.46-.04-.92-.1-1.36-.98 1.37-2.58 2.26-4.4 2.26-2.98 0-5.4-2.42-5.4-5.4 0-1.81.89-3.42 2.26-4.4-.44-.06-.9-.1-1.36-.1z" />
                  </svg>
                )}
              </button>
              <button
                onClick={openEdit}
                className="rounded-full px-4 py-1.5 text-sm font-bold border border-[#cfd9de] dark:border-[#2f3336] text-x-black dark:text-[#e7e9ea] hover:bg-x-light dark:hover:bg-[#2f3336] transition-colors"
              >
                Editar perfil
              </button>
            </div>
          ) : (
            <button
              onClick={handleFollow}
              disabled={loadingFollow}
              className={`rounded-full px-5 py-2 text-[15px] font-bold transition-colors border mb-1 ${
                isFollowing
                  ? 'border-x-line text-x-fg hover:border-red-400 hover:text-red-500 hover:bg-red-500/10'
                  : 'bg-x-solid text-x-solidfg border-x-solid hover:opacity-90'
              }`}
            >
              {isFollowing ? 'Siguiendo' : 'Seguir'}
            </button>
          )}
        </div>

        <div className="mt-3">
          <p className="font-extrabold text-xl text-x-black dark:text-[#e7e9ea] leading-tight">{profile.display_name ?? profile.username}</p>
          <p className="text-x-gray text-[15px]">@{profile.username}</p>
          {profile.bio && <p className="mt-3 text-[15px] text-x-black dark:text-[#e7e9ea] whitespace-pre-wrap">{profile.bio}</p>}
        </div>

        <div className="flex gap-5 mt-3 text-[15px]">
          <Link href={`/users/${username}/following`} className="hover:underline">
            <span className="font-bold text-x-black dark:text-[#e7e9ea]">{profile.following_count}</span>{' '}
            <span className="text-x-gray">Siguiendo</span>
          </Link>
          <Link href={`/users/${username}/followers`} className="hover:underline">
            <span className="font-bold text-x-black dark:text-[#e7e9ea]">{profile.followers_count}</span>{' '}
            <span className="text-x-gray">Seguidores</span>
          </Link>
        </div>
      </div>

      {/* Tweets */}
      <div>
        {tweets.map((tweet) => (
          <TweetCard key={tweet.id} tweet={tweet} currentUserId={currentUser?.id ?? null} />
        ))}

        {tweets.length === 0 && (
          <p className="text-center p-8 text-x-gray text-sm">
            @{username} todavía no publicó tweets.
          </p>
        )}

        {nextCursor && (
          <button
            onClick={loadMore}
            className="w-full p-4 text-x-blue hover:bg-x-light text-sm font-medium transition-colors"
          >
            Cargar más
          </button>
        )}
      </div>

      {/* Edit profile modal */}
      {editOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white dark:bg-[#16181c] rounded-2xl w-full max-w-md mx-4 p-6 shadow-xl">
            <h2 className="text-[20px] font-bold text-x-black dark:text-[#e7e9ea] mb-4">Editar perfil</h2>

            <label className="block text-sm font-bold text-x-black dark:text-[#e7e9ea] mb-1">Nombre</label>
            <input
              value={editDisplayName}
              onChange={(e) => setEditDisplayName(e.target.value)}
              maxLength={100}
              placeholder={profile.username}
              className="w-full border border-x-border dark:border-[#2f3336] bg-white dark:bg-[#16181c] text-x-black dark:text-[#e7e9ea] rounded-lg px-3 py-2 text-[15px] focus:outline-none focus:border-x-blue mb-3"
            />

            <label className="block text-sm font-bold text-x-black dark:text-[#e7e9ea] mb-1">Bio</label>
            <textarea
              value={editBio}
              onChange={(e) => setEditBio(e.target.value)}
              maxLength={160}
              rows={3}
              placeholder="Contá algo sobre vos"
              className="w-full border border-x-border dark:border-[#2f3336] bg-white dark:bg-[#16181c] text-x-black dark:text-[#e7e9ea] rounded-lg px-3 py-2 text-[15px] focus:outline-none focus:border-x-blue resize-none"
            />

            {editError && <p className="text-sm text-red-500 mt-2">{editError}</p>}

            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => setEditOpen(false)}
                className="px-4 py-2 rounded-full text-sm font-bold border border-x-border text-x-black hover:bg-x-light transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleEditSave}
                disabled={editLoading}
                className="px-5 py-2 rounded-full text-sm font-bold bg-x-solid text-x-solidfg hover:opacity-90 disabled:opacity-50 transition-opacity"
              >
                {editLoading ? 'Guardando...' : 'Guardar'}
              </button>
            </div>

            <div className="mt-6 pt-4 border-t border-x-border">
              <button
                onClick={() => { setEditOpen(false); setDeleteConfirm(true) }}
                className="text-sm font-bold text-red-500 hover:underline"
              >
                Eliminar cuenta
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white dark:bg-[#16181c] rounded-2xl w-full max-w-sm mx-4 p-6 shadow-xl">
            <h2 className="text-[20px] font-bold text-x-black dark:text-[#e7e9ea] mb-2">¿Eliminar cuenta?</h2>
            <p className="text-[15px] text-x-gray mb-6">Esta acción no se puede deshacer. Todos tus tweets y datos serán eliminados.</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteConfirm(false)}
                className="px-4 py-2 rounded-full text-sm font-bold border border-x-border text-x-black hover:bg-x-light transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleteLoading}
                className="px-5 py-2 rounded-full text-sm font-bold bg-red-500 text-white hover:bg-red-600 disabled:opacity-50 transition-colors"
              >
                {deleteLoading ? 'Eliminando...' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
