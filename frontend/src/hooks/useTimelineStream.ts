import { useEffect } from 'react'
import { useAuthStore } from '@/store/authStore'
import { useTimelineStore } from '@/store/timelineStore'

export function useTimelineStream(): void {
  const accessToken = useAuthStore((state) => state.accessToken)
  const prependTweet = useTimelineStore((state) => state.prependTweet)

  useEffect(() => {
    if (!accessToken) return

    const BACKOFF = [1000, 2000, 4000, 8000]
    let attempt = 0
    let es: EventSource | null = null
    let timeoutId: ReturnType<typeof setTimeout> | null = null

    function connect() {
      const url = `${process.env.NEXT_PUBLIC_API_URL}/timeline/stream?token=${accessToken}`
      es = new EventSource(url)

      es.addEventListener('new_tweet', (event) => {
        try {
          const tweet = JSON.parse(event.data)
          prependTweet(tweet)
          attempt = 0
        } catch {
          // ignore malformed events
        }
      })

      es.onerror = () => {
        es?.close()
        const delay = BACKOFF[Math.min(attempt, BACKOFF.length - 1)]
        attempt++
        timeoutId = setTimeout(connect, delay)
      }
    }

    connect()

    return () => {
      es?.close()
      if (timeoutId) clearTimeout(timeoutId)
    }
  }, [accessToken, prependTweet])
}
