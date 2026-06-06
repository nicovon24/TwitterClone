import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useAuthStore } from '@/store/authStore'

// Mock the api module
vi.mock('@/lib/api', () => ({
  default: {
    post: vi.fn(),
    get: vi.fn(),
    delete: vi.fn(),
  },
}))

// Mock axios (used for isAxiosError check in the login page)
vi.mock('axios', async (importOriginal) => {
  const actual = await importOriginal<typeof import('axios')>()
  return {
    ...actual,
    default: {
      ...actual.default,
      isAxiosError: (err: unknown): err is { response?: { status: number } } =>
        err != null && typeof err === 'object' && 'response' in err,
    },
  }
})

import api from '@/lib/api'
import LoginPage from '@/app/login/page'

const mockPush = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, replace: vi.fn(), back: vi.fn() }),
  useParams: () => ({}),
  usePathname: () => '/',
}))

beforeEach(() => {
  vi.clearAllMocks()
  useAuthStore.getState().clearAuth()
  localStorage.clear()
})

describe('LoginPage', () => {
  it('stores tokens and redirects to / on successful login', async () => {
    const fakeUser = { id: 'u1', username: 'alice', email: 'alice@test.com', display_name: null, bio: null, avatar_url: null }
    vi.mocked(api.post).mockResolvedValueOnce({
      data: { accessToken: 'access123', refreshToken: 'refresh123', user: fakeUser },
    })

    render(<LoginPage />)
    await userEvent.type(screen.getByLabelText(/correo electrónico/i), 'alice@test.com')
    await userEvent.type(screen.getByLabelText(/contraseña/i), 'password123')
    await userEvent.click(screen.getByRole('button', { name: /iniciar sesión/i }))

    await waitFor(() => {
      expect(localStorage.getItem('accessToken')).toBe('access123')
      expect(mockPush).toHaveBeenCalledWith('/')
    })
  })

  it('shows "Credenciales inválidas" on 401 without redirecting', async () => {
    vi.mocked(api.post).mockRejectedValueOnce({ response: { status: 401 } })

    render(<LoginPage />)
    await userEvent.type(screen.getByLabelText(/correo electrónico/i), 'alice@test.com')
    await userEvent.type(screen.getByLabelText(/contraseña/i), 'wrong')
    await userEvent.click(screen.getByRole('button', { name: /iniciar sesión/i }))

    await waitFor(() => {
      expect(screen.getByText(/credenciales inválidas/i)).toBeInTheDocument()
      expect(mockPush).not.toHaveBeenCalled()
    })
  })

  it('renders the login form with Spanish labels', () => {
    render(<LoginPage />)
    expect(screen.getByLabelText(/correo electrónico/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/contraseña/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /iniciar sesión/i })).toBeInTheDocument()
  })
})
