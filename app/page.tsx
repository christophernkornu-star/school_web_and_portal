import { Suspense } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import SiteHeader from '@/components/SiteHeader'
import AnnouncementsBanner from '@/components/AnnouncementsBanner'
import { Newspaper, Calendar, Image as ImageIcon, FileText, GraduationCap } from 'lucide-react'

// Import new home components
import HomeGallery from '@/app/components/home/HomeGallery'
import HomeNews from '@/app/components/home/HomeNews'
import HomeEvents from '@/app/components/home/HomeEvents'
import HomeStats from '@/app/components/home/HomeStats'
import HomeAbout from '@/app/components/home/HomeAbout'
import HomeFooter from '@/app/components/home/HomeFooter'
import { HeroSkeleton, NewsSkeleton, EventsSkeleton, StatsSkeleton } from '@/app/components/home/Skeletons'

export const dynamic = 'force-dynamic'

export default function HomePage() {
  return (
    <div className="min-h-screen">
      <SiteHeader />

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

      <AnnouncementsBanner />

      {/* Gallery Slideshow */}
      <Suspense fallback={<HeroSkeleton />}>
         <HomeGallery />
      </Suspense>

      {/* Latest News */}
      <Suspense fallback={<NewsSkeleton />}>
        <HomeNews />
      </Suspense>

      {/* Upcoming Events */}
      <Suspense fallback={<EventsSkeleton />}>
        <HomeEvents />
      </Suspense>

      {/* Stats Section */}
      <Suspense fallback={<StatsSkeleton />}>
        <HomeStats />
      </Suspense>

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
                  <Image 
                    src="/logo-GES.png" 
                    alt="Ghana Education Service Logo" 
                    width={160}
                    height={160}
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
                  <Image 
                    src="/chuch-logo.png" 
                    alt="Methodist Church Ghana Logo" 
                    width={160}
                    height={160}
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
      <Suspense fallback={<div className="h-96 bg-gray-50 animate-pulse" />}>
        <HomeAbout />
      </Suspense>

      {/* Footer */}
      <Suspense fallback={<div className="h-64 bg-methodist-blue animate-pulse" />}>
        <HomeFooter />
      </Suspense>
    </div>
  )
}
