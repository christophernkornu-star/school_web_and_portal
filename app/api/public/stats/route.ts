import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const revalidate = 0

// Create Supabase client with service role key to bypass RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

export async function GET() {
  try {
    // Get active student count only
    const { count: studentCount, error: studentError } = await supabaseAdmin
      .from('students')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active')

    if (studentError) {
      console.error('Error fetching student count:', studentError)
    }

    // Get active teacher count only
    const { count: teacherCount, error: teacherError } = await supabaseAdmin
      .from('teachers')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active')

    if (teacherError) {
      console.error('Error fetching teacher count:', teacherError)
    }

    return NextResponse.json({
      studentCount: studentCount || 0,
      teacherCount: teacherCount || 0
    })
  } catch (error) {
    console.error('Error in stats API:', error)
    return NextResponse.json(
      { error: 'Failed to fetch stats', studentCount: 0, teacherCount: 0 },
      { status: 500 }
    )
  }
}
