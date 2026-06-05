'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import axios from 'axios'
import api from '@/lib/api'
import { useAuthStore } from '@/store/authStore'
import { LogoIcon } from '@/components/icons'

export default function RegisterPage() {
  const router = useRouter()
  const setAuth = useAuthStore((state) => state.setAuth)

  const [username, setUsername] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  function validate(): string | null {
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
      return 'El nombre de usuario debe tener entre 3 y 20 caracteres alfanuméricos'
    }
    if (!/.+@.+\..+/.test(email)) {
      return 'Ingresá un email válido'
    }
    if (password.length < 8) {
      return 'La contraseña debe tener al menos 8 caracteres'
    }
    return null
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const validationError = validate()
    if (validationError) {
      setError(validationError)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const { data } = await api.post('/auth/register', {
        username,
        email,
        password,
        display_name: displayName.trim() || username,
      })
      setAuth({ user: data.user, accessToken: data.accessToken, refreshToken: data.refreshToken })
      router.push('/')
    } catch (err) {
      if (axios.isAxiosError(err)) {
        if (err.response?.status === 409) {
          setError('El usuario o email ya está en uso')
        } else if (err.response?.status === 400) {
          setError('Datos inválidos. Revisá el formulario')
        } else {
          setError('Ocurrió un error. Intentá de nuevo.')
        }
      } else {
        setError('Ocurrió un error. Intentá de nuevo.')
      }
    } finally {
      setLoading(false)
    }
  }

  const inputClass =
    'border border-[#cfd9de] rounded-md px-3 py-3.5 text-[15px] focus:outline-none focus:border-x-blue focus:ring-1 focus:ring-x-blue transition'

  return (
    <main className="min-h-screen flex">
      {/* Brand panel */}
      <div className="hidden md:flex flex-1 bg-x-black items-center justify-center">
        <LogoIcon className="w-60 h-60 text-white" />
      </div>

      {/* Form panel */}
      <div className="flex-1 flex flex-col justify-center px-6 sm:px-16 lg:px-24 py-12">
        <div className="w-full max-w-[400px] mx-auto">
          <LogoIcon className="w-10 h-10 text-x-black mb-8 md:hidden" />
          <h1 className="text-4xl sm:text-5xl font-extrabold text-x-black mb-2">
            Unite hoy.
          </h1>
          <h2 className="text-2xl font-bold text-x-black mt-10 mb-6">Creá tu cuenta</h2>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <input
              type="text"
              placeholder="Nombre de usuario"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className={inputClass}
            />
            <input
              type="text"
              placeholder="Nombre para mostrar (opcional)"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className={inputClass}
            />
            <input
              type="email"
              placeholder="Correo electrónico"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className={inputClass}
            />
            <input
              type="password"
              placeholder="Contraseña (mínimo 8 caracteres)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className={inputClass}
            />

            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="bg-x-black hover:bg-black/85 disabled:opacity-50 text-white font-bold rounded-full py-3.5 text-[15px] transition-colors mt-1"
            >
              {loading ? 'Creando cuenta...' : 'Crear cuenta'}
            </button>
          </form>

          <p className="mt-10 text-[15px] text-x-gray">
            ¿Ya tenés cuenta?{' '}
            <Link href="/login" className="text-x-blue hover:underline font-medium">
              Iniciá sesión
            </Link>
          </p>
        </div>
      </div>
    </main>
  )
}
