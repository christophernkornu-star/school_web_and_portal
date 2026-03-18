'use client'

import { useState, useEffect, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Edit, Save, Trash2, User, X, Check, Search, Filter } from 'lucide-react'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'
import { Skeleton } from '@/components/ui/skeleton'
import Link from 'next/link'
import BackButton from '@/components/ui/back-button'
import { toast } from 'react-hot-toast'

export default function ReviewAssessmentDetail() {
  const params = useParams()
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()
  const assessmentId = params.id as string

  const [assessment, setAssessment] = useState<any>(null)
  const [scores, setScores] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [genderFilter, setGenderFilter] = useState('') // '' | 'Male' | 'Female'

  // Edit State
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null)
  const [editScore, setEditScore] = useState<string>('')
  const [savingScore, setSavingScore] = useState(false)

  useEffect(() => {
    loadAssessmentDetails()
  }, [assessmentId])

  const loadAssessmentDetails = async () => {
    try {
      // 1. Get Assessment Info
      const { data: assessmentData, error: assessmentError } = await supabase
        .from('assessments')
        .select(`
            *,
            class_subjects (
                class_id,
                classes (name),
                subjects (name)
            )
        `)
        .eq('id', assessmentId)
        .single()

      if (assessmentError) throw assessmentError
      setAssessment(assessmentData)

      // 2. Get Class Students (to ensure we list everyone)
      const { data: studentsData, error: studentsError } = await supabase
        .from('students')
        .select('*') // Get all fields including gender
        .eq('class_id', assessmentData.class_subjects?.class_id)
        .eq('status', 'active')
        .order('last_name', { ascending: true })

      if (studentsError) throw studentsError

      // 3. Get Scores (Flat query, no join to avoid relation errors)
      const { data: scoresData, error: scoresError } = await supabase
        .from('student_scores')
        .select('id, score, student_id')
        .eq('assessment_id', assessmentId)
      
      if (scoresError) throw scoresError

      // 4. Merge Data
      const mergedScores = studentsData.map((student: any) => {
          const scoreRecord = scoresData?.find((s: any) => s.student_id === student.id)
          return {
              id: scoreRecord?.id, // Score ID if exists
              student_id: student.id,
              score: scoreRecord?.score,
              students: student // Attach student info for display
          }
      })

      setScores(mergedScores)

    } catch (error) {
      console.error('Error loading assessment details:', error)
    } finally {
      setLoading(false)
    }
  }

  const startEditing = (studentId: string, currentScore: number | undefined) => {
    setEditingStudentId(studentId)
    setEditScore(currentScore !== undefined ? currentScore.toString() : '')
  }

  const cancelEditing = () => {
    setEditingStudentId(null)
    setEditScore('')
  }

  const saveScore = async (studentId: string) => {
    if (!assessment) return

    const numScore = parseFloat(editScore)
    if (isNaN(numScore) && editScore !== '') {
        toast.error('Please enter a valid number')
        return
    }

    if (numScore > assessment.max_score) {
        toast.error(`Score cannot exceed max score of ${assessment.max_score}`)
        return
    }

    setSavingScore(true)
    try {
        const { error } = await supabase
            .from('student_scores')
            .upsert({
                assessment_id: assessmentId,
                student_id: studentId,
                score: editScore === '' ? null : numScore
            }, {
                onConflict: 'assessment_id,student_id'
            })

        if (error) throw error

        toast.success('Score updated')
        
        // Update local state
        setScores(scores.map(s => 
            s.student_id === studentId 
                ? { ...s, score: editScore === '' ? undefined : numScore }
                : s
        ))
        setEditingStudentId(null)
    } catch (error: any) {
        console.error('Error saving score:', error)
        toast.error('Failed to save score')
    } finally {
        setSavingScore(false)
    }
  }

  // Filter Logic
  const filteredScores = useMemo(() => {
    return scores.filter((score) => {
        const s = score.students
        const fullName = `${s.first_name || ''} ${s.last_name || ''} ${s.middle_name || ''}`.toLowerCase()
        
        // Search
        if (searchQuery && !fullName.includes(searchQuery.toLowerCase()) && !s.student_id?.toLowerCase().includes(searchQuery.toLowerCase())) {
            return false
        }
    
        // Gender
        if (genderFilter && s.gender?.toLowerCase() !== genderFilter.toLowerCase()) {
            return false
        }
        
        return true
    })
  }, [scores, searchQuery, genderFilter])

  if (loading) {
     return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
            <div className="max-w-4xl mx-auto space-y-6">
                <Skeleton className="h-8 w-1/3" />
                <div className="space-y-2">
                    {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-12 w-full" />)}
                </div>
            </div>
        </div>
     )
  }

  if (!assessment) {
     return (
         <div className="min-h-screen flex items-center justify-center">
             <div className="text-center">
                 <h2 className="text-xl font-bold">Assessment Not Found</h2>
                 <BackButton href="/teacher/review-assessments" />
             </div>
         </div>
     )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
        <div className="container mx-auto px-4 md:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
                <BackButton href="/teacher/review-assessments" />
                <div>
                   <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                      {assessment.title || assessment.assessment_name}
                      <span className="text-sm font-normal px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full capitalize">
                          {assessment.assessment_type?.replace('_', ' ') || 'Assessment'}
                      </span>
                   </h1>
                   <p className="text-sm text-gray-500 dark:text-gray-400">
                      {assessment.class_subjects?.subjects?.name} • {assessment.class_subjects?.classes?.name} • Max Score: {assessment.max_score}
                   </p>
                </div>
            </div>
            {/* Optional: Add Edit Button to jump to enter-scores with this assessment selected? 
                But updating enter-scores logic to accept query param might be complex. 
                For now, read-only review is what was asked. 
            */}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 md:px-6 py-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden max-w-4xl mx-auto">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row justify-between items-center bg-gray-50 dark:bg-gray-900/50 gap-4">
                  <div className="flex items-center gap-2">
                    <h2 className="font-semibold text-gray-700 dark:text-gray-300">Student Scores</h2>
                    <span className="text-sm text-gray-500 hidden sm:inline-block">({filteredScores.length} shown)</span>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
                      <div className="relative w-full sm:w-auto">
                          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                          <input 
                              type="text" 
                              placeholder="Search..." 
                              value={searchQuery}
                              onChange={(e) => setSearchQuery(e.target.value)}
                              className="pl-9 pr-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-48 transition-all"
                          />
                      </div>
                      <div className="relative w-full sm:w-auto">
                          <Filter className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                          <select
                              value={genderFilter}
                              onChange={(e) => setGenderFilter(e.target.value)}
                              className="pl-9 pr-8 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer w-full sm:w-auto transition-all"
                              style={{ backgroundImage: 'none' }}
                          >
                              <option value="">All Genders</option>
                              <option value="Male">Male</option>
                              <option value="Female">Female</option>
                          </select>
                          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                          </div>
                      </div>
                  </div>
              </div>
              
              <div className="overflow-x-auto">
                  <table className="w-full text-left">
                      <thead>
                          <tr className="border-b border-gray-200 dark:border-gray-700">
                              <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Student Name</th>
                              <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase hidden sm:table-cell">Gender</th>
                              <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase text-right">Raw Score</th>
                              <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase text-right">Percentage</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                          {filteredScores.map((score) => {
                              const hasScore = score.score !== undefined && score.score !== null
                              const percentage = hasScore && assessment.max_score > 0 
                                ? Math.round((score.score / assessment.max_score) * 100) 
                                : 0
                              
                              return (
                                  <tr key={score.student_id} className="hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors group">
                                      <td className="px-6 py-4">
                                          <div className="flex items-center">
                                              <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center mr-3 text-gray-500">
                                                  <User className="w-4 h-4" />
                                              </div>
                                              <div>
                                                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                                      {score.students?.last_name}, {score.students?.middle_name ? score.students?.middle_name + ', ' : ''}{score.students?.first_name}
                                                  </p>
                                                  <p className="text-xs text-gray-500">{score.students?.student_id}</p>
                                              </div>
                                          </div>
                                      </td>
                                      <td className="px-6 py-4 text-sm text-gray-500 hidden sm:table-cell">
                                          {score.students?.gender || '-'}
                                      </td>
                                      <td className="px-6 py-4 text-right">
                                          {editingStudentId === score.student_id ? (
                                              <div className="flex items-center justify-end gap-2">
                                                  <input 
                                                      type="number" 
                                                      value={editScore}
                                                      onChange={e => setEditScore(e.target.value)}
                                                      className="w-20 p-1 text-sm border rounded text-right dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                                      autoFocus
                                                      min="0"
                                                      max={assessment.max_score}
                                                  />
                                                  <button 
                                                      onClick={() => saveScore(score.student_id)}
                                                      disabled={savingScore}
                                                      className="p-1 text-green-600 hover:bg-green-50 rounded"
                                                  >
                                                      <Check className="w-4 h-4" />
                                                  </button>
                                                  <button 
                                                      onClick={cancelEditing}
                                                      className="p-1 text-red-600 hover:bg-red-50 rounded"
                                                  >
                                                      <X className="w-4 h-4" />
                                                  </button>
                                              </div>
                                          ) : (
                                              <div className="flex items-center justify-end gap-2">
                                                  {hasScore ? (
                                                      <span className="inline-block min-w-[3rem] py-1 px-2 bg-gray-100 dark:bg-gray-700 rounded font-mono font-medium">
                                                          {score.score} <span className="text-gray-400 text-xs">/ {assessment.max_score}</span>
                                                      </span>
                                                  ) : (
                                                      <span className="text-gray-400 text-sm italic">Not graded</span>
                                                  )}
                                                  <button 
                                                      onClick={() => startEditing(score.student_id, score.score)}
                                                      className="opacity-0 group-hover:opacity-100 p-1 text-blue-600 hover:bg-blue-50 rounded transition-opacity"
                                                      title="Edit Score"
                                                  >
                                                      <Edit className="w-3 h-3" />
                                                  </button>
                                              </div>
                                          )}
                                      </td>
                                      <td className="px-6 py-4 text-right">
                                           {hasScore ? (
                                              <span className={`text-sm font-medium ${
                                                  percentage >= 50 ? 'text-green-600' : 'text-red-600'
                                              }`}>
                                                  {percentage}%
                                              </span>
                                           ) : (
                                              <span className="text-gray-300">-</span>
                                           )}
                                      </td>
                                  </tr>
                              )
                          })}
                          
                          {scores.length === 0 && (
                              <tr>
                                  <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                                      No students found for this assessment.
                                  </td>
                              </tr>
                          )}
                          
                          {scores.length > 0 && filteredScores.length === 0 && (
                              <tr>
                                  <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                                      No students match your search or filter.
                                  </td>
                              </tr>
                          )}
                      </tbody>
                  </table>
              </div>
          </div>
      </main>
    </div>
  )
}
