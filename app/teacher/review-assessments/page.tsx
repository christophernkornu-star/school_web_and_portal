'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  ClipboardCheck, BookOpen, Calendar, ChevronRight, FileText, 
  Search, Plus, Trash2, Edit2, ChevronDown, CheckCircle2, 
  X, Loader2, Sparkles, Layers, AlertCircle
} from 'lucide-react'
import { getCurrentUser, getTeacherData, getTeacherAssignments } from '@/lib/auth'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'
import { Skeleton } from '@/components/ui/skeleton'
import BackButton from '@/components/ui/back-button'
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
      let termId = null

      const { data: currentTerm } = await supabase
        .from('academic_terms')
        .select('id, academic_year')
        .eq('is_current', true)
        .limit(1)
        .maybeSingle()

      if (currentTerm) {
        termId = currentTerm.id
      } else {
        const { data: terms } = await supabase
          .from('academic_terms')
          .select('id, academic_year')
          .order('academic_year', { ascending: false })
          .limit(1)
        termId = terms?.[0]?.id
      }

      if (!termId) return

      const { data: classSubjects } = await supabase
        .from('class_subjects')
        .select('id')
        .eq('class_id', selectedClass)
        .eq('subject_id', selectedSubject)

      const classSubjectIds = classSubjects?.map((cs: any) => cs.id) || []

      if (classSubjectIds.length === 0) {
        setAssessments([])
        return
      }

      const { data, error } = await supabase
        .from('assessments')
        .select('*')
        .in('class_subject_id', classSubjectIds)
        .eq('term_id', termId)
        .order('created_at', { ascending: false })

      if (error) throw error
      setAssessments(data || [])

    } catch (error) {
      console.error('Error loading assessments:', error)
      toast.error('Failed to load assessments')
    } finally {
      setLoadingAssessments(false)
    }
  }

  const openEditModal = (assessment: any) => {
    setEditingAssessment(assessment)
    setEditFormData({
      title: assessment.title || assessment.assessment_name || '',
      assessment_type: assessment.assessment_type || 'class_work',
      max_score: assessment.max_score || 100
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
          title: editFormData.title.trim(),
          assessment_type: editFormData.assessment_type,
          max_score: editFormData.max_score
        })
        .eq('id', editingAssessment.id)

      if (error) throw error

      toast.success('Assessment updated successfully')
      
      setAssessments(assessments.map(a => 
        a.id === editingAssessment.id 
          ? { 
              ...a, 
              ...editFormData, 
              title: editFormData.title.trim(),
              assessment_name: editFormData.title.trim() 
            }
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
    
    if (!confirm(`Delete "${name}"? This will permanently remove all student marks associated with this assessment.`)) return

    setDeletingId(id)
    try {
      const { error } = await supabase
        .from('assessments')
        .delete()
        .eq('id', id)

      if (error) throw error

      toast.success('Assessment deleted')
      setAssessments(assessments.filter(a => a.id !== id))
    } catch (error: any) {
      console.error('Error deleting assessment:', error)
      toast.error('Failed to delete assessment: ' + error.message)
    } finally {
      setDeletingId(null)
    }
  }

  const getAssessmentTypeBadge = (type: string) => {
    switch(type?.toLowerCase()) {
      case 'homework':
        return 'bg-blue-50 text-[#003B5C] dark:bg-blue-950/40 dark:text-blue-300 border-blue-200/60 dark:border-blue-900/40'
      case 'mid_term':
        return 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200/60 dark:border-amber-900/40'
      case 'project':
        return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200/60 dark:border-emerald-900/40'
      case 'class_work':
      default:
        return 'bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border-purple-200/60 dark:border-purple-900/40'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50/50 dark:bg-gray-900 pb-20 p-4 sm:p-6 lg:p-8 space-y-6">
        <div className="max-w-6xl mx-auto space-y-6">
          <Skeleton className="h-16 w-full rounded-2xl" />
          <Skeleton className="h-36 w-full rounded-3xl" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-48 rounded-2xl" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50/50 dark:bg-gray-900 pb-24 font-sans text-gray-900 dark:text-gray-100 transition-colors">
      {/* Sticky Header Banner */}
      <header className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-md border-b border-gray-200/80 dark:border-gray-800 sticky top-0 z-30 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 sm:py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-start sm:items-center space-x-3 sm:space-x-4 min-w-0">
              <BackButton href="/teacher/manage-scores" className="shrink-0 mt-0.5 sm:mt-0 shadow-sm" />
              <div className="min-w-0">
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-gray-900 dark:text-white flex items-center gap-2 truncate">
                  <ClipboardCheck className="w-5 h-5 sm:w-6 sm:h-6 text-[#003B5C] dark:text-blue-400 shrink-0" />
                  <span>Review Class Assessments</span>
                </h1>
                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 font-medium truncate">
                  Inspect logged exercises, edit point scales, and manage student entries
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-3.5 sm:px-6 lg:px-8 py-4 sm:py-7 space-y-6 sm:space-y-8">
        {/* Selection & Filter Card */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl sm:rounded-3xl shadow-sm border border-gray-200/80 dark:border-gray-700 p-4 sm:p-5 md:p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-5">
            {/* Class Dropdown */}
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5 uppercase tracking-wider">
                Class Cohort <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <select 
                  className="w-full pl-4 sm:pl-5 pr-10 py-2.5 sm:py-3 text-xs sm:text-sm font-bold border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50/50 dark:bg-gray-900/50 text-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-[#003B5C] appearance-none cursor-pointer"
                  value={selectedClass}
                  onChange={e => {
                    setSelectedClass(e.target.value)
                    setSelectedSubject('')
                  }}
                >
                  <option value="">Select class cohort</option>
                  {Array.from(new Set(assignments.map(a => a.class_id))).map((classId) => {
                    const assignment = assignments.find(a => a.class_id === classId)
                    return (
                      <option key={classId} value={classId}>{assignment?.classes?.name}</option>
                    )
                  })}
                </select>
                <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* Subject Dropdown */}
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5 uppercase tracking-wider">
                Assigned Subject <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <select 
                  className="w-full pl-4 sm:pl-5 pr-10 py-2.5 sm:py-3 text-xs sm:text-sm font-bold border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50/50 dark:bg-gray-900/50 text-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-[#003B5C] appearance-none cursor-pointer disabled:opacity-50"
                  value={selectedSubject}
                  onChange={e => setSelectedSubject(e.target.value)}
                  disabled={!selectedClass}
                >
                  <option value="">{selectedClass ? 'Select subject' : 'Select class first'}</option>
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
                <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
          </div>
        </div>

        {/* Assessment Cards Grid */}
        {selectedClass && selectedSubject ? (
          <div className="space-y-4 sm:space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1 border-b border-gray-100 dark:border-gray-700">
              <div>
                <h2 className="text-base sm:text-lg font-black text-gray-900 dark:text-white flex items-center gap-2">
                  <span>Recorded Assessment Items</span>
                  <span className="text-xs font-bold text-gray-400 font-mono">
                    ({assessments.length})
                  </span>
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  Click any card to review individual marks or edit assessment criteria
                </p>
              </div>

              <Link 
                href={`/teacher/enter-scores?classId=${selectedClass}&subjectId=${selectedSubject}`}
                className="self-start sm:self-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#003B5C] hover:bg-[#002a42] text-white rounded-xl text-xs sm:text-sm font-bold shadow-md hover:shadow-lg transition-all active:scale-95 shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>New Assessment</span>
              </Link>
            </div>
            
            {loadingAssessments ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
                {[1, 2, 3].map(i => (
                  <Skeleton key={i} className="h-44 rounded-2xl sm:rounded-3xl" />
                ))}
              </div>
            ) : assessments.length === 0 ? (
              <div className="bg-white dark:bg-gray-800 rounded-2xl sm:rounded-3xl p-8 sm:p-14 border border-dashed border-gray-200 dark:border-gray-700 text-center space-y-3 shadow-sm">
                <FileText className="w-12 h-12 sm:w-14 sm:h-14 text-gray-300 dark:text-gray-600 mx-auto" />
                <div className="space-y-1">
                  <h3 className="text-sm sm:text-base font-bold text-gray-800 dark:text-gray-200">
                    No Assessments Recorded
                  </h3>
                  <p className="text-xs text-gray-400 max-w-sm mx-auto leading-relaxed">
                    There are no continuous assessment tasks registered for this subject in the active session.
                  </p>
                </div>
                <div className="pt-2">
                  <Link 
                    href={`/teacher/enter-scores?classId=${selectedClass}&subjectId=${selectedSubject}`}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#003B5C] hover:bg-[#002a42] text-white rounded-xl text-xs font-bold shadow transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Create First Assessment</span>
                  </Link>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4 md:gap-5">
                {assessments.map((assessment) => (
                  <div 
                    key={assessment.id} 
                    className="group bg-white dark:bg-gray-800 rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-gray-200/80 dark:border-gray-700 shadow-sm hover:shadow-md hover:border-[#003B5C]/40 dark:hover:border-blue-500/40 transition-all duration-200 flex flex-col justify-between"
                  >
                    <Link href={`/teacher/review-assessments/${assessment.id}`} className="block space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${getAssessmentTypeBadge(assessment.assessment_type)}`}>
                          {assessment.assessment_type?.replace('_', ' ') || 'Class Work'}
                        </span>
                        
                        <span className="text-[11px] text-gray-400 font-medium flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-gray-400 shrink-0" />
                          <span>{new Date(assessment.created_at).toLocaleDateString()}</span>
                        </span>
                      </div>
                      
                      <div>
                        <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white group-hover:text-[#003B5C] dark:group-hover:text-blue-400 transition-colors line-clamp-1">
                          {assessment.title || assessment.assessment_name}
                        </h3>
                        <div className="flex items-center gap-1.5 mt-1.5 text-xs text-gray-500 dark:text-gray-400 font-medium">
                          <BookOpen className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                          <span>Maximum Score: <strong className="text-gray-800 dark:text-gray-200 font-mono">{assessment.max_score}</strong> marks</span>
                        </div>
                      </div>
                    </Link>

                    {/* Action Bar */}
                    <div className="flex items-center justify-between pt-3.5 mt-4 border-t border-gray-100 dark:border-gray-750">
                      <div className="flex items-center gap-1">
                        <button 
                          type="button"
                          onClick={() => openEditModal(assessment)}
                          className="inline-flex items-center gap-1 p-2 sm:px-2.5 sm:py-1.5 rounded-lg text-xs font-semibold text-gray-600 hover:text-[#003B5C] hover:bg-gray-100 dark:text-gray-300 dark:hover:text-blue-300 dark:hover:bg-gray-700 transition"
                          title="Edit assessment"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Edit</span>
                        </button>

                        <button 
                          type="button"
                          onClick={(e) => deleteAssessment(e, assessment.id, assessment.title || assessment.assessment_name)}
                          disabled={deletingId === assessment.id}
                          className="inline-flex items-center gap-1 p-2 sm:px-2.5 sm:py-1.5 rounded-lg text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition disabled:opacity-50"
                          title="Delete assessment"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">{deletingId === assessment.id ? 'Deleting...' : 'Delete'}</span>
                        </button>
                      </div>

                      <Link 
                        href={`/teacher/review-assessments/${assessment.id}`}
                        className="inline-flex items-center gap-1 text-xs font-bold text-[#003B5C] dark:text-blue-400 hover:underline pl-2"
                      >
                        <span>Review</span>
                        <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-2xl sm:rounded-3xl p-10 sm:p-16 border border-dashed border-gray-200 dark:border-gray-700 text-center space-y-3 shadow-sm max-w-lg mx-auto">
            <Search className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto" />
            <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">
              Select Cohort & Subject
            </h3>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
              Choose a classroom cohort and subject above to inspect logged continuous assessment records.
            </p>
          </div>
        )}

        {/* Edit Assessment Modal */}
        {showEditModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150">
            <div className="bg-white dark:bg-gray-800 rounded-t-3xl sm:rounded-3xl max-w-md w-full shadow-2xl p-5 sm:p-6 space-y-4 border-t sm:border border-gray-100 dark:border-gray-700">
              <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-750 pb-3">
                <h3 className="text-base sm:text-lg font-black text-gray-900 dark:text-white">
                  Edit Assessment Item
                </h3>
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleUpdateAssessment} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1 uppercase tracking-wider">
                    Assessment Title
                  </label>
                  <input 
                    type="text" 
                    value={editFormData.title}
                    onChange={e => setEditFormData({...editFormData, title: e.target.value})}
                    className="w-full px-3.5 py-2.5 text-xs sm:text-sm font-bold border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50/50 dark:bg-gray-900/50 text-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-[#003B5C]"
                    required 
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1 uppercase tracking-wider">
                      Category
                    </label>
                    <div className="relative">
                      <select 
                        value={editFormData.assessment_type}
                        onChange={e => setEditFormData({...editFormData, assessment_type: e.target.value})}
                        className="w-full pl-3 pr-7 py-2.5 text-xs font-bold border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50/50 dark:bg-gray-900/50 text-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-[#003B5C] appearance-none cursor-pointer"
                      >
                        <option value="class_work">Class Work</option>
                        <option value="homework">Homework</option>
                        <option value="mid_term">Mid Term</option>
                        <option value="project">Project</option>
                      </select>
                      <ChevronDown className="w-3.5 h-3.5 text-gray-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1 uppercase tracking-wider">
                      Max Score
                    </label>
                    <input 
                      type="number" 
                      value={editFormData.max_score}
                      onChange={e => setEditFormData({...editFormData, max_score: parseInt(e.target.value) || 0})}
                      className="w-full px-3 py-2.5 text-xs font-mono font-bold border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50/50 dark:bg-gray-900/50 text-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-[#003B5C]"
                      min="1"
                      required 
                    />
                  </div>
                </div>

                <div className="flex flex-col-reverse sm:flex-row justify-end gap-2.5 pt-2 border-t border-gray-100 dark:border-gray-750">
                  <button 
                    type="button"
                    onClick={() => setShowEditModal(false)}
                    className="w-full sm:w-auto px-4 py-2.5 text-xs font-bold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 rounded-xl transition"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    disabled={updating}
                    className="w-full sm:w-auto px-5 py-2.5 bg-[#003B5C] hover:bg-[#002a42] text-white rounded-xl text-xs font-bold shadow-md transition disabled:opacity-50 flex items-center justify-center gap-1.5"
                  >
                    {updating && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>Save Changes</span>
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