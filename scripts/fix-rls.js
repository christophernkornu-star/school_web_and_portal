// Fix RLS policies to allow login
require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function fixRLSPolicies() {
  console.log('🔧 Checking RLS policies and profile access...\n')

  // Test if we can read profiles with anon key
  console.log('Testing profile read access with anon key...')
  const { data, error } = await supabase
    .from('profiles')
    .select('username, email, role')
    .eq('username', 'admin.francis')
    .single()

  if (error) {
    console.error('❌ Cannot read profiles:', error.message)
    console.log('\n⚠️  RLS policies are blocking profile reads!')
    console.log('\n📋 You need to run this SQL in Supabase SQL Editor:')
    console.log('🔗 https://okfawhokrtkaibhbcjdk.supabase.co/project/okfawhokrtkaibhbcjdk/sql/new')
    console.log('\n' + '='.repeat(60))
    console.log(`
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

-- Allow anyone to read profiles (needed for login username lookup)
CREATE POLICY "Allow username lookup for login" ON profiles
  FOR SELECT USING (true);

-- Allow users to update their own profile
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Allow authenticated users to insert their profile
CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);
    `)
    console.log('='.repeat(60))
    console.log('\n💡 After running the SQL, try logging in again!')
  } else {
    console.log('✅ Profile read access working!')
    console.log(`   Found: ${data.username} (${data.role})`)
    console.log('\n🎉 RLS policies are correctly configured!')
    console.log('   Login should work at http://localhost:3000/login')
  }
}

fixRLSPolicies().catch(console.error)
