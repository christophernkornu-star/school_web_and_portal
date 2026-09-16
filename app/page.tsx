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
import { Skeleton } from '@/components/ui/skeleton'

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
      description: 'Announcements & bulletins',
      icon: Newspaper,
    },
    {
      href: '/events',
      title: 'Term Calendar',
      description: 'Key dates & schedules',
      icon: Calendar,
    },
    {
      href: '/gallery',
      title: 'Photo Gallery',
      description: 'Campus life in pictures',
      icon: ImageIcon,
    },
    {
      href: '/admission',
      title: 'Admissions',
      description: 'Enrolment & requirements',
      icon: FileText,
    },
    {
      href: '/about',
      title: 'About Us',
      description: 'Our heritage & leadership',
      icon: GraduationCap,
    }
  ]

  const trustHighlights = [
    {
      title: 'Safe Learning Campus',
      desc: 'Rigorous child welfare and disciplinary policies.'
    },
    {
      title: 'Certified GES Teachers',
      desc: 'Licensed Ghana Education Service instructors.'
    },
    {
      title: 'Practical ICT Lab',
      desc: 'Hands-on computing and science facilities.'
    }
  ]

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-900 font-sans text-slate-900 dark:text-slate-100 flex flex-col transition-colors selection:bg-[#003B5C] selection:text-white">
      <SiteHeader />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden bg-gradient-to-r from-[#003B5C] via-[#002a42] to-slate-900 text-white py-12 sm:py-16 md:py-20 lg:py-24 border-b border-white/10">
          <div className="absolute top-0 right-0 -mt-16 -mr-16 h-64 w-64 sm:h-96 sm:w-96 rounded-full bg-blue-500/20 blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 -mb-16 -ml-16 h-64 w-64 sm:h-96 sm:w-96 rounded-full bg-amber-500/20 blur-3xl pointer-events-none" />

          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10 space-y-4 sm:space-y-5">
            
            {/* School Motto Pill */}
            <div className="inline-flex items-center px-3.5 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-amber-300 text-[11px] sm:text-xs font-black uppercase tracking-widest shadow-inner">
              <span>Discipline with Hardwork</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-black tracking-tight leading-tight text-white max-w-4xl mx-auto">
              Nurturing Young Minds for a{' '}
              <span className="bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-200 bg-clip-text text-transparent">
                Bright Future
              </span>
            </h1>

            {/* Subtitle */}
            <p className="text-xs sm:text-sm md:text-base text-blue-100/90 max-w-2xl mx-auto font-medium leading-relaxed px-2">
              Providing accessible, high-standard primary and junior high basic education in the heart of Biriwa, Central Region, Ghana.
            </p>

            {/* Responsive Call to Actions */}
            <div className="pt-2 sm:pt-4 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 max-w-sm sm:max-w-none mx-auto">
              <Link
                href="/admission"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-amber-400 hover:bg-amber-300 text-[#003B5C] font-black text-xs sm:text-sm px-6 sm:px-7 py-3 rounded-xl shadow-md hover:shadow-lg transition-all active:scale-95"
              >
                <span>Apply for Admission</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              
              <Link
                href="/about"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white font-bold text-xs sm:text-sm px-6 sm:px-7 py-3 rounded-xl backdrop-blur-md border border-white/20 transition-all active:scale-95"
              >
                <span>School Profile</span>
              </Link>
            </div>
          </div>
        </section>

        {/* Announcements Banner */}
        <AnnouncementsBanner />

        {/* Minimal Quick Links Matrix */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-6 sm:-mt-8 relative z-20">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
            {quickLinks.map((item, idx) => {
              const Icon = item.icon
              const isLastOnMobile = idx === quickLinks.length - 1

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`group bg-white dark:bg-slate-800/95 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 p-4 sm:p-5 shadow-2xs hover:shadow-md hover:border-[#003B5C]/30 dark:hover:border-blue-500/30 transition-all duration-200 flex flex-col justify-between active:scale-[0.98] ${
                    isLastOnMobile ? 'col-span-2 sm:col-span-1' : ''
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-[#003B5C]/10 dark:bg-blue-500/20 text-[#003B5C] dark:text-blue-300 flex items-center justify-center group-hover:scale-105 transition-transform shrink-0">
                      <Icon className="w-5 h-5" />
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-300 dark:text-slate-600 group-hover:text-[#003B5C] dark:group-hover:text-blue-400 group-hover:translate-x-0.5 transition-all shrink-0" />
                  </div>

                  <div className="space-y-0.5">
                    <h2 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white tracking-tight group-hover:text-[#003B5C] dark:group-hover:text-blue-400 transition-colors">
                      {item.title}
                    </h2>
                    <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 truncate">
                      {item.description}
                    </p>
                  </div>
                </Link>
              )
            })}
          </div>
        </section>

        {/* Gallery Slideshow */}
        <section className="py-6 sm:py-8 md:py-10">
          <Suspense fallback={<HeroSkeleton />}>
            <HomeGallery />
          </Suspense>
        </section>

        {/* Latest News */}
        <section className="py-4 sm:py-6 md:py-8">
          <Suspense fallback={<NewsSkeleton />}>
            <HomeNews />
          </Suspense>
        </section>

        {/* Upcoming Events */}
        <section className="py-4 sm:py-6 md:py-8">
          <Suspense fallback={<EventsSkeleton />}>
            <HomeEvents />
          </Suspense>
        </section>

        {/* Statistics Banner */}
        <section className="py-4 sm:py-6 md:py-8">
          <Suspense fallback={<StatsSkeleton />}>
            <HomeStats />
          </Suspense>
        </section>

        {/* Accreditation & Institutional Affiliations */}
        <section className="py-10 sm:py-14 bg-white dark:bg-slate-800/50 border-y border-slate-200/80 dark:border-slate-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 sm:space-y-10">
            
            {/* Header */}
            <div className="text-center space-y-1.5 max-w-2xl mx-auto">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#003B5C]/10 dark:bg-blue-950/50 text-[#003B5C] dark:text-blue-300 text-xs font-bold uppercase tracking-wider">
                <ShieldCheck className="w-3.5 h-3.5 text-amber-500" />
                <span>Institutional Standing</span>
              </div>
              <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                Accreditation &amp; Governance
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                Operating under the Ghana Education Service and the Methodist Church Ghana Educational Unit.
              </p>
            </div>

            {/* Accreditation Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 max-w-3xl mx-auto">
              
              {/* GES Card */}
              <div className="bg-slate-50/70 dark:bg-slate-900/60 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-700/80 text-center flex flex-col items-center justify-between space-y-3">
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl bg-white dark:bg-slate-800 p-2.5 shadow-2xs border border-slate-200/80 dark:border-slate-700 flex items-center justify-center">
                  <Image 
                    src="/logo-GES.png" 
                    alt="Ghana Education Service Logo" 
                    width={96} 
                    height={96} 
                    className="w-full h-full object-contain"
                  />
                </div>
                <div className="space-y-0.5">
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                    Ghana Education Service
                  </h3>
                  <p className="text-[11px] sm:text-xs font-semibold text-[#003B5C] dark:text-blue-400">
                    Accredited National Curriculum &amp; BECE
                  </p>
                </div>
              </div>

              {/* Methodist Card */}
              <div className="bg-slate-50/70 dark:bg-slate-900/60 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-700/80 text-center flex flex-col items-center justify-between space-y-3">
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl bg-white dark:bg-slate-800 p-2.5 shadow-2xs border border-slate-200/80 dark:border-slate-700 flex items-center justify-center">
                  <Image 
                    src="/chuch-logo.png" 
                    alt="Methodist Church Ghana Logo" 
                    width={96} 
                    height={96} 
                    className="w-full h-full object-contain"
                  />
                </div>
                <div className="space-y-0.5">
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                    Methodist Church Ghana
                  </h3>
                  <p className="text-[11px] sm:text-xs font-semibold text-amber-600 dark:text-amber-400">
                    Christian Ethos, Moral Discipline &amp; Values
                  </p>
                </div>
              </div>
            </div>

            {/* School Trust Pillars */}
            <div className="bg-slate-50/70 dark:bg-slate-900/60 rounded-2xl p-5 sm:p-6 border border-slate-200/80 dark:border-slate-700/80 max-w-4xl mx-auto shadow-2xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 text-left">
                {trustHighlights.map((item) => (
                  <div key={item.title} className="space-y-1 flex flex-col items-start">
                    <div className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-900/40 shrink-0">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                    <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white pt-1">
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
        <Suspense fallback={<AboutSectionSkeleton />}>
          <HomeAbout />
        </Suspense>
      </main>

      {/* Public Footer */}
      <Suspense fallback={<FooterSkeleton />}>
        <HomeFooter />
      </Suspense>

      {/* Shared Portal Footer */}
      <PortalFooter />
    </div>
  )
}

function AboutSectionSkeleton() {
  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
      <div className="bg-white dark:bg-slate-800/90 rounded-3xl border border-slate-200/80 dark:border-slate-700 p-6 sm:p-10 space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-5 w-28 rounded-md" />
          <Skeleton className="h-8 w-64 rounded-xl" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
          <Skeleton className="h-40 rounded-2xl" />
          <Skeleton className="h-40 rounded-2xl" />
          <Skeleton className="h-40 rounded-2xl" />
        </div>
      </div>
    </section>
  )
}

function FooterSkeleton() {
  return (
    <footer className="bg-[#003B5C] py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
        <div className="space-y-2">
          <Skeleton className="h-6 w-36 bg-white/20 rounded-md" />
          <Skeleton className="h-4 w-48 bg-white/10 rounded-md" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-5 w-24 bg-white/20 rounded-md" />
          <Skeleton className="h-3 w-32 bg-white/10 rounded-md" />
          <Skeleton className="h-3 w-28 bg-white/10 rounded-md" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-5 w-24 bg-white/20 rounded-md" />
          <Skeleton className="h-3 w-32 bg-white/10 rounded-md" />
          <Skeleton className="h-3 w-28 bg-white/10 rounded-md" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-5 w-24 bg-white/20 rounded-md" />
          <Skeleton className="h-3 w-40 bg-white/10 rounded-md" />
        </div>
      </div>
    </footer>
  )
}