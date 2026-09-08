'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  ClipboardCheck, 
  GraduationCap, 
  ChevronRight, 
  CheckCircle2, 
  Layers
} from 'lucide-react'
import { getCurrentUser } from '@/lib/auth'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'
import { Skeleton } from "@/components/ui/skeleton"
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
    return (
      <div className="min-h-screen bg-gray-50/50 dark:bg-gray-900 pb-20">
        <header className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-md border-b border-gray-200/80 dark:border-gray-800 sticky top-0 z-30 shadow-sm">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 sm:py-4">
            <div className="flex items-center space-x-3 sm:space-x-4">
              <Skeleton className="h-9 w-9 rounded-xl shrink-0" />
              <div className="space-y-2">
                <Skeleton className="h-6 w-40 sm:w-56 rounded-lg" />
                <Skeleton className="h-3.5 w-60 sm:w-80 rounded-md" />
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            {[1, 2].map((i) => (
              <div 
                key={i} 
                className="bg-white dark:bg-gray-800 rounded-2xl sm:rounded-3xl p-6 sm:p-8 border border-gray-200/80 dark:border-gray-700 shadow-sm space-y-4"
              >
                <div className="flex items-center justify-between">
                  <Skeleton className="h-12 w-12 rounded-2xl" />
                  <Skeleton className="h-6 w-24 rounded-full" />
                </div>
                <div className="space-y-2 pt-2">
                  <Skeleton className="h-6 w-48 rounded-lg" />
                  <Skeleton className="h-4 w-full rounded" />
                  <Skeleton className="h-4 w-3/4 rounded" />
                </div>
                <div className="pt-4 border-t border-gray-100 dark:border-gray-700/60 flex justify-between items-center">
                  <Skeleton className="h-4 w-32 rounded" />
                  <Skeleton className="h-4 w-4 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50/50 dark:bg-gray-900 pb-24 font-sans text-gray-900 dark:text-gray-100 transition-colors">
      {/* Sticky Header Banner */}
      <header className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-md border-b border-gray-200/80 dark:border-gray-800 sticky top-0 z-30 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 sm:py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-start sm:items-center space-x-3 sm:space-x-4 min-w-0">
              <BackButton href="/teacher/dashboard" className="shrink-0 mt-0.5 sm:mt-0 shadow-sm" />
              <div className="min-w-0">
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-gray-900 dark:text-white flex items-center gap-2 truncate">
                  <Layers className="w-5 h-5 sm:w-6 sm:h-6 text-[#003B5C] dark:text-blue-400 shrink-0" />
                  <span>Manage Academic Scores</span>
                </h1>
                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 font-medium truncate">
                  Select assessment format to enter marks, grade student submissions, and review reports
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Hub Content */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-6 sm:space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          
          {/* 1. Class Assessments Hub */}
          <Link 
            href="/teacher/review-assessments" 
            className="group relative bg-white dark:bg-gray-800 rounded-2xl sm:rounded-3xl border border-gray-200/80 dark:border-gray-700 p-5 sm:p-7 md:p-8 shadow-sm hover:shadow-xl hover:border-[#003B5C]/40 dark:hover:border-blue-500/40 transition-all duration-300 flex flex-col justify-between overflow-hidden"
          >
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-purple-500 to-[#003B5C] opacity-80 group-hover:opacity-100 transition-opacity" />

            <div>
              <div className="flex items-center justify-between gap-2 mb-4 sm:mb-6">
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center border border-purple-100 dark:border-purple-900/40 group-hover:scale-105 transition-transform duration-300 shadow-sm shrink-0">
                  <ClipboardCheck className="w-6 h-6 sm:w-7 sm:h-7" />
                </div>

                <span className="px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border border-purple-200/80 dark:border-purple-800">
                  Class Tasks ({classScorePercentage}%)
                </span>
              </div>

              <div className="space-y-2">
                <h2 className="text-lg sm:text-xl font-black text-gray-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors flex items-center gap-1.5">
                  <span>Class Assessments</span>
                </h2>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 leading-relaxed font-normal">
                  Record individual homework, projects, class exercises, and mid-term tests. System scales all completed tasks into the {classScorePercentage}% continuous assessment component.
                </p>
              </div>
            </div>

            <div className="pt-5 mt-6 border-t border-gray-100 dark:border-gray-750 flex items-center justify-between text-xs sm:text-sm font-bold text-purple-600 dark:text-purple-400">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Manage Class Exercises</span>
              </div>
              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform shrink-0" />
            </div>
          </Link>

          {/* 2. Terminal Exam Scores Hub */}
          <Link 
            href="/teacher/scores" 
            className="group relative bg-white dark:bg-gray-800 rounded-2xl sm:rounded-3xl border border-gray-200/80 dark:border-gray-700 p-5 sm:p-7 md:p-8 shadow-sm hover:shadow-xl hover:border-[#003B5C]/40 dark:hover:border-blue-500/40 transition-all duration-300 flex flex-col justify-between overflow-hidden"
          >
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#003B5C] to-blue-500 opacity-80 group-hover:opacity-100 transition-opacity" />

            <div>
              <div className="flex items-center justify-between gap-2 mb-4 sm:mb-6">
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-[#003B5C] dark:text-blue-400 flex items-center justify-center border border-blue-100 dark:border-blue-900/40 group-hover:scale-105 transition-transform duration-300 shadow-sm shrink-0">
                  <GraduationCap className="w-6 h-6 sm:w-7 sm:h-7" />
                </div>

                <span className="px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-[#003B5C]/10 dark:bg-[#003B5C]/30 text-[#003B5C] dark:text-blue-300 border border-[#003B5C]/20">
                  Exams ({examScorePercentage}%)
                </span>
              </div>

              <div className="space-y-2">
                <h2 className="text-lg sm:text-xl font-black text-gray-900 dark:text-white group-hover:text-[#003B5C] dark:group-hover:text-blue-400 transition-colors flex items-center gap-1.5">
                  <span>Terminal Exam Scores</span>
                </h2>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 leading-relaxed font-normal">
                  Enter end-of-term examination raw scores via our spreadsheet matrix or mobile card view. Scores are scaled to {examScorePercentage}% to calculate final composite totals and remarks.
                </p>
              </div>
            </div>

            <div className="pt-5 mt-6 border-t border-gray-100 dark:border-gray-750 flex items-center justify-between text-xs sm:text-sm font-bold text-[#003B5C] dark:text-blue-400">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Enter & Audit Exam Grades</span>
              </div>
              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform shrink-0" />
            </div>
          </Link>

        </div>
      </main>
    </div>
  )
}