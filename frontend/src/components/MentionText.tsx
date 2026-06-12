import Link from 'next/link'
import { parseMentions } from '@/lib/mentions'

interface MentionTextProps {
  content: string
  className?: string
}

export default function MentionText({ content, className = 'mt-0.5 text-[15px] leading-normal whitespace-pre-wrap break-words text-x-fg' }: MentionTextProps) {
  const segments = parseMentions(content)

  return (
    <p className={className}>
      {segments.map((seg, i) =>
        seg.type === 'mention' ? (
          <Link
            key={i}
            href={`/users/${seg.username}`}
            className="text-x-blue hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            @{seg.username}
          </Link>
        ) : (
          <span key={i}>{seg.value}</span>
        ),
      )}
    </p>
  )
}
