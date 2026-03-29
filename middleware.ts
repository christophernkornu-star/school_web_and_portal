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

  // 1. Role-Based Access Control (RBAC) explicitly guarding routes
  if (path.startsWith('/admin')) {
    if (!session) return NextResponse.redirect(new URL('/login?portal=admin', req.url))
    if (session.user?.user_metadata?.role !== 'admin') {
      return NextResponse.redirect(new URL(`/${session.user?.user_metadata?.role || 'student'}/dashboard`, req.url))
    }
  }

  if (path.startsWith('/teacher')) {
    if (!session) return NextResponse.redirect(new URL('/login?portal=teacher', req.url))
    if (session.user?.user_metadata?.role !== 'teacher' && session.user?.user_metadata?.role !== 'admin') {
      return NextResponse.redirect(new URL(`/${session.user?.user_metadata?.role || 'student'}/dashboard`, req.url))
    }
  }

  if (path.startsWith('/student')) {
    if (!session) return NextResponse.redirect(new URL('/login?portal=student', req.url))
    if (session.user?.user_metadata?.role !== 'student' && session.user?.user_metadata?.role !== 'admin') {
      return NextResponse.redirect(new URL(`/${session.user?.user_metadata?.role || 'student'}/dashboard`, req.url))
    }
  }

  // API Route Protection
  if (path.startsWith('/api/admin') || path.startsWith('/api/teacher') || path.startsWith('/api/student')) {
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const role = session.user?.user_metadata?.role
    if (path.startsWith('/api/admin') && role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    if (path.startsWith('/api/teacher') && role !== 'admin' && role !== 'teacher') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    if (path.startsWith('/api/student') && role !== 'admin' && role !== 'teacher' && role !== 'student') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
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
