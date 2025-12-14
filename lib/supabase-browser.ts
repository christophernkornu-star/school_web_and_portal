'use client'

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

// Use global variable for true singleton across module reloads
const globalForSupabase = globalThis as unknown as {
  supabaseBrowserClient: any | undefined
}

export function getSupabaseBrowserClient(): any {
  if (!globalForSupabase.supabaseBrowserClient) {
    globalForSupabase.supabaseBrowserClient = createClientComponentClient()
  }
  return globalForSupabase.supabaseBrowserClient
}
