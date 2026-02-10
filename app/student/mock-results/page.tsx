'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { FileText, ArrowLeft, Award, TrendingUp, AlertCircle, CheckCircle, BarChart3, LineChart as LineChartIcon, Radar as RadarIcon } from 'lucide-react'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'
import { Skeleton } from '@/components/ui/skeleton'
import BackButton from '@/components/ui/back-button'
import {
  LineChart, Line, BarChart, Bar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, 
  Radar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell
} from 'recharts'

interface MockExam {
  id: string
  name: string
  academic_year: string
  term_id: string
  created_at: string
}

interface MockScore {
  id: string
  mock_exam_id: string
  subject_id: string
  score: number
  subjects: {
    name: string
    code: string
  }
}

// ---- Grading Utilities (Mirrors Teacher Logic) ----

function getGradeValue(score: number): number {
  if (score >= 80) return 1
  if (score >= 70) return 2
  if (score >= 60) return 3
  if (score >= 55) return 4
  if (score >= 50) return 5
  if (score >= 45) return 6
  if (score >= 40) return 7
  if (score >= 35) return 8
  return 9
}

function getGradeLabel(grade: number): string {
    if (grade === 1) return 'A1'; // Highest
    if (grade === 2) return 'B2';
    if (grade === 3) return 'B3';
    if (grade === 4) return 'C4';
    if (grade === 5) return 'C5';
    if (grade === 6) return 'C6';
    if (grade === 7) return 'D7';
    if (grade === 8) return 'E8';
    return 'F9';
}

function getRemark(grade: number): string {
    if (grade === 1) return 'Excellent';
    if (grade === 2) return 'Very Good';
    if (grade === 3) return 'Good';
    if (grade === 4) return 'Credit';
    if (grade === 5) return 'Credit';
    if (grade === 6) return 'Credit';
    if (grade === 7) return 'Pass';
    if (grade === 8) return 'Pass';
    return 'Fail';
}

function calculateAggregate(scores: MockScore[]): { total: number, subjects: string[] } {
  // Buckets for core subjects
  let english: number | null = null
  let math: number | null = null
  let science: number | null = null
  let social: number | null = null
  
  const others: { val: number, name: string }[] = []
  
  scores.forEach(s => {
    const subject = (s.subjects?.name || '').toLowerCase()
    const score = s.score
    const gradeVal = getGradeValue(score)
    
    if (subject.includes('english')) {
      english = english === null ? gradeVal : Math.min(english, gradeVal)
    } else if (subject.includes('mathematics') || subject.includes('math')) {
      math = math === null ? gradeVal : Math.min(math, gradeVal)
    } else if (subject.includes('integrated science') || subject === 'science' || subject === 'general science') {
      science = science === null ? gradeVal : Math.min(science, gradeVal)
    } else if (subject.includes('social studies') || subject.includes('social')) {
      social = social === null ? gradeVal : Math.min(social, gradeVal)
    } else {
      others.push({ val: gradeVal, name: s.subjects?.name || 'Unknown' })
    }
  })
  
  const safeVal = (v: number | null) => v === null ? 9 : v

  let total = 0
  total += safeVal(english)
  total += safeVal(math)
  total += safeVal(science)
  total += safeVal(social)
  
  // Best 2 others
  while (others.length < 2) others.push({ val: 9, name: '-' })
  others.sort((a, b) => a.val - b.val)
  
  total += others[0].val + others[1].val
  
  return { total, subjects: others.slice(0, 2).map(o => o.name) }
}

export default function StudentMockResults() {
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()
  
  const [loading, setLoading] = useState(true)
  const [studentId, setStudentId] = useState<string | null>(null)
  const [selectedMockId, setSelectedMockId] = useState<string | null>(null)
  
  const [mocks, setMocks] = useState<MockExam[]>([])
  // Map: mock_exam_id -> scores[]
  const [mockScores, setMockScores] = useState<Record<string, MockScore[]>>({})

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login?portal=student')
        return
      }

      // 1. Get Student ID & Class
      const { data: student } = await supabase
        .from('students')
        .select('id, class_id')
        .eq('profile_id', user.id)
        .single()
      
      if (!student) {
        setLoading(false)
        return
      }
      
      setStudentId(student.id)

      // 2. Get Mocks for this class
      const { data: mocksData } = await supabase
        .from('mock_exams')
        .select('*')
        .eq('class_id', student.class_id)
        .order('created_at', { ascending: false })
      
      if (mocksData && mocksData.length > 0) {
          setMocks(mocksData)
          setSelectedMockId(mocksData[0].id)
          
          // 3. Get Scores for these mocks
          const mockIds = mocksData.map((m: any) => m.id)
          const { data: scoresData } = await supabase
            .from('mock_scores')
            .select(`
                id,
                mock_exam_id,
                subject_id,
                score,
                subjects (name, code)
            `)
            .in('mock_exam_id', mockIds)
            .eq('student_id', student.id)
          
          const scoresMap: Record<string, MockScore[]> = {}
          
          if (scoresData) {
             scoresData.forEach((s: any) => {
                 if (!scoresMap[s.mock_exam_id]) scoresMap[s.mock_exam_id] = []
                 scoresMap[s.mock_exam_id].push(s)
             })
          }
          setMockScores(scoresMap)
      }
      
      setLoading(false)

    } catch (e) {
      console.error(e)
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="p-8"><Skeleton className="h-10 w-1/3 mb-4" /><Skeleton className="h-64 w-full" /></div>
  }

  if (mocks.length === 0) {
    return (
        <div className="min-h-screen bg-gray-50 p-4 md:p-8">
            <BackButton href="/student/dashboard" />
            <div className="mt-8 text-center bg-white p-12 rounded-xl shadow-sm">
                <FileText className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                <h2 className="text-xl font-bold text-gray-800">No Mock Exams Found</h2>
                <p className="text-gray-500 mt-2">Mock exams for your class will appear here once published.</p>
            </div>
        </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center space-x-4 mb-6">
            <BackButton href="/student/dashboard" />
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Award className="w-6 h-6 text-purple-600" />
                Mock Exam Results
            </h1>
        </div>

        {/* --- Graphic Analysis Section --- */}
        {mocks.length > 0 && (
          <div className="mb-12 space-y-8">
            
            {/* 1. Aggregate Trend (Line Chart) */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
               <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                       <LineChartIcon className="w-5 h-5 text-blue-600" />
                       Aggregate Performance Trend
                    </h3>
                    <p className="text-sm text-gray-500">Track your progress over time (Lower is Better)</p>
                  </div>
               </div>
               
               <div className="h-64 w-full">
                 <ResponsiveContainer width="100%" height="100%">
                    <LineChart 
                      margin={{ top: 10, right: 30, left: 10, bottom: 0 }}
                      data={[...mocks].reverse().map((m: MockExam) => ({
                        name: m.name,
                        aggregate: calculateAggregate(mockScores[m.id] || []).total
                    }))}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                        <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis 
                            reversed 
                            domain={[6, 54]} 
                            fontSize={12} 
                            tickLine={false} 
                            axisLine={false}
                            width={50}
                            label={{ value: 'Score (Low=Better)', angle: -90, position: 'insideLeft', style: { fill: '#9ca3af', fontSize: '11px', textAnchor: 'middle' }, offset: 10 }} 
                        />
                        <Tooltip 
                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                            cursor={{ stroke: '#e2e8f0', strokeWidth: 2 }}
                        />
                        <Line type="monotone" dataKey="aggregate" stroke="#2563eb" strokeWidth={3} dot={{ r: 4, strokeWidth: 2, fill: '#fff' }} activeDot={{ r: 6, fill: '#2563eb' }} />
                    </LineChart>
                 </ResponsiveContainer>
               </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
               
               {/* 2. Subject Radar (Radar Chart) */}
               <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                  <div className="mb-6">
                    <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                       <RadarIcon className="w-5 h-5 text-purple-600" />
                       Subject Strength Profile
                    </h3>
                    <p className="text-sm text-gray-500">Comparing scores across subjects (Latest Mock)</p>
                  </div>
                  
                  <div className="h-64 w-full">
                     {selectedMockId && mockScores[selectedMockId] ? (
                        <ResponsiveContainer width="100%" height="100%">
                           <RadarChart outerRadius="80%" data={
                              (mockScores[selectedMockId] || []).map(s => ({
                                subject: (s.subjects?.code || s.subjects?.name || '').substring(0, 4),
                                score: s.score,
                                fullSubject: s.subjects?.name
                              }))
                           }>
                              <PolarGrid stroke="#e2e8f0" />
                              <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 11 }} />
                              <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                              <Radar name="Score" dataKey="score" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.3} />
                              <Tooltip />
                           </RadarChart>
                        </ResponsiveContainer>
                     ) : (
                        <div className="h-full flex items-center justify-center text-gray-400">No data available</div>
                     )}
                  </div>
               </div>

               {/* 3. Score Comparison (Bar Chart) */}
               <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                  <div className="mb-6">
                    <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                       <BarChart3 className="w-5 h-5 text-emerald-600" />
                       Raw Score Analysis
                    </h3>
                    <p className="text-sm text-gray-500">Score per subject (0-100)</p>
                  </div>
                  
                   <div className="h-64 w-full">
                     {selectedMockId && mockScores[selectedMockId] ? (
                        <ResponsiveContainer width="100%" height="100%">
                           <BarChart data={
                              (mockScores[selectedMockId] || []).sort((a,b) => b.score - a.score).map(s => ({
                                name: (s.subjects?.code || s.subjects?.name || '').substring(0, 3),
                                score: s.score,
                                subject: s.subjects?.name
                              }))
                           } margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                              <XAxis dataKey="name" fontSize={11} tickLine={false} axisLine={false} />
                              <YAxis fontSize={11} tickLine={false} axisLine={false} />
                              <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                              <Bar dataKey="score" radius={[4, 4, 0, 0]}>
                                {
                                  (mockScores[selectedMockId] || []).map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={
                                        entry.score >= 70 ? '#10b981' : // Green
                                        entry.score >= 50 ? '#3b82f6' : // Blue
                                        entry.score >= 40 ? '#f59e0b' : // Orange
                                        '#ef4444' // Red
                                    } />
                                  ))
                                }
                              </Bar>
                           </BarChart>
                        </ResponsiveContainer>
                     ) : (
                         <div className="h-full flex items-center justify-center text-gray-400">No data available</div>
                     )}
                  </div>
               </div>

            </div>
          </div>
        )}

        <div className="space-y-8">
            {mocks.map(mock => {
                const scores = mockScores[mock.id] || []
                const { total: aggregate } = calculateAggregate(scores)
                const sortedScores = [...scores].sort((a, b) => (a.subjects?.name || '').localeCompare(b.subjects?.name || ''))

                // Analysis
                let prediction = 'Unknown'
                let colorClass = 'bg-gray-100 text-gray-700'
                if (scores.length > 0) {
                    if (aggregate >= 6 && aggregate <= 9) {
                        prediction = 'Distinction (First Class)'
                        colorClass = 'bg-green-100 text-green-700'
                    } else if (aggregate <= 15) {
                        prediction = 'Strong Pass (Placement Guaranteed)'
                        colorClass = 'bg-blue-100 text-blue-700'
                    } else if (aggregate <= 24) {
                        prediction = 'Average Pass'
                        colorClass = 'bg-yellow-100 text-yellow-700'
                    } else if (aggregate <= 30) {
                        prediction = 'Weak Pass (Risk)'
                        colorClass = 'bg-orange-100 text-orange-700'
                    } else {
                        prediction = 'Fail (Critical Attention Needed)'
                        colorClass = 'bg-red-100 text-red-700'
                    }
                }

                return (
                    <div key={mock.id} className="bg-white border rounded-xl shadow-sm overflow-hidden">
                        {/* Header */}
                        <div className="bg-slate-900 text-white p-4 md:p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                            <div>
                                <h2 className="text-xl font-bold">{mock.name} Mock Exam</h2>
                                <p className="text-slate-400 text-sm">{mock.academic_year}</p>
                            </div>
                            
                            {scores.length > 0 && (
                                <div className="flex items-center gap-4">
                                     <div className="text-center bg-white/10 p-2 rounded-lg backdrop-blur-sm">
                                         <span className="block text-xs text-slate-400 uppercase tracking-wider">Aggregate</span>
                                         <span className="text-2xl font-bold text-white">{aggregate}</span>
                                     </div>
                                </div>
                            )}
                        </div>

                        {/* Analysis Banner */}
                        {scores.length > 0 && (
                            <div className={`${colorClass} px-6 py-3 flex items-start gap-2 text-sm font-medium border-b`}>
                                <TrendingUp className="w-4 h-4 mt-0.5" />
                                <div>
                                    <span className="block opacity-75 text-xs uppercase">Performance Analysis</span>
                                    {prediction}
                                </div>
                            </div>
                        )}

                        {/* Scores Table */}
                        <div className="p-0 overflow-x-auto">
                            {scores.length > 0 ? (
                                <table className="w-full text-sm">
                                    <thead className="bg-gray-50 border-b">
                                        <tr>
                                            <th className="px-6 py-3 text-left font-medium text-gray-500">Subject</th>
                                            <th className="px-6 py-3 text-center font-medium text-gray-500">Score</th>
                                            <th className="px-6 py-3 text-center font-medium text-gray-500">Grade</th>
                                            <th className="px-6 py-3 text-left font-medium text-gray-500">Remark</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {sortedScores.map(s => {
                                            const grade = getGradeValue(s.score)
                                            return (
                                                <tr key={s.id} className="hover:bg-gray-50/50">
                                                    <td className="px-6 py-3 font-medium text-gray-900">{s.subjects?.name}</td>
                                                    <td className="px-6 py-3 text-center font-mono text-gray-700">{s.score}</td>
                                                    <td className="px-6 py-3 text-center">
                                                        <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold 
                                                            ${grade <= 3 ? 'bg-green-100 text-green-700' : 
                                                              grade <= 6 ? 'bg-blue-100 text-blue-700' : 
                                                              'bg-gray-100 text-gray-600'}`}>
                                                            {getGradeLabel(grade)}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-3 text-gray-500">{getRemark(grade)}</td>
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                </table>
                            ) : (
                                <div className="p-8 text-center text-gray-500">
                                    <AlertCircle className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                                    No scores found for this exam yet.
                                </div>
                            )}
                        </div>
                    </div>
                )
            })}
        </div>
      </div>
    </div>
  )
}
