'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, BookOpen, Calendar, ChevronRight, FileText, Search } from 'lucide-react'
import { getCurrentUser, getTeacherData, getTeacherAssignments } from '@/lib/auth'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'
import { Skeleton } from '@/components/ui/skeleton'
import BackButton from '@/components/ui/BackButton'

export default function ReviewAssessmentsPage() {
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()
  const [loading, setLoading] = useState(true)
  const [teacher, setTeacher] = useState<any>(null)
  const [assignments, setAssignments] = useState<any[]>([])
  
  const [selectedClass, setSelectedClass] = useState('')
  const [selectedSubject, setSelectedSubject] = useState('')
  
  const [assessments, setAssessments] = useState<any[]>([])
  const [loadingAssessments, setLoadingAssessments] = useState(false)

  useEffect(() => {
    async function loadData() {
      const user = await getCurrentUser()
      if (!user) {
        router.push('/login?portal=teacher')
        return
      }

      const { data: teacherData } = await getTeacherData(user.id)
      if (teacherData) {
        setTeacher(teacherData)
        const { data: assignmentsData } = await getTeacherAssignments(teacherData.id)
        if (assignmentsData) {
          setAssignments(assignmentsData)
        }
      }
      setLoading(false)
    }
    loadData()
  }, [router])

  useEffect(() => {
    if (selectedClass && selectedSubject) {
      loadAssessments()
    } else {
        setAssessments([])
    }
  }, [selectedClass, selectedSubject])

  const loadAssessments = async () => {
    setLoadingAssessments(true)
    try {
        // First get the most recent term
        const { data: terms } = await supabase
            .from('academic_terms')
            .select('id')
            .order('academic_year', { ascending: false })
            .limit(1)

        const termId = terms?.[0]?.id

        if (!termId) return

        // Get class_subject_id
        const { data: classSubject } = await supabase
            .from('class_subjects')
            .select('id')
            .eq('class_id', selectedClass)
            .eq('subject_id', selectedSubject)
            .maybeSingle()

        if (!classSubject) {
            setAssessments([])
            return
        }

        // Fetch Assessments
        const { data, error } = await supabase
            .from('assessments')
            .select(`
                *,
                assessment_types (type_name)
            `)
            .eq('class_subject_id', classSubject.id)
            .eq('term_id', termId)
            .order('created_at', { ascending: false })

        if (error) throw error
        setAssessments(data || [])

    } catch (error) {
        console.error('Error loading assessments:', error)
    } finally {
        setLoadingAssessments(false)
    }
  }

  if (loading) {
     return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
             <div className="max-w-5xl mx-auto space-y-4">
                 <Skeleton className="h-12 w-full max-w-xs" />
                 <Skeleton className="h-64 w-full" />
             </div>
        </div>
     )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="container mx-auto px-4 md:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
                <BackButton href="/teacher/dashboard" />
                <div>
                   <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">Review Assessments</h1>
                   <p className="text-sm text-gray-500 dark:text-gray-400">View raw scores for individual assessments</p>
                </div>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 md:px-6 py-8 space-y-6">
        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
             <div className="grid md:grid-cols-2 gap-6">
                 <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Select Class</label>
                    <select 
                        className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        value={selectedClass}
                        onChange={e => {
                            setSelectedClass(e.target.value)
                            setSelectedSubject('') // Reset subject when class changes to filter correctly
                        }}
                    >
                        <option value="">-- Select Class --</option>
                        {Array.from(new Set(assignments.map(a => a.class_id))).map((classId) => {
                            const assignment = assignments.find(a => a.class_id === classId)
                            return (
                                <option key={classId} value={classId}>{assignment?.classes?.name}</option>
                            )
                        })}
                    </select>
                 </div>
                 <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Select Subject</label>
                    <select 
                        className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        value={selectedSubject}
                        onChange={e => setSelectedSubject(e.target.value)}
                        disabled={!selectedClass}
                    >
                        <option value="">-- Select Subject --</option>
                        {(() => {
                            const selectedClassData = assignments.find(a => a.class_id === selectedClass)
                            const category = selectedClassData?.classes?.category
                            const classLevel = category === 'Lower Primary' ? 'lower_primary' 
                              : category === 'Upper Primary' ? 'upper_primary'
                              : category === 'Junior High' ? 'jhs'
                              : null
                            
                            const subjectIds = new Set<string>()
                            return assignments
                              .filter(a => {
                                if (classLevel && a.subjects?.level) {
                                  if (a.subjects.level !== classLevel) return false
                                } else {
                                  if (a.class_id !== selectedClass) return false
                                }
                                if (subjectIds.has(a.subject_id)) return false
                                subjectIds.add(a.subject_id)
                                return true
                              })
                              .map((assignment) => (
                                <option key={assignment.subject_id} value={assignment.subject_id}>
                                  {assignment.subjects?.name}
                                </option>
                              ))
                          })()}
                    </select>
                 </div>
             </div>
        </div>

        {/* Results */}
        {selectedClass && selectedSubject ? (
            <div className="space-y-4">
                <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
                    Assessments List
                    {loadingAssessments && <span className="ml-2 text-sm font-normal text-gray-500">(Loading...)</span>}
                </h2>
                
                {!loadingAssessments && assessments.length === 0 && (
                    <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg shadow border border-dashed border-gray-300 dark:border-gray-600">
                        <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">No assessments found</h3>
                        <p className="text-gray-500 dark:text-gray-400">No assessments have been recorded for this class and subject yet.</p>
                        <Link href="/teacher/enter-scores" className="mt-4 inline-block text-blue-600 hover:text-blue-500 font-medium">
                            Create New Assessment
                        </Link>
                    </div>
                )}

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {assessments.map((assessment) => (
                        <Link 
                            key={assessment.id} 
                            href={`/teacher/review-assessments/${assessment.id}`}
                            className="bg-white dark:bg-gray-800 p-5 rounded-lg shadow hover:shadow-md transition-all border border-transparent hover:border-blue-500 group"
                        >
                            <div className="flex justify-between items-start mb-2">
                                <span className={`px-2 py-1 rounded text-xs font-medium ${
                                    assessment.assessment_types?.type_name === 'Class Exercise' ? 'bg-blue-100 text-blue-700' :
                                    assessment.assessment_types?.type_name === 'Homework' ? 'bg-green-100 text-green-700' :
                                    'bg-gray-100 text-gray-700'
                                }`}>
                                    {assessment.assessment_types?.type_name || 'Assessment'}
                                </span>
                                <span className="text-xs text-gray-500">
                                    {new Date(assessment.created_at).toLocaleDateString()}
                                </span>
                            </div>
                            
                            <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-1 group-hover:text-blue-600 dark:group-hover:text-blue-400">
                                {assessment.assessment_name}
                            </h3>
                            
                            <div className="flex items-center justify-between mt-4 text-sm text-gray-600 dark:text-gray-400">
                                <div className="flex items-center">
                                    <BookOpen className="w-4 h-4 mr-1" />
                                    <span>Max: {assessment.max_score}</span>
                                </div>
                                <div className="flex items-center text-blue-600 dark:text-blue-400 font-medium">
                                    Review Scores <ChevronRight className="w-4 h-4 ml-1" />
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            </div>
        ) : (
            <div className="text-center py-12">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 mb-4">
                    <Search className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Select Class & Subject</h3>
                <p className="text-gray-500 dark:text-gray-400 max-w-sm mx-auto mt-1">
                    Please select a class and subject above to view the list of entered assessments.
                </p>
            </div>
        )}
      </main>
    </div>
  )
}
