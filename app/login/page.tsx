'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { User, Lock, AlertCircle, Menu, X, Eye, EyeOff } from 'lucide-react'
import { signInWithUsername } from '@/lib/auth'

export default function LoginPage() {
  const router = useRouter()

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      console.log('🔐 Attempting login with username:', username)
      const { data, error: signInError, role } = await signInWithUsername(username, password)

      console.log('📊 Login response:', { data: !!data, error: signInError, role })

      if (signInError) {
        console.error('❌ Sign in error:', signInError)
        if (signInError.message && signInError.message.includes('rate limit')) {
          setError('Too many login attempts. Please wait a few minutes before trying again.')
        } else {
          setError(signInError.message || 'Invalid username or password')
        }
        setLoading(false)
        return
      }

      if (!data?.user) {
        console.error('❌ No user data returned')
        setError('Invalid username or password')
        setLoading(false)
        return
      }

      console.log('✅ Login successful! User role:', role)

      // Redirect based on user role
      if (role === 'student') {
        console.log('🎒 Redirecting to student dashboard...')
        router.push('/student/dashboard')
      } else if (role === 'teacher') {
        console.log('👨‍🏫 Redirecting to teacher dashboard...')
        router.push('/teacher/dashboard')
      } else if (role === 'admin') {
        console.log('👨‍💼 Redirecting to admin dashboard...')
        router.push('/admin/dashboard')
      } else {
        console.error('❌ Unknown role:', role)
        setError('Unable to determine user role')
        setLoading(false)
      }
    } catch (err) {
      console.error('❌ Unexpected error during login:', err)
      setError('An unexpected error occurred. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="relative overflow-hidden">
        {/* Ghana Flag Border */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-ghana-red via-ghana-gold to-ghana-green"></div>
        
        {/* Main Header */}
        <div className="bg-gradient-to-r from-methodist-gold via-yellow-500 to-yellow-600 shadow-lg border-b-4 border-yellow-700">
          <nav className="container mx-auto px-6 py-4">
            <div className="flex items-center justify-between gap-8">
              {/* Logo and School Name */}
              <Link href="/" className="flex items-center space-x-5 group">
              <div className="relative">
                <div className="absolute inset-0 bg-methodist-gold rounded-full blur-md opacity-30"></div>
                <div className="relative bg-gradient-to-br from-white to-gray-50 rounded-full p-2.5 shadow-xl ring-4 ring-methodist-gold ring-opacity-20 group-hover:ring-opacity-40 transition-all">
                  <Image
                    src="/school_crest.png"
                    alt="Biriwa Methodist 'C' Basic School"
                    width={80}
                    height={80}
                    className="object-contain"
                  />
                </div>
              </div>
              <div className="text-center space-y-1">
                <h1 className="text-xl md:text-2xl lg:text-3xl font-extrabold bg-gradient-to-r from-methodist-blue to-blue-800 bg-clip-text text-transparent tracking-tight group-hover:from-blue-800 group-hover:to-methodist-blue transition-all">
                  Biriwa Methodist 'C' Basic School
                </h1>
                <div className="flex flex-col md:flex-row items-center justify-center space-y-1 md:space-y-0 md:space-x-2">
                  <div className="hidden md:block h-0.5 w-8 bg-methodist-blue"></div>
                  <p className="text-xs md:text-sm text-methodist-blue font-semibold tracking-wide uppercase">School Management System</p>
                  <div className="hidden md:block h-0.5 w-8 bg-methodist-blue"></div>
                </div>
              </div>
              </Link>
              
              {/* Navigation Menu */}
              <div className="flex items-center space-x-6">
                {/* Desktop Navigation */}
                <nav className="hidden md:flex items-center space-x-6">
                  <Link href="/" className="group relative text-methodist-blue font-semibold transition-all duration-200 pb-1">
                    <span className="group-hover:text-white transition-colors">Home</span>
                    <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-methodist-blue group-hover:w-full transition-all duration-300"></span>
                  </Link>
                  <Link href="/about" className="group relative text-methodist-blue font-semibold transition-all duration-200 pb-1">
                    <span className="group-hover:text-white transition-colors">About</span>
                    <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-methodist-blue group-hover:w-full transition-all duration-300"></span>
                  </Link>
                  <Link href="/events" className="group relative text-methodist-blue font-semibold transition-all duration-200 pb-1">
                    <span className="group-hover:text-white transition-colors">Events</span>
                    <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-methodist-blue group-hover:w-full transition-all duration-300"></span>
                  </Link>
                  <Link href="/admission" className="group relative text-methodist-blue font-semibold transition-all duration-200 pb-1">
                    <span className="group-hover:text-white transition-colors">Admission</span>
                    <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-methodist-blue group-hover:w-full transition-all duration-300"></span>
                  </Link>
                  <Link href="/gallery" className="group relative text-methodist-blue font-semibold transition-all duration-200 pb-1">
                    <span className="group-hover:text-white transition-colors">Gallery</span>
                    <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-methodist-blue group-hover:w-full transition-all duration-300"></span>
                  </Link>
                  <Link href="/complaints" className="group relative text-methodist-blue font-semibold transition-all duration-200 pb-1">
                    <span className="group-hover:text-white transition-colors">Complaints</span>
                    <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-methodist-blue group-hover:w-full transition-all duration-300"></span>
                  </Link>
                </nav>
                
                {/* Mobile Menu Button */}
                <button
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className="md:hidden text-methodist-blue hover:text-white transition-colors p-2 relative w-10 h-10 flex items-center justify-center"
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
        <div className="h-1 bg-gradient-to-r from-transparent via-methodist-gold to-transparent"></div>
        
        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-t border-gray-200 shadow-lg">
            <nav className="container mx-auto px-6 py-4 space-y-3">
              <Link href="/" className="block text-gray-700 font-semibold py-2 px-4 rounded-lg hover:bg-methodist-blue hover:text-white transition-all duration-200"
                onClick={() => setMobileMenuOpen(false)}>
                Home
              </Link>
              <Link href="/about" className="block text-gray-700 font-semibold py-2 px-4 rounded-lg hover:bg-methodist-blue hover:text-white transition-all duration-200"
                onClick={() => setMobileMenuOpen(false)}>
                About
              </Link>
              <Link href="/events" className="block text-gray-700 font-semibold py-2 px-4 rounded-lg hover:bg-methodist-blue hover:text-white transition-all duration-200"
                onClick={() => setMobileMenuOpen(false)}>
                Events
              </Link>
              <Link href="/admission" className="block text-gray-700 font-semibold py-2 px-4 rounded-lg hover:bg-methodist-blue hover:text-white transition-all duration-200"
                onClick={() => setMobileMenuOpen(false)}>
                Admission
              </Link>
              <Link href="/gallery" className="block text-gray-700 font-semibold py-2 px-4 rounded-lg hover:bg-methodist-blue hover:text-white transition-all duration-200"
                onClick={() => setMobileMenuOpen(false)}>
                Gallery
              </Link>
              <Link href="/complaints" className="block text-gray-700 font-semibold py-2 px-4 rounded-lg hover:bg-methodist-blue hover:text-white transition-all duration-200"
                onClick={() => setMobileMenuOpen(false)}>
                Complaints
              </Link>
            </nav>
          </div>
        )}
      </header>

      {/* Login Form */}
      <div className="flex-1 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          {/* School Crest */}
          <div className="text-center">
            <div className="inline-flex items-center justify-center mb-6 bg-white rounded-full p-3 shadow-xl border-4 border-methodist-gold">
              <Image
                src="/school_crest.png"
                alt="Biriwa Methodist School Crest"
                width={140}
                height={140}
                className="object-contain"
              />
            </div>
            <h2 className="text-3xl font-bold text-methodist-blue">Portal Login</h2>
            <p className="mt-2 text-sm text-gray-600">Enter your credentials to access the system</p>
            <p className="mt-2 text-sm text-methodist-blue font-bold italic">"Discipline with Hardwork"</p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4 flex items-start">
              <AlertCircle className="w-5 h-5 text-red-600 mr-2 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Login Form */}
          <form className="mt-8 space-y-6 bg-white p-8 rounded-lg shadow-lg" onSubmit={handleLogin}>
            <div className="space-y-4">
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
                  Username
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-10">
                    <User className="h-5 w-5 text-gray-400" />
                  </div>
                  {!username && (
                    <div className="absolute inset-y-0 left-12 flex items-center pointer-events-none z-10">
                      <span className="text-gray-400 text-sm">Username</span>
                    </div>
                  )}
                  <input
                    id="username"
                    name="username"
                    type="text"
                    autoComplete="off"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-methodist-blue focus:border-transparent transition-all"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-10">
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
                  {!password && (
                    <div className="absolute inset-y-0 left-12 flex items-center pointer-events-none z-10">
                      <span className="text-gray-400 text-sm">Password</span>
                    </div>
                  )}
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="off"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-12 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-methodist-blue focus:border-transparent transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center z-10 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 text-methodist-blue focus:ring-methodist-blue border-gray-300 rounded cursor-pointer"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-900 cursor-pointer">
                  Remember me
                </label>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed mt-6"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-600">
            <Link href="/" className="font-medium text-methodist-blue hover:text-blue-700">
              ← Back to Homepage
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
