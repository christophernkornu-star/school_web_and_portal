'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'
import { 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  BarChart3, 
  LineChart as LineChartIcon, 
  Radar as RadarIcon, 
  Award, 
  BookOpen, 
  Calendar, 
  CheckCircle2, 
  AlertCircle,
  Sparkles
} from 'lucide-react'
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ReferenceLine
} from 'recharts'
import { Skeleton } from '@/components/ui/skeleton'
import BackButton from '@/components/ui/back-button'
import { PortalFooter } from '@/components/PortalFooter'

interface SubjectPerformance {
  subject: string
  scores: number[]
  terms: string[]
  average: number
  trend: 'up' | 'down' | 'stable'
}

interface TermComparison {
  term: string
  average: number
  subjects: number
}

const PALETTE = [
  '#003B5C', '#0284c7', '#0d9488', '#16a34a', '#ca8a04',
  '#ea580c', '#dc2626', '#9333ea', '#4f46e5', '#db2777'
]

export default function PerformancePage() {
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()

  const [loading, setLoading] = useState(true)
  const [subjectPerformance, setSubjectPerformance] = useState<SubjectPerformance[]>([])
  const [termComparison, setTermComparison] = useState<TermComparison[]>([])
  const [overallTrend, setOverallTrend] = useState<'up' | 'down' | 'stable'>('stable')
  const [selectedView, setSelectedView] = useState<'line' | 'bar' | 'radar'>('line')

  useEffect(() => {
    loadPerformanceData()
  }, [])

  async function loadPerformanceData() {
    try {
      setLoading(true)

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login?portal=student')
        return
      }

      const { data: student } = await supabase
        .from('students')
        .select('id')
        .eq('profile_id', user.id)
        .single()

      if (!student) {
        setLoading(false)
        return
      }

      const { data: grades, error } = await supabase
        .from('scores')
        .select(`
          *,
          subjects (name),
          academic_terms (
            name,
            academic_year,
            start_date
          )
        `)
        .eq('student_id', student.id)
        .order('academic_terms(start_date)', { ascending: true })

      if (error) throw error

      if (!grades || grades.length === 0) {
        setLoading(false)
        return
      }

      // Group subject performance
      const subjectMap: Record<string, SubjectPerformance> = {}

      grades.forEach((grade: any) => {
        const subjectName = grade.subjects?.name || 'Unknown'
        const termName = grade.academic_terms?.name || 'Term'
        const score = grade.total || 0

        if (!subjectMap[subjectName]) {
          subjectMap[subjectName] = {
            subject: subjectName,
            scores: [],
            terms: [],
            average: 0,
            trend: 'stable'
          }
        }

        subjectMap[subjectName].scores.push(score)
        subjectMap[subjectName].terms.push(termName)
      })

      // Calculate averages and individual trends
      Object.values(subjectMap).forEach((subject) => {
        const validScores = subject.scores.filter(s => s > 0)
        subject.average = validScores.length > 0
          ? Math.round((validScores.reduce((a, b) => a + b, 0) / validScores.length) * 10) / 10
          : 0

        if (validScores.length >= 2) {
          const firstScore = validScores[0]
          const lastScore = validScores[validScores.length - 1]
          const diff = lastScore - firstScore
          
          if (diff > 4) subject.trend = 'up'
          else if (diff < -4) subject.trend = 'down'
          else subject.trend = 'stable'
        }
      })

      setSubjectPerformance(Object.values(subjectMap))

      // Group term comparisons
      const termMap: Record<string, { total: number; count: number }> = {}

      grades.forEach((grade: any) => {
        const termName = grade.academic_terms?.name || 'Term'
        const score = grade.total || 0

        if (!termMap[termName]) {
          termMap[termName] = { total: 0, count: 0 }
        }

        if (score > 0) {
          termMap[termName].total += score
          termMap[termName].count += 1
        }
      })

      const termComparisonData: TermComparison[] = Object.entries(termMap).map(
        ([term, data]) => ({
          term,
          average: data.count > 0 ? Math.round((data.total / data.count) * 10) / 10 : 0,
          subjects: data.count
        })
      )

      setTermComparison(termComparisonData)

      // Calculate cumulative trend across terms
      if (termComparisonData.length >= 2) {
        const firstAvg = termComparisonData[0].average
        const lastAvg = termComparisonData[termComparisonData.length - 1].average
        const diff = lastAvg - firstAvg

        if (diff > 2) setOverallTrend('up')
        else if (diff < -2) setOverallTrend('down')
        else setOverallTrend('stable')
      }
    } catch (error) {
      console.error('Error loading performance data:', error)
    } finally {
      setLoading(false)
    }
  }

  // Summary Metrics
  const overallAverage = useMemo(() => {
    if (termComparison.length === 0) return 0
    const sum = termComparison.reduce((acc, t) => acc + t.average, 0)
    return Math.round((sum / termComparison.length) * 10) / 10
  }, [termComparison])

  const topSubject = useMemo(() => {
    if (subjectPerformance.length === 0) return null
    return [...subjectPerformance].sort((a, b) => b.average - a.average)[0]
  }, [subjectPerformance])

  // Chart Formats
  const lineChartData = useMemo(() => {
    if (subjectPerformance.length === 0) return []
    return subjectPerformance[0].terms.map((term, index) => {
      const dataPoint: Record<string, any> = { term }
      subjectPerformance.forEach(subject => {
        dataPoint[subject.subject] = subject.scores[index] || 0
      })
      return dataPoint
    })
  }, [subjectPerformance])

  const radarData = useMemo(() => {
    return subjectPerformance.map(subject => ({
      subject: subject.subject.length > 12 
        ? subject.subject.substring(0, 12) + '…' 
        : subject.subject,
      fullName: subject.subject,
      score: subject.scores[subject.scores.length - 1] || 0,
      fullMark: 100
    }))
  }, [subjectPerformance])

  if (loading) {
    return <PerformanceSkeleton />
  }

  if (subjectPerformance.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50/50 dark:bg-slate-900 font-sans flex flex-col transition-colors">
        <header className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 py-3.5">
            <div className="flex items-center gap-3">
              <BackButton href="/student/dashboard" />
              <h1 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                Academic Progress Analytics
              </h1>
            </div>
          </div>
        </header>

        <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-12 sm:py-16 flex items-center justify-center">
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 sm:p-12 text-center border border-slate-200/80 dark:border-slate-700 shadow-xs space-y-3 max-w-md w-full">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-[#003B5C] dark:text-blue-300 flex items-center justify-center mx-auto shadow-inner">
              <TrendingUp className="w-7 h-7" />
            </div>
            <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">No Performance Data Yet</h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
              Your multi-term subject progression curves will appear here once teachers record and publish examination scores.
            </p>
          </div>
        </main>
        <PortalFooter />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-900 font-sans text-slate-900 dark:text-slate-100 flex flex-col transition-colors selection:bg-[#003B5C] selection:text-white">
      
      {/* Sticky Header Banner */}
      <header className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div className="max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 py-3 sm:py-3.5">
          <div className="flex items-center justify-between gap-3 sm:gap-4">
            
            <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
              <BackButton href="/student/dashboard" />
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-4 bg-amber-400 rounded-full shrink-0" />
                  <h1 className="text-base sm:text-xl font-black text-slate-900 dark:text-white tracking-tight truncate">
                    Academic Progress Analytics
                  </h1>
                </div>
                <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium truncate mt-0.5">
                  Subject mark trajectories, competency spider charts, and term comparisons
                </p>
              </div>
            </div>

            <div className="hidden sm:inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200/70 dark:border-blue-900/50 text-[#003B5C] dark:text-blue-300 text-xs font-bold shrink-0 font-mono">
              <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <span>{subjectPerformance.length} Subjects Evaluated</span>
            </div>

          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-3.5 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8 space-y-4 sm:space-y-6 lg:space-y-8">
        
        {/* KPI Strip */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-3.5 md:gap-4 lg:gap-5">
          
          <div className="bg-white dark:bg-slate-800/90 rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 border border-slate-200/80 dark:border-slate-700/80 shadow-xs flex items-center justify-between">
            <div className="space-y-0.5 min-w-0">
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-400 block truncate">
                Cumulative Average
              </span>
              <div className="text-xl sm:text-2xl md:text-3xl font-black font-mono text-[#003B5C] dark:text-blue-400">
                {overallAverage}%
              </div>
              <p className="text-[10px] sm:text-[11px] text-slate-400 truncate">Across all terms</p>
            </div>
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-[#003B5C]/10 text-[#003B5C] dark:bg-blue-500/20 dark:text-blue-300 flex items-center justify-center shrink-0 ml-1">
              <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800/90 rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 border border-slate-200/80 dark:border-slate-700/80 shadow-xs flex items-center justify-between">
            <div className="space-y-0.5 min-w-0">
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-400 block truncate">
                Overall Trajectory
              </span>
              <div className="flex items-center gap-1.5 mt-0.5">
                {overallTrend === 'up' && <TrendingUp className="w-5 h-5 text-emerald-600 shrink-0" />}
                {overallTrend === 'down' && <TrendingDown className="w-5 h-5 text-rose-600 shrink-0" />}
                {overallTrend === 'stable' && <Minus className="w-5 h-5 text-amber-500 shrink-0" />}
                <span className={`text-base sm:text-xl md:text-2xl font-black capitalize truncate ${
                  overallTrend === 'up' ? 'text-emerald-600 dark:text-emerald-400' :
                  overallTrend === 'down' ? 'text-rose-600 dark:text-rose-400' :
                  'text-amber-600 dark:text-amber-400'
                }`}>
                  {overallTrend === 'up' ? 'Improving' : overallTrend === 'down' ? 'Declining' : 'Stable'}
                </span>
              </div>
              <p className="text-[10px] sm:text-[11px] text-slate-400 truncate">Term-to-term shift</p>
            </div>
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-300 flex items-center justify-center shrink-0 ml-1">
              <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800/90 rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 border border-slate-200/80 dark:border-slate-700/80 shadow-xs flex items-center justify-between">
            <div className="space-y-0.5 min-w-0">
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-400 block truncate">
                Strongest Subject
              </span>
              <div className="text-sm sm:text-base md:text-lg font-black text-slate-900 dark:text-white truncate">
                {topSubject?.subject || '---'}
              </div>
              <p className="text-[10px] sm:text-[11px] font-mono text-emerald-600 dark:text-emerald-400 truncate font-bold">
                {topSubject ? `${topSubject.average}% Average` : 'Pending'}
              </p>
            </div>
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-300 flex items-center justify-center shrink-0 ml-1">
              <Award className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800/90 rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 border border-slate-200/80 dark:border-slate-700/80 shadow-xs flex items-center justify-between">
            <div className="space-y-0.5 min-w-0">
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-400 block truncate">
                Terms Recorded
              </span>
              <div className="text-xl sm:text-2xl md:text-3xl font-black font-mono text-slate-900 dark:text-white">
                {termComparison.length}
              </div>
              <p className="text-[10px] sm:text-[11px] text-slate-400 truncate">Total cycles analyzed</p>
            </div>
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-purple-50 text-purple-600 dark:bg-purple-950/40 dark:text-purple-300 flex items-center justify-center shrink-0 ml-1">
              <Calendar className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>

        </section>

        {/* --- Interactive Graphical Visualizer Card --- */}
        <section className="bg-white dark:bg-slate-800/90 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-700/80 shadow-xs overflow-hidden">
          
          {/* Header & Segmented View Controls */}
          <div className="px-4 sm:px-6 py-3.5 sm:py-4 bg-[#003B5C] border-b border-[#002a42] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-0.5">
              <h2 className="text-xs sm:text-sm font-black uppercase tracking-wider text-white flex items-center gap-2">
                <span className="w-1.5 h-4 bg-amber-400 rounded-full shrink-0" />
                <span>Multi-Term Visual Diagnostic</span>
              </h2>
              <p className="text-[11px] text-blue-200/80 hidden sm:block">
                {selectedView === 'line' && 'Area progression curves across sequential terms'}
                {selectedView === 'bar' && 'Grouped subject mark comparison over time'}
                {selectedView === 'radar' && 'Radial competency spread for the most recent term'}
              </p>
            </div>

            {/* Segmented Switcher */}
            <div className="flex items-center gap-1 bg-white/10 p-1 rounded-xl shrink-0 self-start sm:self-auto border border-white/15">
              <button
                type="button"
                onClick={() => setSelectedView('line')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  selectedView === 'line'
                    ? 'bg-amber-400 text-[#003B5C] shadow-xs'
                    : 'text-white hover:bg-white/10'
                }`}
              >
                <LineChartIcon className="w-3.5 h-3.5 shrink-0" />
                <span>Trend Curve</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedView('bar')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  selectedView === 'bar'
                    ? 'bg-amber-400 text-[#003B5C] shadow-xs'
                    : 'text-white hover:bg-white/10'
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5 shrink-0" />
                <span>Bar View</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedView('radar')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  selectedView === 'radar'
                    ? 'bg-amber-400 text-[#003B5C] shadow-xs'
                    : 'text-white hover:bg-white/10'
                }`}
              >
                <RadarIcon className="w-3.5 h-3.5 shrink-0" />
                <span>Radar Map</span>
              </button>
            </div>
          </div>

          {/* Chart Viewport */}
          <div className="p-3 sm:p-5 md:p-6">
            <div className="w-full h-64 sm:h-80 md:h-96">
              
              {selectedView === 'line' && (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={lineChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      {subjectPerformance.map((subject, index) => (
                        <linearGradient key={subject.subject} id={`gradient-${index}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={PALETTE[index % PALETTE.length]} stopOpacity={0.25} />
                          <stop offset="95%" stopColor={PALETTE[index % PALETTE.length]} stopOpacity={0.0} />
                        </linearGradient>
                      ))}
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.6} />
                    <XAxis dataKey="term" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <RechartsTooltip
                      contentStyle={{
                        borderRadius: '12px',
                        border: '1px solid #e2e8f0',
                        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                        fontSize: '12px'
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                    <ReferenceLine y={50} stroke="#f59e0b" strokeDasharray="4 4" label={{ value: 'Pass (50%)', fill: '#d97706', fontSize: 10, position: 'insideBottomRight' }} />
                    <ReferenceLine y={75} stroke="#10b981" strokeDasharray="4 4" label={{ value: 'Good (75%)', fill: '#059669', fontSize: 10, position: 'insideBottomRight' }} />
                    {subjectPerformance.map((subject, index) => (
                      <Area
                        key={subject.subject}
                        type="monotone"
                        dataKey={subject.subject}
                        stroke={PALETTE[index % PALETTE.length]}
                        strokeWidth={2.5}
                        fill={`url(#gradient-${index})`}
                        dot={{ r: 4, fill: PALETTE[index % PALETTE.length], strokeWidth: 2, stroke: '#fff' }}
                        activeDot={{ r: 6, fill: PALETTE[index % PALETTE.length], strokeWidth: 2, stroke: '#fff' }}
                      />
                    ))}
                  </AreaChart>
                </ResponsiveContainer>
              )}

              {selectedView === 'bar' && (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={lineChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.6} />
                    <XAxis dataKey="term" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <RechartsTooltip
                      cursor={{ fill: 'rgba(0,0,0,0.03)' }}
                      contentStyle={{
                        borderRadius: '12px',
                        border: '1px solid #e2e8f0',
                        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                        fontSize: '12px'
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                    {subjectPerformance.map((subject, index) => (
                      <Bar
                        key={subject.subject}
                        dataKey={subject.subject}
                        fill={PALETTE[index % PALETTE.length]}
                        radius={[4, 4, 0, 0]}
                        maxBarSize={36}
                      />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              )}

              {selectedView === 'radar' && (
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData} outerRadius="75%">
                    <PolarGrid stroke="#e2e8f0" />
                    <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fill: '#64748b', fontWeight: 'bold' }} />
                    <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                    <Radar
                      name="Latest Term Mark"
                      dataKey="score"
                      stroke="#003B5C"
                      fill="#003B5C"
                      fillOpacity={0.3}
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
              )}

            </div>
          </div>
        </section>

        {/* --- Subject Performance Cards Grid --- */}
        <section className="space-y-3.5 sm:space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <span className="w-1.5 h-4 bg-amber-400 rounded-full shrink-0" />
              <span>Subject Competency Breakdown</span>
            </h2>
            <span className="text-[11px] font-mono text-slate-400">
              {subjectPerformance.length} Subjects
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-5">
            {subjectPerformance.map((subject) => (
              <div 
                key={subject.subject}
                className="bg-white dark:bg-slate-800/90 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-700/80 p-4 sm:p-5 shadow-xs flex flex-col justify-between space-y-3 hover:border-[#003B5C]/30 dark:hover:border-blue-500/30 transition-all"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white leading-snug line-clamp-1">
                      {subject.subject}
                    </h3>
                    
                    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-lg border shrink-0 ${
                      subject.trend === 'up' 
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300' 
                        : subject.trend === 'down' 
                        ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300' 
                        : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300'
                    }`}>
                      {subject.trend === 'up' && <TrendingUp className="w-3 h-3" />}
                      {subject.trend === 'down' && <TrendingDown className="w-3 h-3" />}
                      {subject.trend === 'stable' && <Minus className="w-3 h-3" />}
                      <span className="capitalize">{subject.trend}</span>
                    </span>
                  </div>

                  <div className="flex items-baseline justify-between pt-1">
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Average Mark</span>
                    <span className="text-xl sm:text-2xl font-black font-mono text-[#003B5C] dark:text-blue-400">
                      {subject.average}%
                    </span>
                  </div>

                  <div className="h-2 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${
                        subject.average >= 75 ? 'bg-emerald-500' :
                        subject.average >= 50 ? 'bg-[#003B5C] dark:bg-blue-400' :
                        subject.average >= 40 ? 'bg-amber-500' : 'bg-rose-500'
                      }`}
                      style={{ width: `${Math.min(subject.average, 100)}%` }}
                    />
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400 font-mono">
                  <span>Terms Recorded:</span>
                  <span className="font-bold text-slate-700 dark:text-slate-300 font-sans">
                    {subject.scores.length} {subject.scores.length === 1 ? 'Term' : 'Terms'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* --- Term-by-Term Comparison Section --- */}
        <section className="bg-white dark:bg-slate-800/90 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-700/80 shadow-xs overflow-hidden">
          <div className="px-4 sm:px-6 py-3.5 sm:py-4 bg-[#003B5C] border-b border-[#002a42] flex items-center justify-between">
            <h2 className="text-xs sm:text-sm font-black uppercase tracking-wider text-white flex items-center gap-2">
              <span className="w-1.5 h-4 bg-amber-400 rounded-full shrink-0" />
              <span>Term-by-Term Composite Progression</span>
            </h2>
            <span className="text-[11px] sm:text-xs text-blue-200/80 font-mono hidden sm:inline">
              Cumulative Average Trend
            </span>
          </div>

          <div className="p-4 sm:p-6 space-y-4">
            {termComparison.map((term) => (
              <div 
                key={term.term} 
                className="space-y-1.5 p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-slate-50/70 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-4 text-xs">
                  <span className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                    {term.term}
                  </span>
                  <div className="flex items-center gap-2 sm:gap-3 text-slate-500 dark:text-slate-400">
                    <span className="font-mono text-xs">{term.subjects} Subjects Recorded</span>
                    <span className="font-mono font-black text-sm text-[#003B5C] dark:text-blue-400">
                      {term.average}%
                    </span>
                  </div>
                </div>

                <div className="h-2.5 sm:h-3 w-full bg-slate-200/80 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div 
                    className="h-full rounded-full bg-gradient-to-r from-[#003B5C] to-blue-500 transition-all duration-500"
                    style={{ width: `${Math.min(term.average, 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

      </main>

      <PortalFooter />
    </div>
  )
}

function PerformanceSkeleton() {
  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-900 flex flex-col font-sans">
      <div className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200/80 dark:border-slate-800" />
      <div className="max-w-7xl mx-auto w-full px-3.5 sm:px-6 lg:px-8 py-6 space-y-6 flex-1">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-80 sm:h-96 w-full rounded-2xl sm:rounded-3xl" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <Skeleton key={i} className="h-36 rounded-2xl sm:rounded-3xl" />
          ))}
        </div>
      </div>
      <PortalFooter />
    </div>
  )
}