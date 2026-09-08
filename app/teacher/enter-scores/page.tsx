'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import BackButton from '@/components/ui/back-button'
import { Skeleton } from '@/components/ui/skeleton'
import { 
  GraduationCap, ArrowLeft, Save, Search, AlertCircle, 
  Edit2, Trash2, Plus, Users, ChevronDown, CheckCircle2, 
  Clock, FileText, Check, X, Loader2, Award, Filter
} from 'lucide-react'
import { getCurrentUser, getTeacherData, getTeacherAssignments } from '@/lib/auth'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'
import { toast } from 'react-hot-toast'

export default function EnterScores() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = getSupabaseBrowserClient()

  const [teacher, setTeacher] = useState<any>(null)
  const [assignments, setAssignments] = useState<any[]>([])
  const [selectedClass, setSelectedClass] = useState('')
  const [selectedSubject, setSelectedSubject] = useState('')
  const [selectedAssessment, setSelectedAssessment] = useState('')
  const [students, setStudents] = useState<any[]>([])
  const [scores, setScores] = useState<Record<string, number>>({})
  const [assessments, setAssessments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingScores, setLoadingScores] = useState(false)
  const [saving, setSaving] = useState(false)
  const [isDirty, setIsDirty] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  
  // Create Assessment Modal
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newAssessmentName, setNewAssessmentName] = useState('')
  const [newMaxScore, setNewMaxScore] = useState('100')
  const [newAssessmentType, setNewAssessmentType] = useState('class_work')
  const [creatingAssessment, setCreatingAssessment] = useState(false)

  // Edit Assessment Modal
  const [showEditModal, setShowEditModal] = useState(false)
  const [editAssessmentName, setEditAssessmentName] = useState('')
  const [editMaxScore, setEditMaxScore] = useState('100')
  const [editAssessmentType, setEditAssessmentType] = useState('class_work')
  const [updatingAssessment, setUpdatingAssessment] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [genderFilter, setGenderFilter] = useState('')

  const isReadOnly = teacher?.status === 'on_leave' || teacher?.status === 'on leave'

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
          
          const classParam = searchParams.get('classId')
          const subjectParam = searchParams.get('subjectId')
          
          if (classParam) setSelectedClass(classParam)
          if (subjectParam) setSelectedSubject(subjectParam)
        }
      }
      
      setLoading(false)
    }

    loadData()
  }, [router, searchParams])

  useEffect(() => {
    if (assessments.length > 0) {
      const assessmentParam = searchParams.get('assessmentId')
      if (assessmentParam && assessments.some(a => a.id === assessmentParam)) {
        setSelectedAssessment(assessmentParam)
      }
    }
  }, [assessments, searchParams])

  useEffect(() => {
    if (selectedClass && selectedSubject) {
      loadStudents()
      loadAssessments()
    } else {
      setStudents([])
      setAssessments([])
      setSelectedAssessment('')
    }
  }, [selectedClass, selectedSubject, teacher])

  useEffect(() => {
    async function loadExistingScores() {
      if (!selectedAssessment) {
        setScores({})
        return
      }

      setLoadingScores(true)
      try {
        const { data, error } = await supabase
          .from('student_scores')
          .select('student_id, score')
          .eq('assessment_id', selectedAssessment)

        if (error) throw error

        let loadedScores: Record<string, number> = {}
        if (data) {
          data.forEach((item: any) => {
            loadedScores[item.student_id] = item.score
          })
        }

        try {
          const draftKey = `draft_scores_${selectedAssessment}`
          const draft = sessionStorage.getItem(draftKey)
          if (draft) {
            const parsedDraft = JSON.parse(draft)
            if (Object.keys(parsedDraft).length > 0) {
              loadedScores = { ...loadedScores, ...parsedDraft }
              toast('Recovered unsaved draft.', { icon: '📝' })
              setTimeout(() => setIsDirty(true), 500)
            }
          }
        } catch(e) {}

        setScores(loadedScores)
      } catch (error) {
        console.error('Error loading scores:', error)
        toast.error('Failed to load existing scores')
      } finally {
        setLoadingScores(false)
      }
    }

    loadExistingScores()
  }, [selectedAssessment, supabase])

  // Draft Auto-save
  useEffect(() => {
    if (!selectedAssessment || !isDirty) return
    const timer = setTimeout(() => {
      const draftKey = `draft_scores_${selectedAssessment}`
      sessionStorage.setItem(draftKey, JSON.stringify(scores))
    }, 1000)
    return () => clearTimeout(timer)
  }, [scores, selectedAssessment, isDirty])

  // Beforeunload Warning
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault()
        e.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [isDirty])

  const loadStudents = async () => {
    const { data } = await supabase
      .from('students')
      .select(`
        id,
        student_id,
        first_name,
        last_name,
        middle_name,
        gender,
        profile_id,
        profiles!students_profile_id_fkey(full_name),
        classes(id, name, level, category)
      `)
      .eq('class_id', selectedClass)
      .eq('status', 'active')
      .order('last_name', { ascending: true })

    if (data) {
      setStudents(data)
    }
  }

  const loadAssessments = async () => {
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

    let query = supabase
      .from('assessments')
      .select('*')
      .eq('class_subject_id', classSubject.id)

    if (teacher?.id) {
      query = query.or(`created_by.eq.${teacher.id},created_by.is.null`)
    }

    const { data } = await query.order('assessment_date', { ascending: false })

    if (data) {
      setAssessments(data)
    }
  }

  const handleCreateAssessment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedClass || !selectedSubject) {
      toast.error('Please select a class and subject first')
      return
    }
    if (!newAssessmentName.trim()) {
      toast.error('Assessment name is required')
      return
    }

    setCreatingAssessment(true)
    try {
      const { data: currentTerm } = await supabase
        .from('academic_terms')
        .select('id, academic_year')
        .eq('is_current', true)
        .maybeSingle()
      const academicYear = currentTerm?.academic_year || new Date().getFullYear().toString()
      const termId = currentTerm?.id
      if (!termId) throw new Error('Current term not found')

      let { data: classSubject } = await supabase
        .from('class_subjects')
        .select('id')
        .eq('class_id', selectedClass)
        .eq('subject_id', selectedSubject)
        .eq('academic_year', academicYear)
        .maybeSingle()

      if (!classSubject) {
        const { data: newCS, error: createError } = await supabase
          .from('class_subjects')
          .insert({
            class_id: selectedClass,
            subject_id: selectedSubject,
            academic_year: academicYear,
            teacher_id: teacher?.id
          })
          .select('id')
          .single()

        if (createError) {
          if (createError.code === '23505') {
            const { data: existingCS } = await supabase
              .from('class_subjects')
              .select('id')
              .eq('class_id', selectedClass)
              .eq('subject_id', selectedSubject)
              .eq('academic_year', academicYear)
              .single()

            if (existingCS) {
              classSubject = existingCS
            } else {
              throw new Error('Class subject link missing and could not be created.')
            }
          } else {
            throw new Error('Class subject link missing and could not be created.')
          }
        } else {
          classSubject = newCS
        }
      }

      const { data, error } = await supabase
        .from('assessments')
        .insert({
          class_subject_id: classSubject.id,
          term_id: termId,
          title: newAssessmentName,
          assessment_type: newAssessmentType,
          max_score: parseFloat(newMaxScore),
          assessment_date: new Date().toISOString().split('T')[0],
          created_by: teacher?.id
        })
        .select()
        .single()

      if (error) throw error

      toast.success('Assessment created successfully')
      setAssessments([data, ...assessments])
      setSelectedAssessment(data.id)
      setShowCreateModal(false)
      setNewAssessmentName('')
      setNewMaxScore('100')
    } catch (error: any) {
      console.error('Error creating assessment:', error)
      toast.error('Failed to create assessment: ' + error.message)
    } finally {
      setCreatingAssessment(false)
    }
  }

  const openEditModal = () => {
    const assessment = assessments.find(a => a.id === selectedAssessment)
    if (!assessment) return

    setEditAssessmentName(assessment.title || assessment.assessment_name || '')
    setEditMaxScore((assessment.max_score || 100).toString())
    setEditAssessmentType(assessment.assessment_type || 'class_work')
    setShowEditModal(true)
  }

  const handleUpdateAssessment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedAssessment) return

    setUpdatingAssessment(true)
    try {
      const { error } = await supabase
        .from('assessments')
        .update({
          title: editAssessmentName,
          assessment_type: editAssessmentType,
          max_score: parseFloat(editMaxScore)
        })
        .eq('id', selectedAssessment)

      if (error) throw error

      toast.success('Assessment updated successfully')
      setAssessments(assessments.map(a => 
        a.id === selectedAssessment
          ? { 
              ...a, 
              title: editAssessmentName, 
              assessment_name: editAssessmentName, 
              assessment_type: editAssessmentType, 
              max_score: parseFloat(editMaxScore) 
            }
          : a
      ))
      setShowEditModal(false)
    } catch (error: any) {
      console.error('Error updating assessment:', error)
      toast.error('Failed to update assessment: ' + error.message)
    } finally {
      setUpdatingAssessment(false)
    }
  }

  const handleDeleteAssessment = async () => {
    if (!selectedAssessment) return
    const assessment = assessments.find(a => a.id === selectedAssessment)
    if (!assessment) return

    if (!confirm(`Delete "${assessment.title || assessment.assessment_name}"? All associated scores will be permanently removed.`)) return

    setDeletingId(selectedAssessment)
    try {
      const { error } = await supabase
        .from('assessments')
        .delete()
        .eq('id', selectedAssessment)

      if (error) throw error

      toast.success('Assessment deleted')
      setAssessments(assessments.filter(a => a.id !== selectedAssessment))
      setSelectedAssessment('')
      setScores({})
    } catch (error: any) {
      console.error('Error deleting assessment:', error)
      toast.error('Failed to delete assessment: ' + error.message)
    } finally {
      setDeletingId(null)
    }
  }

  const handleScoreChange = (studentId: string, value: string) => {
    if (isReadOnly) return
    const numValue = parseFloat(value)
    const currentAssessment = assessments.find(a => a.id === selectedAssessment)
    const maxScore = currentAssessment?.max_score || 100

    setIsDirty(true)
    
    if (!isNaN(numValue)) {
      if (numValue > maxScore) {
        toast.error(`Score cannot exceed max score of ${maxScore}`)
        return
      }
      if (numValue < 0) {
        toast.error('Score cannot be negative')
        return
      }
      setScores(prev => ({ ...prev, [studentId]: numValue }))
    } else if (value === '') {
      const newScores = { ...scores }
      delete newScores[studentId]
      setScores(newScores)
    }
  }

  const calculateGrade = (total: number) => {
    if (total >= 80) return 'A'
    if (total >= 70) return 'B'
    if (total >= 60) return 'C'
    if (total >= 50) return 'D'
    if (total >= 40) return 'E'
    return 'F'
  }

  const handleSaveScores = async () => {
    if (isReadOnly) return

    if (!selectedAssessment) {
      toast.error('Please select an assessment')
      return
    }

    setSaving(true)
    const toastId = toast.loading('Saving assessment scores...')

    try {
      const scoreEntries = Object.entries(scores).map(([studentId, score]) => ({
        assessment_id: selectedAssessment,
        student_id: studentId,
        score: score,
        entered_by: teacher?.id,
      }))

      const { error } = await supabase
        .from('student_scores')
        .upsert(scoreEntries, {
          onConflict: 'assessment_id,student_id',
        })

      if (error) throw error

      // Recalculate Class Scores
      const { data: assessmentData } = await supabase
        .from('assessments')
        .select('term_id')
        .eq('id', selectedAssessment)
        .single()
      
      const termId = assessmentData?.term_id

      if (termId) {
        const { data: classSubject } = await supabase
          .from('class_subjects')
          .select('id')
          .eq('class_id', selectedClass)
          .eq('subject_id', selectedSubject)
          .maybeSingle()

        if (classSubject) {
          const { data: termAssessments } = await supabase
            .from('assessments')
            .select('id, max_score')
            .eq('class_subject_id', classSubject.id)
            .eq('term_id', termId)

          if (termAssessments && termAssessments.length > 0) {
            const assessmentIds = termAssessments.map((a: any) => a.id)
            const assessmentMap = new Map(termAssessments.map((a: any) => [a.id, a.max_score]))
            const studentIds = Object.keys(scores)
            
            const { data: settings } = await supabase
              .from('system_settings')
              .select('setting_value')
              .eq('setting_key', 'class_score_percentage')
              .single()
            
            const classPercentage = settings?.setting_value ? Number(settings.setting_value) : 40

            await Promise.all(studentIds.map(async (studentId) => {
              const { data: studentScores } = await supabase
                .from('student_scores')
                .select('score, assessment_id')
                .in('assessment_id', assessmentIds)
                .eq('student_id', studentId)

              if (studentScores) {
                const totalScoreGotten = studentScores.reduce((sum: number, s: any) => sum + (s.score || 0), 0)
                const expectedScore = studentScores.reduce((sum: number, s: any) => {
                  const max = Number(assessmentMap.get(s.assessment_id)) || 10
                  return sum + max
                }, 0)
                
                let calculatedClassScore = 0
                if (expectedScore > 0) {
                  calculatedClassScore = (totalScoreGotten / expectedScore) * classPercentage
                }
                
                calculatedClassScore = Math.round(calculatedClassScore * 100) / 100

                const { data: existingScore } = await supabase
                  .from('scores')
                  .select('*')
                  .eq('student_id', studentId)
                  .eq('subject_id', selectedSubject)
                  .eq('term_id', termId)
                  .maybeSingle()

                const examScore = existingScore?.exam_score || 0
                const total = calculatedClassScore + examScore
                const grade = calculateGrade(total)

                if (teacher?.id) {
                  await supabase
                    .from('scores')
                    .upsert({
                      student_id: studentId,
                      subject_id: selectedSubject,
                      term_id: termId,
                      class_id: selectedClass,
                      teacher_id: teacher?.id,
                      class_score: calculatedClassScore,
                      exam_score: examScore,
                      total: total,
                      grade: grade,
                      remarks: existingScore?.remarks || ''
                    }, {
                      onConflict: 'student_id,subject_id,term_id'
                    })
                }
              }
            }))
          }
        }
      }

      toast.success('Scores saved and class totals updated!', { id: toastId })
      setIsDirty(false)
      setLastSaved(new Date())
      sessionStorage.removeItem(`draft_scores_${selectedAssessment}`)

    } catch (err: any) {
      console.error('Error saving scores:', err)
      toast.error('Failed to save scores: ' + err.message, { id: toastId })
    } finally {
      setSaving(false)
    }
  }

  const filteredStudents = useMemo(() => {
    return students.filter(student => {
      const fullName = (student.profiles?.full_name || `${student.first_name} ${student.last_name}`).toLowerCase()
      const genderMatch = !genderFilter || student.gender?.toLowerCase() === genderFilter.toLowerCase()
      
      if (!searchQuery) return genderMatch
      
      return (
        fullName.includes(searchQuery.toLowerCase()) || 
        student.student_id?.toLowerCase().includes(searchQuery.toLowerCase())
      ) && genderMatch
    })
  }, [students, searchQuery, genderFilter])

  const selectedAssessmentObj = assessments.find(a => a.id === selectedAssessment)
  const currentMaxScore = selectedAssessmentObj?.max_score || 100

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50/50 dark:bg-gray-900 pb-20 p-4 sm:p-6 lg:p-8 space-y-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <Skeleton className="h-16 w-full rounded-2xl" />
          <Skeleton className="h-40 w-full rounded-3xl" />
          <Skeleton className="h-96 w-full rounded-3xl" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50/50 dark:bg-gray-900 pb-28 font-sans text-gray-900 dark:text-gray-100 transition-colors">
      <style jsx global>{`
        input[type=number]::-webkit-inner-spin-button, 
        input[type=number]::-webkit-outer-spin-button { 
          -webkit-appearance: none; 
          margin: 0; 
        }
        input[type=number] {
          -moz-appearance: textfield;
        }
      `}</style>
      
      {/* Sticky Header Banner */}
      <header className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-md border-b border-gray-200/80 dark:border-gray-800 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 sm:py-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start sm:items-center space-x-3 sm:space-x-4 min-w-0">
              <BackButton href="/teacher/dashboard" className="shrink-0 mt-0.5 sm:mt-0 shadow-sm" />
              <div className="min-w-0">
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-gray-900 dark:text-white flex items-center gap-2 truncate">
                  <GraduationCap className="w-5 h-5 sm:w-6 sm:h-6 text-[#003B5C] dark:text-blue-400 shrink-0" />
                  <span>Enter Assessment Scores</span>
                </h1>
                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 font-medium truncate">
                  Log raw marks for class work, homework, quizzes, and projects
                </p>
              </div>
            </div>

            {selectedAssessment && (
              <button
                onClick={handleSaveScores}
                disabled={saving || loadingScores || isReadOnly}
                className={`hidden sm:inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold shadow-md hover:shadow-lg transition-all active:scale-95 text-white shrink-0 disabled:opacity-50 ${
                  isDirty 
                    ? 'bg-amber-600 hover:bg-amber-700' 
                    : 'bg-[#003B5C] hover:bg-[#002a42]'
                }`}
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>{isDirty ? 'Save Changes' : 'Save Scores'}</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </header>
      
      <main className="max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-5 sm:space-y-6">
        {isReadOnly && (
          <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-2xl p-4 flex items-center gap-3 text-xs sm:text-sm text-amber-900 dark:text-amber-200">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
            <p>
              <strong>Read-Only Mode:</strong> You are currently marked as &ldquo;On Leave&rdquo;. You can review student scores but cannot enter or modify assessment records.
            </p>
          </div>
        )}

        {/* Selection Configuration Card */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl sm:rounded-3xl shadow-sm border border-gray-200/80 dark:border-gray-700 p-4 sm:p-5 md:p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
            {/* Class Dropdown */}
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5 uppercase tracking-wider">
                Class Cohort <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <select
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                  className="w-full pl-4 sm:pl-5 pr-10 py-2.5 sm:py-3 text-xs sm:text-sm font-bold border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50/50 dark:bg-gray-900/50 text-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-[#003B5C] appearance-none cursor-pointer"
                >
                  <option value="">Select class</option>
                  {Array.from(new Set(assignments.map(a => a.class_id))).map((classId) => {
                    const assignment = assignments.find(a => a.class_id === classId)
                    return (
                      <option key={classId} value={classId}>
                        {assignment?.classes?.name}
                      </option>
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
                  value={selectedSubject}
                  onChange={(e) => setSelectedSubject(e.target.value)}
                  disabled={!selectedClass}
                  className="w-full pl-4 sm:pl-5 pr-10 py-2.5 sm:py-3 text-xs sm:text-sm font-bold border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50/50 dark:bg-gray-900/50 text-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-[#003B5C] appearance-none cursor-pointer disabled:opacity-50"
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

            {/* Assessment Dropdown with Integrated Action Toolbar */}
            <div className="sm:col-span-2 lg:col-span-1">
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5 uppercase tracking-wider">
                Assessment Item <span className="text-rose-500">*</span>
              </label>
              <div className="flex items-center gap-2">
                <div className="relative flex-1 min-w-0">
                  <select
                    value={selectedAssessment}
                    onChange={(e) => setSelectedAssessment(e.target.value)}
                    disabled={!selectedSubject}
                    className="w-full pl-4 sm:pl-5 pr-10 py-2.5 sm:py-3 text-xs sm:text-sm font-bold border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50/50 dark:bg-gray-900/50 text-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-[#003B5C] appearance-none cursor-pointer disabled:opacity-50 truncate"
                  >
                    <option value="">{selectedSubject ? 'Select assessment' : 'Select subject first'}</option>
                    {assessments.map((assessment) => (
                      <option key={assessment.id} value={assessment.id}>
                        {assessment.title || assessment.assessment_name} (Max {assessment.max_score || 100})
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {selectedAssessment && (
                    <>
                      <button
                        type="button"
                        onClick={openEditModal}
                        disabled={isReadOnly}
                        className="p-2.5 sm:p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 transition disabled:opacity-40 shadow-sm"
                        title="Edit assessment"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={handleDeleteAssessment}
                        disabled={isReadOnly || deletingId === selectedAssessment}
                        className="p-2.5 sm:p-3 rounded-xl border border-rose-200 dark:border-rose-900/40 bg-rose-50/70 dark:bg-rose-950/30 hover:bg-rose-100 text-rose-600 dark:text-rose-400 transition disabled:opacity-40 shadow-sm"
                        title="Delete assessment"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </>
                  )}

                  <button
                    type="button"
                    onClick={() => setShowCreateModal(true)}
                    disabled={!selectedSubject || isReadOnly}
                    className="p-2.5 sm:p-3 rounded-xl bg-[#003B5C] hover:bg-[#002a42] text-white shadow-md transition active:scale-95 disabled:opacity-40 flex items-center justify-center"
                    title="Create new assessment"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
          
          {/* Search & Gender Filter Row */}
          {selectedAssessment && (
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-3 border-t border-gray-100 dark:border-gray-750">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 flex-1">
                <div className="relative flex-1 sm:max-w-xs">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input 
                    type="text" 
                    placeholder="Search student or ID..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50/50 dark:bg-gray-900/50 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-[#003B5C]"
                  />
                </div>

                <div className="relative w-full sm:w-44">
                  <select 
                    value={genderFilter}
                    onChange={(e) => setGenderFilter(e.target.value)}
                    className="w-full pl-3.5 pr-8 py-2 text-xs sm:text-sm font-bold border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50/50 dark:bg-gray-900/50 text-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-[#003B5C] appearance-none cursor-pointer"
                  >
                    <option value="">All Genders</option>
                    <option value="Male">Boys Only</option>
                    <option value="Female">Girls Only</option>
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              <span className="text-xs text-gray-400 font-medium self-end sm:self-auto">
                Showing {filteredStudents.length} of {students.length} students
              </span>
            </div>
          )}
        </div>

        {/* Scores Workspace */}
        {selectedClass && selectedSubject && selectedAssessment ? (
          <div className="bg-white dark:bg-gray-800 rounded-2xl sm:rounded-3xl shadow-sm border border-gray-200/80 dark:border-gray-700 overflow-hidden">
            {/* Status Strip */}
            <div className="p-4 sm:p-5 border-b border-gray-100 dark:border-gray-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gray-50/50 dark:bg-gray-850">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm sm:text-base font-black text-gray-900 dark:text-white">
                    {selectedAssessmentObj?.title || selectedAssessmentObj?.assessment_name}
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-[#003B5C]/10 text-[#003B5C] dark:bg-[#003B5C]/30 dark:text-blue-300">
                    Max: {currentMaxScore} Marks
                  </span>
                </div>
                
                <div className="text-xs text-gray-400 mt-1 flex items-center gap-2 flex-wrap">
                  {loadingScores ? (
                    <span className="text-blue-600 animate-pulse font-medium">Loading saved scores...</span>
                  ) : lastSaved ? (
                    <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                      Last saved: {lastSaved.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  ) : (
                    <span>Not saved yet this session</span>
                  )}

                  {isDirty && !saving && !loadingScores && (
                    <span className="text-amber-700 dark:text-amber-300 font-bold bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-800 text-[11px]">
                      Unsaved Changes
                    </span>
                  )}
                </div>
              </div>

              <div className="text-xs text-gray-400 font-medium self-end sm:self-auto">
                {Object.keys(scores).length} of {students.length} scored
              </div>
            </div>

            {/* MOBILE CARD VIEW (< md) */}
            <div className="block md:hidden divide-y divide-gray-100 dark:divide-gray-800">
              {filteredStudents.length === 0 ? (
                <div className="p-8 text-center text-xs text-gray-400">
                  No students found matching your filter criteria
                </div>
              ) : (
                filteredStudents.map((student) => {
                  const val = scores[student.id] !== undefined ? scores[student.id] : ''
                  return (
                    <div key={student.id} className="p-4 flex items-center justify-between gap-3 hover:bg-gray-50/50 dark:hover:bg-gray-750/50 transition">
                      <div className="min-w-0 flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-[#003B5C]/10 dark:bg-[#003B5C]/25 text-[#003B5C] dark:text-blue-300 font-black text-xs flex items-center justify-center shrink-0">
                          {student.first_name[0]}{student.last_name[0]}
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-bold text-xs sm:text-sm text-gray-900 dark:text-white truncate">
                            {[student.last_name, student.first_name].filter(Boolean).join(', ')}
                          </h4>
                          <p className="text-[11px] text-gray-400 font-mono mt-0.5">
                            {student.student_id} {student.gender ? `• ${student.gender}` : ''}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <div className="relative">
                          <input
                            type="number"
                            min="0"
                            max={currentMaxScore}
                            step="0.1"
                            placeholder="—"
                            disabled={isReadOnly}
                            value={val}
                            onChange={(e) => handleScoreChange(student.id, e.target.value)}
                            className="w-20 h-10 px-2 text-center font-mono font-bold text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-[#003B5C] disabled:opacity-40"
                          />
                        </div>
                        <span className="text-[11px] text-gray-400 font-bold">/ {currentMaxScore}</span>
                      </div>
                    </div>
                  )
                })
              )}
            </div>

            {/* TABLET & DESKTOP TABLE VIEW (≥ md) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[650px]">
                <thead>
                  <tr className="bg-gray-50/80 dark:bg-gray-900/60 border-b border-gray-200 dark:border-gray-700 text-[11px] font-black text-gray-400 uppercase tracking-wider">
                    <th className="p-4 w-36">Student ID</th>
                    <th className="p-4">Student Name</th>
                    <th className="p-4 text-center w-28">Gender</th>
                    <th className="p-4 text-center w-40">Score (Max: {currentMaxScore})</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-750 text-xs sm:text-sm font-medium">
                  {filteredStudents.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-8 text-center text-gray-400 text-xs">
                        No students found matching your filter criteria
                      </td>
                    </tr>
                  ) : (
                    filteredStudents.map((student) => {
                      const val = scores[student.id] !== undefined ? scores[student.id] : ''
                      return (
                        <tr key={student.id} className="hover:bg-gray-50/60 dark:hover:bg-gray-750/50 transition">
                          <td className="p-4 whitespace-nowrap font-mono text-gray-500 dark:text-gray-400">
                            {student.student_id}
                          </td>
                          <td className="p-4 whitespace-nowrap font-bold text-gray-900 dark:text-white">
                            {[student.last_name, student.middle_name, student.first_name].filter(Boolean).join(', ')}
                          </td>
                          <td className="p-4 text-center whitespace-nowrap text-gray-500 dark:text-gray-400">
                            {student.gender || '—'}
                          </td>
                          <td className="p-4 text-center whitespace-nowrap">
                            <input
                              type="number"
                              min="0"
                              max={currentMaxScore}
                              step="0.1"
                              disabled={isReadOnly}
                              value={val}
                              onChange={(e) => handleScoreChange(student.id, e.target.value)}
                              className="w-24 px-3 py-1.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-center font-mono font-bold text-sm outline-none focus:ring-2 focus:ring-[#003B5C] disabled:opacity-40"
                              placeholder="0.0"
                            />
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-3xl p-10 sm:p-14 border border-dashed border-gray-200 dark:border-gray-700 max-w-lg mx-auto text-center space-y-3 shadow-sm">
            <Search className="w-14 h-14 text-gray-300 dark:text-gray-600 mx-auto" />
            <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">Select Assessment Workspace</h3>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
              Choose a class cohort, subject, and assessment item above to begin recording student marks.
            </p>
          </div>
        )}
      </main>

      {/* Floating Bottom Save Bar on Mobile */}
      {selectedAssessment && (
        <div className="fixed bottom-4 left-4 right-4 z-40 sm:hidden animate-in slide-in-from-bottom-4">
          <button
            type="button"
            onClick={handleSaveScores}
            disabled={saving || loadingScores || isReadOnly}
            className={`w-full py-3.5 px-6 rounded-2xl font-black text-sm shadow-2xl flex items-center justify-center gap-2 active:scale-95 transition-all text-white ${
              isDirty 
                ? 'bg-amber-600 hover:bg-amber-700' 
                : 'bg-[#003B5C] hover:bg-[#002a42]'
            } disabled:opacity-50`}
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Saving Scores...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>{isDirty ? 'Save Unsaved Changes' : 'Save Scores'}</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Create Assessment Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-gray-800 rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 max-w-md w-full shadow-2xl border-t sm:border border-gray-100 dark:border-gray-700 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-700 pb-3">
              <h3 className="text-base sm:text-lg font-black text-gray-900 dark:text-white">Create New Assessment</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateAssessment} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1 uppercase tracking-wider">
                  Assessment Title
                </label>
                <input 
                  type="text" 
                  value={newAssessmentName}
                  onChange={e => setNewAssessmentName(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs sm:text-sm font-bold border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50/50 dark:bg-gray-900/50 text-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-[#003B5C]"
                  placeholder="e.g. Class Exercise 1"
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
                      value={newAssessmentType}
                      onChange={e => setNewAssessmentType(e.target.value)}
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
                    value={newMaxScore}
                    onChange={e => setNewMaxScore(e.target.value)}
                    className="w-full px-3 py-2.5 text-xs font-mono font-bold border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50/50 dark:bg-gray-900/50 text-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-[#003B5C]"
                    min="1"
                    required 
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-gray-100 dark:border-gray-700">
                <button 
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2.5 text-xs font-bold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 rounded-xl transition"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={creatingAssessment}
                  className="px-5 py-2.5 bg-[#003B5C] hover:bg-[#002a42] text-white rounded-xl text-xs font-bold shadow-md transition disabled:opacity-50 flex items-center gap-1.5"
                >
                  {creatingAssessment && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Create Assessment</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Assessment Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-gray-800 rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 max-w-md w-full shadow-2xl border-t sm:border border-gray-100 dark:border-gray-700 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-700 pb-3">
              <h3 className="text-base sm:text-lg font-black text-gray-900 dark:text-white">Edit Assessment</h3>
              <button
                onClick={() => setShowEditModal(false)}
                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
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
                  value={editAssessmentName}
                  onChange={e => setEditAssessmentName(e.target.value)}
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
                      value={editAssessmentType}
                      onChange={e => setEditAssessmentType(e.target.value)}
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
                    value={editMaxScore}
                    onChange={e => setEditMaxScore(e.target.value)}
                    className="w-full px-3 py-2.5 text-xs font-mono font-bold border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50/50 dark:bg-gray-900/50 text-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-[#003B5C]"
                    min="1"
                    required 
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-gray-100 dark:border-gray-700">
                <button 
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2.5 text-xs font-bold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 rounded-xl transition"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={updatingAssessment}
                  className="px-5 py-2.5 bg-[#003B5C] hover:bg-[#002a42] text-white rounded-xl text-xs font-bold shadow-md transition disabled:opacity-50 flex items-center gap-1.5"
                >
                  {updatingAssessment && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}