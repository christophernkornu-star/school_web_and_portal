'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { format } from 'date-fns'
import { Calendar, ArrowRight, X, Newspaper, ChevronRight } from 'lucide-react'

interface NewsItem {
  id: string | number
  title: string
  category: string
  content: string
  summary?: string
  featured_image?: string
  created_at: string
}

export default function LatestNews({ news }: { news: NewsItem[] }) {
  const [selectedNews, setSelectedNews] = useState<NewsItem | null>(null)

  // Prevent background body scroll when news reading modal is open
  useEffect(() => {
    if (selectedNews) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [selectedNews])

  if (!news || news.length === 0) return null

  return (
    <section className="py-10 sm:py-16 bg-slate-50/50 dark:bg-slate-900 border-t border-slate-200/80 dark:border-slate-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6 sm:space-y-8">
        
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-2 border-b border-slate-200/60 dark:border-slate-800">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-4 bg-amber-400 rounded-full" />
              <span className="text-[11px] font-black uppercase tracking-widest text-[#003B5C] dark:text-blue-400">
                School Press &amp; Updates
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              Latest Campus News
            </h2>
          </div>

          <Link 
            href="/news" 
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-[#003B5C] dark:text-blue-400 hover:text-amber-600 dark:hover:text-amber-400 transition-colors group"
          >
            <span>Browse All News</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>

        {/* News Grid (1 col on mobile, 2 on tablet, 3 on desktop) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {news.map((item) => (
            <article
              key={item.id}
              onClick={() => setSelectedNews(item)}
              className="group bg-white dark:bg-slate-800/90 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-700/80 shadow-xs hover:shadow-md hover:border-[#003B5C]/30 dark:hover:border-blue-500/30 transition-all duration-200 flex flex-col justify-between overflow-hidden cursor-pointer active:scale-[0.99]"
            >
              <div>
                {/* Thumbnail Image */}
                <div className="relative aspect-[16/10] w-full bg-slate-100 dark:bg-slate-900 overflow-hidden">
                  {item.featured_image ? (
                    <Image
                      src={item.featured_image}
                      alt={item.title}
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-300 dark:text-slate-600">
                      <Newspaper className="w-12 h-12" />
                    </div>
                  )}

                  {/* Category Pill Tag */}
                  <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-white/95 dark:bg-slate-900/95 text-[#003B5C] dark:text-blue-300 backdrop-blur-md shadow-xs border border-slate-200/60 dark:border-slate-700">
                    {item.category || 'Announcement'}
                  </span>
                </div>

                {/* Body Content */}
                <div className="p-4 sm:p-5 md:p-6 space-y-2.5">
                  <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-400 dark:text-slate-500">
                    <Calendar className="w-3.5 h-3.5 shrink-0" />
                    <span>{format(new Date(item.created_at), 'MMM dd, yyyy')}</span>
                  </div>

                  <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white leading-snug line-clamp-2 group-hover:text-[#003B5C] dark:group-hover:text-blue-400 transition-colors">
                    {item.title}
                  </h3>

                  <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 line-clamp-3 leading-relaxed">
                    {item.summary || item.content}
                  </p>
                </div>
              </div>

              {/* Card Footer */}
              <div className="px-4 sm:px-5 md:px-6 pb-4 sm:pb-5 pt-2 border-t border-slate-100 dark:border-slate-750 flex items-center justify-between text-xs font-bold text-[#003B5C] dark:text-blue-400">
                <span>Read Story</span>
                <ChevronRight className="w-4 h-4 text-slate-300 dark:text-slate-600 group-hover:text-[#003B5C] dark:group-hover:text-blue-400 group-hover:translate-x-0.5 transition-all" />
              </div>
            </article>
          ))}
        </div>
      </div>

      {/* Reader Modal (Bottom Sheet on Mobile, Centered on Tablet/Desktop) */}
      {selectedNews && (
        <div 
          className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150"
          onClick={() => setSelectedNews(null)}
        >
          <div 
            className="bg-white dark:bg-slate-800 rounded-t-3xl sm:rounded-3xl max-w-2xl w-full max-h-[90dvh] overflow-hidden shadow-2xl border-t sm:border border-slate-100 dark:border-slate-700 flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Top Bar */}
            <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-750 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50 shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200/60 dark:border-amber-900/40">
                  {selectedNews.category || 'Press'}
                </span>
                <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">
                  {format(new Date(selectedNews.created_at), 'MMMM dd, yyyy')}
                </span>
              </div>

              <button 
                type="button"
                onClick={() => setSelectedNews(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 dark:hover:text-slate-200 transition-colors"
                aria-label="Close story"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Story Body */}
            <div className="overflow-y-auto overscroll-contain p-4 sm:p-6 md:p-8 space-y-4 sm:space-y-6">
              {selectedNews.featured_image && (
                <div className="relative aspect-[16/9] w-full rounded-xl sm:rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-900 border border-slate-200/60 dark:border-slate-700/60 shadow-xs">
                  <Image
                    src={selectedNews.featured_image}
                    alt={selectedNews.title}
                    fill
                    sizes="(max-width: 768px) 100vw, 700px"
                    className="object-cover"
                  />
                </div>
              )}

              <h3 className="text-xl sm:text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight leading-snug">
                {selectedNews.title}
              </h3>

              <div className="prose prose-slate dark:prose-invert max-w-none text-xs sm:text-sm md:text-base leading-relaxed text-slate-600 dark:text-slate-300">
                <p className="whitespace-pre-wrap">{selectedNews.content}</p>
              </div>
            </div>

            {/* Modal Bottom Close Action */}
            <div className="p-3.5 sm:p-4 border-t border-slate-100 dark:border-slate-750 bg-slate-50/60 dark:bg-slate-900/60 flex justify-end shrink-0 pb-[max(0.875rem,env(safe-area-inset-bottom))]">
              <button 
                type="button"
                onClick={() => setSelectedNews(null)}
                className="w-full sm:w-auto px-5 py-2.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 font-bold text-xs sm:text-sm rounded-xl transition"
              >
                Close Article
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}