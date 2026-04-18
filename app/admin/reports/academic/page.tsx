'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { 
  TrendingUp, Award, Download, Target, Layers, 
  BookOpen, BookMarked, UserCheck, AlertCircle, BarChart3, Activity
} from 'lucide-react'
import BackButton from '@/components/ui/back-button'
import { Skeleton } from '@/components/ui/skeleton'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
  PieChart as RPieChart, Pie, Cell, ComposedChart, Line, Area
} from 'recharts'

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#14b8a6', '#f43f5e'];
const GRADE_COLORS: Record<string, string> = {
  'A': '#10b981', 'B': '#3b82f6', 'C': '#f59e0b', 'D': '#f97316', 'E': '#ef4444', 'F': '#991b1b',
  '1': '#10b981', '2': '#3b82f6', '3': '#60a5fa', '4': '#fcd34d', '5': '#f59e0b', '6': '#fb923c', '7': '#ea580c', '8': '#ef4444', '9': '#991b1b'
}

export default function AdvancedAcademicPerformancePage() {
  const supabase = getSupabaseBrowserClient()
  
  const [terms, setTerms] = useState<any[]>([])
  const [selectedTerm, setSelectedTerm] = useState('')
  const [loading, setLoading] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [activeTab, setActiveTab] = useState<'overview' | 'subjects' | 'classes'>('overview')
  
  // Advanced Stats
  const [stats, setStats] = useState({
      totalAssessments: 0,
      assessedStudents: 0,
      globalAverage: 0,
      passRate: 0,
      excellenceRate: 0, 
      topSubject: { name: '', avg: 0 },
      criticalSubject: { name: '', avg: 0 },
      topClass: { name: '', avg: 0 }
  })
  
  // Data for visualisations
  const [subjectData, setSubjectData] = useState<any[]>([])
  const [classLeague, setClassLeague] = useState<any[]>([])
  const [gradeDistribution, setGradeDistribution] = useState<any[]>([])
  const [genderDistribution, setGenderDistribution] = useState<any[]>([])

  useEffect(() => {
    loadTerms()
  }, [])

  useEffect(() => {
      if (selectedTerm) {
          runAnalysis()
      }
  }, [selectedTerm])

  async function loadTerms() {
      setLoading(true)
      const { data } = await supabase.from('academic_terms').select('id, name, academic_year, is_current').order('start_date', { ascending: false })
      if (data) {
          setTerms(data)
          const active = data.find((t: any) => t.is_current)
          if (active) setSelectedTerm(active.id)
          else if (data.length > 0) setSelectedTerm(data[0].id)
      }
      setLoading(false)
  }

  async function runAnalysis() {
      if (!selectedTerm) return
      setAnalyzing(true)
      
      try {
          const { data: scores } = await supabase
            .from('scores')
            .select('total, grade, subject_id, subjects(name), student_id')
            .eq('term_id', selectedTerm)
            
          const { data: students } = await supabase
            .from('students')
            .select('id, gender, class_id, classes(name)')
            .eq('status', 'active')
            
          if (!scores || !students || scores.length === 0) {
              setStats({
                  totalAssessments: 0, assessedStudents: 0, globalAverage: 0, passRate: 0,
                  excellenceRate: 0, topSubject: { name: '-', avg: 0 }, criticalSubject: { name: '-', avg: 0 }, topClass: { name: '-', avg: 0}
              })
              setSubjectData([])
              setClassLeague([])
              setGradeDistribution([])
              setGenderDistribution([])
              setAnalyzing(false)
              return
          }
           
          // Mapping
          const studentClassMap = new Map()
          students.forEach((s: any) => {
              if (s.classes?.name) {
                  studentClassMap.set(s.id, s.classes.name)
              }
          })

          // Core calculations
          const totalRecords = scores.length
          const distinctStudentsList = new Set(scores.map((s: any) => s.student_id))
          const totalScoreSum = scores.reduce((sum: number, s: any) => sum + (Number(s.total) || 0), 0)
          
          let passingCount = 0;
          let excellentCount = 0; // Above 80% or grade A/1
          
          scores.forEach((s: any) => {
             const t = Number(s.total) || 0;
             if (t >= 50) passingCount++;
             if (t >= 80 || s.grade === 'A' || s.grade === '1') excellentCount++;
          })

          const globalAvg = totalRecords > 0 ? totalScoreSum / totalRecords : 0
          const currentPassRate = totalRecords > 0 ? (passingCount / totalRecords) * 100 : 0
          const currentExcRate = totalRecords > 0 ? (excellentCount / totalRecords) * 100 : 0

          // Gender
          const genderCounts = { Male: 0, Female: 0 }
          const countedStudents = new Set()
          scores.forEach((s: any) => {
              if (!countedStudents.has(s.student_id)) {
                 const student = students.find((std: any) => std.id === s.student_id)
                 if (student?.gender === 'Male') genderCounts.Male++
                 if (student?.gender === 'Female') genderCounts.Female++
                 countedStudents.add(s.student_id)
              }
          })
          const genderDataPayload = [
              { name: 'Male', value: genderCounts.Male, fill: '#3b82f6'},
              { name: 'Female', value: genderCounts.Female, fill: '#f43f5e'}
          ]

          // Subject Performance Deep Dive
          const subjectMap = new Map<string, { total: number, count: number, passCount: number, max: number }>()
          scores.forEach((s: any) => {
              const subName = s.subjects?.name || 'Unknown'
              if (!subjectMap.has(subName)) subjectMap.set(subName, { total: 0, count: 0, passCount: 0, max: 0 })
              const existing = subjectMap.get(subName)!
              const scoreVal = Number(s.total) || 0
              existing.total += scoreVal
              existing.count += 1
              if (scoreVal >= 50) existing.passCount += 1
              if (scoreVal > existing.max) existing.max = scoreVal
          })
          
          let sData = Array.from(subjectMap.entries()).map(([name, item]) => ({
              name,
              average: parseFloat((item.total / item.count).toFixed(1)),
              passRate: parseFloat(((item.passCount / item.count) * 100).toFixed(1)),
              highest: item.max,
              assessments: item.count
          })).sort((a, b) => b.average - a.average)

          const topSub = sData[0] || { name: '-', average: 0 }
          const critSub = sData[sData.length - 1] || { name: '-', average: 0 }

          // Class League Rankings & Pie Chart Data
          const classMap = new Map<string, { total: number, count: number, students: Set<string>, passCount: number }>()
          scores.forEach((s: any) => {
              const className = studentClassMap.get(s.student_id) || 'Unassigned'
              if (!classMap.has(className)) {
                  classMap.set(className, { total: 0, count: 0, students: new Set(), passCount: 0 })
              }
              const existing = classMap.get(className)!
              const scoreVal = Number(s.total) || 0
              existing.total += scoreVal
              existing.count += 1
              existing.students.add(s.student_id)
              if (scoreVal >= 50) existing.passCount += 1
          })
          
          let cData = Array.from(classMap.entries()).map(([name, item]) => ({
              name,
              average: parseFloat((item.total / item.count).toFixed(1)),
              passRate: parseFloat(((item.passCount / item.count) * 100).toFixed(1)),
              studentCount: item.students.size,
              assessmentCount: item.count // For the pie chart
          })).sort((a, b) => b.average - a.average)

          const topCls = cData[0] || { name: '-', average: 0 }

          // Grades
          const gradesCount: Record<string, number> = {}
          scores.forEach((s: any) => {
              if (s.grade) {
                  gradesCount[s.grade] = (gradesCount[s.grade] || 0) + 1
              }
          })
          const gradesPayload = Object.keys(gradesCount)
              .sort()
              .map(g => ({ name: g, value: gradesCount[g], fill: GRADE_COLORS[g] || '#8884d8' }))

          // Updates
          setStats({
              totalAssessments: totalRecords,
              assessedStudents: distinctStudentsList.size,
              globalAverage: Number(globalAvg.toFixed(1)),
              passRate: Number(currentPassRate.toFixed(1)),
              excellenceRate: Number(currentExcRate.toFixed(1)),
              topSubject: { name: topSub.name, avg: topSub.average },
              criticalSubject: { name: critSub.name, avg: critSub.average },
              topClass: { name: topCls.name, avg: topCls.average }
          })
          
          setSubjectData(sData)
          setClassLeague(cData)
          setGradeDistribution(gradesPayload)
          setGenderDistribution(genderDataPayload)

      } catch (e) {
          console.error(e)
      }
      setAnalyzing(false)
  }

  const exportLeagueTable = () => {
     const csvHeader = "Rank,Class,Average Score,Pass Rate %,Students Assessed\n";
     const rows = classLeague.map((c, i) => `${i+1},"${c.name}",${c.average},${c.passRate},${c.studentCount}`)
     const blob = new Blob([csvHeader + rows.join('\n')], { type: 'text/csv' })
     const url = window.URL.createObjectURL(blob)
     const a = document.createElement('a')
     a.href = url; a.download = `Class_Academic_League.csv`; a.click()
  }

  if (loading) {
     return (
       <div className="pb-20 px-2 sm:px-6 lg:px-8 w-full max-w-[100vw] overflow-x-hidden min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center w-full max-w-7xl px-4 min-w-0">
              <div className="space-y-4">
                 <Skeleton className="h-8 w-64" />
                 <Skeleton className="h-4 w-48" />
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-12 mb-8">
                      <Skeleton className="h-32 rounded-lg" />
                      <Skeleton className="h-32 rounded-lg" />
                      <Skeleton className="h-32 rounded-lg" />
                      <Skeleton className="h-32 rounded-lg" />
                 </div>
                 <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 min-w-0">
                     <Skeleton className="h-96 rounded-lg" />
                     <Skeleton className="h-96 rounded-lg" />
                 </div>
              </div>
          </div>
       </div>
     )
  }

  return (
    <div className="pb-20 px-2 sm:px-6 lg:px-8 w-full max-w-[100vw] overflow-x-hidden box-border bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto space-y-6 pt-4 sm:pt-6 w-full overflow-hidden sm:overflow-visible">
        
        {/* Header Section */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-200 shadow-sm w-full min-w-0">
          <div>
            <BackButton href="/admin/reports" className="mb-4" />
            <h1 className="text-2xl sm:text-3xl font-black text-gray-900 flex items-center gap-3">
              <BarChart3 className="w-8 h-8 text-blue-600" />
              School Academic Analytics
            </h1>
            <p className="text-gray-500 mt-2 sm:text-lg max-w-2xl">
              Comprehensive performance dashboard evaluating subjects, grade distributions, and class leaderboards.
            </p>
          </div>
          
          <div className="w-full lg:w-72 mt-4 lg:mt-0 shrink-0">
             <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Analysis Period</label>
             <select 
                value={selectedTerm}
                onChange={(e) => setSelectedTerm(e.target.value)}
                className="w-full bg-gray-50 border-2 border-gray-100 text-gray-800 text-sm font-bold rounded-xl focus:ring-blue-500 focus:border-blue-500 block p-3 outline-none transition-all hover:bg-gray-100"
             >
                 {terms.map(t => (
                     <option key={t.id} value={t.id}>{t.name} ({t.academic_year})</option>
                 ))}
             </select>
          </div>
        </div>

        {analyzing ? (
            <div className="flex flex-col justify-center items-center py-32 bg-white rounded-2xl border border-gray-200 shadow-sm">
                <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-blue-600 mb-4"></div>
                <p className="text-gray-500 font-medium animate-pulse">Running full academic calculations...</p>
            </div>
        ) : stats.totalAssessments === 0 ? (
            <div className="flex flex-col justify-center items-center py-32 bg-white rounded-2xl border border-gray-200 shadow-sm border-dashed">
                <Target className="w-16 h-16 text-gray-300 mb-4" />
                <h3 className="text-xl font-bold text-gray-800 mb-1">No Academic Records Found</h3>
                <p className="text-gray-500 max-w-sm text-center">There are no processed scores for the selected academic term. Enter student results to view analytics.</p>
            </div>
        ) : (
          <div className="space-y-6 lg:space-y-8 w-full min-w-0">
             
            {/* KPI ROW */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full min-w-0">
                <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
                   <div className="absolute top-0 right-0 p-4 opacity-10">
                      <TrendingUp className="w-16 h-16 text-blue-600" />
                   </div>
                   <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">School Average</p>
                   <h3 className="text-4xl font-black text-gray-900 mb-2">{stats.globalAverage}%</h3>
                   <p className="text-sm font-medium text-gray-500">Across {stats.totalAssessments} graded scripts</p>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
                   <div className="absolute top-0 right-0 p-4 opacity-10">
                      <Target className="w-16 h-16 text-green-600" />
                   </div>
                   <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Passing Rate</p>
                   <h3 className="text-4xl font-black text-gray-900 mb-2">
                       <span className={stats.passRate >= 70 ? 'text-green-600' : stats.passRate >= 50 ? 'text-amber-500' : 'text-red-500'}>
                         {stats.passRate}%
                       </span>
                   </h3>
                   <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden mt-3">
                       <div className="bg-green-500 h-full rounded-full transition-all duration-1000" style={{ width: `${stats.passRate}%` }}></div>
                   </div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
                   <div className="absolute top-0 right-0 p-4 opacity-10">
                      <Award className="w-16 h-16 text-purple-600" />
                   </div>
                   <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Excellence Rate</p>
                   <h3 className="text-4xl font-black text-purple-600 mb-2">{stats.excellenceRate}%</h3>
                   <p className="text-sm font-medium text-gray-500">Grades A / Score &ge; 80%</p>
                </div>

                <div className="bg-white p-6 justify-between flex flex-col rounded-2xl border border-gray-200 shadow-sm">
                   <div>
                       <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Distinction Leaders</p>
                       <div className="space-y-3">
                           <div className="flex justify-between items-center group">
                               <div className="flex items-center gap-2">
                                  <BookOpen className="w-4 h-4 text-emerald-500" />
                                  <span className="text-sm font-semibold text-gray-700 truncate max-w-[120px]">{stats.topSubject.name}</span>
                               </div>
                               <span className="text-sm font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">{stats.topSubject.avg}% avg</span>
                           </div>
                           <div className="flex justify-between items-center group">
                               <div className="flex items-center gap-2">
                                  <AlertCircle className="w-4 h-4 text-red-500" />
                                  <span className="text-sm font-semibold text-gray-700 truncate max-w-[120px]">{stats.criticalSubject.name}</span>
                               </div>
                               <span className="text-sm font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded">{stats.criticalSubject.avg}% avg</span>
                           </div>
                       </div>
                   </div>
                </div>
            </div>

            {/* TAB NAVIGATION */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden w-full min-w-0">
               <div className="border-b border-gray-200 bg-gray-50/50">
                <div className="flex overflow-x-auto gap-2 p-3 no-scrollbar scroll-smooth">
                  <button
                    onClick={() => setActiveTab('overview')}
                    className={`px-5 py-2.5 text-sm font-bold rounded-lg transition-colors whitespace-nowrap flex items-center gap-2 ${
                      activeTab === 'overview' ? 'bg-white text-blue-700 shadow-sm ring-1 ring-gray-200/50' : 'text-gray-500 hover:text-gray-800 hover:bg-gray-100'
                    }`}
                  >
                    <Activity className="w-4 h-4" /> Global Landscape
                  </button>
                  <button
                    onClick={() => setActiveTab('subjects')}
                    className={`px-5 py-2.5 text-sm font-bold rounded-lg transition-colors whitespace-nowrap flex items-center gap-2 ${
                      activeTab === 'subjects' ? 'bg-white text-blue-700 shadow-sm ring-1 ring-gray-200/50' : 'text-gray-500 hover:text-gray-800 hover:bg-gray-100'
                    }`}
                  >
                    <BookMarked className="w-4 h-4" /> Subject Analysis
                  </button>
                  <button
                    onClick={() => setActiveTab('classes')}
                    className={`px-5 py-2.5 text-sm font-bold rounded-lg transition-colors whitespace-nowrap flex items-center gap-2 ${
                      activeTab === 'classes' ? 'bg-white text-blue-700 shadow-sm ring-1 ring-gray-200/50' : 'text-gray-500 hover:text-gray-800 hover:bg-gray-100'
                    }`}
                  >
                    <Layers className="w-4 h-4" /> Class League Standings
                  </button>
                </div>
               </div>

               <div className="p-6">
                 {/* TAB 1: OVERVIEW */}
                 {activeTab === 'overview' && (
                     <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 w-full min-w-0">
                         {/* GRADE PIE */}
                         <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] w-full">
                             <div className="mb-6">
                               <h3 className="text-lg font-black text-gray-800">Scoring Grades (A-F)</h3>
                               <p className="text-sm text-gray-500">Distribution of literal academic grades.</p>
                             </div>
                             <div className="h-80 w-full pr-4">
                               <ResponsiveContainer width="100%" height="100%">
                                  <RPieChart margin={{ top: 20, right: 20, bottom: 40, left: 20 }}>
                                     <Pie
                                        data={gradeDistribution}
                                        cx="50%" cy="50%"
                                        innerRadius={50} outerRadius={85}
                                        paddingAngle={4}
                                        dataKey="value"
                                     >
                                        {gradeDistribution.map((entry, index) => (
                                           <Cell key={`cell-${index}`} fill={entry.fill} />
                                        ))}
                                     </Pie>
                                     <RechartsTooltip 
                                          formatter={(val: any, name: any) => [`${val} assessments`, name]}
                                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} 
                                     />
                                     <Legend 
                                        verticalAlign="bottom" 
                                        height={36} 
                                        wrapperStyle={{ paddingTop: '20px' }} 
                                        iconType="circle"
                                     />
                                  </RPieChart>
                               </ResponsiveContainer>
                             </div>
                         </div>

                         {/* CLASS DISTRIBUTION PIE */}
                         <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] w-full">
                             <div className="mb-6">
                               <h3 className="text-lg font-black text-gray-800">Assessments by Class</h3>
                               <p className="text-sm text-gray-500">Share of total grading data across classes.</p>
                             </div>
                             <div className="h-80 w-full pr-4">
                               <ResponsiveContainer width="100%" height="100%">
                                  <RPieChart margin={{ top: 20, right: 20, bottom: 40, left: 20 }}>
                                     <Pie
                                        data={classLeague}
                                        cx="50%" cy="50%"
                                        innerRadius={50} outerRadius={85}
                                        paddingAngle={2}
                                        dataKey="assessmentCount"
                                        nameKey="name"
                                     >
                                        {classLeague.map((entry, index) => (
                                           <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                     </Pie>
                                     <RechartsTooltip 
                                          formatter={(val: any, name: any) => [`${val} assessments`, name]}
                                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} 
                                     />
                                  </RPieChart>
                               </ResponsiveContainer>
                             </div>
                         </div>

                         {/* SUB PERF SUMMARY */}
                         <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] w-full">
                             <div className="mb-6">
                               <h3 className="text-lg font-black text-gray-800">Top 5 Strongest Subjects</h3>
                               <p className="text-sm text-gray-500">Highest ranked subjects by average percentage.</p>
                             </div>
                             <div className="space-y-4">
                                {subjectData.slice(0, 5).map((sub, idx) => (
                                    <div key={idx} className="flex items-center gap-4">
                                        <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-700 font-bold flex items-center justify-center text-sm shrink-0">
                                            #{idx + 1}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-end mb-1">
                                               <p className="text-sm font-bold text-gray-800 truncate">{sub.name}</p>
                                               <p className="text-sm font-black text-blue-600">{sub.average}%</p>
                                            </div>
                                            <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                                                <div className="bg-blue-500 h-full rounded-full" style={{ width: `${sub.average}%` }}></div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                             </div>
                         </div>
                     </div>
                 )}

                 {/* TAB 2: SUBJECTS */}
                 {activeTab === 'subjects' && (
                     <div className="w-full min-w-0 animate-in fade-in slide-in-from-bottom-2 duration-300">
                         <div className="mb-6">
                           <h3 className="text-lg font-black text-gray-800">Subject Proficiency Chart</h3>
                           <p className="text-sm text-gray-500">Visual mapping of average scores across all subjects.</p>
                         </div>
                         <div className="h-[550px] w-full bg-gray-50/50 rounded-xl border border-gray-100 p-2 sm:p-4 min-w-0 mb-8">
                             <ResponsiveContainer width="100%" height="100%">
                                <ComposedChart data={subjectData} margin={{ top: 30, right: 30, bottom: 140, left: 10 }}>
                                   <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                                   <XAxis dataKey="name" angle={-45} textAnchor="end" tick={{fontSize: 11, fill: '#6b7280'}} interval={0} height={140} />
                                   <YAxis yAxisId="left" tick={{fontSize: 11, fill: '#6b7280'}} width={45} tickFormatter={(val)=>`${val}%`} />
                                   <YAxis yAxisId="right" orientation="right" tick={{fontSize: 11, fill: '#6b7280'}} width={45} />
                                   <RechartsTooltip 
                                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                      cursor={{ fill: 'rgba(59, 130, 246, 0.05)' }}
                                   />
                                   <Legend wrapperStyle={{ paddingTop: '20px' }} />
                                   
                                   <Bar yAxisId="left" dataKey="average" name="Avg Score (%)" fill="#3b82f6" radius={[6, 6, 0, 0]} maxBarSize={60} />
                                   <Line yAxisId="right" type="monotone" dataKey="passRate" name="Pass Rate (%)" stroke="#10b981" strokeWidth={3} dot={{r:4, strokeWidth: 2}} />
                                </ComposedChart>
                             </ResponsiveContainer>
                         </div>
                         
                         {/* Details Table */}
                         <div className="overflow-x-auto w-full min-w-0 border border-gray-200 rounded-xl">
                            <table className="w-full text-left bg-white text-sm">
                               <thead className="bg-gray-50 border-b border-gray-200">
                                   <tr>
                                      <th className="p-4 font-bold text-gray-500 uppercase text-[11px] tracking-wider">Subject</th>
                                      <th className="p-4 font-bold text-gray-500 uppercase text-[11px] tracking-wider text-center">Assessed</th>
                                      <th className="p-4 font-bold text-gray-500 uppercase text-[11px] tracking-wider text-center">Avg Score</th>
                                      <th className="p-4 font-bold text-gray-500 uppercase text-[11px] tracking-wider text-center">Highest</th>
                                      <th className="p-4 font-bold text-gray-500 uppercase text-[11px] tracking-wider text-right">Pass Rate</th>
                                   </tr>
                               </thead>
                               <tbody className="divide-y divide-gray-100">
                                   {subjectData.map((s, idx) => (
                                       <tr key={idx} className="hover:bg-blue-50/40 transition-colors">
                                           <td className="p-4 font-bold text-gray-800">{s.name}</td>
                                           <td className="p-4 text-center text-gray-600">{s.assessments} tests</td>
                                           <td className="p-4 text-center font-bold text-blue-600">{s.average}%</td>
                                           <td className="p-4 text-center text-emerald-600 font-semibold">{s.highest}%</td>
                                           <td className="p-4 text-right">
                                              <span className={`inline-flex px-2.5 py-1 rounded-md text-xs font-bold ${s.passRate >= 70 ? 'bg-emerald-100 text-emerald-700' : s.passRate >= 50 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                                                 {s.passRate}%
                                              </span>
                                           </td>
                                       </tr>
                                   ))}
                               </tbody>
                            </table>
                         </div>
                     </div>
                 )}

                 {/* TAB 3: CLASSES */}
                 {activeTab === 'classes' && (
                     <div className="w-full min-w-0 animate-in fade-in slide-in-from-bottom-2 duration-300">
                         <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
                             <div>
                                 <h3 className="text-lg font-black text-gray-800">Class League Standings</h3>
                                 <p className="text-sm text-gray-500">Ranking of classes based on aggregate student performance.</p>
                             </div>
                             <button
                               onClick={exportLeagueTable}
                               className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl font-bold text-sm shadow-sm transition-all"
                             >
                               <Download className="w-4 h-4" /> Export CSV
                             </button>
                         </div>

                         <div className="overflow-x-auto w-full min-w-0 border border-gray-200 rounded-xl relative">
                            <table className="w-full text-left bg-white text-sm min-w-[600px]">
                               <thead className="bg-gray-50 border-b border-gray-200">
                                   <tr>
                                      <th className="p-4 font-bold text-gray-500 uppercase text-[11px] tracking-wider w-16 text-center">Rank</th>
                                      <th className="p-4 font-bold text-gray-500 uppercase text-[11px] tracking-wider">Class Level</th>
                                      <th className="p-4 font-bold text-gray-500 uppercase text-[11px] tracking-wider text-center">Students</th>
                                      <th className="p-4 font-bold text-gray-500 uppercase text-[11px] tracking-wider text-center">Class Average</th>
                                      <th className="p-4 font-bold text-gray-500 uppercase text-[11px] tracking-wider text-right">Pass Rate</th>
                                   </tr>
                               </thead>
                               <tbody className="divide-y divide-gray-100">
                                   {classLeague.map((cls, idx) => (
                                       <tr key={idx} className="hover:bg-blue-50/40 transition-colors">
                                           <td className="p-4 text-center">
                                              {idx === 0 ? (
                                                  <div className="w-8 h-8 rounded-full bg-yellow-100 text-yellow-600 font-black flex items-center justify-center mx-auto text-sm">1</div>
                                              ) : idx === 1 ? (
                                                  <div className="w-8 h-8 rounded-full bg-gray-200 text-gray-600 font-black flex items-center justify-center mx-auto text-sm">2</div>
                                              ) : idx === 2 ? (
                                                  <div className="w-8 h-8 rounded-full bg-orange-100 text-orange-700 font-black flex items-center justify-center mx-auto text-sm">3</div>
                                              ) : (
                                                  <span className="font-bold text-gray-400">#{idx + 1}</span>
                                              )}
                                           </td>
                                           <td className="p-4 font-black text-gray-800 text-base">{cls.name}</td>
                                           <td className="p-4 text-center text-gray-600 font-medium">
                                               <span className="inline-flex items-center gap-1.5 bg-gray-100 px-2 py-1 rounded text-xs"><UserCheck className="w-3 h-3 text-gray-500"/> {cls.studentCount}</span>
                                           </td>
                                           <td className="p-4 text-center">
                                              <span className={`text-base font-black ${cls.average >= 70 ? 'text-green-600' : cls.average >= 50 ? 'text-amber-600' : 'text-red-500'}`}>
                                                 {cls.average}%
                                              </span>
                                           </td>
                                           <td className="p-4 text-right">
                                              <div className="flex flex-col items-end">
                                                  <span className="font-bold text-gray-700">{cls.passRate}%</span>
                                                  <div className="w-16 bg-gray-100 h-1.5 rounded-full overflow-hidden mt-1">
                                                      <div className={`h-full rounded-full ${cls.passRate >= 70 ? 'bg-green-500' : cls.passRate >= 50 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${cls.passRate}%` }}></div>
                                                  </div>
                                              </div>
                                           </td>
                                       </tr>
                                   ))}
                               </tbody>
                            </table>
                         </div>
                     </div>
                 )}
               </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
