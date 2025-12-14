'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeft, Calendar, Newspaper } from 'lucide-react'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'

export default function NewsPage() {
  const supabase = getSupabaseBrowserClient()
  const [news, setNews] = useState<any[]>([])
  const [selectedCategory, setSelectedCategory] = useState('all')

  useEffect(() => {
    fetchNews()
  }, [])

  const fetchNews = async () => {
    const { data } = await supabase
      .from('news')
      .select('*')
      .eq('published', true)
      .order('created_at', { ascending: false })
    
    if (data) setNews(data)
  }

  const categories = ['all', 'general', 'academic', 'sports', 'achievements', 'events']
  const filteredNews = selectedCategory === 'all' 
    ? news 
    : news.filter(n => n.category === selectedCategory)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-methodist-blue text-white py-12">
        <div className="container mx-auto px-6">
          <Link href="/" className="inline-flex items-center text-white hover:text-methodist-gold mb-4">
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back to Home
          </Link>
          <h1 className="text-4xl font-bold mb-2">School News</h1>
          <p className="text-gray-200">Latest updates and announcements from Biriwa Methodist 'C' Basic School</p>
        </div>
      </header>

      <main className="container mx-auto px-6 py-12">
        {/* Category Filter */}
        <div className="bg-white rounded-lg shadow p-4 mb-8">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm font-medium text-gray-700">Filter by category:</span>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedCategory === cat
                    ? 'bg-methodist-blue text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* News Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredNews.map((newsItem) => (
            <div key={newsItem.id} className="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow">
              {newsItem.featured_image && (
                <div className="relative h-48">
                  <Image
                    src={newsItem.featured_image}
                    alt={newsItem.title}
                    fill
                    className="object-cover"
                  />
                </div>
              )}
              <div className="p-6">
                <div className="flex items-center space-x-2 mb-3">
                  <span className="text-xs font-semibold text-white bg-methodist-gold px-3 py-1 rounded-full uppercase">
                    {newsItem.category}
                  </span>
                  <span className="text-xs text-gray-500 flex items-center">
                    <Calendar className="w-3 h-3 mr-1" />
                    {new Date(newsItem.created_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </span>
                </div>
                <h2 className="text-xl font-bold text-gray-800 mb-3">{newsItem.title}</h2>
                <p className="text-gray-600 text-sm mb-4">
                  {newsItem.summary || newsItem.content.substring(0, 150) + '...'}
                </p>
                <div className="flex items-center justify-between">
                  <Newspaper className="w-5 h-5 text-ghana-green" />
                  <button className="text-methodist-blue hover:text-blue-700 font-semibold text-sm">
                    Read More →
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredNews.length === 0 && (
          <div className="text-center py-12">
            <Newspaper className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">No news available in this category.</p>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="methodist-gradient text-white py-8 mt-12">
        <div className="container mx-auto px-6 text-center">
          <p className="text-gray-200">&copy; 2025 Biriwa Methodist 'C' Basic School. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
