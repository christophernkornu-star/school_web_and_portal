'use client'

import { useState, useEffect, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import BackButton from '@/components/ui/back-button'
import { 
  CheckCircle2, 
  XCircle, 
  Save, 
  MessageSquareText, 
  Award, 
  Clock, 
  AlertCircle,
  GraduationCap,
  Plus,
  Trash2,
  ChevronDown,
  HelpCircle,
  ShieldAlert,
  Loader2,
  FileText
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
  isNew?: boolean
  dbId?: string
}

export default function EditQuizPage() {
  const params = useParams()
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()
  const quizId = params.id as string

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
  
  // Metadata Lists
  const [classes, setClasses] = useState<any[]>([])
  const [subjects, setSubjects] = useState<any[]>([])
  const [terms, setTerms] = useState<any[]>([])
  
  const [questions, setQuestions] = useState<Question[]>([])
  const [isReadOnly, setIsReadOnly] = useState(false)

  // Load Initial Quiz & Teacher Status
  useEffect(() => {
    async function loadData() {
      try {
        setFetchingData(true)
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
          router.push('/login?portal=teacher')
          return
        }

        // Check Teacher Status (Leave guard)
        const { data: teacherData } = await supabase
          .from('teachers')
          .select('status')
          .eq('profile_id', session.user.id)
          .single()
        
        if (teacherData?.status === 'on_leave' || teacherData?.status === 'on leave') {
          setIsReadOnly(true)
        }

        // Fetch Classes & Terms
        const { data: classesData } = await supabase.rpc('get_teacher_classes', { p_profile_id: session.user.id })
        if (classesData) {
          setClasses(classesData.map((c: any) => ({
            id: c.class_id || c.id,
            name: c.class_name || c.name
          })))
        }
        
        const { data: allTerms } = await supabase
          .from('academic_terms')
          .select('*')
          .order('start_date', { ascending: false })
        if (allTerms) setTerms(allTerms)

        // Fetch Quiz Data
        const { data: quizData, error: quizError } = await supabase
          .from('online_quizzes')
          .select('*')
          .eq('id', quizId)
          .single()

        if (quizError) throw quizError

        // Populate Form
        setTitle(quizData.title || '')
        setDescription(quizData.description || '')
        setSelectedClass(quizData.class_id || '')
        setSelectedSubject(quizData.subject_id || '')
        setSelectedTerm(quizData.term_id || '')
        setCategory(quizData.category || 'Assignment')
        setDueDate(quizData.due_date ? new Date(quizData.due_date).toISOString().slice(0, 16) : '')
        setDuration(quizData.duration_minutes || '')

        // Fetch Questions with Options
        const { data: qData, error: qError } = await supabase
          .from('quiz_questions')
          .select(`
            *,
            quiz_options (*)
          `)
          .eq('quiz_id', quizId)
          .order('position', { ascending: true })

        if (qError) throw qError

        const mappedQuestions: Question[] = (qData || []).map((q: any) => ({
          id: q.id,
          dbId: q.id,
          text: q.question_text || '',
          type: q.question_type,
          points: q.points || 1,
          isNew: false,
          options: (q.quiz_options || []).map((o: any) => ({
            id: o.id,
            text: o.option_text || '',
            isCorrect: Boolean(o.is_correct)
          }))
        }))

        setQuestions(mappedQuestions)

      } catch (error) {
        console.error('Error loading quiz data:', error)
        toast.error('Failed to load quiz data')
      } finally {
        setFetchingData(false)
      }
    }

    if (quizId) loadData()
  }, [quizId, router, supabase])

  // Load Subjects dynamically when Class changes
  useEffect(() => {
    async function loadSubjects() {
      if (!selectedClass) {
        setSubjects([])
        return
      }
      
      const { data } = await supabase
        .from('class_subjects')
        .select('subject_id, subjects(id, name, code)')
        .eq('class_id', selectedClass)
        
      if (data) {
        setSubjects(data.map((item: any) => ({
          id: item.subjects.id,
          name: item.subjects.name,
          code: item.subjects.code
        })))
      }
    }
    loadSubjects()
  }, [selectedClass, supabase])

  // Total Points Computation
  const totalPoints = useMemo(() => {
    return questions.reduce((sum, q) => sum + (Number(q.points) || 0), 0)
  }, [questions])

  // Question Handlers
  const addQuestion = () => {
    const newId = Math.random().toString(36).substring(2, 9)
    setQuestions(prev => [
      ...prev,
      {
        id: newId,
        text: '',
        type: 'multiple_choice',
        points: 1,
        isNew: true,
        options: [
          { id: `${newId}-1`, text: '', isCorrect: false },
          { id: `${newId}-2`, text: '', isCorrect: false }
        ]
      }
    ])
  }

  const removeQuestion = (index: number) => {
    setQuestions(prev => {
      const copy = [...prev]
      copy.splice(index, 1)
      return copy
    })
  }

  const updateQuestion = (index: number, field: keyof Question, value: any) => {
    setQuestions(prev => {
      const copy = [...prev]
      copy[index] = { ...copy[index], [field]: value }

      if (field === 'type') {
        if (value === 'true_false') {
          copy[index].options = [
            { id: Math.random().toString(), text: 'True', isCorrect: true },
            { id: Math.random().toString(), text: 'False', isCorrect: false }
          ]
        } else if (value === 'short_answer') {
          copy[index].options = []
        } else if (value === 'multiple_choice' && copy[index].options.length === 0) {
          copy[index].options = [
            { id: Math.random().toString(), text: '', isCorrect: false },
            { id: Math.random().toString(), text: '', isCorrect: false }
          ]
        }
      }
      return copy
    })
  }

  // Option Handlers
  const addOption = (questionIndex: number) => {
    setQuestions(prev => {
      const copy = [...prev]
      copy[questionIndex].options.push({
        id: Math.random().toString(),
        text: '',
        isCorrect: false
      })
      return copy
    })
  }

  const removeOption = (questionIndex: number, optionIndex: number) => {
    setQuestions(prev => {
      const copy = [...prev]
      copy[questionIndex].options.splice(optionIndex, 1)
      return copy
    })
  }

  const updateOption = (questionIndex: number, optionIndex: number, field: keyof Option, value: any) => {
    setQuestions(prev => {
      const copy = [...prev]
      if (field === 'isCorrect' && copy[questionIndex].type === 'multiple_choice') {
        copy[questionIndex].options.forEach((opt, idx) => {
          opt.isCorrect = idx === optionIndex ? value : false
        })
      } else {
        copy[questionIndex].options[optionIndex] = {
          ...copy[questionIndex].options[optionIndex],
          [field]: value
        }
      }
      return copy
    })
  }

  const handleSubmit = async (status: 'draft' | 'published') => {
    if (isReadOnly) {
      toast.error('You cannot update assessments while on leave.')
      return
    }
    
    if (!title.trim() || !selectedClass || !selectedSubject || !selectedTerm) {
      toast.error('Please complete all required fields (Title, Class, Subject, Term).')
      return
    }

    setLoading(true)
    try {
      // Check if students have already attempted this quiz
      const { count } = await supabase
        .from('student_quiz_attempts')
        .select('*', { count: 'exact', head: true })
        .eq('quiz_id', quizId)
      
      if (count && count > 0) {
        if (!confirm(`Warning: There are ${count} student attempt(s) logged for this assessment. Re-saving questions will reset their submitted answers. Continue anyway?`)) {
          setLoading(false)
          return
        }
      }

      // 1. Update Quiz Record
      const { error: updateError } = await supabase
        .from('online_quizzes')
        .update({
          title: title.trim(),
          description: description.trim() || null,
          class_id: selectedClass,
          subject_id: selectedSubject,
          term_id: selectedTerm,
          category,
          status,
          due_date: dueDate ? new Date(dueDate).toISOString() : null,
          duration_minutes: duration || null,
          total_points: totalPoints,
          updated_at: new Date().toISOString()
        })
        .eq('id', quizId)

      if (updateError) throw updateError

      // 2. Refresh Questions (Delete & Re-insert)
      await supabase.from('quiz_questions').delete().eq('quiz_id', quizId)

      for (let i = 0; i < questions.length; i++) {
        const q = questions[i]
        const { data: qData, error: qError } = await supabase
          .from('quiz_questions')
          .insert({
            quiz_id: quizId,
            question_text: q.text.trim() || `Question ${i + 1}`,
            question_type: q.type,
            points: q.points || 1,
            position: i
          })
          .select()
          .single()
        
        if (qError) throw qError

        if (q.options && q.options.length > 0) {
          const optionsToInsert = q.options.map(opt => ({
            question_id: qData.id,
            option_text: opt.text.trim() || 'Option',
            is_correct: opt.isCorrect
          }))
          await supabase.from('quiz_options').insert(optionsToInsert)
        }
      }

      toast.success(status === 'published' ? 'Assessment updated and published!' : 'Draft saved successfully!')
      router.push(`/teacher/assessments/${quizId}`)

    } catch (error: any) {
      console.error('Update error:', error)
      toast.error(error.message || 'Failed to update assessment')
    } finally {
      setLoading(false)
    }
  }

  if (fetchingData) {
    return <EditQuizSkeleton />
  }

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-900 font-sans text-slate-900 dark:text-slate-100 flex flex-col transition-colors selection:bg-[#003B5C] selection:text-white">
      
      {/* Read-Only Status Banner */}
      {isReadOnly && (
        <div className="bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-900/50 px-4 py-2.5">
          <div className="max-w-4xl mx-auto flex items-center gap-2.5 text-xs font-semibold text-amber-800 dark:text-amber-300">
            <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
            <span>Read-Only Mode: You are currently on leave and cannot modify assessment parameters.</span>
          </div>
        </div>
      )}

      {/* Sticky Header with Adaptive Action Bar */}
      <header className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div className="max-w-4xl mx-auto px-3.5 sm:px-6 lg:px-8 py-3 sm:py-3.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            
            {/* Title & Navigation */}
            <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
              <BackButton href={`/teacher/assessments/${quizId}`} />
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-4 bg-amber-400 rounded-full shrink-0" />
                  <h1 className="text-base sm:text-lg md:text-xl font-black text-slate-900 dark:text-white tracking-tight truncate">
                    Edit Assessment
                  </h1>
                </div>
                <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium truncate mt-0.5">
                  Configure questions, options, point allocations, and submission parameters
                </p>
              </div>
            </div>

            {/* Actions Bar */}
            <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 justify-end">
              <button
                type="button"
                onClick={() => handleSubmit('draft')}
                disabled={loading || isReadOnly}
                className="flex-1 sm:flex-none px-3.5 py-2 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition active:scale-95 disabled:opacity-50 text-center shadow-2xs"
              >
                Save Draft
              </button>

              <button
                type="button"
                onClick={() => handleSubmit('published')}
                disabled={loading || isReadOnly}
                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-[#003B5C] hover:bg-[#002a42] text-white shadow-xs hover:shadow transition active:scale-95 disabled:opacity-50 text-center cursor-pointer"
              >
                {loading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
                ) : (
                  <Save className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                )}
                <span>{loading ? 'Saving...' : 'Update & Publish'}</span>
              </button>
            </div>

          </div>
        </div>
      </header>

      {/* Main Workspace (pb-12 is sufficient now that bottom bar is removed) */}
      <main className="flex-1 max-w-4xl mx-auto w-full px-3.5 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8 space-y-5 sm:space-y-6 pb-16">
        
        {/* Section 1: Assessment Meta Configuration */}
        <section className="bg-white dark:bg-slate-800/90 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-700/80 p-4 sm:p-6 shadow-xs space-y-4 sm:space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-4 bg-amber-400 rounded-full shrink-0" />
              <h2 className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white">
                Assessment Metadata &amp; Rules
              </h2>
            </div>
            <span className="text-[10px] sm:text-xs font-mono font-bold text-slate-400">
              Weight: {totalPoints} Pts
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-4">
            
            {/* Title (Full width) */}
            <div className="md:col-span-2 space-y-1">
              <label className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                Assessment Title <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                disabled={isReadOnly}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Mid-Term Computing & Algorithms Test"
                className="w-full px-3.5 py-2.5 text-xs sm:text-sm font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-[#003B5C] transition placeholder:text-slate-400"
              />
            </div>

            {/* Description (Full width) */}
            <div className="md:col-span-2 space-y-1">
              <label className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                Instructions / Description
              </label>
              <textarea
                rows={2}
                value={description}
                disabled={isReadOnly}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Guidelines, formulas provided, or special instructions for students..."
                className="w-full px-3.5 py-2 text-xs sm:text-sm font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-[#003B5C] transition resize-none placeholder:text-slate-400"
              />
            </div>

            {/* Class Cohort Dropdown */}
            <div className="space-y-1">
              <label className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                Class Cohort <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <select
                  value={selectedClass}
                  disabled={isReadOnly}
                  onChange={(e) => setSelectedClass(e.target.value)}
                  className="w-full appearance-none px-3.5 py-2.5 text-xs sm:text-sm font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-[#003B5C] transition cursor-pointer pr-8"
                >
                  <option value="">Select Cohort</option>
                  {classes.map((c: any) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* Subject Dropdown */}
            <div className="space-y-1">
              <label className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                Subject Specialization <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <select
                  value={selectedSubject}
                  disabled={isReadOnly || !selectedClass}
                  onChange={(e) => setSelectedSubject(e.target.value)}
                  className="w-full appearance-none px-3.5 py-2.5 text-xs sm:text-sm font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-[#003B5C] transition cursor-pointer pr-8 disabled:opacity-50"
                >
                  <option value="">{selectedClass ? 'Select Subject' : 'Select Class First'}</option>
                  {subjects.map((s: any) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* Category Dropdown */}
            <div className="space-y-1">
              <label className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                Assessment Category
              </label>
              <div className="relative">
                <select
                  value={category}
                  disabled={isReadOnly}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full appearance-none px-3.5 py-2.5 text-xs sm:text-sm font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-[#003B5C] transition cursor-pointer pr-8"
                >
                  <option value="Assignment">Class Exercise / Assignment</option>
                  <option value="Exam">Terminal Mock / Exam</option>
                  <option value="Test">Continuous Assessment Test</option>
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* Term Dropdown */}
            <div className="space-y-1">
              <label className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                Academic Term <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <select
                  value={selectedTerm}
                  disabled={isReadOnly}
                  onChange={(e) => setSelectedTerm(e.target.value)}
                  className="w-full appearance-none px-3.5 py-2.5 text-xs sm:text-sm font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-[#003B5C] transition cursor-pointer pr-8"
                >
                  {terms.map((t: any) => (
                    <option key={t.id} value={t.id}>{t.name} ({t.academic_year})</option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* Due Date Input */}
            <div className="space-y-1">
              <label className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                Submission Deadline
              </label>
              <input
                type="datetime-local"
                value={dueDate}
                disabled={isReadOnly}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs sm:text-sm font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-[#003B5C] transition"
              />
            </div>

            {/* Duration Input */}
            <div className="space-y-1">
              <label className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                Time Limit (Minutes)
              </label>
              <div className="relative">
                <input
                  type="number"
                  min={1}
                  value={duration}
                  disabled={isReadOnly}
                  onChange={(e) => setDuration(parseInt(e.target.value) || '')}
                  placeholder="e.g. 45"
                  className="w-full px-3.5 py-2.5 text-xs sm:text-sm font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-[#003B5C] transition pr-14"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 pointer-events-none">
                  mins
                </span>
              </div>
            </div>

          </div>
        </section>

        {/* Section 2: Questions Builder */}
        <section className="space-y-4">
          
          {/* Builder Section Header */}
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
                <span className="w-1.5 h-4 bg-amber-400 rounded-full shrink-0" />
                <span>Test Items ({questions.length})</span>
              </h2>
              <p className="text-[11px] text-slate-400 font-medium hidden sm:block">
                Total Allocated Weight: {totalPoints} Points
              </p>
            </div>

            <button
              type="button"
              onClick={addQuestion}
              disabled={isReadOnly}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-[#003B5C] dark:text-blue-300 border border-blue-200/80 dark:border-blue-900/50 text-xs font-bold rounded-xl transition active:scale-95 disabled:opacity-50"
            >
              <Plus className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <span>Add Question</span>
            </button>
          </div>

          {/* Question Cards List */}
          {questions.length === 0 ? (
            <div className="bg-white dark:bg-slate-800/90 rounded-2xl sm:rounded-3xl border border-dashed border-slate-300 dark:border-slate-700 p-8 sm:p-12 text-center space-y-3">
              <FileText className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto" />
              <p className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300">No questions attached to this assessment</p>
              <button
                type="button"
                onClick={addQuestion}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#003B5C] text-white rounded-xl text-xs font-bold transition active:scale-95"
              >
                <Plus className="w-3.5 h-3.5 text-amber-400" />
                <span>Add First Item</span>
              </button>
            </div>
          ) : (
            <div className="space-y-4 sm:space-y-5">
              {questions.map((question, qIdx) => (
                <div 
                  key={question.id}
                  className="bg-white dark:bg-slate-800/90 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-700/80 p-4 sm:p-5 md:p-6 shadow-xs space-y-4 hover:border-[#003B5C]/30 dark:hover:border-blue-500/30 transition-all"
                >
                  {/* Question Header: Number pill, Type badge, and Delete */}
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-xs bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 px-2.5 py-1 rounded-xl shrink-0">
                        Q{qIdx + 1}
                      </span>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        {question.type.replace('_', ' ')}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/50 px-2.5 py-0.5 rounded-lg border border-slate-100 dark:border-slate-800">
                        {question.points} {question.points === 1 ? 'pt' : 'pts'}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeQuestion(qIdx)}
                        disabled={isReadOnly}
                        className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition active:scale-95 disabled:opacity-50"
                        title="Remove question"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Question Text Input */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      Question Prompt
                    </label>
                    <textarea
                      rows={2}
                      value={question.text}
                      disabled={isReadOnly}
                      onChange={(e) => updateQuestion(qIdx, 'text', e.target.value)}
                      placeholder="Enter the question text or problem statement..."
                      className="w-full px-3.5 py-2.5 text-xs sm:text-sm font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-[#003B5C] transition resize-none placeholder:text-slate-400"
                    />
                  </div>

                  {/* Type & Points Selectors */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                        Question Format
                      </label>
                      <div className="relative">
                        <select
                          value={question.type}
                          disabled={isReadOnly}
                          onChange={(e) => updateQuestion(qIdx, 'type', e.target.value)}
                          className="w-full appearance-none px-3.5 py-2 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-[#003B5C] cursor-pointer pr-8"
                        >
                          <option value="multiple_choice">Multiple Choice (Single Answer)</option>
                          <option value="true_false">True / False</option>
                          <option value="short_answer">Short Answer (Subjective)</option>
                        </select>
                        <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                        Item Points
                      </label>
                      <input
                        type="number"
                        min={1}
                        value={question.points}
                        disabled={isReadOnly}
                        onChange={(e) => updateQuestion(qIdx, 'points', parseInt(e.target.value) || 1)}
                        className="w-full px-3.5 py-2 text-xs font-mono font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-[#003B5C]"
                      />
                    </div>
                  </div>

                  {/* Options Builder: For Multiple Choice / True-False */}
                  {(question.type === 'multiple_choice' || question.type === 'true_false') && (
                    <div className="space-y-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Options &amp; Correct Answer Key
                        </span>
                        <span className="text-[10px] text-slate-400 italic">
                          Tick the checkbox for the correct choice
                        </span>
                      </div>

                      <div className="space-y-2">
                        {question.options.map((opt, optIdx) => (
                          <div 
                            key={opt.id} 
                            className={`flex items-center gap-2 p-1.5 sm:p-2 rounded-xl border transition-all ${
                              opt.isCorrect 
                                ? 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800' 
                                : 'bg-slate-50/70 dark:bg-slate-900/50 border-slate-200/80 dark:border-slate-700/80'
                            }`}
                          >
                            <label className="flex items-center gap-1.5 px-2 py-1 rounded-lg cursor-pointer select-none shrink-0" title="Mark as correct answer">
                              <input
                                type="checkbox"
                                checked={opt.isCorrect}
                                disabled={isReadOnly}
                                onChange={(e) => updateOption(qIdx, optIdx, 'isCorrect', e.target.checked)}
                                className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 cursor-pointer"
                              />
                              <span className={`text-[10px] font-black uppercase tracking-wider hidden xs:inline ${opt.isCorrect ? 'text-emerald-700 dark:text-emerald-300' : 'text-slate-400'}`}>
                                Correct
                              </span>
                            </label>

                            <input
                              type="text"
                              value={opt.text}
                              disabled={isReadOnly || question.type === 'true_false'}
                              onChange={(e) => updateOption(qIdx, optIdx, 'text', e.target.value)}
                              placeholder={`Option ${optIdx + 1}`}
                              className="flex-1 px-2.5 py-1.5 text-xs sm:text-sm font-medium bg-transparent border-0 outline-none text-slate-900 dark:text-white placeholder:text-slate-400"
                            />

                            {question.type === 'multiple_choice' && question.options.length > 2 && (
                              <button
                                type="button"
                                onClick={() => removeOption(qIdx, optIdx)}
                                disabled={isReadOnly}
                                className="p-1 text-slate-400 hover:text-rose-500 rounded-lg transition shrink-0"
                                title="Delete Option"
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
                          onClick={() => addOption(qIdx)}
                          disabled={isReadOnly}
                          className="inline-flex items-center gap-1 text-xs font-bold text-[#003B5C] dark:text-blue-400 hover:underline pt-1"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add another choice</span>
                        </button>
                      )}
                    </div>
                  )}

                  {/* Short Answer Notice */}
                  {question.type === 'short_answer' && (
                    <div className="p-3 bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/70 dark:border-blue-900/50 rounded-xl text-xs text-blue-900 dark:text-blue-200 flex items-start gap-2.5">
                      <HelpCircle className="w-4 h-4 text-[#003B5C] dark:text-blue-400 shrink-0 mt-0.5" />
                      <p className="leading-relaxed">
                        Short-answer entries require manual grading. Once submitted by students, you will evaluate answers through the Teacher Grading interface.
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

      </main>

    </div>
  )
}

function EditQuizSkeleton() {
  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-900 flex flex-col font-sans">
      <header className="sticky top-0 z-30 bg-white dark:bg-slate-900 border-b border-slate-200/80 dark:border-slate-800">
        <div className="max-w-4xl mx-auto px-3.5 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Skeleton className="w-8 h-8 rounded-xl" />
            <Skeleton className="h-6 w-40 rounded-md" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-9 w-20 rounded-xl" />
            <Skeleton className="h-9 w-28 rounded-xl" />
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto w-full px-3.5 sm:px-6 lg:px-8 py-6 space-y-6 flex-1">
        <Skeleton className="h-72 w-full rounded-2xl sm:rounded-3xl" />
        <Skeleton className="h-56 w-full rounded-2xl sm:rounded-3xl" />
        <Skeleton className="h-56 w-full rounded-2xl sm:rounded-3xl" />
      </main>
    </div>
  )
}