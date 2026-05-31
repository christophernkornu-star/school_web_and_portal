'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'
import { ClassFeeReport } from '@/components/ClassFeeReport'
import { Loader2, ArrowLeft, Printer } from 'lucide-react'
import Link from 'next/link'
import { Skeleton } from "@/components/ui/skeleton"

function ClassStatementContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const classId = searchParams.get('classId')
  const initialYear = searchParams.get('year')
  const initialTerm = searchParams.get('term')
  const supabase = getSupabaseBrowserClient()

  const [loading, setLoading] = useState(true)
  const [className, setClassName] = useState('')
  const [students, setStudents] = useState<any[]>([])
  const [feeStructures, setFeeStructures] = useState<any[]>([])
  const [payments, setPayments] = useState<any[]>([])

  const [academicYears, setAcademicYears] = useState<string[]>([])
  const [terms, setTerms] = useState<any[]>([])
  const [selectedYear, setSelectedYear] = useState<string>(initialYear || '')
  const [selectedTerm, setSelectedTerm] = useState<string>(initialTerm || '')
  const [classes, setClasses] = useState<any[]>([])
  const [selectedClass, setSelectedClass] = useState<string | null>(classId)

  useEffect(() => {
    // Load available terms/years/classes first
    (async () => {
      try {
        const { data: termsData } = await supabase
          .from('academic_terms')
          .select('id, name, academic_year, is_current')
          .order('start_date', { ascending: false })

        setTerms(termsData || [])
        const uniqueYears = Array.from(new Set(((termsData || []) as any[]).map((t: any) => t.academic_year))) as string[]
        setAcademicYears(uniqueYears)

        // If no initial year/term provided, pick current or first
        const currentTerm = (termsData || []).find((t: any) => t.is_current)
        if (!selectedYear && currentTerm?.academic_year) setSelectedYear(currentTerm.academic_year)
        if (!selectedTerm && currentTerm?.id) setSelectedTerm(currentTerm.id)

        // Load classes for dropdown (teachers may want to change class before printing)
        const { data: classesData } = await supabase
          .from('classes')
          .select('id, name')
          .order('name')

        setClasses(classesData || [])
        if (!selectedClass && classesData && classesData.length > 0) setSelectedClass(classId || classesData[0].id)
      } catch (err) {
        console.error('Error preloading statement options:', err)
      }

      if (!classId) {
        router.push('/teacher/fees')
        return
      }

      loadData()
    })()
  }, [classId])

  const loadData = async () => {
    try {
      const classToUse = selectedClass || classId

      // 1. Get Class Name
      const { data: classData } = await supabase
        .from('classes')
        .select('name')
        .eq('id', classToUse)
        .single()
      
      if (classData) setClassName(classData.name)

      // 2. Get Students
      const { data: studentsData } = await supabase
        .from('students')
        .select('id, first_name, last_name, middle_name, student_id, gender')
        .eq('class_id', classId)
        .order('last_name')
      
      setStudents(studentsData || [])

      // 3. Get Fee Structures for selected year/term
      const yearToUse = selectedYear || initialYear
      const termToUse = selectedTerm || initialTerm

      if (!yearToUse) {
        // fallback: try current term year
        const { data: currentTerm } = await supabase
          .from('academic_terms')
          .select('id, academic_year')
          .eq('is_current', true)
          .single()
        if (currentTerm) {
          setSelectedYear(currentTerm.academic_year)
        }
      }

      // Build fee query
      let feeQuery = supabase
        .from('fee_structures')
        .select(`
          id, amount, academic_year, term_id,
          fee_types (id, name, description)
        `)
        .or(`class_id.eq.${classToUse},class_id.is.null`)

      if (yearToUse) feeQuery = feeQuery.eq('academic_year', yearToUse)
      if (termToUse) feeQuery = feeQuery.eq('term_id', termToUse)

      const { data: feesData } = await feeQuery

      setFeeStructures(feesData || [])

      // 4. Get Payments
      if (studentsData && studentsData.length > 0 && feesData && feesData.length > 0) {
        const studentIds = studentsData.map((s: any) => s.id)
        const feeIds = feesData.map((f: any) => f.id)

        const { data: paymentsData } = await supabase
          .from('fee_payments')
          .select('*')
          .in('student_id', studentIds)
          .in('fee_structure_id', feeIds)

        setPayments(paymentsData || [])
      } else {
        setPayments([])
      }
    } catch (error) {
      console.error('Error loading statement data:', error)
    } finally {
      setLoading(false)
    }
  }

  // Reload when selection changes
  useEffect(() => {
    if (!classId && !selectedClass) return
    // refresh data when selections change
    loadData()
  }, [selectedClass, selectedYear, selectedTerm])

  // Keep URL in sync with current selections for sharing/bookmarking
  useEffect(() => {
    if (!selectedClass) return
    const params = new URLSearchParams()
    params.set('classId', selectedClass)
    if (selectedYear) params.set('year', selectedYear)
    if (selectedTerm) params.set('term', selectedTerm)
    const url = `/teacher/fees/statement?${params.toString()}`
    router.replace(url, { scroll: false })
  }, [selectedClass, selectedYear, selectedTerm])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-4 md:p-8">
        <div className="max-w-5xl mx-auto space-y-6">
          <div className="flex justify-between items-center">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-10 w-40" />
          </div>
          
          <div className="bg-white dark:bg-gray-800 shadow-lg rounded-xl overflow-hidden p-8 space-y-8">
            <div className="space-y-4 text-center border-b pb-6">
              <Skeleton className="h-8 w-3/4 mx-auto" />
              <Skeleton className="h-6 w-1/2 mx-auto" />
              <div className="flex justify-center gap-8">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-32" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>

            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-2 md:p-8 print:bg-white print:p-0 transition-colors">
      <div className="max-w-5xl mx-auto">
        {/* Toolbar - Hidden when printing */}
        <div className="mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 print:hidden bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border border-gray-100 dark:border-gray-800 shadow-sm p-4 md:p-6 rounded-2xl sticky top-4 z-30 transition-colors">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <Link 
              href="/teacher/fees"
              className="flex items-center text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white text-sm md:text-base"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Fees
            </Link>

            <div className="flex items-center gap-2">
              <select
                value={selectedYear}
                onChange={(e) => {
                  setSelectedYear(e.target.value)
                  // when year changes, pick a default term for that year
                  const t = terms.find((x: any) => x.academic_year === e.target.value)
                  if (t) setSelectedTerm(t.id)
                }}
                className="pl-3 pr-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm"
              >
                <option value="">Select Year</option>
                {academicYears.map(y => <option key={y} value={y}>{y}</option>)}
              </select>

              <select
                value={selectedTerm}
                onChange={(e) => setSelectedTerm(e.target.value)}
                className="pl-3 pr-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm"
              >
                <option value="">Select Term</option>
                {terms.filter(t => t.academic_year === selectedYear).map((t: any) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>

              <select
                value={selectedClass || ''}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="pl-3 pr-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm"
              >
                <option value="">Select Class</option>
                {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>

            <button
              onClick={() => window.print()}
              className="flex items-center justify-center w-full sm:w-auto px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white rounded-xl shadow-md hover:shadow-lg transition-all font-semibold text-sm md:text-base"
            >
              <Printer className="w-4 h-4 mr-2" />
              Print Statement
            </button>
          </div>
        </div>

        {/* Report Component */}
        <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm shadow-sm border border-gray-100 dark:border-gray-700/50 rounded-2xl overflow-hidden print:border-none print:shadow-none print:rounded-none">
          <ClassFeeReport 
            className={className}
            students={students}
            feeStructures={feeStructures}
            payments={payments}
          />
        </div>
      </div>
    </div>
  )
}

export default function ClassStatementPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin" /></div>}>
      <ClassStatementContent />
    </Suspense>
  )
}
