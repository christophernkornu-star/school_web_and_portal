// Test profile access with ANON key (same as browser)
require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY  // Using ANON key like browser

console.log('🔍 Testing with ANON key (same as browser uses)...\n')
console.log('Supabase URL:', supabaseUrl)
console.log('Anon Key:', supabaseAnonKey.substring(0, 20) + '...\n')

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function testAnonAccess() {
  console.log('📝 Attempting to read profile with username "admin.francis"...\n')
  
  const { data, error } = await supabase
    .from('profiles')
    .select('username, email, role')
    .eq('username', 'admin.francis')
    .single()

  if (error) {
    console.error('❌ Error:', error)
    console.log('\n⚠️  RLS Policy Issue Detected!')
    console.log('\n🔧 Run this SQL in Supabase SQL Editor:')
    console.log('🔗 https://okfawhokrtkaibhbcjdk.supabase.co/project/okfawhokrtkaibhbcjdk/sql/new')
    console.log('\n' + '='.repeat(70))
    console.log(`
-- Drop restrictive policies
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

-- Allow public read access (needed for login username lookup)
CREATE POLICY "Public read access for login" ON profiles
  FOR SELECT USING (true);

-- Allow users to update their own profile  
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);
    `)
    console.log('='.repeat(70))
  } else {
    console.log('✅ SUCCESS! Profile found:', data)
    console.log('\n🎉 Login should work in browser!')
  }
}

testAnonAccess().catch(console.error)
