'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Search, FileText, Download, Users, Filter, Loader2 } from 'lucide-react'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'
import { Skeleton } from '@/components/ui/skeleton'
import BackButton from '@/components/ui/BackButton'
import { toast } from 'react-hot-toast'

export default function AdminStudentReportsPage() {
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()
  const [loading, setLoading] = useState(true)
  const [classes, setClasses] = useState<any[]>([])
  const [selectedClass, setSelectedClass] = useState('')
  const [terms, setTerms] = useState<any[]>([])
  const [selectedTerm, setSelectedTerm] = useState('')
  const [students, setStudents] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    loadInitialData()
  }, [])

  useEffect(() => {
    if (selectedClass) {
      loadStudents(selectedClass)
    } else {
      setStudents([])
    }
  }, [selectedClass])

  const loadInitialData = async () => {
    try {
      // Fetch all classes
      const { data: classesData } = await supabase
        .from('classes')
        .select('id, name')
        .order('name')
      
      setClasses(classesData || [])
      if (classesData && classesData.length > 0) {
        setSelectedClass(classesData[0].id)
      }

      // Fetch terms
      const { data: termsData } = await supabase
        .from('academic_terms')
        .select('*')
        .order('start_date', { ascending: false })
      
      setTerms(termsData || [])
      // Set current term or first term
      const currentTerm = termsData?.find((t: any) => t.is_current)
      if (currentTerm) {
        setSelectedTerm(currentTerm.id)
      } else if (termsData && termsData.length > 0) {
        setSelectedTerm(termsData[0].id)
      }

    } catch (error) {
      console.error('Error loading initial data:', error)
      toast.error('Failed to load initial data')
    } finally {
      setLoading(false)
    }
  }

  const loadStudents = async (classId: string) => {
    setLoading(true)
    try {
      const { data: studentsData } = await supabase
        .from('students')
        .select(`
          id, 
          first_name, 
          last_name, 
          student_id, 
          gender,
          status
        `)
        .eq('class_id', classId)
        .eq('status', 'active')
        .order('last_name')
      
      setStudents(studentsData || [])
    } catch (error) {
      console.error('Error loading students:', error)
      toast.error('Failed to load students')
    } finally {
      setLoading(false)
    }
  }

  const filteredStudents = students.filter(student => 
    student.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.student_id.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center mb-6">
          <BackButton href="/admin/reports" />
          <div className="ml-4">
            <h1 className="text-2xl font-bold text-gray-800">Student Report Cards</h1>
            <p className="text-gray-600">Generate and view individual student reports</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Academic Term</label>
              <div className="relative">
                <select
                  value={selectedTerm}
                  onChange={(e) => setSelectedTerm(e.target.value)}
                  className="w-full p-2 border rounded-lg appearance-none bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  {terms.map(term => (
                    <option key={term.id} value={term.id}>
                      {term.name} ({term.academic_year})
                    </option>
                  ))}
                </select>
                <Filter className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Class</label>
              <div className="relative">
                <select
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                  className="w-full p-2 border rounded-lg appearance-none bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  {classes.map(cls => (
                    <option key={cls.id} value={cls.id}>{cls.name}</option>
                  ))}
                </select>
                <Users className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Search Student</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Name or ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full p-2 pl-10 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
            </div>
          </div>
        </div>

        {/* Student List */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student Info</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Gender</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <Skeleton className="h-10 w-10 rounded-full" />
                          <div className="ml-4 space-y-2">
                            <Skeleton className="h-4 w-32" />
                            <Skeleton className="h-3 w-20" />
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <Skeleton className="h-4 w-16 mx-auto" />
                      </td>
                      <td className="px-6 py-4 text-center">
                        <Skeleton className="h-6 w-16 rounded-full mx-auto" />
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Skeleton className="h-8 w-24 ml-auto rounded" />
                      </td>
                    </tr>
                  ))
                ) : filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                      No students found in this class
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map(student => (
                    <tr key={student.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
                            {student.first_name[0]}{student.last_name[0]}
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{student.last_name} {student.first_name}</div>
                            <div className="text-sm text-gray-500">{student.student_id}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">
                        {student.gender}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                          Active
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <Link 
                          href={`/admin/reports/student/${student.id}?term=${selectedTerm}`}
                          className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                          <FileText className="w-4 h-4 mr-1" />
                          View Report
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
