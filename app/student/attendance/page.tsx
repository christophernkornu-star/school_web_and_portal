'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'
import { ArrowLeft, Calendar, CheckCircle, Users } from 'lucide-react'

interface AttendanceRecord {
  id: string
  days_present: number
  remarks: string | null
  academic_terms: {
    id: string
    name: string
    academic_year: string
    total_days: number
  }
  classes: {
    name: string
  }
}

interface AttendanceStats {
  totalTerms: number
  averageRate: number
}

export default function AttendancePage() {
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()
  const [loading, setLoading] = useState(true)
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([])
  const [stats, setStats] = useState<AttendanceStats>({
    totalTerms: 0,
    averageRate: 0
  })
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadAttendance()
  }, [])

  async function loadAttendance() {
    try {
      setLoading(true)
      setError(null)

      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      console.log('🔐 Auth user:', user?.id)
      
      if (!user) {
        console.log('❌ No user, redirecting to login')
        router.push('/login')
        return
      }

      // Get student info
      const studentResult = await supabase
        .from('students')
        .select('id, first_name, last_name, profile_id')
        .eq('profile_id', user.id)
        .single()
      const student = studentResult.data as any
      const studentError = studentResult.error

      console.log('👤 Student lookup result:', { student, error: studentError })

      if (studentError || !student) {
        console.error('❌ No student record found:', studentError)
        setError('Could not find student record. Please contact administrator.')
        return
      }

      console.log('✅ Student found:', `${student.first_name} ${student.last_name} (ID: ${student.id})`)

      // Get attendance records from new student_attendance table
      const { data: records, error: attendanceError } = await supabase
        .from('student_attendance')
        .select(`
          *,
          academic_terms (
            id,
            name,
            academic_year,
            total_days
          ),
          classes (
            name
          )
        `)
        .eq('student_id', student.id)
        .order('created_at', { ascending: false }) as { data: any[] | null; error: any }

      console.log('📊 Attendance query result:', { 
        recordCount: records?.length || 0, 
        error: attendanceError,
        records: records 
      })

      if (attendanceError) {
        console.error('❌ Error fetching attendance:', attendanceError)
        setError(`Error loading attendance: ${attendanceError.message}`)
        return
      }

      console.log('✅ Setting attendance records:', records?.length || 0)
      setAttendance(records || [])
      calculateStats(records || [])
    } catch (error) {
      console.error('💥 Unexpected error:', error)
      setError('An unexpected error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  function calculateStats(records: AttendanceRecord[]) {
    if (records.length === 0) {
      setStats({ totalTerms: 0, averageRate: 0 })
      return
    }

    const totalTerms = records.length
    const rates = records
      .filter(r => r.academic_terms?.total_days > 0)
      .map(r => (r.days_present / r.academic_terms.total_days) * 100)
    
    const averageRate = rates.length > 0 
      ? rates.reduce((sum, rate) => sum + rate, 0) / rates.length 
      : 0

    setStats({ 
      totalTerms, 
      averageRate: Math.round(averageRate * 10) / 10 
    })
  }

  function getAttendanceColor(percentage: number) {
    if (percentage >= 90) return 'text-green-600'
    if (percentage >= 75) return 'text-blue-600'
    if (percentage >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  function getAttendanceBgColor(percentage: number) {
    if (percentage >= 90) return 'bg-green-100'
    if (percentage >= 75) return 'bg-blue-100'
    if (percentage >= 60) return 'bg-yellow-100'
    return 'bg-red-100'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-methodist-blue mx-auto mb-4"></div>
              <p className="text-gray-600">Loading attendance records...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push('/student/dashboard')}
            className="flex items-center gap-2 text-methodist-blue hover:text-blue-700 mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </button>
          <h1 className="text-xl md:text-2xl lg:text-3xl font-bold text-methodist-blue">Attendance Records</h1>
          <p className="text-xs md:text-sm text-gray-600 mt-2">View your term-based attendance summary</p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mb-8">

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-xs md:text-sm">Terms Recorded</p>
                <p className="text-2xl md:text-3xl font-bold text-methodist-blue">{stats.totalTerms}</p>
              </div>
              <Calendar className="w-8 h-8 md:w-10 md:h-10 text-blue-200" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-xs md:text-sm">Average Attendance</p>
                <p className={`text-2xl md:text-3xl font-bold ${getAttendanceColor(stats.averageRate)}`}>
                  {stats.averageRate}%
                </p>
              </div>
              <CheckCircle className="w-8 h-8 md:w-10 md:h-10 text-green-200" />
            </div>
          </div>
        </div>

        {/* Attendance Records Table */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-4 md:p-6 border-b border-gray-200">
            <h2 className="text-lg md:text-xl font-semibold text-gray-800">
              Term-Based Attendance Summary
            </h2>
            <p className="text-xs md:text-sm text-gray-600 mt-1">
              Showing {attendance.length} term{attendance.length !== 1 ? 's' : ''}
            </p>
          </div>

          {attendance.length === 0 ? (
            <div className="p-12 text-center">
              <Calendar className="w-12 h-12 md:w-16 md:h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-base md:text-lg font-semibold text-gray-700 mb-2">
                No Attendance Records
              </h3>
              <p className="text-sm md:text-base text-gray-600">
                Your term-based attendance records will appear here once recorded by your teacher.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px]">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 md:px-6 py-3 text-left text-xs md:text-sm font-medium text-gray-500 uppercase tracking-wider">
                      Term
                    </th>
                    <th className="px-3 md:px-6 py-3 text-left text-xs md:text-sm font-medium text-gray-500 uppercase tracking-wider">
                      Class
                    </th>
                    <th className="px-3 md:px-6 py-3 text-left text-xs md:text-sm font-medium text-gray-500 uppercase tracking-wider">
                      Days Present
                    </th>
                    <th className="px-3 md:px-6 py-3 text-left text-xs md:text-sm font-medium text-gray-500 uppercase tracking-wider">
                      Total Days
                    </th>
                    <th className="px-3 md:px-6 py-3 text-left text-xs md:text-sm font-medium text-gray-500 uppercase tracking-wider">
                      Attendance Rate
                    </th>
                    <th className="px-3 md:px-6 py-3 text-left text-xs md:text-sm font-medium text-gray-500 uppercase tracking-wider">
                      Remarks
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {attendance.map((record) => {
                    const percentage = record.academic_terms.total_days > 0 
                      ? Math.round((record.days_present / record.academic_terms.total_days) * 100)
                      : 0
                    
                    return (
                      <tr key={record.id} className="hover:bg-gray-50">
                        <td className="px-3 md:px-6 py-4 whitespace-nowrap">
                          <div className="text-xs md:text-sm font-medium text-gray-900">
                            {record.academic_terms.name}
                          </div>
                          <div className="text-xs text-gray-500">
                            {record.academic_terms.academic_year}
                          </div>
                        </td>
                        <td className="px-3 md:px-6 py-4 whitespace-nowrap text-xs md:text-sm text-gray-900">
                          {record.classes.name}
                        </td>
                        <td className="px-3 md:px-6 py-4 whitespace-nowrap text-xs md:text-sm font-medium text-gray-900">
                          {record.days_present}
                        </td>
                        <td className="px-3 md:px-6 py-4 whitespace-nowrap text-xs md:text-sm text-gray-900">
                          {record.academic_terms.total_days}
                        </td>
                        <td className="px-3 md:px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs md:text-sm font-medium ${getAttendanceBgColor(percentage)} ${getAttendanceColor(percentage)}`}>
                            {percentage}%
                          </span>
                        </td>
                        <td className="px-3 md:px-6 py-4 text-xs md:text-sm text-gray-500">
                          {record.remarks || '-'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
