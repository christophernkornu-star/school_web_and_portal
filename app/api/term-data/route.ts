import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const termId = searchParams.get('termId')

    if (!termId) {
      return NextResponse.json(
        { error: 'Term ID is required' },
        { status: 400 }
      )
    }

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Supabase admin credentials are not configured')
      return NextResponse.json(
        { error: 'Supabase environment variables are missing' },
        { status: 500 }
      )
    }

    // Use service role to bypass RLS
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    const { data: termData, error } = await supabase
      .from('academic_terms')
      .select('id, name, academic_year, total_days, start_date, end_date, is_current')
      .eq('id', termId)
      .maybeSingle()

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching term data:', error)
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    if (!termData) {
      return NextResponse.json(
        { error: 'Term not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(termData)
  } catch (error: any) {
    console.error('Error in term-data API:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
