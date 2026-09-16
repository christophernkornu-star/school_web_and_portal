'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'
import { 
  Calendar, 
  CheckCircle2, 
  AlertCircle, 
  TrendingUp, 
  Clock, 
  FileText, 
  CalendarDays,
  Sparkles
} from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import BackButton from '@/components/ui/back-button'
import { PortalFooter } from '@/components/PortalFooter'

interface AttendanceRecord {
  id: string
  days_present: number
  remarks: string | null
  academic_terms: {
    id: string
    name: string
    academic_year: string
    total_days: number
  }
  classes: {
    name: string
  }
}

interface AttendanceStats {
  totalTerms: number
  averageRate: number
}

export default function AttendancePage() {
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()
  const [loading, setLoading] = useState(true)
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([])
  const [stats, setStats] = useState<AttendanceStats>({
    totalTerms: 0,
    averageRate: 0
  })
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadAttendance()
  }, [])

  async function loadAttendance() {
    try {
      setLoading(true)
      setError(null)

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login?portal=student')
        return
      }

      const { data: student, error: studentError } = await supabase
        .from('students')
        .select('id, first_name, last_name, profile_id')
        .eq('profile_id', user.id)
        .single()

      if (studentError || !student) {
        setError('Could not find student record. Please contact the administrator.')
        return
      }

      const { data: records, error: attendanceError } = await supabase
        .from('student_attendance')
        .select(`
          *,
          academic_terms (
            id,
            name,
            academic_year,
            total_days
          ),
          classes (
            name
          )
        `)
        .eq('student_id', student.id)
        .order('created_at', { ascending: false })

      if (attendanceError) {
        setError(`Error loading attendance: ${attendanceError.message}`)
        return
      }

      const safeRecords = (records as AttendanceRecord[]) || []
      setAttendance(safeRecords)
      calculateStats(safeRecords)
    } catch (err) {
      console.error('Unexpected error loading attendance:', err)
      setError('An unexpected error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  function calculateStats(records: AttendanceRecord[]) {
    if (records.length === 0) {
      setStats({ totalTerms: 0, averageRate: 0 })
      return
    }

    const totalTerms = records.length
    const rates = records
      .filter(r => r.academic_terms?.total_days > 0)
      .map(r => (r.days_present / r.academic_terms.total_days) * 100)
    
    const averageRate = rates.length > 0 
      ? rates.reduce((sum, rate) => sum + rate, 0) / rates.length 
      : 0

    setStats({ 
      totalTerms, 
      averageRate: Math.round(averageRate * 10) / 10 
    })
  }

  function getRateBadge(percentage: number) {
    if (percentage >= 90) {
      return {
        badge: 'bg-emerald-50 text-emerald-700 border-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/50',
        bar: 'bg-emerald-500',
        label: 'Excellent'
      }
    }
    if (percentage >= 75) {
      return {
        badge: 'bg-blue-50 text-[#003B5C] border-blue-200/80 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900/50',
        bar: 'bg-[#003B5C] dark:bg-blue-500',
        label: 'Regular'
      }
    }
    if (percentage >= 60) {
      return {
        badge: 'bg-amber-50 text-amber-700 border-amber-200/80 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900/50',
        bar: 'bg-amber-500',
        label: 'Fair'
      }
    }
    return {
      badge: 'bg-rose-50 text-rose-700 border-rose-200/80 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900/50',
      bar: 'bg-rose-500',
      label: 'Critical'
    }
  }

  if (loading) {
    return <AttendanceSkeleton />
  }

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-900 font-sans text-slate-900 dark:text-slate-100 flex flex-col transition-colors selection:bg-[#003B5C] selection:text-white">
      
      {/* Sticky Top Header */}
      <header className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div className="max-w-6xl mx-auto px-3.5 sm:px-6 lg:px-8 py-3.5 sm:py-4">
          <div className="flex items-center justify-between gap-3">
            
            <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
              <BackButton href="/student/dashboard" />
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-4 bg-amber-400 rounded-full shrink-0" />
                  <h1 className="text-base sm:text-xl font-black text-slate-900 dark:text-white tracking-tight truncate">
                    Roll Call &amp; Attendance Record
                  </h1>
                </div>
                <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium truncate mt-0.5">
                  Official presence logs and term attendance tallies
                </p>
              </div>
            </div>

            <div className="hidden sm:inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200/70 dark:border-blue-900/50 text-[#003B5C] dark:text-blue-300 text-xs font-bold shrink-0 font-mono">
              <Calendar className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <span>{attendance.length} {attendance.length === 1 ? 'Term Logged' : 'Terms Logged'}</span>
            </div>

          </div>
        </div>
      </header>

      {/* Main Workspace */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-3.5 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8 space-y-4 sm:space-y-6">
        
        {/* Error Alert */}
        {error && (
          <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200/80 dark:border-rose-900/50 rounded-2xl p-4 flex items-start gap-3 text-xs text-rose-900 dark:text-rose-200 shadow-2xs">
            <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
            <p className="leading-relaxed">{error}</p>
          </div>
        )}

        {/* Attendance KPI Statistics Strip */}
        <section className="grid grid-cols-2 md:grid-cols-3 gap-2.5 sm:gap-3.5 md:gap-4">
          
          <div className="bg-white dark:bg-slate-800/90 rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-700/80 shadow-xs flex items-center justify-between">
            <div className="space-y-0.5 min-w-0">
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-400 block truncate">
                Terms Recorded
              </span>
              <div className="text-xl sm:text-2xl md:text-3xl font-black font-mono text-[#003B5C] dark:text-blue-400">
                {stats.totalTerms}
              </div>
              <p className="text-[10px] sm:text-[11px] text-slate-400 truncate">Total school terms</p>
            </div>
            <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-[#003B5C]/10 text-[#003B5C] dark:bg-blue-500/20 dark:text-blue-300 flex items-center justify-center shrink-0 ml-1">
              <CalendarDays className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800/90 rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-700/80 shadow-xs flex items-center justify-between">
            <div className="space-y-0.5 min-w-0">
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-400 block truncate">
                Average Presence
              </span>
              <div className="text-xl sm:text-2xl md:text-3xl font-black font-mono text-emerald-600 dark:text-emerald-400">
                {stats.averageRate}%
              </div>
              <p className="text-[10px] sm:text-[11px] text-slate-400 truncate">Punctuality average</p>
            </div>
            <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-300 flex items-center justify-center shrink-0 ml-1">
              <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>

          <div className="col-span-2 md:col-span-1 bg-white dark:bg-slate-800/90 rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-700/80 shadow-xs flex items-center justify-between">
            <div className="space-y-0.5 min-w-0">
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-400 block truncate">
                Attendance Standing
              </span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className={`text-base sm:text-xl font-black truncate ${
                  stats.averageRate >= 85 ? 'text-emerald-600 dark:text-emerald-400' :
                  stats.averageRate >= 70 ? 'text-[#003B5C] dark:text-blue-400' :
                  'text-amber-600 dark:text-amber-400'
                }`}>
                  {stats.averageRate >= 85 ? 'Punctual & Regular' : stats.averageRate >= 70 ? 'Satisfactory' : 'Needs Attention'}
                </span>
              </div>
              <p className="text-[10px] sm:text-[11px] text-slate-400 truncate">GES requirement: 80%+</p>
            </div>
            <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-300 flex items-center justify-center shrink-0 ml-1">
              <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>

        </section>

        {/* --- Attendance Records Container --- */}
        <section className="bg-white dark:bg-slate-800/90 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-700/80 shadow-xs overflow-hidden">
          
          <div className="px-4 sm:px-6 py-3.5 sm:py-4 bg-[#003B5C] border-b border-[#002a42] flex items-center justify-between">
            <h2 className="text-xs sm:text-sm font-black uppercase tracking-wider text-white flex items-center gap-2">
              <span className="w-1.5 h-4 bg-amber-400 rounded-full shrink-0" />
              <span>Term-by-Term Presence Breakdown</span>
            </h2>
            <span className="text-[10px] sm:text-xs font-mono text-blue-200/80">
              {attendance.length} {attendance.length === 1 ? 'Record' : 'Records'}
            </span>
          </div>

          {attendance.length === 0 ? (
            <div className="p-10 sm:p-16 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto shadow-inner">
                <Calendar className="w-6 h-6 opacity-35" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                  No Attendance Logs Available
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
                  Your class attendance tallies will appear here once submitted by your class teacher.
                </p>
              </div>
            </div>
          ) : (
            <div>
              {/* Desktop Table View (≥ md screens) */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-xs sm:text-sm text-left">
                  <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-500 dark:text-slate-400 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200/80 dark:border-slate-700">
                    <tr>
                      <th className="px-4 sm:px-6 py-3.5">Academic Session</th>
                      <th className="px-4 py-3.5">Class Cohort</th>
                      <th className="px-4 py-3.5 text-center font-mono">Present</th>
                      <th className="px-4 py-3.5 text-center font-mono">Total Days</th>
                      <th className="px-4 py-3.5 text-center font-mono">Rate</th>
                      <th className="px-4 sm:px-6 py-3.5">Teacher Remark</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                    {attendance.map((record) => {
                      const totalDays = record.academic_terms?.total_days || 0
                      const percentage = totalDays > 0 
                        ? Math.round((record.days_present / totalDays) * 100) 
                        : 0
                      const style = getRateBadge(percentage)

                      return (
                        <tr key={record.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="px-4 sm:px-6 py-3.5">
                            <div className="font-bold text-slate-900 dark:text-white">
                              {record.academic_terms?.name || 'Term'}
                            </div>
                            <div className="text-[11px] text-slate-400 font-mono">
                              {record.academic_terms?.academic_year}
                            </div>
                          </td>
                          
                          <td className="px-4 py-3.5 font-semibold text-slate-700 dark:text-slate-300">
                            {record.classes?.name || '---'}
                          </td>

                          <td className="px-4 py-3.5 text-center font-mono font-black text-emerald-600 dark:text-emerald-400 text-sm">
                            {record.days_present}
                          </td>

                          <td className="px-4 py-3.5 text-center font-mono text-slate-500 dark:text-slate-400">
                            {totalDays}
                          </td>

                          <td className="px-4 py-3.5 text-center">
                            <span className={`inline-flex items-center justify-center px-2.5 py-1 rounded-lg text-xs font-black font-mono border ${style.badge}`}>
                              {percentage}%
                            </span>
                          </td>

                          <td className="px-4 sm:px-6 py-3.5 text-xs text-slate-600 dark:text-slate-300 italic max-w-xs truncate" title={record.remarks || ''}>
                            {record.remarks ? `"${record.remarks}"` : <span className="text-slate-400 not-italic">None entered</span>}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile & Tablet Card List (< md screens) */}
              <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800/80">
                {attendance.map((record) => {
                  const totalDays = record.academic_terms?.total_days || 0
                  const percentage = totalDays > 0 
                    ? Math.round((record.days_present / totalDays) * 100) 
                    : 0
                  const style = getRateBadge(percentage)

                  return (
                    <div key={record.id} className="p-4 space-y-3">
                      
                      {/* Top Row: Term, Year, and Rate Badge */}
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="font-black text-sm text-slate-900 dark:text-white">
                            {record.academic_terms?.name || 'Term'}
                          </h3>
                          <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-mono mt-0.5">
                            <span>{record.academic_terms?.academic_year}</span>
                            <span>•</span>
                            <span className="font-bold text-slate-600 dark:text-slate-300">{record.classes?.name}</span>
                          </div>
                        </div>

                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-black font-mono border shrink-0 ${style.badge}`}>
                          <span>{percentage}%</span>
                          <span className="text-[10px] font-sans uppercase font-bold opacity-80">({style.label})</span>
                        </span>
                      </div>

                      {/* Progress Bar & Tallies */}
                      <div className="space-y-1.5 bg-slate-50/70 dark:bg-slate-900/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                        <div className="flex justify-between items-center text-xs font-semibold">
                          <span className="text-slate-500">
                            Present: <strong className="text-emerald-600 font-mono">{record.days_present} days</strong>
                          </span>
                          <span className="text-slate-400 font-mono">
                            of {totalDays} days
                          </span>
                        </div>
                        
                        <div className="h-2 w-full bg-slate-200/80 dark:bg-slate-700 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all duration-500 ${style.bar}`}
                            style={{ width: `${Math.min(percentage, 100)}%` }}
                          />
                        </div>
                      </div>

                      {/* Remarks if available */}
                      {record.remarks && (
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 italic bg-white dark:bg-slate-800/60 p-2.5 rounded-lg border border-slate-100 dark:border-slate-750">
                          &ldquo;{record.remarks}&rdquo;
                        </div>
                      )}

                    </div>
                  )
                })}
              </div>
            </div>
          )}

        </section>

      </main>

      <PortalFooter />
    </div>
  )
}

function AttendanceSkeleton() {
  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-900 flex flex-col font-sans">
      <header className="sticky top-0 z-30 bg-white dark:bg-slate-900 border-b border-slate-200/80 dark:border-slate-800">
        <div className="max-w-6xl mx-auto px-3.5 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Skeleton className="w-8 h-8 rounded-xl" />
            <Skeleton className="h-6 w-44 rounded-md" />
          </div>
          <Skeleton className="h-8 w-28 rounded-xl hidden sm:block" />
        </div>
      </header>

      <main className="max-w-6xl mx-auto w-full px-3.5 sm:px-6 lg:px-8 py-5 sm:py-6 space-y-4 flex-1">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-24 rounded-2xl col-span-2 md:col-span-1" />
        </div>
        <Skeleton className="h-64 sm:h-80 w-full rounded-2xl sm:rounded-3xl" />
      </main>

      <PortalFooter />
    </div>
  )
}