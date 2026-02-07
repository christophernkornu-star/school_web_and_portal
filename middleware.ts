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

  // 0. Explicitly bypass static assets and service workers (Redundant with matcher but safe)
  if (
    path.startsWith('/_next') ||
    path.startsWith('/static') ||
    path.startsWith('/favicon.ico') ||
    path.startsWith('/manifest.json') ||
    path.startsWith('/sw.js') ||
    path.startsWith('/workbox') ||
    path.startsWith('/swe-worker') ||
    path.match(/\.(png|jpg|jpeg|svg|gif|webp|ico|css|js|json)$/)
  ) {
    return NextResponse.next()
  }

  if (path.startsWith('/admin') && !session) {
    return NextResponse.redirect(new URL('/login?portal=admin', req.url))
  }

  if (path.startsWith('/teacher') && !session) {
    return NextResponse.redirect(new URL('/login?portal=teacher', req.url))
  }

  if (path.startsWith('/student') && !session) {
    return NextResponse.redirect(new URL('/login?portal=student', req.url))
  }

  if (path.startsWith('/login') && session) {
    const role = session.user.user_metadata.role
    if (role === 'admin') return NextResponse.redirect(new URL('/admin/dashboard', req.url))
    if (role === 'teacher') return NextResponse.redirect(new URL('/teacher/dashboard', req.url))
    if (role === 'student') return NextResponse.redirect(new URL('/student/dashboard', req.url))
  }

  return res
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - manifest.json (web app manifest)
     * - sw.js (service worker)
     * - workbox (workbox scripts)
     * - swe-worker (custom service worker scripts)
     * - public files with extensions
     */
    '/((?!_next/static|_next/image|favicon.ico|manifest.json|sw.js|workbox|swe-worker|.*\\.(?:svg|png|jpg|jpeg|gif|webp|js|css|json)$).*)',
  ],
}
