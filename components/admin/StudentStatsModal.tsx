'use client'

import { useState, useEffect, useMemo } from 'react'
import { 
  X, 
  Users, 
  Baby, 
  Calendar,
  ChevronRight, 
  Loader2, 
  BarChart2, 
  PieChart as PieIcon, 
  Filter,
  GraduationCap
} from 'lucide-react'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'
import { 
  PieChart, 
  Pie, 
  Cell, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts'
import { differenceInYears } from 'date-fns'
import { Button } from '@/components/ui/button'

interface StudentStatsModalProps {
  isOpen: boolean
  onClose: () => void
  classIds?: string[]
}

const TABS = [
  { id: 'overview', label: 'Overview', icon: PieIcon },
  { id: 'levels', label: 'Levels', icon: BarChart2 },
  { id: 'classes', label: 'Classes', icon: GraduationCap },
  { id: 'age', label: 'Age Group', icon: Baby },
] as const

type TabType = typeof TABS[number]['id']

export function StudentStatsModal({ isOpen, onClose, classIds }: StudentStatsModalProps) {
  const [loading, setLoading] = useState(true)
  const [students, setStudents] = useState<any[]>([])
  const [classes, setClasses] = useState<any[]>([])
  const [activeTab, setActiveTab] = useState<TabType>('overview')
  
  // Age Filter State
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

  // --- Demographic Aggregations ---

  const totalStats = useMemo(() => {
    const male = students.filter(s => s.gender === 'Male').length
    const female = students.filter(s => s.gender === 'Female').length
    return { male, female, total: students.length }
  }, [students])

  const levelStats = useMemo(() => {
    const groups = {
      KG: { male: 0, female: 0, total: 0 },
      'Lower Primary': { male: 0, female: 0, total: 0 },
      'Upper Primary': { male: 0, female: 0, total: 0 },
      JHS: { male: 0, female: 0, total: 0 },
      Other: { male: 0, female: 0, total: 0 }
    }

    students.forEach(s => {
      const clsName = s.classes?.name || ''
      let category: keyof typeof groups = 'Other'

      if (clsName.includes('KG') || clsName.includes('Kindergarten')) category = 'KG'
      else if (clsName.match(/Basic [1-3]|Class [1-3]|P[1-3]/i)) category = 'Lower Primary'
      else if (clsName.match(/Basic [4-6]|Class [4-6]|P[4-6]/i)) category = 'Upper Primary'
      else if (clsName.match(/JHS|Junior High|Basic [7-9]|BS [7-9]/i)) category = 'JHS' 
      
      if (category === 'Other' && (clsName.includes('JHS') || clsName.includes('Basic 7') || clsName.includes('Basic 8') || clsName.includes('Basic 9'))) {
        category = 'JHS'
      }

      if (s.gender === 'Male') groups[category].male++
      else if (s.gender === 'Female') groups[category].female++
      
      groups[category].total++
    })

    return groups
  }, [students])

  const classStats = useMemo(() => {
    const stats: Record<string, { male: number, female: number, total: number, id: string }> = {}

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

      if (selectedAgeClassId !== 'all' && s.classes?.id !== selectedAgeClassId) {
        return
      }

      const age = differenceInYears(today, new Date(s.date_of_birth))
      
      if (age >= ageRange.min && age <= ageRange.max) {
        if (s.gender === 'Male') male++
        else if (s.gender === 'Female') female++
        
        studentsInRange.push({
          ...s,
          calculated_age: age
        })
      }
    })

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
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-2.5 sm:p-4 md:p-6 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        className="bg-white dark:bg-slate-800 rounded-2xl sm:rounded-3xl w-full max-w-4xl max-h-[92vh] sm:max-h-[88vh] overflow-hidden flex flex-col shadow-2xl border border-slate-200/80 dark:border-slate-700"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Modal Header */}
        <div className="px-4 py-3.5 sm:px-6 sm:py-4 border-b border-slate-100 dark:border-slate-700/80 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#003B5C]/10 text-[#003B5C] dark:bg-blue-500/20 dark:text-blue-300 flex items-center justify-center shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight truncate">
                Learner Demographics
              </h2>
              <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 truncate">
                Population distribution across cohorts, educational levels, and age groups
              </p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose} 
            className="p-1.5 sm:p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body Container */}
        <div className="flex-1 overflow-hidden flex flex-col md:flex-row min-h-0">
          
          {/* Navigation: Horizontal Scroll on Mobile/Tablet, Vertical Sidebar on Desktop */}
          <nav className="flex md:flex-col overflow-x-auto md:overflow-x-visible no-scrollbar gap-1.5 p-2 sm:p-3 md:p-4 md:w-56 bg-slate-50/70 dark:bg-slate-900/40 border-b md:border-b-0 md:border-r border-slate-200/80 dark:border-slate-700/80 shrink-0 select-none">
            {TABS.map((tab) => {
              const Icon = tab.icon
              const isActive = activeTab === tab.id

              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-3 py-2 sm:px-3.5 sm:py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all duration-150 flex items-center justify-between whitespace-nowrap md:whitespace-normal shrink-0 md:w-full active:scale-95 ${
                    isActive 
                      ? 'bg-[#003B5C] text-white shadow-xs dark:bg-blue-600' 
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{tab.label}</span>
                  </div>
                  {isActive && <ChevronRight className="w-3.5 h-3.5 hidden md:block shrink-0" />}
                </button>
              )
            })}
          </nav>

          {/* Active Tab Content Area */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 bg-white dark:bg-slate-800">
            {loading ? (
              <div className="h-64 flex flex-col items-center justify-center text-slate-400">
                <Loader2 className="w-7 h-7 animate-spin mb-3 text-[#003B5C] dark:text-blue-400" />
                <p className="text-xs sm:text-sm font-medium">Loading demographic data...</p>
              </div>
            ) : (
              <div className="space-y-6 sm:space-y-8">
                
                {/* 1. OVERVIEW TAB */}
                {activeTab === 'overview' && (
                  <div className="space-y-5 sm:space-y-6 animate-in fade-in-50 duration-200">
                    
                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                      <StatMetricCard 
                        title="Total Learners" 
                        value={totalStats.total} 
                        subtext="Active enrolment" 
                        color="blue"
                      />
                      <StatMetricCard 
                        title="Boys (Male)" 
                        value={totalStats.male} 
                        subtext={`${totalStats.total > 0 ? ((totalStats.male / totalStats.total) * 100).toFixed(1) : 0}% of student body`} 
                        color="cyan"
                      />
                      <StatMetricCard 
                        title="Girls (Female)" 
                        value={totalStats.female} 
                        subtext={`${totalStats.total > 0 ? ((totalStats.female / totalStats.total) * 100).toFixed(1) : 0}% of student body`} 
                        color="pink"
                      />
                    </div>

                    {/* Donut Chart & Progress Bars Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                      
                      {/* Gender Donut Chart */}
                      <div className="bg-slate-50/50 dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-700/80 p-4 sm:p-5 rounded-2xl">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3 text-center sm:text-left">
                          Gender Ratio Representation
                        </h3>
                        <div className="h-52 sm:h-60 w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={[
                                  { name: 'Boys', value: totalStats.male },
                                  { name: 'Girls', value: totalStats.female }
                                ]}
                                cx="50%"
                                cy="50%"
                                innerRadius={55}
                                outerRadius={85}
                                paddingAngle={4}
                                dataKey="value"
                              >
                                <Cell fill="#0284c7" />
                                <Cell fill="#db2777" />
                              </Pie>
                              <RechartsTooltip 
                                formatter={(val, name) => [`${val} Learners`, name]}
                                contentStyle={{ 
                                  borderRadius: '12px', 
                                  border: '1px solid #e2e8f0', 
                                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                                  fontSize: '12px' 
                                }}
                              />
                              <Legend verticalAlign="bottom" height={32} wrapperStyle={{ fontSize: '12px' }} />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                      </div>

                      {/* Percentage Share Bars */}
                      <div className="bg-slate-50/50 dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-700/80 p-4 sm:p-6 rounded-2xl flex flex-col justify-center space-y-5">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                          Enrolment Share Breakdown
                        </h3>

                        <div className="space-y-4">
                          <div className="space-y-1.5">
                            <div className="flex justify-between text-xs font-semibold">
                              <span className="text-sky-700 dark:text-sky-400 flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-sky-600 inline-block" />
                                Boys
                              </span>
                              <span className="font-mono text-slate-900 dark:text-white font-bold">
                                {totalStats.male} ({totalStats.total > 0 ? ((totalStats.male / totalStats.total) * 100).toFixed(1) : 0}%)
                              </span>
                            </div>
                            <div className="h-3 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                              <div 
                                className="bg-sky-600 h-full rounded-full transition-all duration-500" 
                                style={{ width: `${totalStats.total > 0 ? (totalStats.male / totalStats.total) * 100 : 0}%` }}
                              />
                            </div>
                          </div>

                          <div className="space-y-1.5">
                            <div className="flex justify-between text-xs font-semibold">
                              <span className="text-pink-700 dark:text-pink-400 flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-pink-600 inline-block" />
                                Girls
                              </span>
                              <span className="font-mono text-slate-900 dark:text-white font-bold">
                                {totalStats.female} ({totalStats.total > 0 ? ((totalStats.female / totalStats.total) * 100).toFixed(1) : 0}%)
                              </span>
                            </div>
                            <div className="h-3 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                              <div 
                                className="bg-pink-600 h-full rounded-full transition-all duration-500" 
                                style={{ width: `${totalStats.total > 0 ? (totalStats.female / totalStats.total) * 100 : 0}%` }}
                              />
                            </div>
                          </div>
                        </div>

                      </div>

                    </div>

                  </div>
                )}

                {/* 2. LEVELS TAB */}
                {activeTab === 'levels' && (
                  <div className="space-y-5 sm:space-y-6 animate-in fade-in-50 duration-200">
                    
                    {/* Level Bar Chart */}
                    <div className="bg-slate-50/50 dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-700/80 p-4 sm:p-5 rounded-2xl">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3 text-center sm:text-left">
                        Learners by Curriculum Level
                      </h3>
                      <div className="h-60 sm:h-72 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={Object.entries(levelStats).map(([name, stats]) => ({
                              name,
                              boys: stats.male,
                              girls: stats.female,
                              total: stats.total
                            })).filter(d => d.total > 0)}
                            margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.6} />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                            <RechartsTooltip 
                              cursor={{ fill: 'rgba(0,0,0,0.03)' }}
                              contentStyle={{ 
                                borderRadius: '12px', 
                                border: '1px solid #e2e8f0', 
                                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                                fontSize: '12px' 
                              }}
                            />
                            <Legend wrapperStyle={{ paddingTop: '10px', fontSize: '12px' }} />
                            <Bar dataKey="boys" name="Boys" stackId="a" fill="#0284c7" radius={[0, 0, 4, 4]} maxBarSize={48} />
                            <Bar dataKey="girls" name="Girls" stackId="a" fill="#db2777" radius={[4, 4, 0, 0]} maxBarSize={48} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Level Cards Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                      {Object.entries(levelStats).map(([level, stats]) => {
                        if (stats.total === 0) return null
                        const share = totalStats.total > 0 ? ((stats.total / totalStats.total) * 100).toFixed(0) : '0'

                        return (
                          <div 
                            key={level} 
                            className="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 bg-white dark:bg-slate-800/80 shadow-2xs space-y-2.5"
                          >
                            <div className="flex justify-between items-start">
                              <div>
                                <h4 className="font-bold text-slate-900 dark:text-white text-sm sm:text-base">
                                  {level}
                                </h4>
                                <span className="text-xs text-slate-400 font-mono">
                                  {stats.total} Learners Enrolled
                                </span>
                              </div>
                              <span className="px-2.5 py-0.5 rounded-md bg-[#003B5C]/10 text-[#003B5C] dark:bg-blue-500/20 dark:text-blue-300 text-[10px] font-bold font-mono">
                                {share}% of school
                              </span>
                            </div>

                            <div className="flex w-full h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                              <div className="bg-sky-600" style={{ width: `${(stats.male / stats.total) * 100}%` }} />
                              <div className="bg-pink-600" style={{ width: `${(stats.female / stats.total) * 100}%` }} />
                            </div>

                            <div className="flex justify-between text-xs font-semibold text-slate-600 dark:text-slate-300 pt-0.5">
                              <span className="text-sky-700 dark:text-sky-400 font-mono">{stats.male} Boys</span>
                              <span className="text-pink-700 dark:text-pink-400 font-mono">{stats.female} Girls</span>
                            </div>
                          </div>
                        )
                      })}
                    </div>

                  </div>
                )}

                {/* 3. CLASSES TAB */}
                {activeTab === 'classes' && (
                  <div className="space-y-4 animate-in fade-in-50 duration-200">
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-2">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        Class Cohort Enrolment Matrix
                      </h3>
                      <span className="text-xs font-mono font-bold text-slate-400">
                        {classStats.length} Classes Registered
                      </span>
                    </div>

                    <div className="overflow-x-auto rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-2xs">
                      <table className="w-full text-xs sm:text-sm text-left">
                        <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-500 dark:text-slate-400 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200/80 dark:border-slate-700">
                          <tr>
                            <th className="px-4 py-3">Class Cohort</th>
                            <th className="px-4 py-3 text-center text-sky-600 dark:text-sky-400 font-mono">Boys</th>
                            <th className="px-4 py-3 text-center text-pink-600 dark:text-pink-400 font-mono">Girls</th>
                            <th className="px-4 py-3 text-right font-mono text-slate-900 dark:text-white">Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-750">
                          {classStats.map(([className, stats]) => (
                            <tr key={className} className="hover:bg-slate-50/70 dark:hover:bg-slate-700/30 transition-colors">
                              <td className="px-4 py-2.5 sm:py-3 font-bold text-slate-800 dark:text-slate-200">
                                {className}
                              </td>
                              <td className="px-4 py-2.5 sm:py-3 text-center font-mono font-medium text-slate-600 dark:text-slate-300">
                                {stats.male}
                              </td>
                              <td className="px-4 py-2.5 sm:py-3 text-center font-mono font-medium text-slate-600 dark:text-slate-300">
                                {stats.female}
                              </td>
                              <td className="px-4 py-2.5 sm:py-3 text-right font-mono font-bold text-[#003B5C] dark:text-blue-400">
                                {stats.total}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* 4. AGE GROUP TAB */}
                {activeTab === 'age' && (
                  <div className="space-y-5 sm:space-y-6 animate-in fade-in-50 duration-200">
                    
                    {/* Age Calculation Filter Box */}
                    <div className="bg-slate-50/70 dark:bg-slate-900/50 p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 space-y-4">
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">
                        <Filter className="w-3.5 h-3.5 text-amber-500" />
                        <span>Filter by Age Range &amp; Class</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end">
                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase">
                            Min Age (Years)
                          </label>
                          <input 
                            type="number" 
                            min="0"
                            max="30"
                            value={ageRange.min} 
                            onChange={(e) => setAgeRange({ ...ageRange, min: parseInt(e.target.value) || 0 })}
                            className="w-full px-3 py-2 text-xs sm:text-sm font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-[#003B5C]"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase">
                            Max Age (Years)
                          </label>
                          <input 
                            type="number" 
                            min="0"
                            max="30"
                            value={ageRange.max} 
                            onChange={(e) => setAgeRange({ ...ageRange, max: parseInt(e.target.value) || 20 })}
                            className="w-full px-3 py-2 text-xs sm:text-sm font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-[#003B5C]"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase">
                            Target Class
                          </label>
                          <select 
                            value={selectedAgeClassId} 
                            onChange={(e) => setSelectedAgeClassId(e.target.value)}
                            className="w-full px-3 py-2 text-xs sm:text-sm font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-[#003B5C] cursor-pointer"
                          >
                            <option value="all">All Cohorts</option>
                            {classes.map(c => (
                              <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                          </select>
                        </div>

                        <Button 
                          type="button"
                          onClick={calculateAgeStats}
                          className="w-full bg-[#003B5C] hover:bg-[#002a42] text-white font-bold text-xs h-9 sm:h-10 rounded-xl transition active:scale-95 shadow-xs"
                        >
                          Calculate Range
                        </Button>
                      </div>
                    </div>

                    {/* Filtered Age Metric Strip */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                      <StatMetricCard 
                        title={`Aged ${ageRange.min}-${ageRange.max} Yrs`} 
                        value={ageStats.total} 
                        subtext={`${((ageStats.total / totalStats.total) * 100 || 0).toFixed(1)}% of student body`} 
                        color="purple"
                      />
                      <StatMetricCard 
                        title="Boys in Range" 
                        value={ageStats.male} 
                        subtext={`${ageStats.total > 0 ? ((ageStats.male / ageStats.total) * 100).toFixed(0) : 0}% of cohort subset`} 
                        color="cyan"
                      />
                      <StatMetricCard 
                        title="Girls in Range" 
                        value={ageStats.female} 
                        subtext={`${ageStats.total > 0 ? ((ageStats.female / ageStats.total) * 100).toFixed(0) : 0}% of cohort subset`} 
                        color="pink"
                      />
                    </div>

                    {/* Filtered Student Roster */}
                    {ageStats.studentsList.length > 0 ? (
                      <div className="border border-slate-200/80 dark:border-slate-700/80 rounded-2xl overflow-hidden shadow-2xs">
                        <div className="px-4 py-3 bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200/80 dark:border-slate-700 flex justify-between items-center">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                            Learner Register ({ageStats.studentsList.length})
                          </h4>
                          <span className="text-[10px] bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded-full font-bold font-mono">
                            {ageRange.min} - {ageRange.max} Years
                          </span>
                        </div>

                        <div className="max-h-64 sm:max-h-72 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-750">
                          <table className="w-full text-xs sm:text-sm text-left">
                            <thead className="bg-slate-50/50 dark:bg-slate-800 text-slate-400 text-[10px] uppercase font-bold sticky top-0">
                              <tr>
                                <th className="px-4 py-2">Learner Name</th>
                                <th className="px-4 py-2 text-center w-20">Age</th>
                                <th className="px-4 py-2 text-center w-20">Gender</th>
                                <th className="px-4 py-2 text-right w-28">Class</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-750">
                              {ageStats.studentsList.map((student, idx) => (
                                <tr key={student.id || idx} className="hover:bg-slate-50/70 dark:hover:bg-slate-700/30 transition-colors">
                                  <td className="px-4 py-2 sm:py-2.5 font-bold text-slate-800 dark:text-slate-200">
                                    {student.first_name} {student.last_name}
                                  </td>
                                  <td className="px-4 py-2 sm:py-2.5 text-center font-mono font-bold text-purple-600 dark:text-purple-400">
                                    {student.calculated_age}
                                  </td>
                                  <td className="px-4 py-2 sm:py-2.5 text-center text-slate-500 dark:text-slate-400">
                                    {student.gender}
                                  </td>
                                  <td className="px-4 py-2 sm:py-2.5 text-right font-medium text-slate-600 dark:text-slate-300">
                                    {student.classes?.name || 'Unassigned'}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ) : (
                      <div className="p-8 text-center text-xs text-slate-400 italic">
                        No students found matching this age range and class filter.
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

interface StatMetricCardProps {
  title: string
  value: number
  subtext?: string
  color: 'blue' | 'cyan' | 'pink' | 'purple'
}

function StatMetricCard({ title, value, subtext, color }: StatMetricCardProps) {
  const colorMap = {
    blue: {
      bg: 'bg-blue-50/50 dark:bg-blue-950/20',
      border: 'border-blue-200/80 dark:border-blue-900/40',
      text: 'text-[#003B5C] dark:text-blue-300'
    },
    cyan: {
      bg: 'bg-sky-50/50 dark:bg-sky-950/20',
      border: 'border-sky-200/80 dark:border-sky-900/40',
      text: 'text-sky-700 dark:text-sky-300'
    },
    pink: {
      bg: 'bg-pink-50/50 dark:bg-pink-950/20',
      border: 'border-pink-200/80 dark:border-pink-900/40',
      text: 'text-pink-700 dark:text-pink-300'
    },
    purple: {
      bg: 'bg-purple-50/50 dark:bg-purple-950/20',
      border: 'border-purple-200/80 dark:border-purple-900/40',
      text: 'text-purple-700 dark:text-purple-300'
    }
  }[color]

  return (
    <div className={`p-4 rounded-2xl border ${colorMap.border} ${colorMap.bg} flex flex-col justify-between min-h-[90px] shadow-2xs`}>
      <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 truncate">
        {title}
      </span>
      <div className="space-y-0.5 pt-1">
        <div className={`text-2xl sm:text-3xl font-black font-mono tracking-tight ${colorMap.text}`}>
          {value}
        </div>
        {subtext && (
          <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate font-medium">
            {subtext}
          </p>
        )}
      </div>
    </div>
  )
}