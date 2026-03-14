'use client'

import { useState, useEffect, useMemo } from 'react'
import { X, Search, Filter, Loader2, GraduationCap, School, ChevronRight } from 'lucide-react'
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
      // 1. Fetch Teachers basic info - removing profiles join for gender since profiles table doesn't have it
      // Note: teacher_type column does not exist in DB, removed to prevent query error
      const { data: teachersData, error: teacherError } = await supabase
        .from('teachers')
        .select(`
          id, status, gender, teacher_id
        `)
      
      if (teacherError) throw teacherError
      
      // 2. Fetch Assignments manually (safeguard against missing FKs)
      // Retrieve assignments for these teachers
      // Use 'id' (UUID) for linking ensuring we match the correct column in teacher_class_assignments
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
               // Map UUID -> Class Name
               assignmentsMap[a.teacher_id] = a.classes.name
             }
           })
        }
      }

      // Merge data and normalize gender
      const mergedTeachers = teachersData?.map((t: any) => ({
         ...t,
         className: assignmentsMap[t.id] || '', // Use UUID to lookup
         // Fallback for null gender if possible, or keep as is
         gender: t.gender || 'Unknown'
      })) || []

      setTeachers(mergedTeachers)

    } catch (error) {
      console.error('Error fetching teacher stats:', error)
      // fallback to empty
      setTeachers([]) 
    } finally {
      setLoading(false)
    }
  }

  const stats = useMemo(() => {
    const total = teachers.length
    
    // Check gender from teacher record
    const male = teachers.filter(t => t.gender === 'Male').length
    const female = teachers.filter(t => t.gender === 'Female').length
    
    // Level breakdown
    const levels = {
      KG: { male: 0, female: 0, total: 0 },
      'Lower Primary': { male: 0, female: 0, total: 0 },
      'Upper Primary': { male: 0, female: 0, total: 0 },
      JHS: { male: 0, female: 0, total: 0 },
      'Unassigned Teachers': { male: 0, female: 0, total: 0 }, 
      Other: { male: 0, female: 0, total: 0 }
    }

    teachers.forEach(t => {
      // Use the pre-fetched class name
      const clsName = t.className || ''
      // const type = t.teacher_type // Column does not exist
      let category = 'Other'

      // Prioritize explicit class assignment if valid
      if (clsName) {
          if (clsName.includes('KG') || clsName.includes('Kindergarten')) category = 'KG'
          else if (clsName.match(/Basic [1-3]|Class [1-3]|P[1-3]/i)) category = 'Lower Primary'
          else if (clsName.match(/Basic [4-6]|Class [4-6]|P[4-6]/i)) category = 'Upper Primary'
          else if (clsName.match(/JHS|Junior High|Basic [7-9]/i)) category = 'JHS'
      } else {
        // Fallback for teachers without assignments
        category = 'Unassigned Teachers'
      }
      
      const gender = t.gender
      
      // Safety check for gender being null
      if (gender === 'Male') levels[category as keyof typeof levels].male++
      else if (gender === 'Female') levels[category as keyof typeof levels].female++
      
      // Always count total
      levels[category as keyof typeof levels].total++
    })

    return { total, male, female, levels }
  }, [teachers])


  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="p-4 md:p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900/50">
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
              <GraduationCap className="w-6 h-6 text-green-600" />
              Staff Demographics
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">Teacher distribution by gender and level</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
            
            {/* Sidebar */}
            <div className="w-full md:w-64 bg-gray-50 dark:bg-gray-900/30 border-r border-gray-100 dark:border-gray-700 p-4 space-y-2">
              <button
                onClick={() => setActiveTab('overview')}
                className={`w-full text-left px-4 py-3 rounded-lg text-sm font-medium transition-colors flex items-center justify-between ${
                  activeTab === 'overview' 
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' 
                    : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
                }`}
              >
                Overview
                {activeTab === 'overview' && <ChevronRight className="w-4 h-4 ml-2" />}
              </button>
               <button
                onClick={() => setActiveTab('models')}
                className={`w-full text-left px-4 py-3 rounded-lg text-sm font-medium transition-colors flex items-center justify-between ${
                  activeTab === 'models' 
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' 
                    : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
                }`}
              >
                Level Breakdown
                {activeTab === 'models' && <ChevronRight className="w-4 h-4 ml-2" />}
              </button>
            </div>

            {/* Main Content */}
            <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-white dark:bg-gray-800">
               {loading ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-400">
                  <Loader2 className="w-8 h-8 animate-spin mb-4 text-green-500" />
                  <p>Loading staff data...</p>
                </div>
              ) : (
                <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
                  
                  {activeTab === 'overview' && (
                    <div className="space-y-6">
                       <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 border-b pb-2">Staff Overview</h3>
                       <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                         <StatCard title="Total Staff" value={stats.total} color="bg-green-50 text-green-700 border-green-200" icon={GraduationCap} />
                         <StatCard title="Male Staff" value={stats.male} color="bg-cyan-50 text-cyan-700 border-cyan-200" icon={GraduationCap} />
                         <StatCard title="Female Staff" value={stats.female} color="bg-pink-50 text-pink-700 border-pink-200" icon={GraduationCap} />
                      </div>

                       <div className="pt-8">
                         <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Gender Ratio</h4>
                         <div className="h-4 bg-gray-100 rounded-full overflow-hidden flex">
                            <div className="bg-cyan-500 h-full transition-all duration-1000" style={{ width: `${stats.total ? (stats.male / stats.total) * 100 : 0}%` }} />
                            <div className="bg-pink-500 h-full transition-all duration-1000" style={{ width: `${stats.total ? (stats.female / stats.total) * 100 : 0}%` }} />
                         </div>
                         <div className="flex justify-between mt-2 text-sm font-medium">
                            <span className="text-cyan-600">{stats.total ? ((stats.male / stats.total) * 100).toFixed(1) : 0}% Male</span>
                            <span className="text-pink-600">{stats.total ? ((stats.female / stats.total) * 100).toFixed(1) : 0}% Female</span>
                         </div>
                      </div>
                    </div>
                  )}

                  {activeTab === 'models' && (
                     <div className="space-y-6">
                       <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 border-b pb-2">Deployment by Level</h3>
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {Object.entries(stats.levels).map(([level, data]) => (
                           (data.total > 0 || level !== 'Other') && (
                            <div key={level} className="p-4 rounded-xl border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                              <div className="flex justify-between items-start mb-4">
                                <h4 className="font-bold text-gray-800 dark:text-gray-200 text-lg">{level}</h4>
                                <span className="font-mono text-sm bg-white dark:bg-gray-700 px-2 py-1 rounded shadow-sm">{data.total} Staff</span>
                              </div>
                              <div className="grid grid-cols-2 gap-2 text-sm">
                                <div className="bg-cyan-100/50 dark:bg-cyan-900/20 p-2 rounded flex flex-col">
                                   <span className="text-cyan-700 dark:text-cyan-400 font-semibold">{data.male}</span>
                                   <span className="text-xs text-cyan-600/80 dark:text-cyan-500/80">Male</span>
                                </div>
                                <div className="bg-pink-100/50 dark:bg-pink-900/20 p-2 rounded flex flex-col">
                                   <span className="text-pink-700 dark:text-pink-400 font-semibold">{data.female}</span>
                                   <span className="text-xs text-pink-600/80 dark:text-pink-500/80">Female</span>
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
    <div className={`p-4 rounded-xl border ${color} flex flex-col justify-between h-24 sm:h-32 transition-transform hover:scale-105 duration-200`}>
       <div className="flex justify-between items-start">
         <h4 className="font-semibold text-sm opacity-80">{title}</h4>
         <Icon className="w-5 h-5 opacity-60" />
       </div>
       <div>
         <span className="text-3xl font-bold">{value}</span>
       </div>
    </div>
  )
}
