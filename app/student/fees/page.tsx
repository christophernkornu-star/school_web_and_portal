'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useStudent } from '@/components/providers/StudentContext'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'
import { DollarSign, CheckCircle, AlertCircle, FileText, Calendar, CreditCard, GraduationCap } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import BackButton from '@/components/ui/back-button'

interface FeeStructure {
  id: string
  amount: number
  academic_year: string
  term_id: string
  fee_types: { id: string; name: string; description?: string } | null
}

interface FeePayment {
  id: string
  fee_structure_id: string
  amount_paid: number
  payment_date: string
  payment_method: string
  remarks: string | null
  created_at: string
}

interface AcademicTerm {
  id: string
  name: string
  academic_year: string
  is_current: boolean
}

export default function StudentFeesPage() {
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()
  const { student, loading: contextLoading } = useStudent()

  const [loading, setLoading] = useState(true)
  const [feeStructures, setFeeStructures] = useState<FeeStructure[]>([])
  const [payments, setPayments] = useState<FeePayment[]>([])
  const [selectedTerm, setSelectedTerm] = useState<string>('')
  const [terms, setTerms] = useState<AcademicTerm[]>([])
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  useEffect(() => {
    if (contextLoading) return
    if (!student) {
      router.push('/login?portal=student')
      return
    }
    loadFeeData()
  }, [student, contextLoading])

  const loadFeeData = async () => {
    try {
      setLoading(true)
      setErrorMsg(null)

      // 1. Get the currently authenticated user directly
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) {
        console.error('Auth error:', authError)
        router.push('/login?portal=student')
        return
      }

      // 2. Look up the student record ourselves using profile_id
      const { data: studentRecord, error: studentError } = await supabase
        .from('students')
        .select('id, student_id, first_name, last_name, class_id, classes(id, name)')
        .eq('profile_id', user.id)
        .maybeSingle()

      if (studentError) {
        console.error('Error fetching student record:', studentError)
        setErrorMsg('Could not load student data.')
        return
      }

      if (!studentRecord) {
        console.error('No student record found for profile:', user.id)
        setErrorMsg('No student record linked to your account.')
        return
      }

      console.log('✅ Student found:', studentRecord.id, studentRecord.first_name, studentRecord.last_name)

      // 3. Fetch academic terms
      const { data: termsData, error: termsError } = await supabase
        .from('academic_terms')
        .select('id, name, academic_year, is_current')
        .order('start_date', { ascending: false })

      if (termsError) {
        console.error('Error fetching terms:', termsError)
        return
      }

      const termsList = termsData || []
      setTerms(termsList)

      const current = termsList.find((t: AcademicTerm) => t.is_current)
      if (current) {
        setSelectedTerm(current.id)
      } else if (termsList.length > 0) {
        setSelectedTerm(termsList[0].id)
      }

      // 4. Fetch fee structures for this student's class
      const { data: feesData, error: feesError } = await supabase
        .from('fee_structures')
        .select(`id, amount, academic_year, term_id, fee_types(id, name, description)`)
        .or(`class_id.eq.${studentRecord.class_id},class_id.is.null`)
        .order('created_at', { ascending: false })

      if (feesError) {
        console.error('Error fetching fee structures:', feesError)
      } else {
        console.log(`Found ${feesData?.length || 0} fee structures`)
        setFeeStructures(feesData || [])
      }

      // 5. Fetch ALL fee payments for this student (direct lookup by student UUID)
      console.log('Fetching payments for student_id:', studentRecord.id)
      const { data: paymentsData, error: paymentsError } = await supabase
        .from('fee_payments')
        .select('id, fee_structure_id, amount_paid, payment_date, payment_method, remarks, created_at')
        .eq('student_id', studentRecord.id)
        .order('created_at', { ascending: false })

      if (paymentsError) {
        console.error('❌ Error fetching fee payments:', paymentsError)
        setErrorMsg(`Error loading payments: ${paymentsError.message}`)
      } else {
        console.log(`Found ${paymentsData?.length || 0} payments for student`)
        if (paymentsData && paymentsData.length > 0) {

          paymentsData.forEach((p: FeePayment) => console.log('  - Payment:', p.id, p.amount_paid, p.payment_date, p.fee_structure_id))
        } else {
          console.log('⚠️ No payments found. Check if student_id in fee_payments table matches:', studentRecord.id)
          // Try a broader query to see if there are any payments at all
          const { data: allPayments, error: allError } = await supabase
            .from('fee_payments')
            .select('id, student_id, amount_paid')
            .limit(5)
          if (allError) {
            console.error('❌ Even broad query failed:', allError)
          } else {
            console.log('All payments sample:', allPayments)
          }
        }
        setPayments(paymentsData || [])
      }

    } catch (error) {
      console.error('Error loading fee data:', error)
      setErrorMsg('An unexpected error occurred.')
    } finally {
      setLoading(false)
    }
  }

  // Fee structures for the selected term
  const filteredFees = feeStructures.filter(f => f.term_id === selectedTerm)
  const totalBill = filteredFees.reduce((sum, f) => sum + Number(f.amount), 0)

  // Get fee structure IDs for the selected term to filter payments by term
  const selectedTermFeeIds = filteredFees.map(f => f.id)
  
  // Filter payments to only those matching the selected term's fee structures
  const filteredPayments = payments.filter(p => selectedTermFeeIds.includes(p.fee_structure_id))
  const totalPaid = filteredPayments.reduce((sum, p) => sum + Number(p.amount_paid), 0)
  const balance = totalBill - totalPaid

  const selectedTermName = terms.find(t => t.id === selectedTerm)

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-8">
        <div className="max-w-6xl mx-auto space-y-8">
          <Skeleton className="h-8 w-32" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Skeleton className="h-36 w-full rounded-3xl" />
            <Skeleton className="h-36 w-full rounded-3xl" />
            <Skeleton className="h-36 w-full rounded-3xl" />
          </div>
          <Skeleton className="h-64 w-full rounded-3xl" />
        </div>
      </div>
    )
  }

  const statusText = balance <= 0 ? 'Fully Paid' : totalPaid > 0 ? 'Partial Payment' : 'Unpaid'
  const statusBg = balance <= 0 ? 'bg-green-100 text-green-800' : totalPaid > 0 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <BackButton className="mb-4" />
          <h1 className="text-xl md:text-2xl lg:text-3xl font-bold text-blue-700 dark:text-blue-400 flex items-center gap-3">
            <DollarSign className="w-7 h-7 md:w-8 md:h-8" />
            Fee Payments
          </h1>
          <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400 mt-2">View your fee status and payment history</p>
        </div>

        {/* Error Message */}
        {errorMsg && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-4 mb-6">
            <p className="text-red-700 dark:text-red-300 text-sm">{errorMsg}</p>
          </div>
        )}

        {/* Student Info & Term Filter */}
        <div className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm shadow-sm border border-gray-100 dark:border-gray-800 rounded-3xl p-4 md:p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 flex-1">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 dark:bg-blue-900/40 rounded-lg">
                  <DollarSign className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Student</p>
                  <p className="font-bold text-gray-800 dark:text-white text-sm">{student?.first_name} {student?.last_name}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 dark:bg-blue-900/40 rounded-lg">
                  <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Student ID</p>
                  <p className="font-bold text-gray-800 dark:text-white font-mono text-sm">{student?.student_id}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 dark:bg-blue-900/40 rounded-lg">
                  <GraduationCap className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Class</p>
                  <p className="font-bold text-gray-800 dark:text-white text-sm">{student?.classes?.name}</p>
                </div>
              </div>
            </div>
            <select
              value={selectedTerm}
              onChange={(e) => setSelectedTerm(e.target.value)}
              className="w-full md:w-auto px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 shadow-sm focus:ring-2 focus:ring-blue-500 outline-none text-sm font-semibold dark:text-white cursor-pointer"
            >
              {terms.map(term => (
                <option key={term.id} value={term.id}>
                  {term.name} - {term.academic_year} {term.is_current ? '(Current)' : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Fee Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-8">
          <div className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm shadow-sm border border-gray-100 dark:border-gray-800 rounded-3xl p-6">
            <div className="flex items-center justify-between mb-3">
              <p className="text-gray-600 dark:text-gray-400 text-xs font-semibold uppercase tracking-wider">Total Bill</p>
              <div className="p-2 bg-blue-50 dark:bg-blue-900/40 rounded-lg">
                <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
            <p className="text-2xl md:text-3xl font-black text-gray-800 dark:text-white">
              GH₵ {totalBill.toFixed(2)}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              {selectedTermName ? `${selectedTermName.name}` : 'Selected term'}
            </p>
          </div>

          <div className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm shadow-sm border border-gray-100 dark:border-gray-800 rounded-3xl p-6">
            <div className="flex items-center justify-between mb-3">
              <p className="text-gray-600 dark:text-gray-400 text-xs font-semibold uppercase tracking-wider">Amount Paid</p>
              <div className="p-2 bg-green-50 dark:bg-green-900/40 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
            </div>
            <p className="text-2xl md:text-3xl font-black text-green-600 dark:text-green-400">
              GH₵ {totalPaid.toFixed(2)}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              {filteredPayments.length} payment{filteredPayments.length !== 1 ? 's' : ''} for this term
            </p>
          </div>

          <div className={`bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm shadow-sm border rounded-3xl p-6 ${
            balance <= 0 ? 'border-green-100 dark:border-green-800' : 'border-red-100 dark:border-red-800'
          }`}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-gray-600 dark:text-gray-400 text-xs font-semibold uppercase tracking-wider">Outstanding</p>
              <div className={`p-2 rounded-lg ${
                balance <= 0 ? 'bg-green-50 dark:bg-green-900/40' : 'bg-red-50 dark:bg-red-900/40'
              }`}>
                <AlertCircle className={`w-5 h-5 ${
                  balance <= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                }`} />
              </div>
            </div>
            <p className={`text-2xl md:text-3xl font-black ${
              balance <= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
            }`}>
              GH₵ {Math.max(0, balance).toFixed(2)}
            </p>
            <div className="mt-2">
              <span className={`px-3 py-1 rounded-full text-xs font-bold ${statusBg}`}>
                {statusText}
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-2">
              {selectedTermName ? `for ${selectedTermName.name}` : ''}
            </p>
          </div>
        </div>

        {/* Fee Breakdown (filtered by selected term) */}
        {filteredFees.length === 0 ? (
          <div className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm shadow-sm border border-gray-100 dark:border-gray-800 rounded-3xl p-12 text-center">
            <div className="bg-gray-50 dark:bg-gray-800 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <DollarSign className="w-8 h-8 text-gray-300 dark:text-gray-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-1">No Fees Set for This Term</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">Fee structures have not been set for {selectedTermName?.name || 'this term'} yet.</p>
          </div>
        ) : (
          <div className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm shadow-sm border border-gray-100 dark:border-gray-800 rounded-3xl overflow-hidden mb-8">
            <div className="p-4 md:p-6 border-b border-gray-100 dark:border-gray-800">
              <h2 className="text-lg md:text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                Fee Breakdown
                <span className="ml-2 text-sm font-normal text-gray-400">({filteredFees.length} item{filteredFees.length > 1 ? 's' : ''})</span>
              </h2>
            </div>
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {filteredFees.map(fee => {
                const feePayments = payments.filter(p => p.fee_structure_id === fee.id)
                const feePaid = feePayments.reduce((sum, p) => sum + Number(p.amount_paid), 0)
                const feeBalance = Number(fee.amount) - feePaid

                return (
                  <div key={fee.id} className="p-4 md:p-6 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-lg ${
                          feeBalance <= 0 ? 'bg-green-50 dark:bg-green-900/40' :
                          feePaid > 0 ? 'bg-yellow-50 dark:bg-yellow-900/40' :
                          'bg-red-50 dark:bg-red-900/40'
                        }`}>
                          <DollarSign className={`w-5 h-5 ${
                            feeBalance <= 0 ? 'text-green-600 dark:text-green-400' :
                            feePaid > 0 ? 'text-yellow-600 dark:text-yellow-400' :
                            'text-red-600 dark:text-red-400'
                          }`} />
                        </div>
                        <div>
                          <h4 className="font-bold text-gray-800 dark:text-white">{fee.fee_types?.name || 'Fee'}</h4>
                          <p className="text-xs text-gray-400 dark:text-gray-500">Amount: GH₵ {Number(fee.amount).toFixed(2)}</p>
                        </div>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap ${
                        feeBalance <= 0 ? 'bg-green-100 text-green-700 dark:bg-green-900/60 dark:text-green-300' :
                        feePaid > 0 ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/60 dark:text-yellow-300' :
                        'bg-red-100 text-red-700 dark:bg-red-900/60 dark:text-red-300'
                      }`}>
                        {feeBalance <= 0 ? 'Paid' : feePaid > 0 ? 'Partial' : 'Unpaid'}
                      </span>
                    </div>
                    <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2 mb-2">
                      <div 
                        className={`h-2 rounded-full transition-all duration-500 ${
                          feeBalance <= 0 ? 'bg-green-500' : feePaid > 0 ? 'bg-yellow-500' : 'bg-red-300'
                        }`}
                        style={{ width: `${Math.min(100, (feePaid / Number(fee.amount)) * 100)}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500 dark:text-gray-400">Paid: <strong className="text-green-600 dark:text-green-400">GH₵ {feePaid.toFixed(2)}</strong></span>
                      <span className="text-gray-500 dark:text-gray-400">Balance: <strong className={feeBalance > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}>GH₵ {Math.max(0, feeBalance).toFixed(2)}</strong></span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Payment History - filtered by selected term */}
        {filteredPayments.length > 0 && (
          <div className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm shadow-sm border border-gray-100 dark:border-gray-800 rounded-3xl overflow-hidden">
            <div className="p-4 md:p-6 border-b border-gray-100 dark:border-gray-800">
              <h2 className="text-lg md:text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                Payment History
                <span className="ml-2 text-sm font-normal text-gray-400">({filteredPayments.length} payment{filteredPayments.length > 1 ? 's' : ''} for {selectedTermName?.name || 'this term'})</span>
              </h2>
            </div>
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {filteredPayments.map(payment => {
                const feeName = feeStructures.find(f => f.id === payment.fee_structure_id)?.fee_types?.name || 'Fee'
                return (
                  <div key={payment.id} className="p-4 md:p-6 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-green-50 dark:bg-green-900/40 rounded-lg">
                        <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-800 dark:text-white">{feeName}</p>
                        <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(payment.payment_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </span>
                          <span className="text-gray-300 dark:text-gray-600">|</span>
                          <span>{payment.payment_method}</span>
                          {payment.remarks && (
                            <>
                              <span className="text-gray-300 dark:text-gray-600">|</span>
                              <span className="italic">{payment.remarks}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <p className="text-sm font-bold text-green-600 dark:text-green-400">GH₵ {Number(payment.amount_paid).toFixed(2)}</p>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Empty state when no payments for this term and no fees set */}
        {filteredPayments.length === 0 && filteredFees.length === 0 && !errorMsg && (
          <div className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm shadow-sm border border-gray-100 dark:border-gray-800 rounded-3xl p-12 text-center">
            <div className="bg-gray-50 dark:bg-gray-800 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <CreditCard className="w-8 h-8 text-gray-300 dark:text-gray-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-1">No Payment Records</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">No fee structures or payment records found for your account.</p>
          </div>
        )}
      </div>
    </div>
  )
}
