'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  FileText, 
  Award, 
  TrendingUp, 
  AlertCircle, 
  CheckCircle2, 
  BarChart3, 
  LineChart as LineChartIcon, 
  Radar as RadarIcon,
  ChevronRight,
  BookOpen,
  Calendar,
  Sparkles,
  Layers
} from 'lucide-react'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'
import { getGradeValue, getGradeLabel, getRemark, calculateAggregate } from '@/lib/academic-utils'
import { Skeleton } from '@/components/ui/skeleton'
import BackButton from '@/components/ui/back-button'
import { PortalFooter } from '@/components/PortalFooter'
import {
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  RadarChart, 
  PolarGrid, 
  PolarAngleAxis, 
  PolarRadiusAxis, 
  Radar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  ResponsiveContainer, 
  Cell
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

export default function StudentMockResults() {
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()
  
  const [loading, setLoading] = useState(true)
  const [studentId, setStudentId] = useState<string | null>(null)
  const [selectedMockId, setSelectedMockId] = useState<string | null>(null)
  const [mocks, setMocks] = useState<MockExam[]>([])
  const [mockScores, setMockScores] = useState<Record<string, MockScore[]>>({})
  const [chartTab, setChartTab] = useState<'radar' | 'bar'>('radar')

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
        
        // 3. Get Scores for all mocks in this class
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

  // Active selected mock scores and stats
  const activeScores = useMemo(() => {
    if (!selectedMockId) return []
    return mockScores[selectedMockId] || []
  }, [selectedMockId, mockScores])

  const activeAggregate = useMemo(() => {
    const calcInput = activeScores.map(s => ({
      subjectName: s.subjects?.name || '',
      score: s.score || 0
    }))
    return calculateAggregate(calcInput).total
  }, [activeScores])

  const activeAverage = useMemo(() => {
    if (activeScores.length === 0) return 0
    const total = activeScores.reduce((acc, s) => acc + (s.score || 0), 0)
    return Math.round(total / activeScores.length)
  }, [activeScores])

  // Trend Chart Data: Sorted chronologically (earliest to latest)
  const trendData = useMemo(() => {
    return [...mocks].reverse().map((m: MockExam) => {
      const scores = mockScores[m.id] || []
      const agg = calculateAggregate(scores.map(s => ({
        subjectName: s.subjects?.name || '',
        score: s.score || 0
      }))).total

      return {
        name: m.name.replace(/mock/i, '').trim() || m.name,
        fullName: m.name,
        aggregate: agg
      }
    })
  }, [mocks, mockScores])

  if (loading) {
    return <MockResultsSkeleton />
  }

  if (mocks.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50/50 dark:bg-slate-900 flex flex-col font-sans">
        <header className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="max-w-6xl mx-auto px-3.5 sm:px-6 lg:px-8 py-3.5">
            <div className="flex items-center gap-3">
              <BackButton href="/student/dashboard" />
              <h1 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                BECE Mock Results
              </h1>
            </div>
          </div>
        </header>

        <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-12 sm:py-16 flex items-center justify-center">
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 sm:p-12 text-center border border-slate-200/80 dark:border-slate-700 shadow-xs space-y-3 max-w-md w-full">
            <div className="w-14 h-14 rounded-2xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-300 flex items-center justify-center mx-auto shadow-inner">
              <FileText className="w-7 h-7" />
            </div>
            <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">No Mock Exams Found</h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
              BECE preparation mock exams for your class will appear here once published by faculty.
            </p>
          </div>
        </main>
        <PortalFooter />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-900 font-sans text-slate-900 dark:text-slate-100 flex flex-col transition-colors selection:bg-[#003B5C] selection:text-white">
      
      {/* Top Header Banner */}
      <header className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div className="max-w-6xl mx-auto px-3.5 sm:px-6 lg:px-8 py-3 sm:py-3.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
            
            <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
              <BackButton href="/student/dashboard" />
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-4 bg-amber-400 rounded-full shrink-0" />
                  <h1 className="text-base sm:text-xl font-black text-slate-900 dark:text-white tracking-tight truncate">
                    BECE Mock Performance
                  </h1>
                </div>
                <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium truncate mt-0.5">
                  Standardized preparation examinations and placement aggregate diagnostics
                </p>
              </div>
            </div>

            {/* Quick Mock Selector Dropdown */}
            <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider hidden md:inline">
                Inspect:
              </span>
              <div className="relative flex-1 sm:w-56">
                <select
                  value={selectedMockId || ''}
                  onChange={(e) => setSelectedMockId(e.target.value)}
                  className="w-full appearance-none bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold py-2 sm:py-2.5 pl-3 pr-8 rounded-xl outline-none focus:ring-2 focus:ring-[#003B5C] cursor-pointer transition truncate"
                >
                  {mocks.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.academic_year})
                    </option>
                  ))}
                </select>
                <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                  <ChevronRight className="w-4 h-4 rotate-90" />
                </div>
              </div>
            </div>

          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-3.5 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8 space-y-4 sm:space-y-6 lg:space-y-8">
        
        {/* KPI Strip for Active Selected Mock */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-3.5 md:gap-4">
          <div className="bg-white dark:bg-slate-800/90 rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 border border-slate-200/80 dark:border-slate-700/80 shadow-xs flex items-center justify-between">
            <div className="space-y-0.5 min-w-0">
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-400 block truncate">
                Selected Mock
              </span>
              <div className="text-sm sm:text-base md:text-lg font-black text-slate-900 dark:text-white truncate">
                {mocks.find(m => m.id === selectedMockId)?.name || 'Active'}
              </div>
              <p className="text-[10px] sm:text-[11px] text-slate-400 truncate">
                {mocks.find(m => m.id === selectedMockId)?.academic_year}
              </p>
            </div>
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-[#003B5C]/10 text-[#003B5C] dark:bg-blue-500/20 dark:text-blue-300 flex items-center justify-center shrink-0 ml-1">
              <Award className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800/90 rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 border border-slate-200/80 dark:border-slate-700/80 shadow-xs flex items-center justify-between">
            <div className="space-y-0.5 min-w-0">
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-400 block truncate">
                BECE Aggregate
              </span>
              <div className="text-xl sm:text-2xl md:text-3xl font-black font-mono text-[#003B5C] dark:text-blue-400">
                {activeScores.length > 0 ? activeAggregate : '--'}
              </div>
              <p className="text-[10px] sm:text-[11px] text-slate-400 truncate">Best 6 raw sum</p>
            </div>
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-blue-50 text-[#003B5C] dark:bg-blue-950/40 dark:text-blue-300 flex items-center justify-center shrink-0 ml-1">
              <Award className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800/90 rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 border border-slate-200/80 dark:border-slate-700/80 shadow-xs flex items-center justify-between">
            <div className="space-y-0.5 min-w-0">
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-400 block truncate">
                Average Mark
              </span>
              <div className="text-xl sm:text-2xl md:text-3xl font-black font-mono text-emerald-600 dark:text-emerald-400">
                {activeScores.length > 0 ? `${activeAverage}%` : '--'}
              </div>
              <p className="text-[10px] sm:text-[11px] text-slate-400 truncate">All subjects</p>
            </div>
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-300 flex items-center justify-center shrink-0 ml-1">
              <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800/90 rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 border border-slate-200/80 dark:border-slate-700/80 shadow-xs flex items-center justify-between">
            <div className="space-y-0.5 min-w-0">
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-400 block truncate">
                Mocks Completed
              </span>
              <div className="text-xl sm:text-2xl md:text-3xl font-black font-mono text-amber-600 dark:text-amber-400">
                {mocks.length}
              </div>
              <p className="text-[10px] sm:text-[11px] text-slate-400 truncate">Series written</p>
            </div>
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-300 flex items-center justify-center shrink-0 ml-1">
              <Calendar className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>
        </section>

        {/* --- Graphic Visual Analysis Strip --- */}
        <section className="space-y-4 sm:space-y-6">
          
          {/* 1. Aggregate Progression Line Chart (Only shown if at least 1 mock exists) */}
          <div className="bg-white dark:bg-slate-800/90 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-700/80 shadow-xs overflow-hidden">
            <div className="px-4 sm:px-6 py-3.5 sm:py-4 bg-[#003B5C] border-b border-[#002a42] flex items-center justify-between">
              <h2 className="text-xs sm:text-sm font-black uppercase tracking-wider text-white flex items-center gap-2">
                <span className="w-1.5 h-4 bg-amber-400 rounded-full shrink-0" />
                <span>Aggregate Performance Progression</span>
              </h2>
              <span className="text-[10px] sm:text-xs font-mono text-blue-200/80 hidden sm:inline">
                Lower Aggregate = Superior Ranking
              </span>
            </div>

            <div className="p-3 sm:p-5 md:p-6">
              <div className="h-56 sm:h-64 md:h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart 
                    data={trendData}
                    margin={{ top: 10, right: 20, left: -10, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.6} />
                    <XAxis 
                      dataKey="name" 
                      fontSize={11} 
                      tickLine={false} 
                      axisLine={false} 
                      tick={{ fill: '#64748b' }} 
                    />
                    <YAxis 
                      reversed 
                      domain={[6, 54]} 
                      fontSize={11} 
                      tickLine={false} 
                      axisLine={false}
                      tick={{ fill: '#64748b' }}
                      width={45}
                    />
                    <RechartsTooltip 
                      formatter={(value: any) => [`Aggregate ${value}`, 'Score']}
                      contentStyle={{ 
                        borderRadius: '12px', 
                        border: '1px solid #e2e8f0', 
                        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                        fontSize: '12px'
                      }}
                      cursor={{ stroke: '#003B5C', strokeWidth: 1.5, strokeDasharray: '4 4' }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="aggregate" 
                      stroke="#003B5C" 
                      strokeWidth={3} 
                      dot={{ r: 4, strokeWidth: 2, fill: '#EAA812' }} 
                      activeDot={{ r: 6, fill: '#003B5C' }} 
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* 2. Sub-Charts Grid: Subject Strength Radar + Subject Score Bar */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            
            {/* Subject Strength Radar */}
            <div className="bg-white dark:bg-slate-800/90 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-700/80 shadow-xs overflow-hidden">
              <div className="px-4 sm:px-6 py-3 sm:py-3.5 bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200/80 dark:border-slate-700 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <RadarIcon className="w-4 h-4 text-purple-600 shrink-0" />
                  <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                    Subject Strength Map
                  </h3>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">
                  Scale: 0 - 100
                </span>
              </div>

              <div className="p-3 sm:p-5 flex items-center justify-center">
                <div className="h-56 sm:h-64 w-full">
                  {activeScores.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart 
                        outerRadius="75%" 
                        data={activeScores.map(s => ({
                          subject: (s.subjects?.code || s.subjects?.name || '').substring(0, 4).toUpperCase(),
                          score: s.score,
                          fullName: s.subjects?.name
                        }))}
                      >
                        <PolarGrid stroke="#e2e8f0" />
                        <PolarAngleAxis 
                          dataKey="subject" 
                          tick={{ fill: '#64748b', fontSize: 10, fontWeight: 'bold' }} 
                        />
                        <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                        <Radar 
                          name="Raw Mark" 
                          dataKey="score" 
                          stroke="#7c3aed" 
                          fill="#7c3aed" 
                          fillOpacity={0.25} 
                        />
                        <RechartsTooltip 
                          formatter={(value: any, name: any, props: any) => [`${value}%`, props?.payload?.fullName || name]}
                          contentStyle={{ 
                            borderRadius: '12px', 
                            border: '1px solid #e2e8f0', 
                            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                            fontSize: '12px'
                          }}
                        />
                      </RadarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-xs text-slate-400 italic">
                      No scores recorded for this mock
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Subject Raw Mark Distribution (Bar Chart) */}
            <div className="bg-white dark:bg-slate-800/90 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-700/80 shadow-xs overflow-hidden">
              <div className="px-4 sm:px-6 py-3 sm:py-3.5 bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200/80 dark:border-slate-700 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                    Score by Subject
                  </h3>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">
                  Ranked High to Low
                </span>
              </div>

              <div className="p-3 sm:p-5">
                <div className="h-56 sm:h-64 w-full">
                  {activeScores.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart 
                        data={[...activeScores].sort((a, b) => b.score - a.score).map(s => ({
                          name: (s.subjects?.code || s.subjects?.name || '').substring(0, 3).toUpperCase(),
                          score: s.score,
                          fullName: s.subjects?.name
                        }))}
                        margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.6} />
                        <XAxis 
                          dataKey="name" 
                          fontSize={10} 
                          tickLine={false} 
                          axisLine={false} 
                          tick={{ fill: '#64748b', fontWeight: 'bold' }} 
                        />
                        <YAxis 
                          fontSize={10} 
                          tickLine={false} 
                          axisLine={false} 
                          tick={{ fill: '#64748b' }}
                          domain={[0, 100]}
                        />
                        <RechartsTooltip 
                          cursor={{ fill: 'rgba(0,0,0,0.03)' }}
                          formatter={(value: any, name: any, props: any) => [`${value}%`, props?.payload?.fullName || name]}
                          contentStyle={{ 
                            borderRadius: '12px', 
                            border: '1px solid #e2e8f0', 
                            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                            fontSize: '12px'
                          }} 
                        />
                        <Bar dataKey="score" radius={[4, 4, 0, 0]} maxBarSize={36}>
                          {[...activeScores].sort((a, b) => b.score - a.score).map((entry, index) => (
                            <Cell 
                              key={`cell-${index}`} 
                              fill={
                                entry.score >= 70 ? '#10b981' : 
                                entry.score >= 50 ? '#0284c7' : 
                                entry.score >= 40 ? '#f59e0b' : 
                                '#ef4444'
                              } 
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-xs text-slate-400 italic">
                      No score marks registered
                    </div>
                  )}
                </div>
              </div>
            </div>

          </div>
        </section>

        {/* --- Mock Detail Cards & Subject Scores --- */}
        <section className="space-y-4 sm:space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <span className="w-1.5 h-4 bg-amber-400 rounded-full shrink-0" />
              <span>Mock Transcript Ledgers</span>
            </h2>
            <span className="text-[11px] font-mono text-slate-400">
              {mocks.length} Exam Records
            </span>
          </div>

          <div className="space-y-5 sm:space-y-6">
            {mocks.map((mock) => {
              const scores = mockScores[mock.id] || []
              const calcInput = scores.map(s => ({
                subjectName: s.subjects?.name || '',
                score: s.score || 0
              }))
              const { total: aggregate } = calculateAggregate(calcInput)
              const sortedScores = [...scores].sort((a, b) => 
                (a.subjects?.name || '').localeCompare(b.subjects?.name || '')
              )

              // Performance Band Predictions
              let prediction = 'Pending Evaluation'
              let colorClass = 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
              if (scores.length > 0) {
                if (aggregate >= 6 && aggregate <= 9) {
                  prediction = 'Distinction (Category A Placement Guaranteed)'
                  colorClass = 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/50'
                } else if (aggregate <= 15) {
                  prediction = 'Strong Pass (High Secondary Placement Probability)'
                  colorClass = 'bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900/50'
                } else if (aggregate <= 24) {
                  prediction = 'Average Pass (Meets SHS Entry Threshold)'
                  colorClass = 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900/50'
                } else if (aggregate <= 30) {
                  prediction = 'Borderline Pass (Remediation Recommended)'
                  colorClass = 'bg-orange-50 text-orange-800 border-orange-200 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-900/50'
                } else {
                  prediction = 'Critical Intervention Required'
                  colorClass = 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900/50'
                }
              }

              const isCurrentSelected = mock.id === selectedMockId

              return (
                <div 
                  key={mock.id}
                  className={`bg-white dark:bg-slate-800/90 rounded-2xl sm:rounded-3xl border transition-all duration-200 overflow-hidden shadow-xs ${
                    isCurrentSelected 
                      ? 'border-[#003B5C]/50 dark:border-blue-500/50 ring-2 ring-[#003B5C]/10 dark:ring-blue-500/10' 
                      : 'border-slate-200/80 dark:border-slate-700/80'
                  }`}
                >
                  {/* Card Header */}
                  <div className="bg-[#003B5C] text-white p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="w-1.5 h-3 bg-amber-400 rounded-full" />
                        <h3 className="text-sm sm:text-base md:text-lg font-black tracking-tight">
                          {mock.name}
                        </h3>
                      </div>
                      <p className="text-[11px] sm:text-xs text-blue-200/80 font-mono mt-0.5">
                        Academic Year: {mock.academic_year}
                      </p>
                    </div>

                    {scores.length > 0 && (
                      <div className="flex items-center gap-2 self-start sm:self-auto">
                        <div className="px-3 py-1.5 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 text-center">
                          <span className="block text-[9px] uppercase font-bold text-amber-300 tracking-wider">
                            BECE Aggregate
                          </span>
                          <span className="text-lg sm:text-xl font-black font-mono leading-none">
                            {aggregate}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Prediction Banner */}
                  {scores.length > 0 && (
                    <div className={`px-4 sm:px-6 py-2.5 sm:py-3 border-b flex items-center gap-2 text-xs font-semibold ${colorClass}`}>
                      <TrendingUp className="w-4 h-4 shrink-0" />
                      <div className="truncate">
                        <span className="font-bold mr-1.5">Projected Placement:</span>
                        <span>{prediction}</span>
                      </div>
                    </div>
                  )}

                  {/* Responsive Scores Table */}
                  <div className="overflow-x-auto">
                    {scores.length > 0 ? (
                      <table className="w-full text-xs sm:text-sm text-left min-w-[500px]">
                        <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-500 dark:text-slate-400 font-bold uppercase text-[10px] tracking-wider border-b border-slate-100 dark:border-slate-800">
                          <tr>
                            <th className="px-4 sm:px-6 py-3">Subject Name</th>
                            <th className="px-3 sm:px-4 py-3 text-center font-mono">Raw Score</th>
                            <th className="px-3 sm:px-4 py-3 text-center font-mono">Stanine Grade</th>
                            <th className="px-4 sm:px-6 py-3">Academic Remark</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                          {sortedScores.map((s) => {
                            const grade = getGradeValue(s.score)
                            return (
                              <tr key={s.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                                <td className="px-4 sm:px-6 py-2.5 sm:py-3 font-bold text-slate-900 dark:text-white">
                                  {s.subjects?.name}
                                </td>
                                <td className="px-3 sm:px-4 py-2.5 sm:py-3 text-center font-mono font-bold text-slate-700 dark:text-slate-200">
                                  {s.score}
                                </td>
                                <td className="px-3 sm:px-4 py-2.5 sm:py-3 text-center">
                                  <span className={`inline-flex items-center justify-center w-7 h-7 rounded-lg text-xs font-black font-mono border ${
                                    grade <= 3 
                                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-900/50' 
                                      : grade <= 6 
                                      ? 'bg-blue-50 text-[#003B5C] border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-900/50' 
                                      : 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                                  }`}>
                                    {getGradeLabel(grade)}
                                  </span>
                                </td>
                                <td className="px-4 sm:px-6 py-2.5 sm:py-3 text-slate-500 dark:text-slate-400">
                                  {getRemark(grade)}
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    ) : (
                      <div className="p-8 text-center text-slate-400 space-y-1">
                        <AlertCircle className="w-7 h-7 mx-auto mb-1 opacity-30" />
                        <p className="text-xs font-medium">No marks published for this examination yet.</p>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </section>

      </main>

      <PortalFooter />
    </div>
  )
}

function MockResultsSkeleton() {
  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-900 flex flex-col font-sans">
      <div className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200/80 dark:border-slate-800" />
      <div className="max-w-6xl mx-auto w-full px-3.5 sm:px-6 lg:px-8 py-6 space-y-6 flex-1">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-20 rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-64 w-full rounded-2xl sm:rounded-3xl" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-64 rounded-2xl sm:rounded-3xl" />
          <Skeleton className="h-64 rounded-2xl sm:rounded-3xl" />
        </div>
        <Skeleton className="h-72 w-full rounded-2xl sm:rounded-3xl" />
      </div>
    </div>
  )
}