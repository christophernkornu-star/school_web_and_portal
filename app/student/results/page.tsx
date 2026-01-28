'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { GraduationCap, ArrowLeft, Download, BookOpen } from 'lucide-react'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'
import { Skeleton } from '@/components/ui/skeleton'
import BackButton from '@/components/ui/BackButton'
import { toast } from 'react-hot-toast'

interface Grade {
  id: string
  subject_name: string
  class_score: number | null
  exam_score: number | null
  total: number | null
  grade: string | null
  remarks: string | null
  term_id: string
  term_name: string
  academic_year: string
}

interface StudentInfo {
  student_id: string
  first_name: string
  last_name: string
  class_name: string
  classes?: {
    name: string
  }
}

export default function StudentResults() {
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()
  const [student, setStudent] = useState<StudentInfo | null>(null)
  const [results, setResults] = useState<Grade[]>([])
  const [terms, setTerms] = useState<{ id: string; name: string; year: string }[]>([])
  const [selectedTerm, setSelectedTerm] = useState<string>('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        router.push('/login?portal=student')
        return
      }

      // Get student info
      const { data: studentData } = await supabase
        .from('students')
        .select(`
          student_id,
          first_name,
          last_name,
          classes (
            name
          )
        `)
        .eq('profile_id', user.id)
        .single() as { data: any }

      if (!studentData) {
        console.error('No student record found')
        setLoading(false)
        return
      }

      const classData = studentData.classes as any
      setStudent({
        student_id: studentData.student_id,
        first_name: studentData.first_name,
        last_name: studentData.last_name,
        class_name: classData?.name || 'N/A'
      })

      // Get student id from students table
      const { data: studentRecord } = await supabase
        .from('students')
        .select('id')
        .eq('profile_id', user.id)
        .single() as { data: any }

      if (!studentRecord) {
        console.error('No student record found')
        setLoading(false)
        return
      }

      // Get student grades with subjects and terms
      const { data: gradesData, error: gradesError } = await supabase
        .from('scores')
        .select(`
          id,
          class_score,
          exam_score,
          total,
          grade,
          remarks,
          term_id,
          subjects (
            name
          ),
          academic_terms (
            id,
            name,
            academic_year
          )
        `)
        .eq('student_id', studentRecord.id)
        .order('academic_terms(academic_year)', { ascending: false }) as { data: any[] | null; error: any }

      if (gradesError) {
        console.error('Error fetching grades:', gradesError)
      } else if (gradesData) {
        const formattedGrades: Grade[] = gradesData.map((g: any) => ({
          id: g.id,
          subject_name: g.subjects?.name || 'Unknown',
          class_score: g.class_score,
          exam_score: g.exam_score,
          total: g.total,
          grade: g.grade,
          remarks: g.remarks,
          term_id: g.term_id,
          term_name: g.academic_terms?.name || 'Unknown',
          academic_year: g.academic_terms?.academic_year || 'N/A'
        }))

        setResults(formattedGrades)

        // Extract unique terms
        const uniqueTerms = Array.from(
          new Map(
            gradesData
              .filter((g: any) => g.academic_terms)
              .map((g: any) => [
                g.academic_terms.id,
                {
                  id: g.academic_terms.id,
                  name: g.academic_terms.name,
                  year: g.academic_terms.academic_year
                }
              ])
          ).values()
        )

        setTerms(uniqueTerms)
      }
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const getGradeColor = (grade: string) => {
    switch (grade) {
      case 'A': return 'grade-A'
      case 'B': return 'grade-B'
      case 'C': return 'grade-C'
      case 'D': return 'grade-D'
      case 'E':
      case 'F': return 'grade-E'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col transition-colors">
          <header className="bg-white dark:bg-gray-800 shadow">
            <div className="container mx-auto px-4 py-4">
               <div className="flex items-center gap-4">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <Skeleton className="h-8 w-40 rounded" />
               </div>
            </div>
          </header>
          <main className="flex-1 container mx-auto px-4 py-8">
             <div className="max-w-6xl mx-auto space-y-8">
                 <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                    <div className="flex justify-between items-center mb-6">
                        <div>
                           <Skeleton className="h-8 w-48 mb-2" />
                           <Skeleton className="h-4 w-32" />
                        </div>
                        <Skeleton className="h-10 w-32 rounded-lg" />
                    </div>
                    <div className="space-y-4">
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-16 w-full rounded-lg" />
                        <Skeleton className="h-16 w-full rounded-lg" />
                        <Skeleton className="h-16 w-full rounded-lg" />
                    </div>
                 </div>
             </div>
          </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="ghana-flag-border bg-white shadow-md">
        <nav className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <GraduationCap className="w-10 h-10 text-methodist-blue" />
              <div>
                <h1 className="text-xl font-bold text-methodist-blue">
                  Biriwa Methodist 'C' Basic School
                </h1>
                <p className="text-xs text-gray-600">Student Portal - Results</p>
              </div>
            </div>
            <BackButton href="/student/dashboard" label="Back to Dashboard" className="text-gray-700 hover:text-methodist-blue" />
          </div>
        </nav>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6 md:px-6 md:py-8">
        {/* Header Section */}
        <div className="bg-white rounded-lg shadow-lg p-4 md:p-6 mb-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-4">
            <div>
              <h2 className="text-xl md:text-2xl font-bold text-gray-800">Academic Results</h2>
              {student && (
                <p className="text-gray-600 text-sm md:text-base">
                  {student.last_name} {student.first_name} - {student.class_name}
                </p>
              )}
            </div>
            <Link
              href="/student/report-card"
              className="flex items-center gap-2 px-4 md:px-6 py-2 bg-methodist-blue text-white rounded-lg hover:bg-blue-700 transition-colors text-sm md:text-base"
            >
              <Download className="w-4 h-4" />
              <span>Download Report</span>
            </Link>
          </div>

          {/* Term Selector */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedTerm('all')}
              className={`px-3 md:px-4 py-2 rounded-md text-sm md:text-base ${
                selectedTerm === 'all'
                  ? 'bg-methodist-blue text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              All Terms
            </button>
            {terms.map((term) => (
              <button
                key={term.id}
                onClick={() => setSelectedTerm(term.id)}
                className={`px-3 md:px-4 py-2 rounded-md text-sm md:text-base ${
                  selectedTerm === term.id
                    ? 'bg-methodist-blue text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {term.name}
              </button>
            ))}
          </div>
        </div>

        {/* Results Table */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] divide-y divide-gray-200">
              <thead className="bg-methodist-blue text-white">
                <tr>
                  <th className="px-3 md:px-6 py-3 text-left text-xs md:text-sm font-semibold uppercase tracking-wider">
                    Subject
                  </th>
                  <th className="px-3 md:px-6 py-3 text-left text-xs md:text-sm font-semibold uppercase tracking-wider">
                    Term
                  </th>
                  <th className="px-3 md:px-6 py-3 text-center text-xs md:text-sm font-semibold uppercase tracking-wider">
                    Class Score (40%)
                  </th>
                  <th className="px-3 md:px-6 py-3 text-center text-xs md:text-sm font-semibold uppercase tracking-wider">
                    Exam Score (60%)
                  </th>
                  <th className="px-3 md:px-6 py-3 text-center text-xs md:text-sm font-semibold uppercase tracking-wider">
                    Total (100%)
                  </th>
                  <th className="px-3 md:px-6 py-3 text-center text-xs md:text-sm font-semibold uppercase tracking-wider">
                    Grade
                  </th>
                  <th className="px-3 md:px-6 py-3 text-left text-xs md:text-sm font-semibold uppercase tracking-wider">
                    Remarks
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {results.filter(r => selectedTerm === 'all' || r.term_id === selectedTerm).length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center">
                      <BookOpen className="w-10 h-10 md:w-12 md:h-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-sm md:text-base text-gray-500">
                        {selectedTerm === 'all'
                          ? 'No results available yet.'
                          : 'No results available for the selected term.'}
                      </p>
                    </td>
                  </tr>
                ) : (
                  results
                    .filter(r => selectedTerm === 'all' || r.term_id === selectedTerm)
                    .map((result) => (
                      <tr key={result.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-3 md:px-6 py-4 whitespace-nowrap">
                          <div className="text-xs md:text-sm font-medium text-gray-900">{result.subject_name}</div>
                        </td>
                        <td className="px-3 md:px-6 py-4 whitespace-nowrap">
                          <div className="text-xs md:text-sm text-gray-900">{result.term_name}</div>
                          <div className="text-xs text-gray-500">{result.academic_year}</div>
                        </td>
                        <td className="px-3 md:px-6 py-4 whitespace-nowrap text-center text-xs md:text-sm text-gray-500">
                          {result.class_score ?? '-'}
                        </td>
                        <td className="px-3 md:px-6 py-4 whitespace-nowrap text-center text-xs md:text-sm text-gray-500">
                          {result.exam_score ?? '-'}
                        </td>
                        <td className="px-3 md:px-6 py-4 whitespace-nowrap text-center">
                          <span className="text-xs md:text-sm font-bold text-gray-900">{result.total ?? '-'}</span>
                        </td>
                        <td className="px-3 md:px-6 py-4 whitespace-nowrap text-center">
                          <span className={`px-2 md:px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getGradeColor(result.grade || '')}`}>
                            {result.grade || '-'}
                          </span>
                        </td>
                        <td className="px-3 md:px-6 py-4 whitespace-nowrap text-xs md:text-sm text-gray-500">
                          {result.remarks || '-'}
                        </td>
                      </tr>
                    ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Summary Section */}
        {results.filter(r => selectedTerm === 'all' || r.term_id === selectedTerm).length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mt-6">
            <div className="bg-white rounded-lg shadow p-4 md:p-6">
              <h3 className="text-gray-600 text-sm mb-2">Total Subjects</h3>
              <p className="text-2xl md:text-3xl font-bold text-methodist-blue">
                {results.filter(r => selectedTerm === 'all' || r.term_id === selectedTerm).length}
              </p>
            </div>
            <div className="bg-white rounded-lg shadow p-4 md:p-6">
              <h3 className="text-gray-600 text-sm mb-2">Average Score</h3>
              <p className="text-2xl md:text-3xl font-bold text-green-600">
                {(() => {
                  const filteredResults = results.filter(r => selectedTerm === 'all' || r.term_id === selectedTerm)
                  const validScores = filteredResults.filter(r => r.total !== null)
                  const avg = validScores.length > 0
                    ? validScores.reduce((sum, r) => sum + (r.total || 0), 0) / validScores.length
                    : 0
                  return Math.round(avg * 10) / 10
                })()}%
              </p>
            </div>
            <div className="bg-white rounded-lg shadow p-4 md:p-6">
              <h3 className="text-gray-600 text-sm mb-2">Best Subject Grade</h3>
              <p className="text-2xl md:text-3xl font-bold text-purple-600">
                {(() => {
                  const filteredResults = results.filter(r => selectedTerm === 'all' || r.term_id === selectedTerm)
                  const validResults = filteredResults.filter(r => r.total !== null && r.total !== undefined)
                  if (validResults.length === 0) return '-'
                  
                  // Find the subject with the highest total score
                  const bestSubject = validResults.reduce((best, current) => 
                    (current.total || 0) > (best.total || 0) ? current : best
                  )
                  
                  return bestSubject.grade || '-'
                })()}
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
