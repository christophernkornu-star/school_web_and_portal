'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { 
  User, 
  Lock, 
  AlertCircle, 
  Menu, 
  X, 
  Eye, 
  EyeOff, 
  Loader2, 
  ArrowLeft,
  GraduationCap
} from 'lucide-react'
import { signInWithUsername } from '@/lib/auth'
import { PortalFooter } from '@/components/PortalFooter'

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
      const { data, error: signInError, role } = await signInWithUsername(username.trim(), password)

      if (signInError) {
        if (signInError.message && signInError.message.includes('rate limit')) {
          setError('Too many login attempts. Please wait a few minutes before trying again.')
        } else {
          setError(signInError.message || 'Invalid username or password')
        }
        setLoading(false)
        return
      }

      if (!data?.user) {
        setError('Invalid username or password')
        setLoading(false)
        return
      }

      if (role === 'student') {
        router.push('/student/dashboard')
      } else if (role === 'teacher') {
        router.push('/teacher/dashboard')
      } else if (role === 'admin') {
        router.push('/admin/dashboard')
      } else {
        setError('Unable to determine user role')
        setLoading(false)
      }
    } catch (err) {
      console.error('Login error:', err)
      setError('An unexpected error occurred. Please check your connection and try again.')
      setLoading(false)
    }
  }

  const navLinks = [
    { href: '/', label: 'Home' },
    { href: '/about', label: 'About' },
    { href: '/events', label: 'Events' },
    { href: '/admission', label: 'Admission' },
    { href: '/gallery', label: 'Gallery' },
    { href: '/complaints', label: 'Complaints' },
  ]

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col justify-between font-sans text-slate-900 dark:text-slate-100 transition-colors">
      {/* Top Header */}
      <header className="sticky top-0 z-50 w-full bg-white dark:bg-slate-900 shadow-md border-b border-slate-200/80 dark:border-slate-800">
        {/* Ghana Flag Accent Line */}
        <div className="h-1 bg-gradient-to-r from-red-600 via-amber-400 to-emerald-600 w-full" />
        
        {/* Main Navigation Bar */}
        <div className="bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 text-[#003B5C] border-b-2 border-amber-600/30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 sm:py-3.5">
            <div className="flex items-center justify-between gap-3">
              {/* Brand & Crest */}
              <Link href="/" className="flex items-center gap-2.5 sm:gap-3.5 group min-w-0">
                <div className="relative shrink-0">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white rounded-full p-1.5 shadow-md ring-2 ring-[#003B5C]/20 group-hover:ring-[#003B5C]/40 transition-all flex items-center justify-center">
                    <Image
                      src="/school_crest.png"
                      alt="Biriwa Methodist 'C' Crest"
                      width={44}
                      height={44}
                      className="object-contain"
                      priority
                    />
                  </div>
                </div>

                <div className="min-w-0">
                  <h1 className="text-sm sm:text-lg md:text-xl font-black text-[#003B5C] tracking-tight leading-tight truncate">
                    Biriwa Methodist &apos;C&apos;
                  </h1>
                  <p className="text-[10px] sm:text-xs font-bold text-[#003B5C]/80 uppercase tracking-wider truncate">
                    Basic School Portal
                  </p>
                </div>
              </Link>

              {/* Desktop Navigation */}
              <nav className="hidden lg:flex items-center space-x-6 text-sm font-bold text-[#003B5C]">
                {navLinks.map((link) => (
                  <Link 
                    key={link.href}
                    href={link.href} 
                    className="hover:text-white transition-colors duration-200 py-1"
                  >
                    {link.label}
                  </Link>
                ))}
              </nav>

              {/* Mobile / Tablet Hamburger Toggle */}
              <button
                type="button"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden p-2 rounded-xl text-[#003B5C] hover:text-white hover:bg-[#003B5C]/10 transition-colors"
                aria-label="Toggle navigation menu"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Slide-Down Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-xl animate-in slide-in-from-top-2 duration-200">
            <nav className="max-w-7xl mx-auto px-4 sm:px-6 py-3 space-y-1">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3.5 py-2.5 rounded-xl text-sm font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-[#003B5C] dark:hover:text-blue-400 transition-colors"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>
        )}
      </header>

      {/* Main Login Area */}
      <main className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8 py-8 sm:py-12 md:py-16">
        <div className="w-full max-w-md space-y-6">
          
          {/* Form Container Card */}
          <div className="bg-white dark:bg-slate-800/95 rounded-3xl shadow-xl sm:shadow-2xl border border-slate-200/80 dark:border-slate-700 p-6 sm:p-8 md:p-9 space-y-6 backdrop-blur-sm">
            
            {/* Header / Crest Branding */}
            <div className="text-center space-y-2">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-[#003B5C]/10 dark:bg-blue-500/20 text-[#003B5C] dark:text-blue-300 font-bold mb-1 shadow-inner">
                <GraduationCap className="w-6 h-6" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                Portal Login
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium">
                Enter your assigned staff, student, or admin credentials
              </p>
              <div>
                <span className="inline-block mt-1 text-[11px] font-bold text-amber-700 dark:text-amber-300 uppercase tracking-widest bg-amber-50 dark:bg-amber-950/40 border border-amber-200/60 dark:border-amber-900/40 py-1 px-3.5 rounded-full">
                  &ldquo;Discipline with Hardwork&rdquo;
                </span>
              </div>
            </div>

            {/* Error Message Box */}
            {error && (
              <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200/80 dark:border-rose-900/60 rounded-2xl p-3.5 flex items-start gap-2.5 text-rose-700 dark:text-rose-300 text-xs sm:text-sm font-medium animate-in fade-in duration-150">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <p className="leading-snug">{error}</p>
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleLogin} className="space-y-4 sm:space-y-5">
              
              {/* Username / ID Input */}
              <div className="space-y-1.5">
                <label 
                  htmlFor="username" 
                  className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider"
                >
                  Username / ID
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <User className="h-4 w-4" />
                  </div>
                  <input
                    id="username"
                    name="username"
                    type="text"
                    autoComplete="username"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="e.g. TEA-1002 or STU-2025"
                    className="w-full pl-10 pr-4 py-3 text-base sm:text-sm font-medium border border-slate-200 dark:border-slate-700 rounded-2xl bg-slate-50/50 dark:bg-slate-900/50 text-slate-900 dark:text-white placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-[#003B5C] dark:focus:ring-blue-500 transition-all"
                  />
                </div>
              </div>

              {/* Password Input */}
              <div className="space-y-1.5">
                <label 
                  htmlFor="password" 
                  className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider"
                >
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="h-4 w-4" />
                  </div>
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-11 py-3 text-base sm:text-sm font-medium border border-slate-200 dark:border-slate-700 rounded-2xl bg-slate-50/50 dark:bg-slate-900/50 text-slate-900 dark:text-white placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-[#003B5C] dark:focus:ring-blue-500 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Remember Me Checkbox */}
              <div className="flex items-center justify-between pt-0.5">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    id="remember-me"
                    name="remember-me"
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded text-[#003B5C] focus:ring-[#003B5C] border-slate-300 dark:border-slate-700 dark:bg-slate-900 cursor-pointer"
                  />
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                    Keep me signed in
                  </span>
                </label>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 px-4 bg-[#003B5C] hover:bg-[#002a42] text-white font-bold text-sm rounded-2xl shadow-md hover:shadow-lg transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Authenticating...</span>
                  </>
                ) : (
                  <span>Sign In to Portal</span>
                )}
              </button>
            </form>

            {/* Back Link */}
            <div className="text-center pt-2">
              <Link 
                href="/" 
                className="inline-flex items-center gap-1.5 text-xs font-bold text-[#003B5C] dark:text-blue-400 hover:underline"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Return to School Homepage</span>
              </Link>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="shrink-0">
        <PortalFooter />
      </footer>
    </div>
  )
}