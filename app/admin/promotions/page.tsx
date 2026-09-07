'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { Skeleton } from '@/components/ui/skeleton'
import BackButton from '@/components/ui/back-button'
import { toast } from 'react-hot-toast'
import {
  ArrowLeft,
  UserCheck,
  Users,
  Search,
  Filter,
  Check,
  X,
  AlertCircle,
  TrendingUp,
  Save,
  Clock,
  Loader2,
  Calendar,
  Sparkles,
  ChevronRight
} from 'lucide-react'
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
  const [loadingClass, setLoadingClass] = useState(false)
  const [saving, setSaving] = useState(false)
  const [students, setStudents] = useState<Student[]>([])
  const [classes, setClasses] = useState<any[]>([])
  const [selectedClassId, setSelectedClassId] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [academicYear, setAcademicYear] = useState('')
  const [availableYears, setAvailableYears] = useState<string[]>([])
  const [priorPendingCount, setPriorPendingCount] = useState(0)
  const [promotionChanges, setPromotionChanges] = useState<{ [key: string]: { status: string; remarks: string } }>({})
  const [selectedStudents, setSelectedStudents] = useState<string[]>([])
  const [bulkStatus, setBulkStatus] = useState('')
  const [activeTab, setActiveTab] = useState<'manage' | 'pending'>('manage')
  const [pendingDecisions, setPendingDecisions] = useState<any[]>([])
  const [confirming, setConfirming] = useState<string | null>(null)
  const [loadingPending, setLoadingPending] = useState(false)
  const [selectedPending, setSelectedPending] = useState<string[]>([])
  const [bulkConfirming, setBulkConfirming] = useState(false)

  // 1. Initial Setup: Load Years and Classes
  useEffect(() => {
    async function initPage() {
      const user = await getCurrentUser()
      if (!user) {
        router.push('/login?portal=admin')
        return
      }

      // Fetch classes
      const { data: classesData } = await supabase
        .from('classes')
        .select('*')
        .order('level') as { data: any[] | null }

      const loadedClasses = classesData || []
      setClasses(loadedClasses)

      // Fetch distinct academic years
      const { data: yearsData } = await supabase
        .from('student_promotions')
        .select('academic_year')
        .order('academic_year', { ascending: false }) as { data: { academic_year: string }[] | null }

      const years = Array.from(new Set((yearsData || []).map(y => y.academic_year).filter(Boolean)))

      const { data: settingsData } = await supabase
        .from('academic_settings')
        .select('current_academic_year')
        .limit(1) as { data: any[] | null }

      const currentYear = settingsData?.[0]?.current_academic_year
      if (currentYear && !years.includes(currentYear)) {
        years.unshift(currentYear)
      }

      setAvailableYears(years)
      const initialYear = currentYear || years[0] || ''
      setAcademicYear(initialYear)

      const initialClass = loadedClasses[0]?.id || ''
      setSelectedClassId(initialClass)

      if (initialClass && initialYear) {
        await loadClassData(initialYear, initialClass, loadedClasses)
      } else {
        setLoading(false)
      }
    }

    initPage()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 2. Optimized Class-Scoped Loader
  const loadClassData = async (targetYear: string, targetClassId: string, currentClasses?: any[]) => {
    if (!targetYear || !targetClassId) {
      setStudents([])
      setLoading(false)
      setLoadingClass(false)
      return
    }

    setLoadingClass(true)
    const classList = currentClasses || classes
    const classInfo = classList.find((c: any) => c.id === targetClassId)

    try {
      // Fetch ONLY students in the selected class
      const { data: studentsData, error: studentError } = await supabase
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
        .eq('class_id', targetClassId)
        .order('first_name') as { data: any[] | null; error: any }

      if (studentError) throw studentError

      const classStudents = studentsData || []
      const studentIds = classStudents.map(s => s.id)

      if (studentIds.length === 0) {
        setStudents([])
        setLoading(false)
        setLoadingClass(false)
        return
      }

      // Fetch Terms for this year
      const { data: termsData } = await supabase
        .from('academic_terms')
        .select('id')
        .eq('academic_year', targetYear) as { data: any[] | null }

      const termIds = termsData?.map(t => t.id) || []
      const numberOfTerms = termIds.length || 1

      // Fetch existing promotion records ONLY for this cohort
      const { data: promotionsData } = await supabase
        .from('student_promotions')
        .select('*')
        .eq('academic_year', targetYear)
        .in('student_id', studentIds) as { data: PromotionRecord[] | null }

      // Compute subject count ONLY for this class
      let subjectCount = 0
      if (classInfo) {
        const cLevel = classInfo.level
        let levelCategory = ''
        if (typeof cLevel === 'string') {
          levelCategory = cLevel.toLowerCase()
        } else if (typeof cLevel === 'number') {
          if (cLevel >= 1 && cLevel <= 2) levelCategory = 'kindergarten'
          else if (cLevel >= 3 && cLevel <= 5) levelCategory = 'lower_primary'
          else if (cLevel >= 6 && cLevel <= 8) levelCategory = 'upper_primary'
          else if (cLevel >= 9) levelCategory = 'jhs'
        }

        if (levelCategory) {
          const { data: subjectData } = await supabase
            .from('subjects')
            .select('id')
            .eq('level', levelCategory)

          if (subjectData && subjectData.length > 0) {
            subjectCount = subjectData.length
          } else {
            const { data: classSubjectsData } = await supabase
              .from('class_subjects')
              .select('subject_id')
              .eq('class_id', targetClassId)
              .eq('academic_year', targetYear)

            if (classSubjectsData && classSubjectsData.length > 0) {
              subjectCount = classSubjectsData.length
            } else if (termIds.length > 0) {
              const { data: derivedSubjects } = await supabase
                .from('scores')
                .select('subject_id')
                .in('term_id', termIds)
                .in('student_id', studentIds)

              if (derivedSubjects && derivedSubjects.length > 0) {
                subjectCount = new Set(derivedSubjects.map((d: any) => d.subject_id)).size
              }
            }
          }
        }
      }

      // Fetch scores ONLY for this cohort across the terms
      const scoresMap: { [key: string]: number } = {}
      if (termIds.length > 0) {
        const { data: scoresData } = await supabase
          .from('scores')
          .select('student_id, total')
          .in('term_id', termIds)
          .in('student_id', studentIds) as { data: any[] | null }

        if (scoresData) {
          scoresData.forEach(s => {
            scoresMap[s.student_id] = (scoresMap[s.student_id] || 0) + (s.total || 0)
          })
        }
      }

      // Merge results
      const divisor = (subjectCount * numberOfTerms) || 1
      const mergedStudents = classStudents.map(student => {
        const promotion = promotionsData?.find(p => p.student_id === student.id)
        const totalScore = scoresMap[student.id] || 0
        const average = totalScore / divisor

        return {
          ...student,
          average_score: average,
          promotion_status: promotion?.promotion_status || '',
          teacher_remarks: promotion?.teacher_remarks || ''
        }
      })

      setStudents(mergedStudents)
    } catch (err: any) {
      console.error('Error loading class data:', err)
      toast.error('Failed to load class promotions')
    } finally {
      setLoading(false)
      setLoadingClass(false)
    }
  }

  const handleClassChange = async (newClassId: string) => {
    setSelectedClassId(newClassId)
    setPromotionChanges({})
    setSelectedStudents([])
    await loadClassData(academicYear, newClassId)
  }

  const handleYearChange = async (newYear: string) => {
    if (!newYear || newYear === academicYear) return
    setAcademicYear(newYear)
    setPromotionChanges({})
    setSelectedStudents([])
    setSelectedPending([])
    await loadClassData(newYear, selectedClassId)

    if (activeTab === 'pending') {
      await loadPendingDecisions(newYear)
    }
    await refreshPriorPendingCount(newYear)
  }

  const getAutoPromotion = (average: number): string => {
    return average >= 30 ? 'promoted' : 'repeated'
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
      await loadClassData(academicYear, selectedClassId)
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

  const handleSelectAll = (cohortStudents: Student[]) => {
    const cohortIds = cohortStudents.map(s => s.id)
    const allSelected = cohortIds.every(id => selectedStudents.includes(id))

    if (allSelected) {
      setSelectedStudents(prev => prev.filter(id => !cohortIds.includes(id)))
    } else {
      setSelectedStudents(prev => [...new Set([...prev, ...cohortIds])])
    }
  }

  const handleSelectStudent = (studentId: string) => {
    setSelectedStudents(prev =>
      prev.includes(studentId)
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    )
  }

  async function loadPendingDecisions(year?: string) {
    const targetYear = year || academicYear
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
        .eq('academic_year', targetYear)
        .eq('requires_admin_approval', true)
        .order('decision_date', { ascending: false })

      if (data) setPendingDecisions(data)
    } catch (error: any) {
      console.error('Error loading pending decisions:', error)
    } finally {
      setLoadingPending(false)
    }
  }

  async function refreshPriorPendingCount(year?: string) {
    const currentYear = year || academicYear
    try {
      const { data } = await supabase
        .from('student_promotions')
        .select('academic_year')
        .eq('requires_admin_approval', true)
      const pending = (data || [])
        .map((r: any) => r.academic_year)
        .filter((y: string) => y && y !== currentYear)
      setPriorPendingCount(new Set(pending).size)
    } catch (error) {
      console.error('Error counting prior-year pending decisions:', error)
    }
  }

  useEffect(() => {
    refreshPriorPendingCount()
  }, [academicYear])

  useEffect(() => {
    if (activeTab === 'pending' && academicYear) {
      loadPendingDecisions()
    }
  }, [activeTab, academicYear])

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

      toast.success(`Decision confirmed! Student updated.`)
      await loadPendingDecisions()
      await loadClassData(academicYear, selectedClassId)
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

      toast.success('Teacher decision rejected. Reset to pending.')
      await loadPendingDecisions()
    } catch (error: any) {
      console.error('Error rejecting decision:', error)
      toast.error(error.message || 'Failed to reject decision')
    } finally {
      setConfirming(null)
    }
  }

  const handleSelectPendingDecision = (studentId: string) => {
    setSelectedPending(prev =>
      prev.includes(studentId)
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    )
  }

  const handleSelectAllPending = () => {
    const allIds = pendingDecisions.map(d => d.student_id)
    const allSelected = allIds.length > 0 && allIds.every(id => selectedPending.includes(id))
    setSelectedPending(allSelected ? [] : allIds)
  }

  async function handleBulkConfirmPending() {
    if (selectedPending.length === 0) return
    setBulkConfirming(true)
    try {
      const user = await getCurrentUser()
      if (!user) throw new Error('Not authenticated')

      let confirmed = 0
      for (const studentId of selectedPending) {
        const record = pendingDecisions.find(p => p.student_id === studentId)
        if (!record) continue
        const { error } = await supabase.rpc('execute_admin_promotion_decision', {
          p_student_id: studentId,
          p_academic_year: academicYear,
          p_user_id: user.id,
          p_status: record.promotion_status,
          p_remarks: record.teacher_remarks || ''
        })
        if (error) throw error
        confirmed++
      }

      toast.success(`Confirmed ${confirmed} decisions!`)
      setSelectedPending([])
      await loadPendingDecisions()
      await loadClassData(academicYear, selectedClassId)
      refreshPriorPendingCount(academicYear)
    } catch (error: any) {
      console.error('Error confirming decisions:', error)
      toast.error(error.message || 'Failed to confirm selected')
    } finally {
      setBulkConfirming(false)
    }
  }

  async function handleBulkRejectPending() {
    if (selectedPending.length === 0) return
    setBulkConfirming(true)
    try {
      let rejected = 0
      for (const studentId of selectedPending) {
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
        rejected++
      }

      toast.success(`Rejected ${rejected} teacher decisions.`)
      setSelectedPending([])
      await loadPendingDecisions()
      refreshPriorPendingCount(academicYear)
    } catch (error: any) {
      console.error('Error rejecting decisions:', error)
      toast.error(error.message || 'Failed to reject decisions')
    } finally {
      setBulkConfirming(false)
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
    return (
      student.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.student_id.toLowerCase().includes(searchTerm.toLowerCase())
    )
  })

  const currentClassName = classes.find(c => c.id === selectedClassId)?.name || 'Class'

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50/50">
        <header className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <Skeleton className="w-10 h-10 rounded-full" />
                <div className="space-y-1.5">
                  <Skeleton className="h-6 w-44" />
                  <Skeleton className="h-3.5 w-32" />
                </div>
              </div>
              <Skeleton className="w-36 h-10 rounded-xl" />
            </div>
          </div>
        </header>
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
          <Skeleton className="w-full h-14 rounded-2xl" />
          <Skeleton className="h-64 w-full rounded-2xl" />
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50/50 pb-24 font-sans text-gray-900">
      {/* Top Navigation */}
      <header className="bg-white border-b border-gray-200/80 sticky top-0 z-30 shadow-sm backdrop-blur-md bg-white/95">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 sm:py-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center space-x-3 sm:space-x-4">
              <BackButton href="/admin/dashboard" className="shrink-0 shadow-sm" />
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
                  <UserCheck className="w-6 h-6 text-[#003B5C] shrink-0" />
                  <span>Student Promotions</span>
                </h1>
                <p className="text-xs sm:text-sm text-gray-500 font-medium">
                  Review and promote cohorts for{' '}
                  <span className="font-bold text-[#003B5C]">{academicYear || 'current session'}</span>
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full md:w-auto">
              <div className="relative flex-1 sm:w-48">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                <select
                  value={academicYear}
                  onChange={(e) => handleYearChange(e.target.value)}
                  className="w-full pl-9 pr-8 py-2 text-xs sm:text-sm font-bold border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#003B5C] focus:border-[#003B5C] bg-gray-50/80 appearance-none shadow-sm cursor-pointer outline-none transition-all"
                  aria-label="Select academic year"
                >
                  {availableYears.length === 0 && <option value="">Select year</option>}
                  {availableYears.map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 text-xs">▼</div>
              </div>

              <button
                onClick={handleSaveAll}
                disabled={saving || Object.keys(promotionChanges).length === 0}
                className="inline-flex items-center justify-center gap-2 bg-[#003B5C] hover:bg-[#002a42] text-white px-5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all shadow-md active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                <span>{saving ? 'Saving Decisions...' : 'Save Decisions'}</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Prior Year Pending Alert */}
      {priorPendingCount > 0 && (
        <div className="bg-amber-50/90 border-b border-amber-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
            <div className="flex items-start sm:items-center space-x-3">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5 sm:mt-0" />
              <p className="text-amber-900 text-xs sm:text-sm leading-relaxed">
                <strong>Attention:</strong> You have unconfirmed promotion decisions in{' '}
                <span className="font-bold underline underline-offset-2">
                  {priorPendingCount} previous academic {priorPendingCount === 1 ? 'session' : 'sessions'}
                </span>. Switch the session year above to review and finalize them.
              </p>
            </div>
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-8 space-y-6">
        {/* Navigation Tabs */}
        <div className="bg-white rounded-2xl p-1.5 shadow-sm border border-gray-200/80 flex w-full sm:w-fit overflow-x-auto gap-1">
          <button
            onClick={() => setActiveTab('manage')}
            className={`flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${
              activeTab === 'manage'
                ? 'bg-[#003B5C] text-white shadow-md'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Class Promotions</span>
          </button>
          <button
            onClick={() => setActiveTab('pending')}
            className={`flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${
              activeTab === 'pending'
                ? 'bg-[#003B5C] text-white shadow-md'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Pending Teacher Decisions</span>
            {pendingDecisions.length > 0 && (
              <span className={`ml-1 text-[11px] px-2 py-0.5 rounded-full font-black ${
                activeTab === 'pending' ? 'bg-white text-[#003B5C]' : 'bg-amber-100 text-amber-800'
              }`}>
                {pendingDecisions.length}
              </span>
            )}
          </button>
        </div>

        {/* Tab 1: Manage Class Promotions */}
        {activeTab === 'manage' && (
          <>
            {/* Scoped Filter Header */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200/80 p-3.5 sm:p-5">
              <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
                
                {/* Search Bar */}
                <div className="relative flex-1">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder={`Search within ${currentClassName}...`}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm font-medium border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#003B5C] focus:border-[#003B5C] bg-gray-50/70 text-gray-900 outline-none transition-all"
                  />
                </div>

                {/* Class Selector */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                  <div className="relative sm:w-56">
                    <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    <select
                      value={selectedClassId}
                      onChange={(e) => handleClassChange(e.target.value)}
                      className="w-full pl-9 pr-8 py-2.5 text-xs sm:text-sm font-bold border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#003B5C] focus:border-[#003B5C] bg-white text-gray-800 appearance-none shadow-sm cursor-pointer outline-none"
                    >
                      {classes.map(cls => (
                        <option key={cls.id} value={cls.id}>{cls.name}</option>
                      ))}
                    </select>
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 text-xs">▼</div>
                  </div>

                  <div className="px-3.5 py-2.5 bg-gray-100 rounded-xl text-xs font-bold text-gray-600 whitespace-nowrap text-center">
                    <span className="text-[#003B5C]">{filteredStudents.length}</span> students enrolled
                  </div>
                </div>
              </div>
            </div>

            {/* Bulk Actions Bar */}
            {selectedStudents.length > 0 && (
              <div className="bg-[#003B5C]/10 border border-[#003B5C]/30 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2">
                <div className="flex items-center space-x-2.5 text-xs sm:text-sm font-bold text-[#003B5C]">
                  <div className="bg-[#003B5C] text-white p-1.5 rounded-lg">
                    <UserCheck className="w-4 h-4" />
                  </div>
                  <span>{selectedStudents.length} students selected</span>
                </div>

                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                  <select
                    value={bulkStatus}
                    onChange={(e) => setBulkStatus(e.target.value)}
                    className="flex-1 sm:flex-initial px-3 py-2 text-xs font-bold border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#003B5C] bg-white text-gray-800 outline-none"
                  >
                    <option value="">-- Apply Action --</option>
                    <option value="promoted">Promote Selected</option>
                    <option value="repeated">Repeat Selected</option>
                    <option value="graduated">Graduate Selected</option>
                  </select>

                  <button
                    onClick={handleBulkApply}
                    disabled={!bulkStatus}
                    className="bg-[#003B5C] hover:bg-[#002a42] text-white px-4 py-2 rounded-xl text-xs font-bold disabled:opacity-50 transition-all shadow-sm"
                  >
                    Apply
                  </button>
                  <button
                    onClick={() => setSelectedStudents([])}
                    className="px-3 py-2 text-xs font-bold text-gray-500 hover:text-gray-800"
                  >
                    Clear
                  </button>
                </div>
              </div>
            )}

            {/* Students Table / Grid */}
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <h2 className="text-base sm:text-lg font-black text-gray-900 flex items-center gap-2">
                  <Users className="w-5 h-5 text-[#003B5C]" />
                  <span>{currentClassName}</span>
                  <span className="text-xs font-bold text-gray-400">({students.length})</span>
                </h2>

                <label className="flex items-center space-x-2 text-xs font-bold text-gray-600 cursor-pointer select-none bg-white px-3 py-1.5 rounded-xl border border-gray-200 shadow-sm">
                  <input
                    type="checkbox"
                    checked={students.length > 0 && students.every(s => selectedStudents.includes(s.id))}
                    onChange={() => handleSelectAll(students)}
                    className="w-4 h-4 rounded text-[#003B5C] focus:ring-[#003B5C] border-gray-300"
                  />
                  <span>Select all</span>
                </label>
              </div>

              {loadingClass ? (
                <div className="bg-white rounded-2xl p-12 text-center border border-gray-200 shadow-sm">
                  <Loader2 className="w-8 h-8 text-[#003B5C] mx-auto mb-3 animate-spin" />
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Loading {currentClassName} records...</p>
                </div>
              ) : filteredStudents.length === 0 ? (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-12 text-center space-y-2">
                  <Users className="w-12 h-12 text-gray-300 mx-auto" />
                  <h3 className="text-base font-bold text-gray-800">No active students in {currentClassName}</h3>
                  <p className="text-xs text-gray-500">Pick another class from the dropdown to manage promotions.</p>
                </div>
              ) : (
                <>
                  {/* Desktop Table (≥ md) */}
                  <div className="hidden md:block bg-white rounded-2xl shadow-sm border border-gray-200/80 overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse min-w-[700px]">
                        <thead>
                          <tr className="bg-gray-50/80 border-b border-gray-200 text-[11px] font-black text-gray-400 uppercase tracking-wider">
                            <th className="p-4 w-10 text-center">#</th>
                            <th className="p-4">Student</th>
                            <th className="p-4">Annual Average</th>
                            <th className="p-4">Promotion Decision</th>
                            <th className="p-4">Remarks</th>
                            <th className="p-4 text-right">Auto</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 text-xs sm:text-sm font-medium">
                          {filteredStudents.map((student) => {
                            const currentStatus = promotionChanges[student.id]?.status || student.promotion_status || ''
                            const currentRemarks = promotionChanges[student.id]?.remarks ?? student.teacher_remarks ?? ''
                            const isSelected = selectedStudents.includes(student.id)

                            return (
                              <tr
                                key={student.id}
                                className={`hover:bg-gray-50/70 transition-colors ${
                                  isSelected ? 'bg-blue-50/30' : ''
                                }`}
                              >
                                <td className="p-4 text-center">
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => handleSelectStudent(student.id)}
                                    className="w-4 h-4 rounded text-[#003B5C] focus:ring-[#003B5C] border-gray-300 cursor-pointer"
                                  />
                                </td>
                                <td className="p-4 whitespace-nowrap">
                                  <div className="font-bold text-gray-900">
                                    {student.first_name} {student.last_name}
                                  </div>
                                  <div className="text-[11px] text-gray-400 font-mono mt-0.5">
                                    {student.student_id}
                                  </div>
                                </td>
                                <td className="p-4 whitespace-nowrap">
                                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-black ${
                                    (student.average_score || 0) >= 30
                                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                                      : 'bg-rose-50 text-rose-700 border border-rose-200/60'
                                  }`}>
                                    {(student.average_score || 0).toFixed(1)}%
                                  </span>
                                </td>
                                <td className="p-4 whitespace-nowrap">
                                  <select
                                    value={currentStatus}
                                    onChange={(e) => handlePromotionChange(student.id, 'status', e.target.value)}
                                    className={`text-xs font-bold px-3 py-1.5 rounded-xl border focus:ring-2 focus:ring-[#003B5C] outline-none shadow-sm cursor-pointer transition-all ${
                                      currentStatus === 'promoted'
                                        ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                                        : currentStatus === 'repeated'
                                        ? 'bg-rose-50 border-rose-300 text-rose-800'
                                        : currentStatus === 'graduated'
                                        ? 'bg-blue-50 border-blue-300 text-[#003B5C]'
                                        : 'bg-white border-gray-200 text-gray-700'
                                    }`}
                                  >
                                    <option value="">-- Decision --</option>
                                    <option value="promoted">Promoted</option>
                                    <option value="repeated">Repeated</option>
                                    <option value="graduated">Graduated</option>
                                    <option value="pending">Pending</option>
                                  </select>
                                </td>
                                <td className="p-4">
                                  <input
                                    type="text"
                                    placeholder="Add notes/remarks..."
                                    value={currentRemarks}
                                    onChange={(e) => handlePromotionChange(student.id, 'remarks', e.target.value)}
                                    className="w-full text-xs px-3 py-1.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#003B5C] outline-none bg-gray-50/50 focus:bg-white"
                                  />
                                </td>
                                <td className="p-4 text-right whitespace-nowrap">
                                  <button
                                    onClick={() => handleAutoPromote(student.id, student.average_score || 0)}
                                    className="px-3 py-1.5 bg-[#003B5C]/10 text-[#003B5C] hover:bg-[#003B5C]/20 border border-[#003B5C]/20 rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95"
                                    title="Auto-calculate based on marks"
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

                  {/* Mobile Cards (< md) */}
                  <div className="md:hidden space-y-3">
                    {filteredStudents.map((student) => {
                      const currentStatus = promotionChanges[student.id]?.status || student.promotion_status || ''
                      const currentRemarks = promotionChanges[student.id]?.remarks ?? student.teacher_remarks ?? ''
                      const isSelected = selectedStudents.includes(student.id)

                      return (
                        <div
                          key={student.id}
                          className={`bg-white rounded-2xl shadow-sm border p-4 space-y-3.5 transition-all ${
                            isSelected ? 'border-[#003B5C] ring-2 ring-[#003B5C]/20 bg-blue-50/20' : 'border-gray-200'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-start space-x-3 min-w-0">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => handleSelectStudent(student.id)}
                                className="w-4 h-4 rounded text-[#003B5C] focus:ring-[#003B5C] border-gray-300 mt-1"
                              />
                              <div className="min-w-0">
                                <h4 className="font-bold text-sm text-gray-900 truncate">
                                  {student.first_name} {student.last_name}
                                </h4>
                                <p className="text-xs text-gray-400 font-mono mt-0.5">
                                  {student.student_id}
                                </p>
                              </div>
                            </div>

                            <span className={`px-2.5 py-1 rounded-full text-xs font-black shrink-0 ${
                              (student.average_score || 0) >= 30
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                                : 'bg-rose-50 text-rose-700 border border-rose-200/60'
                            }`}>
                              Avg: {(student.average_score || 0).toFixed(1)}%
                            </span>
                          </div>

                          <div className="space-y-2 pt-1 border-t border-gray-100 text-xs">
                            <div className="flex items-center gap-2">
                              <div className="flex-1">
                                <label className="block text-[10px] font-black uppercase text-gray-400 mb-1 tracking-wider">
                                  Decision
                                </label>
                                <select
                                  value={currentStatus}
                                  onChange={(e) => handlePromotionChange(student.id, 'status', e.target.value)}
                                  className={`w-full text-xs font-bold px-3 py-2 rounded-xl border focus:ring-2 focus:ring-[#003B5C] outline-none shadow-sm ${
                                    currentStatus === 'promoted'
                                      ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                                      : currentStatus === 'repeated'
                                      ? 'bg-rose-50 border-rose-300 text-rose-800'
                                      : currentStatus === 'graduated'
                                      ? 'bg-blue-50 border-blue-300 text-[#003B5C]'
                                      : 'bg-white border-gray-200 text-gray-700'
                                  }`}
                                >
                                  <option value="">-- Decision --</option>
                                  <option value="promoted">Promoted</option>
                                  <option value="repeated">Repeated</option>
                                  <option value="graduated">Graduated</option>
                                  <option value="pending">Pending</option>
                                </select>
                              </div>

                              <div className="shrink-0 self-end">
                                <button
                                  onClick={() => handleAutoPromote(student.id, student.average_score || 0)}
                                  className="px-3.5 py-2 bg-[#003B5C] hover:bg-[#002a42] text-white rounded-xl text-xs font-bold shadow-sm transition-all active:scale-95"
                                >
                                  Auto
                                </button>
                              </div>
                            </div>

                            <div>
                              <label className="block text-[10px] font-black uppercase text-gray-400 mb-1 tracking-wider">
                                Remarks
                              </label>
                              <input
                                type="text"
                                placeholder="Remarks..."
                                value={currentRemarks}
                                onChange={(e) => handlePromotionChange(student.id, 'remarks', e.target.value)}
                                className="w-full text-xs px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#003B5C] outline-none bg-gray-50/50"
                              />
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </>
              )}
            </div>
          </>
        )}

        {/* Tab 2: Pending Decisions rendered above */}
      </main>
    </div>
  )
}