'use client'

import { useState, useEffect, useMemo } from 'react'
import { X, Loader2, GraduationCap, ChevronRight, Users, Sparkles, School } from 'lucide-react'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'

interface TeacherStatsModalProps {
  isOpen: boolean
  onClose: () => void
}

export function TeacherStatsModal({ isOpen, onClose }: TeacherStatsModalProps) {
  const [loading, setLoading] = useState(true)
  const [teachers, setTeachers] = useState<any[]>([])
  const [activeTab, setActiveTab] = useState<'overview' | 'models'>('overview')

  const supabase = getSupabaseBrowserClient()

  useEffect(() => {
    if (isOpen) {
      fetchData()
    }
  }, [isOpen])

  const fetchData = async () => {
    setLoading(true)
    try {
      // 1. Fetch Teachers basic info
      const { data: teachersData, error: teacherError } = await supabase
        .from('teachers')
        .select(`id, status, gender, teacher_id`)

      if (teacherError) throw teacherError

      // 2. Fetch Assignments manually
      const teacherIds = teachersData?.map((t: any) => t.id) || []
      let assignmentsMap: Record<string, string> = {}

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
              assignmentsMap[a.teacher_id] = a.classes.name
            }
          })
        }
      }

      // Merge data and normalize gender
      const mergedTeachers = teachersData?.map((t: any) => ({
        ...t,
        className: assignmentsMap[t.id] || '',
        gender: t.gender || 'Unknown'
      })) || []

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

    const levels = {
      KG: { male: 0, female: 0, total: 0 },
      'Lower Primary': { male: 0, female: 0, total: 0 },
      'Upper Primary': { male: 0, female: 0, total: 0 },
      JHS: { male: 0, female: 0, total: 0 },
      'Unassigned Teachers': { male: 0, female: 0, total: 0 },
      Other: { male: 0, female: 0, total: 0 }
    }

    teachers.forEach(t => {
      const clsName = t.className || ''
      let category = 'Other'

      if (clsName) {
        if (clsName.includes('KG') || clsName.includes('Kindergarten')) category = 'KG'
        else if (clsName.match(/Basic [1-3]|Class [1-3]|P[1-3]/i)) category = 'Lower Primary'
        else if (clsName.match(/Basic [4-6]|Class [4-6]|P[4-6]/i)) category = 'Upper Primary'
        else if (clsName.match(/JHS|Junior High|Basic [7-9]/i)) category = 'JHS'
      } else {
        category = 'Unassigned Teachers'
      }

      const gender = t.gender

      if (gender === 'Male') levels[category as keyof typeof levels].male++
      else if (gender === 'Female') levels[category as keyof typeof levels].female++

      levels[category as keyof typeof levels].total++
    })

    return { total, male, female, levels }
  }, [teachers])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 md:p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white dark:bg-gray-800 rounded-t-3xl sm:rounded-3xl w-full max-w-4xl max-h-[92vh] sm:max-h-[88vh] overflow-hidden flex flex-col shadow-2xl border-t sm:border border-gray-100 dark:border-gray-700">
        
        {/* Modal Header */}
        <div className="p-4 sm:p-5 md:p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50/80 dark:bg-gray-900/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 sm:p-2.5 rounded-xl bg-[#003B5C]/10 dark:bg-[#003B5C]/30 text-[#003B5C] dark:text-blue-400 shrink-0">
              <GraduationCap className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <h2 className="text-base sm:text-xl md:text-2xl font-black text-gray-900 dark:text-white tracking-tight">
                Staff Demographics
              </h2>
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 font-medium mt-0.5">
                Teacher distribution by gender and school level
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-200/80 dark:hover:bg-gray-700 rounded-full transition-colors text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mobile Sub-Navigation Bar (< md) */}
        <div className="md:hidden p-3 border-b border-gray-100 dark:border-gray-700 bg-gray-50/60 dark:bg-gray-900/40 shrink-0">
          <div className="grid grid-cols-2 p-1 bg-gray-200/60 dark:bg-gray-800 rounded-xl gap-1">
            <button
              onClick={() => setActiveTab('overview')}
              className={`py-2 text-xs font-bold rounded-lg transition-all text-center ${
                activeTab === 'overview'
                  ? 'bg-[#003B5C] text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('models')}
              className={`py-2 text-xs font-bold rounded-lg transition-all text-center ${
                activeTab === 'models'
                  ? 'bg-[#003B5C] text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              Level Breakdown
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
          
          {/* Tablet & Desktop Sidebar (≥ md) */}
          <div className="hidden md:flex md:w-56 lg:w-60 bg-gray-50/70 dark:bg-gray-900/30 border-r border-gray-100 dark:border-gray-700 p-4 flex-col space-y-1.5 shrink-0">
            <button
              onClick={() => setActiveTab('overview')}
              className={`w-full text-left px-4 py-3 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-between ${
                activeTab === 'overview'
                  ? 'bg-[#003B5C] text-white shadow-md'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              <span>Overview</span>
              {activeTab === 'overview' && <ChevronRight className="w-4 h-4" />}
            </button>
            <button
              onClick={() => setActiveTab('models')}
              className={`w-full text-left px-4 py-3 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-between ${
                activeTab === 'models'
                  ? 'bg-[#003B5C] text-white shadow-md'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              <span>Level Breakdown</span>
              {activeTab === 'models' && <ChevronRight className="w-4 h-4" />}
            </button>
          </div>

          {/* Main Scrollable View */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 bg-white dark:bg-gray-800">
            {loading ? (
              <div className="h-48 sm:h-64 flex flex-col items-center justify-center text-gray-400 space-y-3">
                <Loader2 className="w-7 h-7 sm:w-8 sm:h-8 animate-spin text-[#003B5C]" />
                <p className="text-xs sm:text-sm font-bold tracking-wide">Loading staff data...</p>
              </div>
            ) : (
              <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-200">
                
                {/* Tab 1: Overview */}
                {activeTab === 'overview' && (
                  <div className="space-y-6">
                    <h3 className="text-sm sm:text-base font-black text-gray-900 dark:text-gray-100 uppercase tracking-wider border-b border-gray-100 dark:border-gray-700 pb-2.5">
                      Staff Overview
                    </h3>

                    {/* Stat Cards: 1-col on mobile, 3-col on tablet/desktop */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 md:gap-5">
                      <StatCard
                        title="Total Staff"
                        value={stats.total}
                        color="bg-blue-50/70 dark:bg-blue-900/20 text-[#003B5C] dark:text-blue-300 border-blue-200/70 dark:border-blue-800"
                        icon={GraduationCap}
                      />
                      <StatCard
                        title="Male Staff"
                        value={stats.male}
                        color="bg-cyan-50/70 dark:bg-cyan-900/20 text-cyan-700 dark:text-cyan-300 border-cyan-200/70 dark:border-cyan-800"
                        icon={GraduationCap}
                      />
                      <StatCard
                        title="Female Staff"
                        value={stats.female}
                        color="bg-pink-50/70 dark:bg-pink-900/20 text-pink-700 dark:text-pink-300 border-pink-200/70 dark:border-pink-800"
                        icon={GraduationCap}
                      />
                    </div>

                    {/* Gender Ratio Bar */}
                    <div className="pt-2 sm:pt-4 space-y-3 bg-gray-50/70 dark:bg-gray-900/50 p-4 sm:p-5 rounded-2xl border border-gray-100 dark:border-gray-700">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-black text-gray-500 uppercase tracking-wider">
                          Gender Ratio Distribution
                        </h4>
                        <span className="text-xs font-bold text-gray-400">
                          {stats.total} Total
                        </span>
                      </div>

                      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden flex shadow-inner">
                        <div
                          className="bg-cyan-500 h-full transition-all duration-700 ease-out"
                          style={{ width: `${stats.total ? (stats.male / stats.total) * 100 : 0}%` }}
                          title={`Male: ${stats.total ? ((stats.male / stats.total) * 100).toFixed(1) : 0}%`}
                        />
                        <div
                          className="bg-pink-500 h-full transition-all duration-700 ease-out"
                          style={{ width: `${stats.total ? (stats.female / stats.total) * 100 : 0}%` }}
                          title={`Female: ${stats.total ? ((stats.female / stats.total) * 100).toFixed(1) : 0}%`}
                        />
                      </div>

                      <div className="flex justify-between items-center text-xs font-bold pt-1">
                        <span className="text-cyan-600 dark:text-cyan-400 flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-cyan-500 shrink-0"></span>
                          Male: {stats.total ? ((stats.male / stats.total) * 100).toFixed(1) : 0}% ({stats.male})
                        </span>
                        <span className="text-pink-600 dark:text-pink-400 flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-pink-500 shrink-0"></span>
                          Female: {stats.total ? ((stats.female / stats.total) * 100).toFixed(1) : 0}% ({stats.female})
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Tab 2: Level Breakdown */}
                {activeTab === 'models' && (
                  <div className="space-y-4 sm:space-y-6">
                    <h3 className="text-sm sm:text-base font-black text-gray-900 dark:text-gray-100 uppercase tracking-wider border-b border-gray-100 dark:border-gray-700 pb-2.5">
                      Deployment by School Level
                    </h3>

                    {/* Level Grid: 1-col on mobile, 2-col on tablet/desktop */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4 md:gap-5">
                      {Object.entries(stats.levels).map(([level, data]) => (
                        (data.total > 0 || level !== 'Other') && (
                          <div
                            key={level}
                            className="p-4 rounded-2xl border border-gray-100 dark:border-gray-700 bg-gray-50/70 dark:bg-gray-900/40 shadow-sm flex flex-col justify-between"
                          >
                            <div className="flex items-center justify-between mb-3 gap-2">
                              <h4 className="font-bold text-gray-900 dark:text-gray-100 text-sm sm:text-base truncate">
                                {level}
                              </h4>
                              <span className="font-mono text-xs font-bold bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 px-2.5 py-1 rounded-lg border border-gray-200/60 dark:border-gray-600 shadow-sm shrink-0">
                                {data.total} Staff
                              </span>
                            </div>

                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div className="bg-cyan-50 dark:bg-cyan-900/30 p-2.5 rounded-xl border border-cyan-100 dark:border-cyan-800 flex flex-col items-center sm:items-start">
                                <span className="text-cyan-700 dark:text-cyan-300 font-black text-sm">
                                  {data.male}
                                </span>
                                <span className="text-[10px] text-cyan-600 dark:text-cyan-400 font-bold uppercase tracking-wider">
                                  Male
                                </span>
                              </div>
                              <div className="bg-pink-50 dark:bg-pink-900/30 p-2.5 rounded-xl border border-pink-100 dark:border-pink-800 flex flex-col items-center sm:items-start">
                                <span className="text-pink-700 dark:text-pink-300 font-black text-sm">
                                  {data.female}
                                </span>
                                <span className="text-[10px] text-pink-600 dark:text-pink-400 font-bold uppercase tracking-wider">
                                  Female
                                </span>
                              </div>
                            </div>
                          </div>
                        )
                      ))}
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

function StatCard({ title, value, color, icon: Icon }: any) {
  return (
    <div className={`p-4 sm:p-5 rounded-2xl border ${color} flex flex-col justify-between h-24 sm:h-28 transition-transform hover:-translate-y-0.5 duration-200 shadow-sm`}>
      <div className="flex justify-between items-center">
        <h4 className="font-bold text-xs uppercase tracking-wider opacity-85">{title}</h4>
        <Icon className="w-4 h-4 sm:w-5 sm:h-5 opacity-70" />
      </div>
      <div>
        <span className="text-2xl sm:text-3xl font-black tracking-tight">{value}</span>
      </div>
    </div>
  )
}