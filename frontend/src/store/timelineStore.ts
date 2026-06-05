import { create } from 'zustand'

export interface Tweet {
  id: string
  content: string
  image_url: string | null
  created_at: string
  user: { id: string; username: string; display_name: string | null; avatar_url: string | null }
  likes_count: number
  liked_by_me: boolean
}

interface TimelineState {
  tweets: Tweet[]
  nextCursor: string | null
  isLoading: boolean
  prependTweet: (tweet: Tweet) => void
  appendTweets: (tweets: Tweet[], cursor: string | null) => void
  deleteTweet: (id: string) => void
  toggleLike: (id: string, liked: boolean, count: number) => void
  setLoading: (v: boolean) => void
  reset: () => void
}

export const useTimelineStore = create<TimelineState>((set) => ({
  tweets: [],
  nextCursor: null,
  isLoading: false,

  prependTweet: (tweet) =>
    set((state) => ({
      tweets: state.tweets.some((t) => t.id === tweet.id)
        ? state.tweets
        : [tweet, ...state.tweets],
    })),

  appendTweets: (newTweets, cursor) =>
    set((state) => {
      const existingIds = new Set(state.tweets.map((t) => t.id))
      const unique = newTweets.filter((t) => !existingIds.has(t.id))
      return { tweets: [...state.tweets, ...unique], nextCursor: cursor }
    }),

  deleteTweet: (id) =>
    set((state) => ({ tweets: state.tweets.filter((t) => t.id !== id) })),

  toggleLike: (id, liked, count) =>
    set((state) => ({
      tweets: state.tweets.map((t) =>
        t.id === id ? { ...t, liked_by_me: liked, likes_count: count } : t,
      ),
    })),

  setLoading: (v) => set({ isLoading: v }),

  reset: () => set({ tweets: [], nextCursor: null, isLoading: false }),
}))
