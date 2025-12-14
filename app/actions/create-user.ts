'use server'

import { createClient } from '@supabase/supabase-js'

export async function createUserAction(userData: {
  email: string
  password: string
  username: string
  full_name: string
  role: 'admin' | 'teacher' | 'student'
  phone?: string
}) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing Supabase environment variables (NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY)')
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })

  const { data, error } = await supabase.auth.admin.createUser({
    email: userData.email,
    password: userData.password,
    email_confirm: true,
    user_metadata: {
      username: userData.username,
      full_name: userData.full_name,
      role: userData.role
    }
  })

  if (error) {
    throw new Error(error.message)
  }

  return { user: data.user }
}
