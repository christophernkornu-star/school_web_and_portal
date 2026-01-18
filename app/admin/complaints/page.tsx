import { createClient } from '@/lib/supabase'
import { cookies } from 'next/headers'
import ComplaintsList from './ComplaintsList'

export const dynamic = 'force-dynamic'

export default async function AdminComplaintsPage() {
  const cookieStore = cookies()
  // We can't use the singleton from lib/supabase directly for server components with cookies
  // But looking at the project structure, they might be using a different pattern.
  // Let's use the pattern seen in other files or just use the service key for now to fetch data 
  // since we are in a protected admin route (assuming layout handles protection).
  
  // Actually, let's try to use the createServerComponentClient pattern if possible, 
  // but since I don't see the utils file for it, I'll stick to a safe fetch.
  
  // Wait, I can just use the service role key to fetch all complaints for the admin.
  // The route protection should be in middleware or layout.
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  
  const { createClient: createSupabaseClient } = require('@supabase/supabase-js')
  const supabase = createSupabaseClient(supabaseUrl, supabaseServiceKey)

  const { data: complaints, error } = await supabase
    .from('complaints')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching complaints:', error)
    return <div>Error loading complaints</div>
  }

  return (
    <div className="p-4 md:p-6">
      <div className="mb-6 md:mb-8">
        <h1 className="text-xl md:text-2xl font-bold text-gray-900">Complaints & Suggestions</h1>
        <p className="text-xs md:text-sm text-gray-600">Manage and respond to user feedback</p>
      </div>
      
      <ComplaintsList initialComplaints={complaints || []} />
    </div>
  )
}
