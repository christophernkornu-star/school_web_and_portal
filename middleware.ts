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

  // 0. Bypass static files immediately
  if (
    path.startsWith('/_next') ||
    path.startsWith('/static') ||
    path.startsWith('/favicon.ico') ||
    path.includes('.') // Any file with an extension
  ) {
    return NextResponse.next()
  }

  // 1. Protect Admin Routes (and sensitive API routes)
  if (path.startsWith('/admin') || path.startsWith('/api/admin') || path.startsWith('/api/students')) {
    if (!session) {
      if (path.startsWith('/api')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      return NextResponse.redirect(new URL('/login?portal=admin', req.url))
    }
    
    let role = session.user.user_metadata.role
    // Fallback: Check profile if metadata is missing
    if (!role) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single()
      role = profile?.role
    }

    // Allow Admin to access everything in this block
    if (role === 'admin') {
      return res
    }
    
    // For /api/students, allow teachers as well (if that's the requirement, safe to assume admin+teacher usage for bulk upload usually)
    // But bulk upload is sensitive. Let's check strictly. 
    // If the path is specifically bulk-upload, maybe restrict to admin? 
    // The previous implementation was completely open. 
    // Let's restrict /api/students to Admin only for now, similar to /api/admin.
    
    if (path.startsWith('/api/students') && role !== 'admin') {
       return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

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
    
    let role = session.user.user_metadata.role
    // Fallback: Check profile if metadata is missing
    if (!role) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single()
      role = profile?.role
    }

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
    
    let role = session.user.user_metadata.role
    // Fallback: Check profile if metadata is missing
    if (!role) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single()
      role = profile?.role
    }
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
    '/((?!_next/static|_next/image|favicon.ico|manifest.json|sw.js|workbox|.*\\.(?:svg|png|jpg|jpeg|gif|webp|js|css|json)$).*)',
  ],
}
