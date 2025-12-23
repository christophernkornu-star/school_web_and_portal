'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { BookOpen, Users, GraduationCap, Calendar, FileText, Menu, X, Newspaper, ChevronLeft, ChevronRight } from 'lucide-react'
import { Image as ImageIcon } from 'lucide-react'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'
import AnnouncementsBanner from '@/components/AnnouncementsBanner'

export default function HomePage() {
  const pathname = usePathname()
  const supabase = getSupabaseBrowserClient()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [latestNews, setLatestNews] = useState<any[]>([])
  const [latestEvents, setLatestEvents] = useState<any[]>([])
  const [galleryPhotos, setGalleryPhotos] = useState<any[]>([])
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [studentCount, setStudentCount] = useState(0)
  const [teacherCount, setTeacherCount] = useState(0)
  const [passRate, setPassRate] = useState(0)
  const [yearsOfOperation, setYearsOfOperation] = useState(0)
  const [selectedNews, setSelectedNews] = useState<any>(null)
  const [statsSettings, setStatsSettings] = useState({
    title: 'Our Impact in Numbers',
    subtitle: 'Building excellence in education for over six decades',
    foundingYear: 1960,
    teacherStudentRatio: '1:15',
    beceParticipation: '100%',
    becePassRate: '85',
    gradeLevels: '9'
  })

  useEffect(() => {
    fetchLatestContent()
  }, [])

  const fetchLatestContent = async () => {
    
    // Fetch latest news
    const { data: news } = await supabase
      .from('news')
      .select('*')
      .eq('published', true)
      .order('created_at', { ascending: false })
      .limit(3)
    
    if (news) setLatestNews(news)

    // Fetch latest events
    const { data: events } = await supabase
      .from('events')
      .select('*')
      .order('event_date', { ascending: true })
      .limit(3)
    
    if (events) setLatestEvents(events)

    // Fetch spotlight photos for slideshow (photos marked as spotlight)
    const { data: photos } = await supabase
      .from('gallery_photos')
      .select('*')
      .eq('is_spotlight', true)
      .order('created_at', { ascending: false })
      .limit(10)
    
    if (photos && photos.length > 0) {
      setGalleryPhotos(photos)
    } else {
      // Fallback to latest 5 photos if no spotlight photos
      const { data: fallbackPhotos } = await supabase
        .from('gallery_photos')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5)
      
      if (fallbackPhotos) setGalleryPhotos(fallbackPhotos)
    }

    // Fetch counts from API route to bypass RLS
    try {
      const response = await fetch(`/api/public/stats?t=${new Date().getTime()}`, { 
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      })
      if (response.ok) {
        const data = await response.json()
        console.log('Stats from API:', data)
        setStudentCount(data.studentCount || 0)
        setTeacherCount(data.teacherCount || 0)
      } else {
        console.error('Failed to fetch stats:', response.status)
      }
    } catch (error) {
      console.error('Error fetching stats:', error)
    }

    // Fetch statistics settings from database
    const { data: settings } = await supabase
      .from('system_settings')
      .select('setting_key, setting_value')
      .in('setting_key', ['stats_title', 'stats_subtitle', 'founding_year', 'teacher_student_ratio', 'bece_participation', 'bece_pass_rate', 'grade_levels'])

    if (settings && settings.length > 0) {
      const settingsObj: any = {}
      ;(settings as any[]).forEach((s: any) => {
        settingsObj[s.setting_key] = s.setting_value
      })
      
      const foundingYearValue = parseInt(settingsObj.founding_year || '1960')
      const becePassRateValue = parseInt(settingsObj.bece_pass_rate || '85')
      
      setStatsSettings({
        title: settingsObj.stats_title || 'Our Impact in Numbers',
        subtitle: settingsObj.stats_subtitle || 'Building excellence in education for over six decades',
        foundingYear: foundingYearValue,
        teacherStudentRatio: settingsObj.teacher_student_ratio || '1:15',
        beceParticipation: settingsObj.bece_participation || '100%',
        becePassRate: settingsObj.bece_pass_rate || '85',
        gradeLevels: settingsObj.grade_levels || '9'
      })
      
      // Set pass rate from settings (BECE pass rate)
      setPassRate(becePassRateValue)
      
      // Calculate years of operation using the fetched founding year
      const currentYear = new Date().getFullYear()
      setYearsOfOperation(currentYear - foundingYearValue)
    } else {
      // Fallback if no settings found
      const currentYear = new Date().getFullYear()
      setYearsOfOperation(currentYear - 1960)
      setPassRate(85)
    }
  }

  const nextPhoto = () => {
    if (!isTransitioning) {
      setIsTransitioning(true)
      setTimeout(() => {
        setCurrentPhotoIndex((prev) => (prev + 1) % galleryPhotos.length)
        setIsTransitioning(false)
      }, 300)
    }
  }

  const prevPhoto = () => {
    if (!isTransitioning) {
      setIsTransitioning(true)
      setTimeout(() => {
        setCurrentPhotoIndex((prev) => (prev - 1 + galleryPhotos.length) % galleryPhotos.length)
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
    if (galleryPhotos.length > 0) {
      const interval = setInterval(() => {
        if (!isTransitioning) {
          setIsTransitioning(true)
          setTimeout(() => {
            setCurrentPhotoIndex((prev) => (prev + 1) % galleryPhotos.length)
            setIsTransitioning(false)
          }, 300)
        }
      }, 5000)
      return () => clearInterval(interval)
    }
  }, [galleryPhotos, isTransitioning])

  return (
    <div className="min-h-screen">
      {/* Header with Ghana flag colors and School Crest */}
      <header className="sticky top-0 z-50 relative overflow-hidden">
        {/* Ghana Flag Border */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-ghana-red via-ghana-gold to-ghana-green"></div>
        
        {/* Main Header */}
        <div className="bg-gradient-to-r from-methodist-gold via-yellow-500 to-yellow-600 shadow-lg border-b-4 border-yellow-700">
          <nav className="container mx-auto px-4 lg:px-6 py-4">
            <div className="flex items-center justify-between gap-4 sm:gap-8 lg:gap-12">
              {/* Logo and School Name */}
              <div className="flex items-center space-x-2 sm:space-x-3 lg:space-x-5 flex-1 min-w-0">
                <div className="relative flex-shrink-0">
                  <div className="absolute inset-0 bg-white rounded-full blur-md opacity-30"></div>
                  <div className="relative bg-gradient-to-br from-white to-gray-50 rounded-full p-1.5 sm:p-2 lg:p-2.5 shadow-xl ring-2 sm:ring-4 ring-white ring-opacity-30">
                    <Image
                      src="/icons/school crest.png"
                      alt="Biriwa Methodist School Crest"
                      width={50}
                      height={50}
                      className="object-contain sm:w-[65px] sm:h-[65px] lg:w-[75px] lg:h-[75px]"
                      priority
                    />
                  </div>
                </div>
                <div className="space-y-0.5 lg:space-y-1 min-w-0 flex-1">
                  <h1 className="text-base sm:text-lg md:text-xl lg:text-2xl xl:text-3xl font-extrabold text-methodist-blue tracking-tight leading-tight drop-shadow-lg">
                    <span className="block sm:inline">BIRIWA METHODIST 'C'</span>
                    {' '}
                    <span className="block sm:inline">BASIC SCHOOL</span>
                  </h1>
                  <div className="flex items-center space-x-1 sm:space-x-1.5 lg:space-x-2">
                    <div className="h-0.5 w-4 sm:w-6 lg:w-8 bg-methodist-blue flex-shrink-0"></div>
                    <p className="text-[10px] sm:text-xs lg:text-sm text-methodist-blue font-semibold italic tracking-wide drop-shadow">DISCIPLINE WITH HARDWORK</p>
                    <div className="h-0.5 w-4 sm:w-6 lg:w-8 bg-methodist-blue flex-shrink-0"></div>
                  </div>
                </div>
              </div>
              
              {/* Navigation Menu */}
              <div className="flex items-center space-x-2 sm:space-x-3 lg:space-x-6 flex-shrink-0">
                {/* Desktop Navigation */}
                <nav className="hidden min-[1025px]:flex items-center space-x-3 xl:space-x-6">
                  <Link href="/" className="group relative text-sm xl:text-base font-bold transition-all duration-200 pb-1 whitespace-nowrap drop-shadow-lg">
                    <span className={`transition-colors ${pathname === '/' ? 'text-blue-900' : 'text-white group-hover:text-blue-900'}`}>Home</span>
                    <span className={`absolute bottom-0 left-0 h-0.5 bg-blue-900 transition-all duration-300 ${pathname === '/' ? 'w-full' : 'w-0 group-hover:w-full'}`}></span>
                  </Link>
                  <Link href="/about" className="group relative text-sm xl:text-base font-bold transition-all duration-200 pb-1 whitespace-nowrap drop-shadow-lg">
                    <span className={`transition-colors ${pathname === '/about' ? 'text-blue-900' : 'text-white group-hover:text-blue-900'}`}>About</span>
                    <span className={`absolute bottom-0 left-0 h-0.5 bg-blue-900 transition-all duration-300 ${pathname === '/about' ? 'w-full' : 'w-0 group-hover:w-full'}`}></span>
                  </Link>
                  <Link href="/events" className="group relative text-sm xl:text-base font-bold transition-all duration-200 pb-1 whitespace-nowrap drop-shadow-lg">
                    <span className={`transition-colors ${pathname === '/events' ? 'text-blue-900' : 'text-white group-hover:text-blue-900'}`}>Academic</span>
                    <span className={`absolute bottom-0 left-0 h-0.5 bg-blue-900 transition-all duration-300 ${pathname === '/events' ? 'w-full' : 'w-0 group-hover:w-full'}`}></span>
                  </Link>
                  <Link href="/admission" className="group relative text-sm xl:text-base font-bold transition-all duration-200 pb-1 whitespace-nowrap drop-shadow-lg">
                    <span className={`transition-colors ${pathname === '/admission' ? 'text-blue-900' : 'text-white group-hover:text-blue-900'}`}>Admission</span>
                    <span className={`absolute bottom-0 left-0 h-0.5 bg-blue-900 transition-all duration-300 ${pathname === '/admission' ? 'w-full' : 'w-0 group-hover:w-full'}`}></span>
                  </Link>
                  <Link href="/gallery" className="group relative text-sm xl:text-base font-bold transition-all duration-200 pb-1 whitespace-nowrap drop-shadow-lg">
                    <span className={`transition-colors ${pathname === '/gallery' ? 'text-blue-900' : 'text-white group-hover:text-blue-900'}`}>Gallery</span>
                    <span className={`absolute bottom-0 left-0 h-0.5 bg-blue-900 transition-all duration-300 ${pathname === '/gallery' ? 'w-full' : 'w-0 group-hover:w-full'}`}></span>
                  </Link>
                </nav>
                
                {/* Portal Login Button */}
                <Link href="/login" className="hidden min-[1025px]:flex group relative bg-blue-900 text-white text-sm xl:text-base font-extrabold py-2.5 xl:py-3 px-5 xl:px-7 rounded-xl overflow-hidden shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-110 whitespace-nowrap">
                  <span className="relative z-10 flex items-center space-x-2">
                    <span>PORTAL</span>
                    <svg className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </span>
                  <div className="absolute inset-0 bg-blue-800 transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left"></div>
                </Link>
                
                {/* Mobile Menu Button */}
                <button
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className="max-[1024px]:flex hidden text-white hover:text-methodist-blue transition-colors p-2 relative w-10 h-10 items-center justify-center"
                  aria-label="Toggle menu"
                >
                  <div className="w-6 h-5 relative flex flex-col justify-between">
                    <span className={`block h-0.5 w-full bg-current transform transition-all duration-300 ease-in-out ${mobileMenuOpen ? 'rotate-45 translate-y-2' : ''}`}></span>
                    <span className={`block h-0.5 w-full bg-current transition-all duration-300 ease-in-out ${mobileMenuOpen ? 'opacity-0' : 'opacity-100'}`}></span>
                    <span className={`block h-0.5 w-full bg-current transform transition-all duration-300 ease-in-out ${mobileMenuOpen ? '-rotate-45 -translate-y-2' : ''}`}></span>
                  </div>
                </button>
              </div>
            </div>
          </nav>
        </div>
        
        {/* Bottom Accent Line */}
        <div className="h-1 bg-gradient-to-r from-transparent via-white to-transparent opacity-30"></div>
        
        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="max-[1024px]:block hidden bg-white border-t border-gray-200 shadow-lg">
            <nav className="container mx-auto px-6 py-4 space-y-3">
              <Link href="/" className={`block font-bold py-2 px-4 rounded-lg transition-all duration-200 ${pathname === '/' ? 'bg-blue-900 text-white' : 'text-methodist-blue hover:bg-ghana-gold hover:text-white'}`}
                onClick={() => setMobileMenuOpen(false)}>
                Home
              </Link>
              <Link href="/about" className={`block font-bold py-2 px-4 rounded-lg transition-all duration-200 ${pathname === '/about' ? 'bg-blue-900 text-white' : 'text-methodist-blue hover:bg-ghana-gold hover:text-white'}`}
                onClick={() => setMobileMenuOpen(false)}>
                About
              </Link>
              <Link href="/events" className={`block font-bold py-2 px-4 rounded-lg transition-all duration-200 ${pathname === '/events' ? 'bg-blue-900 text-white' : 'text-methodist-blue hover:bg-ghana-gold hover:text-white'}`}
                onClick={() => setMobileMenuOpen(false)}>
                Academic
              </Link>
              <Link href="/admission" className={`block font-bold py-2 px-4 rounded-lg transition-all duration-200 ${pathname === '/admission' ? 'bg-blue-900 text-white' : 'text-methodist-blue hover:bg-ghana-gold hover:text-white'}`}
                onClick={() => setMobileMenuOpen(false)}>
                Admission
              </Link>
              <Link href="/gallery" className={`block font-bold py-2 px-4 rounded-lg transition-all duration-200 ${pathname === '/gallery' ? 'bg-blue-900 text-white' : 'text-methodist-blue hover:bg-ghana-gold hover:text-white'}`}
                onClick={() => setMobileMenuOpen(false)}>
                Gallery
              </Link>
              <Link href="/login" className="block text-white font-extrabold py-3 px-4 rounded-lg bg-blue-900 hover:bg-blue-800 transition-all duration-200 text-center shadow-lg"
                onClick={() => setMobileMenuOpen(false)}>
                PORTAL LOGIN
              </Link>
            </nav>
          </div>
        )}
      </header>

      {/* Hero Section */}
      <section className="methodist-gradient text-white py-12 md:py-20">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-5xl font-bold mb-4 leading-tight">
            Discipline with Hardwork
          </h2>
          <p className="text-lg md:text-xl mb-4 text-gray-200">
            Nurturing Young Minds for a Bright Future
          </p>
          <p className="text-base md:text-lg mb-8 text-gray-300 max-w-2xl mx-auto">
            Providing relevant, quality, and accessible education in the heart of Biriwa, Central Region, Ghana
          </p>
          <div className="flex flex-col md:flex-row justify-center space-y-4 md:space-y-0 md:space-x-4">
            <Link href="/admission" className="bg-ghana-gold text-methodist-blue font-bold py-3 px-8 rounded-lg hover:bg-yellow-300 transition-colors w-full md:w-auto">
              Apply for Admission
            </Link>
            <Link href="/about" className="bg-white text-methodist-blue font-bold py-3 px-8 rounded-lg hover:bg-gray-100 transition-colors w-full md:w-auto">
              Learn More
            </Link>
          </div>
        </div>
      </section>

      {/* Announcements Section */}
      <AnnouncementsBanner />

      {/* Photo Gallery Slideshow */}
      {galleryPhotos.length > 0 && (
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
                    src={galleryPhotos[currentPhotoIndex].photo_url}
                    alt={galleryPhotos[currentPhotoIndex].title}
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
                      {galleryPhotos[currentPhotoIndex].title}
                    </h4>
                    {galleryPhotos[currentPhotoIndex].description && (
                      <p className="text-gray-200 text-base md:text-lg drop-shadow-md">
                        {galleryPhotos[currentPhotoIndex].description}
                      </p>
                    )}
                    <div className="flex items-center mt-3 space-x-2">
                      <div className="w-12 h-0.5 bg-ghana-gold rounded-full"></div>
                      <span className="text-gray-300 text-sm">
                        {galleryPhotos[currentPhotoIndex].album_name}
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
                    {currentPhotoIndex + 1} / {galleryPhotos.length}
                  </span>
                </div>
              </div>

              {/* Thumbnail Navigation Dots */}
              <div className="flex justify-center mt-6 space-x-3 flex-wrap gap-2">
                {galleryPhotos.map((_, index) => (
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
      )}

      {/* Latest News */}
      {latestNews.length > 0 && (
        <section className="py-16 bg-gray-50">
          <div className="container mx-auto px-6">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-3xl font-bold text-methodist-blue">Latest News</h3>
              <Link href="/news" className="text-ghana-green hover:text-green-700 font-semibold">
                View All →
              </Link>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              {latestNews.map((news) => (
                <div 
                  key={news.id} 
                  onClick={() => setSelectedNews(news)}
                  className="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-all cursor-pointer transform hover:scale-105 duration-300"
                >
                  {news.featured_image && (
                    <div className="relative h-48">
                      <Image
                        src={news.featured_image}
                        alt={news.title}
                        fill
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                        className="object-cover"
                      />
                    </div>
                  )}
                  <div className="p-6">
                    <span className="text-xs font-semibold text-methodist-gold uppercase">{news.category}</span>
                    <h4 className="text-xl font-bold text-gray-800 mt-2 mb-3">{news.title}</h4>
                    <p className="text-gray-600 text-sm mb-4">{news.summary || news.content.substring(0, 100) + '...'}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">{new Date(news.created_at).toLocaleDateString()}</span>
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
        </section>
      )}

      {/* Upcoming Events */}
      {latestEvents.length > 0 && (
        <section className="py-16 bg-white">
          <div className="container mx-auto px-6">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-3xl font-bold text-methodist-blue">Upcoming Events</h3>
              <Link href="/events" className="text-ghana-green hover:text-green-700 font-semibold">
                View All →
              </Link>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              {latestEvents.map((event) => (
                <div key={event.id} className="bg-gray-50 rounded-lg p-6 border-l-4 border-methodist-gold hover:shadow-lg transition-shadow">
                  <div className="flex items-start space-x-4">
                    <div className="bg-methodist-blue text-white rounded-lg p-3 text-center min-w-[60px]">
                      <div className="text-2xl font-bold">{new Date(event.event_date).getDate()}</div>
                      <div className="text-xs uppercase">{new Date(event.event_date).toLocaleString('default', { month: 'short' })}</div>
                    </div>
                    <div className="flex-1">
                      <h4 className="text-lg font-bold text-gray-800 mb-2">{event.title}</h4>
                      <p className="text-gray-600 text-sm mb-3">{event.description}</p>
                      {event.location && (
                        <p className="text-xs text-gray-500">📍 {event.location}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* School Statistics Dashboard */}
      <section className="py-12 md:py-16 bg-white border-t-4 border-methodist-gold">
        <div className="container mx-auto px-4 md:px-6">
          <div className="text-center mb-8 md:mb-12">
            <h3 className="text-2xl md:text-4xl font-bold text-methodist-blue mb-2 md:mb-3">
              {statsSettings.title}
            </h3>
            <p className="text-sm md:text-base text-gray-600 max-w-2xl mx-auto">
              {statsSettings.subtitle}
            </p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 max-w-5xl mx-auto">
            {/* Years of Operation */}
            <div className="bg-gradient-to-br from-methodist-blue to-blue-800 rounded-xl p-4 md:p-6 shadow-lg text-white text-center transform hover:scale-105 transition-transform flex flex-col justify-center h-full">
              <div className="text-3xl md:text-5xl font-extrabold mb-1 md:mb-2">{yearsOfOperation}+</div>
              <div className="text-xs md:text-sm uppercase tracking-wider opacity-90">Years of Excellence</div>
            </div>

            {/* Student Count */}
            <div className="bg-gradient-to-br from-ghana-green to-green-700 rounded-xl p-4 md:p-6 shadow-lg text-white text-center transform hover:scale-105 transition-transform flex flex-col justify-center h-full">
              <div className="text-3xl md:text-5xl font-extrabold mb-1 md:mb-2">{studentCount}</div>
              <div className="text-xs md:text-sm uppercase tracking-wider opacity-90">Active Students</div>
            </div>

            {/* Teacher Count */}
            <div className="bg-gradient-to-br from-methodist-gold to-yellow-600 rounded-xl p-4 md:p-6 shadow-lg text-white text-center transform hover:scale-105 transition-transform flex flex-col justify-center h-full">
              <div className="text-3xl md:text-5xl font-extrabold mb-1 md:mb-2">{teacherCount}</div>
              <div className="text-xs md:text-sm uppercase tracking-wider opacity-90">Qualified Teachers</div>
            </div>

            {/* Pass Rate */}
            <div className="bg-gradient-to-br from-ghana-red to-red-700 rounded-xl p-4 md:p-6 shadow-lg text-white text-center transform hover:scale-105 transition-transform flex flex-col justify-center h-full">
              <div className="text-3xl md:text-5xl font-extrabold mb-1 md:mb-2">{passRate}%</div>
              <div className="text-xs md:text-sm uppercase tracking-wider opacity-90">Pass Rate</div>
            </div>
          </div>

          {/* Additional Stats Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 max-w-4xl mx-auto mt-6 md:mt-8">
            <div className="bg-gray-50 rounded-lg p-4 md:p-6 text-center border-2 border-gray-200 hover:border-methodist-blue transition-colors flex flex-col justify-center h-full">
              <div className="text-2xl md:text-3xl font-bold text-methodist-blue mb-1">{statsSettings.teacherStudentRatio}</div>
              <div className="text-xs md:text-sm text-gray-600">Teacher-Student Ratio</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 md:p-6 text-center border-2 border-gray-200 hover:border-methodist-blue transition-colors flex flex-col justify-center h-full">
              <div className="text-2xl md:text-3xl font-bold text-methodist-blue mb-1">{statsSettings.beceParticipation}</div>
              <div className="text-xs md:text-sm text-gray-600">BECE Participation</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 md:p-6 text-center border-2 border-gray-200 hover:border-methodist-blue transition-colors flex flex-col justify-center h-full sm:col-span-2 lg:col-span-1">
              <div className="text-2xl md:text-3xl font-bold text-methodist-blue mb-1">{statsSettings.gradeLevels}</div>
              <div className="text-xs md:text-sm text-gray-600">Grade Levels (KG - Basic 9)</div>
            </div>
          </div>
        </div>
      </section>

      {/* Certifications & Affiliations */}
      <section className="py-16 bg-gradient-to-b from-gray-50 to-white">
        <div className="container mx-auto px-6">
          <div className="text-center mb-12">
            <h3 className="text-4xl font-bold text-methodist-blue mb-3">
              Accreditation & Affiliations
            </h3>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Proudly recognized and affiliated with leading educational bodies in Ghana
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-12 max-w-4xl mx-auto items-center">
            {/* Ghana Education Service */}
            <div className="bg-white rounded-xl p-10 shadow-lg text-center hover:shadow-2xl transition-all duration-300 border-2 border-gray-100 hover:border-methodist-blue transform hover:scale-105">
              <div className="w-40 h-40 mx-auto mb-6 flex items-center justify-center bg-gradient-to-br from-ghana-red via-ghana-gold to-ghana-green rounded-full p-2">
                <div className="bg-white rounded-full w-full h-full flex items-center justify-center overflow-hidden">
                  <img 
                    src="/logo-GES.png" 
                    alt="Ghana Education Service Logo" 
                    className="w-full h-full object-contain p-2"
                  />
                </div>
              </div>
              <h4 className="font-bold text-gray-800 mb-2 text-lg">Ghana Education Service</h4>
              <p className="text-sm text-gray-600">Accredited & Regulated</p>
            </div>

            {/* Methodist Church Ghana */}
            <div className="bg-white rounded-xl p-10 shadow-lg text-center hover:shadow-2xl transition-all duration-300 border-2 border-gray-100 hover:border-methodist-blue transform hover:scale-105">
              <div className="w-40 h-40 mx-auto mb-6 flex items-center justify-center bg-methodist-blue rounded-full p-2">
                <div className="bg-white rounded-full w-full h-full flex items-center justify-center overflow-hidden">
                  <img 
                    src="/chuch-logo.png" 
                    alt="Methodist Church Ghana Logo" 
                    className="w-full h-full object-contain p-2"
                  />
                </div>
              </div>
              <h4 className="font-bold text-gray-800 mb-2 text-lg">Methodist Church Ghana</h4>
              <p className="text-sm text-gray-600">Faith-Based Education</p>
            </div>
          </div>

          {/* Trust Badges */}
          <div className="mt-12 bg-white rounded-xl p-8 shadow-md max-w-4xl mx-auto border-l-4 border-methodist-gold">
            <div className="grid md:grid-cols-3 gap-6 text-center">
              <div>
                <div className="text-ghana-green mb-2">
                  <svg className="w-8 h-8 mx-auto" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
                  </svg>
                </div>
                <h5 className="font-semibold text-gray-800 mb-1">Safe Learning Environment</h5>
                <p className="text-xs text-gray-600">Child protection policies in place</p>
              </div>
              <div>
                <div className="text-ghana-green mb-2">
                  <svg className="w-8 h-8 mx-auto" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
                  </svg>
                </div>
                <h5 className="font-semibold text-gray-800 mb-1">Qualified Staff</h5>
                <p className="text-xs text-gray-600">Licensed & trained educators</p>
              </div>
              <div>
                <div className="text-ghana-green mb-2">
                  <svg className="w-8 h-8 mx-auto" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
                  </svg>
                </div>
                <h5 className="font-semibold text-gray-800 mb-1">Modern Facilities</h5>
                <p className="text-xs text-gray-600">Well-equipped classrooms & labs</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Links */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-6">
          <h3 className="text-3xl font-bold text-center mb-12 text-methodist-blue">
            School Information
          </h3>
          <div className="grid md:grid-cols-5 gap-6">
            <Link href="/news" className="text-center p-6 rounded-lg hover:bg-gray-50 transition-colors">
              <Newspaper className="w-12 h-12 mx-auto mb-3 text-ghana-green" />
              <h4 className="font-semibold text-gray-800">News</h4>
              <p className="text-sm text-gray-600">Latest updates</p>
            </Link>

            <Link href="/events" className="text-center p-6 rounded-lg hover:bg-gray-50 transition-colors">
              <Calendar className="w-12 h-12 mx-auto mb-3 text-ghana-green" />
              <h4 className="font-semibold text-gray-800">Events</h4>
              <p className="text-sm text-gray-600">Upcoming activities</p>
            </Link>

            <Link href="/gallery" className="text-center p-6 rounded-lg hover:bg-gray-50 transition-colors">
              <ImageIcon className="w-12 h-12 mx-auto mb-3 text-ghana-green" />
              <h4 className="font-semibold text-gray-800">Photo Gallery</h4>
              <p className="text-sm text-gray-600">School memories</p>
            </Link>

            <Link href="/admission" className="text-center p-6 rounded-lg hover:bg-gray-50 transition-colors">
              <FileText className="w-12 h-12 mx-auto mb-3 text-ghana-green" />
              <h4 className="font-semibold text-gray-800">Admission</h4>
              <p className="text-sm text-gray-600">Join our school</p>
            </Link>

            <Link href="/about" className="text-center p-6 rounded-lg hover:bg-gray-50 transition-colors">
              <GraduationCap className="w-12 h-12 mx-auto mb-3 text-ghana-green" />
              <h4 className="font-semibold text-gray-800">About Us</h4>
              <p className="text-sm text-gray-600">Our history</p>
            </Link>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h3 className="text-3xl font-bold mb-4 text-methodist-blue">
                About Our School
              </h3>
              <p className="text-gray-700 mb-4 text-justify">
                Biriwa Methodist 'C' Basic School is one of the leading basic educational institutions in the Central Region of Ghana,
                committed to providing quality education from KG 1 through to Basic 9.
              </p>
              <p className="text-gray-700 mb-4 text-justify">
                Guided by our motto <span className="font-bold text-methodist-blue">"Discipline with Hardwork"</span>, 
                we combine academic excellence with moral education, preparing students for success in their
                future academic pursuits and as responsible citizens of Ghana.
              </p>
              <div className="grid grid-cols-2 gap-4 mt-6">
                <div className="text-center p-4 bg-white rounded-lg shadow-md border-2 border-transparent hover:border-methodist-blue transition-colors">
                  <div className="text-3xl font-bold text-methodist-blue">{studentCount}</div>
                  <div className="text-sm text-gray-600 font-semibold">Students</div>
                </div>
                <div className="text-center p-4 bg-white rounded-lg shadow-md border-2 border-transparent hover:border-ghana-green transition-colors">
                  <div className="text-3xl font-bold text-ghana-green">{teacherCount}</div>
                  <div className="text-sm text-gray-600 font-semibold">Teachers</div>
                </div>
              </div>
            </div>
            <div className="bg-white p-8 rounded-lg shadow-lg">
              <div className="mb-6">
                <div className="inline-block bg-ghana-red text-white px-4 py-2 rounded-full text-sm font-bold mb-3">
                  MISSION STATEMENT
                </div>
                <p className="text-gray-700 leading-relaxed text-justify">
                  To provide relevant education and to offer the highest learning environment in which 
                  students irrespective of race, ethnic, and religious background are motivated and 
                  supported in order to achieve their full potential in their academic discipline and 
                  to become productive members of the society and as individuals.
                </p>
              </div>
              <div>
                <div className="inline-block bg-ghana-red text-white px-4 py-2 rounded-full text-sm font-bold mb-3">
                  VISION STATEMENT
                </div>
                <p className="text-gray-700 leading-relaxed text-justify">
                  To develop well rounded, confident and responsible individuals who aspire to 
                  achieve their full potential by providing a serene, happy, safe and supportive 
                  learning environment in which everyone is unique and all achievement are celebrated.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

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
                <button
                  onClick={() => setSelectedNews(null)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <h2 className="text-3xl font-bold text-methodist-blue mb-4">
                {selectedNews.title}
              </h2>
              
              <div className="flex items-center space-x-4 mb-6 text-sm text-gray-500">
                <div className="flex items-center">
                  <Calendar className="w-4 h-4 mr-2" />
                  {new Date(selectedNews.created_at).toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </div>
                <div className="flex items-center">
                  <Newspaper className="w-4 h-4 mr-2 text-ghana-green" />
                  News Article
                </div>
              </div>
              
              {selectedNews.summary && (
                <p className="text-lg text-gray-700 mb-6 font-medium border-l-4 border-methodist-gold pl-4 italic">
                  {selectedNews.summary}
                </p>
              )}
              
              <div className="prose max-w-none text-gray-700 leading-relaxed">
                {selectedNews.content.split('\n').map((paragraph: string, index: number) => (
                  paragraph.trim() && <p key={index} className="mb-4">{paragraph}</p>
                ))}
              </div>
              
              <div className="mt-8 pt-6 border-t border-gray-200 flex justify-between items-center">
                <button
                  onClick={() => setSelectedNews(null)}
                  className="bg-methodist-blue text-white px-6 py-2 rounded-lg hover:bg-blue-800 transition-colors"
                >
                  Close
                </button>
                <Link 
                  href="/news"
                  className="text-ghana-green hover:text-green-700 font-semibold flex items-center gap-2"
                >
                  View All News
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="methodist-gradient text-white py-12">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 md:gap-12 text-center lg:text-left">
            <div className="flex flex-col items-center lg:items-start">
              <h5 className="font-bold text-lg mb-4 border-b-2 border-ghana-gold pb-2 inline-block lg:block">Contact Us</h5>
              <p className="text-gray-300 text-sm mb-2">Biriwa, Central Region</p>
              <p className="text-gray-300 text-sm mb-2">Ghana</p>
              <p className="text-gray-300 text-sm mb-2">Phone: +233 24 393 0752</p>
              <p className="text-gray-300 text-sm">Email: info@biriwamethodist.edu.gh</p>
            </div>
            <div className="flex flex-col items-center lg:items-start">
              <h5 className="font-bold text-lg mb-4 border-b-2 border-ghana-gold pb-2 inline-block lg:block">Quick Links</h5>
              <ul className="space-y-2 text-sm">
                <li><Link href="/about" className="text-gray-300 hover:text-ghana-gold transition-colors">About Us</Link></li>
                <li><Link href="/admission" className="text-gray-300 hover:text-ghana-gold transition-colors">Admissions</Link></li>
                <li><Link href="/events" className="text-gray-300 hover:text-ghana-gold transition-colors">Events</Link></li>
                <li><Link href="/gallery" className="text-gray-300 hover:text-ghana-gold transition-colors">Gallery</Link></li>
              </ul>
            </div>
            <div className="flex flex-col items-center lg:items-start">
              <h5 className="font-bold text-lg mb-4 border-b-2 border-ghana-gold pb-2 inline-block lg:block">Portals</h5>
              <ul className="space-y-2 text-sm">
                <li><Link href="/login?portal=student" className="text-gray-300 hover:text-ghana-gold transition-colors">Student Portal</Link></li>
                <li><Link href="/login?portal=teacher" className="text-gray-300 hover:text-ghana-gold transition-colors">Teacher Portal</Link></li>
               {/* <li><Link href="/login?portal=admin" className="text-gray-300 hover:text-ghana-gold">Admin Portal</Link></li> */}
              </ul>
            </div>
            <div className="flex flex-col items-center lg:items-start">
              <h5 className="font-bold text-lg mb-4 border-b-2 border-ghana-gold pb-2 inline-block lg:block">Connect With Us</h5>
              <div className="flex justify-center lg:justify-start space-x-4 mb-4">
                <a href="https://www.facebook.com" target="_blank" rel="noopener noreferrer" className="text-gray-300 hover:text-ghana-gold transition-colors">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                </a>
                <a href="https://www.instagram.com" target="_blank" rel="noopener noreferrer" className="text-gray-300 hover:text-ghana-gold transition-colors">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                  </svg>
                </a>
                <a href="https://www.tiktok.com" target="_blank" rel="noopener noreferrer" className="text-gray-300 hover:text-ghana-gold transition-colors">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
                  </svg>
                </a>
              </div>
              <p className="text-gray-300 text-sm mb-2">Monday - Friday</p>
              <p className="text-gray-300 text-sm">7:30 AM - 3:00 PM</p>
            </div>
          </div>
          <div className="border-t border-gray-600 mt-8 pt-6 text-center text-sm text-gray-300">
            <p>&copy; 2025 Biriwa Methodist 'C' Basic School. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
