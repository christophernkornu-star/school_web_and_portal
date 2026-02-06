'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import BackButton from '@/components/ui/BackButton'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import { ArrowLeft, Save, Plus, Trash2, AlertCircle } from 'lucide-react'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'
import { toast } from 'react-hot-toast'

interface Question {
  id: string // UUID or temp ID
  text: string
  type: 'multiple_choice' | 'true_false' | 'short_answer'
  points: number
  options: Option[]
  isNew?: boolean
  dbId?: string
}

interface Option {
  id: string
  text: string
  isCorrect: boolean
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
  
  // Data Lists
  const [classes, setClasses] = useState<any[]>([])
  const [subjects, setSubjects] = useState<any[]>([])
  const [terms, setTerms] = useState<any[]>([])
  
  const [questions, setQuestions] = useState<Question[]>([])
  const [isReadOnly, setIsReadOnly] = useState(false)

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

        // Check Teacher Status
        const { data: teacherData } = await supabase
          .from('teachers')
          .select('status')
          .eq('profile_id', session.user.id)
          .single()
        
        if (teacherData?.status === 'on_leave' || teacherData?.status === 'on leave') {
          setIsReadOnly(true)
        }

        // Fetch Metadata
        const { data: classesData } = await supabase.rpc('get_teacher_classes', { p_profile_id: session.user.id })
        if (classesData) {
            setClasses(classesData.map((c: any) => ({
                id: c.class_id || c.id,
                name: c.class_name || c.name
            })))
        }
        
        const { data: allTerms } = await supabase.from('academic_terms').select('*').order('start_date', { ascending: false })
        if (allTerms) setTerms(allTerms)

        // Fetch Quiz Data
        const { data: quizData, error: quizError } = await supabase
            .from('online_quizzes')
            .select('*')
            .eq('id', quizId)
            .single()

        if (quizError) throw quizError

        // Populate Form
        setTitle(quizData.title)
        setDescription(quizData.description || '')
        setSelectedClass(quizData.class_id)
        setSelectedSubject(quizData.subject_id)
        setSelectedTerm(quizData.term_id)
        setCategory(quizData.category || 'Assignment')
        setDueDate(quizData.due_date ? new Date(quizData.due_date).toISOString().slice(0, 16) : '')
        setDuration(quizData.duration_minutes || '')

        // Fetch Questions & Options
        const { data: qData, error: qError } = await supabase
            .from('quiz_questions')
            .select(`
                *,
                quiz_options (*)
            `)
            .eq('quiz_id', quizId)
            .order('position', { ascending: true })

        if (qError) throw qError

        // Map Questions
        const mappedQuestions: Question[] = (qData || []).map((q: any) => ({
            id: q.id, // Real DB ID
            dbId: q.id,
            text: q.question_text,
            type: q.question_type,
            points: q.points,
            isNew: false,
            options: (q.quiz_options || []).map((o: any) => ({
                id: o.id,
                text: o.option_text,
                isCorrect: o.is_correct
            }))
        }))

        setQuestions(mappedQuestions)

      } catch (error) {
        console.error('Error loading data:', error)
        toast.error('Failed to load quiz data')
      } finally {
        setFetchingData(false)
      }
    }
    if (quizId) loadData()
  }, [quizId])

  // Load Subjects when Class changes (only if changed manually, but useEffect triggers anyway)
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
  }, [selectedClass])

  // ... (Reusable Logic for Questions - Same as Create Page) ...
  // To keep code concise, I'll repeat the handler logic but adapted
  
  const addQuestion = () => {
    const newId = Math.random().toString(36).substr(2, 9)
    console.log("Adding question with temp ID:", newId)
    setQuestions([
      ...questions,
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
    const newQuestions = [...questions]
    newQuestions.splice(index, 1)
    setQuestions(newQuestions)
  }

  const updateQuestion = (index: number, field: keyof Question, value: any) => {
    const newQuestions = [...questions]
    newQuestions[index] = { ...newQuestions[index], [field]: value }
    // Logic for option reset on type change (same as Create)
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
                { id: Math.random().toString(), text: '', isCorrect: false },
                { id: Math.random().toString(), text: '', isCorrect: false }
            ]
        }
    }
    setQuestions(newQuestions)
  }

  // Option handlers (addOption, removeOption, updateOption) - Same as CreatePage

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
       toast.error('You cannot update assessments while on leave.')
       return
    }
    
    if (!title || !selectedClass || !selectedSubject || !selectedTerm) {
      toast.error('Please fill in all required fields')
      return
    }

    setLoading(true)
    try {
        const totalPoints = questions.reduce((sum, q) => sum + (q.points || 0), 0)

        // 1. Update Quiz Details
        const { error: updateError } = await supabase
            .from('online_quizzes')
            .update({
                title,
                description,
                class_id: selectedClass,
                subject_id: selectedSubject,
                term_id: selectedTerm,
                category,
                status,
                due_date: dueDate || null,
                duration_minutes: duration || null,
                total_points: totalPoints,
                updated_at: new Date().toISOString()
            })
            .eq('id', quizId)

        if (updateError) throw updateError

        // 2. Handle Questions (The Hard Part)
        // Strategy: Delete all questions and re-insert is easiest but data destructive for attempts.
        // Better: Upsert? 
        // For MVP stability with editing:
        // We will Delete all questions for this quiz and re-insert everything.
        // WARNING: This invalidates existing attempts' answers referencing question_ids.
        // IF there are existing attempts, we should block editing questions or warn user.
        
        // Let's check attempts first
        const { count } = await supabase
            .from('student_quiz_attempts')
            .select('*', { count: 'exact', head: true })
            .eq('quiz_id', quizId)
        
        if (count && count > 0) {
            if (!confirm(`Warning: There represent ${count} student attempts for this quiz. Editing the questions will disconnect their answers/results. Metadata updates are safe. Do you want to proceed regardless?`)) {
                setLoading(false)
                return
            }
            // If proceeding, we wipe questions.
        }

        // Wipe existing questions (Cascades to options)
        await supabase.from('quiz_questions').delete().eq('quiz_id', quizId)

        // Re-insert all active questions
        for (let i = 0; i < questions.length; i++) {
             const q = questions[i]
             const { data: qData, error: qError } = await supabase
                .from('quiz_questions')
                .insert({
                    quiz_id: quizId,
                    question_text: q.text,
                    question_type: q.type,
                    points: q.points,
                    position: i
                })
                .select()
                .single()
            
             if (qError) throw qError

             // Insert Options
             if (q.options && q.options.length > 0) {
                const optionsToInsert = q.options.map(opt => ({
                    question_id: qData.id,
                    option_text: opt.text,
                    is_correct: opt.isCorrect
                }))
                await supabase.from('quiz_options').insert(optionsToInsert)
            }
        }

        toast.success('Assessment updated successfully')
        router.push('/teacher/assessments')

    } catch (error: any) {
        console.error('Update error:', error)
        toast.error(error.message)
    } finally {
        setLoading(false)
    }
  }

  if (fetchingData) {
    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20">
             <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 h-16 sticky top-0 z-30">
                <div className="container mx-auto px-4 h-full flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Skeleton className="w-8 h-8 rounded-full" />
                        <Skeleton className="w-48 h-6" />
                    </div>
                    <div className="flex gap-2">
                        <Skeleton className="w-24 h-9 rounded-lg" />
                        <Skeleton className="w-24 h-9 rounded-lg" />
                    </div>
                </div>
             </div>
             <div className="container mx-auto px-4 py-8 max-w-4xl space-y-8">
                 <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 space-y-6">
                    <Skeleton className="w-40 h-6 mb-4" />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                         <div className="col-span-2"><Skeleton className="w-full h-10 rounded-lg" /></div>
                         <div className="col-span-2"><Skeleton className="w-full h-24 rounded-lg" /></div>
                         <Skeleton className="w-full h-10 rounded-lg" />
                         <Skeleton className="w-full h-10 rounded-lg" />
                    </div>
                 </div>
                 {[...Array(3)].map((_, i) => (
                    <div key={i} className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
                        <div className="flex justify-between items-start mb-4">
                            <Skeleton className="w-full h-6 mr-4" />
                            <div className="flex gap-2">
                                <Skeleton className="w-8 h-8 rounded" />
                                <Skeleton className="w-8 h-8 rounded" />
                            </div>
                        </div>
                        <div className="space-y-3">
                             <Skeleton className="w-full h-10 rounded-lg" />
                             <Skeleton className="w-full h-10 rounded-lg" />
                        </div>
                    </div>
                 ))}
             </div>
        </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20 transition-colors duration-200">
      {isReadOnly && (
        <div className="bg-amber-50 dark:bg-amber-900/30 border-b border-amber-200 dark:border-amber-800 px-4 py-3">
          <div className="container mx-auto flex items-center space-x-3">
             <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
             <p className="text-sm font-medium text-amber-900 dark:text-amber-200">
               Read-Only Mode: You are currently on leave and cannot modify assessments.
             </p>
          </div>
        </div>
      )}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-30 shadow-sm">
        <div className="container mx-auto px-4 py-3 sm:py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <BackButton href={`/teacher/assessments/${quizId}`} className="p-2 -ml-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors flex-shrink-0" />
            <h1 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white truncate">Edit Assessment</h1>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
                onClick={() => handleSubmit('draft')}
                disabled={loading || isReadOnly}
                className="flex-1 sm:flex-none justify-center px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg disabled:opacity-50 transition-colors whitespace-nowrap"
            >
                Save Draft
            </button>
             <button
                onClick={() => handleSubmit('published')}
                disabled={loading || isReadOnly}
                className="flex-1 sm:flex-none justify-center px-4 py-2 text-sm font-medium bg-blue-600 dark:bg-blue-700 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 disabled:opacity-50 flex items-center gap-2 transition-colors whitespace-nowrap shadow-sm"
            >
                <Save className="w-4 h-4" />
                {loading ? 'Saving...' : 'Update'}
            </button>
          </div>
        </div>
      </div>
      
       <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Quiz Settings - Same as Create */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 sm:p-6 mb-8">
            <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Assessment Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                 <div className="col-span-1 md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Title</label>
                    <input
                        type="text"
                        value={title}
                        disabled={isReadOnly}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="e.g., Mid-Term Mathematics Test"
                        className="w-full px-3 py-2 text-gray-900 dark:text-white bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all placeholder:text-gray-400 dark:placeholder:text-gray-500"
                    />
                </div>
                 <div className="col-span-1 md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                    <textarea
                        value={description}
                        disabled={isReadOnly}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Enter instructions or description..."
                        className="w-full px-3 py-2 text-gray-900 dark:text-white bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all placeholder:text-gray-400 dark:placeholder:text-gray-500"
                        rows={3}
                    />
                </div>
                 {/* Simplified Inputs for Edit */}
                   <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Class</label>
                     <div className="relative">
                     <select
                        value={selectedClass}
                        onChange={(e) => setSelectedClass(e.target.value)}
                        className="w-full px-3 py-2 text-gray-900 dark:text-white bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none appearance-none transition-all"
                    >
                         <option value="" className="text-gray-500 dark:text-gray-400">Select Class</option>
                        {classes.map((c: any) => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                        <svg className="w-4 h-4 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                    </div>
                    </div>
                   </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Subject</label>
                        <div className="relative">
                        <select
                            value={selectedSubject}
                            onChange={(e) => setSelectedSubject(e.target.value)}
                            className="w-full px-3 py-2 text-gray-900 dark:text-white bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none appearance-none transition-all"
                        >
                            <option value="" className="text-gray-500 dark:text-gray-400">Select Subject</option>
                             {subjects.map((s: any) => (
                                <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                        </select>
                        <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                            <svg className="w-4 h-4 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                        </div>
                        </div>
                    </div>
                     <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category</label>
                    <div className="relative">
                    <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="w-full px-3 py-2 text-gray-900 dark:text-white bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none appearance-none transition-all"
                    >
                        <option value="Assignment">Assignment</option>
                        <option value="Exam">Exam</option>
                        <option value="Test">Test</option>
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                        <svg className="w-4 h-4 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                    </div>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Term</label>
                    <div className="relative">
                    <select
                        value={selectedTerm}
                        onChange={(e) => setSelectedTerm(e.target.value)}
                        className="w-full px-3 py-2 text-gray-900 dark:text-white bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none appearance-none transition-all"
                    >
                        {terms.map((t: any) => (
                            <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                        <svg className="w-4 h-4 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                    </div>
                    </div>
                </div>

                 <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Due Date</label>
                    <input
                        type="datetime-local"
                        value={dueDate}
                        onChange={(e) => setDueDate(e.target.value)}
                        className="w-full px-3 py-2 text-gray-900 dark:text-white bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Duration (Minutes)</label>
                    <div className="relative">
                    <input
                        type="number"
                        value={duration}
                        onChange={(e) => setDuration(parseInt(e.target.value) || '')}
                        placeholder="e.g. 60"
                        className="w-full px-3 py-2 text-gray-900 dark:text-white bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                    />
                    <div className="absolute inset-y-0 right-0 flex items-center font-medium pr-3 pointer-events-none text-gray-500 dark:text-gray-400 text-sm">
                        min
                    </div>
                    </div>
                </div>
            </div>
        </div>
        
         {/* Questions Builder */}
         <div className="space-y-6">
             <div className="flex flex-row items-center justify-between gap-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Questions ({questions.length})</h2>
                 <button
                    onClick={addQuestion}
                    className="text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/40 px-3 py-1.5 rounded-lg font-medium flex items-center gap-1 transition-colors text-sm"
                >
                    <Plus className="w-4 h-4" /> Add <span className="hidden sm:inline">Question</span>
                </button>
             </div>
             
             {questions.map((question, index) => (
                 <div key={question.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 sm:p-6 border border-gray-200 dark:border-gray-700">
                     <div className="flex justify-between items-start mb-4">
                         <span className="font-bold text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-sm">Q{index + 1}</span>
                         <button onClick={() => removeQuestion(index)} className="text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 p-1.5 rounded-md transition-colors"><Trash2 className="w-4 h-4"/></button>
                     </div>
                     <textarea
                        value={question.text}
                        onChange={(e) => updateQuestion(index, 'text', e.target.value)}
                        className="w-full mb-4 p-3 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all placeholder:text-gray-400 dark:placeholder:text-gray-500"
                        placeholder="Enter your question here..."
                        rows={2}
                     />
                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                         <div>
                             <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Type</label>
                             <div className="relative">
                                 <select
                                    value={question.type}
                                    onChange={(e) => updateQuestion(index, 'type', e.target.value)}
                                    className="w-full p-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 outline-none appearance-none"
                                 >
                                    <option value="multiple_choice">Multiple Choice</option>
                                    <option value="true_false">True/False</option>
                                    <option value="short_answer">Short Answer</option>
                                 </select>
                                 <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                                    <svg className="w-4 h-4 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                                </div>
                             </div>
                         </div>
                         <div>
                             <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Points</label>
                             <input
                                type="number"
                                value={question.points}
                                onChange={(e) => updateQuestion(index, 'points', parseInt(e.target.value))}
                                className="w-full p-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 outline-none"
                                placeholder="Points"
                                min={0}
                             />
                         </div>
                     </div>
                     
                     {/* Options */}
                     {(question.type === 'multiple_choice' || question.type === 'true_false') && (
                        <div className="space-y-3 pl-0 sm:pl-4 sm:border-l-2 border-gray-100 dark:border-gray-700 pt-2">
                             <div className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Answer Options</div>
                            {question.options.map((opt, optIndex) => (
                                <div key={opt.id} className="flex gap-3 items-center group">
                                    <div className="flex items-center h-full pt-1">
                                        <input 
                                            type="checkbox"
                                            checked={opt.isCorrect}
                                            onChange={(e) => updateOption(index, optIndex, 'isCorrect', e.target.checked)}
                                            className="w-5 h-5 text-blue-600 dark:text-blue-500 rounded focus:ring-blue-500 border-gray-300 dark:border-gray-600 cursor-pointer"
                                            title="Mark as correct answer"
                                        />
                                    </div>
                                    <div className="flex-1 relative">
                                        <input
                                            type="text"
                                            value={opt.text}
                                            onChange={(e) => updateOption(index, optIndex, 'text', e.target.value)}
                                            className={`w-full p-2 border-b-2 border-gray-200 dark:border-gray-700 focus:border-blue-500 dark:focus:border-blue-500 outline-none text-gray-900 dark:text-white bg-transparent transition-colors ${question.type === 'true_false' ? 'font-medium bg-gray-50 dark:bg-gray-700/50 rounded px-3 border-none' : ''}`}
                                            placeholder={`Option ${optIndex + 1}`}
                                            readOnly={question.type === 'true_false'}
                                        />
                                    </div>
                                    {question.type === 'multiple_choice' && (
                                        <button 
                                            onClick={() => removeOption(index, optIndex)} 
                                            className="text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 p-1 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                            title="Remove option"
                                        >
                                            <Trash2 className="w-4 h-4"/>
                                        </button>
                                    )}
                                </div>
                            ))}
                             {question.type === 'multiple_choice' && (
                                <button onClick={() => addOption(index)} className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium mt-2 flex items-center gap-1 py-1 px-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors w-max">
                                    <Plus className="w-4 h-4" /> Add Option
                                </button>
                             )}
                        </div>
                     )}
                 </div>
             ))}
         </div>
       </div>
    </div>
  )
}
