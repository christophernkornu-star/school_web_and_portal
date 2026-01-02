'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'
import { ClassFeeReport } from '@/components/ClassFeeReport'
import { Loader2, ArrowLeft, Printer } from 'lucide-react'
import Link from 'next/link'

function ClassStatementContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const classId = searchParams.get('classId')
  const supabase = getSupabaseBrowserClient()

  const [loading, setLoading] = useState(true)
  const [className, setClassName] = useState('')
  const [students, setStudents] = useState<any[]>([])
  const [feeStructures, setFeeStructures] = useState<any[]>([])
  const [payments, setPayments] = useState<any[]>([])

  useEffect(() => {
    if (!classId) {
      router.push('/teacher/fees')
      return
    }
    loadData()
  }, [classId])

  const loadData = async () => {
    try {
      // 1. Get Class Name
      const { data: classData } = await supabase
        .from('classes')
        .select('name')
        .eq('id', classId)
        .single()
      
      if (classData) setClassName(classData.name)

      // 2. Get Students
      const { data: studentsData } = await supabase
        .from('students')
        .select('id, first_name, last_name, student_id, gender')
        .eq('class_id', classId)
        .order('last_name')
      
      setStudents(studentsData || [])

      // 3. Get Fee Structures (Current Term)
      const { data: currentTerm } = await supabase
        .from('academic_terms')
        .select('id, academic_year')
        .eq('is_current', true)
        .single()

      if (currentTerm) {
        const { data: feesData } = await supabase
          .from('fee_structures')
          .select(`
            id, amount, academic_year,
            fee_types (id, name, description)
          `)
          .eq('academic_year', currentTerm.academic_year)
          .or(`class_id.eq.${classId},class_id.is.null`)

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
        }
      }
    } catch (error) {
      console.error('Error loading statement data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <Loader2 className="w-8 h-8 animate-spin text-green-600" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-4 md:p-8 print:bg-white print:p-0">
      <div className="max-w-5xl mx-auto">
        {/* Toolbar - Hidden when printing */}
        <div className="mb-6 flex items-center justify-between print:hidden">
          <Link 
            href="/teacher/fees"
            className="flex items-center text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Fees
          </Link>
          <button
            onClick={() => window.print()}
            className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Printer className="w-4 h-4 mr-2" />
            Print Statement
          </button>
        </div>

        {/* Report Component */}
        <div className="bg-white dark:bg-gray-800 shadow-lg rounded-xl overflow-hidden print:shadow-none print:rounded-none">
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
