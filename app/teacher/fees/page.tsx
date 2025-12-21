'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { format } from 'date-fns'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'
import { getTeacherClassAccess } from '@/lib/teacher-permissions'
import { 
  DollarSign, Users, Calendar, Search, Plus, FileText, 
  CheckCircle, AlertCircle, ChevronDown, Loader2, CreditCard, FileBarChart
} from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function TeacherFeesPage() {
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()
  const [loading, setLoading] = useState(true)
  const [classes, setClasses] = useState<any[]>([])
  const [selectedClass, setSelectedClass] = useState<string>('')
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

  useEffect(() => {
    loadInitialData()
  }, [])

  useEffect(() => {
    if (selectedClass) {
      loadClassData(selectedClass)
    }
  }, [selectedClass])

  const loadInitialData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Get teacher profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      if (profile?.role !== 'teacher' && profile?.role !== 'admin' && profile?.role !== 'head_teacher') {
        router.push('/login')
        return
      }

      let classesData: any[] = []

      if (profile.role === 'teacher') {
        // For teachers, only show classes where they are the class teacher
        const classAccess = await getTeacherClassAccess(user.id)
        classesData = classAccess
          .filter(c => c.is_class_teacher)
          .map(c => ({ id: c.class_id, name: c.class_name }))
      } else {
        // For admins and head teachers, show all classes
        const { data } = await supabase
          .from('classes')
          .select('id, name')
          .order('name')
        classesData = data || []
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

  const loadClassData = async (classId: string) => {
    setLoading(true)
    try {
      // Fetch students
      const { data: studentsData } = await supabase
        .from('students')
        .select('id, first_name, last_name, student_id, gender')
        .eq('class_id', classId)
        .order('last_name')

      setStudents(studentsData || [])

      // Fetch fee structures for this class (and global ones)
      // Note: This assumes we have a way to link fees to classes. 
      // For now, we'll fetch all fee structures and filter client-side or assume they apply.
      // Ideally, we should filter by current academic term/year.
      
      // Get current term
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
          // .eq('term_id', currentTerm.id) // Optional: filter by term
          .or(`class_id.eq.${classId},class_id.is.null`)

        setFeeStructures(feesData || [])

        // Fetch payments for these students and fees
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

      // Refresh data
      loadClassData(selectedClass)
      setShowPaymentModal(false)
      setPaymentForm({
        fee_structure_id: '',
        amount_paid: '',
        payment_method: 'Cash',
        remarks: ''
      })
      alert('Payment recorded successfully')
    } catch (error) {
      console.error('Error recording payment:', error)
      alert('Failed to record payment')
    } finally {
      setSubmitting(false)
    }
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

  const filteredStudents = students.filter(s => 
    s.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.student_id.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-lg md:text-xl lg:text-2xl font-bold text-gray-800 flex items-center gap-2">
              <DollarSign className="w-6 h-6 md:w-8 md:h-8 text-green-600" />
              Fee Collection
            </h1>
            <p className="text-xs md:text-sm lg:text-base text-gray-600">Manage and record student fee payments</p>
          </div>
          
          <div className="flex items-center gap-4">
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="p-2 border rounded-lg bg-white shadow-sm focus:ring-2 focus:ring-green-500 outline-none text-sm"
            >
              {classes.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>

            {selectedClass && (
              <Link href={`/teacher/fees/statement?classId=${selectedClass}`}>
                <Button variant="outline" className="gap-2 h-10">
                  <FileBarChart className="h-4 w-4" />
                  <span className="hidden sm:inline">Statement</span>
                </Button>
              </Link>
            )}
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-8">
          <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-gray-500 text-xs md:text-sm font-medium">Total Expected</h3>
              <div className="p-2 bg-blue-50 rounded-lg">
                <DollarSign className="w-4 h-4 md:w-5 md:h-5 text-blue-600" />
              </div>
            </div>
            <p className="text-xl md:text-2xl font-bold text-gray-800">
              GH₵ {students.length * feeStructures.reduce((sum, f) => sum + (f.amount || 0), 0)}
            </p>
          </div>
          
          <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-gray-500 text-xs md:text-sm font-medium">Total Collected</h3>
              <div className="p-2 bg-green-50 rounded-lg">
                <CheckCircle className="w-4 h-4 md:w-5 md:h-5 text-green-600" />
              </div>
            </div>
            <p className="text-xl md:text-2xl font-bold text-gray-800">
              GH₵ {payments.reduce((sum, p) => sum + (p.amount_paid || 0), 0)}
            </p>
          </div>

          <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-gray-500 text-xs md:text-sm font-medium">Outstanding</h3>
              <div className="p-2 bg-red-50 rounded-lg">
                <AlertCircle className="w-4 h-4 md:w-5 md:h-5 text-red-600" />
              </div>
            </div>
            <p className="text-xl md:text-2xl font-bold text-gray-800">
              GH₵ {(students.length * feeStructures.reduce((sum, f) => sum + (f.amount || 0), 0)) - payments.reduce((sum, p) => sum + (p.amount_paid || 0), 0)}
            </p>
          </div>
        </div>

        {/* Main Content */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          
          <div className="p-4 md:p-6 border-b border-gray-200 flex flex-col md:flex-row justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 md:w-5 md:h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search students..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 outline-none text-xs md:text-sm"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50 z-10 shadow-sm">Student</th>
                  {feeStructures.map(fee => (
                    <th key={fee.id} className="px-4 md:px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[150px]">
                      {fee.fee_types?.name} <br/>
                      <span className="text-gray-400">GH₵ {fee.amount}</span>
                    </th>
                  ))}
                  <th className="px-4 md:px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={feeStructures.length + 2} className="px-4 md:px-6 py-12 text-center">
                      <Loader2 className="w-6 h-6 md:w-8 md:h-8 text-green-600 animate-spin mx-auto" />
                      <p className="mt-2 text-xs md:text-sm text-gray-500">Loading fee data...</p>
                    </td>
                  </tr>
                ) : filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan={feeStructures.length + 2} className="px-4 md:px-6 py-12 text-center text-xs md:text-sm text-gray-500">
                      No students found
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map(student => (
                    <tr key={student.id} className="hover:bg-gray-50">
                      <td className="px-4 md:px-6 py-4 whitespace-nowrap sticky left-0 bg-white z-10 shadow-sm">
                        <div className="flex items-center">
                          <div className="h-8 w-8 md:h-10 md:w-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-bold text-xs md:text-sm">
                            {student.first_name[0]}{student.last_name[0]}
                          </div>
                          <div className="ml-4">
                            <div className="text-xs md:text-sm font-medium text-gray-900">{student.last_name} {student.first_name}</div>
                            <div className="text-xs text-gray-500">{student.student_id}</div>
                          </div>
                        </div>
                      </td>
                      {feeStructures.map(fee => {
                        const status = getStudentPaymentStatus(student.id, fee.id, fee.amount)
                        return (
                          <td key={fee.id} className="px-4 md:px-6 py-4 whitespace-nowrap text-center">
                            <div className="flex flex-col items-center">
                              <span className={`px-2 py-1 text-[10px] md:text-xs font-semibold rounded-full ${
                                status.status === 'Paid' ? 'bg-green-100 text-green-800' :
                                status.status === 'Partial' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-red-100 text-red-800'
                              }`}>
                                {status.status}
                              </span>
                              <span className="text-[10px] md:text-xs text-gray-500 mt-1">
                                Paid: {status.paid} / Bal: {status.balance}
                              </span>
                            </div>
                          </td>
                        )
                      })}
                      <td className="px-4 md:px-6 py-4 whitespace-nowrap text-center">
                        <button
                          onClick={() => {
                            setSelectedStudent(student)
                            setShowPaymentModal(true)
                          }}
                          className="text-green-600 hover:text-green-900 font-medium text-xs md:text-sm flex items-center justify-center gap-1 mx-auto"
                        >
                          <Plus className="w-3 h-3 md:w-4 md:h-4" />
                          Record Payment
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

      {/* Payment Modal */}
      {showPaymentModal && selectedStudent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full my-8 flex flex-col max-h-[90vh]">
            <div className="p-4 md:p-6 border-b border-gray-200 flex justify-between items-center shrink-0">
              <div>
                <h3 className="text-base md:text-lg font-bold text-gray-900">Manage Payments</h3>
                <p className="text-xs md:text-sm text-gray-500">
                  {selectedStudent.last_name} {selectedStudent.first_name} ({selectedStudent.student_id})
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setShowPaymentModal(false)}
                  className="text-gray-400 hover:text-gray-600 p-2"
                >
                  <span className="sr-only">Close</span>
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            
            <div className="overflow-y-auto p-4 md:p-6 space-y-8">
              {/* New Payment Form */}
              <section>
                <h4 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Plus className="w-4 h-4" /> Record New Payment
                </h4>
                <form onSubmit={handlePaymentSubmit} className="space-y-4 bg-gray-50 p-4 rounded-lg border border-gray-100">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Fee Type</label>
                      <select
                        required
                        value={paymentForm.fee_structure_id}
                        onChange={(e) => setPaymentForm({...paymentForm, fee_structure_id: e.target.value})}
                        className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-green-500 outline-none text-sm"
                      >
                        <option value="">Select Fee</option>
                        {feeStructures.map(fee => (
                          <option key={fee.id} value={fee.id}>
                            {fee.fee_types?.name} (GH₵ {fee.amount})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Amount (GH₵)</label>
                      <input
                        type="number"
                        step="0.01"
                        required
                        value={paymentForm.amount_paid}
                        onChange={(e) => setPaymentForm({...paymentForm, amount_paid: e.target.value})}
                        className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-green-500 outline-none text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Payment Method</label>
                      <select
                        value={paymentForm.payment_method}
                        onChange={(e) => setPaymentForm({...paymentForm, payment_method: e.target.value})}
                        className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-green-500 outline-none text-sm"
                      >
                        <option value="Cash">Cash</option>
                        <option value="Mobile Money">Mobile Money</option>
                        <option value="Bank Deposit">Bank Deposit</option>
                        <option value="Cheque">Cheque</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Remarks (Optional)</label>
                    <textarea
                      value={paymentForm.remarks}
                      onChange={(e) => setPaymentForm({...paymentForm, remarks: e.target.value})}
                      className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-green-500 outline-none text-sm"
                      rows={2}
                    />
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="submit"
                      disabled={submitting}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2 text-sm font-medium"
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-4 h-4" />
                          Save Payment
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </section>

              {/* Payment History */}
              <section>
                <h4 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <FileText className="w-4 h-4" /> Payment History
                </h4>
                <div className="overflow-x-auto border rounded-lg">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 text-gray-500 font-medium">
                      <tr>
                        <th className="px-4 py-2 whitespace-nowrap">Date</th>
                        <th className="px-4 py-2 whitespace-nowrap">Fee Type</th>
                        <th className="px-4 py-2 whitespace-nowrap">Amount</th>
                        <th className="px-4 py-2 whitespace-nowrap">Method</th>
                        <th className="px-4 py-2 whitespace-nowrap">Recorded By</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {payments.filter(p => p.student_id === selectedStudent.id).length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                            No payments recorded yet.
                          </td>
                        </tr>
                      ) : (
                        payments
                          .filter(p => p.student_id === selectedStudent.id)
                          .map(payment => {
                            const feeType = feeStructures.find(f => f.id === payment.fee_structure_id)?.fee_types?.name || 'Unknown Fee'
                            return (
                              <tr key={payment.id} className="hover:bg-gray-50">
                                <td className="px-4 py-2 whitespace-nowrap text-gray-600">
                                  {payment.payment_date ? format(new Date(payment.payment_date), 'MMM dd, yyyy') : '-'}
                                </td>
                                <td className="px-4 py-2 whitespace-nowrap font-medium text-gray-900">
                                  {feeType}
                                </td>
                                <td className="px-4 py-2 whitespace-nowrap text-green-600 font-medium">
                                  GH₵ {payment.amount_paid}
                                </td>
                                <td className="px-4 py-2 whitespace-nowrap text-gray-600">
                                  {payment.payment_method}
                                </td>
                                <td className="px-4 py-2 whitespace-nowrap text-gray-500 text-xs">
                                  {payment.profiles?.full_name || 'Unknown'}
                                </td>
                              </tr>
                            )
                          })
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
