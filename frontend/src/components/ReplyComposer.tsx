'use client'

import { useRef, useState } from 'react'
import api from '@/lib/api'
import { useAuthStore } from '@/store/authStore'
import { Tweet } from '@/store/timelineStore'
import Avatar from './Avatar'
import MentionDropdown from './MentionDropdown'
import { useMentionAutocomplete } from '@/hooks/useMentionAutocomplete'

const MAX = 280

interface ReplyComposerProps {
  parentTweetId: string
  onReplyPosted: (tweet: Tweet) => void
}

export default function ReplyComposer({ parentTweetId, onReplyPosted }: ReplyComposerProps) {
  const currentUser = useAuthStore((state) => state.user)
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const remaining = MAX - content.length
  const isValid = content.trim().length > 0 && content.length <= MAX
  const ratio = Math.min(content.length / MAX, 1)
  const circumference = 2 * Math.PI * 10

  const { suggestions, isOpen, onContentChange, selectSuggestion, closeDropdown } =
    useMentionAutocomplete({ content, setContent, textareaRef })

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const val = e.target.value
    setContent(val)
    onContentChange(val)
  }

  async function handleSubmit() {
    if (!isValid) return
    setLoading(true)
    setError(null)
    try {
      const { data } = await api.post('/tweets', {
        content: content.trim(),
        parent_tweet_id: parentTweetId,
      })
      onReplyPosted(data)
      setContent('')
      closeDropdown()
    } catch {
      setError('No se pudo publicar la respuesta. Intentá de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex gap-3 border-b border-x-line px-4 py-3">
      <Avatar user={{ username: currentUser?.username ?? '?' }} className="w-10 h-10 shrink-0" />

      <div className="flex-1 min-w-0 relative">
        <textarea
          ref={textareaRef}
          className="w-full resize-none text-xl placeholder-x-gray focus:outline-none bg-transparent pt-2"
          rows={2}
          maxLength={285}
          placeholder="Publicá tu respuesta"
          value={content}
          onChange={handleChange}
          onKeyDown={(e) => {
            if (e.key === 'Escape') closeDropdown()
          }}
        />

        {isOpen && (
          <MentionDropdown
            suggestions={suggestions}
            onSelect={selectSuggestion}
            onClose={closeDropdown}
          />
        )}

        {error && <p className="text-sm text-red-500 mt-1">{error}</p>}

        <div className="flex items-center justify-end mt-2 pt-3 border-t border-x-line gap-3">
          {content.length > 0 && (
            <>
              <svg width="28" height="28" viewBox="0 0 28 28" className="-rotate-90">
                <circle cx="14" cy="14" r="10" fill="none" stroke="rgba(113,118,123,0.35)" strokeWidth="2.5" />
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
            {loading ? 'Posteando...' : 'Responder'}
          </button>
        </div>
      </div>
    </div>
  )
}
