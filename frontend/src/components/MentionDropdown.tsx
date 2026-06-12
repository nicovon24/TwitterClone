'use client'

import { useState, useEffect } from 'react'
import Avatar from './Avatar'

export interface MentionUser {
  id: string
  username: string
  display_name: string | null
  avatar_url: string | null
}

interface MentionDropdownProps {
  suggestions: MentionUser[]
  onSelect: (username: string) => void
  onClose: () => void
}

export default function MentionDropdown({ suggestions, onSelect, onClose }: MentionDropdownProps) {
  const [activeIndex, setActiveIndex] = useState(0)

  useEffect(() => {
    setActiveIndex(0)
  }, [suggestions])

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (suggestions.length === 0) return
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setActiveIndex((i) => Math.min(i + 1, suggestions.length - 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setActiveIndex((i) => Math.max(i - 1, 0))
      } else if (e.key === 'Enter') {
        e.preventDefault()
        onSelect(suggestions[activeIndex].username)
      } else if (e.key === 'Escape') {
        onClose()
      }
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [suggestions, activeIndex, onSelect, onClose])

  if (suggestions.length === 0) return null

  return (
    <div className="absolute z-50 left-0 mt-1 w-72 bg-x-card border border-x-line rounded-2xl shadow-lg overflow-hidden">
      <ul>
        {suggestions.map((user, i) => (
          <li key={user.id}>
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault()
                onSelect(user.username)
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                i === activeIndex ? 'bg-x-hover' : 'hover:bg-x-hover'
              }`}
              onMouseEnter={() => setActiveIndex(i)}
            >
              <Avatar user={user} className="w-9 h-9 shrink-0" />
              <div className="min-w-0">
                <p className="font-semibold text-[14px] text-x-fg truncate">
                  {user.display_name ?? user.username}
                </p>
                <p className="text-x-muted text-[13px] truncate">@{user.username}</p>
              </div>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
