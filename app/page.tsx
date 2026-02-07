import Image from 'next/image'
import Link from 'next/link'
import { GraduationCap, Calendar, FileText, Image as ImageIcon, Newspaper } from 'lucide-react'
import { createClient } from '@supabase/supabase-js'
import AnnouncementsBanner from '@/components/AnnouncementsBanner'
import HeroCarousel from '@/components/HeroCarousel'
import LatestNews from '@/components/LatestNews'
import SiteHeader from '@/components/SiteHeader'

// Service role client needed for public data fetching bypass
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export default async function HomePage() {
  // Fetch all initial data in parallel
  const [newsRes, settingsRes, eventsRes, galleryRes] = await Promise.all([
    supabaseAdmin
      .from('news')
      .select('*')
      .eq('published', true)
      .order('created_at', { ascending: false })
      .limit(3),
    supabaseAdmin
      .from('school_settings')
      .select('school_hours')
      .single(),
    supabaseAdmin
      .from('events')
      .select('*')
      .order('event_date', { ascending: true })
      .limit(3),
    supabaseAdmin
      .from('gallery_photos')
      .select('*')
      .eq('is_spotlight', true)
      .order('created_at', { ascending: false })
      .limit(10)
  ])

  const news = newsRes.data
  const schoolSettings = settingsRes.data
  const events = eventsRes.data
  let galleryPhotos = galleryRes.data
  
  const schoolHours = schoolSettings?.school_hours || 'Monday - Friday:\n7:30 AM - 3:00 PM'

  if (!galleryPhotos || galleryPhotos.length === 0) {
    const { data: fallbackPhotos } = await supabaseAdmin
      .from('gallery_photos')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5)
    galleryPhotos = fallbackPhotos || []
  }

  // Fetch stats settings
  const { data: settings } = await supabaseAdmin
    .from('system_settings')
    .select('setting_key, setting_value')
    .in('setting_key', ['stats_title', 'stats_subtitle', 'founding_year', 'teacher_student_ratio', 'bece_participation', 'bece_pass_rate', 'grade_levels'])

  const settingsObj: any = {}
  if (settings) {
    settings.forEach((s: any) => {
      settingsObj[s.setting_key] = s.setting_value
    })
  }

  const foundingYear = parseInt(settingsObj.founding_year || '1960')
  const currentYear = new Date().getFullYear()
  
  const stats = {
    title: settingsObj.stats_title || 'Our Impact in Numbers',
    subtitle: settingsObj.stats_subtitle || 'Building excellence in education for over six decades',
    yearsOfOperation: currentYear - foundingYear,
    teacherStudentRatio: settingsObj.teacher_student_ratio || '1:15',
    beceParticipation: settingsObj.bece_participation || '100%',
    becePassRate: settingsObj.bece_pass_rate || '85',
    gradeLevels: settingsObj.grade_levels || '9',
    passRate: parseInt(settingsObj.bece_pass_rate || '85'),
    studentCount: 0,
    teacherCount: 0 
  }

  // Fetch counts
  const { count: studentCount } = await supabaseAdmin
    .from('students')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'active')
  
  const { count: teacherCount } = await supabaseAdmin
    .from('teachers')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'active')

  stats.studentCount = studentCount || 0
  stats.teacherCount = teacherCount || 0

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

      {/* Gallery Slideshow via Client Component */}
      {galleryPhotos && galleryPhotos.length > 0 && (
         <HeroCarousel photos={galleryPhotos} />
      )}

      {/* Latest News via Client Component (handles modal) */}
      {news && news.length > 0 && (
        <LatestNews news={news} />
      )}

      {/* Upcoming Events - Server Rendered */}
      {events && events.length > 0 && (
        <section className="py-16 bg-white">
          <div className="container mx-auto px-6">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-3xl font-bold text-methodist-blue">Upcoming Events</h3>
              <Link href="/events" className="text-ghana-green hover:text-green-700 font-semibold">
                View All →
              </Link>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              {events.map((event: any) => (
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

      {/* Stats Section - Server Rendered */}
      <section className="py-12 md:py-16 bg-white border-t-4 border-methodist-gold">
        <div className="container mx-auto px-4 md:px-6">
          <div className="text-center mb-8 md:mb-12">
            <h3 className="text-2xl md:text-4xl font-bold text-methodist-blue mb-2 md:mb-3">
              {stats.title}
            </h3>
            <p className="text-sm md:text-base text-gray-600 max-w-2xl mx-auto">
              {stats.subtitle}
            </p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 max-w-5xl mx-auto">
            <div className="bg-gradient-to-br from-methodist-blue to-blue-800 rounded-xl p-4 md:p-6 shadow-lg text-white text-center transform hover:scale-105 transition-transform flex flex-col justify-center h-full">
              <div suppressHydrationWarning className="text-3xl md:text-5xl font-extrabold mb-1 md:mb-2">{stats.yearsOfOperation}+</div>
              <div className="text-xs md:text-sm uppercase tracking-wider opacity-90">Years of Excellence</div>
            </div>

            <div className="bg-gradient-to-br from-ghana-green to-green-700 rounded-xl p-4 md:p-6 shadow-lg text-white text-center transform hover:scale-105 transition-transform flex flex-col justify-center h-full">
              <div className="text-3xl md:text-5xl font-extrabold mb-1 md:mb-2">{stats.studentCount}</div>
              <div className="text-xs md:text-sm uppercase tracking-wider opacity-90">Active Students</div>
            </div>

            <div className="bg-gradient-to-br from-methodist-gold to-yellow-600 rounded-xl p-4 md:p-6 shadow-lg text-white text-center transform hover:scale-105 transition-transform flex flex-col justify-center h-full">
              <div className="text-3xl md:text-5xl font-extrabold mb-1 md:mb-2">{stats.teacherCount}</div>
              <div className="text-xs md:text-sm uppercase tracking-wider opacity-90">Qualified Teachers</div>
            </div>

            <div className="bg-gradient-to-br from-ghana-red to-red-700 rounded-xl p-4 md:p-6 shadow-lg text-white text-center transform hover:scale-105 transition-transform flex flex-col justify-center h-full">
              <div className="text-3xl md:text-5xl font-extrabold mb-1 md:mb-2">{stats.passRate}%</div>
              <div className="text-xs md:text-sm uppercase tracking-wider opacity-90">Pass Rate</div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 max-w-4xl mx-auto mt-6 md:mt-8">
            <div className="bg-gray-50 rounded-lg p-4 md:p-6 text-center border-2 border-gray-200 hover:border-methodist-blue transition-colors flex flex-col justify-center h-full">
              <div className="text-2xl md:text-3xl font-bold text-methodist-blue mb-1">{stats.teacherStudentRatio}</div>
              <div className="text-xs md:text-sm text-gray-600">Teacher-Student Ratio</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 md:p-6 text-center border-2 border-gray-200 hover:border-methodist-blue transition-colors flex flex-col justify-center h-full">
              <div className="text-2xl md:text-3xl font-bold text-methodist-blue mb-1">{stats.beceParticipation}</div>
              <div className="text-xs md:text-sm text-gray-600">BECE Participation</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 md:p-6 text-center border-2 border-gray-200 hover:border-methodist-blue transition-colors flex flex-col justify-center h-full sm:col-span-2 lg:col-span-1">
              <div className="text-2xl md:text-3xl font-bold text-methodist-blue mb-1">{stats.gradeLevels}</div>
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
                  <div className="text-3xl font-bold text-methodist-blue">{stats.studentCount}</div>
                  <div className="text-sm text-gray-600 font-semibold">Students</div>
                </div>
                <div className="text-center p-4 bg-white rounded-lg shadow-md border-2 border-transparent hover:border-ghana-green transition-colors">
                  <div className="text-3xl font-bold text-ghana-green">{stats.teacherCount}</div>
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
              </ul>
            </div>
            <div className="flex flex-col items-center lg:items-end lg:text-right">
              <h5 className="font-bold text-lg mb-4 border-b-2 border-ghana-gold pb-2 inline-block lg:block">Connect With Us</h5>
              <div className="flex justify-center lg:justify-end space-x-4 mb-4">
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
              <p className="text-gray-300 text-sm whitespace-pre-line">{schoolHours}</p>
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
