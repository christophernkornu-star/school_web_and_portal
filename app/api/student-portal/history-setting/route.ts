import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

/**
 * Returns whether the student portal should show report-card history for past
 * academic years. Reads the admin-controlled `historical_reports_settings`
 * table through the service role (bypassing student RLS, which deliberately
 * denies access to this admin settings table).
 *
 * Always resolves to a boolean: if the table doesn't exist yet (migration not
 * applied) or anything fails, it safely defaults to `false` (active year only).
 */
export async function GET() {
  try {
    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ showHistory: false })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    const { data, error } = await supabase
      .from('historical_reports_settings')
      .select('student_portal_show_history')
      .limit(1)
      .maybeSingle()

    if (error) {
      // Table missing (migration not applied yet) -> default to false, no error.
      console.warn('student-portal/history-setting could not read setting:', error.message)
      return NextResponse.json({ showHistory: false })
    }

    const showHistory = data?.student_portal_show_history === true

    return NextResponse.json(
      { showHistory },
      {
        headers: { 'Cache-Control': 'no-store, max-age=0' },
      }
    )
  } catch (e: any) {
    console.warn('student-portal/history-setting error:', e?.message || e)
    return NextResponse.json({ showHistory: false })
  }
}
