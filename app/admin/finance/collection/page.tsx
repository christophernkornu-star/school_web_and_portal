'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  ArrowLeft, Search, DollarSign, CreditCard, Calendar, 
  CheckCircle, AlertCircle, User, ChevronRight, Printer
} from 'lucide-react'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'

export default function FeeCollectionPage() {
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()
  const [loading, setLoading] = useState(true)
  const [classes, setClasses] = useState<any[]>([])
  const [selectedClassId, setSelectedClassId] = useState('')
  const [students, setStudents] = useState<any[]>([])
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  
  // Fee Data
  const [studentFees, setStudentFees] = useState<any[]>([]) // Fees assigned to student's class
  const [paymentHistory, setPaymentHistory] = useState<any[]>([])
  
  // Payment Form
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [paymentForm, setPaymentForm] = useState({
    fee_structure_id: '',
    amount_paid: '',
    payment_method: 'Cash',
    remarks: ''
  })
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })

  useEffect(() => {
    loadClasses()
  }, [])

  useEffect(() => {
    if (selectedClassId) {
      loadStudents(selectedClassId)
    }
  }, [selectedClassId])

  useEffect(() => {
    if (selectedStudent) {
      loadStudentFinancials(selectedStudent)
    }
  }, [selectedStudent])

  const loadClasses = async () => {
    const { data } = await supabase
      .from('classes')
      .select('id, name')
      .order('name')
    setClasses(data || [])
    setLoading(false)
  }

  const loadStudents = async (classId: string) => {
    setLoading(true)
    const { data } = await supabase
      .from('students')
      .select('id, first_name, last_name, student_id, gender')
      .eq('class_id', classId)
      .order('last_name')
    setStudents(data || [])
    setLoading(false)
  }

  const loadStudentFinancials = async (student: any) => {
    setLoading(true)
    try {
      // 1. Get Fee Structures for student's class
      // We should ideally filter by current term/year, but for now let's get all active ones
      const { data: fees } = await supabase
        .from('fee_structures')
        .select(`
          *,
          fee_types (name),
          academic_terms (name, academic_year)
        `)
        .eq('class_id', selectedClassId)
        .order('created_at', { ascending: false })
      
      setStudentFees(fees || [])

      // 2. Get Payment History
      const { data: payments } = await supabase
        .from('fee_payments')
        .select(`
          *,
          fee_structures (
            amount,
            fee_types (name),
            academic_terms (name, academic_year)
          ),
          profiles (full_name)
        `)
        .eq('student_id', student.id)
        .order('payment_date', { ascending: false })
      
      setPaymentHistory(payments || [])

    } catch (error) {
      console.error('Error loading financials:', error)
    } finally {
      setLoading(false)
    }
  }

  const handlePaymentSubmit = async () => {
    if (!paymentForm.fee_structure_id || !paymentForm.amount_paid) {
      setMessage({ type: 'error', text: 'Please fill in all required fields' })
      return
    }

    setSubmitting(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      const { error } = await supabase
        .from('fee_payments')
        .insert({
          student_id: selectedStudent.id,
          fee_structure_id: paymentForm.fee_structure_id,
          amount_paid: parseFloat(paymentForm.amount_paid),
          payment_method: paymentForm.payment_method,
          remarks: paymentForm.remarks,
          recorded_by: user?.id
        })

      if (error) throw error

      setMessage({ type: 'success', text: 'Payment recorded successfully!' })
      setShowPaymentModal(false)
      setPaymentForm({
        fee_structure_id: '',
        amount_paid: '',
        payment_method: 'Cash',
        remarks: ''
      })
      loadStudentFinancials(selectedStudent) // Refresh data
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message })
    } finally {
      setSubmitting(false)
    }
  }

  // Calculate totals
  const getFeeBalance = (feeId: string, totalAmount: number) => {
    const paid = paymentHistory
      .filter(p => p.fee_structure_id === feeId)
      .reduce((sum, p) => sum + Number(p.amount_paid), 0)
    return totalAmount - paid
  }

  const filteredStudents = students.filter(s => 
    `${s.first_name} ${s.last_name} ${s.student_id}`.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center space-x-4">
            <Link href="/admin/dashboard" className="text-purple-600 hover:text-purple-700">
              <ArrowLeft className="w-6 h-6" />
            </Link>
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-gray-800">Fee Collection</h1>
              <p className="text-xs md:text-sm text-gray-600">Record payments and view history</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        {message.text && (
          <div className={`mb-6 p-4 rounded-lg flex items-center space-x-2 ${
            message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
          }`}>
            {message.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
            <span>{message.text}</span>
            <button onClick={() => setMessage({ type: '', text: '' })} className="ml-auto">
              <AlertCircle className="w-4 h-4 rotate-45" />
            </button>
          </div>
        )}

        <div className="grid lg:grid-cols-12 gap-8">
          {/* Left Sidebar: Class & Student Selection */}
          <div className="lg:col-span-4 space-y-6">
            {/* Class Selector */}
            <div className="bg-white rounded-lg shadow p-6">
              <label className="block text-xs md:text-sm font-medium text-gray-700 mb-2">Select Class</label>
              <select
                value={selectedClassId}
                onChange={(e) => {
                  setSelectedClassId(e.target.value)
                  setSelectedStudent(null)
                }}
                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
              >
                <option value="">-- Choose Class --</option>
                {classes.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            {/* Student List */}
            {selectedClassId && (
              <div className="bg-white rounded-lg shadow flex flex-col h-[400px] lg:h-[600px]">
                <div className="p-4 border-b">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search student..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 border rounded-lg text-xs md:text-sm focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-2">
                  {filteredStudents.map(student => (
                    <button
                      key={student.id}
                      onClick={() => setSelectedStudent(student)}
                      className={`w-full text-left p-3 rounded-lg flex items-center space-x-3 transition-colors ${
                        selectedStudent?.id === student.id 
                          ? 'bg-purple-50 border-purple-200 border' 
                          : 'hover:bg-gray-50'
                      }`}
                    >
                      <div className="bg-gray-100 p-2 rounded-full">
                        <User className="w-4 h-4 text-gray-600" />
                      </div>
                      <div>
                        <div className="font-medium text-gray-800 text-xs md:text-base">{student.last_name} {student.first_name}</div>
                        <div className="text-[10px] md:text-xs text-gray-500">{student.student_id}</div>
                      </div>
                      {selectedStudent?.id === student.id && (
                        <ChevronRight className="w-4 h-4 text-purple-600 ml-auto" />
                      )}
                    </button>
                  ))}
                  {filteredStudents.length === 0 && (
                    <div className="text-center py-8 text-gray-500 text-xs md:text-sm">No students found</div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Right Content: Financial Details */}
          <div className="lg:col-span-8">
            {selectedStudent ? (
              <div className="space-y-6">
                {/* Student Header */}
                <div className="bg-white rounded-lg shadow p-6 flex justify-between items-center">
                  <div>
                    <h2 className="text-lg md:text-xl font-bold text-gray-800">
                      {selectedStudent.last_name} {selectedStudent.first_name}
                    </h2>
                    <p className="text-xs md:text-base text-gray-600">{selectedStudent.student_id} • {selectedStudent.gender}</p>
                  </div>
                  <button
                    onClick={() => setShowPaymentModal(true)}
                    className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2 shadow-sm text-xs md:text-base"
                  >
                    <DollarSign className="w-5 h-5" />
                    Record Payment
                  </button>
                </div>

                {/* Outstanding Fees */}
                <div className="bg-white rounded-lg shadow overflow-hidden">
                  <div className="px-6 py-4 border-b bg-gray-50">
                    <h3 className="font-bold text-gray-800 text-xs md:text-base">Fee Status</h3>
                  </div>
                  <div className="divide-y">
                    {studentFees.map(fee => {
                      const balance = getFeeBalance(fee.id, fee.amount)
                      return (
                        <div key={fee.id} className="p-6 flex flex-col sm:flex-row sm:items-center justify-between hover:bg-gray-50 gap-4">
                          <div>
                            <div className="font-medium text-gray-900 text-xs md:text-base">{fee.fee_types?.name}</div>
                            <div className="text-[10px] md:text-sm text-gray-500">
                              {fee.academic_terms?.name} ({fee.academic_year})
                            </div>
                          </div>
                          <div className="text-left sm:text-right">
                            <div className="text-[10px] md:text-sm text-gray-500">Total: GH₵ {fee.amount}</div>
                            <div className={`font-bold text-xs md:text-base ${balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                              {balance > 0 ? `Owing: GH₵ ${balance.toFixed(2)}` : 'Fully Paid'}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                    {studentFees.length === 0 && (
                      <div className="p-8 text-center text-gray-500">
                        No fees assigned to this class yet.
                      </div>
                    )}
                  </div>
                </div>

                {/* Payment History */}
                <div className="bg-white rounded-lg shadow overflow-hidden">
                  <div className="px-6 py-4 border-b bg-gray-50">
                    <h3 className="font-bold text-gray-800 text-sm md:text-base">Payment History</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 text-[10px] md:text-xs uppercase text-gray-500">
                        <tr>
                          <th className="px-6 py-3 text-left">Date</th>
                          <th className="px-6 py-3 text-left">Fee Type</th>
                          <th className="px-6 py-3 text-left">Amount</th>
                          <th className="px-6 py-3 text-left">Method</th>
                          <th className="px-6 py-3 text-left">Recorded By</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {paymentHistory.map(payment => (
                          <tr key={payment.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-xs md:text-sm text-gray-900">
                              {new Date(payment.payment_date).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-xs md:text-sm text-gray-900">
                              {payment.fee_structures?.fee_types?.name}
                              <span className="text-[10px] md:text-xs text-gray-500 block">
                                {payment.fee_structures?.academic_terms?.name}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-xs md:text-sm font-medium text-green-600">
                              GH₵ {payment.amount_paid}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-xs md:text-sm text-gray-500">
                              {payment.payment_method}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-xs md:text-sm text-gray-500">
                              {payment.profiles?.full_name || 'System'}
                            </td>
                          </tr>
                        ))}
                        {paymentHistory.length === 0 && (
                          <tr>
                            <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                              No payments recorded yet.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow p-12 text-center h-full flex flex-col items-center justify-center text-gray-500">
                <User className="w-16 h-16 mb-4 text-gray-300" />
                <h3 className="text-base md:text-lg font-medium text-gray-900">Select a Student</h3>
                <p className="text-sm md:text-base">Choose a class and student from the sidebar to manage fees.</p>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Record Payment</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fee Type</label>
                <select
                  value={paymentForm.fee_structure_id}
                  onChange={e => setPaymentForm({...paymentForm, fee_structure_id: e.target.value})}
                  className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                >
                  <option value="">Select Fee to Pay</option>
                  {studentFees.map(fee => {
                    const balance = getFeeBalance(fee.id, fee.amount)
                    if (balance <= 0) return null // Hide fully paid fees
                    return (
                      <option key={fee.id} value={fee.id}>
                        {fee.fee_types?.name} - Owing: GH₵ {balance.toFixed(2)}
                      </option>
                    )
                  })}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount Paid (GH₵)</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={paymentForm.amount_paid}
                  onChange={e => setPaymentForm({...paymentForm, amount_paid: e.target.value})}
                  className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
                <select
                  value={paymentForm.payment_method}
                  onChange={e => setPaymentForm({...paymentForm, payment_method: e.target.value})}
                  className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                >
                  <option value="Cash">Cash</option>
                  <option value="Mobile Money">Mobile Money</option>
                  <option value="Bank Deposit">Bank Deposit</option>
                  <option value="Cheque">Cheque</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Remarks</label>
                <textarea
                  placeholder="Optional remarks (e.g. Receipt No.)"
                  value={paymentForm.remarks}
                  onChange={e => setPaymentForm({...paymentForm, remarks: e.target.value})}
                  className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                  rows={2}
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button 
                onClick={() => setShowPaymentModal(false)} 
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
              <button 
                onClick={handlePaymentSubmit}
                disabled={submitting}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {submitting ? 'Saving...' : 'Confirm Payment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
