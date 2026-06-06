'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/authStore'
import { useTimelineStream } from '@/hooks/useTimelineStream'
import TweetComposer from '@/components/TweetComposer'
import Timeline from '@/components/Timeline'

type Feed = 'for-you' | 'following'

export default function HomePage() {
  const router = useRouter()
  const accessToken = useAuthStore((state) => state.accessToken)
  const [feed, setFeed] = useState<Feed>('for-you')

  useTimelineStream()

  useEffect(() => {
    if (!accessToken) {
      router.replace('/login')
    }
  }, [accessToken, router])

  if (!accessToken) {
    return <p className="p-4 text-x-gray">Cargando...</p>
  }

  return (
    <>
      <header className="sticky top-0 bg-x-bgblur backdrop-blur-md border-b border-x-line z-20">
        <div className="flex">
          <button
            type="button"
            onClick={() => setFeed('for-you')}
            className="flex-1 flex items-center justify-center py-4 hover:bg-x-hover transition-colors cursor-pointer relative"
          >
            <span className={`text-[15px] ${feed === 'for-you' ? 'font-bold text-x-fg' : 'font-medium text-x-muted'}`}>
              Para ti
            </span>
            {feed === 'for-you' && (
              <span className="absolute bottom-0 h-1 w-14 bg-x-blue rounded-full" />
            )}
          </button>
          <button
            type="button"
            onClick={() => setFeed('following')}
            className="flex-1 flex items-center justify-center py-4 hover:bg-x-hover transition-colors cursor-pointer relative"
          >
            <span className={`text-[15px] ${feed === 'following' ? 'font-bold text-x-fg' : 'font-medium text-x-muted'}`}>
              Siguiendo
            </span>
            {feed === 'following' && (
              <span className="absolute bottom-0 h-1 w-14 bg-x-blue rounded-full" />
            )}
          </button>
        </div>
      </header>
      <TweetComposer />
      <Timeline feed={feed} />
    </>
  )
}
