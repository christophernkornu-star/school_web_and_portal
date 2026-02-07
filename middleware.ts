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
  if (path.startsWith('/admin') || path.startsWith('/api/admin') || path.startsWith('/api/students')) {
    if (!session) {
      if (path.startsWith('/api')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      return NextResponse.redirect(new URL('/login?portal=admin', req.url))
    }

    let role = session.user.user_metadata.role

    if (!role) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single()
      role = profile?.role
    }

    if (role !== 'admin') {
      return NextResponse.redirect(new URL('/', req.url))
    }
  }

  // 2. Teacher routes
  if (path.startsWith('/teacher')) {
    if (!session) {
      return NextResponse.redirect(new URL('/login?portal=teacher', req.url))
    }
  }

  // 3. Student routes
  if (path.startsWith('/student')) {
    if (!session) {
      return NextResponse.redirect(new URL('/login?portal=student', req.url))
    }
  }

  // 4. Redirect logged-in users away from login
  if (path.startsWith('/login') && session) {
    const role = session.user.user_metadata.role
    if (role === 'admin') return NextResponse.redirect(new URL('/admin/dashboard', req.url))
    if (role === 'teacher') return NextResponse.redirect(new URL('/teacher/dashboard', req.url))
    if (role === 'student') return NextResponse.redirect(new URL('/student/dashboard', req.url))
  }

  // ✅ ALWAYS return res
  return res
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|manifest.json|sw.js|workbox|.*\\.(?:svg|png|jpg|jpeg|gif|webp|js|css|json)$).*)',
  ],
}
