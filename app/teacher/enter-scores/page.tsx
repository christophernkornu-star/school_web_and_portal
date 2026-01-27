'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { GraduationCap, ArrowLeft, Save, Search, AlertCircle } from 'lucide-react'
import { getCurrentUser, getTeacherData, getTeacherAssignments } from '@/lib/auth'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'

export default function EnterScores() {
  const router = useRouter()
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
  const [saving, setSaving] = useState(false)

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
        }
      }
      
      setLoading(false)
    }

    loadData()
  }, [router])

  useEffect(() => {
    if (selectedClass && selectedSubject) {
      loadStudents()
      loadAssessments()
    }
  }, [selectedClass, selectedSubject])

  const loadStudents = async () => {
    const { data, error } = await supabase
      .from('students')
      .select(`
        id,
        student_id,
        first_name,
        last_name,
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
      .select('*, assessment_types(*)')
      .eq('class_subject_id', classSubject.id)
      .eq('teacher_id', teacher?.id)
      .order('assessment_date', { ascending: false })

    if (data) {
      setAssessments(data)
    }
  }

  const handleScoreChange = (studentId: string, value: string) => {
    if (isReadOnly) return
    const numValue = parseFloat(value)
    if (!isNaN(numValue)) {
      if (numValue > 10) {
        alert('Score cannot be greater than 10')
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
      alert('Please select an assessment')
      return
    }

    setSaving(true)

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
            .select('id')
            .eq('class_subject_id', classSubject.id)
            .eq('term_id', termId)

          if (termAssessments && termAssessments.length > 0) {
          const assessmentIds = termAssessments.map((a: any) => a.id)
          const studentIds = Object.keys(scores)

          // Process each student
          await Promise.all(studentIds.map(async (studentId) => {
            // Get all scores for this student in this term's assessments
            const { data: studentScores } = await supabase
              .from('student_scores')
              .select('score')
              .in('assessment_id', assessmentIds)
              .eq('student_id', studentId)

            if (studentScores) {
              const totalScoreGotten = studentScores.reduce((sum: number, s: any) => sum + (s.score || 0), 0)
              const numberOfAssessments = studentScores.length // Or termAssessments.length? "number of class scores recorded"
              // User said: "number of class scores recorded * 10"
              // This implies we count the scores actually recorded for the student, OR the total assessments available?
              // "number of class scores recorded" usually means the count of entries.
              
              const expectedScore = numberOfAssessments * 10
              
              let calculatedClassScore = 0
              if (expectedScore > 0) {
                calculatedClassScore = (totalScoreGotten / expectedScore) * 40
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
                .single()

              const examScore = existingScore?.exam_score || 0
              const total = calculatedClassScore + examScore
              const grade = calculateGrade(total)

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

      alert('Scores saved and class scores updated successfully!')
      setScores({})
      
    } catch (err: any) {
      console.error('Error saving scores:', err)
      alert('An error occurred while saving scores: ' + err.message)
    }

    setSaving(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-ghana-green mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
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
            <Link href="/teacher/dashboard" className="flex items-center space-x-2 text-gray-700 hover:text-ghana-green">
              <ArrowLeft className="w-5 h-5" />
              <span className="text-sm">Back to Dashboard</span>
            </Link>
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
                <select
                  value={selectedAssessment}
                  onChange={(e) => setSelectedAssessment(e.target.value)}
                  className="input-field"
                  disabled={!selectedSubject}
                >
                  <option value="">-- Select Assessment --</option>
                  {assessments.map((assessment) => (
                    <option key={assessment.id} value={assessment.id}>
                      {assessment.assessment_name} ({assessment.assessment_types?.type_name})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Students Table */}
          {selectedClass && selectedSubject && selectedAssessment && (
            <div className="bg-white rounded-lg shadow-lg overflow-hidden">
              <div className="p-4 md:p-6 border-b">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <h3 className="text-base md:text-lg font-bold text-gray-800">
                    Enter Scores for {students.length} Students
                  </h3>
                  <button
                    onClick={handleSaveScores}
                    disabled={saving || Object.keys(scores).length === 0 || isReadOnly}
                    className="btn-secondary flex items-center justify-center space-x-2 disabled:opacity-50 w-full sm:w-auto"
                  >
                    <Save className="w-4 h-4" />
                    <span>{saving ? 'Saving...' : 'Save Scores'}</span>
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
                          {student.profiles?.full_name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
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
