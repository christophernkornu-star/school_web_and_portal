require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const supabaseClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

async function debugAuth() {
  const username = 'araqua1764596798488'
  const password = 'Student123!'

  console.log('🔍 Step 1: Looking up profile...')
  const { data: profile } = await supabaseClient
    .from('profiles')
    .select('email, role, id')
    .eq('username', username)
    .single()

  console.log('Profile:', profile)

  console.log('\n🔍 Step 2: Getting auth user details...')
  const { data: { users } } = await supabaseAdmin.auth.admin.listUsers()
  const authUser = users.find(u => u.email === profile.email)
  
  console.log('Auth User:', {
    id: authUser?.id,
    email: authUser?.email,
    email_confirmed: authUser?.email_confirmed_at,
    phone_confirmed: authUser?.phone_confirmed_at,
    confirmed_at: authUser?.confirmed_at,
    last_sign_in: authUser?.last_sign_in_at,
    app_metadata: authUser?.app_metadata,
    user_metadata: authUser?.user_metadata
  })

  console.log('\n🔐 Step 3: Attempting signin with client (anon key)...')
  const { data: signInData, error: signInError } = await supabaseClient.auth.signInWithPassword({
    email: profile.email,
    password: password
  })

  if (signInError) {
    console.log('❌ Sign in failed:', signInError.message)
    console.log('Error details:', signInError)
  } else {
    console.log('✅ Sign in successful!')
    console.log('Session:', {
      user_id: signInData.user?.id,
      email: signInData.user?.email,
      role: signInData.user?.role
    })
    await supabaseClient.auth.signOut()
  }

  // Try admin sign in
  console.log('\n🔐 Step 4: Attempting signin with admin key...')
  const { data: adminSignIn, error: adminError } = await supabaseAdmin.auth.signInWithPassword({
    email: profile.email,
    password: password
  })

  if (adminError) {
    console.log('❌ Admin sign in also failed:', adminError.message)
  } else {
    console.log('✅ Admin sign in works!')
    await supabaseAdmin.auth.signOut()
  }
}

debugAuth().catch(console.error)
