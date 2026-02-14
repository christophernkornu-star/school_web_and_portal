import { supabaseAdmin } from '@/lib/supabase-admin'
import Link from 'next/link'

export default async function HomeFooter() {
  const { data: schoolSettings } = await supabaseAdmin
    .from('school_settings')
    .select('school_hours')
    .single()
  
  const schoolHours = schoolSettings?.school_hours || 'Monday - Friday:\n7:30 AM - 3:00 PM'

  return (
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
  )
}
