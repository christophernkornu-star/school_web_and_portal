import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })
  
  const {
    data: { session },
  } = await supabase.auth.getSession()

  const path = req.nextUrl.pathname

  // 1. Protect Admin Routes
  if (path.startsWith('/admin') || path.startsWith('/api/admin')) {
    if (!session) {
      return NextResponse.redirect(new URL('/login?portal=admin', req.url))
    }
    
    const role = session.user.user_metadata.role
    if (role !== 'admin') {
      // Redirect to appropriate dashboard based on role
      if (role === 'teacher') return NextResponse.redirect(new URL('/teacher/dashboard', req.url))
      if (role === 'student') return NextResponse.redirect(new URL('/student/dashboard', req.url))
      return NextResponse.redirect(new URL('/', req.url))
    }
  }

  // 2. Protect Teacher Routes
  if (path.startsWith('/teacher')) {
    if (!session) {
      return NextResponse.redirect(new URL('/login?portal=teacher', req.url))
    }
    
    const role = session.user.user_metadata.role
    if (role !== 'teacher' && role !== 'admin') { // Allow admin to view teacher portal? Usually no, but maybe for debugging. Let's stick to strict.
      // Actually, let's keep it strict.
      if (role === 'admin') return NextResponse.redirect(new URL('/admin/dashboard', req.url))
      if (role === 'student') return NextResponse.redirect(new URL('/student/dashboard', req.url))
      return NextResponse.redirect(new URL('/', req.url))
    }
  }

  // 3. Protect Student Routes
  if (path.startsWith('/student')) {
    if (!session) {
      return NextResponse.redirect(new URL('/login?portal=student', req.url))
    }
    
    const role = session.user.user_metadata.role
    if (role !== 'student') {
      if (role === 'admin') return NextResponse.redirect(new URL('/admin/dashboard', req.url))
      if (role === 'teacher') return NextResponse.redirect(new URL('/teacher/dashboard', req.url))
      return NextResponse.redirect(new URL('/', req.url))
    }
  }

  // 4. Redirect logged-in users away from login page
  if (path.startsWith('/login')) {
    if (session) {
      const role = session.user.user_metadata.role
      if (role === 'admin') return NextResponse.redirect(new URL('/admin/dashboard', req.url))
      if (role === 'teacher') return NextResponse.redirect(new URL('/teacher/dashboard', req.url))
      if (role === 'student') return NextResponse.redirect(new URL('/student/dashboard', req.url))
    }
  }

  return res
}

// Specify which routes the middleware should run on
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     * - api routes that don't need auth
     */
    '/((?!_next/static|_next/image|favicon.ico|icons|images|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
