'use client'

import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

export default function HeroCarousel({ photos }: { photos: any[] }) {
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0)
  const [isTransitioning, setIsTransitioning] = useState(false)

  const nextPhoto = () => {
    if (!isTransitioning) {
      setIsTransitioning(true)
      setTimeout(() => {
        setCurrentPhotoIndex((prev) => (prev + 1) % photos.length)
        setIsTransitioning(false)
      }, 300)
    }
  }

  const prevPhoto = () => {
    if (!isTransitioning) {
      setIsTransitioning(true)
      setTimeout(() => {
        setCurrentPhotoIndex((prev) => (prev - 1 + photos.length) % photos.length)
        setIsTransitioning(false)
      }, 300)
    }
  }

  const goToPhoto = (index: number) => {
    if (!isTransitioning && index !== currentPhotoIndex) {
      setIsTransitioning(true)
      setTimeout(() => {
        setCurrentPhotoIndex(index)
        setIsTransitioning(false)
      }, 300)
    }
  }

  useEffect(() => {
    if (photos.length > 0) {
      const interval = setInterval(() => {
        if (!isTransitioning) {
          setIsTransitioning(true)
          setTimeout(() => {
            setCurrentPhotoIndex((prev) => (prev + 1) % photos.length)
            setIsTransitioning(false)
          }, 300)
        }
      }, 5000)
      return () => clearInterval(interval)
    }
  }, [photos, isTransitioning])

  if (!photos || photos.length === 0) return null

  return (
    <section className="py-16 bg-gradient-to-b from-white via-gray-50 to-white">
      <div className="container mx-auto px-6">
        <div className="text-center mb-12">
          <h3 className="text-4xl font-bold text-methodist-blue mb-2 animate-fade-in">
            Photo Gallery
          </h3>
          <div className="w-24 h-1 bg-gradient-to-r from-ghana-red via-ghana-gold to-ghana-green mx-auto rounded-full"></div>
        </div>
        <div className="relative max-w-5xl mx-auto">
          {/* Main Slideshow Container */}
          <div className="relative h-[500px] rounded-2xl overflow-hidden shadow-2xl bg-gray-900">
            {/* Image with Transitions */}
            <div className="relative w-full h-full">
              <img
                src={photos[currentPhotoIndex].photo_url}
                alt={photos[currentPhotoIndex].title}
                className={`w-full h-full object-cover transition-all duration-700 ease-in-out ${
                  isTransitioning ? 'opacity-0 scale-105' : 'opacity-100 scale-100'
                }`}
              />
              
              {/* Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent"></div>
              
              {/* Loading Shimmer Effect during transition */}
              {isTransitioning && (
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer"></div>
              )}
            </div>

            {/* Caption with Slide-up Animation */}
            <div className={`absolute bottom-0 left-0 right-0 p-8 transition-all duration-500 ${
              isTransitioning ? 'translate-y-full opacity-0' : 'translate-y-0 opacity-100'
            }`}>
              <div className="max-w-3xl">
                <h4 className="text-white text-2xl md:text-3xl font-bold mb-2 drop-shadow-lg">
                  {photos[currentPhotoIndex].title}
                </h4>
                {photos[currentPhotoIndex].description && (
                  <p className="text-gray-200 text-base md:text-lg drop-shadow-md">
                    {photos[currentPhotoIndex].description}
                  </p>
                )}
                <div className="flex items-center mt-3 space-x-2">
                  <div className="w-12 h-0.5 bg-ghana-gold rounded-full"></div>
                  <span className="text-gray-300 text-sm">
                    {photos[currentPhotoIndex].album_name}
                  </span>
                </div>
              </div>
            </div>

            {/* Navigation Buttons */}
            <button
              onClick={prevPhoto}
              disabled={isTransitioning}
              className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white p-4 rounded-full shadow-xl transition-all duration-300 hover:scale-110 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed group"
              aria-label="Previous photo"
            >
              <ChevronLeft className="w-6 h-6 text-methodist-blue group-hover:text-ghana-green transition-colors" />
            </button>
            <button
              onClick={nextPhoto}
              disabled={isTransitioning}
              className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white p-4 rounded-full shadow-xl transition-all duration-300 hover:scale-110 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed group"
              aria-label="Next photo"
            >
              <ChevronRight className="w-6 h-6 text-methodist-blue group-hover:text-ghana-green transition-colors" />
            </button>

            {/* Photo Counter Badge */}
            <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-sm px-4 py-2 rounded-full">
              <span className="text-white text-sm font-semibold">
                {currentPhotoIndex + 1} / {photos.length}
              </span>
            </div>
          </div>

          {/* Thumbnail Navigation Dots */}
          <div className="flex justify-center mt-6 space-x-3 flex-wrap gap-2">
            {photos.map((_, index) => (
              <button
                key={index}
                onClick={() => goToPhoto(index)}
                disabled={isTransitioning}
                className={`transition-all duration-300 rounded-full disabled:cursor-not-allowed ${
                  index === currentPhotoIndex 
                    ? 'bg-methodist-blue w-12 h-3 shadow-lg' 
                    : 'bg-gray-300 hover:bg-gray-400 w-3 h-3 hover:scale-125'
                }`}
                aria-label={`Go to photo ${index + 1}`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
