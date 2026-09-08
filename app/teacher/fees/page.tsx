'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { format } from 'date-fns'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'
import { getTeacherClassAccess } from '@/lib/teacher-permissions'
import { 
  DollarSign, Users, Calendar, Search, Plus, FileText, 
  CheckCircle, AlertCircle, ChevronDown, Loader2, CreditCard, FileBarChart, ArrowLeft,
  Edit2, Trash2, X, ChevronRight, Wallet, ArrowUpRight
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import BackButton from '@/components/ui/back-button'

export default function TeacherFeesPage() {
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()
  const [loading, setLoading] = useState(true)
  const [classes, setClasses] = useState<any[]>([])
  const [selectedClass, setSelectedClass] = useState<string>('')
  const [academicYears, setAcademicYears] = useState<string[]>([])
  const [selectedYear, setSelectedYear] = useState<string>('')
  const [terms, setTerms] = useState<any[]>([])
  const [selectedTerm, setSelectedTerm] = useState<string>('')
  const [students, setStudents] = useState<any[]>([])
  const [feeStructures, setFeeStructures] = useState<any[]>([])
  const [payments, setPayments] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [selectedStudent, setSelectedStudent] = useState<any>(null)
  const [paymentForm, setPaymentForm] = useState({
    fee_structure_id: '',
    amount_paid: '',
    payment_method: 'Cash',
    remarks: ''
  })
  const [submitting, setSubmitting] = useState(false)
  const [isReadOnly, setIsReadOnly] = useState(false)
  const [editingPaymentId, setEditingPaymentId] = useState<string | null>(null)
  const [deletingPaymentId, setDeletingPaymentId] = useState<string | null>(null)

  useEffect(() => {
    loadInitialData()
  }, [])

  useEffect(() => {
    if (selectedClass && selectedYear && selectedTerm) {
      loadClassData(selectedClass, selectedYear, selectedTerm)
    }
  }, [selectedClass, selectedYear, selectedTerm])

  const loadInitialData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      if (profile?.role !== 'teacher' && profile?.role !== 'admin' && profile?.role !== 'head_teacher') {
        router.push('/login')
        return
      }

      const { data: teacherData } = await supabase
        .from('teachers')
        .select('status')
        .eq('profile_id', user.id)
        .single()

      const readOnly = teacherData?.status === 'on_leave' || teacherData?.status === 'on leave'
      setIsReadOnly(readOnly)

      let classesData: any[] = []

      if (profile.role === 'teacher') {
        const classAccess = await getTeacherClassAccess(user.id)
        classesData = classAccess
          .filter(c => c.is_class_teacher)
          .map(c => ({ id: c.class_id, name: c.class_name }))
      } else {
        const { data } = await supabase
          .from('classes')
          .select('id, name')
          .order('name')
        classesData = data || []
      }

      const { data: termsData } = await supabase
        .from('academic_terms')
        .select('id, name, academic_year, is_current')
        .order('start_date', { ascending: false })
      
      const uniqueYears = Array.from(new Set(termsData?.map((t: any) => t.academic_year) || [])) as string[]
      setAcademicYears(uniqueYears)
      setTerms(termsData || [])

      const currentTerm = termsData?.find((t: any) => t.is_current)

      if (currentTerm?.academic_year) {
        setSelectedYear(currentTerm.academic_year)
        setSelectedTerm(currentTerm.id)
      } else if (uniqueYears.length > 0) {
        setSelectedYear(uniqueYears[0])
        const firstTerm = termsData?.find((t: any) => t.academic_year === uniqueYears[0])
        if (firstTerm) setSelectedTerm(firstTerm.id)
      }

      setClasses(classesData)
      if (classesData.length > 0) {
        setSelectedClass(classesData[0].id)
      }
    } catch (error) {
      console.error('Error loading initial data:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadClassData = async (classId: string, year: string, termId: string) => {
    setLoading(true)
    try {
      const { data: studentsData } = await supabase
        .from('students')
        .select('id, first_name, last_name, middle_name, student_id, gender')
        .eq('class_id', classId)
        .order('last_name')

      setStudents(studentsData || [])

      const { data: feesData } = await supabase
        .from('fee_structures')
        .select(`
          id, amount, academic_year, term_id,
          fee_types (id, name, description)
        `)
        .eq('academic_year', year)
        .eq('term_id', termId)
        .or(`class_id.eq.${classId},class_id.is.null`)

      setFeeStructures(feesData || [])

      if (studentsData && studentsData.length > 0 && feesData && feesData.length > 0) {
        const studentIds = studentsData.map((s: any) => s.id)
        const feeIds = feesData.map((f: any) => f.id)

        const { data: paymentsData } = await supabase
          .from('fee_payments')
          .select(`
            *,
            profiles:recorded_by (full_name)
          `)
          .in('student_id', studentIds)
          .in('fee_structure_id', feeIds)
          .order('created_at', { ascending: false })

        setPayments(paymentsData || [])
      } else {
        setPayments([])
      }
    } catch (error) {
      console.error('Error loading class data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedStudent || !paymentForm.fee_structure_id || !paymentForm.amount_paid) return

    const amount = parseFloat(paymentForm.amount_paid)
    if (isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid amount')
      return
    }

    setSubmitting(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()

      if (editingPaymentId) {
        const { error } = await supabase
          .from('fee_payments')
          .update({
            fee_structure_id: paymentForm.fee_structure_id,
            amount_paid: amount,
            payment_method: paymentForm.payment_method,
            remarks: paymentForm.remarks
          })
          .eq('id', editingPaymentId)

        if (error) throw error
        toast.success('Payment updated successfully')
      } else {
        const { error } = await supabase
          .from('fee_payments')
          .insert({
            student_id: selectedStudent.id,
            fee_structure_id: paymentForm.fee_structure_id,
            amount_paid: amount,
            payment_method: paymentForm.payment_method,
            remarks: paymentForm.remarks,
            recorded_by: user?.id
          })

        if (error) throw error
        toast.success('Payment recorded successfully')
      }

      loadClassData(selectedClass, selectedYear, selectedTerm)
      if (editingPaymentId) {
        setEditingPaymentId(null)
      }
      
      setPaymentForm({
        fee_structure_id: '',
        amount_paid: '',
        payment_method: 'Cash',
        remarks: ''
      })
    } catch (error) {
      console.error('Error saving payment:', error)
      toast.error('Failed to save payment')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeletePayment = async (paymentId: string) => {
    if (!confirm('Are you sure you want to delete this payment record? This action cannot be undone.')) return

    setDeletingPaymentId(paymentId)
    try {
      const { data: checkPayment, error: checkError } = await supabase
        .from('fee_payments')
        .select('id')
        .eq('id', paymentId)
        .single()

      if (checkError || !checkPayment) {
        toast.error('Payment record not found or permission denied')
        return
      }

      const { error } = await supabase
        .from('fee_payments')
        .delete()
        .eq('id', paymentId)

      if (error) throw error

      toast.success('Payment deleted successfully')
      setPayments(prev => prev.filter(p => p.id !== paymentId))
      
      if (editingPaymentId === paymentId) {
        handleCancelEdit()
      }
    } catch (error) {
      console.error('Error deleting payment:', error)
      toast.error('Failed to delete payment')
    } finally {
      setDeletingPaymentId(null)
    }
  }

  const handleEditClick = (payment: any) => {
    setEditingPaymentId(payment.id)
    setPaymentForm({
      fee_structure_id: payment.fee_structure_id,
      amount_paid: payment.amount_paid.toString(),
      payment_method: payment.payment_method,
      remarks: payment.remarks || ''
    })
  }

  const handleCancelEdit = () => {
    setEditingPaymentId(null)
    setPaymentForm({
      fee_structure_id: '',
      amount_paid: '',
      payment_method: 'Cash',
      remarks: ''
    })
  }

  const getStudentPaymentStatus = (studentId: string, feeStructureId: string, totalAmount: number) => {
    const studentPayments = payments.filter(
      p => p.student_id === studentId && p.fee_structure_id === feeStructureId
    )
    const totalPaid = studentPayments.reduce((sum, p) => sum + (p.amount_paid || 0), 0)
    const balance = totalAmount - totalPaid
    
    return {
      paid: totalPaid,
      balance: balance,
      status: balance <= 0 ? 'Paid' : totalPaid > 0 ? 'Partial' : 'Unpaid'
    }
  }

  const getStudentOverallFinancials = (studentId: string) => {
    let totalExpected = 0
    let totalPaid = 0

    feeStructures.forEach(fee => {
      totalExpected += (fee.amount || 0)
      const stPayments = payments.filter(p => p.student_id === studentId && p.fee_structure_id === fee.id)
      totalPaid += stPayments.reduce((acc, p) => acc + (p.amount_paid || 0), 0)
    })

    const balance = totalExpected - totalPaid
    return {
      totalExpected,
      totalPaid,
      balance,
      status: balance <= 0 && totalExpected > 0 ? 'Paid' : totalPaid > 0 ? 'Partial' : 'Unpaid'
    }
  }

  const filteredStudents = useMemo(() => {
    return students.filter(s => 
      s.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.student_id.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [students, searchTerm])

  const totalExpectedAll = students.length * feeStructures.reduce((sum, f) => sum + (f.amount || 0), 0)
  const totalCollectedAll = payments.reduce((sum, p) => sum + (p.amount_paid || 0), 0)
  const totalOutstandingAll = totalExpectedAll - totalCollectedAll

  if (loading && classes.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-6 lg:p-8 space-y-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <Skeleton className="h-20 w-full rounded-2xl sm:rounded-3xl" />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-5">
            <Skeleton className="h-28 rounded-2xl" />
            <Skeleton className="h-28 rounded-2xl" />
            <Skeleton className="h-28 rounded-2xl" />
          </div>
          <Skeleton className="h-96 w-full rounded-2xl sm:rounded-3xl" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50/50 dark:bg-gray-900 pb-24 font-sans text-gray-900 dark:text-gray-100">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-7 space-y-5 sm:space-y-7">
        
        {/* Header Banner */}
        <div className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-2xl sm:rounded-3xl shadow-sm border border-gray-200/80 dark:border-gray-700 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3 sm:gap-4">
            <BackButton href="/teacher/dashboard" className="shrink-0 mt-0.5 sm:mt-0 shadow-sm" />
            <div>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
                <DollarSign className="w-6 h-6 text-[#003B5C] dark:text-blue-400 shrink-0" />
                <span>Class Fee Collection</span>
              </h1>
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 font-medium mt-0.5">
                Record and manage termly fee dues and payments
              </p>
            </div>
          </div>

          {/* Controls: Responsive Filter Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 md:flex items-center gap-2 sm:gap-2.5 w-full md:w-auto">
            <select
              value={selectedYear}
              onChange={(e) => {
                setSelectedYear(e.target.value)
                const termForYear = terms.find(t => t.academic_year === e.target.value)
                if (termForYear) setSelectedTerm(termForYear.id)
              }}
              className="px-3 py-2 text-xs font-bold rounded-xl bg-gray-50 dark:bg-gray-700/80 border border-gray-200 dark:border-gray-600 text-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-[#003B5C] cursor-pointer"
            >
              {academicYears.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>

            <select
              value={selectedTerm}
              onChange={(e) => setSelectedTerm(e.target.value)}
              disabled={!selectedYear}
              className="px-3 py-2 text-xs font-bold rounded-xl bg-gray-50 dark:bg-gray-700/80 border border-gray-200 dark:border-gray-600 text-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-[#003B5C] cursor-pointer disabled:opacity-50"
            >
              {terms.filter(t => t.academic_year === selectedYear).map(term => (
                <option key={term.id} value={term.id}>{term.name}</option>
              ))}
            </select>

            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="px-3 py-2 text-xs font-bold rounded-xl bg-gray-50 dark:bg-gray-700/80 border border-gray-200 dark:border-gray-600 text-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-[#003B5C] cursor-pointer"
            >
              {classes.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>

            {selectedClass && selectedYear && selectedTerm && (
              <Link 
                href={`/teacher/fees/statement?classId=${encodeURIComponent(selectedClass)}&academicYear=${encodeURIComponent(selectedYear)}&termId=${encodeURIComponent(selectedTerm)}`}
                className="col-span-2 sm:col-span-1"
              >
                <button className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-white dark:bg-gray-800 text-[#003B5C] dark:text-blue-300 border border-[#003B5C]/30 dark:border-blue-700 rounded-xl text-xs font-bold hover:bg-[#003B5C]/10 transition shadow-sm active:scale-95">
                  <FileBarChart className="h-3.5 w-3.5" />
                  <span>Statement</span>
                </button>
              </Link>
            )}
          </div>
        </div>

        {/* Read-Only Notice */}
        {isReadOnly && (
          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-2xl p-4 flex items-center space-x-3 text-amber-900 dark:text-amber-200 text-xs sm:text-sm">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
            <p>
              <strong className="font-bold">Read-Only Mode:</strong> Your status is marked as &ldquo;On Leave&rdquo;. You can review student balances but cannot log new collections.
            </p>
          </div>
        )}

        {/* Stats Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 md:gap-5">
          <div className="bg-white dark:bg-gray-800 p-4 sm:p-5 rounded-2xl shadow-sm border border-gray-200/80 dark:border-gray-700 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-gray-400">Total Expected</span>
              <div className="p-2 bg-blue-50 dark:bg-blue-950/50 text-[#003B5C] dark:text-blue-300 rounded-xl">
                <DollarSign className="w-4 h-4" />
              </div>
            </div>
            <p className="text-xl sm:text-2xl md:text-3xl font-black text-gray-900 dark:text-white tracking-tight">
              GH₵ {totalExpectedAll.toLocaleString()}
            </p>
            <p className="text-[11px] text-gray-400 mt-1">{students.length} students × {feeStructures.length} fee item{feeStructures.length !== 1 ? 's' : ''}</p>
          </div>

          <div className="bg-white dark:bg-gray-800 p-4 sm:p-5 rounded-2xl shadow-sm border border-gray-200/80 dark:border-gray-700 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-gray-400">Total Collected</span>
              <div className="p-2 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 rounded-xl">
                <CheckCircle className="w-4 h-4" />
              </div>
            </div>
            <p className="text-xl sm:text-2xl md:text-3xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight">
              GH₵ {totalCollectedAll.toLocaleString()}
            </p>
            <p className="text-[11px] text-gray-400 mt-1">{payments.length} transactions recorded</p>
          </div>

          <div className="bg-white dark:bg-gray-800 p-4 sm:p-5 rounded-2xl shadow-sm border border-gray-200/80 dark:border-gray-700 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-gray-400">Total Outstanding</span>
              <div className="p-2 bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 rounded-xl">
                <AlertCircle className="w-4 h-4" />
              </div>
            </div>
            <p className="text-xl sm:text-2xl md:text-3xl font-black text-rose-600 dark:text-rose-400 tracking-tight">
              GH₵ {totalOutstandingAll.toLocaleString()}
            </p>
            <p className="text-[11px] text-gray-400 mt-1">
              {totalExpectedAll > 0 ? `${((totalOutstandingAll / totalExpectedAll) * 100).toFixed(1)}% remaining` : 'No dues set'}
            </p>
          </div>
        </div>

        {/* Content Card */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl sm:rounded-3xl shadow-sm border border-gray-200/80 dark:border-gray-700 overflow-hidden">
          
          {/* Search Bar */}
          <div className="p-3.5 sm:p-5 border-b border-gray-100 dark:border-gray-700 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-gray-50/50 dark:bg-gray-850">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search student by name or ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-[#003B5C]"
              />
            </div>
            <span className="text-xs text-gray-400 self-end sm:self-auto font-medium">
              Showing {filteredStudents.length} of {students.length} students
            </span>
          </div>

          {/* MOBILE CARD VIEW (< md) */}
          <div className="block md:hidden divide-y divide-gray-100 dark:divide-gray-750">
            {filteredStudents.length === 0 ? (
              <div className="p-8 text-center text-xs text-gray-400">
                No matching students found
              </div>
            ) : (
              filteredStudents.map((student) => {
                const overall = getStudentOverallFinancials(student.id)
                return (
                  <div key={student.id} className="p-4 space-y-3 hover:bg-gray-50/50 dark:hover:bg-gray-750/50 transition">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="font-bold text-sm text-gray-900 dark:text-white">
                          {student.last_name} {student.first_name} {student.middle_name || ''}
                        </h4>
                        <p className="text-[11px] text-gray-400 font-mono mt-0.5">{student.student_id}</p>
                      </div>

                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                        overall.status === 'Paid'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : overall.status === 'Partial'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}>
                        {overall.status}
                      </span>
                    </div>

                    {/* Dues Breakdown Pill Matrix */}
                    <div className="space-y-1.5 bg-gray-50/80 dark:bg-gray-900/40 p-2.5 rounded-xl border border-gray-100 dark:border-gray-800 text-xs">
                      {feeStructures.map(fee => {
                        const status = getStudentPaymentStatus(student.id, fee.id, fee.amount)
                        return (
                          <div key={fee.id} className="flex items-center justify-between py-1 border-b border-gray-200/50 dark:border-gray-800 last:border-0">
                            <span className="text-gray-600 dark:text-gray-300 font-medium truncate pr-2">
                              {fee.fee_types?.name}
                            </span>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className="font-bold text-gray-900 dark:text-white">
                                GH₵ {status.paid} <span className="text-[10px] text-gray-400 font-normal">/ {fee.amount}</span>
                              </span>
                              <span className={`w-2 h-2 rounded-full ${
                                status.status === 'Paid' ? 'bg-emerald-500' : status.status === 'Partial' ? 'bg-amber-500' : 'bg-rose-500'
                              }`} />
                            </div>
                          </div>
                        )
                      })}
                    </div>

                    {/* Bottom Action Row */}
                    <div className="flex items-center justify-between pt-1">
                      <div className="text-xs">
                        <span className="text-gray-400 font-medium">Bal: </span>
                        <span className={`font-black ${overall.balance > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600'}`}>
                          GH₵ {overall.balance}
                        </span>
                      </div>

                      <button
                        onClick={() => {
                          if (!isReadOnly) {
                            setSelectedStudent(student)
                            setShowPaymentModal(true)
                          }
                        }}
                        disabled={isReadOnly}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#003B5C] hover:bg-[#002a42] text-white rounded-xl text-xs font-bold transition shadow-sm active:scale-95 disabled:opacity-50"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Manage Payment</span>
                      </button>
                    </div>
                  </div>
                )
              })
            )}
          </div>

          {/* DESKTOP & TABLET TABLE VIEW (≥ md) */}
          <div className="hidden md:block overflow-x-auto relative">
            <table className="w-full text-left border-collapse min-w-[720px]">
              <thead className="bg-gray-50/80 dark:bg-gray-900/60 border-b border-gray-200 dark:border-gray-700 text-[11px] font-black text-gray-400 uppercase tracking-wider">
                <tr>
                  <th className="px-4 lg:px-6 py-4 sticky left-0 bg-gray-50/95 dark:bg-gray-900/95 z-20 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] w-56">
                    Student
                  </th>
                  {feeStructures.map(fee => (
                    <th key={fee.id} className="px-4 py-4 text-center">
                      <p className="truncate text-gray-800 dark:text-gray-200">{fee.fee_types?.name}</p>
                      <span className="text-[10px] text-gray-400 font-mono font-normal">GH₵ {fee.amount}</span>
                    </th>
                  ))}
                  <th className="px-4 lg:px-6 py-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-750 text-xs sm:text-sm font-medium">
                {filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan={feeStructures.length + 2} className="px-6 py-12 text-center text-xs text-gray-400">
                      No students found in this class cohort
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map(student => (
                    <tr key={student.id} className="hover:bg-gray-50/60 dark:hover:bg-gray-750/50 transition">
                      <td className="px-4 lg:px-6 py-3.5 sticky left-0 bg-white dark:bg-gray-800 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                        <div className="font-bold text-gray-900 dark:text-white">
                          {student.last_name} {student.first_name}
                        </div>
                        <div className="text-[11px] text-gray-400 font-mono">{student.student_id}</div>
                      </td>

                      {feeStructures.map(fee => {
                        const status = getStudentPaymentStatus(student.id, fee.id, fee.amount)
                        return (
                          <td key={fee.id} className="px-4 py-3.5 text-center whitespace-nowrap">
                            <div className="flex flex-col items-center">
                              <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                                status.status === 'Paid'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : status.status === 'Partial'
                                  ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                  : 'bg-rose-50 text-rose-700 border border-rose-200'
                              }`}>
                                {status.status}
                              </span>
                              <span className="text-[11px] text-gray-400 mt-1 font-mono">
                                Paid: {status.paid} / Bal: {status.balance}
                              </span>
                            </div>
                          </td>
                        )
                      })}

                      <td className="px-4 lg:px-6 py-3.5 text-right whitespace-nowrap">
                        <button
                          onClick={() => {
                            if (!isReadOnly) {
                              setSelectedStudent(student)
                              setShowPaymentModal(true)
                            }
                          }}
                          disabled={isReadOnly}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-[#003B5C] dark:text-blue-300 hover:bg-[#003B5C]/10 rounded-xl text-xs font-bold transition disabled:opacity-50"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Payment</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* Payment Modal: Bottom Sheet on Mobile, Centered on Tablet/Desktop */}
      {showPaymentModal && selectedStudent && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-gray-800 rounded-t-3xl sm:rounded-3xl max-w-2xl w-full shadow-2xl max-h-[92vh] sm:max-h-[88vh] flex flex-col overflow-hidden border-t sm:border border-gray-200 dark:border-gray-700">
            
            {/* Modal Header */}
            <div className="p-4 sm:p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50/70 dark:bg-gray-850 shrink-0">
              <div className="min-w-0">
                <h3 className="text-base sm:text-lg font-black text-gray-900 dark:text-white truncate">
                  Manage Fees: {selectedStudent.last_name} {selectedStudent.first_name}
                </h3>
                <p className="text-xs text-gray-400 font-mono mt-0.5">{selectedStudent.student_id}</p>
              </div>
              <button
                onClick={() => {
                  setShowPaymentModal(false)
                  handleCancelEdit()
                }}
                className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full text-gray-400 hover:text-gray-700 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 space-y-6">
              
              {/* Payment Entry Form */}
              <div className="p-4 sm:p-5 rounded-2xl bg-gray-50/80 dark:bg-gray-900/40 border border-gray-200/80 dark:border-gray-700 space-y-3.5">
                <h4 className="text-xs font-black uppercase tracking-wider text-[#003B5C] dark:text-blue-400 flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  <span>{editingPaymentId ? 'Edit Payment Record' : 'Record New Collection'}</span>
                </h4>

                <form onSubmit={handlePaymentSubmit} className="space-y-3.5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1">Fee Item</label>
                      <select
                        required
                        value={paymentForm.fee_structure_id}
                        onChange={(e) => setPaymentForm({ ...paymentForm, fee_structure_id: e.target.value })}
                        className="w-full px-3 py-2 text-xs sm:text-sm border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-[#003B5C] font-semibold"
                      >
                        <option value="">Choose Fee</option>
                        {feeStructures.map(fee => {
                          const status = getStudentPaymentStatus(selectedStudent.id, fee.id, fee.amount)
                          return (
                            <option key={fee.id} value={fee.id}>
                              {fee.fee_types?.name} (GH₵{fee.amount}) {status.balance > 0 ? `- Due: GH₵${status.balance}` : '- Paid'}
                            </option>
                          )
                        })}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1">Amount Paid (GH₵)</label>
                      <input
                        type="number"
                        step="0.01"
                        required
                        placeholder="0.00"
                        value={paymentForm.amount_paid}
                        onChange={(e) => setPaymentForm({ ...paymentForm, amount_paid: e.target.value })}
                        className="w-full px-3 py-2 text-xs sm:text-sm border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-[#003B5C] font-bold font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1">Channel / Method</label>
                      <select
                        value={paymentForm.payment_method}
                        onChange={(e) => setPaymentForm({ ...paymentForm, payment_method: e.target.value })}
                        className="w-full px-3 py-2 text-xs sm:text-sm border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-[#003B5C] font-semibold"
                      >
                        <option value="Cash">Cash</option>
                        <option value="Mobile Money">Mobile Money (MoMo)</option>
                        <option value="Bank Deposit">Bank Deposit</option>
                        <option value="Cheque">Cheque</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1">Remarks (Optional)</label>
                      <input
                        type="text"
                        placeholder="Receipt # / Note"
                        value={paymentForm.remarks}
                        onChange={(e) => setPaymentForm({ ...paymentForm, remarks: e.target.value })}
                        className="w-full px-3 py-2 text-xs sm:text-sm border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-[#003B5C]"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-1">
                    {editingPaymentId && (
                      <button
                        type="button"
                        onClick={handleCancelEdit}
                        className="px-4 py-2 text-xs font-bold text-gray-600 dark:text-gray-300 bg-gray-200 dark:bg-gray-700 rounded-xl hover:bg-gray-300"
                      >
                        Cancel Edit
                      </button>
                    )}
                    <button
                      type="submit"
                      disabled={submitting}
                      className="px-5 py-2 bg-[#003B5C] hover:bg-[#002a42] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm active:scale-95 disabled:opacity-50"
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Saving...</span>
                        </>
                      ) : (
                        <span>{editingPaymentId ? 'Update Record' : 'Save Payment'}</span>
                      )}
                    </button>
                  </div>
                </form>
              </div>

              {/* Payment History List */}
              <div className="space-y-3">
                <h4 className="text-xs font-black uppercase tracking-wider text-gray-400 flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  <span>Payment History</span>
                </h4>

                {payments.filter(p => p.student_id === selectedStudent.id).length === 0 ? (
                  <p className="text-xs text-gray-400 py-6 text-center italic">No prior payments logged for this student</p>
                ) : (
                  <div className="divide-y divide-gray-100 dark:divide-gray-750 border border-gray-200/70 dark:border-gray-700 rounded-2xl overflow-hidden">
                    {payments
                      .filter(p => p.student_id === selectedStudent.id)
                      .map((payment) => {
                        const feeType = feeStructures.find(f => f.id === payment.fee_structure_id)?.fee_types?.name || 'Fee'
                        return (
                          <div key={payment.id} className="p-3.5 sm:p-4 flex items-center justify-between gap-3 text-xs bg-white dark:bg-gray-800">
                            <div className="min-w-0">
                              <p className="font-bold text-gray-900 dark:text-white truncate">{feeType}</p>
                              <p className="text-[11px] text-gray-400 font-mono mt-0.5">
                                {payment.payment_date ? format(new Date(payment.payment_date), 'dd MMM yyyy') : '-'} • {payment.payment_method}
                              </p>
                              {payment.remarks && <p className="text-[10px] text-gray-500 italic mt-0.5">{payment.remarks}</p>}
                            </div>

                            <div className="flex items-center gap-3 shrink-0">
                              <span className="font-black text-emerald-600 dark:text-emerald-400 text-sm font-mono">
                                GH₵ {payment.amount_paid}
                              </span>

                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => handleEditClick(payment)}
                                  disabled={deletingPaymentId === payment.id || isReadOnly}
                                  className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg transition disabled:opacity-50"
                                  title="Edit payment"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDeletePayment(payment.id)}
                                  disabled={deletingPaymentId === payment.id || isReadOnly}
                                  className="p-1.5 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition disabled:opacity-50"
                                  title="Delete payment"
                                >
                                  {deletingPaymentId === payment.id ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  ) : (
                                    <Trash2 className="w-3.5 h-3.5" />
                                  )}
                                </button>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                  </div>
                )}
              </div>

            </div>

            {/* Modal Footer */}
            <div className="p-3.5 sm:p-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50/70 dark:bg-gray-850 flex justify-end shrink-0">
              <button
                onClick={() => {
                  setShowPaymentModal(false)
                  handleCancelEdit()
                }}
                className="w-full sm:w-auto px-5 py-2 text-xs font-bold text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-700 rounded-xl hover:bg-gray-300"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  )
}