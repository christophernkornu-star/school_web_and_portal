'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, BookOpen, Calendar, ChevronRight, FileText, Search, Plus, Trash2, Edit } from 'lucide-react'
import { getCurrentUser, getTeacherData, getTeacherAssignments } from '@/lib/auth'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'
import { Skeleton } from '@/components/ui/skeleton'
import BackButton from '@/components/ui/BackButton'
import { toast } from 'react-hot-toast'

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
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Edit State
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingAssessment, setEditingAssessment] = useState<any>(null)
  const [editFormData, setEditFormData] = useState({
    title: '',
    assessment_type: 'class_work',
    max_score: 100
  })
  const [updating, setUpdating] = useState(false)

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
        // First get the most recent term (prioritize active term)
        let termId = null
        let academicYear = null

        const { data: currentTerm } = await supabase
            .from('academic_terms')
            .select('id, academic_year')
            .eq('is_current', true)
            .limit(1)
            .maybeSingle()

        if (currentTerm) {
            termId = currentTerm.id
            academicYear = currentTerm.academic_year
        } else {
             // Fallback
            const { data: terms } = await supabase
                .from('academic_terms')
                .select('id, academic_year')
                .order('academic_year', { ascending: false })
                .limit(1)
            termId = terms?.[0]?.id
            academicYear = terms?.[0]?.academic_year
        }

        if (!termId) return

        // Get class_subject_id
        let query = supabase
            .from('class_subjects')
            .select('id')
            .eq('class_id', selectedClass)
            .eq('subject_id', selectedSubject)
        
        // Filter by academic year if possible to avoid duplicates/stale links
        if (academicYear) {
            query = query.eq('academic_year', academicYear)
        }

        const { data: classSubject } = await query.maybeSingle()

        if (!classSubject) {
            setAssessments([])
            return
        }

        // Fetch Assessments
        const { data, error } = await supabase
            .from('assessments')
            .select('*')
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

  const openEditModal = (assessment: any) => {
    setEditingAssessment(assessment)
    setEditFormData({
        title: assessment.title || assessment.assessment_name,
        assessment_type: assessment.assessment_type || 'class_work',
        max_score: assessment.max_score
    })
    setShowEditModal(true)
  }

  const handleUpdateAssessment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingAssessment) return

    setUpdating(true)
    try {
        const { error } = await supabase
            .from('assessments')
            .update({
                title: editFormData.title,
                assessment_type: editFormData.assessment_type,
                max_score: editFormData.max_score
            })
            .eq('id', editingAssessment.id)

        if (error) throw error

        toast.success('Assessment updated successfully')
        
        // Update local state
        setAssessments(assessments.map(a => 
            a.id === editingAssessment.id 
                ? { ...a, ...editFormData, assessment_name: editFormData.title } // Keep distinct fields synced locally
                : a
        ))
        setShowEditModal(false)
        setEditingAssessment(null)
    } catch (error: any) {
        console.error('Error updating assessment:', error)
        toast.error('Failed to update assessment: ' + error.message)
    } finally {
        setUpdating(false)
    }
  }

  const deleteAssessment = async (e: React.MouseEvent, id: string, name: string) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (!confirm(`Are you sure you want to delete "${name}"? This will remove all student scores associated with this assessment.`)) return

    setDeletingId(id)
    try {
        const { error } = await supabase
            .from('assessments')
            .delete()
            .eq('id', id)

        if (error) throw error

        toast.success('Assessment deleted successfully')
        setAssessments(assessments.filter(a => a.id !== id))
    } catch (error: any) {
        console.error('Error deleting assessment:', error)
        toast.error('Failed to delete assessment: ' + error.message)
    } finally {
        setDeletingId(null)
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
                <div className="flex justify-between items-center">
                    <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
                        Assessments List
                        {loadingAssessments && <span className="ml-2 text-sm font-normal text-gray-500">(Loading...)</span>}
                    </h2>
                    <Link 
                        href={`/teacher/enter-scores?classId=${selectedClass}&subjectId=${selectedSubject}`}
                        className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors shadow-sm text-sm font-medium"
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        New Assessment
                    </Link>
                </div>
                
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
                        <div 
                            key={assessment.id} 
                            className="bg-white dark:bg-gray-800 p-5 rounded-lg shadow hover:shadow-md transition-all border border-transparent hover:border-blue-500 group relative"
                        >
                            <Link href={`/teacher/review-assessments/${assessment.id}`} className="block">
                                <div className="flex justify-between items-start mb-2">
                                    <span className="px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-700">
                                        {assessment.assessment_type?.replace('_', ' ') || 'Assessment'}
                                    </span>
                                    <span className="text-xs text-gray-500">
                                        {new Date(assessment.created_at).toLocaleDateString()}
                                    </span>
                                </div>
                                
                                <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-1 group-hover:text-blue-600 dark:group-hover:text-blue-400">
                                    {assessment.title || assessment.assessment_name}
                                </h3>
                                
                                <div className="flex items-center mt-2 text-sm text-gray-600 dark:text-gray-400">
                                    <BookOpen className="w-4 h-4 mr-1" />
                                    <span>Max: {assessment.max_score}</span>
                                </div>
                            </Link>

                            <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                                <button 
                                    onClick={() => openEditModal(assessment)}
                                    className="flex items-center text-sm text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 transition-colors"
                                >
                                    <Edit className="w-4 h-4 mr-1" />
                                    Edit
                                </button>

                                <button 
                                    onClick={(e) => deleteAssessment(e, assessment.id, assessment.title || assessment.assessment_name)}
                                    disabled={deletingId === assessment.id}
                                    className="flex items-center text-sm text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 transition-colors disabled:opacity-50"
                                >
                                    <Trash2 className="w-4 h-4 mr-1" />
                                    {deletingId === assessment.id ? 'Deleting...' : 'Delete'}
                                </button>
                                
                                <Link 
                                    href={`/teacher/review-assessments/${assessment.id}`}
                                    className="flex items-center text-sm text-blue-600 dark:text-blue-400 font-medium hover:underline"
                                >
                                    Review <ChevronRight className="w-4 h-4 ml-1" />
                                </Link>
                            </div>
                        </div>
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

      {/* Edit Assessment Modal */
      showEditModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full shadow-xl border border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-bold mb-4 text-gray-900 dark:text-gray-100">Edit Assessment</h3>
                <form onSubmit={handleUpdateAssessment} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Title</label>
                        <input 
                            type="text" 
                            value={editFormData.title}
                            onChange={e => setEditFormData({...editFormData, title: e.target.value})}
                            className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            required 
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Type</label>
                        <select 
                            value={editFormData.assessment_type}
                            onChange={e => setEditFormData({...editFormData, assessment_type: e.target.value})}
                            className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        >
                            <option value="class_work">Class Work</option>
                            <option value="homework">Homework</option>
                            <option value="mid_term">Mid Term</option>
                            <option value="project">Project</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Max Score</label>
                        <input 
                            type="number" 
                            value={editFormData.max_score}
                            onChange={e => setEditFormData({...editFormData, max_score: parseInt(e.target.value) || 0})}
                            className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            min="1"
                            required 
                        />
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                        <button 
                            type="button"
                            onClick={() => setShowEditModal(false)}
                            className="px-4 py-2 text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700 rounded"
                        >
                            Cancel
                        </button>
                        <button 
                            type="submit"
                            disabled={updating}
                            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                        >
                            {updating ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
      )}
      
      </main>
    </div>
  )
}
