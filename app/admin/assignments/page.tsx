'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Users, BookOpen, Plus } from 'lucide-react'
import { getCurrentUser } from '@/lib/auth'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'

export default function AssignmentsPage() {
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()
  const [loading, setLoading] = useState(true)
  const [teachers, setTeachers] = useState<any[]>([])
  const [classes, setClasses] = useState<any[]>([])
  const [subjects, setSubjects] = useState<any[]>([])
  const [assignments, setAssignments] = useState<any[]>([])

  useEffect(() => {
    async function loadData() {
      const user = await getCurrentUser()
      if (!user) {
        router.push('/login?portal=admin')
        return
      }

      // Load teachers
      const { data: teachersData, error: teacherError } = await supabase
        .from('teachers')
        .select('*')
        .eq('status', 'active')
        .order('first_name')

      if (teacherError) {
        console.error('Error loading teachers:', teacherError)
      }
      
      if (teachersData) {
        console.log('Loaded teachers:', teachersData)
        setTeachers(teachersData)
      }

      // Load classes
      const { data: classesData } = await supabase
        .from('classes')
        .select('*')
        .order('name')

      if (classesData) setClasses(classesData)

      // Load subjects
      const { data: subjectsData } = await supabase
        .from('subjects')
        .select('*')
        .order('name')

      if (subjectsData) setSubjects(subjectsData)

      // Load existing assignments (teacher_class_assignments)
      const { data: assignmentsData } = await supabase
        .from('teacher_class_assignments')
        .select(`
          *,
          teachers (first_name, last_name, teacher_id),
          classes (name)
        `)

      if (assignmentsData) setAssignments(assignmentsData)

      setLoading(false)
    }

    loadData()
  }, [router])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-methodist-blue mx-auto mb-4"></div>
          <p className="text-gray-600">Loading assignments...</p>
        </div>
      </div>
    )
  }

  // Group assignments by teacher
  const teacherAssignments = teachers.map(teacher => {
    const teacherClasses = assignments
      .filter(a => a.teacher_id === teacher.id)
      .map(a => a.classes?.name)
      .filter(Boolean)

    return {
      ...teacher,
      assignedClasses: teacherClasses
    }
  })

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="container mx-auto px-4 md:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/admin/dashboard" className="text-ghana-green hover:text-green-700">
                <ArrowLeft className="w-6 h-6" />
              </Link>
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-gray-800">Class & Subject Assignments</h1>
                <p className="text-xs md:text-sm text-gray-600">Manage teacher assignments to classes and subjects</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 md:px-6 py-6 md:py-8">
        {/* Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-blue-800 mb-2 text-sm md:text-base">How to Assign Classes & Subjects</h3>
          <p className="text-xs md:text-sm text-blue-700">
            Click the "Edit Assignments" button next to any teacher to assign them to specific classes and subjects.
            You can assign multiple classes and subjects to each teacher.
          </p>
        </div>

        {/* Teachers List with Assignments */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-base md:text-lg font-bold text-gray-800">Teacher Assignments</h2>
          </div>

          {teacherAssignments.length === 0 ? (
            <div className="p-12 text-center">
              <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-base md:text-lg font-medium text-gray-900 mb-2">No Teachers Found</h3>
              <p className="text-xs md:text-sm text-gray-600 mb-6">
                Please add teachers first before assigning them to classes.
              </p>
              <Link
                href="/admin/teachers/add"
                className="inline-flex items-center px-4 py-2 bg-ghana-green text-white rounded-lg hover:bg-green-700 text-xs md:text-sm"
              >
                <Plus className="w-5 h-5 mr-2" />
                Add Teacher
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {teacherAssignments.map((teacher) => (
                <div key={teacher.id} className="p-6 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-base md:text-lg font-semibold text-gray-800">
                          {teacher.first_name} {teacher.last_name}
                        </h3>
                        <span className="px-2 py-1 text-[10px] md:text-xs font-medium bg-gray-100 text-gray-600 rounded">
                          {teacher.teacher_id}
                        </span>
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-start space-x-2">
                          <Users className="w-4 h-4 text-gray-400 mt-0.5" />
                          <div>
                            <span className="text-xs md:text-sm font-medium text-gray-600">Classes: </span>
                            {teacher.assignedClasses.length > 0 ? (
                              <span className="text-xs md:text-sm text-gray-800">
                                {teacher.assignedClasses.join(', ')}
                              </span>
                            ) : (
                              <span className="text-xs md:text-sm text-gray-500 italic">No classes assigned</span>
                            )}
                          </div>
                        </div>
                        {teacher.specialization && (
                          <div className="flex items-start space-x-2">
                            <BookOpen className="w-4 h-4 text-gray-400 mt-0.5" />
                            <div>
                              <span className="text-xs md:text-sm font-medium text-gray-600">Specialization: </span>
                              <span className="text-xs md:text-sm text-gray-800">{teacher.specialization}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    <Link
                      href={`/admin/teachers/${teacher.teacher_id}`}
                      className="px-4 py-2 bg-methodist-blue text-white rounded-lg hover:bg-blue-700 transition-colors text-xs md:text-sm"
                    >
                      Edit Assignments
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Summary Statistics */}
        {teacherAssignments.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6 mt-6 md:mt-8">
            <div className="bg-white rounded-lg shadow p-4 md:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs md:text-sm text-gray-600">Total Teachers</p>
                  <p className="text-2xl md:text-3xl font-bold text-methodist-blue">{teachers.length}</p>
                </div>
                <Users className="w-12 h-12 text-blue-200" />
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-4 md:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs md:text-sm text-gray-600">Total Classes</p>
                  <p className="text-2xl md:text-3xl font-bold text-ghana-green">{classes.length}</p>
                </div>
                <Users className="w-10 h-10 md:w-12 md:h-12 text-green-200" />
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-4 md:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs md:text-sm text-gray-600">Total Subjects</p>
                  <p className="text-2xl md:text-3xl font-bold text-methodist-gold">{subjects.length}</p>
                </div>
                <BookOpen className="w-10 h-10 md:w-12 md:h-12 text-yellow-200" />
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
