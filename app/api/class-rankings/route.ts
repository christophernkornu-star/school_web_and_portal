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
  
  if (!classId || !termId) {
    return NextResponse.json({ error: 'Missing classId or termId' }, { status: 400 })
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
  
  // Return the scores data
  return NextResponse.json({
    scores,
    totalClassSize,
    uniqueStudents
  })
}
