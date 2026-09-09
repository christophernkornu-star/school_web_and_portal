'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { ChevronLeft, ChevronRight, Camera, Layers } from 'lucide-react'
import Image from 'next/image'

interface PhotoItem {
  id?: string | number
  photo_url: string
  title: string
  description?: string
  album_name?: string
}

export default function HeroCarousel({ photos = [] }: { photos: PhotoItem[] }) {
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [isPaused, setIsPaused] = useState(false)

  const touchStartX = useRef<number | null>(null)
  const touchEndX = useRef<number | null>(null)
  const minSwipeDistance = 45

  const nextPhoto = useCallback(() => {
    if (!isTransitioning && photos.length > 1) {
      setIsTransitioning(true)
      setTimeout(() => {
        setCurrentPhotoIndex((prev) => (prev + 1) % photos.length)
        setIsTransitioning(false)
      }, 200)
    }
  }, [isTransitioning, photos.length])

  const prevPhoto = useCallback(() => {
    if (!isTransitioning && photos.length > 1) {
      setIsTransitioning(true)
      setTimeout(() => {
        setCurrentPhotoIndex((prev) => (prev - 1 + photos.length) % photos.length)
        setIsTransitioning(false)
      }, 200)
    }
  }, [isTransitioning, photos.length])

  const goToPhoto = (index: number) => {
    if (!isTransitioning && index !== currentPhotoIndex) {
      setIsTransitioning(true)
      setTimeout(() => {
        setCurrentPhotoIndex(index)
        setIsTransitioning(false)
      }, 200)
    }
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    touchEndX.current = null
    touchStartX.current = e.targetTouches[0].clientX
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX
  }

  const handleTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) return
    const distance = touchStartX.current - touchEndX.current
    if (distance > minSwipeDistance) {
      nextPhoto()
    } else if (distance < -minSwipeDistance) {
      prevPhoto()
    }
  }

  useEffect(() => {
    if (photos.length <= 1 || isPaused) return

    const interval = setInterval(() => {
      nextPhoto()
    }, 6000)

    return () => clearInterval(interval)
  }, [photos.length, isPaused, nextPhoto])

  if (!photos || photos.length === 0) return null

  const activePhoto = photos[currentPhotoIndex]

  return (
    <section 
      className="w-full py-8 sm:py-12 md:py-16 bg-gradient-to-b from-slate-50 via-white to-slate-50 dark:from-slate-900/50 dark:via-slate-900 dark:to-slate-900/50 select-none"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center space-y-2 mb-6 sm:mb-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/50 text-[#003B5C] dark:text-blue-300 text-xs font-bold uppercase tracking-wider">
            <Camera className="w-3.5 h-3.5 text-amber-500" />
            <span>Campus Visuals</span>
          </div>

          <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
            Photo Gallery
          </h2>

          <div className="w-16 sm:w-20 h-1 bg-gradient-to-r from-red-600 via-amber-400 to-emerald-600 mx-auto rounded-full" />
        </div>

        {/* Carousel Viewport */}
        <div className="max-w-5xl mx-auto">
          <div 
            className="relative w-full aspect-[4/3] sm:aspect-[16/10] md:h-[500px] lg:h-[540px] rounded-2xl sm:rounded-3xl overflow-hidden bg-slate-950 shadow-xl border border-slate-200/80 dark:border-slate-800 touch-pan-y"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            {/* Ambient Blurred Background (softly fills viewport without solid black letterboxes) */}
            <div className={`absolute inset-0 transition-opacity duration-300 pointer-events-none ${isTransitioning ? 'opacity-30' : 'opacity-40'}`}>
              <Image
                src={activePhoto.photo_url}
                alt=""
                fill
                aria-hidden="true"
                className="object-cover blur-2xl scale-110"
              />
            </div>

            {/* Main Foreground Image (Preserves 100% of faces and framing without cropping) */}
            <div className={`relative w-full h-full flex items-center justify-center transition-all duration-300 z-10 ${isTransitioning ? 'opacity-40 scale-[0.98]' : 'opacity-100 scale-100'}`}>
              <Image
                src={activePhoto.photo_url}
                alt={activePhoto.title || 'Campus photograph'}
                fill
                priority
                className="object-contain p-2 sm:p-4 pb-20 sm:pb-24"
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 90vw, 1024px"
              />
            </div>

            {/* Subtle Bottom Gradient for Caption Readability */}
            <div className="absolute inset-x-0 bottom-0 h-28 sm:h-36 bg-gradient-to-t from-slate-950 via-slate-950/80 to-transparent z-15 pointer-events-none" />

            {/* Top Left: Album Tag */}
            {activePhoto.album_name && (
              <div className="absolute top-3 sm:top-4 left-3 sm:left-4 z-20">
                <span className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-full bg-slate-900/80 backdrop-blur-md border border-white/15 text-[10px] sm:text-xs font-bold text-amber-300 shadow-sm">
                  <Layers className="w-3 h-3 text-amber-400" />
                  <span>{activePhoto.album_name}</span>
                </span>
              </div>
            )}

            {/* Top Right: Counter Badge */}
            <div className="absolute top-3 sm:top-4 right-3 sm:right-4 z-20">
              <span className="px-2.5 sm:px-3 py-1 rounded-full bg-slate-900/80 backdrop-blur-md border border-white/15 text-white font-mono text-[10px] sm:text-xs font-bold shadow-sm">
                {currentPhotoIndex + 1} / {photos.length}
              </span>
            </div>

            {/* Navigation Arrows */}
            {photos.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={prevPhoto}
                  disabled={isTransitioning}
                  className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 z-20 w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-white/85 dark:bg-slate-900/85 hover:bg-white dark:hover:bg-slate-900 text-[#003B5C] dark:text-white flex items-center justify-center shadow-lg backdrop-blur-sm transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
                  aria-label="Previous photograph"
                >
                  <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
                </button>

                <button
                  type="button"
                  onClick={nextPhoto}
                  disabled={isTransitioning}
                  className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 z-20 w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-white/85 dark:bg-slate-900/85 hover:bg-white dark:hover:bg-slate-900 text-[#003B5C] dark:text-white flex items-center justify-center shadow-lg backdrop-blur-sm transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
                  aria-label="Next photograph"
                >
                  <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
                </button>
              </>
            )}

            {/* Bottom Caption Overlay */}
            <div className="absolute bottom-0 inset-x-0 p-4 sm:p-6 z-20">
              <div className={`space-y-1 transition-all duration-300 ${isTransitioning ? 'translate-y-2 opacity-0' : 'translate-y-0 opacity-100'}`}>
                <h3 className="text-sm sm:text-lg md:text-xl font-black text-white tracking-tight drop-shadow-md line-clamp-1 sm:line-clamp-2">
                  {activePhoto.title}
                </h3>

                {activePhoto.description && (
                  <p className="text-[11px] sm:text-xs text-slate-200 line-clamp-1 sm:line-clamp-2 max-w-2xl drop-shadow-sm font-medium leading-relaxed">
                    {activePhoto.description}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Pagination Indicators */}
          {photos.length > 1 && (
            <div className="flex items-center justify-center gap-1.5 sm:gap-2 mt-4 sm:mt-6 overflow-x-auto py-1 px-2">
              {photos.map((_, index) => {
                const isActive = index === currentPhotoIndex
                return (
                  <button
                    key={index}
                    type="button"
                    onClick={() => goToPhoto(index)}
                    disabled={isTransitioning}
                    className={`h-1.5 sm:h-2 rounded-full transition-all duration-300 ${
                      isActive 
                        ? 'w-6 sm:w-8 bg-[#003B5C] dark:bg-blue-500 shadow-xs' 
                        : 'w-1.5 sm:w-2 bg-slate-300 dark:bg-slate-700 hover:bg-slate-400 dark:hover:bg-slate-600'
                    }`}
                    aria-label={`Go to photo ${index + 1}`}
                  />
                )
              })}
            </div>
          )}
        </div>

      </div>
    </section>
  )
}