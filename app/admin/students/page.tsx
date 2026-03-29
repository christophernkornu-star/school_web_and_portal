'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Users, Search, Filter, Edit, Trash2, ArrowLeft, Plus, Check, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'
import { useAdmin } from '@/components/providers/AdminContext'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'react-hot-toast'
import { PageHeader } from '@/components/ui/page-header'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

const PAGE_SIZE = 20

export default function StudentsPage() {
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()
  const { user, loading: contextLoading } = useAdmin()
  const [students, setStudents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [classFilter, setClassFilter] = useState('all')
  const [classes, setClasses] = useState<any[]>([])
  
  // Pagination state
  const [page, setPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)

  // Initial load for classes
  useEffect(() => {
    loadClasses()
  }, [])

  // Debounced load for students
  useEffect(() => {
    const timer = setTimeout(() => {
      loadStudents()
    }, 300)
    return () => clearTimeout(timer)
  }, [page, searchTerm, classFilter, router, user, contextLoading])

  async function loadClasses() {
    const { data: classesData } = await supabase
      .from('classes')
      .select('id, name, level')
      .order('level')
    
    if (classesData) setClasses(classesData)
  }

  async function loadStudents() {
    if (contextLoading) return
    setLoading(true)
    
    if (!user) {
      router.push('/login')
      return
    }

    let query = supabase
      .from('students')
      .select(`
        *,
        profiles:profile_id(full_name, email),
        classes:class_id(name, level)
      `, { count: 'exact' })
      .order('first_name')

    // Apply filters
    if (classFilter !== 'all') {
      query = query.eq('class_id', classFilter)
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      // Note: searching across multiple columns with OR
      query = query.or(`first_name.ilike.%${term}%,last_name.ilike.%${term}%,student_id.ilike.%${term}%,middle_name.ilike.%${term}%`)
    }

    // Apply pagination
    const from = (page - 1) * PAGE_SIZE
    const to = from + PAGE_SIZE - 1
    
    const { data: studentsData, count } = await query.range(from, to)

    if (studentsData) {
      setStudents(studentsData)
      setTotalCount(count || 0)
    }
    setLoading(false)
  }

  const handleDeleteStudent = async (studentId: string, profileId: string) => {
    if (!confirm('Are you sure you want to delete this student? This action cannot be undone.')) return
    
    try {
      const response = await fetch('/api/admin/delete-student', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ studentId, profileId }),
      })

      if (!response.ok) throw new Error('Failed to delete student')

      toast.success('Student deleted successfully')
      loadStudents() // Reload list
    } catch (error) {
      console.error('Error deleting student:', error)
      toast.error('Failed to delete student')
    }
  }

  if (loading && students.length === 0) {
    return (
      <div className="bg-gray-50 dark:bg-gray-900 min-h-screen p-8 space-y-6">
        <Skeleton className="h-10 w-1/3 mb-6" />
        <Skeleton className="h-32 w-full rounded-lg" />
        <div className="space-y-4">
             {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-16 w-full" />)}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gray-50 dark:bg-gray-900 min-h-screen">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <PageHeader 
          title="Student Management" 
          description="View and manage all students in the system."
        >
            <Link
                href="/admin/students/add"
                className="bg-blue-600 dark:bg-blue-700 text-white px-4 py-2 rounded-md hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors flex items-center gap-2 text-sm font-medium shadow-sm"
            >
                <Plus className="w-4 h-4" />
                <span>Add Student</span>
            </Link>
        </PageHeader>
        
        {/* Filters */}
        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
              <div className="relative w-full sm:w-auto flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search by name or ID..."
                  className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              
              <div className="relative w-full sm:w-auto min-w-[200px]">
                <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <select
                  className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  value={classFilter}
                  onChange={(e) => setClassFilter(e.target.value)}
                >
                  <option value="all">All Classes</option>
                  {classes.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <div className="bg-white dark:bg-gray-800 rounded-lg overflow-hidden">
            
            {/* Mobile View */}
            <div className="md:hidden divide-y divide-gray-100 dark:divide-gray-700">
              {students.map((student) => (
                <div key={student.id} className="p-4 space-y-3">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center space-x-3">
                      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold text-sm uppercase">
                        {student.first_name[0]}{student.last_name[0]}
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900 dark:text-white">
                          {student.last_name} {student.first_name}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                           {student.student_id}
                        </div>
                      </div>
                    </div>
                    <Badge variant={student.status === 'active' ? 'success' : 'secondary'}>
                        {student.status || 'Active'}
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 text-xs text-gray-500 dark:text-gray-400">
                    <div className="bg-gray-50 dark:bg-gray-700/50 p-2 rounded">
                      <span className="block font-medium mb-1">Class</span>
                      <Badge variant="secondary" className="font-medium bg-white dark:bg-gray-800">
                        {student.classes?.name || 'Unassigned'}
                      </Badge>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-700/50 p-2 rounded">
                      <span className="block font-medium mb-1">Gender</span>
                      <span className="capitalize">{student.gender || 'N/A'}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-700">
                     <span className="text-xs text-gray-400 truncate max-w-[150px]">{student.email || 'No Email'}</span>
                     <div className="flex items-center gap-2">
                          <Link 
                              href={`/admin/students/${student.id}`}
                              className="p-1.5 text-blue-600 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:hover:bg-blue-900/40 rounded-md transition-colors text-xs font-medium px-3"
                          >
                              View
                          </Link>
                          <button
                              onClick={() => handleDeleteStudent(student.id, student.profile_id)}
                              className="p-1.5 text-red-600 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/40 rounded-md transition-colors"
                          >
                              <Trash2 className="w-4 h-4" />
                          </button>
                     </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-900 dark:text-gray-300 border-b dark:border-gray-700">
                  <tr>
                    <th scope="col" className="px-6 py-3 font-semibold">Student Info</th>
                    <th scope="col" className="px-6 py-3 font-semibold hidden md:table-cell">Details</th>
                    <th scope="col" className="px-6 py-3 font-semibold">Class</th>
                    <th scope="col" className="px-6 py-3 font-semibold text-center">Status</th>
                    <th scope="col" className="px-6 py-3 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {students.map((student) => (
                    <tr key={student.id} className="bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-3">
                          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold text-xs uppercase">
                            {student.first_name[0]}{student.last_name[0]}
                          </div>
                          <div>
                            <div className="font-semibold text-gray-900 dark:text-white">
                              {student.last_name} {student.first_name}
                            </div>
                            <div className="flex flex-col sm:flex-row sm:items-center text-xs text-gray-500 dark:text-gray-400 sm:gap-2">
                               <span>{student.student_id}</span>
                               <span className="hidden sm:inline">•</span>
                               <span className="truncate max-w-[150px]">{student.email || 'No Email'}</span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 hidden md:table-cell">
                          <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
                              <div className="flex items-center gap-1">
                                  <span className="font-medium">DOB:</span>
                                  <span>{student.date_of_birth || 'N/A'}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                  <span className="font-medium">Gender:</span>
                                  <span className="capitalize">{student.gender || 'N/A'}</span>
                              </div>
                          </div>
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant="secondary" className="font-medium">
                          {student.classes?.name || 'Unassigned'}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-center">
                          <Badge variant={student.status === 'active' ? 'success' : 'secondary'}>
                              {student.status || 'Active'}
                          </Badge>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link 
                              href={`/admin/students/${student.id}`}
                              className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/40 dark:text-gray-400 dark:hover:text-blue-400 rounded-md transition-colors"
                              title="View Details"
                          >
                              <Edit className="w-4 h-4" />
                          </Link>
                          <button
                              onClick={() => handleDeleteStudent(student.id, student.profile_id)}
                              className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/40 dark:text-gray-400 dark:hover:text-red-400 rounded-md transition-colors"
                              title="Delete Student"
                          >
                              <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
            </div>

            {/* Empty State - Now outside the hidden md:block div so it shows everywhere */}
            {students.length === 0 && !loading && (
                <div className="p-12 text-center text-gray-500 dark:text-gray-400">
                    <p>No students found matching your criteria.</p>
                </div>
            )}
          </div>
          
          {/* Pagination Footer */}
          <div className="p-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 flex items-center justify-between">
               <div className="text-sm text-gray-500 dark:text-gray-400">
                   Showing {students.length} of {totalCount} students
               </div>
               <div className="flex gap-2">
                   <button 
                      disabled={page === 1}
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      className="px-3 py-1 border border-gray-200 dark:border-gray-700 rounded text-sm hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50 transition-colors text-gray-700 dark:text-gray-300"
                   >
                       Previous
                   </button>
                   <button 
                      disabled={students.length < PAGE_SIZE}
                      onClick={() => setPage(p => p + 1)}
                      className="px-3 py-1 border border-gray-200 dark:border-gray-700 rounded text-sm hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50 transition-colors text-gray-700 dark:text-gray-300"
                   >
                       Next
                   </button>
               </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
