'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'
import { ArrowLeft, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
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
import BackButton from '@/components/ui/BackButton'
import { toast } from 'react-hot-toast'

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

      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      // Get student info
      const studentResult = await supabase
        .from('students')
        .select('id')
        .eq('profile_id', user.id)
        .single()
      const student = studentResult.data as any

      if (!student) {
        console.error('No student record found')
        return
      }

      // Get all grades with subject and term info
      const { data: grades, error } = await supabase
        .from('scores')
        .select(`
          *,
          subjects (
            name
          ),
          academic_terms (
            name,
            academic_year,
            start_date
          )
        `)
        .eq('student_id', student.id)
        .order('academic_terms(start_date)', { ascending: true }) as { data: any[] | null; error: any }

      if (error) {
        console.error('Error fetching grades:', error)
        return
      }

      if (!grades || grades.length === 0) {
        setLoading(false)
        return
      }

      // Process subject performance
      const subjectMap: { [key: string]: SubjectPerformance } = {}

      grades.forEach((grade: any) => {
        const subjectName = grade.subjects?.name || 'Unknown'
        const termName = grade.academic_terms?.name || 'Unknown'
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

      // Calculate averages and trends
      Object.values(subjectMap).forEach(subject => {
        const validScores = subject.scores.filter(s => s > 0)
        subject.average = validScores.length > 0
          ? Math.round(validScores.reduce((a, b) => a + b, 0) / validScores.length * 10) / 10
          : 0

        // Calculate trend (comparing last score with first score)
        if (validScores.length >= 2) {
          const firstScore = validScores[0]
          const lastScore = validScores[validScores.length - 1]
          const diff = lastScore - firstScore
          
          if (diff > 5) subject.trend = 'up'
          else if (diff < -5) subject.trend = 'down'
          else subject.trend = 'stable'
        }
      })

      setSubjectPerformance(Object.values(subjectMap))

      // Process term comparison
      const termMap: { [key: string]: { total: number; count: number } } = {}

      grades.forEach((grade: any) => {
        const termName = grade.academic_terms?.name || 'Unknown'
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
          average: data.count > 0 ? Math.round(data.total / data.count * 10) / 10 : 0,
          subjects: data.count
        })
      )

      setTermComparison(termComparisonData)

      // Calculate overall trend
      if (termComparisonData.length >= 2) {
        const firstAvg = termComparisonData[0].average
        const lastAvg = termComparisonData[termComparisonData.length - 1].average
        const diff = lastAvg - firstAvg

        if (diff > 3) setOverallTrend('up')
        else if (diff < -3) setOverallTrend('down')
        else setOverallTrend('stable')
      }
    } catch (error) {
      console.error('Error loading performance data:', error)
    } finally {
      setLoading(false)
    }
  }

  function getTrendIcon(trend: 'up' | 'down' | 'stable') {
    switch (trend) {
      case 'up':
        return <TrendingUp className="w-5 h-5 text-green-600" />
      case 'down':
        return <TrendingDown className="w-5 h-5 text-red-600" />
      case 'stable':
        return <Minus className="w-5 h-5 text-yellow-600" />
    }
  }

  function getTrendText(trend: 'up' | 'down' | 'stable') {
    switch (trend) {
      case 'up':
        return 'Improving'
      case 'down':
        return 'Declining'
      case 'stable':
        return 'Stable'
    }
  }

  // Prepare data for line chart
  const lineChartData = subjectPerformance.length > 0
    ? subjectPerformance[0].terms.map((term, index) => {
        const dataPoint: any = { term }
        subjectPerformance.forEach(subject => {
          dataPoint[subject.subject] = subject.scores[index] || 0
        })
        return dataPoint
      })
    : []

  // Prepare data for radar chart (latest term only)
  const radarData = subjectPerformance.map(subject => ({
    subject: subject.subject.length > 15 
      ? subject.subject.substring(0, 15) + '...' 
      : subject.subject,
    score: subject.scores[subject.scores.length - 1] || 0,
    fullMark: 100
  }))

  const colors = [
    '#003366', '#0066CC', '#3399FF', '#66B2FF', '#99CCFF',
    '#9933FF', '#CC66FF', '#FF6699', '#FF9933', '#FFCC33'
  ]

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
            <div className="max-w-7xl mx-auto space-y-8">
               <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                 <Skeleton className="h-32 w-full rounded-lg" />
                 <Skeleton className="h-32 w-full rounded-lg" />
                 <Skeleton className="h-32 w-full rounded-lg" />
               </div>
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                    <div className="flex justify-between items-center mb-6">
                         <div className="space-y-2">
                             <Skeleton className="h-6 w-48" />
                             <Skeleton className="h-4 w-64" />
                         </div>
                    </div>
                    <Skeleton className="h-96 w-full rounded" />
                </div>
            </div>
          </main>
      </div>
    )
  }

  if (subjectPerformance.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <BackButton href="/student/dashboard" label="Back to Dashboard" className="text-methodist-blue hover:text-blue-700 mb-4" />
            <h1 className="text-2xl md:text-3xl font-bold text-methodist-blue">Performance Trends</h1>
          </div>

          <div className="bg-white rounded-lg shadow p-8 md:p-12 text-center">
            <TrendingUp className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">No Performance Data</h3>
            <p className="text-gray-600">
              Your performance trends will appear here once you have grades from multiple terms.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <BackButton href="/student/dashboard" label="Back to Dashboard" className="text-methodist-blue hover:text-blue-700 mb-4" />
          <h1 className="text-xl md:text-2xl lg:text-3xl font-bold text-methodist-blue">Performance Trends</h1>
          <p className="text-xs md:text-sm text-gray-600 mt-2">Track your academic progress over time</p>
        </div>

        {/* Overall Trend Card */}
        <div className="bg-white rounded-lg shadow p-4 md:p-6 mb-8">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-800 mb-2">Overall Performance</h2>
              <div className="flex items-center gap-3">
                {getTrendIcon(overallTrend)}
                <span className="text-xl md:text-2xl font-bold text-gray-800">
                  {getTrendText(overallTrend)}
                </span>
              </div>
            </div>
            <div className="text-left md:text-right">
              <p className="text-sm text-gray-600">Average Across All Terms</p>
              <p className="text-2xl md:text-3xl font-bold text-methodist-blue">
                {termComparison.length > 0
                  ? Math.round(
                      termComparison.reduce((sum, t) => sum + t.average, 0) / termComparison.length * 10
                    ) / 10
                  : 0}%
              </p>
            </div>
          </div>
        </div>

        {/* View Toggle */}
        <div className="bg-white rounded-lg shadow p-4 md:p-6 mb-8">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
            <span className="text-sm font-medium text-gray-700">View Type:</span>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedView('line')}
                className={`px-3 md:px-4 py-2 rounded-lg transition-colors text-sm md:text-base ${
                  selectedView === 'line'
                    ? 'bg-methodist-blue text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Line Chart
              </button>
              <button
                onClick={() => setSelectedView('bar')}
                className={`px-3 md:px-4 py-2 rounded-lg transition-colors text-sm md:text-base ${
                  selectedView === 'bar'
                    ? 'bg-methodist-blue text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Bar Chart
              </button>
              <button
                onClick={() => setSelectedView('radar')}
                className={`px-3 md:px-4 py-2 rounded-lg transition-colors text-sm md:text-base ${
                  selectedView === 'radar'
                    ? 'bg-methodist-blue text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Radar Chart
              </button>
            </div>
          </div>
        </div>

        {/* Charts */}
        <div className="bg-white rounded-lg shadow p-4 md:p-6 mb-8">
          <h2 className="text-lg md:text-xl font-semibold text-gray-800 mb-6">
            {selectedView === 'radar' ? 'Latest Term Performance' : 'Performance Over Time'}
          </h2>

          <div className="w-full h-64 md:h-96">
            {selectedView === 'line' && (
              <ResponsiveContainer>
                <AreaChart data={lineChartData}>
                  <defs>
                    {subjectPerformance.map((subject, index) => (
                      <linearGradient key={`gradient-${subject.subject}`} id={`gradient-${index}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={colors[index % colors.length]} stopOpacity={0.3}/>
                        <stop offset="95%" stopColor={colors[index % colors.length]} stopOpacity={0.05}/>
                      </linearGradient>
                    ))}
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                  <XAxis dataKey="term" tick={{ fill: '#666', fontSize: 12 }} />
                  <YAxis domain={[0, 100]} tick={{ fill: '#666', fontSize: 12 }} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                      borderRadius: '8px',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                      border: 'none',
                      fontSize: '12px'
                    }} 
                  />
                  <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                  <ReferenceLine y={50} stroke="#ff6b6b" strokeDasharray="5 5" label={{ value: 'Pass Mark', fill: '#ff6b6b', fontSize: 10 }} />
                  <ReferenceLine y={75} stroke="#51cf66" strokeDasharray="5 5" label={{ value: 'Good', fill: '#51cf66', fontSize: 10 }} />
                  {subjectPerformance.map((subject, index) => (
                    <Area
                      key={subject.subject}
                      type="monotoneX"
                      dataKey={subject.subject}
                      stroke={colors[index % colors.length]}
                      strokeWidth={3}
                      fill={`url(#gradient-${index})`}
                      dot={{ r: 5, fill: colors[index % colors.length], strokeWidth: 2, stroke: '#fff' }}
                      activeDot={{ r: 8, fill: colors[index % colors.length], strokeWidth: 2, stroke: '#fff' }}
                    />
                  ))}
                </AreaChart>
              </ResponsiveContainer>
            )}

            {selectedView === 'bar' && (
              <ResponsiveContainer>
                <BarChart data={lineChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="term" tick={{ fontSize: 12 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                  <Tooltip contentStyle={{ fontSize: '12px' }} />
                  <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                  {subjectPerformance.map((subject, index) => (
                    <Bar
                      key={subject.subject}
                      dataKey={subject.subject}
                      fill={colors[index % colors.length]}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            )}

            {selectedView === 'radar' && (
              <ResponsiveContainer>
                <RadarChart data={radarData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10 }} />
                  <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                  <Radar
                    name="Latest Scores"
                    dataKey="score"
                    stroke="#003366"
                    fill="#003366"
                    fillOpacity={0.6}
                  />
                  <Tooltip contentStyle={{ fontSize: '12px' }} />
                </RadarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Subject Performance Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 mb-8">
          {subjectPerformance.map((subject) => (
            <div key={subject.subject} className="bg-white rounded-lg shadow p-6">
              <div className="flex items-start justify-between mb-4">
                <h3 className="font-semibold text-base md:text-lg text-gray-800">{subject.subject}</h3>
                {getTrendIcon(subject.trend)}
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs md:text-sm text-gray-600">Average Score</span>
                  <span className="text-base md:text-lg font-bold text-methodist-blue">
                    {subject.average}%
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs md:text-sm text-gray-600">Trend</span>
                  <span className={`text-xs md:text-sm font-semibold ${
                    subject.trend === 'up' ? 'text-green-600' :
                    subject.trend === 'down' ? 'text-red-600' :
                    'text-yellow-600'
                  }`}>
                    {getTrendText(subject.trend)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs md:text-sm text-gray-600">Terms Completed</span>
                  <span className="text-xs md:text-sm font-semibold text-gray-800">
                    {subject.scores.length}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Term Comparison */}
        <div className="bg-white rounded-lg shadow p-4 md:p-6">
          <h2 className="text-lg md:text-xl font-semibold text-gray-800 mb-6">Term-by-Term Comparison</h2>
          <div className="space-y-4">
            {termComparison.map((term, index) => (
              <div key={term.term} className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
                <div className="w-full md:w-32 font-medium text-gray-800">{term.term}</div>
                <div className="flex-1">
                  <div className="relative h-8 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="absolute h-full bg-gradient-to-r from-methodist-blue to-blue-400 rounded-full transition-all duration-500"
                      style={{ width: `${term.average}%` }}
                    />
                    <div className="absolute inset-0 flex items-center justify-center text-sm font-semibold text-gray-700">
                      {term.average}%
                    </div>
                  </div>
                </div>
                <div className="w-full md:w-24 text-right text-sm text-gray-600">
                  {term.subjects} subject{term.subjects !== 1 ? 's' : ''}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
