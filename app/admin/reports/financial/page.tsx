'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, Calendar, DollarSign, Download, Filter, Search, TrendingUp, Users, AlertCircle, FileText } from 'lucide-react'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'
import { format, startOfDay, endOfDay, isSameDay, parseISO, subDays } from 'date-fns'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

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

  const getFilteredPayments = () => {
    let filtered = [...payments]
    
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
    payments.forEach(payment => {
      const record = debtMap.get(payment.student_id)
      if (record) {
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

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div className="flex items-center">
            <Link href="/admin/finance" className="mr-4 p-2 rounded-full hover:bg-gray-200 transition-colors">
              <ArrowLeft className="w-6 h-6 text-gray-600" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Financial Reports</h1>
              <p className="text-gray-600">Track collections and outstanding balances</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <select 
              className="bg-white border border-gray-300 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-purple-500 outline-none"
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
            >
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="all">All Time</option>
            </select>
            <button 
              onClick={() => window.print()}
              className="flex items-center px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              <Download className="w-4 h-4 mr-2" />
              Export
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-green-100 rounded-lg">
                <DollarSign className="w-6 h-6 text-green-600" />
              </div>
              <span className="text-sm text-green-600 font-medium bg-green-50 px-2 py-1 rounded">
                {dateRange === 'today' ? 'Today' : dateRange === 'week' ? 'This Week' : 'Period'}
              </span>
            </div>
            <p className="text-sm text-gray-600">Total Collected</p>
            <h3 className="text-2xl font-bold text-gray-900">GHS {totalCollected.toFixed(2)}</h3>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-red-100 rounded-lg">
                <AlertCircle className="w-6 h-6 text-red-600" />
              </div>
            </div>
            <p className="text-sm text-gray-600">Total Outstanding Debt</p>
            <h3 className="text-2xl font-bold text-gray-900">GHS {totalOutstanding.toFixed(2)}</h3>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
            </div>
            <p className="text-sm text-gray-600">Students with Debt</p>
            <h3 className="text-2xl font-bold text-gray-900">{outstandingDebts.length}</h3>
          </div>
        </div>

        {/* Tabs & Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="border-b border-gray-200 p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex space-x-4">
              <button
                onClick={() => setActiveTab('overview')}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  activeTab === 'overview' ? 'bg-purple-100 text-purple-700' : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                Overview
              </button>
              <button
                onClick={() => setActiveTab('collections')}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  activeTab === 'collections' ? 'bg-purple-100 text-purple-700' : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                Daily Collections
              </button>
              <button
                onClick={() => setActiveTab('debts')}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  activeTab === 'debts' ? 'bg-purple-100 text-purple-700' : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                Outstanding Debts
              </button>
            </div>

            <div className="flex items-center space-x-3">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search student..."
                  className="pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <select
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
              >
                <option value="all">All Classes</option>
                {classes.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="p-6">
            {loading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
              </div>
            ) : (
              <>
                {activeTab === 'overview' && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-6">Collection Trends (Last 7 Days)</h3>
                    <div className="h-80 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={getChartData()}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} />
                          <XAxis dataKey="name" />
                          <YAxis />
                          <Tooltip 
                            formatter={(value) => [`GHS ${value}`, 'Collected']}
                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                          />
                          <Bar dataKey="amount" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                {activeTab === 'collections' && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
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
                              <td className="py-3 text-right font-medium text-green-600">
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
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
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
                              <td className="py-3 text-right text-green-600">
                                GHS {record.totalPaid.toFixed(2)}
                              </td>
                              <td className="py-3 text-right font-bold text-red-600">
                                GHS {record.balance.toFixed(2)}
                              </td>
                              <td className="py-3 text-center">
                                <Link 
                                  href={`/admin/finance/collection?student=${record.student.id}&class=${record.student.class_id}`}
                                  className="text-sm text-purple-600 hover:text-purple-700 font-medium"
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

