'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Filter, Search, Users, ArrowRightLeft, UserCheck, AlertCircle, CheckSquare, Square, Calendar } from 'lucide-react'
import { toast } from 'react-hot-toast'
import BackButton from '@/components/ui/back-button'
import { Skeleton } from '@/components/ui/skeleton'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'
import { useAdmin } from '@/components/providers/AdminContext'

export default function EnrollmentsPage() {
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()
  const { user, loading: contextLoading } = useAdmin()
  
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [students, setStudents] = useState<any[]>([])
  const [classes, setClasses] = useState<any[]>([])
  const [terms, setTerms] = useState<any[]>([])
  const [currentTermId, setCurrentTermId] = useState<string>('')
  
  // Filters
  const [classFilter, setClassFilter] = useState('all')
  const [termFilter, setTermFilter] = useState('current')
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('active')

  // Selection
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set())

  // Modal State
  const [showTransferModal, setShowTransferModal] = useState(false)
  const [targetClass, setTargetClass] = useState('')
  const [targetStatus, setTargetStatus] = useState('')
  const [actionType, setActionType] = useState<'transfer' | 'status'>('transfer')

  useEffect(() => {
    loadClasses()
    loadTerms()
  }, [])

  useEffect(() => {
    if (!contextLoading) {
      loadStudents()
    }
  }, [classFilter, statusFilter, termFilter, searchTerm, contextLoading, user])

  const loadClasses = async () => {
    const { data } = await supabase
      .from('classes')
      .select('id, name, level')
      .order('level', { ascending: true })
    if (data) setClasses(data)
  }

  const loadTerms = async () => {
    const { data } = await supabase
      .from('academic_terms')
      .select('id, name, academic_year, is_current')
      .order('start_date', { ascending: false })
    
    if (data) {
      setTerms(data)
      const current = data.find((t: any) => t.is_current)
      if (current) setCurrentTermId(current.id)
    }
  }

  const loadStudents = async () => {
    setLoading(true)
    let query = supabase
      .from('students')
      .select(`
        id, 
        first_name, 
        last_name, 
        middle_name,
        student_id, 
        status,
        created_at,
        classes:class_id (id, name)
      `)
      .order('last_name', { ascending: true })

    if (classFilter !== 'all') {
      query = query.eq('class_id', classFilter)
    }
    
    if (statusFilter !== 'all') {
      query = query.eq('status', statusFilter)
    }

    if (searchTerm) {
      query = query.or(`first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%,student_id.ilike.%${searchTerm}%`)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error loading students:', error)
    } else {
      setStudents(data || [])
    }
    setLoading(false)
    // Clear selection on re-filter
    setSelectedStudents(new Set())
  }

  const toggleSelectAll = () => {
    if (selectedStudents.size === students.length) {
      setSelectedStudents(new Set())
    } else {
      setSelectedStudents(new Set(students.map(s => s.id)))
    }
  }

  const toggleStudent = (id: string) => {
    const newSelected = new Set(selectedStudents)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedStudents(newSelected)
  }

  const handleBulkAction = async () => {
    if (selectedStudents.size === 0) return
    setSaving(true)

    try {
      let updateData: any = {}
      
      if (actionType === 'transfer') {
        if (!targetClass) throw new Error('Please select a target class')
        updateData.class_id = targetClass
      } else if (actionType === 'status') {
        if (!targetStatus) throw new Error('Please select a status')
        updateData.status = targetStatus
      }

      const { error } = await supabase
        .from('students')
        .update(updateData)
        .in('id', Array.from(selectedStudents))

      if (error) throw error

      toast.success(`Successfully updated ${selectedStudents.size} students`)
      setShowTransferModal(false)
      loadStudents()
      setSelectedStudents(new Set())
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading && students.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 pb-20">
        <header className="bg-white shadow sticky top-0 z-30">
          <div className="container mx-auto px-4 md:px-6 py-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center space-x-4">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-8 w-48" />
                  <Skeleton className="h-4 w-64" />
                </div>
              </div>
              <Skeleton className="h-12 w-48 rounded-lg" />
            </div>
          </div>
        </header>

        <main className="container mx-auto px-4 md:px-6 py-8">
          <Skeleton className="h-24 w-full mb-6 rounded-lg" />
          
          <div className="space-y-4">
             {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-16 w-full rounded-lg" />
             ))}
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <header className="bg-white shadow sticky top-0 z-30">
        <div className="container mx-auto px-4 md:px-6 py-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center space-x-4">
              <BackButton href="/admin/dashboard" />
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-gray-800">Enrollment Management</h1>
                <p className="text-xs md:text-sm text-gray-600">Bulk transfer and status updates</p>
              </div>
            </div>
            {currentTermId && (
               <div className="bg-blue-50 px-4 py-2 rounded-lg border border-blue-100 flex items-center">
                 <Calendar className="w-5 h-5 text-methodist-blue mr-2" />
                 <div>
                   <p className="text-xs text-blue-600 font-semibold uppercase">Current Term</p>
                   <p className="text-sm font-bold text-gray-800">
                     {terms.find((t: any) => t.id === currentTermId)?.name} {terms.find((t: any) => t.id === currentTermId)?.academic_year}
                   </p>
                 </div>
               </div>
            )}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 md:px-6 py-6 md:py-8">
        {/* Filters */}
        <div className="bg-white p-4 rounded-lg shadow mb-6 flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex flex-col md:flex-row flex-wrap gap-4 w-full md:w-auto">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:flex md:flex-row gap-4 w-full">
              <div className="relative w-full md:w-auto">
                <Filter className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                <select
                  value={classFilter}
                  onChange={(e) => setClassFilter(e.target.value)}
                  className="pl-9 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-methodist-blue text-sm w-full md:w-48 appearance-none bg-white"
                >
                  <option value="all">All Classes</option>
                  {classes.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="relative w-full md:w-auto">
                <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                <select
                  value={termFilter}
                  onChange={(e) => setTermFilter(e.target.value)}
                  className="pl-9 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-methodist-blue text-sm w-full md:w-48 appearance-none bg-white"
                >
                   <option value="current">Current Enrollment</option>
                   {terms.map((t: any) => (
                     <option key={t.id} value={t.id} disabled={t.id !== currentTermId}>
                       {t.name} {t.academic_year} {t.id !== currentTermId && '(Archived)'}
                     </option>
                   ))}
                </select>
              </div>

              <div className="relative w-full md:w-auto">
                <UserCheck className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="pl-9 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-methodist-blue text-sm w-full md:w-48 appearance-none bg-white"
                >
                  <option value="all">All Statuses</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="transferred">Transferred</option>
                  <option value="graduated">Graduated</option>
                </select>
              </div>
            </div>
          </div>

          <div className="relative w-full md:w-64 mt-2 md:mt-0">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search students..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-methodist-blue text-sm w-full"
            />
          </div>
        </div>

        {/* Action Bar (Visible when Selection > 0) */}
        {selectedStudents.size > 0 && (
          <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg mb-6 flex flex-col sm:flex-row items-center justify-between gap-4 animate-in slide-in-from-top-2 sticky top-[72px] z-20 shadow-md md:static md:shadow-none">
            <div className="flex items-center space-x-2 text-methodist-blue font-medium w-full sm:w-auto justify-between sm:justify-start">
              <div className="flex items-center space-x-2">
                <CheckSquare className="w-5 h-5" />
                <span>{selectedStudents.size} selected</span>
              </div>
              <button 
                onClick={() => setSelectedStudents(new Set())}
                className="text-xs text-blue-600 underline sm:hidden"
              >
                Clear
              </button>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <button
                onClick={() => {
                  setActionType('transfer')
                  setShowTransferModal(true)
                }}
                className="px-4 py-2 bg-white border border-blue-200 text-blue-700 rounded-lg hover:bg-blue-100 flex items-center justify-center shadow-sm w-full sm:w-auto"
              >
                <ArrowRightLeft className="w-4 h-4 mr-2" />
                Transfer
              </button>
              <button
                onClick={() => {
                  setActionType('status')
                  setShowTransferModal(true)
                }}
                className="px-4 py-2 bg-white border border-red-200 text-red-700 rounded-lg hover:bg-red-50 flex items-center justify-center shadow-sm w-full sm:w-auto"
              >
                <AlertCircle className="w-4 h-4 mr-2" />
                Status
              </button>
            </div>
          </div>
        )}

        {/* Students Table - Desktop */}
        <div className="hidden md:block bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left w-12">
                    <button 
                      onClick={toggleSelectAll}
                      className="text-gray-500 hover:text-methodist-blue"
                    >
                      {students.length > 0 && selectedStudents.size === students.length ? (
                        <CheckSquare className="w-5 h-5 text-methodist-blue" />
                      ) : (
                        <Square className="w-5 h-5" />
                      )}
                    </button>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Current Class</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {students.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                      <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                      <p>No students found matching filters.</p>
                    </td>
                  </tr>
                ) : (
                  students.map((student) => {
                    const isSelected = selectedStudents.has(student.id)
                    return (
                      <tr key={student.id} className={`hover:bg-gray-50 ${isSelected ? 'bg-blue-50' : ''}`}>
                        <td className="px-6 py-4">
                          <button
                            onClick={() => toggleStudent(student.id)}
                            className="text-gray-500 hover:text-methodist-blue block"
                          >
                            {isSelected ? (
                              <CheckSquare className="w-5 h-5 text-methodist-blue" />
                            ) : (
                              <Square className="w-5 h-5" />
                            )}
                          </button>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-600">
                          {student.student_id}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {student.last_name}, {student.first_name}{student.middle_name ? ` ${student.middle_name}` : ''}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {student.classes?.name || 'Unassigned'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            student.status === 'active' ? 'bg-green-100 text-green-800' :
                            student.status === 'inactive' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {student.status?.toUpperCase()}
                          </span>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Mobile List View */}
        <div className="md:hidden space-y-3">
          <div className="flex items-center justify-between mb-2 px-1">
             <button 
                onClick={toggleSelectAll}
                className="flex items-center text-sm text-gray-600 font-medium"
              >
                {students.length > 0 && selectedStudents.size === students.length ? (
                  <CheckSquare className="w-5 h-5 text-methodist-blue mr-2" />
                ) : (
                  <Square className="w-5 h-5 mr-2" />
                )}
                Select All
            </button>
            <span className="text-xs text-gray-500">{students.length} students found</span>
          </div>

          {students.length === 0 ? (
             <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
                <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>No students found matching filters.</p>
             </div>
          ) : (
             students.map((student) => {
               const isSelected = selectedStudents.has(student.id)
               return (
                 <div 
                   key={student.id} 
                   className={`bg-white rounded-lg shadow p-4 border-l-4 ${
                     isSelected ? 'border-l-methodist-blue ring-1 ring-blue-200' : 'border-l-transparent'
                   } ${
                     student.status === 'active' ? 'border-l-green-500' : 
                     student.status === 'inactive' ? 'border-l-red-500' : 'border-l-gray-300'
                   }`}
                   onClick={() => toggleStudent(student.id)}
                 >
                   <div className="flex items-start justify-between">
                     <div className="flex-1">
                       <h3 className="font-bold text-gray-900">{student.last_name}, {student.first_name}{student.middle_name ? ` ${student.middle_name}` : ''}</h3>
                       <p className="text-xs text-gray-500 font-mono mb-2">{student.student_id}</p>
                       <div className="flex flex-wrap gap-2 text-sm">
                         <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded text-xs font-medium">
                           {student.classes?.name || 'Unassigned'}
                         </span>
                         <span className={`px-2 py-0.5 inline-flex text-xs font-medium rounded ${
                            student.status === 'active' ? 'bg-green-100 text-green-800' :
                            student.status === 'inactive' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {student.status}
                          </span>
                       </div>
                     </div>
                     <div className="ml-3">
                        {isSelected ? (
                          <CheckSquare className="w-6 h-6 text-methodist-blue" />
                        ) : (
                          <Square className="w-6 h-6 text-gray-300" />
                        )}
                     </div>
                   </div>
                 </div>
               )
             })
          )}
        </div>
      </main>

      {/* Action Modal */}
      {(showTransferModal) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4">
              {actionType === 'transfer' ? 'Transfer Students' : 'Update Status'}
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              You are about to update <strong>{selectedStudents.size}</strong> students.
            </p>

            <div className="space-y-4">
              {actionType === 'transfer' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Target Class</label>
                  <select
                    value={targetClass}
                    onChange={(e) => setTargetClass(e.target.value)}
                    className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-methodist-blue"
                  >
                    <option value="">Select Class...</option>
                    {classes.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {actionType === 'status' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">New Status</label>
                  <select
                    value={targetStatus}
                    onChange={(e) => setTargetStatus(e.target.value)}
                    className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-methodist-blue"
                  >
                    <option value="">Select Status...</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="transferred">Transferred</option>
                    <option value="graduated">Graduated</option>
                  </select>
                </div>
              )}

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  onClick={() => setShowTransferModal(false)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  onClick={handleBulkAction}
                  disabled={saving || (actionType === 'transfer' && !targetClass) || (actionType === 'status' && !targetStatus)}
                  className="px-4 py-2 bg-methodist-blue text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? 'Processing...' : 'Confirm Update'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

