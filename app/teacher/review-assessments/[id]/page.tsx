'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Edit, Save, Trash2, User } from 'lucide-react'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'
import { Skeleton } from '@/components/ui/skeleton'
import Link from 'next/link'
import BackButton from '@/components/ui/BackButton'

export default function ReviewAssessmentDetail() {
  const params = useParams()
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()
  const assessmentId = params.id as string

  const [assessment, setAssessment] = useState<any>(null)
  const [scores, setScores] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

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
        .select('id, first_name, last_name, middle_name, student_id')
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
      const mergedScores = studentsData.map(student => {
          const scoreRecord = scoresData?.find(s => s.student_id === student.id)
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
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900/50">
                  <h2 className="font-semibold text-gray-700 dark:text-gray-300">Student Scores</h2>
                  <span className="text-sm text-gray-500">{scores.length} students graded</span>
              </div>
              
              <div className="overflow-x-auto">
                  <table className="w-full text-left">
                      <thead>
                          <tr className="border-b border-gray-200 dark:border-gray-700">
                              <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Student Name</th>
                              <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase text-right">Raw Score</th>
                              <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase text-right">Percentage</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                          {scores.map((score) => {
                              const hasScore = score.score !== undefined && score.score !== null
                              const percentage = hasScore && assessment.max_score > 0 
                                ? Math.round((score.score / assessment.max_score) * 100) 
                                : 0
                              
                              return (
                                  <tr key={score.student_id} className="hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors">
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
                                      <td className="px-6 py-4 text-right">
                                          {hasScore ? (
                                              <span className="inline-block min-w-[3rem] py-1 px-2 bg-gray-100 dark:bg-gray-700 rounded font-mono font-medium">
                                                  {score.score} <span className="text-gray-400 text-xs">/ {assessment.max_score}</span>
                                              </span>
                                          ) : (
                                              <span className="text-gray-400 text-sm italic">Not graded</span>
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
                                  <td colSpan={3} className="px-6 py-12 text-center text-gray-500">
                                      No scores recorded for this assessment yet.
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
