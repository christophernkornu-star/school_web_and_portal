'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import BackButton from '@/components/ui/BackButton'
import { Skeleton } from '@/components/ui/skeleton'
import { GraduationCap, ArrowLeft, Save, Search, AlertCircle, Edit, Trash2 } from 'lucide-react'
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
  
  // New state for creating assessment
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newAssessmentName, setNewAssessmentName] = useState('')
  const [newMaxScore, setNewMaxScore] = useState('100')
  const [newAssessmentType, setNewAssessmentType] = useState('class_work')
  const [creatingAssessment, setCreatingAssessment] = useState(false)

  // Edit Assessment State
  const [showEditModal, setShowEditModal] = useState(false)
  const [editAssessmentName, setEditAssessmentName] = useState('')
  const [editMaxScore, setEditMaxScore] = useState('100')
  const [editAssessmentType, setEditAssessmentType] = useState('class_work')
  const [updatingAssessment, setUpdatingAssessment] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

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
          
          // Pre-select values from query params if available
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

  // Add a new useEffect to handle assessment selection logic
  useEffect(() => {
     if (assessments.length > 0) {
        const assessmentParam = searchParams.get('assessmentId')
        if (assessmentParam && assessments.some(a => a.id === assessmentParam)) {
            setSelectedAssessment(assessmentParam)
        }
     }
  }, [assessments, searchParams])

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
        // Get class_subject_id
        const { data: classSubject } = await supabase
          .from('class_subjects')
          .select('id')
          .eq('class_id', selectedClass)
          .eq('subject_id', selectedSubject)
          .single()
        
        if (!classSubject) throw new Error('Class subject not found')

        // Get current term
        const { data: terms } = await supabase
            .from('academic_terms')
            .select('id')
            .eq('is_current', true)
            .limit(1)
        
        const termId = terms?.[0]?.id
        if (!termId) throw new Error('Current term not found')

        const { data, error } = await supabase
            .from('assessments')
            .insert({
                class_subject_id: classSubject.id,
                term_id: termId,
                title: newAssessmentName, // Using title as per schema
                assessment_type: newAssessmentType,
                max_score: parseFloat(newMaxScore),
                assessment_date: new Date().toISOString().split('T')[0]
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

    setEditAssessmentName(assessment.title || assessment.assessment_name)
    setEditMaxScore(assessment.max_score.toString())
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
        
        // Update local state
        setAssessments(assessments.map(a => 
            a.id === selectedAssessment
                ? { ...a, title: editAssessmentName, assessment_name: editAssessmentName, assessment_type: editAssessmentType, max_score: parseFloat(editMaxScore) }
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

    if (!confirm(`Are you sure you want to delete "${assessment.title || assessment.assessment_name}"? This will remove all student scores associated with this assessment.`)) return

    setDeletingId(selectedAssessment)
    try {
        const { error } = await supabase
            .from('assessments')
            .delete()
            .eq('id', selectedAssessment)

        if (error) throw error

        toast.success('Assessment deleted successfully')
        setAssessments(assessments.filter(a => a.id !== selectedAssessment))
        setSelectedAssessment('') // Reset selection
        setScores({}) // Clear visible scores
    } catch (error: any) {
        console.error('Error deleting assessment:', error)
        toast.error('Failed to delete assessment: ' + error.message)
    } finally {
        setDeletingId(null)
    }
  }

  useEffect(() => {
    if (selectedClass && selectedSubject) {
      loadStudents()
      loadAssessments()
    }
  }, [selectedClass, selectedSubject])

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

        if (data) {
          const loadedScores: Record<string, number> = {}
          data.forEach((item: any) => {
            loadedScores[item.student_id] = item.score
          })
          setScores(loadedScores)
        }
      } catch (error) {
        console.error('Error loading scores:', error)
        toast.error('Failed to load existing scores')
      } finally {
        setLoadingScores(false)
      }
    }

    loadExistingScores()
  }, [selectedAssessment])

  const loadStudents = async () => {
    const { data, error } = await supabase
      .from('students')
      .select(`
        id,
        student_id,
        first_name,
        last_name,
        middle_name,
        profile_id,
        profiles!students_profile_id_fkey(full_name),
        classes(id, name, level, category)
      `)
      .eq('class_id', selectedClass)
      .eq('status', 'active')
      .order('first_name', { ascending: true })

    if (data) {
      setStudents(data)
    }
  }

  const loadAssessments = async () => {
    // Get class_subject_id first
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

    const { data, error } = await supabase
      .from('assessments')
      .select('*')
      .eq('class_subject_id', classSubject.id)
      .order('assessment_date', { ascending: false })

    if (data) {
      setAssessments(data)
    }
  }

  const handleScoreChange = (studentId: string, value: string) => {
    if (isReadOnly) return
    const numValue = parseFloat(value)
    
    // Find current assessment max score
    const currentAssessment = assessments.find(a => a.id === selectedAssessment)
    const maxScore = currentAssessment?.max_score || 10

    setIsDirty(true)
    
    if (!isNaN(numValue)) {
      if (numValue > maxScore) {
        toast.error(`Score cannot be greater than ${maxScore}`)
        return
      }
      setScores({ ...scores, [studentId]: numValue })
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
    const toastId = toast.loading('Saving scores...')

    try {
      // 1. Save individual assessment scores
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

      if (error) {
        throw error
      }

      // 2. Recalculate Class Scores for affected students
      // Get term_id from the selected assessment
      const { data: assessmentData } = await supabase
        .from('assessments')
        .select('term_id')
        .eq('id', selectedAssessment)
        .single()
      
      const termId = assessmentData?.term_id

      if (termId) {
        // Get class_subject_id first
        const { data: classSubject } = await supabase
          .from('class_subjects')
          .select('id')
          .eq('class_id', selectedClass)
          .eq('subject_id', selectedSubject)
          .maybeSingle()

        if (classSubject) {
          // Get all assessments for this class, subject, and term
          const { data: termAssessments } = await supabase
            .from('assessments')
            .select('id, max_score')
            .eq('class_subject_id', classSubject.id)
            .eq('term_id', termId)

          if (termAssessments && termAssessments.length > 0) {
          const assessmentIds = termAssessments.map((a: any) => a.id)
          const assessmentMap = new Map(termAssessments.map((a: any) => [a.id, a.max_score]))
          const studentIds = Object.keys(scores)
          
          // Get grading settings
          const { data: settings } = await supabase
              .from('system_settings')
              .select('setting_value')
              .eq('setting_key', 'class_score_percentage')
              .single()
          
          const classPercentage = settings?.setting_value ? Number(settings.setting_value) : 40

          // Process each student
          await Promise.all(studentIds.map(async (studentId) => {
            // Get all scores for this student in this term's assessments
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
              
              // Round to 2 decimal places
              calculatedClassScore = Math.round(calculatedClassScore * 100) / 100

              // Update scores table
              // First get existing score to preserve exam_score
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

              if (!teacher?.id) {
                console.error("Teacher ID not found")
                return
              }

              await supabase
                .from('scores')
                .upsert({
                  student_id: studentId,
                  subject_id: selectedSubject,
                  term_id: termId,
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
          }))
        }
       }
      }

      toast.success('Scores saved and class scores updated successfully!', { id: toastId })
      setIsDirty(false)
      setLastSaved(new Date())
      
      // Redirect back to Review page if we were editing or created from there
      setTimeout(() => {
          if (searchParams.get('classId')) {
             router.push(`/teacher/review-assessments`) // Or ideally maintain the selection state in review page, but simple redirect is fine
          }
      }, 1500)

    } catch (err: any) {
      console.error('Error saving scores:', err)
      toast.error('An error occurred while saving scores: ' + err.message, { id: toastId })
    }

    setSaving(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="ghana-flag-border bg-white shadow-md mb-8">
            <div className="container mx-auto px-4 md:px-6 py-4 flex justify-between items-center">
                 <div className="flex items-center space-x-3">
                    <Skeleton className="w-10 h-10 rounded-full" />
                    <div>
                        <Skeleton className="w-48 h-5 mb-1" />
                        <Skeleton className="w-32 h-3" />
                    </div>
                </div>
                <Skeleton className="w-24 h-8 rounded" />
            </div>
        </header>
        <main className="max-w-7xl mx-auto px-4 space-y-8">
             <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Skeleton className="h-10 w-full rounded-md" />
                    <Skeleton className="h-10 w-full rounded-md" />
                    <Skeleton className="h-10 w-full rounded-md" />
                </div>
             </div>
             
             <div className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-100">
                <div className="p-4 border-b border-gray-100">
                     <Skeleton className="h-6 w-48" />
                </div>
                <div className="p-4 space-y-4">
                     {[...Array(5)].map((_, i) => (
                        <div key={i} className="flex gap-4">
                            <Skeleton className="h-12 w-full rounded-md" />
                        </div>
                     ))}
                </div>
             </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="ghana-flag-border bg-white shadow-md">
        <nav className="container mx-auto px-4 md:px-6 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center space-x-3">
              <GraduationCap className="w-8 h-8 md:w-10 md:h-10 text-ghana-green" />
              <div>
                <h1 className="text-base md:text-xl font-bold text-ghana-green">
                  Biriwa Methodist 'C' Basic School
                </h1>
                <p className="text-[10px] md:text-xs text-gray-600">Teacher Portal - Enter Scores</p>
              </div>
            </div>
            <BackButton 
              label="Back to Dashboard" 
              className="text-gray-700 hover:text-ghana-green gap-2" 
            />
          </div>
        </nav>
        
        <main className="max-w-7xl mx-auto px-4 py-8 space-y-8">
          {isReadOnly && (
            <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-md shadow-sm">
              <div className="flex items-center">
                <AlertCircle className="w-5 h-5 text-amber-500 mr-2" />
                <div>
                  <p className="font-bold text-amber-700">Read-Only Access</p>
                  <p className="text-sm text-amber-600">
                    You are currently marked as "On Leave". You can view scores but cannot enter or modify them.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl md:text-2xl font-bold text-gray-800 mb-2">
                Enter Student Scores
              </h2>
              <p className="text-sm text-gray-500">
                {selectedClass && selectedSubject && selectedAssessment
                  ? `Class: ${assignments.find(a => a.class_id === selectedClass)?.classes?.name} | Subject: ${assignments.find(a => a.subject_id === selectedSubject)?.subjects?.name} | Assessment: ${assessments.find(a => a.id === selectedAssessment)?.assessment_name}` 
                  : 'Please select a class, subject, and assessment to begin.'}
              </p>
            </div>
          </div>

          {/* Selection Filters */}
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <div className="grid md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-xs md:text-sm font-medium text-gray-700 mb-2">
                  Select Class
                </label>
                <select
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                  className="input-field"
                >
                  <option value="">-- Select Class --</option>
                  {Array.from(new Set(assignments.map(a => a.class_id))).map((classId) => {
                    const assignment = assignments.find(a => a.class_id === classId)
                    return (
                      <option key={classId} value={classId}>
                        {assignment?.classes?.name}
                      </option>
                    )
                  })}
                </select>
              </div>

              <div>
                <label className="block text-xs md:text-sm font-medium text-gray-700 mb-2">
                  Select Subject
                </label>
                <select
                  value={selectedSubject}
                  onChange={(e) => setSelectedSubject(e.target.value)}
                  className="input-field"
                  disabled={!selectedClass}
                >
                  <option value="">-- Select Subject --</option>
                  {(() => {
                    // Get the category and map to level
                    const selectedClassData = assignments.find(a => a.class_id === selectedClass)
                    const category = selectedClassData?.classes?.category
                    const classLevel = category === 'Lower Primary' ? 'lower_primary' 
                      : category === 'Upper Primary' ? 'upper_primary'
                      : category === 'Junior High' ? 'jhs'
                      : null
                    
                    // Filter subjects by level, avoiding duplicates
                    const subjectIds = new Set<string>()
                    return assignments
                      .filter(a => {
                        // Filter by level if available, otherwise by class_id
                        if (classLevel && a.subjects?.level) {
                          if (a.subjects.level !== classLevel) return false
                        } else {
                          if (a.class_id !== selectedClass) return false
                        }
                        
                        // Avoid duplicate subjects
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

              <div>
                <label className="block text-xs md:text-sm font-medium text-gray-700 mb-2">
                  Select Assessment
                </label>
                <div className="flex gap-2">
                  <select
                    value={selectedAssessment}
                    onChange={(e) => setSelectedAssessment(e.target.value)}
                    className="input-field flex-1"
                    disabled={!selectedSubject}
                  >
                    <option value="">-- Select Assessment --</option>
                    {assessments.map((assessment) => (
                      <option key={assessment.id} value={assessment.id}>
                        {assessment.title || assessment.assessment_name} ({assessment.assessment_type || 'Assessment'})
                      </option>
                    ))}
                  </select>
                  
                  {selectedAssessment && (
                    <>
                        <button
                            onClick={openEditModal}
                            disabled={isReadOnly}
                            className="bg-gray-100 text-gray-700 border border-gray-300 px-3 py-2 rounded-md hover:bg-gray-200 disabled:opacity-50"
                            title="Edit Assessment"
                        >
                            <Edit className="w-4 h-4" />
                        </button>
                        <button
                            onClick={handleDeleteAssessment}
                            disabled={isReadOnly || deletingId === selectedAssessment}
                            className="bg-red-50 text-red-600 border border-red-200 px-3 py-2 rounded-md hover:bg-red-100 disabled:opacity-50"
                            title="Delete Assessment"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </>
                  )}

                  <button
                    onClick={() => setShowCreateModal(true)}
                    disabled={!selectedSubject || isReadOnly}
                    className="bg-blue-600 text-white px-3 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
                    title="Create New Assessment"
                  >
                    <span className="text-xl">+</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Edit Assessment Modal */
          showEditModal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-lg p-6 max-w-md w-full">
                    <h3 className="text-lg font-bold mb-4">Edit Assessment</h3>
                    <form onSubmit={handleUpdateAssessment} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">Title</label>
                            <input 
                                type="text" 
                                value={editAssessmentName}
                                onChange={e => setEditAssessmentName(e.target.value)}
                                className="w-full p-2 border rounded"
                                required 
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Type</label>
                            <select 
                                value={editAssessmentType}
                                onChange={e => setEditAssessmentType(e.target.value)}
                                className="w-full p-2 border rounded"
                            >
                                <option value="class_work">Class Work</option>
                                <option value="homework">Homework</option>
                                <option value="mid_term">Mid Term</option>
                                <option value="project">Project</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Max Score</label>
                            <input 
                                type="number" 
                                value={editMaxScore}
                                onChange={e => setEditMaxScore(e.target.value)}
                                className="w-full p-2 border rounded"
                                min="1"
                                required 
                            />
                        </div>
                        <div className="flex justify-end gap-2 pt-2">
                            <button 
                                type="button"
                                onClick={() => setShowEditModal(false)}
                                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded"
                            >
                                Cancel
                            </button>
                            <button 
                                type="submit"
                                disabled={updatingAssessment}
                                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                            >
                                {updatingAssessment ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
          )}

          {/* Create Assessment Modal */
          showCreateModal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-lg p-6 max-w-md w-full">
                    <h3 className="text-lg font-bold mb-4">Create New Assessment</h3>
                    <form onSubmit={handleCreateAssessment} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">Title</label>
                            <input 
                                type="text" 
                                value={newAssessmentName}
                                onChange={e => setNewAssessmentName(e.target.value)}
                                className="w-full p-2 border rounded"
                                placeholder="e.g. Class Exercise 1"
                                required 
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Type</label>
                            <select 
                                value={newAssessmentType}
                                onChange={e => setNewAssessmentType(e.target.value)}
                                className="w-full p-2 border rounded"
                            >
                                <option value="class_work">Class Work</option>
                                <option value="homework">Homework</option>
                                <option value="mid_term">Mid Term</option>
                                <option value="project">Project</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Max Score</label>
                            <input 
                                type="number" 
                                value={newMaxScore}
                                onChange={e => setNewMaxScore(e.target.value)}
                                className="w-full p-2 border rounded"
                                min="1"
                                required 
                            />
                        </div>
                        <div className="flex justify-end gap-2 pt-2">
                            <button 
                                type="button"
                                onClick={() => setShowCreateModal(false)}
                                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded"
                            >
                                Cancel
                            </button>
                            <button 
                                type="submit"
                                disabled={creatingAssessment}
                                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                            >
                                {creatingAssessment ? 'Creating...' : 'Create'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
          )}

          {/* Students Table */}
          {selectedClass && selectedSubject && selectedAssessment && (
            <div className="bg-white rounded-lg shadow-lg overflow-hidden">
              <div className="p-4 md:p-6 border-b">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex flex-col">
                    <h3 className="text-base md:text-lg font-bold text-gray-800">
                      Enter Scores for {students.length} Students
                    </h3>
                    <div className="text-xs text-gray-500 mt-1 flex items-center gap-2">
                       {loadingScores ? (
                         <span className="text-blue-600 animate-pulse">Loading saved scores...</span>
                       ) : lastSaved ? (
                         <span className="text-green-600">Last saved: {lastSaved.toLocaleTimeString()}</span>
                       ) : (
                         <span>Not saved yet this session</span>
                       )}
                       {isDirty && !saving && !loadingScores && (
                          <span className="text-amber-600 font-medium bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                            Unsaved Changes
                          </span>
                       )}
                    </div>
                  </div>
                  <button
                    onClick={handleSaveScores}
                    disabled={saving || loadingScores || isReadOnly}
                    className={`flex items-center justify-center space-x-2 px-4 py-2 rounded-md transition-all w-full sm:w-auto ${
                        isDirty 
                        ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-md' 
                        : 'bg-ghana-green text-white hover:bg-ghana-green/90'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    <Save className={`w-4 h-4 ${saving ? 'animate-spin' : ''}`} />
                    <span>{saving ? 'Saving...' : isDirty ? 'Save Changes' : 'Save Scores'}</span>
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-ghana-green text-white">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs md:text-sm font-semibold uppercase">
                        Student ID
                      </th>
                      <th className="px-6 py-3 text-left text-xs md:text-sm font-semibold uppercase">
                        Student Name
                      </th>
                      <th className="px-6 py-3 text-center text-xs md:text-sm font-semibold uppercase">
                        Score
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {students.map((student) => (
                      <tr key={student.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-xs md:text-sm font-medium text-gray-900">
                          {student.student_id}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                          {student.last_name}, {student.middle_name ? student.middle_name + ', ' : ''}{student.first_name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          {loadingScores ? (
                            <div className="w-24 h-10 mx-auto bg-gray-100 animate-pulse rounded" />
                          ) : (
                            <input
                              type="number"
                              min="0"
                              max="100"
                              step="0.1"
                              disabled={isReadOnly}
                              value={scores[student.id] || ''}
                              onChange={(e) => handleScoreChange(student.id, e.target.value)}
                              className="w-24 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-ghana-green focus:border-transparent text-center disabled:bg-gray-100 disabled:cursor-not-allowed"
                              placeholder="0.0"
                            />
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {(!selectedClass || !selectedSubject || !selectedAssessment) && (
            <div className="bg-white rounded-lg shadow-lg p-12 text-center">
              <Search className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">
                Please select a class, subject, and assessment to begin entering scores.
              </p>
            </div>
          )}
        </main>
      </header>
    </div>
  )
}
