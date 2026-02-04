'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'
import { useAdmin } from '@/components/providers/AdminContext'
import { Skeleton } from '@/components/ui/skeleton'
import BackButton from '@/components/ui/BackButton'
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  PieChart, Pie, Cell, Sector 
} from 'recharts'
import { Users, Baby, School, Award } from 'lucide-react'

// Colors for charts
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d']
const GENDER_COLORS = ['#3b82f6', '#ec4899'] // Blue for Male, Pink for Female

export default function StudentAnalyticsPage() {
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()
  const { user, loading: contextLoading } = useAdmin()
  const [loading, setLoading] = useState(true)
  
  // Stats state
  const [totalStudents, setTotalStudents] = useState(0)
  const [genderStats, setGenderStats] = useState<{name: string, value: number}[]>([])
  const [levelStats, setLevelStats] = useState<{name: string, value: number}[]>([])
  const [classStats, setClassStats] = useState<{name: string, count: number, male: number, female: number}[]>([])
  const [ageStats, setAgeStats] = useState<{name: string, count: number}[]>([])

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
      // Fetch all active students with class and profile info
      const { data: students, error } = await supabase
        .from('students')
        .select(`
          id, 
          gender, 
          date_of_birth,
          classes (name, level)
        `)
        .eq('status', 'active')

      if (error) throw error

      if (students) {
        processStats(students)
      }
    } catch (error) {
      console.error('Error loading analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  function processStats(students: any[]) {
    const total = students.length
    
    // 1. Gender Stats
    let male = 0
    let female = 0
    
    // 2. Level Stats
    const levels: Record<string, number> = {}
    
    // 3. Class Stats
    const classes: Record<string, { total: number, male: number, female: number }> = {}
    
    // 4. Age Stats
    const ages: Record<string, number> = {}

    students.forEach(student => {
      // Gender
      const gender = (student.gender || 'Unknown').toLowerCase()
      if (gender === 'male' || gender === 'm') male++
      else if (gender === 'female' || gender === 'f') female++

      // Level
      const level = student.classes?.level || 'Unknown'
      levels[level] = (levels[level] || 0) + 1

      // Class
      const className = student.classes?.name || 'Unknown'
      if (!classes[className]) classes[className] = { total: 0, male: 0, female: 0 }
      classes[className].total++
      if (gender === 'male' || gender === 'm') classes[className].male++
      else if (gender === 'female' || gender === 'f') classes[className].female++

      // Age
      if (student.date_of_birth) {
        const dob = new Date(student.date_of_birth)
        const ageDifMs = Date.now() - dob.getTime()
        const ageDate = new Date(ageDifMs)
        const age = Math.abs(ageDate.getUTCFullYear() - 1970)
        
        // Group ages? or raw. Let's do raw for now, maybe bucket if too many.
        ages[age] = (ages[age] || 0) + 1
      }
    })

    // Set States
    setTotalStudents(total)
    setGenderStats([
      { name: 'Male', value: male },
      { name: 'Female', value: female }
    ])
    
    // Convert levels object to array
    const levelArr = Object.entries(levels).map(([name, value]) => ({ name, value }))
    // Sort levels logic? (Upper Primary, Lower Primary etc)
    const levelOrder = ['Kindergarten', 'Lower Primary', 'Upper Primary', 'JHS', 'Unknown']
    const normalizeLevel = (l: string) => {
        if (l.toLowerCase().includes('kinder') || l.toLowerCase().includes('kg')) return 'Kindergarten'
        if (l.toLowerCase().includes('lower')) return 'Lower Primary'
        if (l.toLowerCase().includes('upper')) return 'Upper Primary'
        if (l.toLowerCase().includes('jhs')) return 'JHS'
        return l
    }
    
    // Re-aggregate based on normalized levels to ensure cleaner charts
    const cleanLevels: Record<string, number> = {}
    students.forEach(s => {
       const l = normalizeLevel(s.classes?.level || 'Unknown')
       cleanLevels[l] = (cleanLevels[l] || 0) + 1
    })
    
    const sortedLevels = Object.entries(cleanLevels)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => {
            const idxA = levelOrder.indexOf(a.name)
            const idxB = levelOrder.indexOf(b.name)
            return (idxA === -1 ? 99 : idxA) - (idxB === -1 ? 99 : idxB)
        })
    
    setLevelStats(sortedLevels)

    // Sort Classes (Basic 1, Basic 2...)
    const sortedClasses = Object.entries(classes)
        .map(([name, stats]) => ({ name, count: stats.total, male: stats.male, female: stats.female }))
        .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))
    
    setClassStats(sortedClasses)

    // Sort Ages
    const sortedAges = Object.entries(ages)
        .map(([name, count]) => ({ name: `${name} yrs`, count })) // name as string for chart
        .sort((a, b) => parseInt(a.name) - parseInt(b.name))
    
    setAgeStats(sortedAges)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto space-y-6">
           <Skeleton className="h-10 w-48" />
           <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {[1,2,3,4].map(i => <Skeleton key={i} className="h-32 rounded-xl" />)}
           </div>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Skeleton className="h-96 rounded-xl" />
              <Skeleton className="h-96 rounded-xl" />
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
              <h1 className="text-xl font-bold text-gray-800">Student Population Analytics</h1>
           </div>
        </div>
      </div>

      <main className="container mx-auto px-4 py-8">
         {/* Summary Cards */}
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
               <div>
                  <p className="text-sm text-gray-500 font-medium">Total Students</p>
                  <p className="text-3xl font-bold text-gray-900">{totalStudents}</p>
               </div>
               <div className="p-3 bg-blue-50 rounded-lg text-blue-600">
                  <Users className="w-6 h-6" />
               </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
               <div>
                  <p className="text-sm text-gray-500 font-medium">Male Students</p>
                  <p className="text-3xl font-bold text-gray-900">{genderStats.find(g => g.name === 'Male')?.value || 0}</p>
                  <p className="text-xs text-gray-400 mt-1">
                     {Math.round(((genderStats.find(g => g.name === 'Male')?.value || 0) / totalStudents) * 100)}% of total
                  </p>
               </div>
               <div className="p-3 bg-blue-100 rounded-lg text-blue-700">
                  <span className="font-bold text-xl">M</span>
               </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
               <div>
                  <p className="text-sm text-gray-500 font-medium">Female Students</p>
                  <p className="text-3xl font-bold text-gray-900">{genderStats.find(g => g.name === 'Female')?.value || 0}</p>
                  <p className="text-xs text-gray-400 mt-1">
                     {Math.round(((genderStats.find(g => g.name === 'Female')?.value || 0) / totalStudents) * 100)}% of total
                  </p>
               </div>
               <div className="p-3 bg-pink-100 rounded-lg text-pink-700">
                  <span className="font-bold text-xl">F</span>
               </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
               <div>
                  <p className="text-sm text-gray-500 font-medium">Levels</p>
                  <p className="text-3xl font-bold text-gray-900">{levelStats.length}</p>
               </div>
               <div className="p-3 bg-purple-50 rounded-lg text-purple-600">
                  <School className="w-6 h-6" />
               </div>
            </div>
         </div>

         {/* Charts Row 1: Gender & Levels */}
         <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
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
                           label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
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
               <h3 className="text-lg font-bold text-gray-800 mb-6">Students by Level</h3>
               <div className="h-80 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                     <BarChart data={levelStats}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="value" fill="#8884d8" name="Students" radius={[4, 4, 0, 0]} />
                     </BarChart>
                  </ResponsiveContainer>
               </div>
            </div>
         </div>

         {/* Charts Row 2: Class Stats & Age */}
         <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Class Breakdown */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
               <h3 className="text-lg font-bold text-gray-800 mb-6">Breakdown by Class</h3>
               <div className="h-96 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                     <BarChart data={classStats} layout="vertical" margin={{ left: 40 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                        <XAxis type="number" />
                        <YAxis dataKey="name" type="category" width={80} />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="male" stackId="a" fill="#3b82f6" name="Male" />
                        <Bar dataKey="female" stackId="a" fill="#ec4899" name="Female" />
                     </BarChart>
                  </ResponsiveContainer>
               </div>
            </div>

            {/* Age Dist */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
               <h3 className="text-lg font-bold text-gray-800 mb-6">Age Distribution</h3>
               <div className="h-96 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                     <BarChart data={ageStats}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="count" fill="#FFBB28" name="Students" radius={[4, 4, 0, 0]} />
                     </BarChart>
                  </ResponsiveContainer>
               </div>
            </div>
         </div>
      </main>
    </div>
  )
}
