'use client'

import { useEffect, useRef } from 'react'
import api from '@/lib/api'
import { useTimelineStore } from '@/store/timelineStore'
import { useAuthStore } from '@/store/authStore'
import TweetCard from './TweetCard'
import { TweetSkeleton } from './Skeletons'

type Feed = 'for-you' | 'following'

export default function Timeline({ feed = 'for-you' }: { feed?: Feed }) {
  const { tweets, nextCursor, isLoading, appendTweets, setLoading, reset } = useTimelineStore()
  const user = useAuthStore((state) => state.user)
  const sentinelRef = useRef<HTMLDivElement>(null)
  const isFetchingRef = useRef(false)

  async function fetchPage(cursor?: string) {
    if (isFetchingRef.current) return
    isFetchingRef.current = true
    setLoading(true)
    try {
      const params: Record<string, string> = { feed }
      if (cursor) params.cursor = cursor
      const { data } = await api.get('/timeline', { params })
      appendTweets(data.tweets, data.next_cursor)
    } catch {
      // silently ignore — next scroll will retry
    } finally {
      setLoading(false)
      isFetchingRef.current = false
    }
  }

  useEffect(() => {
    reset()
    isFetchingRef.current = false
    fetchPage()
    return () => { reset() }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feed])

  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && nextCursor && !isLoading) {
          fetchPage(nextCursor)
        }
      },
      { threshold: 0.1 },
    )

    observer.observe(sentinel)
    return () => observer.disconnect()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nextCursor, isLoading])

  return (
    <div>
      {tweets.map((tweet) => (
        <TweetCard key={tweet.id} tweet={tweet} currentUserId={user?.id ?? null} />
      ))}

      {isLoading && tweets.length === 0 && (
        <>
          <TweetSkeleton />
          <TweetSkeleton />
          <TweetSkeleton />
        </>
      )}

      {!isLoading && tweets.length === 0 && (
        <p className="text-center p-8 text-x-gray text-sm">
          {feed === 'following'
            ? 'Todavía no sigues a nadie. ¡Seguí cuentas para ver sus tweets acá!'
            : 'Todavía no hay tweets. ¡Sé el primero en postear!'}
        </p>
      )}

      {!isLoading && nextCursor === null && tweets.length > 0 && (
        <p className="text-center p-4 text-x-gray text-sm">No hay más tweets</p>
      )}

      <div ref={sentinelRef} className="h-4" />
    </div>
  )
}
