'use client'

import { useState, useEffect } from 'react'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'
import Link from 'next/link'
import { ArrowLeft, Plus, BookOpen, Calendar, CheckCircle, XCircle, Eye, Trash2, Edit, Calculator, AlertCircle } from 'lucide-react'
import AuthGuard from '@/app/components/AuthGuard'
import { Skeleton } from '@/components/ui/skeleton'
import BackButton from '@/components/ui/BackButton'
import { toast } from 'react-hot-toast'

interface Teacher {
  id: string
  user_id: string
}

interface Class {
  class_id: string
  class_name: string
}

interface Subject {
  id: string
  name: string
}

interface Student {
  id: string
  student_id: string
  first_name: string
  last_name: string
}

interface Exercise {
  id: string
  exercise_name: string
  exercise_date: string
  score_obtained: number
  max_score: number
  remarks: string
  student: {
    first_name: string
    last_name: string
    student_id: string
  }
}

interface ClassScoreSummary {
  student_id: string
  student_name: string
  student_number: string
  total_obtained: number
  total_max: number
  percentage: number
  converted_score: number
  exercise_count: number
}

function ClassExercisesPage() {
  const supabase = getSupabaseBrowserClient()
  const [loading, setLoading] = useState(true)
  const [teacher, setTeacher] = useState<Teacher | null>(null)
  const [error, setError] = useState<string | null>(null)
  
  // State for filters
  const [teacherClasses, setTeacherClasses] = useState<Class[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [selectedClass, setSelectedClass] = useState('')
  const [selectedSubject, setSelectedSubject] = useState('')
  const [selectedStudent, setSelectedStudent] = useState('')
  const [selectedTerm, setSelectedTerm] = useState('')
  const [currentTermName, setCurrentTermName] = useState('')
  
  // State for form
  const [showForm, setShowForm] = useState(false)
  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null)
  const [formData, setFormData] = useState({
    exercise_name: '',
    exercise_date: new Date().toISOString().split('T')[0],
    score_obtained: '',
    max_score: '',
    remarks: ''
  })
  const [formErrors, setFormErrors] = useState<any>({})
  const [submitting, setSubmitting] = useState(false)
  const [submitSuccess, setSubmitSuccess] = useState(false)
  
  // State for viewing exercises
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [classSummary, setClassSummary] = useState<ClassScoreSummary[]>([])
  const [activeView, setActiveView] = useState<'add' | 'view' | 'summary'>('add')
  const [isReadOnly, setIsReadOnly] = useState(false)

  useEffect(() => {
    fetchInitialData()
  }, [])

  useEffect(() => {
    if (selectedClass) {
      fetchStudents()
    } else {
      setStudents([])
      setSelectedStudent('')
    }
  }, [selectedClass])

  useEffect(() => {
    if (selectedClass && selectedSubject && selectedTerm) {
      if (activeView === 'view' && selectedStudent) {
        fetchExercises()
      } else if (activeView === 'summary') {
        fetchClassSummary()
      }
    }
  }, [selectedClass, selectedSubject, selectedTerm, selectedStudent, activeView])

  async function fetchInitialData() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        console.error('No user found in fetchInitialData')
        setError('You must be logged in to access this page')
        setLoading(false)
        return
      }

      // Fetch teacher data
      const { data: teacherData, error: teacherError } = await supabase
        .from('teachers')
        .select('id, profile_id, status')
        .eq('profile_id', user.id)
        .single() as { data: any, error: any }

      if (teacherError) {
        console.error('Teacher fetch error:', teacherError)
        setError('No teacher profile found for your account')
        setLoading(false)
        return
      }
      
      if (!teacherData) {
        console.error('No teacher data found')
        setError('No teacher profile found')
        setLoading(false)
        return
      }

      const readOnly = teacherData.status === 'on_leave' || teacherData.status === 'on leave'
      setIsReadOnly(readOnly)
      if (readOnly && activeView === 'add') {
        setActiveView('view')
      }
      
      setTeacher({ id: teacherData.id, user_id: teacherData.profile_id })

      // Fetch teacher's classes
      const { data: classesData, error: classesError } = await supabase
        .from('teacher_class_assignments')
        .select(`
          class_id,
          classes (
            id,
            name
          )
        `)
        .eq('teacher_id', teacherData.id) as { data: any[] | null, error: any }

      if (classesError) {
        console.error('Classes fetch error:', classesError)
      } else {
        const classList = (classesData || []).map((item: any) => ({
          class_id: item.class_id,
          class_name: (item.classes as any).name
        }))
        setTeacherClasses(classList)
      }

      // Fetch all subjects (teachers can teach any subject in their classes)
      const { data: subjectsData, error: subjectsError } = await supabase
        .from('subjects')
        .select('id, name')
        .order('name') as { data: any[] | null, error: any }

      if (subjectsError) {
        console.error('Subjects fetch error:', subjectsError)
      } else {
        setSubjects(subjectsData || [])
      }

      // Fetch current term
      const { data: termData, error: termError } = await supabase
        .from('terms')
        .select('id, name')
        .eq('is_current', true)
        .maybeSingle() as { data: any, error: any }

      if (!termError && termData) {
        setSelectedTerm(termData.id)
        setCurrentTermName(termData.name)
      }

    } catch (error: any) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  async function fetchStudents() {
    try {
      const { data, error } = await supabase
        .from('students')
        .select('id, student_id, first_name, last_name')
        .eq('class_id', selectedClass)
        .eq('status', 'active')
        .order('last_name') as { data: any[] | null, error: any }

      if (error) throw error
      setStudents(data || [])
    } catch (error: any) {
      console.error('Error fetching students:', error)
    }
  }

  async function fetchExercises() {
    try {
      const { data, error } = await supabase
        .from('class_exercises')
        .select(`
          id,
          exercise_name,
          exercise_date,
          score_obtained,
          max_score,
          remarks,
          students (
            first_name,
            last_name,
            student_id
          )
        `)
        .eq('student_id', selectedStudent)
        .eq('subject_id', selectedSubject)
        .eq('term_id', selectedTerm)
        .order('exercise_date', { ascending: false }) as { data: any[] | null, error: any }

      if (error) throw error
      
      const exercisesList = data?.map((item: any) => ({
        id: item.id,
        exercise_name: item.exercise_name,
        exercise_date: item.exercise_date,
        score_obtained: item.score_obtained,
        max_score: item.max_score,
        remarks: item.remarks || '',
        student: (item.students as any)
      })) || []
      
      setExercises(exercisesList)
    } catch (error: any) {
      console.error('Error fetching exercises:', error)
    }
  }

  async function fetchClassSummary() {
    try {
      const { data, error } = await supabase
        .from('class_exercises')
        .select(`
          student_id,
          score_obtained,
          max_score,
          students (
            student_id,
            first_name,
            last_name
          )
        `)
        .eq('subject_id', selectedSubject)
        .eq('term_id', selectedTerm)
        .in('student_id', students.map(s => s.id)) as { data: any[] | null, error: any }

      if (error) throw error

      // Group by student and calculate totals
      const studentMap = new Map<string, ClassScoreSummary>()
      
      data?.forEach((item: any) => {
        const student = item.students as any
        const studentId = item.student_id
        
        if (!studentMap.has(studentId)) {
          studentMap.set(studentId, {
            student_id: studentId,
            student_name: `${student.last_name} ${student.first_name}`,
            student_number: student.student_id,
            total_obtained: 0,
            total_max: 0,
            percentage: 0,
            converted_score: 0,
            exercise_count: 0
          })
        }
        
        const summary = studentMap.get(studentId)!
        summary.total_obtained += parseFloat(item.score_obtained.toString())
        summary.total_max += parseFloat(item.max_score.toString())
        summary.exercise_count++
      })

      // Calculate percentages and converted scores
      const summaryList = Array.from(studentMap.values()).map(summary => {
        summary.percentage = summary.total_max > 0 
          ? (summary.total_obtained / summary.total_max) * 100 
          : 0
        summary.converted_score = summary.percentage * 0.4 // Convert to max 40
        return summary
      })

      // Sort by student name
      summaryList.sort((a, b) => a.student_name.localeCompare(b.student_name))
      
      setClassSummary(summaryList)
    } catch (error: any) {
      console.error('Error fetching class summary:', error)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    if (isReadOnly) return
    e.preventDefault()
    setSubmitting(true)
    setSubmitSuccess(false)
    
    const errors: any = {}
    if (!selectedClass) errors.class = 'Please select a class'
    if (!selectedSubject) errors.subject = 'Please select a subject'
    if (!selectedStudent) errors.student = 'Please select a student'
    if (!selectedTerm) errors.term = 'No current term set'
    if (!formData.exercise_name.trim()) errors.exercise_name = 'Exercise name is required'
    if (!formData.score_obtained) errors.score_obtained = 'Score is required'
    if (!formData.max_score) errors.max_score = 'Max score is required'
    
    const scoreObtained = parseFloat(formData.score_obtained)
    const maxScore = parseFloat(formData.max_score)
    
    if (isNaN(scoreObtained) || scoreObtained < 0) {
      errors.score_obtained = 'Score must be a positive number'
    }
    if (isNaN(maxScore) || maxScore <= 0) {
      errors.max_score = 'Max score must be greater than 0'
    }
    if (scoreObtained > maxScore) {
      errors.score_obtained = 'Score cannot exceed max score'
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors)
      return
    }

    setSubmitting(true)
    setFormErrors({})

    try {
      const exerciseData = {
        student_id: selectedStudent,
        subject_id: selectedSubject,
        term_id: selectedTerm,
        teacher_id: teacher!.id,
        exercise_name: formData.exercise_name.trim(),
        exercise_date: formData.exercise_date,
        score_obtained: scoreObtained,
        max_score: maxScore,
        remarks: formData.remarks.trim()
      }

      if (editingExercise) {
        // Update existing exercise
        const { error } = await (supabase
          .from('class_exercises') as any)
          .update(exerciseData)
          .eq('id', editingExercise.id)

        if (error) throw error
      } else {
        // Insert new exercise
        const { error } = await (supabase
          .from('class_exercises') as any)
          .insert(exerciseData)

        if (error) throw error
      }

      setSubmitSuccess(true)
      setFormData({
        exercise_name: '',
        exercise_date: new Date().toISOString().split('T')[0],
        score_obtained: '',
        max_score: '',
        remarks: ''
      })
      setEditingExercise(null)
      setShowForm(false)
      
      // Refresh exercises if viewing
      if (activeView === 'view' && selectedStudent) {
        fetchExercises()
      }

      setTimeout(() => setSubmitSuccess(false), 5000)
    } catch (error: any) {
      console.error('Error submitting exercise:', error)
      setFormErrors({ submit: error.message || 'Failed to save exercise' })
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(id: string) {
    if (isReadOnly) return
    if (!confirm('Are you sure you want to delete this exercise?')) return
    
    try {
      const { error } = await supabase
        .from('class_exercises')
        .delete()
        .eq('id', id)

      if (error) throw error
      
      fetchExercises()
    } catch (error: any) {
      console.error('Error deleting exercise:', error)
      toast.error('Failed to delete exercise')
    }
  }

  function startEdit(exercise: Exercise) {
    setEditingExercise(exercise)
    setFormData({
      exercise_name: exercise.exercise_name,
      exercise_date: exercise.exercise_date,
      score_obtained: exercise.score_obtained.toString(),
      max_score: exercise.max_score.toString(),
      remarks: exercise.remarks || ''
    })
    setShowForm(true)
    setActiveView('add')
  }

  function cancelForm() {
    setShowForm(false)
    setEditingExercise(null)
    setFormData({
      exercise_name: '',
      exercise_date: new Date().toISOString().split('T')[0],
      score_obtained: '',
      max_score: '',
      remarks: ''
    })
    setFormErrors({})
  }

  const totalObtained = exercises.reduce((sum, ex) => sum + parseFloat(ex.score_obtained.toString()), 0)
  const totalMax = exercises.reduce((sum, ex) => sum + parseFloat(ex.max_score.toString()), 0)
  const percentage = totalMax > 0 ? (totalObtained / totalMax) * 100 : 0
  const convertedScore = percentage * 0.4

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
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Skeleton className="h-24 w-full rounded-lg" />
                    <Skeleton className="h-24 w-full rounded-lg" />
                    <Skeleton className="h-24 w-full rounded-lg" />
                </div>
                <div className="border rounded-lg p-6 bg-white dark:bg-gray-800">
                    <Skeleton className="h-10 w-full mb-4" />
                    <Skeleton className="h-64 w-full rounded" />
                </div>
            </div>
          </main>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-md p-8 max-w-md">
          <div className="text-center">
            <XCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">Error Loading Page</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <Link
              href="/teacher/dashboard"
              className="inline-flex items-center px-4 py-2 bg-ghana-green text-white rounded-lg hover:bg-green-700 transition"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <BackButton href="/teacher/dashboard" />
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-gray-900">Class Exercises</h1>
                <p className="text-xs md:text-sm text-gray-600">Record and manage individual class exercises</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {isReadOnly && (
          <div className="mb-6 bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-center space-x-3">
            <AlertCircle className="w-6 h-6 text-amber-600 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-amber-900">Read-Only Mode</h3>
              <p className="text-sm text-amber-800">
                You are marked as "On Leave". You can view exercises and summaries but cannot add, edit, or delete records.
              </p>
            </div>
          </div>
        )}

        {/* Success Message */}
        {submitSuccess && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4 flex items-start space-x-3">
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-green-800 font-medium">Exercise saved successfully!</p>
              <p className="text-green-700 text-sm mt-1">The exercise has been recorded.</p>
            </div>
          </div>
        )}

        {/* View Toggle */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => {
                if (!isReadOnly) {
                  setActiveView('add')
                  setShowForm(false)
                  setEditingExercise(null)
                }
              }}
              disabled={isReadOnly}
              className={`flex-1 flex items-center justify-center space-x-2 px-6 py-4 font-medium transition-colors ${
                activeView === 'add'
                  ? 'text-ghana-green border-b-2 border-ghana-green'
                  : isReadOnly 
                    ? 'text-gray-300 cursor-not-allowed' 
                    : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Plus className="w-5 h-5" />
              <span>Add Exercise</span>
            </button>
            <button
              onClick={() => setActiveView('view')}
              className={`flex-1 flex items-center justify-center space-x-2 px-6 py-4 font-medium transition-colors ${
                activeView === 'view'
                  ? 'text-ghana-green border-b-2 border-ghana-green'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Eye className="w-5 h-5" />
              <span>View Exercises</span>
            </button>
            <button
              onClick={() => setActiveView('summary')}
              className={`flex-1 flex items-center justify-center space-x-2 px-6 py-4 font-medium transition-colors ${
                activeView === 'summary'
                  ? 'text-ghana-green border-b-2 border-ghana-green'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Calculator className="w-5 h-5" />
              <span>Class Summary</span>
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-base md:text-lg font-semibold text-gray-800 mb-4">Filters</h2>
          <div className="grid md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Class *
              </label>
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ghana-green focus:border-transparent"
              >
                <option value="">Select Class</option>
                {teacherClasses.map(cls => (
                  <option key={cls.class_id} value={cls.class_id}>
                    {cls.class_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Subject *
              </label>
              <select
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ghana-green focus:border-transparent"
              >
                <option value="">Select Subject</option>
                {subjects.map(subject => (
                  <option key={subject.id} value={subject.id}>
                    {subject.name}
                  </option>
                ))}
              </select>
            </div>

            {activeView !== 'summary' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Student *
                </label>
                <select
                  value={selectedStudent}
                  onChange={(e) => setSelectedStudent(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ghana-green focus:border-transparent"
                  disabled={!selectedClass}
                >
                  <option value="">Select Student</option>
                  {students.map(student => (
                    <option key={student.id} value={student.id}>
                      {student.first_name} {student.last_name} ({student.student_id})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Term
              </label>
              <div className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700 font-medium">
                {currentTermName || 'No current term'}
              </div>
            </div>
          </div>
        </div>

        {/* Add Exercise View */}
        {activeView === 'add' && (
          <div className="bg-white rounded-lg shadow p-6">
            {!showForm ? (
              <div className="text-center py-12">
                <BookOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg md:text-xl font-semibold text-gray-800 mb-2">Record a Class Exercise</h3>
                <p className="text-gray-600 mb-6">
                  Select a class, subject, and student, then click below to record an exercise.
                </p>
                <button
                  onClick={() => setShowForm(true)}
                  disabled={!selectedClass || !selectedSubject || !selectedStudent || !selectedTerm}
                  className="px-6 py-3 bg-ghana-green text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 mx-auto transition"
                >
                  <Plus className="w-5 h-5" />
                  <span>Add New Exercise</span>
                </button>
                {(!selectedClass || !selectedSubject || !selectedStudent || !selectedTerm) && (
                  <p className="text-sm text-amber-600 mt-4">
                    Please select class, subject, student, and ensure a term is set
                  </p>
                )}
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <h3 className="text-base md:text-lg font-semibold text-gray-800">
                  {editingExercise ? 'Edit Exercise' : 'New Exercise'}
                </h3>

                {formErrors.submit && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start space-x-3">
                    <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <p className="text-red-800">{formErrors.submit}</p>
                  </div>
                )}

                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Exercise Name *
                    </label>
                    <input
                      type="text"
                      value={formData.exercise_name}
                      onChange={(e) => {
                        setFormData({...formData, exercise_name: e.target.value})
                        if (formErrors.exercise_name) {
                          setFormErrors({...formErrors, exercise_name: ''})
                        }
                      }}
                      className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-ghana-green focus:border-transparent ${
                        formErrors.exercise_name ? 'border-red-300 bg-red-50' : 'border-gray-300'
                      }`}
                      placeholder="e.g., Quiz 1, Assignment 2, Class Test"
                    />
                    {formErrors.exercise_name && (
                      <p className="mt-1 text-sm text-red-600">{formErrors.exercise_name}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Date *
                    </label>
                    <input
                      type="date"
                      value={formData.exercise_date}
                      onChange={(e) => setFormData({...formData, exercise_date: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ghana-green focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Score Obtained *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.score_obtained}
                      onChange={(e) => {
                        setFormData({...formData, score_obtained: e.target.value})
                        if (formErrors.score_obtained) {
                          setFormErrors({...formErrors, score_obtained: ''})
                        }
                      }}
                      className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-ghana-green focus:border-transparent ${
                        formErrors.score_obtained ? 'border-red-300 bg-red-50' : 'border-gray-300'
                      }`}
                      placeholder="e.g., 8"
                    />
                    {formErrors.score_obtained && (
                      <p className="mt-1 text-sm text-red-600">{formErrors.score_obtained}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Max Score *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={formData.max_score}
                      onChange={(e) => {
                        setFormData({...formData, max_score: e.target.value})
                        if (formErrors.max_score) {
                          setFormErrors({...formErrors, max_score: ''})
                        }
                      }}
                      className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-ghana-green focus:border-transparent ${
                        formErrors.max_score ? 'border-red-300 bg-red-50' : 'border-gray-300'
                      }`}
                      placeholder="e.g., 10"
                    />
                    {formErrors.max_score && (
                      <p className="mt-1 text-sm text-red-600">{formErrors.max_score}</p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Remarks (Optional)
                  </label>
                  <textarea
                    value={formData.remarks}
                    onChange={(e) => setFormData({...formData, remarks: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ghana-green focus:border-transparent"
                    rows={3}
                    placeholder="Any additional notes about this exercise"
                  />
                </div>

                <div className="flex justify-end space-x-4">
                  <button
                    type="button"
                    onClick={cancelForm}
                    className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-6 py-2 bg-ghana-green text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 transition"
                  >
                    <CheckCircle className="w-5 h-5" />
                    <span>{submitting ? 'Saving...' : editingExercise ? 'Update Exercise' : 'Save Exercise'}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* View Exercises */}
        {activeView === 'view' && (
          <div className="bg-white rounded-lg shadow">
            {!selectedStudent || !selectedSubject || !selectedTerm ? (
              <div className="p-12 text-center">
                <Eye className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">Please select class, subject, and student to view exercises</p>
              </div>
            ) : exercises.length === 0 ? (
              <div className="p-12 text-center">
                <BookOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No exercises recorded yet for this student</p>
              </div>
            ) : (
              <div className="p-6">
                {/* Summary Card */}
                <div className="bg-gradient-to-r from-ghana-green to-green-600 text-white rounded-lg p-6 mb-6">
                  <h3 className="text-base md:text-lg font-semibold mb-4">Total Class Score Summary</h3>
                  <div className="grid md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-green-100 text-xs md:text-sm">Total Exercises</p>
                      <p className="text-xl md:text-2xl font-bold">{exercises.length}</p>
                    </div>
                    <div>
                      <p className="text-green-100 text-xs md:text-sm">Total Score</p>
                      <p className="text-xl md:text-2xl font-bold">{totalObtained.toFixed(2)} / {totalMax.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-green-100 text-xs md:text-sm">Percentage</p>
                      <p className="text-xl md:text-2xl font-bold">{percentage.toFixed(2)}%</p>
                    </div>
                    <div>
                      <p className="text-green-100 text-xs md:text-sm">Converted (Max 40)</p>
                      <p className="text-xl md:text-2xl font-bold">{convertedScore.toFixed(2)}</p>
                    </div>
                  </div>
                </div>

                {/* Exercises List */}
                <div className="space-y-4">
                  {exercises.map((exercise) => {
                    const percent = (exercise.score_obtained / exercise.max_score) * 100
                    return (
                      <div key={exercise.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              <h4 className="font-semibold text-gray-800 text-sm md:text-base">{exercise.exercise_name}</h4>
                              <span className="text-xs md:text-sm text-gray-500 flex items-center space-x-1">
                                <Calendar className="w-4 h-4" />
                                <span>{new Date(exercise.exercise_date).toLocaleDateString('en-GB')}</span>
                              </span>
                            </div>
                            <div className="flex items-center space-x-4 text-xs md:text-sm">
                              <span className="font-medium text-gray-700">
                                Score: {exercise.score_obtained} / {exercise.max_score}
                              </span>
                              <span className={`px-2 py-1 rounded-full text-[10px] md:text-xs font-semibold ${
                                percent >= 80 ? 'bg-green-100 text-green-800' :
                                percent >= 60 ? 'bg-blue-100 text-blue-800' :
                                percent >= 50 ? 'bg-yellow-100 text-yellow-800' :
                                'bg-red-100 text-red-800'
                              }`}>
                                {percent.toFixed(1)}%
                              </span>
                            </div>
                            {exercise.remarks && (
                              <p className="mt-2 text-xs md:text-sm text-gray-600">{exercise.remarks}</p>
                            )}
                          </div>
                          <div className="flex items-center space-x-2 ml-4">
                            {!isReadOnly && (
                              <>
                                <button
                                  onClick={() => startEdit(exercise)}
                                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                                  title="Edit"
                                >
                                  <Edit className="w-5 h-5" />
                                </button>
                                <button
                                  onClick={() => handleDelete(exercise.id)}
                                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                                  title="Delete"
                                >
                                  <Trash2 className="w-5 h-5" />
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Class Summary View */}
        {activeView === 'summary' && (
          <div className="bg-white rounded-lg shadow">
            {!selectedClass || !selectedSubject || !selectedTerm ? (
              <div className="p-12 text-center">
                <Calculator className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">Please select class and subject to view summary</p>
              </div>
            ) : classSummary.length === 0 ? (
              <div className="p-12 text-center">
                <BookOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No exercises recorded yet for this class and subject</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs md:text-sm font-medium text-gray-500 uppercase tracking-wider">
                        Student
                      </th>
                      <th className="px-6 py-3 text-left text-xs md:text-sm font-medium text-gray-500 uppercase tracking-wider">
                        Exercises
                      </th>
                      <th className="px-6 py-3 text-left text-xs md:text-sm font-medium text-gray-500 uppercase tracking-wider">
                        Total Score
                      </th>
                      <th className="px-6 py-3 text-left text-xs md:text-sm font-medium text-gray-500 uppercase tracking-wider">
                        Percentage
                      </th>
                      <th className="px-6 py-3 text-left text-xs md:text-sm font-medium text-gray-500 uppercase tracking-wider">
                        Class Score (Max 40)
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {classSummary.map((summary) => (
                      <tr key={summary.student_id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-xs md:text-sm font-medium text-gray-900">
                              {summary.student_name}
                            </div>
                            <div className="text-xs md:text-sm text-gray-500">{summary.student_number}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-xs md:text-sm text-gray-900">
                          {summary.exercise_count}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-xs md:text-sm text-gray-900">
                          {summary.total_obtained.toFixed(2)} / {summary.total_max.toFixed(2)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 inline-flex text-[10px] md:text-xs leading-5 font-semibold rounded-full ${
                            summary.percentage >= 80 ? 'bg-green-100 text-green-800' :
                            summary.percentage >= 60 ? 'bg-blue-100 text-blue-800' :
                            summary.percentage >= 50 ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {summary.percentage.toFixed(2)}%
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-xs md:text-sm font-semibold text-gray-900">
                          {summary.converted_score.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}

export default function ProtectedClassExercisesPage() {
  return (
    <AuthGuard requiredRole="teacher">
      <ClassExercisesPage />
    </AuthGuard>
  )
}
