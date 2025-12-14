'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, UserCheck, Users, Search, Filter, Check, X, AlertCircle, TrendingUp, Save } from 'lucide-react'
import { getCurrentUser } from '@/lib/auth'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'

interface Student {
  id: string
  student_id: string
  first_name: string
  last_name: string
  class_id: string
  average_score?: number
  promotion_status?: string
  teacher_remarks?: string
}

interface PromotionRecord {
  student_id: string
  academic_year: string
  promotion_status: string
  teacher_remarks: string
}

export default function PromotionsPage() {
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [students, setStudents] = useState<Student[]>([])
  const [classes, setClasses] = useState<any[]>([])
  const [classFilter, setClassFilter] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [academicYear, setAcademicYear] = useState('')
  const [message, setMessage] = useState({ type: '', text: '' })
  const [promotionChanges, setPromotionChanges] = useState<{[key: string]: { status: string, remarks: string }}>({})
  const [selectedStudents, setSelectedStudents] = useState<string[]>([])
  const [bulkStatus, setBulkStatus] = useState('')

  useEffect(() => {
    loadData()
  }, [router])

  async function loadData() {
    const user = await getCurrentUser()
    if (!user) {
      router.push('/login?portal=admin')
      return
    }

    // Get current academic year
    const { data: settingsData } = await supabase
      .from('academic_settings')
      .select('current_academic_year')
      .limit(1) as { data: any[] | null }

    const currentYear = settingsData?.[0]?.current_academic_year || '2024/2025'
    setAcademicYear(currentYear)

    // Load classes
    const { data: classesData } = await supabase
      .from('classes')
      .select('*')
      .order('level') as { data: any[] | null }

    if (classesData) setClasses(classesData)

    // Load students with their term 3 scores
    const { data: studentsData } = await supabase
      .from('students')
      .select(`
        id,
        student_id,
        first_name,
        last_name,
        class_id,
        classes:class_id(name)
      `)
      .eq('status', 'active')
      .order('first_name') as { data: any[] | null }

    if (studentsData) {
      // Load existing promotion records
      const { data: promotionsData } = await supabase
        .from('student_promotions')
        .select('*')
        .eq('academic_year', currentYear) as { data: PromotionRecord[] | null }

      // Load term 3 scores for calculating averages
      const { data: termsData } = await supabase
        .from('academic_terms')
        .select('id')
        .eq('academic_year', currentYear)
        .ilike('name', '%3%') as { data: any[] | null }

      const term3Id = termsData?.[0]?.id

      let scoresMap: {[key: string]: number} = {}
      if (term3Id) {
        const { data: scoresData } = await supabase
          .from('scores')
          .select('student_id, score')
          .eq('term_id', term3Id) as { data: any[] | null }

        if (scoresData) {
          // Calculate average per student
          const studentScores: {[key: string]: number[]} = {}
          scoresData.forEach(s => {
            if (!studentScores[s.student_id]) studentScores[s.student_id] = []
            studentScores[s.student_id].push(s.score)
          })
          
          Object.keys(studentScores).forEach(studentId => {
            const scores = studentScores[studentId]
            scoresMap[studentId] = scores.reduce((a, b) => a + b, 0) / scores.length
          })
        }
      }

      // Merge data
      const studentsWithPromotion = studentsData.map(student => {
        const promotion = promotionsData?.find(p => p.student_id === student.id)
        return {
          ...student,
          average_score: scoresMap[student.id] || 0,
          promotion_status: promotion?.promotion_status || '',
          teacher_remarks: promotion?.teacher_remarks || ''
        }
      })

      setStudents(studentsWithPromotion)
    }

    setLoading(false)
  }

  const getAutoPromotion = (average: number): string => {
    if (average >= 50) return 'promoted'
    if (average >= 40) return 'promoted' // On trial
    return 'repeated'
  }

  const handlePromotionChange = (studentId: string, field: 'status' | 'remarks', value: string) => {
    setPromotionChanges(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [field]: value
      }
    }))
  }

  const handleSaveAll = async () => {
    setSaving(true)
    setMessage({ type: '', text: '' })

    try {
      const updates: PromotionRecord[] = []
      
      Object.keys(promotionChanges).forEach(studentId => {
        const change = promotionChanges[studentId]
        if (change.status) {
          updates.push({
            student_id: studentId,
            academic_year: academicYear,
            promotion_status: change.status,
            teacher_remarks: change.remarks || ''
          })
        }
      })

      if (updates.length === 0) {
        setMessage({ type: 'error', text: 'No changes to save' })
        setSaving(false)
        return
      }

      // Upsert promotion records
      for (const update of updates) {
        const { error } = await supabase
          .from('student_promotions')
          .upsert(update, { 
            onConflict: 'student_id,academic_year'
          })

        if (error) throw error
      }

      setMessage({ type: 'success', text: `Saved ${updates.length} promotion decisions!` })
      setPromotionChanges({})
      loadData()
    } catch (error: any) {
      console.error('Error saving promotions:', error)
      setMessage({ type: 'error', text: error.message || 'Failed to save promotions' })
    } finally {
      setSaving(false)
    }
  }

  const handleAutoPromote = (studentId: string, average: number) => {
    const status = getAutoPromotion(average)
    handlePromotionChange(studentId, 'status', status)
  }

  const handleSelectAll = (classStudents: Student[]) => {
    const classStudentIds = classStudents.map(s => s.id)
    const allSelected = classStudentIds.every(id => selectedStudents.includes(id))

    if (allSelected) {
      setSelectedStudents(prev => prev.filter(id => !classStudentIds.includes(id)))
    } else {
      setSelectedStudents(prev => [...new Set([...prev, ...classStudentIds])])
    }
  }

  const handleSelectStudent = (studentId: string) => {
    setSelectedStudents(prev => 
      prev.includes(studentId) 
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    )
  }

  const handleBulkApply = () => {
    if (!bulkStatus) return
    
    selectedStudents.forEach(studentId => {
      handlePromotionChange(studentId, 'status', bulkStatus)
    })
    
    setMessage({ type: 'success', text: `Applied '${bulkStatus}' to ${selectedStudents.length} students` })
    setBulkStatus('')
    setSelectedStudents([])
  }

  const filteredStudents = students.filter(student => {
    const matchesSearch = 
      student.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.student_id.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesClass = classFilter === 'all' || student.class_id === classFilter

    return matchesSearch && matchesClass
  })

  // Group by class
  const groupedStudents = filteredStudents.reduce((acc, student) => {
    const className = (student as any).classes?.name || 'Unknown'
    if (!acc[className]) acc[className] = []
    acc[className].push(student)
    return acc
  }, {} as Record<string, Student[]>)

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-methodist-blue"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/admin/dashboard" className="text-purple-600 hover:text-purple-700">
                <ArrowLeft className="w-6 h-6" />
              </Link>
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-gray-800">Student Promotions</h1>
                <p className="text-xs md:text-sm text-gray-600">Manage student promotion decisions for {academicYear}</p>
              </div>
            </div>
            <button
              onClick={handleSaveAll}
              disabled={saving || Object.keys(promotionChanges).length === 0}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center space-x-2 disabled:opacity-50"
            >
              <Save className="w-5 h-5" />
              <span>{saving ? 'Saving...' : 'Save All Changes'}</span>
            </button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        {message.text && (
          <div className={`mb-6 p-4 rounded-lg flex items-center space-x-2 ${
            message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
          }`}>
            {message.type === 'success' ? <Check className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
            <span className="text-xs md:text-sm">{message.text}</span>
            <button onClick={() => setMessage({ type: '', text: '' })} className="ml-auto">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Info Banner */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-start space-x-3">
            <TrendingUp className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <h3 className="font-semibold text-blue-800 text-sm md:text-base">Promotion Guidelines</h3>
              <ul className="text-xs md:text-sm text-blue-700 mt-1 space-y-1">
                <li>• Students with 50% and above average: <strong>Promoted</strong></li>
                <li>• Students with 40-49% average: <strong>Promoted on Trial</strong></li>
                <li>• Students below 40%: <strong>To Repeat Class</strong></li>
                <li>• Use "Auto" button to apply automatic promotion based on scores</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="grid md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search students..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div className="relative">
              <Filter className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
              <select
                value={classFilter}
                onChange={(e) => setClassFilter(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 appearance-none"
              >
                <option value="all">All Classes</option>
                {classes.map(cls => (
                  <option key={cls.id} value={cls.id}>{cls.name}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center justify-end">
              <span className="text-gray-600">
                <strong>{filteredStudents.length}</strong> students
              </span>
            </div>
          </div>
        </div>

        {/* Bulk Actions */}
        {selectedStudents.length > 0 && (
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-6 flex items-center justify-between animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center space-x-3">
              <div className="bg-purple-100 p-2 rounded-full">
                <UserCheck className="w-5 h-5 text-purple-600" />
              </div>
              <span className="font-medium text-purple-900">
                {selectedStudents.length} students selected
              </span>
            </div>
            <div className="flex items-center space-x-3">
              <select
                value={bulkStatus}
                onChange={(e) => setBulkStatus(e.target.value)}
                className="px-3 py-2 border border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500 bg-white"
              >
                <option value="">-- Select Action --</option>
                <option value="promoted">Promote Selected</option>
                <option value="repeated">Repeat Selected</option>
                <option value="graduated">Graduate Selected</option>
              </select>
              <button
                onClick={handleBulkApply}
                disabled={!bulkStatus}
                className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Apply
              </button>
              <button
                onClick={() => setSelectedStudents([])}
                className="text-gray-500 hover:text-gray-700 px-3 py-2"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Student Promotions */}
        {Object.keys(groupedStudents).length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-base md:text-lg font-medium text-gray-900 mb-2">No students found</h3>
            <p className="text-xs md:text-sm text-gray-600">Try adjusting your search or filters</p>
          </div>
        ) : (
          Object.entries(groupedStudents).map(([className, classStudents]) => (
            <div key={className} className="mb-8">
              <h2 className="text-base md:text-lg font-bold text-gray-800 mb-4 flex items-center">
                <Users className="w-5 h-5 mr-2 text-purple-600" />
                {className}
                <span className="ml-2 text-xs md:text-sm font-normal text-gray-500">({classStudents.length} students)</span>
              </h2>
              
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-4 py-3 text-left">
                        <input
                          type="checkbox"
                          checked={classStudents.every(s => selectedStudents.includes(s.id))}
                          onChange={() => handleSelectAll(classStudents)}
                          className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                        />
                      </th>
                      <th className="px-4 py-3 text-left text-[10px] md:text-xs font-medium text-gray-500 uppercase">Student</th>
                      <th className="px-4 py-3 text-left text-[10px] md:text-xs font-medium text-gray-500 uppercase">Term 3 Avg</th>
                      <th className="px-4 py-3 text-left text-[10px] md:text-xs font-medium text-gray-500 uppercase">Promotion Status</th>
                      <th className="px-4 py-3 text-left text-[10px] md:text-xs font-medium text-gray-500 uppercase">Remarks</th>
                      <th className="px-4 py-3 text-left text-[10px] md:text-xs font-medium text-gray-500 uppercase">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {classStudents.map((student) => {
                      const currentStatus = promotionChanges[student.id]?.status || student.promotion_status || ''
                      const currentRemarks = promotionChanges[student.id]?.remarks ?? student.teacher_remarks ?? ''
                      const isSelected = selectedStudents.includes(student.id)
                      
                      return (
                        <tr key={student.id} className={`hover:bg-gray-50 ${isSelected ? 'bg-purple-50' : ''}`}>
                          <td className="px-4 py-3">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleSelectStudent(student.id)}
                              className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-xs md:text-sm font-medium text-gray-900">
                              {student.first_name} {student.last_name}
                            </div>
                            <div className="text-[10px] md:text-xs text-gray-500">{student.student_id}</div>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`text-xs md:text-sm font-semibold ${
                              (student.average_score || 0) >= 50 ? 'text-green-600' :
                              (student.average_score || 0) >= 40 ? 'text-yellow-600' : 'text-red-600'
                            }`}>
                              {(student.average_score || 0).toFixed(1)}%
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <select
                              value={currentStatus}
                              onChange={(e) => handlePromotionChange(student.id, 'status', e.target.value)}
                              className={`text-xs md:text-sm px-3 py-1.5 border rounded-lg focus:ring-2 focus:ring-purple-500 ${
                                currentStatus === 'promoted' ? 'bg-green-50 border-green-300' :
                                currentStatus === 'repeated' ? 'bg-red-50 border-red-300' :
                                currentStatus === 'graduated' ? 'bg-blue-50 border-blue-300' :
                                'bg-white border-gray-300'
                              }`}
                            >
                              <option value="">-- Select --</option>
                              <option value="promoted">Promoted</option>
                              <option value="repeated">Repeated</option>
                              <option value="graduated">Graduated</option>
                              <option value="pending">Pending</option>
                            </select>
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="text"
                              placeholder="Optional remarks..."
                              value={currentRemarks}
                              onChange={(e) => handlePromotionChange(student.id, 'remarks', e.target.value)}
                              className="text-xs md:text-sm px-3 py-1.5 border border-gray-300 rounded-lg w-full focus:ring-2 focus:ring-purple-500"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <button
                              onClick={() => handleAutoPromote(student.id, student.average_score || 0)}
                              className="text-[10px] md:text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded hover:bg-purple-200"
                              title="Auto-assign based on average"
                            >
                              Auto
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))
        )}
      </main>
    </div>
  )
}
