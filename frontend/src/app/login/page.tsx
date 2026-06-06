'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import axios from 'axios'
import api from '@/lib/api'
import { useAuthStore } from '@/store/authStore'
import { LogoIcon } from '@/components/icons'

export default function LoginPage() {
  const router = useRouter()
  const setAuth = useAuthStore((state) => state.setAuth)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const { data } = await api.post('/auth/login', { email, password })
      setAuth({ user: data.user, accessToken: data.accessToken, refreshToken: data.refreshToken })
      router.push('/')
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 401) {
        setError('Credenciales inválidas')
      } else {
        setError('Ocurrió un error. Intentá de nuevo.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen flex">
      {/* Brand panel */}
      <div className="hidden md:flex flex-1 bg-black items-center justify-center">
        <LogoIcon className="w-60 h-60 text-white" />
      </div>

      {/* Form panel */}
      <div className="flex-1 flex flex-col justify-center px-6 sm:px-16 lg:px-24">
        <div className="w-full max-w-[400px] mx-auto">
          <LogoIcon className="w-10 h-10 text-x-fg mb-8 md:hidden" />
          <h1 className="text-4xl sm:text-5xl font-extrabold text-x-fg mb-2">
            Lo que está pasando ahora.
          </h1>
          <h2 className="text-2xl font-bold text-x-fg mt-10 mb-6">Iniciá sesión</h2>

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <input
              id="email"
              type="email"
              aria-label="Correo electrónico"
              placeholder="Correo electrónico"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="bg-transparent text-x-fg border border-x-line rounded-md px-3 py-3.5 text-[15px] placeholder-x-muted focus:outline-none focus:border-x-blue focus:ring-1 focus:ring-x-blue transition"
            />
            <input
              id="password"
              type="password"
              aria-label="Contraseña"
              placeholder="Contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="bg-transparent text-x-fg border border-x-line rounded-md px-3 py-3.5 text-[15px] placeholder-x-muted focus:outline-none focus:border-x-blue focus:ring-1 focus:ring-x-blue transition"
            />

            {error && (
              <p className="text-sm text-red-600 bg-red-500/10 border border-red-500/30 rounded-md px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="bg-x-solid text-x-solidfg hover:opacity-90 disabled:opacity-50 font-bold rounded-full py-3.5 text-[15px] transition-opacity"
            >
              {loading ? 'Ingresando...' : 'Iniciar sesión'}
            </button>
          </form>

          <p className="mt-10 text-[15px] text-x-muted">
            ¿No tenés cuenta?{' '}
            <Link href="/register" className="text-x-blue hover:underline font-medium">
              Registrate
            </Link>
          </p>
        </div>
      </div>
    </main>
  )
}
