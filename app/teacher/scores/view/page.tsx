'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Edit2, Save, X, Filter, Download, Eye, AlertCircle, Trash2 } from 'lucide-react'
import { getCurrentUser, getTeacherData, getTeacherAssignments } from '@/lib/auth'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'
import { Skeleton } from '@/components/ui/skeleton'
import BackButton from '@/components/ui/back-button'
import { toast } from 'react-hot-toast'

interface Score {
  id: string
  student_id: string
  subject_id: string
  term_id: string
  class_score: number | null
  exam_score: number | null
  total: number | null
  grade: string | null
  students: {
    student_id: string
    profiles: { full_name: string } | any
  } | any
  subjects: { name: string } | any
}

export default function ViewScoresPage() {
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()
  const [loading, setLoading] = useState(true)
  const [teacher, setTeacher] = useState<any>(null)
  const [assignments, setAssignments] = useState<any[]>([])
  const [selectedClass, setSelectedClass] = useState('')
  const [selectedSubject, setSelectedSubject] = useState('')
  const [selectedTerm, setSelectedTerm] = useState('')
  const [terms, setTerms] = useState<any[]>([])
  const [scores, setScores] = useState<Score[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValues, setEditValues] = useState<{ class_score: number | null; exam_score: number | null }>({
    class_score: null,
    exam_score: null
  })
  const [saving, setSaving] = useState(false)
  const [filterText, setFilterText] = useState('')
  const [canDelete, setCanDelete] = useState(false)
  const [classScorePercentage, setClassScorePercentage] = useState(40)
  const [examScorePercentage, setExamScorePercentage] = useState(60)

  useEffect(() => {
    loadInitialData()
  }, [])

  useEffect(() => {
    if (selectedClass && selectedSubject && selectedTerm) {
      loadScores()
    }
  }, [selectedClass, selectedSubject, selectedTerm])

  const loadInitialData = async () => {
    try {
      const user = await getCurrentUser()
      if (!user) {
        router.push('/login?portal=teacher')
        return
      }

      // Parallel Fetch: Teacher, Settings, Security, Terms
      const [teacherRes, settingsRes, securityRes, termsRes] = await Promise.all([
        getTeacherData(user.id),
        supabase.from('system_settings').select('*').in('setting_key', ['class_score_percentage', 'exam_score_percentage']),
        supabase.from('security_settings').select('allow_teacher_delete_scores').maybeSingle(),
        supabase.from('academic_terms').select('*').order('academic_year', { ascending: false })
      ])

      if (!teacherRes.data) {
        router.push('/login?portal=teacher')
        return
      }
      setTeacher(teacherRes.data)

      // Grading Settings
      if (settingsRes.data) {
          settingsRes.data.forEach((setting: any) => {
            if (setting.setting_key === 'class_score_percentage') {
              setClassScorePercentage(Number(setting.setting_value))
            } else if (setting.setting_key === 'exam_score_percentage') {
              setExamScorePercentage(Number(setting.setting_value))
            }
          })
      }

      // Security Settings
      if (securityRes.data) {
        setCanDelete(securityRes.data.allow_teacher_delete_scores)
      }

      // Terms
      if (termsRes.data && termsRes.data.length > 0) {
        setTerms(termsRes.data)
        setSelectedTerm(termsRes.data[0].id)
      }

      // Dependent Fetch: Assignments
      const { data: assignmentsData, error: assignmentsError } = await getTeacherAssignments(teacherRes.data.id) as { data: any[] | null, error: any }
      
      if (assignmentsError) {
        console.error('Error loading assignments:', assignmentsError)
        toast.error('Error loading teacher assignments. Please check your teacher ID configuration.')
        setLoading(false)
        return
      }
      
      if (assignmentsData) {
        setAssignments(assignmentsData)
        if (assignmentsData.length > 0) {
          const firstClassId = assignmentsData[0].class_id
          setSelectedClass(firstClassId)
          
          // Get the class category and map to level
          const category = assignmentsData[0].classes?.category
          const firstClassLevel = category === 'Lower Primary' ? 'lower_primary' 
            : category === 'Upper Primary' ? 'upper_primary'
            : category === 'Junior High' ? 'jhs'
            : null
          
          // Filter subjects that match the class level
          const subjectsForClassLevel = assignmentsData.filter((a: any) => 
            a.subjects?.level === firstClassLevel
          )
          
          if (subjectsForClassLevel.length > 0) {
            setSelectedSubject(subjectsForClassLevel[0].subject_id)
          } else {
            // Fallback: use any subject assigned to the class
            const subjectsForClass = assignmentsData.filter((a: any) => a.class_id === firstClassId)
            if (subjectsForClass.length > 0) {
              setSelectedSubject(subjectsForClass[0].subject_id)
            }
          }
        }
      }

      setLoading(false)
    } catch (error) {
      console.error('Error loading data:', error)
      setLoading(false)
    }
  }

  const loadScores = async () => {
    try {
      // Get all students in the selected class
      const { data: studentsData, error: studentsError } = await supabase
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
        .order('last_name', { ascending: true })

      if (studentsError || !studentsData) return

      // Get existing scores for these students
      const { data: scoresData } = await supabase
        .from('scores')
        .select(`
          id,
          student_id,
          subject_id,
          term_id,
          class_score,
          exam_score,
          total,
          grade,
          subjects(name)
        `)
        .eq('subject_id', selectedSubject)
        .eq('term_id', selectedTerm)
        .in('student_id', studentsData.map((s: any) => s.id)) as { data: any[] | null }

      // Create a map of existing scores
      const scoresMap = new Map(scoresData?.map((s: any) => [s.student_id, s]) || [])

      // Create complete list with placeholders for students without scores
      const completeScores: any = studentsData.map((student: any) => {
        const existingScore = scoresMap.get(student.id)
        
        // Format name regardless of profile
        const formattedName = `${student.last_name}, ${student.first_name}${student.middle_name ? ' ' + student.middle_name : ''}`
        
        if (existingScore) {
          // Add student info to the score
          existingScore.students = {
            student_id: student.student_id,
            profiles: { full_name: formattedName }
          }
          return existingScore
        }
        // Return placeholder for students without scores
        return {
          id: `placeholder-${student.id}`,
          student_id: student.id,
          subject_id: selectedSubject,
          term_id: selectedTerm,
          class_score: null,
          exam_score: null,
          total: null,
          grade: null,
          students: {
            student_id: student.student_id,
            profiles: { full_name: formattedName }
          },
          subjects: { name: assignments.find(a => a.subject_id === selectedSubject)?.subjects?.subject_name || 'Unknown' }
        }
      })

      setScores(completeScores as Score[])
    } catch (error) {
      console.error('Error loading scores:', error)
    }
  }

  const startEdit = (score: Score) => {
    setEditingId(score.id)
    setEditValues({
      class_score: score.class_score,
      exam_score: score.exam_score
    })
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditValues({ class_score: null, exam_score: null })
  }

  const calculateTotal = (classScore: number | null, examScore: number | null): number | null => {
    if (classScore === null || examScore === null) return null
    return classScore + examScore
  }

  const calculateGrade = (total: number | null): string | null => {
    if (total === null) return null
    if (total >= 80) return 'A'
    if (total >= 70) return 'B'
    if (total >= 60) return 'C'
    if (total >= 50) return 'D'
    if (total >= 45) return 'E'
    return 'F'
  }

  const saveScore = async (scoreId: string, studentId: string) => {
    setSaving(true)
    try {
      // Default null values to 0 for database constraints
      const classScore = editValues.class_score ?? 0
      const examScore = editValues.exam_score ?? 0
      
      // Validate scores
      if (classScore < 0 || classScore > classScorePercentage) {
        toast.error(`Class score must be between 0 and ${classScorePercentage}`)
        setSaving(false)
        return
      }
      if (examScore < 0 || examScore > examScorePercentage) {
        toast.error(`Exam score must be between 0 and ${examScorePercentage}`)
        setSaving(false)
        return
      }

      const total = calculateTotal(classScore, examScore)
      const grade = calculateGrade(total)

      if (scoreId.startsWith('placeholder-')) {
        // Create new score
        const { error } = await supabase
          .from('scores')
          .insert({
            student_id: studentId,
            subject_id: selectedSubject,
            term_id: selectedTerm,
            teacher_id: teacher?.id,
            class_score: classScore,
            exam_score: examScore,
            total: total,
            grade: grade,
            remarks: getRemarkForGrade(grade)
          })

        if (error) throw error
      } else {
        // Update existing score
        const { error } = await supabase
          .from('scores')
          .update({
            class_score: classScore,
            exam_score: examScore,
            total: total,
            grade: grade,
            remarks: getRemarkForGrade(grade)
          })
          .eq('id', scoreId)

        if (error) throw error
      }

      // Reload scores
      await loadScores()
      setEditingId(null)
      setEditValues({ class_score: null, exam_score: null })
    } catch (error) {
      console.error('Error saving score:', error)
      toast.error('Failed to save score')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (scoreId: string) => {
    if (!confirm('Are you sure you want to delete this score? This action cannot be undone.')) return

    try {
      const { error } = await supabase
        .from('scores')
        .delete()
        .eq('id', scoreId)

      if (error) throw error

      setScores(prev => prev.filter(s => s.id !== scoreId))
    } catch (error) {
      console.error('Error deleting score:', error)
      toast.error('Failed to delete score')
    }
  }

  const getRemarkForGrade = (grade: string | null): string => {
    if (!grade) return ''
    switch (grade) {
      case 'A': return 'Excellent'
      case 'B': return 'Very Good'
      case 'C': return 'Good'
      case 'D': return 'Satisfactory'
      case 'E': return 'Pass'
      case 'F': return 'Fail'
      default: return ''
    }
  }

  const exportToCSV = () => {
    const csv = [
      ['Student ID', 'Student Name', 'Class Score', 'Exam Score', 'Total', 'Grade'],
      ...filteredScores.map(s => [
        s.students?.student_id || '',
        s.students?.profiles?.full_name || '',
        s.class_score?.toString() || '',
        s.exam_score?.toString() || '',
        s.total?.toString() || '',
        s.grade || ''
      ])
    ].map(row => row.join(',')).join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `scores_${selectedClass}_${selectedSubject}_${selectedTerm}.csv`
    a.click()
  }

  const filteredScores = scores.filter(score =>
    score.students?.profiles?.full_name?.toLowerCase().includes(filterText.toLowerCase()) ||
    score.students?.student_id?.toLowerCase().includes(filterText.toLowerCase())
  )

  const selectedClassName = assignments.find(a => a.class_id === selectedClass)?.classes?.class_name || ''
  const selectedSubjectName = assignments.find(a => a.subject_id === selectedSubject)?.subjects?.subject_name || ''
  const selectedTermData = terms.find(t => t.id === selectedTerm)

  // Calculate statistics
  const scoresWithData = scores.filter(s => s.total !== null)
  const classAverage = scoresWithData.length > 0
    ? scoresWithData.reduce((sum, s) => sum + (s.total || 0), 0) / scoresWithData.length
    : 0
  const highestScore = scoresWithData.length > 0 ? Math.max(...scoresWithData.map(s => s.total || 0)) : 0
  const lowestScore = scoresWithData.length > 0 ? Math.min(...scoresWithData.map(s => s.total || 0)) : 0
  const missingScores = scores.filter(s => s.total === null).length

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
          <header className="bg-white dark:bg-gray-800 shadow">
            <div className="container mx-auto px-4 py-4">
               <div className="flex items-center gap-4">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <div className="space-y-2">
                       <Skeleton className="h-6 w-48 rounded" />
                       <Skeleton className="h-4 w-32 rounded" />
                  </div>
               </div>
            </div>
          </header>
          <main className="flex-1 container mx-auto px-4 py-8">
            <div className="space-y-6">
                 <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                    </div>
                     <Skeleton className="h-8 w-48 mb-4" />
                    <Skeleton className="h-64 w-full rounded" />
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
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <BackButton href="/teacher/manage-scores" />
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-gray-800 dark:text-white">View & Edit Scores</h1>
                <p className="text-xs md:text-sm text-gray-600 dark:text-gray-300">Review and correct scores at a glance</p>
              </div>
            </div>
            {scores.length > 0 && (
              <button
                onClick={exportToCSV}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-xs md:text-sm"
              >
                <Download className="w-4 h-4" />
                Export CSV
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="w-5 h-5 text-gray-600 dark:text-gray-300" />
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Filter Options</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs md:text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Class</label>
              <select
                value={selectedClass}
                onChange={(e) => {
                  setSelectedClass(e.target.value)
                  // Get the class category and map to level
                  const selectedClassData = assignments.find(a => a.class_id === e.target.value)
                  const category = selectedClassData?.classes?.category
                  const classLevel = category === 'Lower Primary' ? 'lower_primary' 
                    : category === 'Upper Primary' ? 'upper_primary'
                    : category === 'Junior High' ? 'jhs'
                    : null
                  
                  // Reset subject to first one matching the class level
                  const subjectsForLevel = assignments.filter(a => 
                    a.subjects?.level === classLevel
                  )
                  if (subjectsForLevel.length > 0) {
                    setSelectedSubject(subjectsForLevel[0].subject_id)
                  } else {
                    // Fallback to any subject for this class
                    const subjectsForClass = assignments.filter(a => a.class_id === e.target.value)
                    if (subjectsForClass.length > 0) {
                      setSelectedSubject(subjectsForClass[0].subject_id)
                    }
                  }
                }}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-ghana-green dark:bg-gray-700 dark:text-white"
              >
                {Array.from(new Set(assignments.map(a => a.class_id))).map(classId => {
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
              <label className="block text-xs md:text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Subject</label>
              <select
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-ghana-green dark:bg-gray-700 dark:text-white"
              >
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
                    .map((assignment, index) => (
                      <option key={`${assignment.subject_id}-${index}`} value={assignment.subject_id}>
                        {assignment.subjects?.name}
                      </option>
                    ))
                })()}
              </select>
            </div>

            <div>
              <label className="block text-xs md:text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Term</label>
              <select
                value={selectedTerm}
                onChange={(e) => setSelectedTerm(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-ghana-green dark:bg-gray-700 dark:text-white"
              >
                {terms.map(term => (
                  <option key={term.id} value={term.id}>
                    {term.name} - {term.academic_year}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Statistics */}
        {scores.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
              <p className="text-xs md:text-sm text-gray-600 dark:text-gray-300 mb-1">Total Students</p>
              <p className="text-xl md:text-2xl font-bold text-gray-800 dark:text-white">{scores.length}</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
              <p className="text-xs md:text-sm text-gray-600 dark:text-gray-300 mb-1">Class Average</p>
              <p className="text-xl md:text-2xl font-bold text-blue-600 dark:text-blue-400">{classAverage.toFixed(1)}%</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
              <p className="text-xs md:text-sm text-gray-600 dark:text-gray-300 mb-1">Highest Score</p>
              <p className="text-xl md:text-2xl font-bold text-green-600 dark:text-green-400">{highestScore}%</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
              <p className="text-xs md:text-sm text-gray-600 dark:text-gray-300 mb-1">Missing Scores</p>
              <p className="text-xl md:text-2xl font-bold text-red-600 dark:text-red-400">{missingScores}</p>
            </div>
          </div>
        )}

        {/* Warning for missing scores */}
        {missingScores > 0 && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-500 p-4 mb-6 rounded-lg">
            <div className="flex items-start">
              <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-500 mt-0.5 mr-3" />
              <div>
                <h3 className="text-sm font-semibold text-yellow-800 dark:text-yellow-400">Incomplete Scores</h3>
                <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                  {missingScores} student{missingScores > 1 ? 's' : ''} {missingScores > 1 ? 'are' : 'is'} missing scores. 
                  Click the edit icon to add them.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Search */}
        {scores.length > 0 && (
          <div className="mb-4">
            <input
              type="text"
              placeholder="Search by student name or ID..."
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-ghana-green dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
            />
          </div>
        )}

        {/* Scores Table */}
        {scores.length > 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-ghana-green text-white">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase">Student ID</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase">Student Name</th>
                    <th className="px-6 py-3 text-center text-xs font-semibold uppercase">Class Score (50)</th>
                    <th className="px-6 py-3 text-center text-xs font-semibold uppercase">Exam Score (50)</th>
                    <th className="px-6 py-3 text-center text-xs font-semibold uppercase">Total (100)</th>
                    <th className="px-6 py-3 text-center text-xs font-semibold uppercase">Grade</th>
                    <th className="px-6 py-3 text-center text-xs font-semibold uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredScores.map((score) => (
                    <tr key={score.id} className={`hover:bg-gray-50 dark:hover:bg-gray-700 ${score.total === null ? 'bg-yellow-50 dark:bg-yellow-900/10' : ''}`}>
                      <td className="px-6 py-4 whitespace-nowrap text-xs md:text-sm font-medium text-gray-900 dark:text-white">
                        {score.students?.student_id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-xs md:text-sm text-gray-700 dark:text-gray-300">
                        {score.students?.profiles?.full_name}
                      </td>
                      
                      {editingId === score.id ? (
                        <>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <input
                              type="number"
                              min="0"
                              max="30"
                              step="0.1"
                              value={editValues.class_score ?? ''}
                              onChange={(e) => setEditValues({ ...editValues, class_score: parseFloat(e.target.value) || null })}
                              className="w-20 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-center focus:ring-2 focus:ring-ghana-green dark:bg-gray-700 dark:text-white"
                              placeholder="0"
                            />
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <input
                              type="number"
                              min="0"
                              max="70"
                              step="0.1"
                              value={editValues.exam_score ?? ''}
                              onChange={(e) => setEditValues({ ...editValues, exam_score: parseFloat(e.target.value) || null })}
                              className="w-20 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-center focus:ring-2 focus:ring-ghana-green dark:bg-gray-700 dark:text-white"
                              placeholder="0"
                            />
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center text-xs md:text-sm font-bold">
                            {calculateTotal(editValues.class_score, editValues.exam_score) ?? '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center text-xs md:text-sm font-bold">
                            {calculateGrade(calculateTotal(editValues.class_score, editValues.exam_score)) || '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => saveScore(score.id, score.student_id)}
                                disabled={saving}
                                className="p-1 text-green-600 hover:text-green-800 disabled:opacity-50"
                                title="Save"
                              >
                                <Save className="w-5 h-5" />
                              </button>
                              <button
                                onClick={cancelEdit}
                                className="p-1 text-red-600 hover:text-red-800"
                                title="Cancel"
                              >
                                <X className="w-5 h-5" />
                              </button>
                            </div>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="px-6 py-4 whitespace-nowrap text-center text-xs md:text-sm">
                            {score.class_score ?? '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center text-xs md:text-sm">
                            {score.exam_score ?? '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center text-xs md:text-sm font-bold">
                            {score.total ?? '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <span className={`px-2 py-1 text-xs font-bold rounded ${
                              score.grade === 'A' ? 'bg-green-100 text-green-800' :
                              score.grade === 'B' ? 'bg-blue-100 text-blue-800' :
                              score.grade === 'C' ? 'bg-yellow-100 text-yellow-800' :
                              score.grade === 'F' ? 'bg-red-100 text-red-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {score.grade || '-'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => startEdit(score)}
                                className="p-1 text-blue-600 hover:text-blue-800"
                                title="Edit"
                              >
                                <Edit2 className="w-5 h-5" />
                              </button>
                              {canDelete && (
                                <button
                                  onClick={() => handleDelete(score.id)}
                                  className="p-1 text-red-600 hover:text-red-800"
                                  title="Delete"
                                >
                                  <Trash2 className="w-5 h-5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-12 text-center">
            <Eye className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-200 mb-2">No Students Found</h3>
            <p className="text-gray-600 dark:text-gray-400">Select a class, subject, and term to view scores.</p>
          </div>
        )}
      </main>
    </div>
  )
}
