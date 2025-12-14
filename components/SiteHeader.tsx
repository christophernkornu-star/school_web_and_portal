'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'

export default function SiteHeader() {
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 relative overflow-hidden">
      {/* Ghana Flag Border */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-ghana-red via-ghana-gold to-ghana-green"></div>
      
      {/* Main Header */}
      <div className="bg-gradient-to-r from-methodist-gold via-yellow-500 to-yellow-600 shadow-lg border-b-4 border-yellow-700">
        <nav className="container mx-auto px-4 lg:px-6 py-4">
          <div className="flex items-center justify-between gap-4 sm:gap-8 lg:gap-12">
            {/* Logo and School Name */}
            <Link href="/" className="flex items-center space-x-2 sm:space-x-3 lg:space-x-5 flex-1 min-w-0">
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
            </Link>
            
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
  )
}
