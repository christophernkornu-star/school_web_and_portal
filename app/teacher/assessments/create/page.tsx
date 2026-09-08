'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import BackButton from '@/components/ui/back-button'
import { 
  ArrowLeft, Plus, Save, Trash2, CheckCircle2, Circle, 
  HelpCircle, AlertCircle, Calendar, Clock, BookOpen, Layers, 
  Award, FileText, Check, ChevronDown, Loader2
} from 'lucide-react'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'
import { toast } from 'react-hot-toast'
import { Skeleton } from '@/components/ui/skeleton'

interface Option {
  id: string
  text: string
  isCorrect: boolean
}

interface Question {
  id: string
  text: string
  type: 'multiple_choice' | 'true_false' | 'short_answer'
  points: number
  options: Option[]
}

export default function CreateQuizPage() {
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()
  
  const [loading, setLoading] = useState(false)
  const [fetchingData, setFetchingData] = useState(true)
  
  // Form States
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [selectedClass, setSelectedClass] = useState('')
  const [selectedSubject, setSelectedSubject] = useState('')
  const [selectedTerm, setSelectedTerm] = useState('')
  const [category, setCategory] = useState('Assignment')
  const [dueDate, setDueDate] = useState('')
  const [duration, setDuration] = useState<number | ''>('')
  
  // Data Lists
  const [classes, setClasses] = useState<any[]>([])
  const [subjects, setSubjects] = useState<any[]>([])
  const [terms, setTerms] = useState<any[]>([])
  const [isReadOnly, setIsReadOnly] = useState(false)
  
  // Cache for assignments to filter subjects locally
  const [allAssignments, setAllAssignments] = useState<any[]>([])

  const [questions, setQuestions] = useState<Question[]>([
    {
      id: '1',
      text: '',
      type: 'multiple_choice',
      points: 1,
      options: [
        { id: '1-1', text: '', isCorrect: true },
        { id: '1-2', text: '', isCorrect: false }
      ]
    }
  ])

  // Load Initial Data
  useEffect(() => {
    async function loadData() {
      try {
        setFetchingData(true)
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
          router.push('/login')
          return
        }

        const { data: teacherData } = await supabase
          .from('teachers')
          .select('id, status')
          .eq('profile_id', session.user.id)
          .single()

        if (!teacherData) {
          console.error('Teacher profile not found')
          return
        }

        if (teacherData.status === 'on_leave' || teacherData.status === 'on leave') {
          setIsReadOnly(true)
        }

        const newAssignments: any[] = []

        // Subject assignments
        const { data: subjectAssignments } = await supabase
          .from('teacher_subject_assignments')
          .select(`
             class_id,
             classes(id, name),
             subject_id,
             subjects(id, name, code)
          `)
          .eq('teacher_id', teacherData.id)

        if (subjectAssignments) {
          newAssignments.push(...subjectAssignments)
        }

        // Class teacher assignments
        const { data: classTeacherAssignments } = await supabase
          .from('teacher_class_assignments')
          .select(`
              class_id,
              classes(id, name)
          `)
          .eq('teacher_id', teacherData.id)
          .eq('is_class_teacher', true)
        
        if (classTeacherAssignments && classTeacherAssignments.length > 0) {
          const classIds = classTeacherAssignments.map((a: any) => a.class_id)
          const { data: classSubjects } = await supabase
            .from('class_subjects')
            .select(`
                class_id,
                subject_id,
                subjects(id, name, code)
            `)
            .in('class_id', classIds)

          if (classSubjects) {
            const mapped = classSubjects.map((cs: any) => {
              const cls = classTeacherAssignments.find((ct: any) => ct.class_id === cs.class_id)?.classes
              return {
                class_id: cs.class_id,
                classes: cls,
                subject_id: cs.subject_id,
                subjects: cs.subjects
              }
            })
            newAssignments.push(...mapped)
          }
        }

        if (newAssignments.length === 0) {
          const { data: rpcClasses } = await supabase.rpc('get_teacher_classes', { p_profile_id: session.user.id })
          if (rpcClasses) {
            const uniqueClasses = Array.from(new Map(rpcClasses.map((c: any) => [c.id, c])).values())
            setClasses(uniqueClasses)
          }
        } else {
          setAllAssignments(newAssignments)
          const uniqueClasses = Array.from(new Map(
            newAssignments
              .filter((a: any) => a.classes)
              .map((a: any) => [a.classes.id, a.classes])
          ).values())
          
          setClasses(uniqueClasses)
        }

        // Fetch Current Term
        const { data: termData } = await supabase
          .from('academic_terms')
          .select('*')
          .eq('is_current', true)
          .single()
            
        if (termData) {
          setTerms([termData])
          setSelectedTerm(termData.id)
        } else {
          const { data: allTerms } = await supabase.from('academic_terms').select('*').order('start_date', { ascending: false })
          if (allTerms) setTerms(allTerms)
        }

      } catch (error) {
        console.error('Error loading data:', error)
        toast.error('Failed to load initial data')
      } finally {
        setFetchingData(false)
      }
    }
    loadData()
  }, [router, supabase])

  // Update Subjects when Class changes
  useEffect(() => {
    if (!selectedClass) {
      setSubjects([])
      return
    }
    
    const classAssignments = allAssignments.filter((a: any) => a.class_id === selectedClass && a.subjects)
    
    if (classAssignments.length > 0) {
      const uniqueSubjects = Array.from(new Map(
        classAssignments.map((a: any) => [a.subjects.id, a.subjects])
      ).values())
      
      setSubjects(uniqueSubjects)
    } else {
      const loadAllSubjects = async () => {
        const { data } = await supabase
          .from('class_subjects')
          .select(`
            subject_id,
            subjects (id, name, code)
          `)
          .eq('class_id', selectedClass)

        if (data) {
          const mapped = data.map((d: any) => ({
            id: d.subjects.id,
            name: d.subjects.name,
            code: d.subjects.code
          }))
          setSubjects(mapped)
        }
      }
      loadAllSubjects()
    }
    
    setSelectedSubject('')
  }, [selectedClass, allAssignments, supabase])

  const addQuestion = () => {
    const newId = Math.random().toString(36).substr(2, 9)
    setQuestions([
      ...questions,
      {
        id: newId,
        text: '',
        type: 'multiple_choice',
        points: 1,
        options: [
          { id: `${newId}-1`, text: '', isCorrect: true },
          { id: `${newId}-2`, text: '', isCorrect: false }
        ]
      }
    ])
  }

  const removeQuestion = (index: number) => {
    if (questions.length === 1) {
      toast.error('Assessment must contain at least one question')
      return
    }
    const newQuestions = [...questions]
    newQuestions.splice(index, 1)
    setQuestions(newQuestions)
  }

  const updateQuestion = (index: number, field: keyof Question, value: any) => {
    const newQuestions = [...questions]
    newQuestions[index] = { ...newQuestions[index], [field]: value }
    
    if (field === 'type') {
      if (value === 'true_false') {
        newQuestions[index].options = [
          { id: Math.random().toString(), text: 'True', isCorrect: true },
          { id: Math.random().toString(), text: 'False', isCorrect: false }
        ]
      } else if (value === 'short_answer') {
        newQuestions[index].options = []
      } else if (value === 'multiple_choice' && newQuestions[index].options.length === 0) {
        newQuestions[index].options = [
          { id: Math.random().toString(), text: '', isCorrect: true },
          { id: Math.random().toString(), text: '', isCorrect: false }
        ]
      }
    }
    
    setQuestions(newQuestions)
  }

  const addOption = (questionIndex: number) => {
    const newQuestions = [...questions]
    newQuestions[questionIndex].options.push({
      id: Math.random().toString(),
      text: '',
      isCorrect: false
    })
    setQuestions(newQuestions)
  }

  const removeOption = (questionIndex: number, optionIndex: number) => {
    if (questions[questionIndex].options.length <= 2) {
      toast.error('Multiple choice questions require at least two options')
      return
    }
    const newQuestions = [...questions]
    newQuestions[questionIndex].options.splice(optionIndex, 1)
    setQuestions(newQuestions)
  }

  const updateOption = (questionIndex: number, optionIndex: number, field: keyof Option, value: any) => {
    const newQuestions = [...questions]
    if (field === 'isCorrect' && newQuestions[questionIndex].type === 'multiple_choice') {
      newQuestions[questionIndex].options.forEach((opt, idx) => {
        opt.isCorrect = idx === optionIndex ? value : false
      })
    } else {
      newQuestions[questionIndex].options[optionIndex] = { 
        ...newQuestions[questionIndex].options[optionIndex], 
        [field]: value 
      }
    }
    setQuestions(newQuestions)
  }

  const handleSubmit = async (status: 'draft' | 'published') => {
    if (isReadOnly) {
      toast.error('You cannot create assessments while on leave.')
      return
    }

    if (!title.trim() || !selectedClass || !selectedSubject || !selectedTerm) {
      toast.error('Please fill in title, class, subject, and term')
      return
    }

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i]
      if (!q.text.trim()) {
        toast.error(`Question ${i + 1} text cannot be empty`)
        return
      }
      if (q.type === 'multiple_choice' || q.type === 'true_false') {
        const hasCorrect = q.options.some(opt => opt.isCorrect)
        if (!hasCorrect) {
          toast.error(`Question ${i + 1} must have a marked correct answer`)
          return
        }
        const hasEmptyOption = q.options.some(opt => !opt.text.trim())
        if (hasEmptyOption) {
          toast.error(`Question ${i + 1} contains blank options`)
          return
        }
      }
    }

    setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not authenticated')

      const { data: teacherData } = await supabase
        .from('teachers')
        .select('id')
        .eq('profile_id', session.user.id)
        .single()

      if (!teacherData) throw new Error('Teacher profile not found')

      const totalPoints = questions.reduce((sum, q) => sum + (Number(q.points) || 0), 0)

      // 1. Create Quiz
      const { data: quizData, error: quizError } = await supabase
        .from('online_quizzes')
        .insert({
          title: title.trim(),
          description: description.trim() || null,
          teacher_id: teacherData.id,
          class_id: selectedClass,
          subject_id: selectedSubject,
          term_id: selectedTerm,
          category,
          status,
          due_date: dueDate || null,
          duration_minutes: duration || null,
          total_points: totalPoints
        })
        .select()
        .single()

      if (quizError) throw quizError

      // 2. Insert Questions & Options
      for (let i = 0; i < questions.length; i++) {
        const q = questions[i]
        const { data: qData, error: qError } = await supabase
          .from('quiz_questions')
          .insert({
            quiz_id: quizData.id,
            question_text: q.text.trim(),
            question_type: q.type,
            points: Number(q.points) || 1,
            position: i
          })
          .select()
          .single()

        if (qError) throw qError

        if (q.options && q.options.length > 0) {
          const optionsToInsert = q.options.map(opt => ({
            question_id: qData.id,
            option_text: opt.text.trim(),
            is_correct: opt.isCorrect
          }))
          
          const { error: optError } = await supabase
            .from('quiz_options')
            .insert(optionsToInsert)
          
          if (optError) throw optError
        }
      }

      toast.success(status === 'published' ? 'Assessment published successfully!' : 'Assessment draft saved!')
      router.push('/teacher/assessments')

    } catch (error: any) {
      console.error('Error creating assessment:', error)
      toast.error(error.message || 'Failed to create assessment')
    } finally {
      setLoading(false)
    }
  }

  const totalCalculatedPoints = questions.reduce((sum, q) => sum + (Number(q.points) || 0), 0)

  if (fetchingData) {
    return (
      <div className="min-h-screen bg-gray-50/50 dark:bg-gray-900 pb-20">
        <header className="bg-white dark:bg-gray-800 shadow-sm sticky top-0 z-20 border-b border-gray-100 dark:border-gray-700">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Skeleton className="h-9 w-9 rounded-xl" />
              <Skeleton className="h-6 w-40 rounded-lg" />
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-9 w-24 rounded-xl" />
              <Skeleton className="h-9 w-24 rounded-xl" />
            </div>
          </div>
        </header>
        <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6">
          <Skeleton className="h-64 w-full rounded-3xl" />
          <Skeleton className="h-48 w-full rounded-3xl" />
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50/50 dark:bg-gray-900 pb-24 font-sans text-gray-900 dark:text-gray-100">
      {isReadOnly && (
        <div className="bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-800 px-4 py-2.5">
          <div className="max-w-4xl mx-auto flex items-center space-x-2.5 text-xs sm:text-sm text-amber-900 dark:text-amber-200 font-semibold">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>Read-Only Mode: You are marked as &ldquo;On Leave&rdquo; and cannot publish new assessments.</span>
          </div>
        </div>
      )}

      {/* Sticky Top Header */}
      <header className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-md border-b border-gray-200/80 dark:border-gray-800 sticky top-0 z-30 shadow-sm">
        <div className="max-w-4xl mx-auto px-3.5 sm:px-6 py-3 sm:py-3.5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
              <BackButton href="/teacher/assessments" className="shrink-0 shadow-sm" />
              <div className="min-w-0">
                <h1 className="text-base sm:text-xl font-black text-gray-900 dark:text-white tracking-tight truncate">
                  Create Assessment
                </h1>
                <p className="text-[11px] sm:text-xs text-gray-400 font-medium hidden sm:block truncate">
                  Author questions and set submission requirements
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => handleSubmit('draft')}
                disabled={loading || isReadOnly}
                className="px-3 sm:px-4 py-2 text-xs sm:text-sm font-bold text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-xl disabled:opacity-50 transition active:scale-95 shadow-sm"
              >
                Save Draft
              </button>
              <button
                type="button"
                onClick={() => handleSubmit('published')}
                disabled={loading || isReadOnly}
                className="px-3.5 sm:px-5 py-2 text-xs sm:text-sm font-bold bg-[#003B5C] hover:bg-[#002a42] text-white rounded-xl disabled:opacity-50 flex items-center gap-1.5 transition active:scale-95 shadow-md"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    <span>Publish</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-3.5 sm:px-6 py-5 sm:py-8 space-y-6 sm:space-y-8">
        
        {/* Assessment Settings Card */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl sm:rounded-3xl shadow-sm border border-gray-200/80 dark:border-gray-700 p-4 sm:p-6 lg:p-8 space-y-5">
          <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-700 pb-3">
            <h2 className="text-xs sm:text-sm font-black uppercase tracking-wider text-[#003B5C] dark:text-blue-400 flex items-center gap-2">
              <FileText className="w-4 h-4" />
              <span>Assessment Configuration</span>
            </h2>
            <span className="text-[11px] font-bold text-gray-400 bg-gray-100 dark:bg-gray-700 px-2.5 py-0.5 rounded-full">
              Required Details
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
            {/* Title */}
            <div className="col-span-1 sm:col-span-2 lg:col-span-3">
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                Assessment Title <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Mid-Term Integrated Science Test"
                className="w-full px-3.5 py-2.5 sm:py-3 text-xs sm:text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50/50 dark:bg-gray-900/50 focus:bg-white dark:focus:bg-gray-900 focus:ring-2 focus:ring-[#003B5C] outline-none font-medium transition"
              />
            </div>

            {/* Description */}
            <div className="col-span-1 sm:col-span-2 lg:col-span-3">
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                Instructions / Description <span className="text-gray-400 font-normal">(Optional)</span>
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                placeholder="Read all instructions carefully before answering..."
                className="w-full px-3.5 py-2.5 sm:py-3 text-xs sm:text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50/50 dark:bg-gray-900/50 focus:bg-white dark:focus:bg-gray-900 focus:ring-2 focus:ring-[#003B5C] outline-none font-medium transition resize-none"
              />
            </div>

            {/* Class */}
            <div className="col-span-1">
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                Class <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <select
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                  className="w-full px-3.5 py-2.5 sm:py-3 text-xs sm:text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50/50 dark:bg-gray-900/50 text-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-[#003B5C] font-bold appearance-none cursor-pointer"
                >
                  <option value="">Select Class</option>
                  {classes.map((c: any) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* Subject */}
            <div className="col-span-1">
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                Subject <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <select
                  value={selectedSubject}
                  onChange={(e) => setSelectedSubject(e.target.value)}
                  disabled={!selectedClass}
                  className="w-full px-3.5 py-2.5 sm:py-3 text-xs sm:text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50/50 dark:bg-gray-900/50 text-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-[#003B5C] font-bold appearance-none cursor-pointer disabled:opacity-50"
                >
                  <option value="">{selectedClass ? 'Select Subject' : 'Select Class First'}</option>
                  {subjects.map((s: any) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* Category */}
            <div className="col-span-1">
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                Assessment Category
              </label>
              <div className="relative">
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3.5 py-2.5 sm:py-3 text-xs sm:text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50/50 dark:bg-gray-900/50 text-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-[#003B5C] font-bold appearance-none cursor-pointer"
                >
                  <option value="Assignment">Assignment / Homework</option>
                  <option value="Test">Class Test</option>
                  <option value="Exam">Terminal Examination</option>
                </select>
                <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* Academic Term */}
            <div className="col-span-1">
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                Term Session <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <select
                  value={selectedTerm}
                  onChange={(e) => setSelectedTerm(e.target.value)}
                  className="w-full px-3.5 py-2.5 sm:py-3 text-xs sm:text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50/50 dark:bg-gray-900/50 text-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-[#003B5C] font-bold appearance-none cursor-pointer"
                >
                  {terms.map((t: any) => (
                    <option key={t.id} value={t.id}>{t.name} ({t.academic_year})</option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* Due Date */}
            <div className="col-span-1">
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                Submission Due Date
              </label>
              <input
                type="datetime-local"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3.5 py-2.5 sm:py-3 text-xs sm:text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50/50 dark:bg-gray-900/50 text-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-[#003B5C] font-medium"
              />
            </div>

            {/* Duration */}
            <div className="col-span-1">
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                Time Limit (Minutes)
              </label>
              <input
                type="number"
                min={1}
                placeholder="Untimed (empty)"
                value={duration}
                onChange={(e) => setDuration(parseInt(e.target.value) || '')}
                className="w-full px-3.5 py-2.5 sm:py-3 text-xs sm:text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50/50 dark:bg-gray-900/50 text-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-[#003B5C] font-medium"
              />
            </div>
          </div>
        </div>

        {/* Questions Header / Metrics */}
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <h2 className="text-sm sm:text-base font-black text-gray-900 dark:text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#003B5C] dark:text-blue-400" />
              <span>Questions</span>
            </h2>
            <span className="text-xs font-bold bg-[#003B5C]/10 text-[#003B5C] dark:bg-[#003B5C]/30 dark:text-blue-300 px-2.5 py-0.5 rounded-full">
              {questions.length}
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-xs font-bold text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-800 px-3 py-1.5 rounded-xl border border-gray-200/80 dark:border-gray-700 shadow-sm">
            <Award className="w-3.5 h-3.5 text-[#003B5C] dark:text-blue-400" />
            <span>Total: {totalCalculatedPoints} Pts</span>
          </div>
        </div>

        {/* Question Cards Stack */}
        <div className="space-y-4 sm:space-y-6">
          {questions.map((question, index) => (
            <div
              key={question.id}
              className="bg-white dark:bg-gray-800 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-sm border border-gray-200/80 dark:border-gray-700 space-y-4 transition-all"
            >
              {/* Question Header & Controls */}
              <div className="flex items-center justify-between gap-3 border-b border-gray-100 dark:border-gray-700/60 pb-3">
                <div className="flex items-center gap-2">
                  <span className="w-7 h-7 rounded-xl bg-[#003B5C] text-white flex items-center justify-center font-black text-xs shrink-0 shadow-sm">
                    {index + 1}
                  </span>
                  <span className="text-xs sm:text-sm font-black text-gray-800 dark:text-gray-200">
                    Question {index + 1}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => removeQuestion(index)}
                    className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition"
                    title="Remove question"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Question Textarea */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                  Question Prompt
                </label>
                <textarea
                  value={question.text}
                  onChange={(e) => updateQuestion(index, 'text', e.target.value)}
                  rows={2}
                  placeholder="Enter your question statement or problem..."
                  className="w-full px-3.5 py-2.5 sm:py-3 text-xs sm:text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50/50 dark:bg-gray-900/50 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-[#003B5C] font-medium resize-none transition"
                />
              </div>

              {/* Type and Points Responsive Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                    Question Type
                  </label>
                  <div className="relative">
                    <select
                      value={question.type}
                      onChange={(e) => updateQuestion(index, 'type', e.target.value)}
                      className="w-full px-3.5 py-2.5 text-xs sm:text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-700 text-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-[#003B5C] font-bold appearance-none cursor-pointer"
                    >
                      <option value="multiple_choice">Multiple Choice (Single Best)</option>
                      <option value="true_false">True / False</option>
                      <option value="short_answer">Short Answer (Open text)</option>
                    </select>
                    <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                    Marks / Points
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={question.points}
                    onChange={(e) => updateQuestion(index, 'points', parseInt(e.target.value) || 0)}
                    className="w-full px-3.5 py-2.5 text-xs sm:text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-700 text-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-[#003B5C] font-bold"
                  />
                </div>
              </div>

              {/* Options Area (MCQ / True-False) */}
              {(question.type === 'multiple_choice' || question.type === 'true_false') && (
                <div className="space-y-2.5 pt-2 border-t border-gray-100 dark:border-gray-700/60">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                      Answer Choices (Select Correct Answer)
                    </label>
                  </div>

                  <div className="space-y-2">
                    {question.options.map((option, optIndex) => (
                      <div
                        key={option.id}
                        className={`flex items-center gap-2.5 p-2 sm:p-2.5 rounded-xl border transition ${
                          option.isCorrect 
                            ? 'border-emerald-300 bg-emerald-50/50 dark:bg-emerald-950/20 dark:border-emerald-800' 
                            : 'border-gray-200 dark:border-gray-700 bg-gray-50/40 dark:bg-gray-900/30'
                        }`}
                      >
                        {/* Radio Selector */}
                        <button
                          type="button"
                          onClick={() => updateOption(index, optIndex, 'isCorrect', true)}
                          className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition ${
                            option.isCorrect 
                              ? 'bg-emerald-600 text-white shadow-sm' 
                              : 'border-2 border-gray-300 dark:border-gray-600 hover:border-emerald-500'
                          }`}
                          title="Mark as correct answer"
                        >
                          {option.isCorrect && <Check className="w-3.5 h-3.5" />}
                        </button>

                        {/* Input Field */}
                        <input
                          type="text"
                          value={option.text}
                          readOnly={question.type === 'true_false'}
                          onChange={(e) => updateOption(index, optIndex, 'text', e.target.value)}
                          placeholder={`Option ${optIndex + 1}`}
                          className={`flex-1 min-w-0 bg-transparent text-xs sm:text-sm font-semibold outline-none text-gray-900 dark:text-white placeholder:text-gray-400 ${
                            question.type === 'true_false' ? 'cursor-default select-none' : ''
                          }`}
                        />

                        {/* Remove Option */}
                        {question.type === 'multiple_choice' && (
                          <button
                            type="button"
                            onClick={() => removeOption(index, optIndex)}
                            className="p-1.5 text-gray-400 hover:text-rose-600 rounded-lg shrink-0 transition"
                            title="Delete option"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  {question.type === 'multiple_choice' && (
                    <button
                      type="button"
                      onClick={() => addOption(index)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 mt-1 text-xs font-bold text-[#003B5C] dark:text-blue-400 hover:bg-[#003B5C]/10 rounded-xl transition active:scale-95"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Option</span>
                    </button>
                  )}
                </div>
              )}

              {/* Short Answer Helper Notice */}
              {question.type === 'short_answer' && (
                <div className="p-3.5 bg-gray-50 dark:bg-gray-900/40 rounded-xl border border-gray-100 dark:border-gray-700/60 text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2">
                  <HelpCircle className="w-4 h-4 text-gray-400 shrink-0" />
                  <span>Learners will be provided a free-form text box to write their response.</span>
                </div>
              )}
            </div>
          ))}

          {/* Add Question Button */}
          <button
            type="button"
            onClick={addQuestion}
            className="w-full py-4 border-2 border-dashed border-gray-300 dark:border-gray-700 hover:border-[#003B5C] dark:hover:border-blue-400 rounded-2xl sm:rounded-3xl text-gray-500 dark:text-gray-400 hover:text-[#003B5C] dark:hover:text-blue-400 transition flex items-center justify-center gap-2 bg-white dark:bg-gray-800 shadow-sm active:scale-[0.99] font-bold text-xs sm:text-sm"
          >
            <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
            <span>Add Another Question</span>
          </button>
        </div>
      </main>
    </div>
  )
}