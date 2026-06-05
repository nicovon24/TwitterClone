'use client'

import { useRef, useState } from 'react'
import api from '@/lib/api'
import { useTimelineStore } from '@/store/timelineStore'
import { useAuthStore } from '@/store/authStore'

const MAX = 280

export default function TweetComposer() {
  const prependTweet = useTimelineStore((state) => state.prependTweet)
  const currentUser = useAuthStore((state) => state.user)
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const remaining = MAX - content.length
  const isValid = content.trim().length > 0 && content.length <= MAX
  const ratio = Math.min(content.length / MAX, 1)
  const circumference = 2 * Math.PI * 10

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  function removeImage() {
    setImageFile(null)
    setImagePreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function handleSubmit() {
    if (!isValid) return
    setLoading(true)
    setError(null)
    try {
      let image_url: string | null = null

      if (imageFile) {
        const formData = new FormData()
        formData.append('image', imageFile)
        const { data } = await api.post('/uploads/image', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
        image_url = data.url
      }

      const { data } = await api.post('/tweets', { content: content.trim(), image_url })
      prependTweet(data)
      setContent('')
      setImageFile(null)
      setImagePreview(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
    } catch {
      setError('No se pudo publicar el tweet. Intentá de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex gap-3 border-b border-x-border dark:border-[#2f3336] px-4 py-3">
      <div className="w-10 h-10 rounded-full bg-x-blue flex items-center justify-center text-white font-bold uppercase shrink-0">
        {currentUser?.username[0] ?? '?'}
      </div>

      <div className="flex-1 min-w-0">
        <textarea
          className="w-full resize-none text-xl placeholder-x-gray focus:outline-none bg-transparent pt-2"
          rows={2}
          maxLength={285}
          placeholder="¿Qué está pasando?"
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />

        {imagePreview && (
          <div className="relative mt-2">
            <img src={imagePreview} alt="Preview" className="rounded-2xl max-h-60 w-full object-cover border border-x-border" />
            <button
              onClick={removeImage}
              className="absolute top-2 right-2 bg-black/60 text-white rounded-full w-7 h-7 flex items-center justify-center text-sm hover:bg-black/80 transition-colors"
              aria-label="Quitar imagen"
            >
              ✕
            </button>
          </div>
        )}

        {error && <p className="text-sm text-red-500 mt-1">{error}</p>}

        <div className="flex items-center justify-between mt-2 pt-3 border-t border-x-border dark:border-[#2f3336]">
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg"
              className="hidden"
              onChange={handleImageChange}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={loading}
              aria-label="Agregar imagen"
              className="p-2 rounded-full text-x-blue hover:bg-x-blue/10 transition-colors disabled:opacity-50"
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor" aria-hidden>
                <path d="M19.75 2H4.25C3.01 2 2 3.01 2 4.25v15.5C2 20.99 3.01 22 4.25 22h15.5c1.24 0 2.25-1.01 2.25-2.25V4.25C22 3.01 20.99 2 19.75 2zM4.25 3.5h15.5c.41 0 .75.34.75.75v9.26l-3.3-3.3c-.29-.29-.77-.29-1.06 0l-3.49 3.49-1.44-1.44c-.29-.29-.77-.29-1.06 0L3.5 15.71V4.25c0-.41.34-.75.75-.75zm0 17c-.41 0-.75-.34-.75-.75v-1.69l4.13-4.13 1.44 1.44c.29.29.77.29 1.06 0l3.49-3.49 3.05 3.05.96.96v3.86H4.25zM16 7.5c-.83 0-1.5.67-1.5 1.5S15.17 10.5 16 10.5 17.5 9.83 17.5 9 16.83 7.5 16 7.5z" />
              </svg>
            </button>
          </div>

          <div className="flex items-center gap-3">
            {content.length > 0 && (
              <>
                <svg width="28" height="28" viewBox="0 0 28 28" className="-rotate-90">
                  <circle cx="14" cy="14" r="10" fill="none" stroke="#eff3f4" strokeWidth="2.5" />
                  <circle
                    cx="14" cy="14" r="10" fill="none"
                    stroke={remaining < 0 ? '#f4212e' : remaining <= 20 ? '#ffd400' : '#1d9bf0'}
                    strokeWidth="2.5"
                    strokeDasharray={circumference}
                    strokeDashoffset={circumference * (1 - ratio)}
                    strokeLinecap="round"
                  />
                </svg>
                {remaining <= 20 && (
                  <span className={`text-sm ${remaining < 0 ? 'text-red-500' : 'text-x-gray'}`}>
                    {remaining}
                  </span>
                )}
              </>
            )}

            <button
              onClick={handleSubmit}
              disabled={!isValid || loading}
              className="bg-x-blue hover:bg-x-bluehover disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-full px-5 py-2 text-[15px] transition-colors"
            >
              {loading ? 'Posteando...' : 'Postear'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
