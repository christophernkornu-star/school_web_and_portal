'use client'

import { useState, useEffect } from 'react'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'
import Link from 'next/link'
import { ArrowLeft, TrendingUp, TrendingDown, CheckCircle, XCircle, AlertTriangle, Users, FileText } from 'lucide-react'
import AuthGuard from '@/app/components/AuthGuard'

interface Teacher {
  id: string
  profile_id: string
  teacher_id: string
}

interface ClassInfo {
  class_id: string
  class_name: string
  is_class_teacher: boolean
}

interface StudentRecommendation {
  student_id: string
  student_name: string
  total_subjects: number
  total_score: number
  average_score: number
  minimum_required: number
  meets_criteria: boolean
  recommendation: string
}

interface PromotionDecision {
  student_id: string
  decision: 'promote' | 'repeat' | null
  remarks: string
}

function StudentPromotionsPage() {
  const supabase = getSupabaseBrowserClient()
  const [loading, setLoading] = useState(true)
  const [teacher, setTeacher] = useState<Teacher | null>(null)
  const [teacherClasses, setTeacherClasses] = useState<ClassInfo[]>([])
  const [selectedClass, setSelectedClass] = useState('')
  const [academicYear, setAcademicYear] = useState('')
  
  const [recommendations, setRecommendations] = useState<StudentRecommendation[]>([])
  const [decisions, setDecisions] = useState<Map<string, PromotionDecision>>(new Map())
  const [loadingRecommendations, setLoadingRecommendations] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitSuccess, setSubmitSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchInitialData()
  }, [])

  useEffect(() => {
    if (selectedClass && academicYear && teacher) {
      fetchRecommendations()
    }
  }, [selectedClass, academicYear, teacher])

  async function fetchInitialData() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setError('You must be logged in to access this page')
        setLoading(false)
        return
      }

      // Fetch teacher data
      const { data: teacherData, error: teacherError } = await supabase
        .from('teachers')
        .select('id, profile_id, teacher_id')
        .eq('profile_id', user.id)
        .single() as { data: any; error: any }

      if (teacherError) {
        if (teacherError.code === 'PGRST116') {
          setError('No teacher profile found for your account')
        } else {
          throw teacherError
        }
        setLoading(false)
        return
      }
      setTeacher(teacherData)

      // Fetch classes where teacher is class teacher
      const { data: classesData, error: classesError } = await supabase
        .from('teacher_class_assignments')
        .select(`
          class_id,
          is_class_teacher,
          classes (
            id,
            name
          )
        `)
        .eq('teacher_id', teacherData.id)
        .eq('is_class_teacher', true) as { data: any[] | null; error: any }

      if (classesError) throw classesError

      const classList = classesData?.map((item: any) => ({
        class_id: item.class_id,
        class_name: (item.classes as any).name,
        is_class_teacher: item.is_class_teacher
      })) || []
      setTeacherClasses(classList)

      // Fetch current academic year from system settings
      const { data: settingsData } = await supabase
        .from('system_settings')
        .select('setting_value')
        .eq('setting_key', 'current_academic_year')
        .single() as { data: any }

      if (settingsData) {
        setAcademicYear(settingsData.setting_value)
      }

    } catch (error: any) {
      console.error('Error fetching data:', error)
      setError(error.message || 'Failed to load promotion data')
    } finally {
      setLoading(false)
    }
  }

  async function fetchRecommendations() {
    setLoadingRecommendations(true)
    setError(null)
    
    try {
      // Fetch students with pending promotion decisions (below 30% average)
      const { data, error } = await supabase
        .from('student_promotions')
        .select(`
          student_id,
          average_score,
          total_subjects,
          total_score,
          minimum_required_average,
          meets_auto_promotion_criteria,
          requires_teacher_decision,
          next_class_id,
          students!inner (
            id,
            first_name,
            middle_name,
            last_name
          )
        `)
        .eq('current_class_id', selectedClass)
        .eq('academic_year', academicYear)
        .eq('promotion_status', 'pending')
        .eq('requires_teacher_decision', true) as { data: any[] | null; error: any }

      if (error) throw error

      // Transform data to match StudentRecommendation interface
      const transformedData = data?.map((item: any) => ({
        student_id: item.student_id,
        student_name: `${(item.students as any).last_name} ${(item.students as any).middle_name ? (item.students as any).middle_name + ' ' : ''}${(item.students as any).first_name}`,
        total_subjects: item.total_subjects,
        total_score: item.total_score,
        average_score: item.average_score,
        minimum_required: item.minimum_required_average,
        meets_criteria: item.meets_auto_promotion_criteria,
        recommendation: 'teacher_decision'
      })) || []

      setRecommendations(transformedData)
      
      // Initialize decisions map
      const initialDecisions = new Map<string, PromotionDecision>()
      transformedData.forEach((rec: StudentRecommendation) => {
        initialDecisions.set(rec.student_id, {
          student_id: rec.student_id,
          decision: null, // No default decision
          remarks: ''
        })
      })
      setDecisions(initialDecisions)

    } catch (error: any) {
      console.error('Error fetching recommendations:', error)
      setError(error.message || 'Failed to load recommendations')
    } finally {
      setLoadingRecommendations(false)
    }
  }

  function updateDecision(studentId: string, decision: 'promote' | 'repeat' | null, remarks?: string) {
    setDecisions(prev => {
      const newMap = new Map(prev)
      const current = newMap.get(studentId)
      newMap.set(studentId, {
        student_id: studentId,
        decision: decision,
        remarks: remarks !== undefined ? remarks : (current?.remarks || '')
      })
      return newMap
    })
  }

  async function handleSubmit() {
    if (!selectedClass || !academicYear || !teacher) {
      setError('Missing required information')
      return
    }

    // Validate all students have decisions
    const undecidedStudents = recommendations.filter(rec => {
      const decision = decisions.get(rec.student_id)
      return !decision || !decision.decision
    })

    if (undecidedStudents.length > 0) {
      setError(`Please make decisions for all students (${undecidedStudents.length} pending)`)
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      // Get next class for promotions
      const { data: progressionData } = await supabase
        .from('class_progression')
        .select('next_class_id, is_graduation')
        .eq('current_class_id', selectedClass)
        .maybeSingle()

      // Submit each decision using the execute_teacher_promotion_decision function
      for (const [studentId, decision] of decisions.entries()) {
        if (!decision.decision) continue

        const { error: decisionError } = await (supabase
          .rpc as any)('execute_teacher_promotion_decision', {
            p_student_id: studentId,
            p_academic_year: academicYear,
            p_teacher_id: teacher.id,
            p_promote: decision.decision === 'promote',
            p_remarks: decision.remarks || ''
          })

        if (decisionError) throw decisionError
      }

      setSubmitSuccess(true)
      setTimeout(() => {
        setSubmitSuccess(false)
      }, 5000)

    } catch (error: any) {
      console.error('Error submitting decisions:', error)
      setError(error.message || 'Failed to submit decisions')
    } finally {
      setSubmitting(false)
    }
  }

  const promoteCount = Array.from(decisions.values()).filter(d => d.decision === 'promote').length
  const repeatCount = Array.from(decisions.values()).filter(d => d.decision === 'repeat').length

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-ghana-green mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">Loading...</p>
        </div>
      </div>
    )
  }

  if (teacherClasses.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <header className="bg-white dark:bg-gray-800 shadow">
          <div className="container mx-auto px-4 md:px-6 py-4">
            <div className="flex items-center space-x-4">
              <Link href="/teacher/dashboard" className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition">
                <ArrowLeft className="w-5 h-5 md:w-6 md:h-6 text-gray-600 dark:text-gray-300" />
              </Link>
              <div>
                <h1 className="text-lg md:text-xl lg:text-2xl font-bold text-gray-900 dark:text-white">Student Promotions</h1>
                <p className="text-xs md:text-sm text-gray-600 dark:text-gray-300">Manage end-of-year promotions</p>
              </div>
            </div>
          </div>
        </header>

        <main className="container mx-auto px-4 md:px-6 py-8">
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 md:p-6">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="w-5 h-5 md:w-6 md:h-6 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-blue-900 dark:text-blue-300 mb-2 text-sm md:text-base">No Classes Assigned</h3>
                <p className="text-blue-800 dark:text-blue-200 text-xs md:text-sm">
                  You are not assigned as a <strong>class teacher</strong> for any class.
                </p>
                <p className="text-xs md:text-sm text-blue-700 dark:text-blue-300 mt-3">
                  Only class teachers can make promotion decisions. Please contact an administrator if you believe this is an error.
                </p>
              </div>
            </div>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 shadow">
        <div className="container mx-auto px-4 md:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/teacher/dashboard" className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition">
                <ArrowLeft className="w-5 h-5 md:w-6 md:h-6 text-gray-600 dark:text-gray-300" />
              </Link>
              <div>
                <h1 className="text-lg md:text-xl lg:text-2xl font-bold text-gray-900 dark:text-white">Student Promotion Decisions</h1>
                <p className="text-xs md:text-sm text-gray-600 dark:text-gray-300">Academic Year: {academicYear} - Students Below 30% Average</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 md:px-6 py-8">
        {submitSuccess && (
          <div className="mb-6 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 flex items-start space-x-3">
            <CheckCircle className="w-4 h-4 md:w-5 md:h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-green-800 dark:text-green-300 font-medium text-sm md:text-base">Promotion decisions submitted successfully!</p>
              <p className="text-green-700 dark:text-green-200 text-xs md:text-sm mt-1">
                These students will be promoted or repeated according to your decisions.
              </p>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-start space-x-3">
            <XCircle className="w-4 h-4 md:w-5 md:h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-red-800 dark:text-red-300 text-sm md:text-base">{error}</p>
          </div>
        )}

        {/* Class Selection */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 md:p-6 mb-6">
          <h2 className="text-base md:text-lg font-semibold text-gray-800 dark:text-white mb-4">Select Class</h2>
          <div className="max-w-md">
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-ghana-green focus:border-transparent text-xs md:text-sm dark:bg-gray-700 dark:text-white"
            >
              <option value="">Select a class...</option>
              {teacherClasses.map(cls => (
                <option key={cls.class_id} value={cls.class_id}>
                  {cls.class_name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {selectedClass && (
          <>
            {/* Info Card */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 md:p-6 mb-6">
              <h3 className="font-semibold text-blue-900 dark:text-blue-300 mb-3 flex items-center space-x-2 text-sm md:text-base">
                <FileText className="w-4 h-4 md:w-5 md:h-5" />
                <span>Students Requiring Your Decision</span>
              </h3>
              <div className="text-blue-800 dark:text-blue-200 space-y-2 text-xs md:text-sm">
                <p>
                  <strong>Automatic Promotion:</strong> Students with 30% or higher average (across 3 terms) are automatically promoted.
                </p>
                <p className="text-blue-700 dark:text-blue-300">
                  <strong>Below 30%:</strong> Students listed below have not met the automatic promotion criteria and require your decision.
                </p>
                <p className="text-blue-700 dark:text-blue-300 mt-3">
                  You can choose to promote or repeat each student based on other factors (effort, attendance, potential, etc.).
                </p>
              </div>
            </div>

            {/* Summary Cards */}
            {recommendations.length > 0 && (
              <div className="grid md:grid-cols-3 gap-4 mb-6">
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 md:p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs md:text-sm text-gray-600 dark:text-gray-300">Total Students</p>
                      <p className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">{recommendations.length}</p>
                    </div>
                    <Users className="w-8 h-8 md:w-10 md:h-10 text-gray-400 dark:text-gray-500" />
                  </div>
                </div>

                <div className="bg-green-50 dark:bg-green-900/20 rounded-lg shadow p-4 md:p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs md:text-sm text-green-700 dark:text-green-300">To Promote</p>
                      <p className="text-xl md:text-2xl font-bold text-green-900 dark:text-green-400">{promoteCount}</p>
                    </div>
                    <TrendingUp className="w-8 h-8 md:w-10 md:h-10 text-green-500 dark:text-green-400" />
                  </div>
                </div>

                <div className="bg-red-50 dark:bg-red-900/20 rounded-lg shadow p-4 md:p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs md:text-sm text-red-700 dark:text-red-300">To Repeat</p>
                      <p className="text-xl md:text-2xl font-bold text-red-900 dark:text-red-400">{repeatCount}</p>
                    </div>
                    <TrendingDown className="w-8 h-8 md:w-10 md:h-10 text-red-500 dark:text-red-400" />
                  </div>
                </div>
              </div>
            )}

            {/* Students List */}
            {loadingRecommendations ? (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-12 text-center">
                <div className="animate-spin rounded-full h-10 w-10 md:h-12 md:w-12 border-b-2 border-ghana-green mx-auto mb-4"></div>
                <p className="text-xs md:text-sm text-gray-600 dark:text-gray-300">Loading student recommendations...</p>
              </div>
            ) : recommendations.length === 0 ? (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-12 text-center">
                <CheckCircle className="w-12 h-12 md:w-16 md:h-16 text-green-500 mx-auto mb-4" />
                <h3 className="text-base md:text-lg font-semibold text-gray-800 dark:text-white mb-2">All Students Auto-Promoted!</h3>
                <p className="text-xs md:text-sm text-gray-600 dark:text-gray-300">
                  All students in this class achieved 30% or higher average and have been automatically promoted.
                </p>
                <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 mt-2">
                  No decisions required from you.
                </p>
              </div>
            ) : (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Student
                        </th>
                        <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Performance
                        </th>
                        <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Decision
                        </th>
                        <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Remarks
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                      {recommendations.map((rec) => {
                        const decision = decisions.get(rec.student_id)
                        return (
                          <tr key={rec.student_id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                            <td className="px-4 md:px-6 py-4 whitespace-nowrap">
                              <div className="text-xs md:text-sm font-medium text-gray-900 dark:text-white">
                                {rec.student_name}
                              </div>
                            </td>
                            <td className="px-4 md:px-6 py-4">
                              <div className="text-xs md:text-sm text-gray-900 dark:text-white">
                                <div>Total: {rec.total_score.toFixed(2)} / {(rec.total_subjects * 100).toFixed(2)}</div>
                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                  Average: {rec.average_score.toFixed(2)} | Required: {rec.minimum_required.toFixed(2)}
                                </div>
                              </div>
                            </td>
                            <td className="px-4 md:px-6 py-4 whitespace-nowrap">
                              {rec.meets_criteria ? (
                                <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                                  Meets Criteria
                                </span>
                              ) : (
                                <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300">
                                  Below Threshold
                                </span>
                              )}
                            </td>
                            <td className="px-4 md:px-6 py-4 whitespace-nowrap">
                              <div className="flex space-x-2">
                                <button
                                  onClick={() => updateDecision(rec.student_id, 'promote')}
                                  className={`px-3 py-1 rounded-lg text-xs md:text-sm font-medium transition ${
                                    decision?.decision === 'promote'
                                      ? 'bg-green-600 text-white'
                                      : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                                  }`}
                                >
                                  Promote
                                </button>
                                <button
                                  onClick={() => updateDecision(rec.student_id, 'repeat')}
                                  className={`px-3 py-1 rounded-lg text-xs md:text-sm font-medium transition ${
                                    decision?.decision === 'repeat'
                                      ? 'bg-red-600 text-white'
                                      : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                                  }`}
                                >
                                  Repeat
                                </button>
                              </div>
                            </td>
                            <td className="px-4 md:px-6 py-4">
                              <input
                                type="text"
                                value={decision?.remarks || ''}
                                onChange={(e) => updateDecision(rec.student_id, decision?.decision || null, e.target.value)}
                                placeholder="Optional remarks..."
                                className="w-full px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-lg text-xs md:text-sm focus:ring-2 focus:ring-ghana-green focus:border-transparent dark:bg-gray-700 dark:text-white"
                              />
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Submit Button */}
                <div className="bg-gray-50 dark:bg-gray-700 px-4 md:px-6 py-4 flex justify-end space-x-4">
                  <Link
                    href="/teacher/dashboard"
                    className="px-4 md:px-6 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 transition text-xs md:text-sm"
                  >
                    Cancel
                  </Link>
                  <button
                    onClick={handleSubmit}
                    disabled={submitting || recommendations.length === 0}
                    className="px-4 md:px-6 py-2 bg-ghana-green text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 transition text-xs md:text-sm"
                  >
                    <CheckCircle className="w-4 h-4 md:w-5 md:h-5" />
                    <span>{submitting ? 'Submitting...' : 'Submit Promotion Decisions'}</span>
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}

export default function ProtectedStudentPromotionsPage() {
  return (
    <AuthGuard requiredRole="teacher">
      <StudentPromotionsPage />
    </AuthGuard>
  )
}
