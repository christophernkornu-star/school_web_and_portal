// API route to get class rankings (bypasses RLS)
import { createClient } from '@supabase/supabase-js'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // Uses service role key to bypass RLS
)
// In-memory cache to prevent DB spikes during heavy parallel fetching
const cache = new Map<string, { data: any, timestamp: number }>()
const CACHE_TTL = 1000 * 60 * 5 // 5 minutes
export async function GET(request: Request) {
  // 1. Verify Authentication & Authorization
  const cookieStore = cookies()
  const supabaseAuth = createRouteHandlerClient({ cookies: () => cookieStore })
  
  const { data: { session } } = await supabaseAuth.auth.getSession()
  
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Check Role - Only Teachers and Admins should see full class rankings
  const { data: profile } = await supabaseAuth
    .from('profiles')
    .select('role')
    .eq('id', session.user.id)
    .single()

  if (profile?.role !== 'admin' && profile?.role !== 'teacher' && profile?.role !== 'student') {
    return NextResponse.json({ error: 'Forbidden: Access denied' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const classId = searchParams.get('classId')
  const termId = searchParams.get('termId')
  let requestingStudentId = null
  if (profile?.role === 'student') {
    // We need the student's actual ID from the students table, not their auth profile ID
    const { data: studentRecord } = await supabase
      .from('students')
      .select('id')
      .eq('profile_id', session.user.id)
      .single()
    if (studentRecord) requestingStudentId = studentRecord.id
  }

  if (!classId || !termId) {
    return NextResponse.json({ error: 'Missing classId or termId' }, { status: 400 })
  }

  // Check Cache first
  const cacheKey = `${classId}-${termId}`
  const cached = cache.get(cacheKey)
  if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
    let cachedData = cached.data
    if (requestingStudentId) {
      cachedData = {
        scores: cachedData.scores.map((s: any) => ({
          ...s,
          student_id: s.student_id === requestingStudentId ? s.student_id : `anon_${s.student_id.substring(0, 8)}`
        })),
        totalClassSize: cachedData.totalClassSize,
        uniqueStudents: cachedData.uniqueStudents.map((id: any) => id === requestingStudentId ? id : `anon_${id.substring(0, 8)}`)
      }
    }
    return NextResponse.json(cachedData)
  }

  // First get all students in this class
  const { data: students, error: studentsError } = await supabase
    .from('students')
    .select('id')
    .eq('class_id', classId)
    .eq('status', 'active')
  
  if (studentsError || !students) {
    return NextResponse.json({ error: studentsError?.message || 'No students found' }, { status: 500 })
  }
  
  const studentIds = students.map(s => s.id)
  
  // Get all scores for these students in this term
  const { data: scores, error } = await supabase
    .from('scores')
    .select('student_id, subject_id, total, subjects(name)')
    .eq('term_id', termId)
    .in('student_id', studentIds)
  
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  
  // Calculate class size
  // Use the total number of students in the class (Number on Roll), 
  // not just those who have scores
  const totalClassSize = students.length
  const uniqueStudents = [...new Set(scores.map(s => s.student_id))]
  
  let responseData = {
    scores,
    totalClassSize,
    uniqueStudents
  }

  // Save to cache
  cache.set(cacheKey, { data: responseData, timestamp: Date.now() })

  // Apply pseudonymization if requested by a student
  if (requestingStudentId) {
    responseData = {
      scores: responseData.scores.map((s: any) => ({
        ...s,
        student_id: s.student_id === requestingStudentId ? s.student_id : `anon_${s.student_id.substring(0, 8)}`
      })),
      totalClassSize: responseData.totalClassSize,
      uniqueStudents: responseData.uniqueStudents.map(id => id === requestingStudentId ? id : `anon_${id.substring(0, 8)}`)
    }
  }

  // Return the scores data
  return NextResponse.json(responseData)
}
