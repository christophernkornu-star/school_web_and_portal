'use client'

import { useState, useEffect, useMemo } from 'react'
import { X, Search, Filter, Loader2, Users, Baby, ChevronDown, ChevronRight } from 'lucide-react'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer } from 'recharts'
import { differenceInYears } from 'date-fns'
import { Button } from '@/components/ui/button'

interface StudentStatsModalProps {
  isOpen: boolean
  onClose: () => void
  classIds?: string[]
}

export function StudentStatsModal({ isOpen, onClose, classIds }: StudentStatsModalProps) {
  const [loading, setLoading] = useState(true)
  const [students, setStudents] = useState<any[]>([])
  const [classes, setClasses] = useState<any[]>([])
  const [activeTab, setActiveTab] = useState<'overview' | 'levels' | 'classes' | 'age'>('overview')
  
  // Age Calculation State
  const [ageRange, setAgeRange] = useState({ min: 5, max: 15 })
  const [selectedAgeClassId, setSelectedAgeClassId] = useState<string>('all')
  const [ageStats, setAgeStats] = useState({ 
    male: 0, 
    female: 0, 
    total: 0, 
    studentsList: [] as any[] 
  })

  const supabase = getSupabaseBrowserClient()

  useEffect(() => {
    if (isOpen) {
      fetchData()
    }
  }, [isOpen])

  useEffect(() => {
    if (activeTab === 'age' && students.length > 0) {
      calculateAgeStats()
    }
  }, [ageRange, selectedAgeClassId, students, activeTab])

  const fetchData = async () => {
    setLoading(true)
    try {
      // Fetch active students with gender, dob, class info
      let query = supabase
        .from('students')
        .select(`
          id, first_name, last_name, gender, date_of_birth, status,
          classes (id, name, level, category)
        `)
        .eq('status', 'active')

      if (classIds && classIds.length > 0) {
        query = query.in('class_id', classIds)
      }

      const { data: studentsData, error: studentError } = await query

      if (studentError) throw studentError
      setStudents(studentsData || [])

      // Fetch classes for reference
      let classQuery = supabase
        .from('classes')
        .select('*')
        .order('level', { ascending: true })

      if (classIds && classIds.length > 0) {
        classQuery = classQuery.in('id', classIds)
      }

      const { data: classesData, error: classError } = await classQuery

      if (classError) throw classError
      setClasses(classesData || [])

    } catch (error) {
      console.error('Error fetching student stats:', error)
    } finally {
      setLoading(false)
    }
  }

  // --- Calculations ---

  const totalStats = useMemo(() => {
    const male = students.filter(s => s.gender === 'Male').length
    const female = students.filter(s => s.gender === 'Female').length
    return { male, female, total: students.length }
  }, [students])

  const levelStats = useMemo(() => {
    // Categories: KG, Lower Primary, Upper Primary, JHS
    const groups = {
      KG: { male: 0, female: 0, total: 0 },
      'Lower Primary': { male: 0, female: 0, total: 0 },
      'Upper Primary': { male: 0, female: 0, total: 0 },
      JHS: { male: 0, female: 0, total: 0 },
      Other: { male: 0, female: 0, total: 0 }
    }

    students.forEach(s => {
      const clsName = s.classes?.name || ''
      let category = 'Other'

      if (clsName.includes('KG') || clsName.includes('Kindergarten')) category = 'KG'
      else if (clsName.match(/Basic [1-3]|Class [1-3]|P[1-3]/i)) category = 'Lower Primary'
      else if (clsName.match(/Basic [4-6]|Class [4-6]|P[4-6]/i)) category = 'Upper Primary'
      // JHS Match needs to be more robust or fallback if nothing else matches but has JHS in name
      else if (clsName.match(/JHS|Junior High|Basic [7-9]|BS [7-9]/i)) category = 'JHS' 
      
      // Fallback for known JHS classes if regex misses
      if (category === 'Other' && (clsName.includes('JHS') || clsName.includes('Basic 7') || clsName.includes('Basic 8') || clsName.includes('Basic 9'))) {
          category = 'JHS'
      }

      if (s.gender === 'Male') groups[category as keyof typeof groups].male++
      else if (s.gender === 'Female') groups[category as keyof typeof groups].female++
      
      groups[category as keyof typeof groups].total++
    })

    return groups
  }, [students])

  const classStats = useMemo(() => {
    const stats: Record<string, { male: 0, female: 0, total: 0, id: string }> = {}

    // Initialize with all classes to show even empty ones
    classes.forEach(c => {
      stats[c.name] = { male: 0, female: 0, total: 0, id: c.id }
    })

    students.forEach(s => {
      const clsName = s.classes?.name
      if (clsName && stats[clsName]) {
        if (s.gender === 'Male') stats[clsName].male++
        else if (s.gender === 'Female') stats[clsName].female++
        stats[clsName].total++
      }
    })

    return Object.entries(stats).sort((a, b) => {
       // Try sort by level if available in classes array
       const clsA = classes.find(c => c.name === a[0])
       const clsB = classes.find(c => c.name === b[0])
       return (clsA?.level || 0) - (clsB?.level || 0)
    })
  }, [students, classes])

  const calculateAgeStats = () => {
    const today = new Date()
    let male = 0
    let female = 0
    const studentsInRange: any[] = []

    students.forEach(s => {
      if (!s.date_of_birth) return

      // Filter by class if specific class is selected
      if (selectedAgeClassId !== 'all' && s.classes?.id !== selectedAgeClassId) {
          return
      }

      const age = differenceInYears(today, new Date(s.date_of_birth))
      
      if (age >= ageRange.min && age <= ageRange.max) {
        if (s.gender === 'Male') male++
        else if (s.gender === 'Female') female++
        
        // Add student to the list with their calculated age
        studentsInRange.push({
            ...s,            first_name: s.first_name,
            last_name: s.last_name,            calculated_age: age
        })
      }
    })

    // Sort students by age then name
    studentsInRange.sort((a, b) => {
        if (a.calculated_age !== b.calculated_age) {
            return a.calculated_age - b.calculated_age
        }
        return `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`)
    })

    setAgeStats({ male, female, total: male + female, studentsList: studentsInRange })
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="p-4 md:p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900/50">
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
              <Users className="w-6 h-6 text-blue-600" />
              Student Demographics
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">Detailed breakdown of student population</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
            
            {/* Sidebar Tabs */}
            <div className="w-full md:w-64 bg-gray-50 dark:bg-gray-900/30 border-r border-gray-100 dark:border-gray-700 p-4 space-y-2 overflow-y-auto">
              {['overview', 'levels', 'classes', 'age'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab as any)}
                  className={`w-full text-left px-4 py-3 rounded-lg text-sm font-medium transition-colors flex items-center justify-between group ${
                    activeTab === tab 
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' 
                      : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
                  }`}
                >
                  <span className="capitalize">{tab.replace('-', ' ')} Breakdown</span>
                  {activeTab === tab && <ChevronRight className="w-4 h-4 ml-2" />}
                </button>
              ))}
            </div>

            {/* Main Panel */}
            <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-white dark:bg-gray-800">
              {loading ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-400">
                  <Loader2 className="w-8 h-8 animate-spin mb-4 text-blue-500" />
                  <p>Analyzing student data...</p>
                </div>
              ) : (
                <div className="space-y-8">
                  
                  {/* Overview Tab */}
                  {activeTab === 'overview' && (
                    <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
                      <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 border-b pb-2 flex items-center justify-between">
                        Total Population Overview
                      </h3>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                         <StatCard title="Total Students" value={totalStats.total} color="bg-blue-50 text-blue-700 border-blue-200" icon={Users} />
                         <StatCard title="Total Boys" value={totalStats.male} color="bg-cyan-50 text-cyan-700 border-cyan-200" icon={Users} />
                         <StatCard title="Total Girls" value={totalStats.female} color="bg-pink-50 text-pink-700 border-pink-200" icon={Users} />
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 p-6 rounded-2xl shadow-sm">
                          <h4 className="text-sm font-bold text-gray-600 uppercase tracking-wider mb-4 text-center">Gender Demographics</h4>
                          <div className="h-64 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                <Pie
                                  data={[
                                    { name: 'Boys', value: totalStats.male },
                                    { name: 'Girls', value: totalStats.female }
                                  ]}
                                  cx="50%"
                                  cy="50%"
                                  innerRadius={60}
                                  outerRadius={90}
                                  paddingAngle={5}
                                  dataKey="value"
                                >
                                  <Cell fill="#06b6d4" />
                                  <Cell fill="#ec4899" />
                                </Pie>
                                <RechartsTooltip 
                                  formatter={(value, name) => [`${value} Students`, name]}
                                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                />
                                <Legend verticalAlign="bottom" height={36} />
                              </PieChart>
                            </ResponsiveContainer>
                          </div>
                        </div>
                        
                        <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 p-6 rounded-2xl shadow-sm flex flex-col justify-center">
                          <h4 className="text-sm font-bold text-gray-600 uppercase tracking-wider mb-8">Distribution Summary</h4>
                          <div className="space-y-8">
                            <div>
                               <div className="flex justify-between text-sm mb-3">
                                  <span className="font-semibold px-3 py-1 rounded-full bg-cyan-50 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300">Boys</span>
                                  <span className="font-black text-cyan-600 text-lg">{totalStats.total > 0 ? ((totalStats.male / totalStats.total) * 100).toFixed(1) : 0}%</span>
                               </div>
                               <div className="h-4 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden shadow-inner">
                                  <div className="bg-cyan-500 h-full transition-all duration-1000 rounded-full" style={{ width: `${totalStats.total > 0 ? (totalStats.male / totalStats.total) * 100 : 0}%` }} />
                               </div>
                            </div>
                            <div>
                               <div className="flex justify-between text-sm mb-3">
                                  <span className="font-semibold px-3 py-1 rounded-full bg-pink-50 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300">Girls</span>
                                  <span className="font-black text-pink-600 text-lg">{totalStats.total > 0 ? ((totalStats.female / totalStats.total) * 100).toFixed(1) : 0}%</span>
                               </div>
                               <div className="h-4 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden shadow-inner">
                                  <div className="bg-pink-500 h-full transition-all duration-1000 rounded-full" style={{ width: `${totalStats.total > 0 ? (totalStats.female / totalStats.total) * 100 : 0}%` }} />
                               </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Levels Tab */}
                  {activeTab === 'levels' && (
                    <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                      <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 border-b pb-2">Level Breakdown</h3>
                      
                      <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 p-6 rounded-2xl shadow-sm mb-6">
                        <h4 className="text-sm font-bold text-gray-600 uppercase tracking-wider mb-6 text-center">Students per Educational Level</h4>
                        <div className="h-72 w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                              data={Object.entries(levelStats).map(([name, stats]) => ({
                                name,
                                boys: stats.male,
                                girls: stats.female,
                                total: stats.total
                              })).filter(d => d.total > 0)}
                              margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
                            >
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} />
                              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} />
                              <RechartsTooltip 
                                cursor={{fill: 'rgba(0,0,0,0.05)'}}
                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                              />
                              <Legend wrapperStyle={{ paddingTop: '20px' }} />
                              <Bar dataKey="boys" name="Boys" stackId="a" fill="#06b6d4" radius={[0, 0, 4, 4]} maxBarSize={60} />
                              <Bar dataKey="girls" name="Girls" stackId="a" fill="#ec4899" radius={[4, 4, 0, 0]} maxBarSize={60} />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {Object.entries(levelStats).map(([level, stats]) => (
                           stats.total > 0 && (
                            <div key={level} className="p-4 rounded-xl border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 hover:shadow-md transition-shadow">
                              <div className="flex justify-between items-start mb-4">
                                <div>
                                  <h4 className="font-bold text-gray-800 dark:text-gray-200 text-lg">{level}</h4>
                                  <span className="text-sm font-medium text-gray-500">{stats.total} Students Total</span>
                                </div>
                                <span className={`px-3 py-1 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 text-xs font-bold shadow-sm border border-blue-200 dark:border-blue-800`}>
                                   {((stats.total / totalStats.total) * 100).toFixed(0)}% of school
                                </span>
                              </div>
                              <div className="flex w-full h-3 bg-gray-200 rounded-full overflow-hidden mb-3">
                                <div className="bg-cyan-500" style={{ width: `${(stats.male / stats.total) * 100}%` }} />
                                <div className="bg-pink-500" style={{ width: `${(stats.female / stats.total) * 100}%` }} />
                              </div>
                              <div className="flex justify-between text-sm font-medium text-gray-500">
                                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-cyan-500 block"></span> {stats.male} Boys</span>
                                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-pink-500 block"></span> {stats.female} Girls</span>
                              </div>
                            </div>
                           )
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Classes Tab */}
                  {activeTab === 'classes' && (
                    <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                      <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 border-b pb-2">Class Breakdown</h3>
                      <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
                        <table className="w-full text-sm text-left">
                          <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400 font-medium">
                            <tr>
                              <th className="px-4 py-3">Class Name</th>
                              <th className="px-4 py-3 text-center text-cyan-600">Boys</th>
                              <th className="px-4 py-3 text-center text-pink-600">Girls</th>
                              <th className="px-4 py-3 text-right font-bold">Total</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                            {classStats.map(([className, stats]) => (
                              <tr key={className} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                                <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-200">{className}</td>
                                <td className="px-4 py-3 text-center text-gray-600 dark:text-gray-400">{stats.male}</td>
                                <td className="px-4 py-3 text-center text-gray-600 dark:text-gray-400">{stats.female}</td>
                                <td className="px-4 py-3 text-right font-bold text-gray-900 dark:text-white">{stats.total}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Age Tab */}
                  {activeTab === 'age' && (
                    <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                      <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 border-b pb-2">Age Distribution</h3>
                      
                      <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-xl border border-blue-100 dark:border-blue-800 space-y-4">
                         <div className="flex flex-col md:flex-row gap-4 items-end">
                            <div className="flex-1 space-y-2">
                               <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Minimum Age (Years)</label>
                               <input 
                                 type="number" 
                                 value={ageRange.min} 
                                 onChange={(e) => setAgeRange({...ageRange, min: parseInt(e.target.value) || 0})}
                                 className="w-full p-2 rounded-lg border dark:bg-gray-700 dark:border-gray-600"
                               />
                            </div>
                            <div className="flex-1 space-y-2">
                               <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Maximum Age (Years)</label>
                               <input 
                                 type="number" 
                                 value={ageRange.max} 
                                 onChange={(e) => setAgeRange({...ageRange, max: parseInt(e.target.value) || 20})}
                                 className="w-full p-2 rounded-lg border dark:bg-gray-700 dark:border-gray-600"
                               />
                            </div>
                            <div className="flex-1 space-y-2">
                               <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Filter By Class</label>
                               <select 
                                 value={selectedAgeClassId} 
                                 onChange={(e) => setSelectedAgeClassId(e.target.value)}
                                 className="w-full p-2 rounded-lg border dark:bg-gray-700 dark:border-gray-600 outline-none"
                               >
                                 <option value="all">All Classes</option>
                                 {classes.map(c => (
                                   <option key={c.id} value={c.id}>{c.name}</option>
                                 ))}
                               </select>
                            </div>
                            <Button 
                              onClick={calculateAgeStats}
                              className="bg-blue-600 text-white"
                            >
                              Calculate
                            </Button>
                         </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-4">
                         <StatCard 
                            title={`Students Aged ${ageRange.min}-${ageRange.max}`} 
                            value={ageStats.total} 
                            color="bg-purple-50 text-purple-700 border-purple-200" 
                            icon={Baby} 
                            subtext={`${((ageStats.total / totalStats.total) * 100 || 0).toFixed(1)}% of total`}
                         />
                         <StatCard title="Boys in range" value={ageStats.male} color="bg-cyan-50 text-cyan-700 border-cyan-200" icon={Users} />
                         <StatCard title="Girls in range" value={ageStats.female} color="bg-pink-50 text-pink-700 border-pink-200" icon={Users} />
                      </div>

                      {/* Detailed Student List */}
                      {ageStats.studentsList.length > 0 && (
                        <div className="mt-8 border dark:border-gray-700 rounded-xl overflow-hidden bg-white dark:bg-gray-800">
                          <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800/80 border-b dark:border-gray-700 flex justify-between items-center">
                            <h4 className="font-semibold text-gray-800 dark:text-gray-200">
                              Students in this Age Range
                            </h4>
                            <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full font-medium">
                               {ageStats.studentsList.length} Students
                            </span>
                          </div>
                          <div className="max-h-[300px] overflow-y-auto">
                            <table className="w-full text-sm text-left">
                               <thead className="bg-gray-50 dark:bg-gray-900/50 sticky top-0">
                                 <tr>
                                   <th className="px-4 py-2 font-medium text-gray-500 dark:text-gray-400">Name</th>
                                   <th className="px-4 py-2 font-medium text-gray-500 dark:text-gray-400 w-24 text-center">Age</th>
                                   <th className="px-4 py-2 font-medium text-gray-500 dark:text-gray-400 w-24 text-center">Gender</th>
                                   <th className="px-4 py-2 font-medium text-gray-500 dark:text-gray-400 w-32">Class</th>
                                 </tr>
                               </thead>
                               <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                 {ageStats.studentsList.map((student, idx) => (
                                   <tr key={student.id || idx} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                     <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">
                                       {student.first_name} {student.last_name}
                                     </td>
                                     <td className="px-4 py-3 text-center text-purple-600 dark:text-purple-400 font-medium">
                                       {student.calculated_age}
                                     </td>
                                     <td className="px-4 py-3 text-center text-gray-500 dark:text-gray-400">
                                       {student.gender}
                                     </td>
                                     <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                                       {student.classes?.name || 'Unassigned'}
                                     </td>
                                   </tr>
                                 ))}
                               </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                </div>
              )}
            </div>
        </div>
      </div>
    </div>
  )
}

function StatCard({ title, value, color, icon: Icon, subtext }: any) {
  return (
    <div className={`p-4 rounded-xl border ${color} flex flex-col justify-between h-24 sm:h-32 transition-transform hover:scale-105 duration-200`}>
       <div className="flex justify-between items-start">
         <h4 className="font-semibold text-sm opacity-80">{title}</h4>
         <Icon className="w-5 h-5 opacity-60" />
       </div>
       <div>
         <span className="text-3xl font-bold">{value}</span>
         {subtext && <p className="text-xs opacity-70 mt-1">{subtext}</p>}
       </div>
    </div>
  )
}
