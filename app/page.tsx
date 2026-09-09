import { Suspense } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import SiteHeader from '@/components/SiteHeader'
import AnnouncementsBanner from '@/components/AnnouncementsBanner'
import { 
  Newspaper, 
  Calendar, 
  Image as ImageIcon, 
  FileText, 
  GraduationCap, 
  CheckCircle2, 
  ArrowRight,
  ShieldCheck
} from 'lucide-react'

// Import home section components
import HomeGallery from '@/app/components/home/HomeGallery'
import HomeNews from '@/app/components/home/HomeNews'
import HomeEvents from '@/app/components/home/HomeEvents'
import HomeStats from '@/app/components/home/HomeStats'
import HomeAbout from '@/app/components/home/HomeAbout'
import HomeFooter from '@/app/components/home/HomeFooter'
import { HeroSkeleton, NewsSkeleton, EventsSkeleton, StatsSkeleton } from '@/app/components/home/Skeletons'
import { PortalFooter } from '@/components/PortalFooter'

export const revalidate = 300 // Revalidate every 5 minutes

export default function HomePage() {
  const quickLinks = [
    {
      href: '/news',
      title: 'School News',
      description: 'Latest happenings & press',
      icon: Newspaper,
      color: 'text-emerald-600 dark:text-emerald-400',
      bg: 'bg-emerald-50 dark:bg-emerald-950/40'
    },
    {
      href: '/events',
      title: 'Term Events',
      description: 'Key dates & celebrations',
      icon: Calendar,
      color: 'text-[#003B5C] dark:text-blue-400',
      bg: 'bg-blue-50 dark:bg-blue-950/40'
    },
    {
      href: '/gallery',
      title: 'Photo Gallery',
      description: 'Moments & campus life',
      icon: ImageIcon,
      color: 'text-purple-600 dark:text-purple-400',
      bg: 'bg-purple-50 dark:bg-purple-950/40'
    },
    {
      href: '/admission',
      title: 'Admissions',
      description: 'Enrol your ward today',
      icon: FileText,
      color: 'text-amber-600 dark:text-amber-400',
      bg: 'bg-amber-50 dark:bg-amber-950/40'
    },
    {
      href: '/about',
      title: 'About Us',
      description: 'Our heritage & ethos',
      icon: GraduationCap,
      color: 'text-rose-600 dark:text-rose-400',
      bg: 'bg-rose-50 dark:bg-rose-950/40'
    }
  ]

  const trustHighlights = [
    {
      title: 'Safe Learning Environment',
      desc: 'Rigorous child safety and welfare policies across campus'
    },
    {
      title: 'Qualified Teaching Staff',
      desc: 'Certified and licensed Ghana Education Service educators'
    },
    {
      title: 'Modern Classrooms & ICT',
      desc: 'Active digital computing and science-enabled resource facilities'
    }
  ]

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-900 font-sans text-slate-900 dark:text-slate-100 flex flex-col transition-colors selection:bg-[#003B5C] selection:text-white">
      <SiteHeader />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden bg-gradient-to-r from-[#003B5C] via-[#002a42] to-slate-900 text-white py-14 sm:py-20 md:py-28 border-b border-white/10">
          <div className="absolute top-0 right-0 -mt-16 -mr-16 h-72 w-72 sm:h-96 sm:w-96 rounded-full bg-blue-500/20 blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 -mb-16 -ml-16 h-72 w-72 sm:h-96 sm:w-96 rounded-full bg-amber-500/20 blur-3xl pointer-events-none" />

          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10 space-y-4 sm:space-y-6">
            
            {/* School Motto Pill */}
            <div className="inline-flex items-center px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-amber-300 text-xs sm:text-sm font-black uppercase tracking-widest shadow-inner">
              <span>Discipline with Hardwork</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black tracking-tight leading-tight text-white">
              Nurturing Young Minds for a <span className="bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-200 bg-clip-text text-transparent">Bright Future</span>
            </h1>

            {/* Subtitles */}
            <p className="text-sm sm:text-base md:text-lg text-blue-100/90 max-w-2xl mx-auto font-medium leading-relaxed">
              Providing accessible, high-standard primary and junior high basic education in the heart of Biriwa, Central Region, Ghana.
            </p>

            {/* CTAs */}
            <div className="pt-2 sm:pt-4 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 max-w-md mx-auto sm:max-w-none">
              <Link
                href="/admission"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-amber-400 hover:bg-amber-300 text-[#003B5C] font-black text-xs sm:text-sm px-7 py-3.5 rounded-xl shadow-lg hover:shadow-xl transition-all active:scale-95"
              >
                <span>Apply for Admission</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              
              <Link
                href="/about"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white font-bold text-xs sm:text-sm px-7 py-3.5 rounded-xl backdrop-blur-md border border-white/20 transition-all active:scale-95"
              >
                <span>Explore School Profile</span>
              </Link>
            </div>
          </div>
        </section>

        {/* Announcements Banner */}
        <AnnouncementsBanner />

        {/* Quick Links Matrix */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-6 sm:-mt-8 relative z-20">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
            {quickLinks.map((item, idx) => {
              const Icon = item.icon
              const isLastOnMobileOdd = idx === quickLinks.length - 1

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`group bg-white dark:bg-slate-800/95 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-700/80 p-3.5 sm:p-5 shadow-sm hover:shadow-md hover:border-[#003B5C]/30 dark:hover:border-blue-500/30 transition-all duration-200 flex flex-col justify-between active:scale-[0.98] ${
                    isLastOnMobileOdd ? 'col-span-2 sm:col-span-1' : ''
                  }`}
                >
                  <div>
                    <div className={`w-10 h-10 sm:w-11 sm:h-11 rounded-2xl ${item.bg} ${item.color} flex items-center justify-center mb-3 group-hover:scale-105 transition-transform shrink-0`}>
                      <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
                    </div>
                    <h2 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white group-hover:text-[#003B5C] dark:group-hover:text-blue-400 transition-colors">
                      {item.title}
                    </h2>
                    <p className="text-[11px] text-slate-400 dark:text-slate-500 line-clamp-1 mt-0.5">
                      {item.description}
                    </p>
                  </div>

                  <div className="pt-2 sm:pt-3 mt-2 flex items-center text-[10px] sm:text-xs font-bold text-[#003B5C] dark:text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity">
                    <span>Open</span>
                    <ArrowRight className="w-3 h-3 ml-1 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </Link>
              )
            })}
          </div>
        </section>

        {/* Gallery Slideshow */}
        <section className="py-8 sm:py-12">
          <Suspense fallback={<HeroSkeleton />}>
            <HomeGallery />
          </Suspense>
        </section>

        {/* Latest News */}
        <section className="py-6 sm:py-10">
          <Suspense fallback={<NewsSkeleton />}>
            <HomeNews />
          </Suspense>
        </section>

        {/* Upcoming Events */}
        <section className="py-6 sm:py-10">
          <Suspense fallback={<EventsSkeleton />}>
            <HomeEvents />
          </Suspense>
        </section>

        {/* Statistics Banner */}
        <section className="py-6 sm:py-10">
          <Suspense fallback={<StatsSkeleton />}>
            <HomeStats />
          </Suspense>
        </section>

        {/* Accreditation & Institutional Affiliations */}
        <section className="py-12 sm:py-16 md:py-20 bg-white dark:bg-slate-800/50 border-y border-slate-200/80 dark:border-slate-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10 sm:space-y-12">
            
            {/* Header */}
            <div className="text-center space-y-2 max-w-2xl mx-auto">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/50 text-[#003B5C] dark:text-blue-300 text-xs font-bold uppercase tracking-wider">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Institutional Standing</span>
              </div>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
                Accreditation & Affiliations
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                Operating under the jurisdiction of the Ghana Education Service and the Methodist Church Ghana Educational Unit.
              </p>
            </div>

            {/* Accreditation Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 lg:gap-8 max-w-4xl mx-auto">
              
              {/* GES Card */}
              <div className="bg-slate-50/70 dark:bg-slate-900/60 rounded-2xl sm:rounded-3xl p-6 sm:p-8 border border-slate-200/80 dark:border-slate-700/80 shadow-xs hover:shadow-md hover:border-[#003B5C]/30 transition-all text-center flex flex-col items-center justify-between space-y-4">
                <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-800 p-3 sm:p-4 shadow-sm border border-slate-200/80 dark:border-slate-700 flex items-center justify-center">
                  <Image 
                    src="/logo-GES.png" 
                    alt="Ghana Education Service Logo" 
                    width={140} 
                    height={140} 
                    className="w-full h-full object-contain"
                  />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                    Ghana Education Service
                  </h3>
                  <p className="text-xs sm:text-sm font-semibold text-[#003B5C] dark:text-blue-400">
                    Officially Accredited & Regulated
                  </p>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 max-w-xs mx-auto">
                    Full compliance with the national curriculum, learning benchmarks, and BECE examinations.
                  </p>
                </div>
              </div>

              {/* Methodist Card */}
              <div className="bg-slate-50/70 dark:bg-slate-900/60 rounded-2xl sm:rounded-3xl p-6 sm:p-8 border border-slate-200/80 dark:border-slate-700/80 shadow-xs hover:shadow-md hover:border-amber-400/30 transition-all text-center flex flex-col items-center justify-between space-y-4">
                <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-800 p-3 sm:p-4 shadow-sm border border-slate-200/80 dark:border-slate-700 flex items-center justify-center">
                  <Image 
                    src="/chuch-logo.png" 
                    alt="Methodist Church Ghana Logo" 
                    width={140} 
                    height={140} 
                    className="w-full h-full object-contain"
                  />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                    Methodist Church Ghana
                  </h3>
                  <p className="text-xs sm:text-sm font-semibold text-amber-600 dark:text-amber-400">
                    Christian Values & Holistic Formation
                  </p>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 max-w-xs mx-auto">
                    Instilling moral discipline, integrity, leadership, and communal responsibility.
                  </p>
                </div>
              </div>
            </div>

            {/* School Trust Pillars */}
            <div className="bg-slate-50/70 dark:bg-slate-900/60 rounded-2xl sm:rounded-3xl p-5 sm:p-8 border border-slate-200/80 dark:border-slate-700/80 max-w-4xl mx-auto shadow-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 sm:gap-6 text-center sm:text-left">
                {trustHighlights.map((item) => (
                  <div key={item.title} className="space-y-1.5 flex flex-col items-center sm:items-start">
                    <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 w-fit">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                    <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                      {item.title}
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                      {item.desc}
                    </p>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </section>

        {/* Detailed About Section */}
        <Suspense fallback={<div className="h-96 bg-slate-100 dark:bg-slate-800 animate-pulse" />}>
          <HomeAbout />
        </Suspense>
      </main>

      {/* Public Footer */}
      <Suspense fallback={<div className="h-64 bg-[#003B5C] animate-pulse" />}>
        <HomeFooter />
      </Suspense>

      {/* Bottom Institutional Portal Anchor */}
      <PortalFooter />
    </div>
  )
}