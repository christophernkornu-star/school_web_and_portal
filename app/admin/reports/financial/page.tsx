'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, Plus, Trash2, Save, AlertCircle, Check, DollarSign, X, Settings, PieChart, Wallet, Download, Search, FileText, Filter, Printer, RefreshCw, Calendar, ArrowRight, Activity, Percent, Users } from 'lucide-react'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'
import { format, startOfDay, endOfDay, isSameDay, parseISO, subDays } from 'date-fns'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import BackButton from '@/components/ui/back-button'
import { Skeleton } from '@/components/ui/skeleton'
import { resolveActiveAcademicYear, filterTermsByActiveYear } from '@/lib/academic-year'

type Tab = 'overview' | 'collections' | 'debts'

export default function FinancialReportsPage() {
  const supabase = getSupabaseBrowserClient()
  const [activeTab, setActiveTab] = useState<Tab>('overview')
  const [loading, setLoading] = useState(true)
  
  // Data
  const [payments, setPayments] = useState<any[]>([])
  const [students, setStudents] = useState<any[]>([])
  const [feeStructures, setFeeStructures] = useState<any[]>([])
  const [classes, setClasses] = useState<any[]>([])
  
  // Filters
  const [dateRange, setDateRange] = useState('today') // today, week, month, all
  const [selectedClass, setSelectedClass] = useState('all')
  const [selectedTerm, setSelectedTerm] = useState('all')
  const [terms, setTerms] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
            // 1. Load Classes
      const { data: cls } = await supabase.from('classes').select('id, name').order('name')
      setClasses(cls || [])

      // 1.5 Load Academic Terms (active academic year only) for the term filter.
      const activeYear = await resolveActiveAcademicYear(supabase)
      const { data: allTerms } = await supabase
        .from('academic_terms')
        .select('id, name, academic_year, start_date, end_date')
        .order('start_date', { ascending: true })
      const activeTerms = filterTermsByActiveYear(allTerms || [], activeYear)
      setTerms(activeTerms)

      // 2. Get Current Academic Year
      const { data: currentTerm } = await supabase
        .from('academic_terms')
        .select('academic_year')
        .eq('is_current', true)
        .single()
      
      const currentYear = currentTerm?.academic_year

      // 3. Load Fee Structures (Filtered by Current Academic Year)
      let feeQuery = supabase
        .from('fee_structures')
        .select('*, fee_types(name)')
      
      if (currentYear) {
        feeQuery = feeQuery.eq('academic_year', currentYear)
      }

      const { data: structs } = await feeQuery
      setFeeStructures(structs || [])

      // 4. Load Payments
      const { data: pay } = await supabase
        .from('fee_payments')
        .select('*, students(first_name, last_name, class_id, student_id), fee_structures(fee_types(name))')
        .order('payment_date', { ascending: false })
      setPayments(pay || [])

      // 5. Load Students (for debt calculation)
      const { data: studs } = await supabase
        .from('students')
        .select('id, first_name, last_name, student_id, class_id, gender')
        .eq('status', 'active')
      setStudents(studs || [])

    } catch (error) {
      console.error('Error loading financial data:', error)
    } finally {
      setLoading(false)
    }
  }

    // --- Calculations ---

  // Dates (start/end inclusive) of the selected term, or null if "All Terms".
  const getSelectedTermDateRange = (): { start: string; end: string } | null => {
    if (!selectedTerm || selectedTerm === 'all') return null
    const term = terms.find(t => t.id === selectedTerm)
    if (!term || !term.start_date || !term.end_date) return null
    return { start: term.start_date, end: term.end_date }
  }

  const paymentWithinTerm = (paymentDate: string | null | undefined, range: { start: string; end: string } | null): boolean => {
    if (!range) return true
    if (!paymentDate) return false
    const date = paymentDate.slice(0, 10) // normalize to yyyy-MM-dd
    return date >= range.start && date <= range.end
  }

  const getFilteredPayments = () => {
    let filtered = [...payments]

    const termRange = getSelectedTermDateRange()

    // Term Filter
    filtered = filtered.filter(p => paymentWithinTerm(p.payment_date, termRange))
    
    // Date Filter
    const today = new Date()
    if (dateRange === 'today') {
      filtered = filtered.filter(p => isSameDay(parseISO(p.payment_date), today))
    } else if (dateRange === 'week') {
      const weekAgo = subDays(today, 7)
      filtered = filtered.filter(p => parseISO(p.payment_date) >= weekAgo)
    } else if (dateRange === 'month') {
      const monthAgo = subDays(today, 30)
      filtered = filtered.filter(p => parseISO(p.payment_date) >= monthAgo)
    }

    // Class Filter
    if (selectedClass !== 'all') {
      filtered = filtered.filter(p => p.students?.class_id === selectedClass)
    }

    // Search Filter
    if (searchTerm) {
      const lower = searchTerm.toLowerCase()
      filtered = filtered.filter(p => 
        p.students?.first_name?.toLowerCase().includes(lower) || 
        p.students?.last_name?.toLowerCase().includes(lower) ||
        p.students?.student_id?.toLowerCase().includes(lower)
      )
    }

    return filtered
  }

  const calculateDebts = () => {
    // Map of Student ID -> { totalDue, totalPaid, details }
    const debtMap = new Map()

    // Initialize students
    students.forEach(student => {
      if (selectedClass !== 'all' && student.class_id !== selectedClass) return
      
      // Search filter
      if (searchTerm) {
        const lower = searchTerm.toLowerCase()
        const fullName = `${student.first_name} ${student.last_name}`.toLowerCase()
        if (!fullName.includes(lower) && !student.student_id.toLowerCase().includes(lower)) return
      }

      debtMap.set(student.id, {
        student,
        totalDue: 0,
        totalPaid: 0,
        breakdown: []
      })
    })

    // Calculate Due (from Fee Structures)
    feeStructures.forEach(struct => {
      students.forEach(student => {
        if (student.class_id === struct.class_id) {
          const record = debtMap.get(student.id)
          if (record) {
            record.totalDue += Number(struct.amount)
            record.breakdown.push({
              type: struct.fee_types?.name,
              amount: Number(struct.amount)
            })
          }
        }
      })
    })

        // Calculate Paid (from Payments)
    const termRange = getSelectedTermDateRange()
    payments.forEach(payment => {
      const record = debtMap.get(payment.student_id)
      if (record && paymentWithinTerm(payment.payment_date, termRange)) {
        record.totalPaid += Number(payment.amount_paid)
      }
    })

    // Convert to array and filter those with debt
    return Array.from(debtMap.values())
      .map((r: any) => ({
        ...r,
        balance: r.totalDue - r.totalPaid
      }))
      .filter(r => r.balance > 0)
      .sort((a, b) => b.balance - a.balance)
  }

  const filteredPayments = getFilteredPayments()
  const outstandingDebts = calculateDebts()

  const totalCollected = filteredPayments.reduce((sum, p) => sum + Number(p.amount_paid), 0)
  const totalOutstanding = outstandingDebts.reduce((sum, r) => sum + r.balance, 0)

  // Chart Data (Last 7 days)
  const getChartData = () => {
    const data = []
    for (let i = 6; i >= 0; i--) {
      const date = subDays(new Date(), i)
      const dateStr = format(date, 'yyyy-MM-dd')
      const dayPayments = payments.filter(p => p.payment_date === dateStr)
      const total = dayPayments.reduce((sum, p) => sum + Number(p.amount_paid), 0)
      data.push({
        name: format(date, 'MMM dd'),
        amount: total
      })
    }
    return data
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
         <div className="text-center w-full max-w-7xl px-4">
             <div className="space-y-4">
                <Skeleton className="h-8 w-64" />
                <Skeleton className="h-4 w-48" />
                
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-12 mb-8">
                     <Skeleton className="h-32 rounded-lg" />
                     <Skeleton className="h-32 rounded-lg" />
                     <Skeleton className="h-32 rounded-lg" />
                     <Skeleton className="h-32 rounded-lg" />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <Skeleton className="h-96 rounded-lg" />
                    <Skeleton className="h-96 rounded-lg" />
                </div>
             </div>
         </div>
      </div>
    )
  }

  return (
    <div className="bg-gray-50/50 min-h-screen pb-20 font-sans w-full max-w-[100vw] overflow-x-hidden box-border">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <div className="flex items-start sm:items-center">
          <BackButton href="/admin/reports" className="mt-1 sm:mt-0" />
          <div className="ml-2 sm:ml-4">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Financial Reports</h1>
            <p className="text-sm sm:text-base text-gray-600">Track collections and outstanding balances</p>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-3xl shadow-[0_2px_15px_-3px_rgba(0,0,0,0.04)] border border-gray-100 p-6 md:p-8 relative overflow-hidden group hover:border-yellow-200 transition-colors">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <DollarSign className="w-6 h-6 text-methodist-blue" />
              </div>
              <span className="text-xs sm:text-sm text-methodist-blue font-medium bg-blue-50 px-2 py-1 rounded">
                {dateRange === 'today' ? 'Today' : dateRange === 'week' ? 'This Week' : 'Period'}
              </span>
            </div>
            <p className="text-sm text-gray-600 truncate">Total Collected</p>
            <h3 className="text-xl sm:text-2xl font-bold text-gray-900 truncate">GHS {totalCollected.toFixed(2)}</h3>
          </div>

          <div className="bg-white rounded-3xl shadow-[0_2px_15px_-3px_rgba(0,0,0,0.04)] border border-gray-100 p-6 md:p-8 relative overflow-hidden group hover:border-yellow-200 transition-colors">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-red-100 rounded-lg">
                <AlertCircle className="w-6 h-6 text-red-600" />
              </div>
            </div>
            <p className="text-sm text-gray-600 truncate">Total Outstanding Debt</p>
            <h3 className="text-xl sm:text-2xl font-bold text-gray-900 truncate">GHS {totalOutstanding.toFixed(2)}</h3>
          </div>

          <div className="bg-white rounded-3xl shadow-[0_2px_15px_-3px_rgba(0,0,0,0.04)] border border-gray-100 p-6 md:p-8 relative overflow-hidden group hover:border-yellow-200 transition-colors">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Users className="w-6 h-6 text-methodist-blue" />
              </div>
            </div>
            <p className="text-sm text-gray-600 truncate">Students with Debt</p>
            <h3 className="text-xl sm:text-2xl font-bold text-gray-900 truncate">{outstandingDebts.length}</h3>
          </div>
        </div>

        {/* Tabs & Filters */}
        <div className="bg-white rounded-3xl shadow-[0_2px_15px_-3px_rgba(0,0,0,0.04)] border border-gray-100 overflow-hidden">
          <div className="border-b border-gray-200 p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex overflow-x-auto w-full min-w-0 pb-2 lg:pb-0 gap-2 no-scrollbar">
              <button
                onClick={() => setActiveTab('overview')}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
                  activeTab === 'overview' ? 'bg-yellow-100 text-yellow-600' : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                Overview
              </button>
              <button
                onClick={() => setActiveTab('collections')}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
                  activeTab === 'collections' ? 'bg-yellow-100 text-yellow-600' : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                Daily Collections
              </button>
              <button
                onClick={() => setActiveTab('debts')}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
                  activeTab === 'debts' ? 'bg-yellow-100 text-yellow-600' : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                Outstanding Debts
              </button>
            </div>

            <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center w-full min-w-0 gap-3">
              <div className="relative w-full sm:w-auto flex-1 sm:flex-none min-w-0">
                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search student..."
                  className="w-full sm:w-auto md:w-64 pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 outline-none"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <select
                className="w-full sm:w-auto border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-500 outline-none"
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
              >
                <option value="today">Today</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
                <option value="all">All Time</option>
              </select>
                            <select
                className="w-full sm:w-auto border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-500 outline-none"
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
              >
                <option value="all">All Classes</option>
                {classes.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <select
                className="w-full sm:w-auto border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-500 outline-none"
                value={selectedTerm}
                onChange={(e) => setSelectedTerm(e.target.value)}
                title="Filter by academic term (uses that term's date range)"
              >
                <option value="all">All Terms</option>
                {terms.map(t => (
                  <option key={t.id} value={t.id}>{t.name} ({t.academic_year})</option>
                ))}
              </select>
            </div>
          </div>

          <div className="p-4 sm:p-6 overflow-hidden">
            {loading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600"></div>
              </div>
            ) : (
              <>
                {activeTab === 'overview' && (
                  <div className="w-full overflow-hidden">
                    <h3 className="text-lg font-semibold text-gray-800 mb-6">Collection Trends (Last 7 Days)</h3>
                    <div className="h-72 sm:h-80 w-full min-w-0 pr-1">
                      <ResponsiveContainer width="99%" height="100%">
                        <BarChart data={getChartData()} margin={{ top: 20, right: 0, left: -20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} />
                          <XAxis dataKey="name" tick={{fontSize: 10}} tickMargin={10} minTickGap={10} />
                          <YAxis 
                            tick={{fontSize: 10}} 
                            tickFormatter={(value) => value >= 1000 ? `${(value/1000).toFixed(1)}k` : value} 
                            width={40}
                          />
                          <Tooltip 
                            formatter={(value) => [`GHS ${value}`, 'Collected']}
                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px' }}
                          />
                          <Bar dataKey="amount" fill="#8b5cf6" radius={[4, 4, 0, 0]} maxBarSize={45} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                {activeTab === 'collections' && (
                  <div className="overflow-x-auto w-full">
                    <table className="w-full min-w-[800px] text-left">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="pb-3 font-semibold text-gray-600">Date</th>
                          <th className="pb-3 font-semibold text-gray-600">Student</th>
                          <th className="pb-3 font-semibold text-gray-600">Class</th>
                          <th className="pb-3 font-semibold text-gray-600">Fee Type</th>
                          <th className="pb-3 font-semibold text-gray-600 text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {filteredPayments.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="py-8 text-center text-gray-500">
                              No payments found for the selected period.
                            </td>
                          </tr>
                        ) : (
                          filteredPayments.map((payment) => (
                            <tr key={payment.id} className="hover:bg-gray-50">
                              <td className="py-3 text-gray-800">
                                {format(parseISO(payment.payment_date), 'MMM dd, yyyy')}
                              </td>
                              <td className="py-3">
                                <div className="font-medium text-gray-800">
                                  {payment.students?.first_name} {payment.students?.last_name}
                                </div>
                                <div className="text-xs text-gray-500">{payment.students?.student_id}</div>
                              </td>
                              <td className="py-3 text-gray-600">
                                {classes.find(c => c.id === payment.students?.class_id)?.name || '-'}
                              </td>
                              <td className="py-3 text-gray-600">
                                {payment.fee_structures?.fee_types?.name || 'Fee Payment'}
                              </td>
                              <td className="py-3 text-right font-medium text-methodist-blue">
                                GHS {Number(payment.amount_paid).toFixed(2)}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                )}

                {activeTab === 'debts' && (
                  <div className="overflow-x-auto w-full">
                    <table className="w-full min-w-[900px] text-left">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="pb-3 font-semibold text-gray-600">Student</th>
                          <th className="pb-3 font-semibold text-gray-600">Class</th>
                          <th className="pb-3 font-semibold text-gray-600 text-right">Total Due</th>
                          <th className="pb-3 font-semibold text-gray-600 text-right">Paid</th>
                          <th className="pb-3 font-semibold text-gray-600 text-right">Balance</th>
                          <th className="pb-3 font-semibold text-gray-600 text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {outstandingDebts.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="py-8 text-center text-gray-500">
                              No outstanding debts found.
                            </td>
                          </tr>
                        ) : (
                          outstandingDebts.map((record: any) => (
                            <tr key={record.student.id} className="hover:bg-gray-50">
                              <td className="py-3">
                                <div className="font-medium text-gray-800">
                                  {record.student.first_name} {record.student.last_name}
                                </div>
                                <div className="text-xs text-gray-500">{record.student.student_id}</div>
                              </td>
                              <td className="py-3 text-gray-600">
                                {classes.find(c => c.id === record.student.class_id)?.name || '-'}
                              </td>
                              <td className="py-3 text-right text-gray-600">
                                GHS {record.totalDue.toFixed(2)}
                              </td>
                              <td className="py-3 text-right text-methodist-blue">
                                GHS {record.totalPaid.toFixed(2)}
                              </td>
                              <td className="py-3 text-right font-bold text-red-600">
                                GHS {record.balance.toFixed(2)}
                              </td>
                              <td className="py-3 text-center">
                                <Link 
                                  href={`/admin/finance/collection?student=${record.student.id}&class=${record.student.class_id}`}
                                  className="text-sm text-methodist-gold hover:text-yellow-600 font-medium"
                                >
                                  Collect
                                </Link>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

