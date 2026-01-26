'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'

export default function LatestNews({ news }: { news: any[] }) {
  const [selectedNews, setSelectedNews] = useState<any>(null)

  if (!news || news.length === 0) return null

  return (
    <section className="py-16 bg-gray-50">
      <div className="container mx-auto px-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 sm:mb-8 gap-4 sm:gap-0">
          <h3 className="text-2xl md:text-3xl font-bold text-methodist-blue">Latest News</h3>
          <Link href="/news" className="text-ghana-green hover:text-green-700 font-semibold text-sm md:text-base">
            View All →
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {news.map((item) => (
            <div 
              key={item.id} 
              onClick={() => setSelectedNews(item)}
              className="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-all cursor-pointer transform hover:scale-105 duration-300"
            >
              {item.featured_image && (
                <div className="relative h-48">
                  <Image
                    src={item.featured_image}
                    alt={item.title}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    className="object-cover"
                  />
                </div>
              )}
              <div className="p-6">
                <span className="text-xs font-semibold text-methodist-gold uppercase">{item.category}</span>
                <h4 className="text-xl font-bold text-gray-800 mt-2 mb-3">{item.title}</h4>
                <p className="text-gray-600 text-sm mb-4">{item.summary || item.content.substring(0, 100) + '...'}</p>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">{new Date(item.created_at).toLocaleDateString()}</span>
                  <button className="text-methodist-blue hover:text-ghana-green font-semibold text-sm flex items-center gap-1">
                    Read More
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* News Modal */}
      {selectedNews && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedNews(null)}
        >
          <div 
            className="bg-white rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {selectedNews.featured_image && (
              <div className="relative h-64 md:h-96">
                <Image
                  src={selectedNews.featured_image}
                  alt={selectedNews.title}
                  fill
                  sizes="(max-width: 768px) 100vw, 80vw"
                  className="object-cover"
                />
              </div>
            )}
            <div className="p-8">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-semibold text-methodist-gold uppercase px-3 py-1 bg-yellow-100 rounded-full">
                  {selectedNews.category}
                </span>
                <span className="text-sm text-gray-500">
                  {new Date(selectedNews.created_at).toLocaleDateString()}
                </span>
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-6">{selectedNews.title}</h2>
              <div className="prose max-w-none text-gray-700">
                <p className="whitespace-pre-wrap">{selectedNews.content}</p>
              </div>
              <div className="mt-8 flex justify-end">
                <button 
                  onClick={() => setSelectedNews(null)}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold py-2 px-6 rounded-lg transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
