import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })

  // 1. Refresh & retrieve the active session
  const {
    data: { session },
  } = await supabase.auth.getSession()

  const path = req.nextUrl.pathname

  const isAdminRoute = path.startsWith('/admin')
  const isTeacherRoute = path.startsWith('/teacher')
  const isStudentRoute = path.startsWith('/student')
  const isAdminApiRoute = path.startsWith('/api/admin')
  const isLoginPage = path === '/login'

  // 2. Unauthenticated access handling
  if (!session) {
    if (isAdminApiRoute) {
      return NextResponse.json(
        { error: 'Unauthorized: Authentication required' },
        { status: 401 }
      )
    }

    if (isAdminRoute || isTeacherRoute || isStudentRoute) {
      const redirectUrl = new URL('/login', req.url)
      // Pass portal hint if targeting specific area
      if (isAdminRoute) redirectUrl.searchParams.set('portal', 'admin')
      if (isTeacherRoute) redirectUrl.searchParams.set('portal', 'teacher')
      if (isStudentRoute) redirectUrl.searchParams.set('portal', 'student')
      redirectUrl.searchParams.set('redirectTo', path)
      return NextResponse.redirect(redirectUrl)
    }

    return res
  }

  // 3. Query the authoritative role from the profiles table
  // RLS allows authenticated users to select their own profile (auth.uid() = id)
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', session.user.id)
    .single()

  const role = profile?.role

  // If the user has a valid session but no profile record, revoke and redirect
  if (error || !role) {
    if (isAdminApiRoute) {
      return NextResponse.json(
        { error: 'Forbidden: Incomplete user profile' },
        { status: 403 }
      )
    }
    return NextResponse.redirect(new URL('/login', req.url))
  }

  // 4. Redirect logged-in users away from the login page to their portal
  if (isLoginPage) {
    return NextResponse.redirect(new URL(`/${role}/dashboard`, req.url))
  }

  // 5. Enforce role-based access boundaries
  if (isAdminApiRoute && role !== 'admin') {
    return NextResponse.json(
      { error: 'Forbidden: Administrator privileges required' },
      { status: 403 }
    )
  }

  if (isAdminRoute && role !== 'admin') {
    return NextResponse.redirect(new URL(`/${role}/dashboard`, req.url))
  }

  if (isTeacherRoute && role !== 'teacher' && role !== 'admin') {
    return NextResponse.redirect(new URL(`/${role}/dashboard`, req.url))
  }

  if (isStudentRoute && role !== 'student') {
    return NextResponse.redirect(new URL(`/${role}/dashboard`, req.url))
  }

  return res
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/teacher/:path*',
    '/student/:path*',
    '/api/admin/:path*',
    '/login',
  ],
}