import { useState, useCallback, useRef } from 'react'
import api from '@/lib/api'
import { getActiveMention, replaceMention } from '@/lib/mentions'
import type { MentionUser } from '@/components/MentionDropdown'

interface UseMentionAutocompleteOptions {
  content: string
  setContent: (text: string) => void
  textareaRef: React.RefObject<HTMLTextAreaElement | null>
}

interface UseMentionAutocompleteResult {
  suggestions: MentionUser[]
  isOpen: boolean
  onContentChange: (text: string) => void
  selectSuggestion: (username: string) => void
  closeDropdown: () => void
}

export function useMentionAutocomplete({
  content,
  setContent,
  textareaRef,
}: UseMentionAutocompleteOptions): UseMentionAutocompleteResult {
  const [suggestions, setSuggestions] = useState<MentionUser[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const activeMentionRef = useRef<{ query: string; startIndex: number } | null>(null)

  const onContentChange = useCallback(
    (text: string) => {
      const cursorPos = textareaRef.current?.selectionStart ?? text.length
      const active = getActiveMention(text, cursorPos)
      activeMentionRef.current = active

      if (!active) {
        setSuggestions([])
        setIsOpen(false)
        return
      }

      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(async () => {
        try {
          const { data } = await api.get('/search/users', {
            params: { q: active.query, limit: 5 },
          })
          const users: MentionUser[] = (data.users ?? []).map((u: {
            id: string
            username: string
            display_name: string | null
            avatar_url: string | null
          }) => ({
            id: u.id,
            username: u.username,
            display_name: u.display_name,
            avatar_url: u.avatar_url,
          }))
          setSuggestions(users)
          setIsOpen(users.length > 0)
        } catch {
          setSuggestions([])
          setIsOpen(false)
        }
      }, 200)
    },
    [textareaRef],
  )

  const selectSuggestion = useCallback(
    (username: string) => {
      const active = activeMentionRef.current
      if (!active) return

      const newText = replaceMention(content, active.startIndex, username)
      setContent(newText)
      setSuggestions([])
      setIsOpen(false)
      activeMentionRef.current = null

      // Restore focus and move cursor after the inserted @username
      setTimeout(() => {
        if (textareaRef.current) {
          const newCursorPos = active.startIndex + username.length + 2 // @username + space
          textareaRef.current.focus()
          textareaRef.current.setSelectionRange(newCursorPos, newCursorPos)
        }
      }, 0)
    },
    [content, setContent, textareaRef],
  )

  const closeDropdown = useCallback(() => {
    setSuggestions([])
    setIsOpen(false)
  }, [])

  return { suggestions, isOpen, onContentChange, selectSuggestion, closeDropdown }
}
