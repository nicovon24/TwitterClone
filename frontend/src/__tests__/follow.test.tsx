import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useAuthStore } from '@/store/authStore'

vi.mock('@/lib/api', () => ({
  default: {
    post: vi.fn(),
    get: vi.fn(),
    delete: vi.fn(),
  },
}))

// Need to mock next/link and next/navigation for the search page
vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}))

import api from '@/lib/api'
import SearchPage from '@/app/search/page'

const aliceUser = { id: 'current-user', username: 'alice', email: 'alice@test.com' }
const bobResult = {
  id: 'bob-id',
  username: 'bob',
  display_name: 'Bob',
  bio: null,
  avatar_url: null,
  is_following: false,
}

beforeEach(() => {
  vi.clearAllMocks()
  useAuthStore.setState({ user: aliceUser, accessToken: 'token123' })
})

describe('Follow/Unfollow in Search', () => {
  it('clicking Seguir calls POST /follows/:username and shows Dejar de seguir', async () => {
    // SearchPage fires two api.get calls: one on mount (q='') and one when debouncedQuery updates
    vi.mocked(api.get)
      .mockResolvedValueOnce({ data: { users: [bobResult], next_cursor: null } })
      .mockResolvedValueOnce({ data: { users: [bobResult], next_cursor: null } })
    vi.mocked(api.post).mockResolvedValueOnce({ data: { message: 'Now following bob' } })

    render(<SearchPage />)
    await userEvent.type(screen.getByRole('textbox'), 'bob')

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /^seguir$/i })).toBeInTheDocument()
    }, { timeout: 2000 })

    await userEvent.click(screen.getByRole('button', { name: /^seguir$/i }))

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/follows/bob')
      expect(screen.getByRole('button', { name: /siguiendo/i })).toBeInTheDocument()
    })
  })

  it('clicking Siguiendo calls DELETE /follows/:username and shows Seguir', async () => {
    const followingBob = { ...bobResult, is_following: true }
    vi.mocked(api.get)
      .mockResolvedValueOnce({ data: { users: [followingBob], next_cursor: null } })
      .mockResolvedValueOnce({ data: { users: [followingBob], next_cursor: null } })
    vi.mocked(api.delete).mockResolvedValueOnce({ data: { message: 'Unfollowed bob' } })

    render(<SearchPage />)
    await userEvent.type(screen.getByRole('textbox'), 'bob')

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /siguiendo/i })).toBeInTheDocument()
    }, { timeout: 2000 })

    await userEvent.click(screen.getByRole('button', { name: /siguiendo/i }))

    await waitFor(() => {
      expect(api.delete).toHaveBeenCalledWith('/follows/bob')
      expect(screen.getByRole('button', { name: /^seguir$/i })).toBeInTheDocument()
    })
  })
})
