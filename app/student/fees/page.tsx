'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useStudent } from '@/components/providers/StudentContext'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'
import { 
  DollarSign, 
  CheckCircle2, 
  AlertCircle, 
  FileText, 
  Calendar, 
  CreditCard, 
  GraduationCap, 
  ChevronDown,
  Receipt,
  Clock,
  ArrowRight,
  TrendingUp,
  ShieldCheck
} from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import BackButton from '@/components/ui/back-button'
import { PortalFooter } from '@/components/PortalFooter'

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

      // 1. Authenticate user
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) {
        router.push('/login?portal=student')
        return
      }

      // 2. Fetch student record with profile reference
      const { data: studentRecord, error: studentError } = await supabase
        .from('students')
        .select('id, student_id, first_name, last_name, class_id, classes(id, name)')
        .eq('profile_id', user.id)
        .maybeSingle()

      if (studentError || !studentRecord) {
        setErrorMsg('Could not load student fee records.')
        return
      }

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

      // 4. Fetch fee structures for this cohort
      const { data: feesData, error: feesError } = await supabase
        .from('fee_structures')
        .select(`id, amount, academic_year, term_id, fee_types(id, name, description)`)
        .or(`class_id.eq.${studentRecord.class_id},class_id.is.null`)
        .order('created_at', { ascending: false })

      if (feesError) {
        console.error('Error fetching fee structures:', feesError)
      } else {
        setFeeStructures(feesData || [])
      }

      // 5. Fetch student's payment receipts
      const { data: paymentsData, error: paymentsError } = await supabase
        .from('fee_payments')
        .select('id, fee_structure_id, amount_paid, payment_date, payment_method, remarks, created_at')
        .eq('student_id', studentRecord.id)
        .order('created_at', { ascending: false })

      if (paymentsError) {
        setErrorMsg(`Error loading payments: ${paymentsError.message}`)
      } else {
        setPayments(paymentsData || [])
      }

    } catch (error) {
      console.error('Error loading fee data:', error)
      setErrorMsg('An unexpected error occurred while loading your fee records.')
    } finally {
      setLoading(false)
    }
  }

  // Active term calculations
  const filteredFees = useMemo(() => {
    return feeStructures.filter(f => f.term_id === selectedTerm)
  }, [feeStructures, selectedTerm])

  const totalBill = useMemo(() => {
    return filteredFees.reduce((sum, f) => sum + Number(f.amount || 0), 0)
  }, [filteredFees])

  const selectedTermFeeIds = useMemo(() => {
    return filteredFees.map(f => f.id)
  }, [filteredFees])

  const filteredPayments = useMemo(() => {
    return payments.filter(p => selectedTermFeeIds.includes(p.fee_structure_id))
  }, [payments, selectedTermFeeIds])

  const totalPaid = useMemo(() => {
    return filteredPayments.reduce((sum, p) => sum + Number(p.amount_paid || 0), 0)
  }, [filteredPayments])

  const balance = totalBill - totalPaid
  const selectedTermName = terms.find(t => t.id === selectedTerm)

  if (loading) {
    return <FeesSkeleton />
  }

  const isFullyPaid = balance <= 0 && totalBill > 0
  const isPartiallyPaid = totalPaid > 0 && balance > 0
  const statusText = totalBill === 0 ? 'No Bill' : isFullyPaid ? 'Settled' : isPartiallyPaid ? 'Part Payment' : 'Outstanding'
  const statusBadge = totalBill === 0 
    ? 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
    : isFullyPaid 
    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-900/50'
    : isPartiallyPaid
    ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-900/50'
    : 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-900/50'

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-900 font-sans text-slate-900 dark:text-slate-100 flex flex-col transition-colors selection:bg-[#003B5C] selection:text-white">
      
      {/* Sticky Header */}
      <header className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div className="max-w-6xl mx-auto px-3.5 sm:px-6 lg:px-8 py-3.5 sm:py-4">
          <div className="flex items-center justify-between gap-3">
            
            <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
              <BackButton href="/student/dashboard" />
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-4 bg-amber-400 rounded-full shrink-0" />
                  <h1 className="text-base sm:text-xl font-black text-slate-900 dark:text-white tracking-tight truncate">
                    School Fees &amp; Billing
                  </h1>
                </div>
                <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium truncate mt-0.5">
                  Term bill structures, payment transactions, and balance statement
                </p>
              </div>
            </div>

            <div className="hidden sm:inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200/70 dark:border-blue-900/50 text-[#003B5C] dark:text-blue-300 text-xs font-bold shrink-0 font-mono">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <span>Verified Ledger</span>
            </div>

          </div>
        </div>
      </header>

      {/* Main Workspace */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-3.5 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8 space-y-4 sm:space-y-6">
        
        {/* Error Notification */}
        {errorMsg && (
          <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200/80 dark:border-rose-900/50 rounded-2xl p-4 flex items-start gap-3 text-xs text-rose-900 dark:text-rose-200 shadow-2xs">
            <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
            <p className="leading-relaxed">{errorMsg}</p>
          </div>
        )}

        {/* Learner Info & Term Selector Strip */}
        <section className="bg-white dark:bg-slate-800/90 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-700/80 p-3.5 sm:p-5 shadow-xs">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            
            {/* Student Details Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 flex-1">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#003B5C]/10 text-[#003B5C] dark:bg-blue-500/20 dark:text-blue-300 flex items-center justify-center shrink-0">
                  <DollarSign className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block truncate">
                    Learner Name
                  </span>
                  <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                    {student?.first_name} {student?.last_name}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#003B5C]/10 text-[#003B5C] dark:bg-blue-500/20 dark:text-blue-300 flex items-center justify-center shrink-0">
                  <FileText className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block truncate">
                    Student ID
                  </span>
                  <p className="text-xs sm:text-sm font-bold font-mono text-slate-900 dark:text-white truncate">
                    {student?.student_id || '---'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#003B5C]/10 text-[#003B5C] dark:bg-blue-500/20 dark:text-blue-300 flex items-center justify-center shrink-0">
                  <GraduationCap className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block truncate">
                    Cohort
                  </span>
                  <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                    {student?.classes?.name || 'Class Cohort'}
                  </p>
                </div>
              </div>
            </div>

            {/* Term Dropdown Selector */}
            <div className="w-full md:w-60 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100 dark:border-slate-800">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                Select Academic Period
              </label>
              <div className="relative">
                <select
                  value={selectedTerm}
                  onChange={(e) => setSelectedTerm(e.target.value)}
                  className="w-full appearance-none bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs font-bold py-2 sm:py-2.5 pl-3 pr-8 rounded-xl outline-none focus:ring-2 focus:ring-[#003B5C] cursor-pointer transition truncate"
                >
                  {terms.map(term => (
                    <option key={term.id} value={term.id}>
                      {term.name} ({term.academic_year}) {term.is_current ? '• Active' : ''}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>
            </div>

          </div>
        </section>

        {/* 3-Column Financial Status Cards */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3.5 md:gap-4">
          
          {/* Total Bill Card */}
          <div className="bg-white dark:bg-slate-800/90 rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-700/80 shadow-xs flex flex-col justify-between space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-400 block">
                Total Bill
              </span>
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#003B5C] dark:bg-blue-950/40 dark:text-blue-300 flex items-center justify-center shrink-0">
                <FileText className="w-4 h-4" />
              </div>
            </div>
            <div>
              <p className="text-xl sm:text-2xl md:text-3xl font-black font-mono text-slate-900 dark:text-white">
                GH₵ {totalBill.toFixed(2)}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5 truncate">
                {selectedTermName ? `${selectedTermName.name} (${selectedTermName.academic_year})` : 'Selected Term'}
              </p>
            </div>
          </div>

          {/* Amount Paid Card */}
          <div className="bg-white dark:bg-slate-800/90 rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-700/80 shadow-xs flex flex-col justify-between space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-400 block">
                Total Paid
              </span>
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-300 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div>
              <p className="text-xl sm:text-2xl md:text-3xl font-black font-mono text-emerald-600 dark:text-emerald-400">
                GH₵ {totalPaid.toFixed(2)}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5 truncate">
                {filteredPayments.length} receipt{filteredPayments.length !== 1 ? 's' : ''} logged
              </p>
            </div>
          </div>

          {/* Outstanding Balance Card */}
          <div className={`bg-white dark:bg-slate-800/90 rounded-2xl sm:rounded-3xl p-4 sm:p-5 border shadow-xs flex flex-col justify-between space-y-2 ${
            balance <= 0 && totalBill > 0 
              ? 'border-emerald-200/80 dark:border-emerald-800/50' 
              : 'border-slate-200/80 dark:border-slate-700/80'
          }`}>
            <div className="flex items-center justify-between">
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-400 block">
                Outstanding Balance
              </span>
              <span className={`px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider border ${statusBadge}`}>
                {statusText}
              </span>
            </div>
            <div>
              <p className={`text-xl sm:text-2xl md:text-3xl font-black font-mono ${
                balance <= 0 && totalBill > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
              }`}>
                GH₵ {Math.max(0, balance).toFixed(2)}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5 truncate">
                {balance > 0 ? 'Payment pending clearance' : 'No dues outstanding'}
              </p>
            </div>
          </div>

        </section>

        {/* --- Fee Breakdown Items Section --- */}
        <section className="bg-white dark:bg-slate-800/90 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-700/80 shadow-xs overflow-hidden">
          
          <div className="px-4 sm:px-6 py-3.5 sm:py-4 bg-[#003B5C] border-b border-[#002a42] flex items-center justify-between">
            <h2 className="text-xs sm:text-sm font-black uppercase tracking-wider text-white flex items-center gap-2">
              <span className="w-1.5 h-4 bg-amber-400 rounded-full shrink-0" />
              <span>Bill Breakdown &amp; Component Status</span>
            </h2>
            <span className="text-[10px] sm:text-xs font-mono text-blue-200/80">
              {filteredFees.length} Item{filteredFees.length !== 1 ? 's' : ''}
            </span>
          </div>

          {filteredFees.length === 0 ? (
            <div className="p-10 sm:p-14 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto shadow-inner">
                <DollarSign className="w-6 h-6 opacity-35" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                  No Fee Schedule for This Term
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
                  Fee structures have not been configured for {selectedTermName?.name || 'this term'} yet.
                </p>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {filteredFees.map((fee) => {
                const feePayments = payments.filter(p => p.fee_structure_id === fee.id)
                const feePaid = feePayments.reduce((sum, p) => sum + Number(p.amount_paid || 0), 0)
                const feeBalance = Number(fee.amount || 0) - feePaid
                const percentage = Number(fee.amount) > 0 ? Math.min(100, Math.round((feePaid / Number(fee.amount)) * 100)) : 0

                return (
                  <div key={fee.id} className="p-4 sm:p-5 space-y-3 hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                    
                    {/* Top Row: Fee Name, Amount, and Badge */}
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                          {fee.fee_types?.name || 'Academic Fee'}
                        </h3>
                        {fee.fee_types?.description && (
                          <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                            {fee.fee_types.description}
                          </p>
                        )}
                      </div>

                      <div className="text-right shrink-0">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider border ${
                          feeBalance <= 0 
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-900/50' 
                            : feePaid > 0 
                            ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-900/50' 
                            : 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-900/50'
                        }`}>
                          {feeBalance <= 0 ? 'Settled' : feePaid > 0 ? 'Partial' : 'Unpaid'}
                        </span>
                        <p className="text-xs font-mono font-black text-slate-900 dark:text-white mt-1">
                          GH₵ {Number(fee.amount).toFixed(2)}
                        </p>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-1">
                      <div className="h-2 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all duration-500 ${
                            feeBalance <= 0 ? 'bg-emerald-500' : feePaid > 0 ? 'bg-amber-500' : 'bg-rose-400'
                          }`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      
                      <div className="flex justify-between text-[11px] font-mono text-slate-500 dark:text-slate-400 pt-0.5">
                        <span>Paid: <strong className="text-emerald-600 dark:text-emerald-400 font-bold">GH₵ {feePaid.toFixed(2)}</strong> ({percentage}%)</span>
                        <span>Bal: <strong className={feeBalance > 0 ? 'text-rose-600 dark:text-rose-400 font-bold' : 'text-emerald-600 dark:text-emerald-400 font-bold'}>GH₵ {Math.max(0, feeBalance).toFixed(2)}</strong></span>
                      </div>
                    </div>

                  </div>
                )
              })}
            </div>
          )}

        </section>

        {/* --- Payment History / Transactions Section --- */}
        {filteredPayments.length > 0 && (
          <section className="bg-white dark:bg-slate-800/90 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-700/80 shadow-xs overflow-hidden">
            
            <div className="px-4 sm:px-6 py-3.5 sm:py-4 bg-[#003B5C] border-b border-[#002a42] flex items-center justify-between">
              <h2 className="text-xs sm:text-sm font-black uppercase tracking-wider text-white flex items-center gap-2">
                <Receipt className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Payment Receipts &amp; Logs</span>
              </h2>
              <span className="text-[10px] sm:text-xs font-mono text-blue-200/80">
                {filteredPayments.length} Receipt{filteredPayments.length !== 1 ? 's' : ''}
              </span>
            </div>

            {/* Desktop Table (≥ md screens) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-xs sm:text-sm text-left">
                <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-500 dark:text-slate-400 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200/80 dark:border-slate-700">
                  <tr>
                    <th className="px-4 sm:px-6 py-3">Receipt Purpose</th>
                    <th className="px-4 py-3">Payment Date</th>
                    <th className="px-4 py-3">Method</th>
                    <th className="px-4 py-3">Remarks / Memo</th>
                    <th className="px-4 sm:px-6 py-3 text-right font-mono">Amount Paid</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                  {filteredPayments.map((p) => {
                    const feeName = feeStructures.find(f => f.id === p.fee_structure_id)?.fee_types?.name || 'Academic Fee'

                    return (
                      <tr key={p.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="px-4 sm:px-6 py-3.5 font-bold text-slate-900 dark:text-white">
                          {feeName}
                        </td>
                        <td className="px-4 py-3.5 text-xs text-slate-500 dark:text-slate-400 font-mono">
                          {new Date(p.payment_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="inline-flex px-2.5 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold text-[10px] uppercase tracking-wider border border-slate-200 dark:border-slate-700">
                            {p.payment_method || 'Cash'}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-xs text-slate-500 dark:text-slate-400 italic max-w-xs truncate" title={p.remarks || ''}>
                          {p.remarks || <span className="not-italic text-slate-400">---</span>}
                        </td>
                        <td className="px-4 sm:px-6 py-3.5 text-right font-mono font-black text-emerald-600 dark:text-emerald-400 text-sm">
                          GH₵ {Number(p.amount_paid).toFixed(2)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards (< md screens) */}
            <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800/80">
              {filteredPayments.map((p) => {
                const feeName = feeStructures.find(f => f.id === p.fee_structure_id)?.fee_types?.name || 'Academic Fee'

                return (
                  <div key={p.id} className="p-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                          {feeName}
                        </h4>
                        <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono mt-0.5">
                          <span>{new Date(p.payment_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                          <span>•</span>
                          <span className="uppercase font-semibold text-slate-500">{p.payment_method || 'Cash'}</span>
                        </div>
                      </div>

                      <span className="text-xs sm:text-sm font-black font-mono text-emerald-600 dark:text-emerald-400 shrink-0">
                        GH₵ {Number(p.amount_paid).toFixed(2)}
                      </span>
                    </div>

                    {p.remarks && (
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 italic bg-slate-50 dark:bg-slate-900/50 p-2 rounded-lg border border-slate-100 dark:border-slate-800">
                        &ldquo;{p.remarks}&rdquo;
                      </p>
                    )}
                  </div>
                )
              })}
            </div>

          </section>
        )}

      </main>

      <PortalFooter />
    </div>
  )
}

function FeesSkeleton() {
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
        <Skeleton className="h-24 w-full rounded-2xl sm:rounded-3xl" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Skeleton className="h-28 rounded-2xl" />
          <Skeleton className="h-28 rounded-2xl" />
          <Skeleton className="h-28 rounded-2xl" />
        </div>
        <Skeleton className="h-64 sm:h-80 w-full rounded-2xl sm:rounded-3xl" />
      </main>

      <PortalFooter />
    </div>
  )
}