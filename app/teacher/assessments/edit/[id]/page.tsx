'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Save, Trash2, Plus, CheckCircle2 } from 'lucide-react'
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
    if (!title) { toast.error('Title is required'); return }

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

  if (fetchingData) return <div className="p-8 text-center">Loading...</div>

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/teacher/assessments" className="p-2 hover:bg-gray-100 rounded-full">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-xl font-bold">Edit Assessment</h1>
          </div>
          <div className="flex gap-2">
            <button
                onClick={() => handleSubmit('draft')}
                disabled={loading}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg disabled:opacity-50"
            >
                Save Draft
            </button>
             <button
                onClick={() => handleSubmit('published')}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
            >
                <Save className="w-4 h-4" />
                {loading ? 'Saving...' : 'Update'}
            </button>
          </div>
        </div>
      </div>
      
       <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Quiz Settings - Same as Create */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
            <h2 className="text-lg font-semibold mb-4">Assessment Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                    <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                </div>
                 <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        rows={3}
                    />
                </div>
                 {/* Simplified Inputs for Edit */}
                   <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Class</label>
                     <select
                        value={selectedClass}
                        onChange={(e) => setSelectedClass(e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                         <option value="">Select Class</option>
                        {classes.map((c: any) => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                    </select>
                   </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                        <select
                            value={selectedSubject}
                            onChange={(e) => setSelectedSubject(e.target.value)}
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        >
                            <option value="">Select Subject</option>
                             {subjects.map((s: any) => (
                                <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                        </select>
                    </div>
                     <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                    <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                        <option value="Assignment">Assignment</option>
                        <option value="Exam">Exam</option>
                        <option value="Test">Test</option>
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Term</label>
                    <select
                        value={selectedTerm}
                        onChange={(e) => setSelectedTerm(e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                        {terms.map((t: any) => (
                            <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                    </select>
                </div>

                 <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                    <input
                        type="datetime-local"
                        value={dueDate}
                        onChange={(e) => setDueDate(e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Duration (Minutes)</label>
                    <input
                        type="number"
                        value={duration}
                        onChange={(e) => setDuration(parseInt(e.target.value) || '')}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                </div>
            </div>
        </div>
        
         {/* Questions Builder (Simplified View for brevity in code generation, but functional) */}
         <div className="space-y-6">
             <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Questions ({questions.length})</h2>
                 <button
                    onClick={addQuestion}
                    className="text-blue-600 font-medium flex items-center gap-1"
                >
                    <Plus className="w-4 h-4" /> Add Question
                </button>
             </div>
             
             {questions.map((question, index) => (
                 <div key={question.id} className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                     <div className="flex justify-between mb-4">
                         <span className="font-bold text-gray-500">Q{index + 1}</span>
                         <button onClick={() => removeQuestion(index)} className="text-red-500"><Trash2 className="w-4 h-4"/></button>
                     </div>
                     <textarea
                        value={question.text}
                        onChange={(e) => updateQuestion(index, 'text', e.target.value)}
                        className="w-full mb-3 p-2 border rounded"
                        placeholder="Question Text"
                     />
                     <div className="grid grid-cols-2 gap-4 mb-3">
                         <select
                            value={question.type}
                            onChange={(e) => updateQuestion(index, 'type', e.target.value)}
                            className="p-2 border rounded"
                         >
                            <option value="multiple_choice">Multiple Choice</option>
                            <option value="true_false">True/False</option>
                            <option value="short_answer">Short Answer</option>
                         </select>
                         <input
                            type="number"
                            value={question.points}
                            onChange={(e) => updateQuestion(index, 'points', parseInt(e.target.value))}
                            className="p-2 border rounded"
                            placeholder="Points"
                         />
                     </div>
                     
                     {/* Options */}
                     {(question.type === 'multiple_choice' || question.type === 'true_false') && (
                        <div className="space-y-2 pl-4 border-l-2">
                            {question.options.map((opt, optIndex) => (
                                <div key={opt.id} className="flex gap-2 items-center">
                                    <input 
                                        type="checkbox"
                                        checked={opt.isCorrect}
                                        onChange={(e) => updateOption(index, optIndex, 'isCorrect', e.target.checked)}
                                    />
                                    <input
                                        type="text"
                                        value={opt.text}
                                        onChange={(e) => updateOption(index, optIndex, 'text', e.target.value)}
                                        className="flex-1 p-1 border-b"
                                        placeholder="Option text"
                                        readOnly={question.type === 'true_false'}
                                    />
                                    {question.type === 'multiple_choice' && (
                                        <button onClick={() => removeOption(index, optIndex)} className="text-red-400"><Trash2 className="w-3 h-3"/></button>
                                    )}
                                </div>
                            ))}
                             {question.type === 'multiple_choice' && (
                                <button onClick={() => addOption(index)} className="text-xs text-blue-500 mt-1">+ Add Option</button>
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
