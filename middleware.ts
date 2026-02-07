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
  matcher: ['/((?!_next).*)'],
}
