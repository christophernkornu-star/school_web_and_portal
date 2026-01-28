'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import BackButton from '@/components/ui/BackButton'
import { ArrowLeft, Plus, Save, Trash2, GripVertical, CheckCircle2, Circle, HelpCircle, AlertCircle } from 'lucide-react'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'
import { toast } from 'react-hot-toast'

interface Question {
  id: string // Temporary ID for frontend
  text: string
  type: 'multiple_choice' | 'true_false' | 'short_answer'
  points: number
  options: Option[]
}

interface Option {
  id: string
  text: string
  isCorrect: boolean
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
        { id: '1-1', text: '', isCorrect: false },
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

        // 1. Get Teacher Profile ID
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

        // 2a. Fetch Subject Assignments (Explicit Subject Teachers)
        // Verify table existence first? fallback is empty
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

        // 2b. Fetch Class Teacher Assignments (May teach all subjects)
        // Using teacher_class_assignments
        const { data: classTeacherAssignments } = await supabase
            .from('teacher_class_assignments')
            .select(`
                class_id,
                classes(id, name)
            `)
            .eq('teacher_id', teacherData.id)
            .eq('is_class_teacher', true)
        
        if (classTeacherAssignments && classTeacherAssignments.length > 0) {
            // For these classes, fetch ALL subjects
            // This assumes class teachers can assess any subject in their class, 
            // OR we need to filter by Teaching Model. 
            // For simplicity/robustness, we allow them to see all subjects for now, 
            // or the user can just select from the list.
            
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
                // Map these to the assignment format
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

        // If no assignments found at all, fall back to getting all classes (Admin/Dev mode or fallback)
        if (newAssignments.length === 0) {
             console.log('No specific assignments found. Fetching all class access.')
             // Try get_teacher_classes RPC again as last resort or just manual classes
             const { data: rpcClasses } = await supabase.rpc('get_teacher_classes', { p_profile_id: session.user.id })
             if (rpcClasses) {
                 // We only have classes, not subjects... 
                 const uniqueClasses = Array.from(new Map(rpcClasses.map((c: any) => [c.id, c])).values())
                 setClasses(uniqueClasses)

                 // We will have to fetch subjects when class is selected dynamically
             }
        } else {
             setAllAssignments(newAssignments)
             
             // Extract unique classes
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
             // Fetch all terms if no current
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
  }, [])

  // Update Subjects when Class changes (using loaded assignments)
  useEffect(() => {
      if (!selectedClass) {
        setSubjects([])
        return
      }
      
      // Filter assignments for selected class
      const classAssignments = allAssignments.filter((a: any) => a.class_id === selectedClass && a.subjects)
      
      if (classAssignments.length > 0) {
        // Deduplicate subjects
        const uniqueSubjects = Array.from(new Map(
            classAssignments.map((a: any) => [a.subjects.id, a.subjects])
        ).values())
        
        setSubjects(uniqueSubjects)
      } else {
          // Fallback: If no assignments found for this class (maybe selected via fallback rpc), load all subjects
          const loadAllSubjects = async () => {
                const { data, error } = await supabase
                    .from('class_subjects')
                    .select(`
                        subject_id,
                        subjects (
                            id,
                            name,
                            code
                        )
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
      
      // Reset selected subject if not in new list
      // Note: we can't do this synchronously if we are awaiting above, but the effect will re-run or we can leave it
      // For now, let's just clear if we are switching classes
      setSelectedSubject('')
      
  }, [selectedClass, allAssignments])

/* 
  // Old loadSubjects logic removed
  useEffect(() => {
    async function loadSubjects() { ... } 
  }, [selectedClass]) 
*/

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
    
    // Reset options if type changes
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
        // Allow multiple correct? Or single? Let's assume single for now or allow multiple.
        // If single, uncheck others.
        // Let's allow multiple for flexibility, or maybe the user wants Single Answer MCQ.
        // Usually MCQ implies single best answer.
        // Let's implement radio behavior (only one correct) for simple MCQ.
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

    if (!title || !selectedClass || !selectedSubject || !selectedTerm) {
      toast.error('Please fill in all required fields')
      return
    }

    setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not authenticated')

      // Get Teacher ID
      const { data: teacherData } = await supabase
        .from('teachers')
        .select('id')
        .eq('profile_id', session.user.id)
        .single()

      if (!teacherData) throw new Error('Teacher profile not found')

      const totalPoints = questions.reduce((sum, q) => sum + (q.points || 0), 0)

      // 1. Create Quiz
      const { data: quizData, error: quizError } = await supabase
        .from('online_quizzes')
        .insert({
            title,
            description,
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

      // 2. Insert Questions
      for (let i = 0; i < questions.length; i++) {
        const q = questions[i]
        const { data: qData, error: qError } = await supabase
            .from('quiz_questions')
            .insert({
                quiz_id: quizData.id,
                question_text: q.text,
                question_type: q.type,
                points: q.points,
                position: i
            })
            .select()
            .single()

        if (qError) throw qError

        // 3. Insert Options (if any)
        if (q.options && q.options.length > 0) {
            const optionsToInsert = q.options.map(opt => ({
                question_id: qData.id,
                option_text: opt.text,
                is_correct: opt.isCorrect
            }))
            
            const { error: optError } = await supabase
                .from('quiz_options')
                .insert(optionsToInsert)
            
            if (optError) throw optError
        }
      }

      toast.success('Quiz created successfully!')
      router.push('/teacher/assessments')

    } catch (error: any) {
      console.error('Error creating quiz:', error)
      toast.error(error.message || 'Failed to create quiz')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20 transition-colors duration-200">
      {isReadOnly && (
        <div className="bg-amber-50 dark:bg-amber-900/30 border-b border-amber-200 dark:border-amber-800 px-4 py-3">
          <div className="container mx-auto flex items-center space-x-3">
             <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
             <p className="text-sm font-medium text-amber-900 dark:text-amber-200">
               Read-Only Mode: You are currently on leave and cannot create new assessments.
             </p>
          </div>
        </div>
      )}
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-30 shadow-sm">
        <div className="container mx-auto px-4 py-3 sm:py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <BackButton className="p-2 -ml-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors flex-shrink-0" />
            <h1 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white truncate">Create Assessment</h1>
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
                className="flex-1 sm:flex-none justify-center px-4 py-2 text-sm font-medium bg-blue-600 dark:bg-blue-700 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 disabled:opacity-50 flex items-center gap-2 transition-colors whitespace-nowrap shadow-sm active:scale-95"
            >
                <Save className="w-4 h-4" />
                {loading ? 'Saving...' : 'Publish'}
            </button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 md:py-8 max-w-4xl">
        {/* Quiz Settings */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 md:p-6 mb-8 border border-gray-100 dark:border-gray-700">
          <h2 className="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-100">Assessment Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="col-span-1 md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Title</label>
                <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
                    placeholder="e.g., Mid-Term Mathematics Exam"
                />
            </div>
            
            <div className="col-span-1 md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description (Optional)</label>
                <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 resize-none md:resize-y"
                    rows={3}
                    placeholder="Instructions for students..."
                />
            </div>

            <div className="col-span-1">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Class</label>
                <div className="relative">
                    <select
                        value={selectedClass}
                        onChange={(e) => setSelectedClass(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white appearance-none cursor-pointer"
                    >
                        <option value="">Select Class</option>
                        {classes.map((c: any) => (
                            <option key={c.id || `class-${Math.random()}`} value={c.id}>{c.name}</option>
                        ))}
                    </select>
                     <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500 dark:text-gray-400">
                        <svg className="h-4 w-4 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" fillRule="evenodd"></path></svg>
                    </div>
                </div>
            </div>

            <div className="col-span-1">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Subject</label>
                 <div className="relative">
                    <select
                        value={selectedSubject}
                        onChange={(e) => setSelectedSubject(e.target.value)}
                        disabled={!selectedClass}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:bg-gray-100 disabled:dark:bg-gray-800 disabled:text-gray-400 disabled:dark:text-gray-500 appearance-none cursor-pointer"
                    >
                        <option value="">Select Subject</option>
                        {subjects.map((s: any) => (
                            <option key={s.id || `subject-${Math.random()}`} value={s.id}>{s.name}</option>
                        ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500 dark:text-gray-400">
                        <svg className="h-4 w-4 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" fillRule="evenodd"></path></svg>
                    </div>
                </div>
            </div>

            <div className="col-span-1">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category</label>
                 <div className="relative">
                    <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white appearance-none cursor-pointer"
                    >
                        <option value="Assignment">Assignment / Class Work</option>
                        <option value="Exam">Examination</option>
                        <option value="Test">Class Test</option>
                    </select>
                     <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500 dark:text-gray-400">
                        <svg className="h-4 w-4 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" fillRule="evenodd"></path></svg>
                    </div>
                </div>
            </div>

            <div className="col-span-1">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Term</label>
                 <div className="relative">
                    <select
                        value={selectedTerm}
                        onChange={(e) => setSelectedTerm(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white appearance-none cursor-pointer"
                    >
                        {terms.map((t: any) => (
                            <option key={t.id || `term-${Math.random()}`} value={t.id}>{t.name} ({t.academic_year})</option>
                        ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500 dark:text-gray-400">
                        <svg className="h-4 w-4 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" fillRule="evenodd"></path></svg>
                    </div>
                </div>
            </div>

            <div className="col-span-1">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Due Date</label>
                <input
                    type="datetime-local"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
                />
            </div>

            <div className="col-span-1">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Duration (Minutes)</label>
                <input
                    type="number"
                    value={duration}
                    onChange={(e) => setDuration(parseInt(e.target.value) || '')}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
                    placeholder="Leave empty for no limit"
                />
            </div>
          </div>
        </div>

        {/* Questions Builder */}
        <div className="space-y-6">
            <div className="flex flex-row items-center justify-between gap-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Questions ({questions.length})</h2>
                <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-500 dark:text-gray-400 hidden sm:inline">Total Points: {questions.reduce((sum, q) => sum + (q.points || 0), 0)}</span>
                </div>
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

                    {/* Options Area */}
                    {(question.type === 'multiple_choice' || question.type === 'true_false') && (
                        <div className="space-y-3 pl-0 sm:pl-4 sm:border-l-2 border-gray-100 dark:border-gray-700 pt-2">
                            <div className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Answer Options</div>
                            {question.options.map((option, optIndex) => (
                                <div key={option.id} className="flex gap-3 items-center group">
                                    <div className="flex items-center h-full pt-1">
                                        <input 
                                            type="checkbox"
                                            checked={option.isCorrect}
                                            onChange={(e) => updateOption(index, optIndex, 'isCorrect', e.target.checked)}
                                            className="w-5 h-5 text-blue-600 dark:text-blue-500 rounded focus:ring-blue-500 border-gray-300 dark:border-gray-600 cursor-pointer"
                                            title="Mark as correct answer"
                                        />
                                    </div>
                                    
                                    <div className="flex-1 min-w-0 relative">
                                        <input
                                            type="text"
                                            value={option.text}
                                            onChange={(e) => updateOption(index, optIndex, 'text', e.target.value)}
                                            readOnly={question.type === 'true_false'} // TF text is fixed
                                            className={`w-full p-2 border-b-2 border-gray-200 dark:border-gray-700 focus:border-blue-500 dark:focus:border-blue-500 outline-none text-gray-900 dark:text-white bg-transparent transition-colors ${
                                                question.type === 'true_false' ? 'cursor-default select-none font-medium bg-gray-50 dark:bg-gray-700/50 rounded px-3 border-none' : ''
                                            }`}
                                            placeholder={`Option ${optIndex + 1}`}
                                        />
                                    </div>
                                    
                                    {question.type === 'multiple_choice' && (
                                        <button 
                                            onClick={() => removeOption(index, optIndex)}
                                            className="text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 p-1 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                            title="Delete Option"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            ))}
                            {question.type === 'multiple_choice' && (
                                <button
                                    onClick={() => addOption(index)}
                                    className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium flex items-center gap-1 mt-2 py-1 px-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors w-max"
                                >
                                    <Plus className="w-4 h-4" /> Add Option
                                </button>
                            )}
                        </div>
                    )}

                    {question.type === 'short_answer' && (
                        <div className="pl-0 sm:pl-4 sm:border-l-2 border-gray-100 dark:border-gray-700 py-2">
                             <p className="text-sm text-gray-500 dark:text-gray-400 italic bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg border border-gray-100 dark:border-gray-700">Students will type their answer in a text box.</p>
                        </div>
                    )}
                </div>
            ))}

            <button
                onClick={addQuestion}
                className="w-full py-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl text-gray-500 dark:text-gray-400 hover:border-blue-500 dark:hover:border-blue-500 hover:text-blue-500 dark:hover:text-blue-500 transition-all flex items-center justify-center gap-2 bg-white dark:bg-gray-800 active:scale-[0.99]"
            >
                <Plus className="w-6 h-6" />
                <span className="font-medium">Add New Question</span>
            </button>
        </div>
      </div>
    </div>
  )
}
