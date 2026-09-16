'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  ClipboardCheck, 
  GraduationCap, 
  ChevronRight, 
  CheckCircle2, 
  Layers,
  Info,
  ArrowRight,
  SlidersHorizontal,
  Sparkles
} from 'lucide-react'
import { getCurrentUser } from '@/lib/auth'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'
import { Skeleton } from '@/components/ui/skeleton'
import BackButton from '@/components/ui/back-button'

export default function ManageScoresPage() {
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()

  const [loading, setLoading] = useState(true)
  const [classScorePercentage, setClassScorePercentage] = useState(40)
  const [examScorePercentage, setExamScorePercentage] = useState(60)

  useEffect(() => {
    async function loadPageData() {
      try {
        const [user, settingsRes] = await Promise.all([
          getCurrentUser(),
          supabase
            .from('system_settings')
            .select('setting_key, setting_value')
            .in('setting_key', ['class_score_percentage', 'exam_score_percentage'])
        ])

        if (!user) {
          router.push('/login?portal=teacher')
          return
        }

        if (settingsRes.data && settingsRes.data.length > 0) {
          settingsRes.data.forEach((item: any) => {
            if (item.setting_key === 'class_score_percentage' && item.setting_value) {
              const val = Number(item.setting_value)
              if (!isNaN(val)) setClassScorePercentage(val)
            } else if (item.setting_key === 'exam_score_percentage' && item.setting_value) {
              const val = Number(item.setting_value)
              if (!isNaN(val)) setExamScorePercentage(val)
            }
          })
        }

        setLoading(false)
      } catch (error) {
        console.error('Error loading manage scores configuration:', error)
        setLoading(false)
      }
    }

    loadPageData()
  }, [router, supabase])

  if (loading) {
    return <ManageScoresSkeleton />
  }

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-900 font-sans text-slate-900 dark:text-slate-100 flex flex-col transition-colors selection:bg-[#003B5C] selection:text-white">
      
      {/* Sticky Header Banner */}
      <header className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div className="max-w-5xl mx-auto px-3.5 sm:px-6 lg:px-8 py-3.5 sm:py-4">
          <div className="flex items-center justify-between gap-3">
            
            <div className="flex items-center gap-3 sm:gap-4 min-w-0">
              <BackButton href="/teacher/dashboard" />
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-4 bg-amber-400 rounded-full shrink-0" />
                  <h1 className="text-base sm:text-xl md:text-2xl font-black text-slate-900 dark:text-white tracking-tight truncate">
                    Academic Scores &amp; Assessment
                  </h1>
                </div>
                <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium truncate mt-0.5">
                  Record continuous class tasks, input terminal examination grades, and review broadsheets
                </p>
              </div>
            </div>

            <div className="hidden sm:inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#003B5C]/10 dark:bg-blue-950/50 border border-[#003B5C]/20 dark:border-blue-900/50 text-[#003B5C] dark:text-blue-300 text-xs font-bold shrink-0 font-mono">
              <SlidersHorizontal className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <span>{classScorePercentage}% SBA / {examScorePercentage}% Exam</span>
            </div>

          </div>
        </div>
      </header>

      {/* Main Workspace Content */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-3.5 sm:px-6 lg:px-8 py-5 sm:py-8 md:py-10 space-y-5 sm:space-y-6">
        
        {/* SBA Policy Guidance Note */}
        <div className="bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200/70 dark:border-blue-900/50 rounded-2xl p-4 sm:p-5 flex items-start gap-3 text-xs text-blue-900 dark:text-blue-200 shadow-2xs">
          <Info className="w-4 h-4 sm:w-5 sm:h-5 text-[#003B5C] dark:text-blue-400 shrink-0 mt-0.5" />
          <div className="space-y-1 leading-relaxed">
            <h2 className="font-bold text-xs sm:text-sm text-[#003B5C] dark:text-blue-300">
              GES / NaCCA Assessment Weighting Policy
            </h2>
            <p className="text-[11px] sm:text-xs opacity-90">
              Terminal student report cards automatically merge <strong>{classScorePercentage}%</strong> School-Based Assessment (homework, projects, and class exercises) with <strong>{examScorePercentage}%</strong> End-of-Term Examination marks to calculate final raw scores, Stanine grades, and teacher remarks.
            </p>
          </div>
        </div>

        {/* Assessment Hub Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          
          {/* 1. Continuous Class Assessments Hub */}
          <Link 
            href="/teacher/review-assessments" 
            className="group relative bg-white dark:bg-slate-800/90 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-700/80 p-5 sm:p-7 md:p-8 shadow-xs hover:shadow-md hover:border-[#003B5C]/30 dark:hover:border-blue-500/30 transition-all duration-200 flex flex-col justify-between active:scale-[0.98] overflow-hidden"
          >
            <div className="space-y-4">
              
              {/* Top Header: Icon & Component Share Badge */}
              <div className="flex items-center justify-between gap-2">
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-[#003B5C]/10 dark:bg-blue-500/20 text-[#003B5C] dark:text-blue-300 border border-[#003B5C]/15 dark:border-blue-400/20 flex items-center justify-center shadow-2xs group-hover:scale-105 transition-transform shrink-0">
                  <ClipboardCheck className="w-6 h-6 sm:w-7 sm:h-7" />
                </div>

                <span className="px-2.5 py-1 rounded-lg bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 text-[10px] sm:text-[11px] font-mono font-bold uppercase tracking-wider border border-purple-200/80 dark:border-purple-800/60">
                  Class Tasks ({classScorePercentage}%)
                </span>
              </div>

              {/* Title & Description */}
              <div className="space-y-1.5">
                <h2 className="text-base sm:text-lg md:text-xl font-black text-slate-900 dark:text-white tracking-tight group-hover:text-[#003B5C] dark:group-hover:text-blue-400 transition-colors">
                  Class Assessments (SBA)
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed font-normal">
                  Record and track individual homework assignments, science projects, class tests, and weekly exercises. The system automatically computes and scales scores into the continuous assessment component.
                </p>
              </div>

            </div>

            {/* Bottom Action Footer */}
            <div className="pt-4 mt-6 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs sm:text-sm font-bold text-[#003B5C] dark:text-blue-400">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>Review Class Exercises</span>
              </div>
              <div className="w-6 h-6 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400 group-hover:text-[#003B5C] dark:group-hover:text-blue-400 group-hover:translate-x-1 transition-all">
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </div>
          </Link>

          {/* 2. Terminal Exam Scores Hub */}
          <Link 
            href="/teacher/scores" 
            className="group relative bg-white dark:bg-slate-800/90 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-700/80 p-5 sm:p-7 md:p-8 shadow-xs hover:shadow-md hover:border-[#003B5C]/30 dark:hover:border-blue-500/30 transition-all duration-200 flex flex-col justify-between active:scale-[0.98] overflow-hidden"
          >
            <div className="space-y-4">
              
              {/* Top Header: Icon & Component Share Badge */}
              <div className="flex items-center justify-between gap-2">
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-[#003B5C]/10 dark:bg-blue-500/20 text-[#003B5C] dark:text-blue-300 border border-[#003B5C]/15 dark:border-blue-400/20 flex items-center justify-center shadow-2xs group-hover:scale-105 transition-transform shrink-0">
                  <GraduationCap className="w-6 h-6 sm:w-7 sm:h-7" />
                </div>

                <span className="px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-[#003B5C] dark:text-blue-300 text-[10px] sm:text-[11px] font-mono font-bold uppercase tracking-wider border border-blue-200/80 dark:border-blue-900/60">
                  Terminal Exam ({examScorePercentage}%)
                </span>
              </div>

              {/* Title & Description */}
              <div className="space-y-1.5">
                <h2 className="text-base sm:text-lg md:text-xl font-black text-slate-900 dark:text-white tracking-tight group-hover:text-[#003B5C] dark:group-hover:text-blue-400 transition-colors">
                  Terminal Exam Scores
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed font-normal">
                  Enter end-of-term examination raw scores via our responsive score sheet or mobile student card interface. Marks are scaled to calculate final student broadsheets, positions, and academic remarks.
                </p>
              </div>

            </div>

            {/* Bottom Action Footer */}
            <div className="pt-4 mt-6 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs sm:text-sm font-bold text-[#003B5C] dark:text-blue-400">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>Enter &amp; Audit Exam Marks</span>
              </div>
              <div className="w-6 h-6 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400 group-hover:text-[#003B5C] dark:group-hover:text-blue-400 group-hover:translate-x-1 transition-all">
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </div>
          </Link>

        </div>
      </main>
    </div>
  )
}

function ManageScoresSkeleton() {
  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-900 font-sans flex flex-col transition-colors">
      <header className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 border-b border-slate-200/80 dark:border-slate-800">
        <div className="max-w-5xl mx-auto px-3.5 sm:px-6 lg:px-8 py-3.5 sm:py-4 flex items-center justify-between">
          <div className="flex items-center gap-3 sm:gap-4">
            <Skeleton className="h-9 w-9 rounded-xl shrink-0" />
            <div className="space-y-1.5">
              <Skeleton className="h-5 w-44 sm:w-60 rounded-md" />
              <Skeleton className="h-3 w-56 sm:w-80 rounded-md" />
            </div>
          </div>
          <Skeleton className="h-8 w-32 rounded-xl hidden sm:block" />
        </div>
      </header>

      <main className="max-w-5xl mx-auto w-full px-3.5 sm:px-6 lg:px-8 py-5 sm:py-8 space-y-6">
        <Skeleton className="h-20 w-full rounded-2xl" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          <Skeleton className="h-64 sm:h-72 w-full rounded-2xl sm:rounded-3xl" />
          <Skeleton className="h-64 sm:h-72 w-full rounded-2xl sm:rounded-3xl" />
        </div>
      </main>
    </div>
  )
}