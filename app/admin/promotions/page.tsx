'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Skeleton } from '@/components/ui/skeleton'
import BackButton from '@/components/ui/back-button'
import { toast } from 'react-hot-toast'
import { ArrowLeft, UserCheck, Users, Search, Filter, Check, X, AlertCircle, TrendingUp, Save, Clock, Loader2 } from 'lucide-react'
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
  current_class_id: string
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
  const [promotionChanges, setPromotionChanges] = useState<{[key: string]: { status: string, remarks: string }}>({})
    const [selectedStudents, setSelectedStudents] = useState<string[]>([])
  const [bulkStatus, setBulkStatus] = useState('')
  const [activeTab, setActiveTab] = useState<'manage' | 'pending'>('manage')
  const [pendingDecisions, setPendingDecisions] = useState<any[]>([])
  const [confirming, setConfirming] = useState<string | null>(null)
  const [loadingPending, setLoadingPending] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

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

      // Load all terms for calculating averages
      const { data: termsData } = await supabase
        .from('academic_terms')
        .select('id')
        .eq('academic_year', currentYear) as { data: any[] | null }

      const termIds = termsData?.map(t => t.id) || []

      let scoresMap: {[key: string]: number} = {}
      if (termIds.length > 0) {
        const { data: scoresData } = await supabase
          .from('scores')
          .select('student_id, total')
          .in('term_id', termIds) as { data: any[] | null }

        if (scoresData) {
          // Calculate average per student
          const studentScores: {[key: string]: number[]} = {}
          scoresData.forEach(s => {
            if (!studentScores[s.student_id]) studentScores[s.student_id] = []
            studentScores[s.student_id].push(s.total)
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

    try {
      const user = await getCurrentUser()
      if (!user) throw new Error('Not authenticated')

      const updates = Object.keys(promotionChanges).map(studentId => ({
        studentId,
        ...promotionChanges[studentId]
      })).filter(u => u.status)

      if (updates.length === 0) {
        toast.error('No changes to save')
        setSaving(false)
        return
      }

      // Execute promotion decisions
      for (const update of updates) {
        const { error } = await supabase.rpc('execute_admin_promotion_decision', {
            p_student_id: update.studentId,
            p_academic_year: academicYear,
            p_user_id: user.id,
            p_status: update.status,
            p_remarks: update.remarks || ''
        })

        if (error) throw error
      }

      toast.success(`Saved ${updates.length} promotion decisions!`)
      setPromotionChanges({})
      loadData()
    } catch (error: any) {
      console.error('Error saving promotions:', error)
      toast.error(error.message || 'Failed to save promotions')
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

  async function loadPendingDecisions() {
    setLoadingPending(true)
    try {
      const { data } = await supabase
        .from('student_promotions')
        .select(`
          *,
          students:student_id (
            id, first_name, last_name, student_id,
            classes:class_id (name)
          )
        `)
        .eq('academic_year', academicYear)
        .eq('requires_admin_approval', true)
        .order('decision_date', { ascending: false })

      if (data) {
        setPendingDecisions(data)
      }
    } catch (error: any) {
      console.error('Error loading pending decisions:', error)
    } finally {
      setLoadingPending(false)
    }
  }

  useEffect(() => {
    if (academicYear && activeTab === 'pending') {
      loadPendingDecisions()
    }
  }, [academicYear, activeTab])

  async function handleConfirmDecision(studentId: string, status: string) {
    setConfirming(studentId)
    try {
      const user = await getCurrentUser()
      if (!user) throw new Error('Not authenticated')

      const pendingRecord = pendingDecisions.find(p => p.student_id === studentId)
      const remarks = pendingRecord?.teacher_remarks || ''

      const { error } = await supabase.rpc('execute_admin_promotion_decision', {
        p_student_id: studentId,
        p_academic_year: academicYear,
        p_user_id: user.id,
        p_status: status,
        p_remarks: remarks
      })

      if (error) throw error

      toast.success(`Decision confirmed! Student has been ${status === 'promoted' ? 'promoted' : status === 'repeated' ? 'repeated' : 'graduated'}.`)
      
      // Refresh pending list
      await loadPendingDecisions()
    } catch (error: any) {
      console.error('Error confirming decision:', error)
      toast.error(error.message || 'Failed to confirm decision')
    } finally {
      setConfirming(null)
    }
  }

  async function handleRejectDecision(studentId: string) {
    setConfirming(studentId)
    try {
      const { error } = await supabase
        .from('student_promotions')
        .update({
          requires_admin_approval: false,
          promotion_status: 'pending',
          teacher_remarks: null,
          updated_at: new Date().toISOString()
        })
        .eq('student_id', studentId)
        .eq('academic_year', academicYear)

      if (error) throw error

      toast.success('Teacher decision rejected. Student status reset to pending.')
      await loadPendingDecisions()
    } catch (error: any) {
      console.error('Error rejecting decision:', error)
      toast.error(error.message || 'Failed to reject decision')
    } finally {
      setConfirming(null)
    }
  }

  const handleBulkApply = () => {
    if (!bulkStatus) return
    
    selectedStudents.forEach(studentId => {
      handlePromotionChange(studentId, 'status', bulkStatus)
    })
    
    toast.success(`Applied '${bulkStatus}' to ${selectedStudents.length} students`)
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
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow">
          <div className="container mx-auto px-4 md:px-6 py-4">
            <div className="flex justify-between items-center bg-white">
              <div className="flex items-center gap-4">
                <Skeleton className="w-10 h-10 rounded-full" />
                <div className="space-y-1">
                  <Skeleton className="h-8 w-48" />
                  <Skeleton className="h-4 w-32" />
                </div>
              </div>
              <Skeleton className="w-32 h-10 rounded-lg" />
            </div>
          </div>
        </header>
        <main className="container mx-auto px-4 md:px-6 py-6 md:py-8">
          <div className="bg-white rounded-lg shadow p-4 mb-6">
            <div className="grid md:grid-cols-3 gap-4">
              <Skeleton className="w-full h-10 rounded-lg" />
              <Skeleton className="w-full h-10 rounded-lg" />
              <div className="flex justify-end">
                <Skeleton className="w-32 h-10 rounded-lg" />
              </div>
            </div>
          </div>
          <div className="space-y-8">
            {[1, 2].map((i) => (
              <div key={i} className="mb-8">
                <Skeleton className="h-8 w-48 mb-4" />
                <div className="bg-white rounded-lg shadow overflow-hidden">
                  <div className="divide-y divide-gray-200">
                    {[1, 2, 3, 4].map((j) => (
                      <div key={j} className="p-4 flex gap-4">
                        <Skeleton className="w-4 h-4 rounded mt-1" />
                        <div className="flex-1 space-y-2">
                          <Skeleton className="h-4 w-32" />
                          <Skeleton className="h-3 w-24" />
                        </div>
                        <Skeleton className="h-6 w-16" />
                        <Skeleton className="h-8 w-32" />
                        <Skeleton className="h-8 w-48" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="container mx-auto px-4 md:px-6 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center space-x-4">
              <BackButton href="/admin/dashboard" />
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-gray-800">Student Promotions</h1>
                <p className="text-xs md:text-sm text-gray-600">Manage student promotion decisions for {academicYear}</p>
              </div>
            </div>
            <button
              onClick={handleSaveAll}
              disabled={saving || Object.keys(promotionChanges).length === 0}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center justify-center space-x-2 disabled:opacity-50 w-full sm:w-auto"
            >
              <Save className="w-5 h-5" />
              <span>{saving ? 'Saving...' : 'Save All Changes'}</span>
            </button>
          </div>
        </div>
      </header>

            <main className="container mx-auto px-4 md:px-6 py-6 md:py-8">
        {/* Tabs: Manage All | Pending Teacher Decisions */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setActiveTab('manage')}
              className={`flex-1 md:flex-none px-6 py-3 text-sm font-medium text-center transition-colors ${
                activeTab === 'manage'
                  ? 'border-b-2 border-purple-600 text-purple-700 bg-purple-50'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Users className="w-4 h-4 inline-block mr-2" />
              Manage All Students
            </button>
            <button
              onClick={() => setActiveTab('pending')}
              className={`flex-1 md:flex-none px-6 py-3 text-sm font-medium text-center transition-colors ${
                activeTab === 'pending'
                  ? 'border-b-2 border-amber-500 text-amber-700 bg-amber-50'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Clock className="w-4 h-4 inline-block mr-2" />
              Pending Teacher Decisions
              {pendingDecisions.length > 0 && (
                <span className="ml-2 bg-amber-500 text-white text-xs px-2 py-0.5 rounded-full">
                  {pendingDecisions.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Filters (only in manage tab) */}
        {activeTab === 'manage' && (
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
        )}

        {/* Bulk Actions */}
        {selectedStudents.length > 0 && (
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-6 flex flex-col md:flex-row items-center justify-between gap-4 md:gap-0 animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center space-x-3 w-full md:w-auto justify-center md:justify-start">
              <div className="bg-purple-100 p-2 rounded-full">
                <UserCheck className="w-5 h-5 text-purple-600" />
              </div>
              <span className="font-medium text-purple-900">
                {selectedStudents.length} students selected
              </span>
            </div>
            <div className="flex flex-col md:flex-row items-center space-y-3 md:space-y-0 md:space-x-3 w-full md:w-auto">
              <select
                value={bulkStatus}
                onChange={(e) => setBulkStatus(e.target.value)}
                className="w-full md:w-auto px-3 py-2 border border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500 bg-white"
              >
                <option value="">-- Select Action --</option>
                <option value="promoted">Promote Selected</option>
                <option value="repeated">Repeat Selected</option>
                <option value="graduated">Graduate Selected</option>
              </select>
              <div className="flex items-center space-x-3 w-full md:w-auto">
                <button
                  onClick={handleBulkApply}
                  disabled={!bulkStatus}
                  className="flex-1 md:flex-none bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Apply
                </button>
                <button
                  onClick={() => setSelectedStudents([])}
                  className="flex-1 md:flex-none text-gray-500 hover:text-gray-700 px-3 py-2 text-center"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

                {/* Pending Teacher Decisions Tab */}
        {activeTab === 'pending' && (
          <div>
            {/* Info Banner */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
              <div className="flex items-start space-x-3">
                <Clock className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-amber-900 text-sm md:text-base">Pending Teacher Decisions</h3>
                  <p className="text-amber-800 text-xs md:text-sm mt-1">
                    These students have been reviewed by their class teachers who made promotion recommendations.
                    Review each decision and click <strong>Confirm</strong> to execute the class movement,
                    or <strong>Reject</strong> to send it back for revision.
                  </p>
                </div>
              </div>
            </div>

            {loadingPending ? (
              <div className="bg-white rounded-lg shadow p-12 text-center">
                <Loader2 className="w-10 h-10 text-amber-500 mx-auto mb-4 animate-spin" />
                <p className="text-sm text-gray-600">Loading pending decisions...</p>
              </div>
            ) : pendingDecisions.length === 0 ? (
              <div className="bg-white rounded-lg shadow p-12 text-center">
                <Check className="w-16 h-16 text-green-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Pending Decisions</h3>
                <p className="text-sm text-gray-600">
                  All teacher recommendations have been processed. There are no pending decisions to review.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {pendingDecisions.map((decision) => {
                  const student = decision.students
                  return (
                    <div key={decision.student_id} className="bg-white rounded-lg shadow border border-amber-200 p-4 md:p-6">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3">
                            <div>
                              <h4 className="font-semibold text-gray-900">
                                {student?.first_name} {student?.last_name}
                              </h4>
                              <p className="text-xs text-gray-500">
                                {student?.student_id} | {student?.classes?.name || 'Unknown Class'}
                              </p>
                            </div>
                          </div>
                          <div className="mt-3 flex flex-wrap items-center gap-2">
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                              decision.promotion_status === 'promoted' 
                                ? 'bg-green-100 text-green-800'
                                : decision.promotion_status === 'repeated'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              Teacher recommends: {decision.promotion_status}
                            </span>
                            <span className="text-xs text-gray-500">
                              Decided: {new Date(decision.decision_date).toLocaleDateString('en-GB')}
                            </span>
                          </div>
                          {decision.teacher_remarks && (
                            <p className="mt-2 text-sm text-gray-600 bg-gray-50 rounded p-2 border border-gray-100">
                              <span className="font-medium text-gray-700">Remarks:</span> {decision.teacher_remarks}
                            </p>
                          )}
                        </div>
                        <div className="flex space-x-3">
                          <button
                            onClick={() => handleConfirmDecision(decision.student_id, decision.promotion_status)}
                            disabled={confirming === decision.student_id}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium flex items-center space-x-2 transition-colors"
                          >
                            {confirming === decision.student_id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Check className="w-4 h-4" />
                            )}
                            <span>Confirm</span>
                          </button>
                          <button
                            onClick={() => handleRejectDecision(decision.student_id)}
                            disabled={confirming === decision.student_id}
                            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium flex items-center space-x-2 transition-colors"
                          >
                            <X className="w-4 h-4" />
                            <span>Reject</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Manage All Students Tab */}
        {activeTab === 'manage' && (
          <>
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
                
                {/* Desktop Table View */}
                <div className="hidden md:block bg-white rounded-lg shadow overflow-hidden">
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
                        <th className="px-4 py-3 text-left text-[10px] md:text-xs font-medium text-gray-500 uppercase">Year Avg</th>
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

                {/* Mobile Card View */}
                <div className="md:hidden space-y-4">
                  <div className="flex items-center justify-between bg-white p-3 rounded-lg shadow mb-2">
                    <label className="flex items-center space-x-2 text-sm font-medium text-gray-700">
                      <input
                        type="checkbox"
                        checked={classStudents.every(s => selectedStudents.includes(s.id))}
                        onChange={() => handleSelectAll(classStudents)}
                        className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                      />
                      <span>Select All {className}</span>
                    </label>
                  </div>

                  {classStudents.map((student) => {
                    const currentStatus = promotionChanges[student.id]?.status || student.promotion_status || ''
                    const currentRemarks = promotionChanges[student.id]?.remarks ?? student.teacher_remarks ?? ''
                    const isSelected = selectedStudents.includes(student.id)
                    
                    return (
                      <div key={student.id} className={`bg-white rounded-lg shadow p-4 space-y-3 ${isSelected ? 'ring-2 ring-purple-500 bg-purple-50' : ''}`}>
                        <div className="flex justify-between items-start">
                          <div className="flex items-start space-x-3">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleSelectStudent(student.id)}
                              className="mt-1 w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                            />
                            <div>
                              <div className="font-medium text-gray-900">
                                {student.first_name} {student.last_name}
                              </div>
                              <div className="text-xs text-gray-500">{student.student_id}</div>
                            </div>
                          </div>
                          <div className="flex flex-col items-end">
                            <span className="text-xs text-gray-500 mb-1">Average</span>
                            <span className={`text-sm font-bold ${
                              (student.average_score || 0) >= 50 ? 'text-green-600' :
                              (student.average_score || 0) >= 40 ? 'text-yellow-600' : 'text-red-600'
                            }`}>
                              {(student.average_score || 0).toFixed(1)}%
                            </span>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
                            <div className="flex space-x-2">
                              <select
                                value={currentStatus}
                                onChange={(e) => handlePromotionChange(student.id, 'status', e.target.value)}
                                className={`flex-1 text-sm px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 ${
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
                              <button
                                onClick={() => handleAutoPromote(student.id, student.average_score || 0)}
                                className="px-3 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 text-sm font-medium"
                              >
                                Auto
                              </button>
                            </div>
                          </div>
                          
                          <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">Remarks</label>
                            <input
                              type="text"
                              placeholder="Optional remarks..."
                              value={currentRemarks}
                              onChange={(e) => handlePromotionChange(student.id, 'remarks', e.target.value)}
                              className="w-full text-sm px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                            />
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))
          )}
          </>
        )}
      </main>
    </div>
  )
}
