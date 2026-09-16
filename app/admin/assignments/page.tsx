'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  Users, 
  BookOpen, 
  Search, 
  Building2, 
  Edit3, 
  ChevronRight,
  Info,
  AlertCircle
} from 'lucide-react'
import { getCurrentUser } from '@/lib/auth'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'
import { Skeleton } from '@/components/ui/skeleton'
import BackButton from '@/components/ui/back-button'
import { PortalFooter } from '@/components/PortalFooter'

interface Teacher {
  id: string
  teacher_id: string
  first_name: string
  last_name: string
  specialization?: string
  status?: string
}

interface ClassItem {
  id: string
  name: string
}

interface SubjectItem {
  id: string
  name: string
}

interface AssignmentItem {
  id: string
  teacher_id: string
  class_id: string
  subject_id?: string
  teachers?: {
    first_name: string
    last_name: string
    teacher_id: string
  }
  classes?: {
    name: string
  }
}

export default function AssignmentsPage() {
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()

  const [loading, setLoading] = useState(true)
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [classes, setClasses] = useState<ClassItem[]>([])
  const [subjects, setSubjects] = useState<SubjectItem[]>([])
  const [assignments, setAssignments] = useState<AssignmentItem[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [classFilter, setClassFilter] = useState('all')

  useEffect(() => {
    async function loadData() {
      const user = await getCurrentUser()
      if (!user) {
        router.push('/login?portal=admin')
        return
      }

      try {
        const [teachersRes, classesRes, subjectsRes, assignmentsRes] = await Promise.all([
          supabase
            .from('teachers')
            .select('*')
            .eq('status', 'active')
            .order('first_name'),
          supabase
            .from('classes')
            .select('*')
            .order('name'),
          supabase
            .from('subjects')
            .select('*')
            .order('name'),
          supabase
            .from('teacher_class_assignments')
            .select(`
              *,
              teachers (first_name, last_name, teacher_id),
              classes (name)
            `)
        ])

        if (teachersRes.data) setTeachers(teachersRes.data)
        if (classesRes.data) setClasses(classesRes.data)
        if (subjectsRes.data) setSubjects(subjectsRes.data)
        if (assignmentsRes.data) setAssignments(assignmentsRes.data)
      } catch (err) {
        console.error('Failed to load assignments data:', err)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [router, supabase])

  // Combine teachers with their assigned class records
  const teacherAssignments = useMemo(() => {
    return teachers.map((teacher) => {
      const teacherClasses = Array.from(
        new Set(
          assignments
            .filter((a) => a.teacher_id === teacher.id)
            .map((a) => a.classes?.name)
            .filter(Boolean) as string[]
        )
      )

      return {
        ...teacher,
        assignedClasses: teacherClasses,
      }
    })
  }, [teachers, assignments])

  // Filtered teachers list based on search and class selector
  const filteredTeachers = useMemo(() => {
    return teacherAssignments.filter((teacher) => {
      const fullName = `${teacher.first_name} ${teacher.last_name}`.toLowerCase()
      const matchesSearch =
        fullName.includes(searchQuery.toLowerCase()) ||
        teacher.teacher_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (teacher.specialization && teacher.specialization.toLowerCase().includes(searchQuery.toLowerCase()))

      const matchesClass =
        classFilter === 'all' ||
        (classFilter === 'unassigned'
          ? teacher.assignedClasses.length === 0
          : teacher.assignedClasses.includes(classFilter))

      return matchesSearch && matchesClass
    })
  }, [teacherAssignments, searchQuery, classFilter])

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-900 font-sans text-slate-900 dark:text-slate-100 flex flex-col transition-colors selection:bg-[#003B5C] selection:text-white">
      
      {/* Top Header */}
      <header className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div className="max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 py-3.5 sm:py-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 sm:gap-4 min-w-0">
              <BackButton href="/admin/dashboard" />
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-4 bg-amber-400 rounded-full shrink-0" />
                  <h1 className="text-base sm:text-xl md:text-2xl font-black text-slate-900 dark:text-white tracking-tight truncate">
                    Teaching Allocations &amp; Assignments
                  </h1>
                </div>
                <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium truncate mt-0.5">
                  Assign academic cohorts and curriculum responsibilities to teaching staff
                </p>
              </div>
            </div>

            <Link
              href="/admin/teachers"
              className="hidden sm:inline-flex items-center justify-center gap-2 px-4 py-2 bg-[#003B5C] hover:bg-[#002a42] text-white font-bold text-xs rounded-xl shadow-xs transition active:scale-95 shrink-0"
            >
              <Users className="w-3.5 h-3.5 text-amber-400" />
              <span>Manage Teachers</span>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full px-3.5 sm:px-6 lg:px-8 py-5 sm:py-8 space-y-5 sm:space-y-6">
        
        {/* KPI Statistics Row */}
        <section className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
          
          {/* Total Teachers Card */}
          <div className="bg-white dark:bg-slate-800/90 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-700/80 p-4 sm:p-5 shadow-2xs flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
                Total Teachers
              </span>
              <div className="text-xl sm:text-3xl font-black text-[#003B5C] dark:text-blue-400 font-mono">
                {loading ? <Skeleton className="h-7 w-12 rounded-lg" /> : teachers.length}
              </div>
            </div>
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/50 text-[#003B5C] dark:text-blue-400 flex items-center justify-center shrink-0">
              <Users className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
          </div>

          {/* Class Cohorts Card */}
          <div className="bg-white dark:bg-slate-800/90 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-700/80 p-4 sm:p-5 shadow-2xs flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
                Class Cohorts
              </span>
              <div className="text-xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
                {loading ? <Skeleton className="h-7 w-12 rounded-lg" /> : classes.length}
              </div>
            </div>
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <Building2 className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
          </div>

          {/* Total Subjects Card */}
          <div className="col-span-2 sm:col-span-1 bg-white dark:bg-slate-800/90 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-700/80 p-4 sm:p-5 shadow-2xs flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
                Total Subjects
              </span>
              <div className="text-xl sm:text-3xl font-black text-amber-600 dark:text-amber-400 font-mono">
                {loading ? <Skeleton className="h-7 w-12 rounded-lg" /> : subjects.length}
              </div>
            </div>
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <BookOpen className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
          </div>

        </section>

        {/* Operational Guidelines Note */}
        <div className="bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200/70 dark:border-blue-900/50 rounded-2xl p-4 sm:p-5 flex items-start gap-3 text-xs text-blue-900 dark:text-blue-200">
          <Info className="w-4 h-4 sm:w-5 sm:h-5 text-[#003B5C] dark:text-blue-400 shrink-0 mt-0.5" />
          <div className="space-y-1 leading-relaxed">
            <h3 className="font-bold text-xs sm:text-sm text-[#003B5C] dark:text-blue-300">
              Allocation Workflow Guide
            </h3>
            <p className="text-[11px] sm:text-xs opacity-90">
              Select <strong>Edit Allocations</strong> next to any teacher to configure which cohorts they instruct and enter assessments for. Teachers can be assigned across multiple classes and subject specializations concurrently.
            </p>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="bg-white dark:bg-slate-800/90 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-700/80 p-3.5 sm:p-4 shadow-2xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter by teacher name, ID, or subject..."
              className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm font-medium border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50/50 dark:bg-slate-900/50 text-slate-900 dark:text-white placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-[#003B5C]"
            />
          </div>

          <div className="flex items-center gap-2 sm:w-60 shrink-0">
            <select
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs font-bold border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50/50 dark:bg-slate-900/50 text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-[#003B5C] cursor-pointer"
            >
              <option value="all">All Class Cohorts</option>
              <option value="unassigned">Unassigned Teachers Only</option>
              {classes.map((cls) => (
                <option key={cls.id} value={cls.name}>
                  {cls.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Teachers & Allocations Container */}
        <div className="bg-white dark:bg-slate-800/90 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-700/80 shadow-xs overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              <h2 className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white">
                Faculty Roster &amp; Teaching Loads
              </h2>
            </div>
            <span className="text-[10px] sm:text-xs font-mono font-bold text-slate-400 dark:text-slate-500">
              {filteredTeachers.length} of {teachers.length} Faculty
            </span>
          </div>

          {loading ? (
            <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="p-4 sm:p-6 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-5 w-48 rounded-md" />
                      <Skeleton className="h-3 w-28 rounded-md" />
                      <Skeleton className="h-4 w-72 rounded-md" />
                    </div>
                    <Skeleton className="h-9 w-28 rounded-xl shrink-0" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredTeachers.length === 0 ? (
            <div className="p-10 sm:p-14 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-50 dark:bg-slate-800/60 flex items-center justify-center mx-auto text-slate-400">
                <Users className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm sm:text-base font-bold text-slate-800 dark:text-slate-200">
                  No teachers found
                </h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  {searchQuery || classFilter !== 'all'
                    ? 'No faculty members match your active search and filter conditions.'
                    : 'No active teaching staff registered in the school database.'}
                </p>
              </div>
              {(searchQuery || classFilter !== 'all') && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('')
                    setClassFilter('all')
                  }}
                  className="text-xs font-bold text-[#003B5C] dark:text-blue-400 hover:underline pt-1"
                >
                  Clear Active Filters
                </button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {filteredTeachers.map((teacher) => (
                <div 
                  key={teacher.id} 
                  className="p-4 sm:p-5 md:p-6 hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    
                    {/* Left: Teacher Info & Badge Pills */}
                    <div className="space-y-2.5 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white tracking-tight">
                          {teacher.first_name} {teacher.last_name}
                        </h3>
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-mono font-bold border border-slate-200 dark:border-slate-700">
                          {teacher.teacher_id}
                        </span>
                        {teacher.specialization && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                            <BookOpen className="w-3 h-3 text-amber-500 shrink-0" />
                            <span>{teacher.specialization}</span>
                          </span>
                        )}
                      </div>

                      {/* Assigned Classes Pill Cluster */}
                      <div className="flex items-start gap-2">
                        <Building2 className="w-3.5 h-3.5 text-slate-400 mt-1 shrink-0" />
                        <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                          {teacher.assignedClasses.length > 0 ? (
                            teacher.assignedClasses.map((className) => (
                              <span
                                key={className}
                                className="px-2.5 py-0.5 rounded-lg bg-blue-50 dark:bg-blue-950/60 border border-blue-200/70 dark:border-blue-900/60 text-[#003B5C] dark:text-blue-300 text-[11px] font-bold"
                              >
                                {className}
                              </span>
                            ))
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs text-amber-700 dark:text-amber-400 italic">
                              <AlertCircle className="w-3 h-3" />
                              <span>No classes currently assigned</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right: Action Button */}
                    <div className="shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100 dark:border-slate-800 flex justify-end">
                      <Link
                        href={`/admin/teachers/${teacher.teacher_id}`}
                        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#003B5C] hover:bg-[#002a42] text-white rounded-xl text-xs font-bold shadow-xs hover:shadow transition active:scale-95 group"
                      >
                        <Edit3 className="w-3.5 h-3.5 text-amber-400 group-hover:scale-110 transition-transform" />
                        <span>Edit Allocations</span>
                        <ChevronRight className="w-3.5 h-3.5 text-blue-200 group-hover:translate-x-0.5 transition-transform" />
                      </Link>
                    </div>

                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </main>

      <PortalFooter />
    </div>
  )
}