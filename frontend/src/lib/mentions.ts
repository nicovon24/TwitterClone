export interface MentionSegment {
  type: 'text'
  value: string
}

export interface MentionToken {
  type: 'mention'
  username: string
}

export type ContentSegment = MentionSegment | MentionToken

const MENTION_REGEX = /(?<![a-zA-Z0-9_])@([a-zA-Z0-9_]{1,50})/g

/**
 * Detect the active @mention being typed at the cursor position.
 * Scans backwards from cursorPos to find the nearest @ symbol.
 * Returns null if cursor is not inside an @mention token.
 */
export function getActiveMention(
  text: string,
  cursorPos: number,
): { query: string; startIndex: number } | null {
  // Scan backwards from cursor
  let i = cursorPos - 1
  while (i >= 0) {
    const ch = text[i]
    if (ch === '@') {
      // Check the char before @ is not alphanumeric (avoids matching mid-email)
      const before = i > 0 ? text[i - 1] : ' '
      if (/[a-zA-Z0-9_]/.test(before)) return null
      const query = text.slice(i + 1, cursorPos)
      // Query must not contain spaces
      if (/s/.test(query)) return null
      return { query, startIndex: i }
    }
    // Stop on whitespace
    if (/s/.test(ch)) return null
    i--
  }
  return null
}

/**
 * Replace the active @mention token (from startIndex to end of the word)
 * with @username followed by a space.
 */
export function replaceMention(
  text: string,
  startIndex: number,
  username: string,
): string {
  // Find the end of the current @word from startIndex
  let endIndex = startIndex + 1
  while (endIndex < text.length && /[a-zA-Z0-9_]/.test(text[endIndex])) {
    endIndex++
  }
  return text.slice(0, startIndex) + '@' + username + ' ' + text.slice(endIndex)
}

/**
 * Parse tweet content into segments of plain text and @mention tokens.
 * Used to render @mentions as clickable links.
 */
export function parseMentions(content: string): ContentSegment[] {
  const segments: ContentSegment[] = []
  let lastIndex = 0
  const regex = new RegExp(MENTION_REGEX.source, 'g')
  let match: RegExpExecArray | null

  while ((match = regex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: 'text', value: content.slice(lastIndex, match.index) })
    }
    segments.push({ type: 'mention', username: match[1] })
    lastIndex = match.index + match[0].length
  }

  if (lastIndex < content.length) {
    segments.push({ type: 'text', value: content.slice(lastIndex) })
  }

  return segments
}
