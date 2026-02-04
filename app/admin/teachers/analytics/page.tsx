'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'
import { useAdmin } from '@/components/providers/AdminContext'
import { Skeleton } from '@/components/ui/skeleton'
import BackButton from '@/components/ui/BackButton'
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  PieChart, Pie, Cell 
} from 'recharts'
import { GraduationCap, Users, School } from 'lucide-react'

// Colors for charts
const GENDER_COLORS = ['#3b82f6', '#ec4899', '#94a3b8'] // Blue, Pink, Slate (Unknown)

export default function TeacherAnalyticsPage() {
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()
  const { user, loading: contextLoading } = useAdmin()
  const [loading, setLoading] = useState(true)
  
  // Stats
  const [totalTeachers, setTotalTeachers] = useState(0)
  const [genderStats, setGenderStats] = useState<{name: string, value: number}[]>([])
  const [levelStats, setLevelStats] = useState<{name: string, value: number}[]>([])

  useEffect(() => {
    if (contextLoading) return
    if (!user) {
      router.push('/login?portal=admin')
      return
    }
    loadAnalytics()
  }, [user, contextLoading])

  async function loadAnalytics() {
    setLoading(true)
    try {
      // 1. Fetch Teachers
      const { data: teachers, error: teachersError } = await supabase
        .from('teachers')
        .select('id, gender')
        .eq('status', 'active')

      if (teachersError) throw teachersError

      // 2. Fetch Class Assignments to determine level distribution
      // We also look at subject assignments if available, but class assignments is safer for "Level"
      const { data: assignments, error: assignmentsError } = await supabase
        .from('teacher_class_assignments')
        .select(`
           teacher_id,
           classes (level)
        `)
      
      // If table doesn't exist or error, we might have partial data
      if (assignmentsError && assignmentsError.code !== 'PGRST116') { // PGRST116 is not found? No, that's different. 
         console.warn('Could not fetch class assignments', assignmentsError)
      }

      if (teachers) {
        processStats(teachers, assignments || [])
      }
    } catch (error) {
      console.error('Error loading analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  function processStats(teachers: any[], assignments: any[]) {
    const total = teachers.length
    setTotalTeachers(total)

    // 1. Gender Stats
    let male = 0
    let female = 0
    let unknown = 0

    teachers.forEach(t => {
       const g = (t.gender || 'unknown').toLowerCase()
       if (g === 'male' || g === 'm') male++
       else if (g === 'female' || g === 'f') female++
       else unknown++
    })

    const gStats = [
        { name: 'Male', value: male },
        { name: 'Female', value: female }
    ]
    if (unknown > 0) gStats.push({ name: 'Unknown', value: unknown })
    setGenderStats(gStats)

    // 2. Level Stats
    // Map teachers to levels. A teacher might be in multiple levels.
    // "Number of teachers there" -> Unique teachers per level.
    
    const levelsMap: Record<string, Set<string>> = {} // Level -> Set of TeacherIDs
    
    // Initialize levels
    const levelGroups = ['Kindergarten', 'Lower Primary', 'Upper Primary', 'JHS']
    levelGroups.forEach(l => levelsMap[l] = new Set())
    levelsMap['Unknown'] = new Set()

    assignments.forEach(a => {
        if (!a.classes || !a.teacher_id) return
        
        const rawLevel = a.classes.level || 'Unknown'
        let group = 'Unknown'
        
        const l = rawLevel.toLowerCase()
        if (l.includes('kg') || l.includes('kinder')) group = 'Kindergarten'
        else if (l.includes('lower') || ['basic 1', 'basic 2', 'basic 3'].some(x => l.includes(x))) group = 'Lower Primary'
        else if (l.includes('upper') || ['basic 4', 'basic 5', 'basic 6'].some(x => l.includes(x))) group = 'Upper Primary'
        else if (l.includes('jhs')) group = 'JHS'
        
        if (levelsMap[group]) {
            levelsMap[group].add(a.teacher_id)
        } else {
            // Fallback
            if (!levelsMap[rawLevel]) levelsMap[rawLevel] = new Set()
            levelsMap[rawLevel].add(a.teacher_id)
        }
    })

    // Also consider teachers who didn't have assignments? No, they aren't "in a level".
    // But user wants "each level with the number of teachers there".

    // Filter out empty custom levels if we stuck to standard groups
    const lStats = Object.entries(levelsMap)
        .map(([name, set]) => ({ name, value: set.size }))
        .filter(x => x.value > 0 || levelGroups.includes(x.name))
        .sort((a, b) => {
             const idxA = levelGroups.indexOf(a.name)
             const idxB = levelGroups.indexOf(b.name)
             return (idxA === -1 ? 99 : idxA) - (idxB === -1 ? 99 : idxB)
        })

    setLevelStats(lStats)
  }

  if (loading) {
    return (
       <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto space-y-6">
           <Skeleton className="h-10 w-48" />
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Skeleton className="h-32 rounded-xl" />
              <Skeleton className="h-32 rounded-xl" />
              <Skeleton className="h-32 rounded-xl" />
           </div>
           <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Skeleton className="h-80 rounded-xl" />
              <Skeleton className="h-80 rounded-xl" />
           </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      <div className="bg-white shadow">
        <div className="container mx-auto px-4 py-4">
           <div className="flex items-center gap-4">
              <BackButton href="/admin/dashboard" />
              <h1 className="text-xl font-bold text-gray-800">Teacher Population Analytics</h1>
           </div>
        </div>
      </div>

      <main className="container mx-auto px-4 py-8">
         {/* Summary Cards */}
         <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
               <div>
                  <p className="text-sm text-gray-500 font-medium">Total Teachers</p>
                  <p className="text-3xl font-bold text-gray-900">{totalTeachers}</p>
               </div>
               <div className="p-3 bg-yellow-50 rounded-lg text-yellow-600">
                  <GraduationCap className="w-6 h-6" />
               </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
               <div>
                  <p className="text-sm text-gray-500 font-medium">Male Teachers</p>
                  <p className="text-3xl font-bold text-gray-900">{genderStats.find(g => g.name === 'Male')?.value || 0}</p>
               </div>
               <div className="p-3 bg-blue-100 rounded-lg text-blue-700">
                  <span className="font-bold text-xl">M</span>
               </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
               <div>
                  <p className="text-sm text-gray-500 font-medium">Female Teachers</p>
                  <p className="text-3xl font-bold text-gray-900">{genderStats.find(g => g.name === 'Female')?.value || 0}</p>
               </div>
               <div className="p-3 bg-pink-100 rounded-lg text-pink-700">
                  <span className="font-bold text-xl">F</span>
               </div>
            </div>
         </div>

         {/* Charts */}
         <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Gender Pie Chart */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
               <h3 className="text-lg font-bold text-gray-800 mb-6">Gender Distribution</h3>
               <div className="h-80 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                     <PieChart>
                        <Pie
                           data={genderStats}
                           cx="50%"
                           cy="50%"
                           labelLine={false}
                           label={({ name, percent }) => percent > 0 ? `${name} ${(percent * 100).toFixed(0)}%` : ''}
                           outerRadius={80}
                           fill="#8884d8"
                           dataKey="value"
                        >
                           {genderStats.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={GENDER_COLORS[index % GENDER_COLORS.length]} />
                           ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                     </PieChart>
                  </ResponsiveContainer>
               </div>
            </div>

            {/* Level Bar Chart */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
               <h3 className="text-lg font-bold text-gray-800 mb-6">Teachers by Level</h3>
               <div className="h-80 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                     <BarChart data={levelStats}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="name" />
                        <YAxis allowDecimals={false} />
                        <Tooltip />
                        <Bar dataKey="value" fill="#EAB308" name="Teachers" radius={[4, 4, 0, 0]} />
                     </BarChart>
                  </ResponsiveContainer>
               </div>
               <p className="text-xs text-gray-400 mt-4 text-center">
                  * Based on class assignments. A teacher assigned to multiple levels is counted in each.
               </p>
            </div>
         </div>
      </main>
    </div>
  )
}
