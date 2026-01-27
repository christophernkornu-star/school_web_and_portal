'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, BarChart2, TrendingUp, PieChart, Award } from 'lucide-react'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
  PieChart as RPieChart, Pie, Cell
} from 'recharts'

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658'];

export default function PerformanceAnalysisPage() {
  const supabase = getSupabaseBrowserClient()
  
  // Filters
  const [terms, setTerms] = useState<any[]>([])
  const [selectedTerm, setSelectedTerm] = useState('')
  const [loading, setLoading] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  
  // Stats
  const [stats, setStats] = useState({
      totalStudents: 0,
      averageScore: 0,
      passRate: 0, // Assuming pass is > 50
      topSubject: '',
      lowSubject: ''
  })
  
  // Chart Data
  const [subjectPerformance, setSubjectPerformance] = useState<any[]>([])
  const [gradeDistribution, setGradeDistribution] = useState<any[]>([])
  const [classPerformance, setClassPerformance] = useState<any[]>([])
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
      // Fetch academic terms
      const { data } = await supabase.from('academic_terms').select('id, name, academic_year, is_current').order('start_date', { ascending: false })
      if (data) {
          setTerms(data)
          const active = data.find((t: any) => t.is_current)
          if (active) setSelectedTerm(active.id)
          else if (data.length > 0) setSelectedTerm(data[0].id)
      }
  }

  async function runAnalysis() {
      if (!selectedTerm) return
      setAnalyzing(true)
      
      try {
          // 1. Fetch all needed data
          // We need scores joined with subjects. And students joined with classes.
          
          const { data: scores } = await supabase
            .from('scores')
            .select(`
                total,
                grade,
                subject_id,
                subjects(name),
                student_id
            `)
            .eq('term_id', selectedTerm)
            
          const { data: students } = await supabase
            .from('students')
            .select('id, gender, class_id, classes(name)')
            .eq('status', 'active')
            
          if (!scores || !students) {
              setAnalyzing(false)
              return
          }
           
          // Create lookup for student class
          const studentClassMap = new Map()
          students.forEach((s: any) => {
              if (s.classes?.name) {
                  studentClassMap.set(s.id, s.classes.name)
              }
          })

          // --- Process Stats ---
          const totalRecords = scores.length
          const totalScoreSum = scores.reduce((sum, s) => sum + (s.total || 0), 0)
          const globalAverage = totalRecords > 0 ? totalScoreSum / totalRecords : 0
          const passingScores = scores.filter((s:any) => (s.total || 0) >= 50).length
          const passRate = totalRecords > 0 ? (passingScores / totalRecords) * 100 : 0
          const distinctStudents = new Set(scores.map((s: any) => s.student_id)).size

          // --- Gender Distribution ---
          // Count distinct students by gender
          const genderCounts = { Male: 0, Female: 0 }
          const countedStudents = new Set()
          
          scores.forEach((s: any) => {
              // Only count each student once
              if (!countedStudents.has(s.student_id)) {
                 const student = students.find((std: any) => std.id === s.student_id)
                 if (student && student.gender) {
                     if (student.gender === 'Male') genderCounts.Male++
                     else if (student.gender === 'Female') genderCounts.Female++
                 }
                 countedStudents.add(s.student_id)
              }
          })
          
          const genderData = [
              { name: 'Male', value: genderCounts.Male },
              { name: 'Female', value: genderCounts.Female }
          ]

          // --- Subject Performance (Bar Chart) ---
          const subjectMap = new Map<string, { name: string, total: number, count: number }>()
          scores.forEach((s: any) => {
              const subName = s.subjects?.name || 'Unknown'
              if (!subjectMap.has(subName)) {
                  subjectMap.set(subName, { name: subName, total: 0, count: 0 })
              }
              const existing = subjectMap.get(subName)!
              existing.total += (s.total || 0)
              existing.count += 1
          })
          
          const subjectData = Array.from(subjectMap.values()).map(item => ({
              name: item.name,
              average: parseFloat((item.total / item.count).toFixed(1))
          })).sort((a, b) => b.average - a.average)
          
          // --- Class Performance (Bar Chart) ---
          const classMap = new Map<string, { name: string, total: number, count: number }>()
          scores.forEach((s: any) => {
              const className = studentClassMap.get(s.student_id)
              if (className) {
                if (!classMap.has(className)) {
                    classMap.set(className, { name: className, total: 0, count: 0 })
                }
                const existing = classMap.get(className)!
                existing.total += (s.total || 0)
                existing.count += 1
              }
          })
           
          const classData = Array.from(classMap.values()).map(item => ({
              name: item.name,
              average: parseFloat((item.total / item.count).toFixed(1))
          })).sort((a, b) => b.average - a.average)

          // --- Grade Distribution (Pie Chart) ---
          // Assuming grades are like 1, 2, 3.. or A, B, C... Let's use the 'grade' column literal
          const gradeMap = new Map<string, number>()
          scores.forEach((s: any) => {
              const g = s.grade || 'N/A'
              gradeMap.set(g, (gradeMap.get(g) || 0) + 1)
          })
          
          const gradeData = Array.from(gradeMap.entries()).map(([name, value]) => ({
              name, value
          })).sort((a, b) => a.name.localeCompare(b.name))

          // Set State
          setStats({
              totalStudents: distinctStudents,
              averageScore: parseFloat(globalAverage.toFixed(1)),
              passRate: parseFloat(passRate.toFixed(1)),
              topSubject: subjectData.length > 0 ? subjectData[0].name : '-',
              lowSubject: subjectData.length > 0 ? subjectData[subjectData.length - 1].name : '-'
          })
          
          setSubjectPerformance(subjectData)
          setGradeDistribution(gradeData)
          setClassPerformance(classData)
          setGenderDistribution(genderData)

      } catch (err) {
          console.error(err)
      } finally {
          setAnalyzing(false)
      }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6 flex flex-col">
      <div className="max-w-7xl mx-auto w-full flex-1">
        <div className="flex items-center space-x-4 mb-6">
          <Link href="/admin/results" className="text-gray-600 hover:text-gray-900 transition-colors">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <h1 className="text-2xl font-bold text-gray-800">Performance Analysis</h1>
        </div>

        {/* Filters */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 mb-8 flex flex-col md:flex-row items-end md:items-center gap-4">
             <div className="flex-1 w-full md:w-auto">
                 <label className="block text-sm font-medium text-gray-700 mb-1">Academic Term for Analysis</label>
                 <select 
                    value={selectedTerm}
                    onChange={(e) => setSelectedTerm(e.target.value)}
                    className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500"
                 >
                     {terms.map(t => (
                         <option key={t.id} value={t.id}>{t.name} ({t.academic_year})</option>
                     ))}
                 </select>
             </div>
             <div>
                 {analyzing && <span className="text-sm text-blue-600 animate-pulse">Updating analysis...</span>}
             </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-medium text-gray-500">Average Score</h3>
                    <TrendingUp className="w-4 h-4 text-green-500" />
                </div>
                <p className="text-2xl font-bold text-gray-900">{stats.averageScore}</p>
                <p className="text-xs text-gray-500 mt-1">Global term average</p>
            </div>
            
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-medium text-gray-500">Pass Rate</h3>
                    <PieChart className="w-4 h-4 text-blue-500" />
                </div>
                <p className="text-2xl font-bold text-gray-900">{stats.passRate}%</p>
                <p className="text-xs text-gray-500 mt-1">Scores above 50%</p>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-medium text-gray-500">Top Subject</h3>
                    <Award className="w-4 h-4 text-yellow-500" />
                </div>
                <p className="text-xl font-bold text-gray-900 truncate" title={stats.topSubject}>
                    {stats.topSubject}
                </p>
                <p className="text-xs text-gray-500 mt-1">Highest average performance</p>
            </div>

             <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-medium text-gray-500">Students Evaluated</h3>
                    <BarChart2 className="w-4 h-4 text-purple-500" />
                </div>
                <p className="text-2xl font-bold text-gray-900">{stats.totalStudents}</p>
                <p className="text-xs text-gray-500 mt-1">With recorded scores</p>
            </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            
            {/* Subject Performance */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <h3 className="text-lg font-bold text-gray-800 mb-6">Subject Performance</h3>
                <div className="h-80 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={subjectPerformance} layout="vertical" margin={{ left: 40, right: 40 }}>
                             <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                             <XAxis type="number" domain={[0, 100]} hide />
                             <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 11 }} />
                             <RechartsTooltip 
                                contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                cursor={{ fill: 'transparent' }}
                             />
                             <Bar dataKey="average" fill="#4F46E5" radius={[0, 4, 4, 0]} barSize={20} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Class Performance */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <h3 className="text-lg font-bold text-gray-800 mb-6">Class Performance</h3>
                <div className="h-80 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                         <BarChart data={classPerformance}>
                             <CartesianGrid strokeDasharray="3 3" vertical={false} />
                             <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                             <YAxis domain={[0, 100]} />
                             <RechartsTooltip 
                                contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                cursor={{ fill: 'transparent' }}
                             />
                             <Bar dataKey="average" fill="#10B981" radius={[4, 4, 0, 0]} barSize={30} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Grade Distribution */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <h3 className="text-lg font-bold text-gray-800 mb-6">Grade Distribution</h3>
                <div className="h-80 w-full flex justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                        <RPieChart>
                            <Pie
                                data={gradeDistribution}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                                outerRadius={80}
                                fill="#8884d8"
                                dataKey="value"
                            >
                                {gradeDistribution.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <RechartsTooltip contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                            <Legend />
                        </RPieChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Gender Distribution */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <h3 className="text-lg font-bold text-gray-800 mb-6">Gender Distribution</h3>
                <div className="h-80 w-full flex justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                        <RPieChart>
                            <Pie
                                data={genderDistribution}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                                outerRadius={80}
                                fill="#8884d8"
                                dataKey="value"
                            >
                                <Cell fill="#0088FE" /> {/* Male - Blue */}
                                <Cell fill="#FF8042" /> {/* Female - Orange/Pink */}
                            </Pie>
                            <RechartsTooltip contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                            <Legend />
                        </RPieChart>
                    </ResponsiveContainer>
                </div>
            </div>

             {/* Insights */}
             <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <h3 className="text-lg font-bold text-gray-800 mb-4">Quick Insights</h3>
                <div className="space-y-4">
                    <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
                        <h4 className="font-bold text-blue-900 text-sm mb-1">Pass Rate Analysis</h4>
                        <p className="text-xs text-blue-800">
                            The overall pass rate is <span className="font-bold">{stats.passRate}%</span>. 
                            {stats.passRate > 70 ? ' This indicates strong academic performance across the board.' : ' Areas for improvement should be identified in lower performing subjects.'}
                        </p>
                    </div>
                     <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-100">
                        <h4 className="font-bold text-yellow-900 text-sm mb-1">Subject Focus</h4>
                        <p className="text-xs text-yellow-800">
                            <span className="font-bold">{stats.lowSubject}</span> appears to be the most challenging subject this term. Consider reviewing the curriculum or providing additional support.
                        </p>
                    </div>
                </div>
            </div>

        </div>
      </div>
    </div>
  )
}
