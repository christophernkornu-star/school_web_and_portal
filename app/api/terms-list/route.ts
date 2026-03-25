import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// In-memory cache for generic non-sensitive term lists
const cache = {
  data: null as any,
  timestamp: 0
}
const CACHE_TTL = 1000 * 60 * 5 // 5 minutes

export async function GET() {
  try {
    // Check Cache first
    if (cache.data && (Date.now() - cache.timestamp < CACHE_TTL)) {
      return NextResponse.json(cache.data)
    }

    // Use service role to bypass RLS
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    const { data: termsData, error } = await supabase
      .from('academic_terms')
      .select('*')
      .order('start_date', { ascending: false })
      .order('academic_year', { ascending: false })

    if (error) {
      console.error('Error fetching terms:', error)
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    const responseData = termsData || []
    cache.data = responseData
    cache.timestamp = Date.now()

    return NextResponse.json(responseData)
  } catch (error: any) {
    console.error('Error in terms-list API:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
