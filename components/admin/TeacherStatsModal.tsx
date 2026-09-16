'use client'

import { useState, useEffect, useMemo } from 'react'
import { 
  X, 
  Loader2, 
  GraduationCap, 
  ChevronRight, 
  Users, 
  Layers, 
  PieChart as PieIcon,
  BarChart2,
  AlertCircle
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

interface TeacherStatsModalProps {
  isOpen: boolean
  onClose: () => void
}

const TABS = [
  { id: 'overview', label: 'Overview', icon: PieIcon },
  { id: 'levels', label: 'Level Breakdown', icon: BarChart2 },
] as const

type TabType = typeof TABS[number]['id']

export function TeacherStatsModal({ isOpen, onClose }: TeacherStatsModalProps) {
  const [loading, setLoading] = useState(true)
  const [teachers, setTeachers] = useState<any[]>([])
  const [activeTab, setActiveTab] = useState<TabType>('overview')

  const supabase = getSupabaseBrowserClient()

  useEffect(() => {
    if (isOpen) {
      fetchData()
    }
  }, [isOpen])

  const fetchData = async () => {
    setLoading(true)
    try {
      // 1. Fetch Teachers basic profile and credentials
      const { data: teachersData, error: teacherError } = await supabase
        .from('teachers')
        .select('id, status, gender, teacher_id, first_name, last_name, specialization')
        .eq('status', 'active')

      if (teacherError) throw teacherError

      // 2. Fetch class assignments to categorize deployment
      const teacherIds = teachersData?.map((t: any) => t.id) || []
      const assignmentsMap: Record<string, string[]> = {}

      if (teacherIds.length > 0) {
        const { data: assignments, error: assignError } = await supabase
          .from('teacher_class_assignments')
          .select(`
            teacher_id,
            classes (name)
          `)
          .in('teacher_id', teacherIds)

        if (!assignError && assignments) {
          assignments.forEach((a: any) => {
            if (a.classes?.name) {
              if (!assignmentsMap[a.teacher_id]) {
                assignmentsMap[a.teacher_id] = []
              }
              assignmentsMap[a.teacher_id].push(a.classes.name)
            }
          })
        }
      }

      // Merge data and resolve primary level placement
      const mergedTeachers = teachersData?.map((t: any) => {
        const assignedClasses = assignmentsMap[t.id] || []
        const primaryClass = assignedClasses[0] || ''

        return {
          ...t,
          className: primaryClass,
          assignedClasses,
          gender: t.gender || 'Unknown'
        }
      }) || []

      setTeachers(mergedTeachers)
    } catch (error) {
      console.error('Error fetching teacher stats:', error)
      setTeachers([])
    } finally {
      setLoading(false)
    }
  }

  const stats = useMemo(() => {
    const total = teachers.length
    const male = teachers.filter(t => t.gender === 'Male').length
    const female = teachers.filter(t => t.gender === 'Female').length

    const levels: Record<string, { male: number; female: number; total: number }> = {
      'Kindergarten': { male: 0, female: 0, total: 0 },
      'Lower Primary': { male: 0, female: 0, total: 0 },
      'Upper Primary': { male: 0, female: 0, total: 0 },
      'Junior High (JHS)': { male: 0, female: 0, total: 0 },
      'Unassigned': { male: 0, female: 0, total: 0 },
      'Other': { male: 0, female: 0, total: 0 }
    }

    teachers.forEach(t => {
      const clsName = t.className || ''
      let category = 'Other'

      if (!clsName) {
        category = 'Unassigned'
      } else if (clsName.match(/KG|Kindergarten/i)) {
        category = 'Kindergarten'
      } else if (clsName.match(/Basic [1-3]|Class [1-3]|P[1-3]/i)) {
        category = 'Lower Primary'
      } else if (clsName.match(/Basic [4-6]|Class [4-6]|P[4-6]/i)) {
        category = 'Upper Primary'
      } else if (clsName.match(/JHS|Junior High|Basic [7-9]/i)) {
        category = 'Junior High (JHS)'
      }

      if (t.gender === 'Male') levels[category].male++
      else if (t.gender === 'Female') levels[category].female++

      levels[category].total++
    })

    return { total, male, female, levels }
  }, [teachers])

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
              <GraduationCap className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight truncate">
                Faculty &amp; Staff Demographics
              </h2>
              <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 truncate">
                Staff distribution by gender and school division deployment
              </p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose} 
            className="p-1.5 sm:p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors shrink-0"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Layout Body */}
        <div className="flex-1 overflow-hidden flex flex-col md:flex-row min-h-0">
          
          {/* Navigation Tab Strip */}
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

          {/* Active Tab View */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 bg-white dark:bg-slate-800">
            {loading ? (
              <div className="h-64 flex flex-col items-center justify-center text-slate-400">
                <Loader2 className="w-7 h-7 animate-spin mb-3 text-[#003B5C] dark:text-blue-400" />
                <p className="text-xs sm:text-sm font-bold tracking-wide">Loading staff demographic data...</p>
              </div>
            ) : (
              <div className="space-y-6 sm:space-y-8">
                
                {/* TAB 1: OVERVIEW */}
                {activeTab === 'overview' && (
                  <div className="space-y-5 sm:space-y-6 animate-in fade-in-50 duration-200">
                    
                    {/* Primary Metric KPI Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                      <StatMetricCard 
                        title="Active Faculty" 
                        value={stats.total} 
                        subtext="Assigned teaching staff" 
                        color="blue"
                      />
                      <StatMetricCard 
                        title="Male Instructors" 
                        value={stats.male} 
                        subtext={`${stats.total > 0 ? ((stats.male / stats.total) * 100).toFixed(1) : 0}% of faculty`} 
                        color="cyan"
                      />
                      <StatMetricCard 
                        title="Female Instructors" 
                        value={stats.female} 
                        subtext={`${stats.total > 0 ? ((stats.female / stats.total) * 100).toFixed(1) : 0}% of faculty`} 
                        color="pink"
                      />
                    </div>

                    {/* Visual Distribution Chart & Progress Breakdown */}
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
                                  { name: 'Male Teachers', value: stats.male },
                                  { name: 'Female Teachers', value: stats.female }
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
                                formatter={(val, name) => [`${val} Teachers`, name]}
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

                      {/* Staff Ratio Progress Visuals */}
                      <div className="bg-slate-50/50 dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-700/80 p-4 sm:p-6 rounded-2xl flex flex-col justify-center space-y-5">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                          Faculty Gender Balance
                        </h3>

                        <div className="space-y-4">
                          <div className="space-y-1.5">
                            <div className="flex justify-between text-xs font-semibold">
                              <span className="text-sky-700 dark:text-sky-400 flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-sky-600 inline-block" />
                                Male Staff
                              </span>
                              <span className="font-mono text-slate-900 dark:text-white font-bold">
                                {stats.male} ({stats.total > 0 ? ((stats.male / stats.total) * 100).toFixed(1) : 0}%)
                              </span>
                            </div>
                            <div className="h-3 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                              <div 
                                className="bg-sky-600 h-full rounded-full transition-all duration-500" 
                                style={{ width: `${stats.total > 0 ? (stats.male / stats.total) * 100 : 0}%` }}
                              />
                            </div>
                          </div>

                          <div className="space-y-1.5">
                            <div className="flex justify-between text-xs font-semibold">
                              <span className="text-pink-700 dark:text-pink-400 flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-pink-600 inline-block" />
                                Female Staff
                              </span>
                              <span className="font-mono text-slate-900 dark:text-white font-bold">
                                {stats.female} ({stats.total > 0 ? ((stats.female / stats.total) * 100).toFixed(1) : 0}%)
                              </span>
                            </div>
                            <div className="h-3 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                              <div 
                                className="bg-pink-600 h-full rounded-full transition-all duration-500" 
                                style={{ width: `${stats.total > 0 ? (stats.female / stats.total) * 100 : 0}%` }}
                              />
                            </div>
                          </div>
                        </div>

                      </div>

                    </div>

                  </div>
                )}

                {/* TAB 2: LEVEL BREAKDOWN */}
                {activeTab === 'levels' && (
                  <div className="space-y-5 sm:space-y-6 animate-in fade-in-50 duration-200">
                    
                    {/* Faculty Level Deployment Bar Chart */}
                    <div className="bg-slate-50/50 dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-700/80 p-4 sm:p-5 rounded-2xl">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3 text-center sm:text-left">
                        Faculty Allocation Across Divisions
                      </h3>
                      <div className="h-60 sm:h-72 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={Object.entries(stats.levels).map(([name, data]) => ({
                              name,
                              male: data.male,
                              female: data.female,
                              total: data.total
                            })).filter(d => d.total > 0)}
                            margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.6} />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                            <YAxis axisLine={false} tickLine={false} allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }} />
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
                            <Bar dataKey="male" name="Male Staff" stackId="a" fill="#0284c7" radius={[0, 0, 4, 4]} maxBarSize={48} />
                            <Bar dataKey="female" name="Female Staff" stackId="a" fill="#db2777" radius={[4, 4, 0, 0]} maxBarSize={48} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Level Cards Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                      {Object.entries(stats.levels).map(([level, data]) => {
                        if (data.total === 0 && level === 'Other') return null
                        const share = stats.total > 0 ? ((data.total / stats.total) * 100).toFixed(0) : '0'

                        return (
                          <div 
                            key={level} 
                            className="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 bg-white dark:bg-slate-800/80 shadow-2xs space-y-2.5"
                          >
                            <div className="flex justify-between items-start">
                              <div className="min-w-0">
                                <h4 className="font-bold text-slate-900 dark:text-white text-sm sm:text-base truncate">
                                  {level}
                                </h4>
                                <span className="text-xs text-slate-400 font-mono">
                                  {data.total} Teachers Deployed
                                </span>
                              </div>
                              <span className="px-2.5 py-0.5 rounded-md bg-[#003B5C]/10 text-[#003B5C] dark:bg-blue-500/20 dark:text-blue-300 text-[10px] font-bold font-mono shrink-0">
                                {share}% of faculty
                              </span>
                            </div>

                            <div className="flex w-full h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                              <div className="bg-sky-600" style={{ width: `${data.total ? (data.male / data.total) * 100 : 0}%` }} />
                              <div className="bg-pink-600" style={{ width: `${data.total ? (data.female / data.total) * 100 : 0}%` }} />
                            </div>

                            <div className="flex justify-between text-xs font-semibold text-slate-600 dark:text-slate-300 pt-0.5">
                              <span className="text-sky-700 dark:text-sky-400 font-mono">{data.male} Male</span>
                              <span className="text-pink-700 dark:text-pink-400 font-mono">{data.female} Female</span>
                            </div>
                          </div>
                        )
                      })}
                    </div>

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
  color: 'blue' | 'cyan' | 'pink'
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