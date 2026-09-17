import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import BackButton from '@/components/ui/back-button'
import ComplaintsList from './ComplaintsList'
import { MessageSquare, AlertCircle, ShieldCheck, Inbox } from 'lucide-react'
import { PortalFooter } from '@/components/PortalFooter'

export const dynamic = 'force-dynamic'

export default async function AdminComplaintsPage() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

  const supabase = createSupabaseClient(supabaseUrl, supabaseServiceKey)

  const { data: complaints, error } = await supabase
    .from('complaints')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching complaints:', error)
    return (
      <div className="min-h-screen bg-slate-50/50 dark:bg-slate-900 font-sans text-slate-900 dark:text-slate-100 flex flex-col justify-between">
        <header className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 py-3.5">
            <div className="flex items-center gap-3">
              <BackButton href="/admin/dashboard" />
              <h1 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                Helpdesk &amp; Inquiries
              </h1>
            </div>
          </div>
        </header>

        <main className="flex-1 max-w-md mx-auto w-full px-4 py-16 flex items-center justify-center">
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 sm:p-8 text-center border border-slate-200/80 dark:border-slate-700 shadow-xs space-y-4 w-full">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Unable to Load Inquiries
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                An unexpected database error occurred while fetching feedback submissions. Please try reloading the page.
              </p>
            </div>
            <div className="pt-2">
              <BackButton href="/admin/dashboard" />
            </div>
          </div>
        </main>

        <PortalFooter />
      </div>
    )
  }

  const complaintsList = complaints || []

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-900 font-sans text-slate-900 dark:text-slate-100 flex flex-col transition-colors selection:bg-[#003B5C] selection:text-white">
      
      {/* Sticky Top Header */}
      <header className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div className="max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 py-3 sm:py-3.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
            
            {/* Title & Navigation */}
            <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
              <BackButton href="/admin/dashboard" />
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-4 bg-amber-400 rounded-full shrink-0" />
                  <h1 className="text-base sm:text-xl font-black text-slate-900 dark:text-white tracking-tight truncate">
                    Feedback &amp; Complaints Desk
                  </h1>
                </div>
                <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium truncate mt-0.5">
                  Review public grievances, stakeholder suggestions, and parent inquiries
                </p>
              </div>
            </div>

            {/* Inquiries Counter Pill */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200/70 dark:border-blue-900/50 self-start sm:self-auto shrink-0 shadow-2xs">
              <MessageSquare className="w-3.5 h-3.5 text-[#003B5C] dark:text-blue-400 shrink-0" />
              <span className="text-xs font-mono font-bold text-[#003B5C] dark:text-blue-300">
                {complaintsList.length} {complaintsList.length === 1 ? 'Submission Logged' : 'Submissions Logged'}
              </span>
            </div>

          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-3.5 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8 space-y-4 sm:space-y-6">
        <ComplaintsList initialComplaints={complaintsList} />
      </main>

      {/* Footer */}
      <PortalFooter />
    </div>
  )
}