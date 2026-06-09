import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useTimelineStore } from '@/store/timelineStore'

vi.mock('@/lib/api', () => ({
  default: {
    post: vi.fn(),
    get: vi.fn(),
    delete: vi.fn(),
  },
}))

import api from '@/lib/api'
import TweetComposer from '@/components/TweetComposer'

beforeEach(() => {
  vi.clearAllMocks()
  useTimelineStore.getState().reset()
})

describe('TweetComposer', () => {
  const fakeTweet = {
    id: 'tweet-1',
    content: 'Hola mundo',
    created_at: new Date().toISOString(),
    user: { id: 'u1', username: 'alice', avatar_url: null },
    likes_count: 0,
    liked_by_me: false,
  }

  it('calls POST /tweets and prepends tweet to store on submit', async () => {
    vi.mocked(api.post).mockResolvedValueOnce({ data: fakeTweet })

    render(<TweetComposer />)
    await userEvent.type(screen.getByPlaceholderText(/qué está pasando/i), 'Hola mundo')
    await userEvent.click(screen.getByRole('button', { name: /postear/i }))

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/tweets', { content: 'Hola mundo', image_url: null })
      expect(useTimelineStore.getState().tweets).toHaveLength(1)
      expect(useTimelineStore.getState().tweets[0].id).toBe('tweet-1')
    })
  })

  it('disables submit when content exceeds 280 characters', async () => {
    render(<TweetComposer />)
    await userEvent.type(screen.getByPlaceholderText(/qué está pasando/i), 'a'.repeat(281))
    expect(screen.getByRole('button', { name: /postear/i })).toBeDisabled()
  })

  it('disables submit when content is empty', () => {
    render(<TweetComposer />)
    expect(screen.getByRole('button', { name: /postear/i })).toBeDisabled()
  })
})
