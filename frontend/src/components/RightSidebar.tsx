'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { SearchIcon } from './icons'

const TRENDS = [
  { category: 'Tendencia en Argentina', name: '#OtroDíaPerdido', posts: '12,3 mil posts' },
  { category: 'Tecnología · Tendencia', name: 'Next.js', posts: '8.945 posts' },
  { category: 'Deportes · Tendencia', name: 'Liverpool', posts: '45,1 mil posts' },
  { category: 'Tendencia', name: '#TheFlock', posts: '2.310 posts' },
]

export default function RightSidebar() {
  const router = useRouter()
  const [query, setQuery] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (query.trim()) router.push('/search')
  }

  return (
    <aside className="hidden lg:flex flex-col w-[290px] xl:w-[350px] shrink-0 pl-8 pr-2 py-2 gap-4">
      {/* Search */}
      <form onSubmit={handleSubmit} className="sticky top-0 bg-white pt-1 z-10">
        <div className="flex items-center gap-3 bg-x-light rounded-full px-4 py-2.5 border border-transparent focus-within:border-x-blue focus-within:bg-white transition-colors">
          <SearchIcon className="w-5 h-5 text-x-gray shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => router.push('/search')}
            placeholder="Buscar"
            className="bg-transparent w-full text-[15px] focus:outline-none placeholder-x-gray"
          />
        </div>
      </form>

      {/* Trends */}
      <section className="bg-x-light rounded-2xl overflow-hidden">
        <h2 className="text-xl font-extrabold px-4 pt-3 pb-2 text-x-black">
          Qué está pasando
        </h2>
        {TRENDS.map((trend) => (
          <button
            key={trend.name}
            onClick={() => router.push('/search')}
            className="w-full text-left px-4 py-3 hover:bg-x-hover/60 transition-colors"
          >
            <p className="text-[13px] text-x-gray">{trend.category}</p>
            <p className="font-bold text-[15px] text-x-black">{trend.name}</p>
            <p className="text-[13px] text-x-gray">{trend.posts}</p>
          </button>
        ))}
      </section>

      {/* Footer */}
      <footer className="px-4 text-[13px] text-x-gray flex flex-wrap gap-x-3 gap-y-1">
        <span className="hover:underline cursor-pointer">Términos de servicio</span>
        <span className="hover:underline cursor-pointer">Política de privacidad</span>
        <span className="hover:underline cursor-pointer">Cookies</span>
        <span className="w-full mt-1">© 2026 ClonTwitter</span>
      </footer>
    </aside>
  )
}
