'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/authStore'
import { useTimelineStream } from '@/hooks/useTimelineStream'
import TweetComposer from '@/components/TweetComposer'
import Timeline from '@/components/Timeline'

export default function HomePage() {
  const router = useRouter()
  const accessToken = useAuthStore((state) => state.accessToken)

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
      <header className="sticky top-0 bg-white/85 dark:bg-black/85 backdrop-blur-md border-b border-x-border dark:border-[#2f3336] z-20">
        <div className="flex">
          <div className="flex-1 flex items-center justify-center py-4 hover:bg-x-light dark:hover:bg-[#16181c] transition-colors cursor-pointer relative">
            <span className="font-bold text-[15px] text-x-black dark:text-[#e7e9ea]">Para ti</span>
            <span className="absolute bottom-0 h-1 w-14 bg-x-blue rounded-full" />
          </div>
          <div className="flex-1 flex items-center justify-center py-4 hover:bg-x-light dark:hover:bg-[#16181c] transition-colors cursor-pointer">
            <span className="font-medium text-[15px] text-x-gray">Siguiendo</span>
          </div>
        </div>
      </header>
      <TweetComposer />
      <Timeline />
    </>
  )
}
