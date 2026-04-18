'use client'

import { useState, useEffect } from 'react'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'
import { Download, Calendar, Users, Percent, BookOpen, UserCheck, AlertTriangle, Filter, CheckCircle2 } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'
import BackButton from '@/components/ui/back-button'
import { Skeleton } from '@/components/ui/skeleton'

export default function AdminAttendanceReportsPage() {
  const supabase = getSupabaseBrowserClient()
  const [loading, setLoading] = useState(true)
  
  const [terms, setTerms] = useState<any[]>([])
  const [classes, setClasses] = useState<any[]>([])
  
  const [selectedTerm, setSelectedTerm] = useState<string>('all')
  const [selectedClass, setSelectedClass] = useState<string>('all')
  const [activeTab, setActiveTab] = useState<'dashboard' | 'class_analysis' | 'student_records'>('dashboard')

  const [attendanceData, setAttendanceData] = useState<any[]>([])
  const [students, setStudents] = useState<any[]>([])
  const [termTotalDays, setTermTotalDays] = useState<number>(0)

  // Computed data
  const [stats, setStats] = useState({
      totalStudents: 0,
      avgAttendanceRate: 0,
      perfectAttendance: 0,
      criticalAttendance: 0
  })
  
  const [chartData, setChartData] = useState<any[]>([])
  const [bandData, setBandData] = useState<any[]>([])

  useEffect(() => {
    loadFilters()
  }, [])

  useEffect(() => {
    if (terms.length > 0) {
      loadReportData()
    }
  }, [selectedTerm, selectedClass, terms])

  const loadFilters = async () => {
    try {
      const [termsRes, classesRes] = await Promise.all([
          supabase.from('academic_terms').select('id, academic_year, name, is_current, total_days').order('start_date', { ascending: false }),
          supabase.from('classes').select('id, name').order('name')
        ])

      const fetchedTerms = termsRes.data || []
      setTerms(fetchedTerms)
      setClasses(classesRes.data || [])

      const currentTerm = fetchedTerms.find((t: any) => t.is_current)
      if (currentTerm) {
        setSelectedTerm(currentTerm.id)
      } else if (fetchedTerms.length > 0) {
        setSelectedTerm(fetchedTerms[0].id)
      }
    } catch (error) {
      console.error('Error loading attendance filters:', error)
    }
  }

  const loadReportData = async () => {
    setLoading(true)
    try {
      let studentsQuery = supabase.from('students').select('id, first_name, last_name, student_id, class_id').eq('status', 'active')
      if (selectedClass !== 'all') {
        studentsQuery = studentsQuery.eq('class_id', selectedClass)
      }
      const { data: studentsRes } = await studentsQuery

      let attendanceQuery = supabase.from('student_attendance').select('*')
      if (selectedTerm !== 'all') {
        attendanceQuery = attendanceQuery.eq('term_id', selectedTerm)
      }
      if (selectedClass !== 'all') {
        attendanceQuery = attendanceQuery.eq('class_id', selectedClass)
      }
      const { data: attRes } = await attendanceQuery

      const loadedStudents = studentsRes || []
      const loadedAttendance = attRes || []
      
      setStudents(loadedStudents)
      setAttendanceData(loadedAttendance)

      let currentTermDays = 0
      if (selectedTerm !== 'all') {
        const term = terms.find(t => t.id === selectedTerm)
        currentTermDays = term?.total_days || 0
      } else {
        currentTermDays = terms.reduce((acc, t) => acc + (t.total_days || 0), 0)
      }
      setTermTotalDays(currentTermDays)

      // Compute statistics
      const totalStuds = loadedStudents.length
      let expectedDays = totalStuds * currentTermDays
      let actualDays = loadedAttendance.reduce((acc: number, curr: any) => acc + (curr.days_present || 0), 0)
      
      const avgRate = expectedDays > 0 ? (actualDays / expectedDays) * 100 : 0
      
      let perfAtt = 0
      let critAtt = 0
      
      const bands = { 'Excellent (90%+)': 0, 'Good (75-89%)': 0, 'Warning (50-74%)': 0, 'Critical (<50%)': 0 }

      loadedStudents.forEach((s: any) => {
          const att = loadedAttendance.find((a: any) => a.student_id === s.id)
          const days = att ? (att.days_present || 0) : 0
          if (days === currentTermDays && currentTermDays > 0) perfAtt++
          
          const rate = currentTermDays > 0 ? (days / currentTermDays) * 100 : 0
          
          if (rate >= 90) bands['Excellent (90%+)']++
          else if (rate >= 75) bands['Good (75-89%)']++
          else if (rate >= 50) bands['Warning (50-74%)']++
          else {
              bands['Critical (<50%)']++
              critAtt++
          }
      })

      setStats({
          totalStudents: totalStuds,
          avgAttendanceRate: avgRate,
          perfectAttendance: perfAtt,
          criticalAttendance: critAtt
      })

      // Class Chart Data
      if (selectedClass === 'all') {
          const cData = classes.map((c: any) => {
              const clsStudents = loadedStudents.filter((s: any) => s.class_id === c.id)
              const clsAtt = loadedAttendance.filter((a: any) => a.class_id === c.id)
              const cExpected = clsStudents.length * currentTermDays
              const cActual = clsAtt.reduce((sum: number, item: any) => sum + (item.days_present || 0), 0)
              return {
                  name: c.name,
                  rate: cExpected > 0 ? Number(((cActual / cExpected) * 100).toFixed(1)) : 0,
                  students: clsStudents.length
              }
          }).filter((d: any) => d.students > 0).sort((a: any, b: any) => b.rate - a.rate)
          setChartData(cData)
      } else {
          setChartData([])
      }
      
      // Band Data
      const bandPayload = Object.entries(bands)
        .map(([name, value]) => ({ name, value }))
        .filter(b => b.value > 0)
        
      setBandData(bandPayload)

    } catch (err) {
      console.error('Failed to load attendance report:', err)
    } finally {
      setLoading(false)
    }
  }

  const exportCSV = () => {
    const rows = students.map(s => {
      const att = attendanceData.find(a => a.student_id === s.id)
      const days = att ? (att.days_present || 0) : 0
      const rate = termTotalDays > 0 ? ((days / termTotalDays) * 100).toFixed(1) : 0
      const className = classes.find(c => c.id === s.class_id)?.name || 'Unknown'
      return `"${s.first_name} ${s.last_name}","${s.student_id}","${className}",${days},${termTotalDays},${rate}%`
    })

    const csvHeader = "Student Name,ID,Class,Days Present,Total Days,Attendance Rate\n"
    const csvContent = csvHeader + rows.join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `attendance_report_${selectedClass === 'all' ? 'global' : classes.find(c => c.id === selectedClass)?.name.replace(/ /g, '_')}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }
  
  const BAND_COLORS: Record<string, string> = {
    'Excellent (90%+)': '#10b981',
    'Good (75-89%)': '#3b82f6',
    'Warning (50-74%)': '#f59e0b',
    'Critical (<50%)': '#ef4444'
  }

  return (
    <div className="pb-20 px-2 sm:px-6 lg:px-8 w-full max-w-[100vw] overflow-x-hidden min-h-screen bg-gray-50 flex flex-col font-sans">
      <div className="max-w-7xl mx-auto space-y-6 pt-4 sm:pt-6 w-full fade-in">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center">
            <BackButton href="/admin/reports" className="mt-1 sm:mt-0 shadow-sm" />
            <div className="ml-2 sm:ml-4">
               <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">Attendance Analytics</h1>
               <p className="text-sm sm:text-base text-gray-500 font-medium mt-1">School-wide presence and truancy tracking</p>
            </div>
          </div>
          
          <button 
            onClick={exportCSV}
            className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-bold text-sm transition-all shadow-sm hover:shadow-md w-full md:w-auto"
          >
            <Download className="w-4 h-4" />
            Export Report (.csv)
          </button>
        </div>

        {/* Global Filters */}
        <div className="bg-white p-5 rounded-2xl shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] border border-gray-100 flex flex-col md:flex-row items-center gap-4">
            <div className="flex items-center gap-2 text-gray-400 border-r border-gray-100 pr-4 hidden md:flex">
               <Filter className="w-5 h-5" />
               <span className="text-sm font-bold uppercase tracking-wider">Filters</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full md:flex-1">
               <div className="relative">
                  <select 
                    className="w-full bg-gray-50 border-none text-gray-800 text-sm font-bold rounded-xl focus:ring-2 focus:ring-blue-500/20 block p-3.5 appearance-none cursor-pointer"
                    value={selectedTerm}
                    onChange={(e) => setSelectedTerm(e.target.value)}
                  >
                     <option value="all">All Terms (Consolidated)</option>
                     {terms.map(t => (
                       <option key={t.id} value={t.id}>{t.name} — {t.academic_year}</option>
                     ))}
                  </select>
                  <Calendar className="w-4 h-4 text-gray-400 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
               </div>
               <div className="relative">
                  <select 
                    className="w-full bg-gray-50 border-none text-gray-800 text-sm font-bold rounded-xl focus:ring-2 focus:ring-blue-500/20 block p-3.5 appearance-none cursor-pointer"
                    value={selectedClass}
                    onChange={(e) => setSelectedClass(e.target.value)}
                  >
                     <option value="all">Global View (All Classes)</option>
                     {classes.map(c => (
                       <option key={c.id} value={c.id}>{c.name}</option>
                     ))}
                  </select>
                  <Users className="w-4 h-4 text-gray-400 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
               </div>
            </div>
        </div>

        {loading ? (
             <div className="py-20 flex flex-col items-center justify-center">
                <Skeleton className="h-12 w-12 rounded-full mb-4" />
                <Skeleton className="h-6 w-48 mb-2" />
                <Skeleton className="h-4 w-32" />
             </div>
        ) : (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 xl:gap-6 min-w-0">
               {/* KPI 1 */}
               <div className="bg-white p-6 rounded-3xl shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07)] border border-gray-50 relative overflow-hidden group">
                  <div className="absolute -right-4 -top-4 w-24 h-24 bg-blue-50 rounded-full blur-2xl group-hover:bg-blue-100 transition-colors"></div>
                  <div className="relative z-10">
                     <div className="flex justify-between items-start mb-4">
                         <div className="p-3 bg-blue-100/50 text-blue-600 rounded-xl">
                             <Users className="w-6 h-6" />
                         </div>
                     </div>
                     <h3 className="text-3xl font-black text-gray-900 mb-1">{stats.totalStudents}</h3>
                     <p className="text-sm font-bold text-gray-500 uppercase tracking-widest">Total Students</p>
                  </div>
               </div>

               {/* KPI 2 */}
               <div className="bg-white p-6 rounded-3xl shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07)] border border-gray-50 relative overflow-hidden group">
                  <div className="absolute -right-4 -top-4 w-24 h-24 bg-emerald-50 rounded-full blur-2xl group-hover:bg-emerald-100 transition-colors"></div>
                  <div className="relative z-10">
                     <div className="flex justify-between items-start mb-4">
                         <div className="p-3 bg-emerald-100/50 text-emerald-600 rounded-xl">
                             <Percent className="w-6 h-6" />
                         </div>
                     </div>
                     <h3 className="text-3xl font-black text-gray-900 mb-1">{stats.avgAttendanceRate.toFixed(1)}%</h3>
                     <p className="text-sm font-bold text-gray-500 uppercase tracking-widest">Avg Attendance Rate</p>
                  </div>
               </div>

               {/* KPI 3 */}
               <div className="bg-white p-6 rounded-3xl shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07)] border border-gray-50 relative overflow-hidden group">
                  <div className="absolute -right-4 -top-4 w-24 h-24 bg-purple-50 rounded-full blur-2xl group-hover:bg-purple-100 transition-colors"></div>
                  <div className="relative z-10">
                     <div className="flex justify-between items-start mb-4">
                         <div className="p-3 bg-purple-100/50 text-purple-600 rounded-xl">
                             <UserCheck className="w-6 h-6" />
                         </div>
                     </div>
                     <h3 className="text-3xl font-black text-gray-900 mb-1">{stats.perfectAttendance}</h3>
                     <p className="text-sm font-bold text-gray-500 uppercase tracking-widest">Perfect Attendance</p>
                  </div>
               </div>

               {/* KPI 4 */}
               <div className="bg-white p-6 rounded-3xl shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07)] border border-gray-50 relative overflow-hidden group">
                  <div className="absolute -right-4 -top-4 w-24 h-24 bg-red-50 rounded-full blur-2xl group-hover:bg-red-100 transition-colors"></div>
                  <div className="relative z-10">
                     <div className="flex justify-between items-start mb-4">
                         <div className="p-3 bg-red-100/50 text-red-500 rounded-xl">
                             <AlertTriangle className="w-6 h-6" />
                         </div>
                     </div>
                     <h3 className="text-3xl font-black text-gray-900 mb-1">{stats.criticalAttendance}</h3>
                     <p className="text-sm font-bold text-gray-500 uppercase tracking-widest">Critical Shortfall (&lt;50%)</p>
                  </div>
               </div>
            </div>

            {/* Content Tabs */}
            <div className="bg-white rounded-3xl shadow-[0_2px_15px_-3px_rgba(0,0,0,0.05)] border border-gray-100 overflow-hidden w-full min-w-0">
              <div className="border-b border-gray-100 px-4 sm:px-6">
                <div className="flex overflow-x-auto gap-6 no-scrollbar pt-2">
                  <button onClick={() => setActiveTab('dashboard')} className={`pb-4 pt-4 px-2 text-sm font-extrabold whitespace-nowrap transition-all border-b-2 ${activeTab === 'dashboard' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>
                    Visual Dashboard
                  </button>
                  <button onClick={() => setActiveTab('class_analysis')} className={`pb-4 pt-4 px-2 text-sm font-extrabold whitespace-nowrap transition-all border-b-2 ${activeTab === 'class_analysis' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>
                    Class Analysis
                  </button>
                  <button onClick={() => setActiveTab('student_records')} className={`pb-4 pt-4 px-2 text-sm font-extrabold whitespace-nowrap transition-all border-b-2 ${activeTab === 'student_records' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>
                    Student Records
                  </button>
                </div>
              </div>

              <div className="p-4 sm:p-8 pt-8 overflow-hidden min-h-[400px]">
                 
                 {/* TAB 1: VISUAL DASHBOARD */}
                 {activeTab === 'dashboard' && (
                    <div className="w-full grid grid-cols-1 lg:grid-cols-2 gap-8">
                       {/* Performance Bands */}
                       <div className="bg-gray-50/50 p-6 rounded-2xl border border-gray-100 w-full">
                           <div className="mb-6">
                              <h3 className="text-xl font-black text-gray-800">Attendance Distribution</h3>
                              <p className="text-sm text-gray-500 font-medium">Students categorized by attendance rate</p>
                           </div>
                           <div className="h-[300px] w-full">
                             {bandData.length === 0 ? (
                               <div className="w-full h-full flex items-center justify-center text-gray-400 font-medium">No data to display</div>
                             ) : (
                               <ResponsiveContainer width="100%" height="100%">
                                  <PieChart>
                                     <Pie
                                        data={bandData} cx="50%" cy="50%" innerRadius={70} outerRadius={105} paddingAngle={3} dataKey="value" stroke="none"
                                     >
                                        {bandData.map((entry, index) => (
                                           <Cell key={`cell-${index}`} fill={BAND_COLORS[entry.name] || '#8884d8'} />
                                        ))}
                                     </Pie>
                                     <RechartsTooltip 
                                        formatter={(val: any, name: any) => [`${val} Students`, name]}
                                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} 
                                     />
                                     <Legend verticalAlign="bottom" height={36} wrapperStyle={{ paddingTop: '20px' }} iconType="circle" />
                                  </PieChart>
                               </ResponsiveContainer>
                             )}
                           </div>
                       </div>
                       
                       {/* Class Rates Chart */}
                       <div className="bg-gray-50/50 p-6 rounded-2xl border border-gray-100 w-full">
                           <div className="mb-6 flex justify-between items-start">
                              <div>
                                <h3 className="text-xl font-black text-gray-800">Class Comparison</h3>
                                <p className="text-sm text-gray-500 font-medium">Average attendance rate per class</p>
                              </div>
                           </div>
                           <div className="h-[300px] w-full mt-4">
                              {selectedClass !== 'all' ? (
                                  <div className="w-full h-full flex flex-col items-center justify-center text-center">
                                      <Calendar className="w-12 h-12 text-gray-300 mb-3" />
                                      <p className="text-gray-500 font-bold">Switch to "Global View" to see class comparisons.</p>
                                  </div>
                              ) : chartData.length === 0 ? (
                                  <div className="w-full h-full flex items-center justify-center text-gray-400 font-medium">No class records to display</div>
                              ) : (
                                <ResponsiveContainer width="100%" height="100%">
                                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis dataKey="name" tick={{fontSize: 11, fontWeight: 600, fill: '#64748b'}} angle={-45} textAnchor="end" interval={0} axisLine={false} tickLine={false} />
                                    <YAxis tick={{fontSize: 11, fontWeight: 600, fill: '#64748b'}} width={45} tickFormatter={(val) => `${val}%`} axisLine={false} tickLine={false} />
                                    <RechartsTooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '12px', border: '1px solid #f1f5f9', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} formatter={(val: any) => [`${val}%`, 'Attendance Rate']} />
                                    <Bar dataKey="rate" fill="#3b82f6" radius={[6, 6, 0, 0]} maxBarSize={45}>
                                       {chartData.map((entry, index) => (
                                          <Cell key={`cell-${index}`} fill={entry.rate >= 90 ? '#10b981' : entry.rate >= 75 ? '#3b82f6' : entry.rate >= 50 ? '#f59e0b' : '#ef4444'} />
                                       ))}
                                    </Bar>
                                  </BarChart>
                                </ResponsiveContainer>
                              )}
                           </div>
                       </div>
                    </div>
                 )}

                 {/* TAB 2: CLASS ANALYSIS (League Table style) */}
                 {activeTab === 'class_analysis' && (
                    <div className="w-full">
                       {selectedClass !== 'all' ? (
                           <div className="text-center py-20">
                               <p className="text-gray-500 font-bold">Select "Global View (All Classes)" to view the full class breakdown table.</p>
                           </div>
                       ) : chartData.length === 0 ? (
                           <div className="text-center py-20">
                               <p className="text-gray-500 font-bold">No class records to display yet.</p>
                           </div>
                       ) : (
                          <div className="overflow-x-auto w-full border border-gray-100 rounded-2xl shadow-sm">
                            <table className="w-full text-left bg-white min-w-[600px]">
                              <thead className="bg-gray-50/80 border-b border-gray-100">
                                <tr>
                                  <th className="p-5 font-black text-gray-500 uppercase text-[11px] tracking-widest text-center w-16">Rank</th>
                                  <th className="p-5 font-black text-gray-500 uppercase text-[11px] tracking-widest">Class Level</th>
                                  <th className="p-5 font-black text-gray-500 uppercase text-[11px] tracking-widest text-center">Student Headcount</th>
                                  <th className="p-5 font-black text-gray-500 uppercase text-[11px] tracking-widest text-right">Avg Attendance Rate</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-50">
                                {chartData.map((cls, idx) => (
                                   <tr key={idx} className="hover:bg-blue-50/40 transition-colors">
                                      <td className="p-5 text-center">
                                          {idx === 0 ? (
                                              <div className="w-8 h-8 rounded-full bg-yellow-100 text-yellow-600 font-black flex items-center justify-center mx-auto text-sm">1</div>
                                          ) : idx === 1 ? (
                                              <div className="w-8 h-8 rounded-full bg-gray-100 text-gray-600 font-black flex items-center justify-center mx-auto text-sm">2</div>
                                          ) : idx === 2 ? (
                                              <div className="w-8 h-8 rounded-full bg-orange-100 text-orange-700 font-black flex items-center justify-center mx-auto text-sm">3</div>
                                          ) : (
                                              <span className="font-bold text-gray-400">{idx + 1}</span>
                                          )}
                                      </td>
                                      <td className="p-5 font-bold text-gray-900">{cls.name}</td>
                                      <td className="p-5 text-center font-semibold text-gray-600">{cls.students}</td>
                                      <td className="p-5 text-right">
                                         <span className={`inline-flex items-center px-3 py-1.5 rounded-lg text-[13px] font-black ${cls.rate >= 90 ? 'bg-emerald-100 text-emerald-800' : cls.rate >= 75 ? 'bg-blue-100 text-blue-800' : cls.rate >= 50 ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'}`}>
                                           {cls.rate.toFixed(1)}%
                                         </span>
                                      </td>
                                   </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                       )}
                    </div>
                 )}

                 {/* TAB 3: STUDENT RECORDS */}
                 {activeTab === 'student_records' && (
                    <div className="overflow-x-auto w-full min-w-0 border border-gray-100 rounded-2xl shadow-sm">
                      <table className="w-full text-left bg-white text-sm min-w-[750px]">
                        <thead className="bg-gray-50/80 border-b border-gray-100 uppercase text-[11px] font-black text-gray-500 tracking-widest">
                          <tr>
                            <th className="p-5">Student Identity</th>
                            <th className="p-5 hidden sm:table-cell">Class Assignment</th>
                            <th className="p-5 text-center w-32">Days Present</th>
                            <th className="p-5 text-center w-32">Expected Days</th>
                            <th className="p-5 text-right w-40">Attendance Rate</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {students.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="p-12 text-center text-gray-400 font-bold">
                                No student records found. Try modifying filters.
                              </td>
                            </tr>
                          ) : (
                            students.sort((a,b) => a.first_name.localeCompare(b.first_name)).map(s => {
                               const att = attendanceData.find(a => a.student_id === s.id)
                               const days = att?.days_present || 0
                               const rate = termTotalDays > 0 ? (days / termTotalDays) * 100 : 0
                               const classObj = classes.find(c => c.id === s.class_id)
                               
                               return (
                                 <tr key={s.id} className="hover:bg-gray-50/60 transition-colors group">
                                    <td className="p-5 min-w-[200px]">
                                      <div className="flex items-center gap-3">
                                          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-black text-sm shrink-0">
                                             {s.first_name[0]}{s.last_name?.[0] || ''}
                                          </div>
                                          <div>
                                              <p className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors">{s.first_name} {s.last_name}</p>
                                              <p className="text-[11px] font-semibold text-gray-400 tracking-wider uppercase mt-0.5">{s.student_id}</p>
                                          </div>
                                      </div>
                                    </td>
                                    <td className="p-5 hidden sm:table-cell font-bold text-gray-600">
                                      {classObj?.name || '-'}
                                    </td>
                                    <td className="p-5 text-center font-black text-gray-800">
                                      {days}
                                    </td>
                                    <td className="p-5 text-center font-bold text-gray-400">
                                      {termTotalDays}
                                    </td>
                                    <td className="p-5 text-right">
                                      <span className={`inline-flex items-center px-3 py-1.5 rounded-lg text-[13px] font-black ${rate >= 90 ? 'bg-emerald-100 text-emerald-800' : rate >= 75 ? 'bg-blue-100 text-blue-800' : rate >= 50 ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'}`}>
                                         {rate.toFixed(1)}%
                                      </span>
                                    </td>
                                 </tr>
                               )
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                 )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
