'use client'

interface AvatarUser {
  username: string
  avatar_url?: string | null
}

// Classic Twitter "egg" palette. The color is picked deterministically from
// the username so each person keeps the same color across the whole app.
const EGG_COLORS = [
  '#1d9bf0', // blue
  '#7e4e9e', // purple
  '#e0245e', // pink
  '#f45d22', // orange
  '#17bf63', // green
  '#794bc4', // violet
  '#ffad1f', // amber
  '#e81c4f', // crimson
  '#00b3a1', // teal
  '#f25cc1', // magenta
]

function colorForUsername(username: string): string {
  let hash = 0
  for (let i = 0; i < username.length; i++) {
    hash = (hash * 31 + username.charCodeAt(i)) >>> 0
  }
  return EGG_COLORS[hash % EGG_COLORS.length]
}

interface AvatarProps {
  user: AvatarUser
  /** Tailwind sizing classes, e.g. "w-10 h-10". */
  className?: string
}

export default function Avatar({ user, className = '' }: AvatarProps) {
  if (user.avatar_url) {
    return (
      <img
        src={user.avatar_url}
        alt={user.username}
        className={`rounded-full object-cover ${className}`}
      />
    )
  }

  return (
    <span
      className={`rounded-full flex items-center justify-center overflow-hidden ${className}`}
      style={{ backgroundColor: colorForUsername(user.username) }}
      aria-label={user.username}
    >
      <svg viewBox="0 0 100 100" className="w-3/5 h-3/5" aria-hidden>
        <path
          d="M50 8 C72 8 80 40 80 56 C80 76 66 92 50 92 C34 92 20 76 20 56 C20 40 28 8 50 8 Z"
          fill="#fff"
        />
      </svg>
    </span>
  )
}
