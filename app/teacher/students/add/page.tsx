'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  UserPlus,
  Upload,
  Users,
  Download,
  AlertCircle,
  CheckCircle,
  XCircle,
  Calendar,
  Phone,
  Mail,
  FileSpreadsheet,
  RotateCcw,
  Sparkles,
  Loader2,
  X
} from 'lucide-react'
import { getCurrentUser, getTeacherData } from '@/lib/auth'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'
import { getTeacherClassAccess, isTeacherAssignedToClass } from '@/lib/teacher-permissions'
import { toast } from 'react-hot-toast'
import BackButton from '@/components/ui/back-button'

interface TeacherClass {
  class_id: string
  class_name: string
  level: string
}

export default function AddStudentPage() {
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [teacherClasses, setTeacherClasses] = useState<TeacherClass[]>([])
  const [activeTab, setActiveTab] = useState<'manual' | 'csv'>('manual')
  const [teacher, setTeacher] = useState<any>(null)

  // Manual form state
  const [manualFormData, setManualFormData] = useState({
    first_name: '',
    middle_name: '',
    last_name: '',
    date_of_birth: '',
    gender: '',
    class_id: '',
    guardian_name: '',
    guardian_phone: '',
    guardian_email: ''
  })
  const [submitting, setSubmitting] = useState(false)
  const [submitSuccess, setSubmitSuccess] = useState(false)
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  
  // Duplicate-detection modal state
  const [duplicateModal, setDuplicateModal] = useState<{ show: boolean; candidate: any | null }>({ show: false, candidate: null })
  const [checkingDuplicate, setCheckingDuplicate] = useState(false)

  // CSV upload state
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [selectedClassId, setSelectedClassId] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadResults, setUploadResults] = useState<{
    success: number
    failed: number
    errors: string[]
  } | null>(null)

  useEffect(() => {
    async function loadData() {
      try {
        setError(null)
        const user = await getCurrentUser()
        if (!user) {
          router.push('/login?portal=teacher')
          return
        }

        const { data: teacherData, error: teacherError } = await getTeacherData(user.id)
        if (teacherError || !teacherData) {
          setError('Teacher profile not found. Please contact an administrator.')
          setLoading(false)
          return
        }

        setTeacher(teacherData)

        // Load teacher's assigned classes (only classes where they are designated class teacher)
        const classAccess = await getTeacherClassAccess(teacherData.profile_id)
        const classTeacherClasses = classAccess.filter((c: any) => c.is_class_teacher)

        if (classTeacherClasses.length === 0) {
          setError('You are not registered as a Class Teacher for any cohort. Only class teachers can enroll new students.')
          setLoading(false)
          return
        }

        const formattedClasses = classTeacherClasses.map((c: any) => ({
          class_id: c.class_id,
          class_name: c.class_name,
          level: c.level
        }))

        setTeacherClasses(formattedClasses)
        if (formattedClasses.length === 1) {
          setManualFormData((prev) => ({ ...prev, class_id: formattedClasses[0].class_id }))
          setSelectedClassId(formattedClasses[0].class_id)
        }

        setLoading(false)
      } catch (err: any) {
        console.error('Error loading data:', err)
        setError(err.message || 'Failed to initialize enrollment page.')
        setLoading(false)
      }
    }

    loadData()
  }, [router])

  function validateManualForm(): boolean {
    const errors: Record<string, string> = {}

    if (!manualFormData.first_name.trim()) errors.first_name = 'First name is required'
    if (!manualFormData.last_name.trim()) errors.last_name = 'Last name is required'
    if (!manualFormData.date_of_birth) {
      errors.date_of_birth = 'Date of birth is required'
    } else {
      const dob = new Date(manualFormData.date_of_birth)
      const today = new Date()
      if (dob > today) {
        errors.date_of_birth = 'Date of birth cannot be in the future'
      }
      const age = today.getFullYear() - dob.getFullYear()
      if (age < 3 || age > 25) {
        errors.date_of_birth = 'Student age must be between 3 and 25 years'
      }
    }
    if (!manualFormData.gender) errors.gender = 'Gender selection is required'
    if (!manualFormData.class_id) errors.class_id = 'Please select a class'
    
    if (manualFormData.guardian_phone && !/^[\d\s\-+()]+$/.test(manualFormData.guardian_phone)) {
      errors.guardian_phone = 'Please enter a valid phone number'
    }
    if (manualFormData.guardian_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(manualFormData.guardian_email)) {
      errors.guardian_email = 'Please enter a valid email address'
    }

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  async function findExistingStudent(first: string, last: string) {
    if (!first || !last) return null
    const qFirst = first.trim()
    const qLast = last.trim()

    const { data } = await supabase
      .from('students')
      .select('id, first_name, middle_name, last_name, student_id, gender, status, graduated_at, classes(id, name)')
      .ilike('first_name', qFirst)
      .ilike('last_name', qLast)
      .neq('status', 'active')
      .limit(1)

    return data?.[0] || null
  }

  async function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!teacher) return
    await performInsert(false)
  }

  async function handleReactivateExisting() {
    const candidate = duplicateModal.candidate
    if (!candidate) return

    setCheckingDuplicate(true)
    try {
      const updates: any = {
        status: 'active',
        class_id: manualFormData.class_id
      }
      if (candidate.status === 'graduated') {
        updates.graduated_at = null
      }
      const { error } = await supabase
        .from('students')
        .update(updates)
        .eq('id', candidate.id)

      if (error) throw error

      toast.success('Student re-activated with historical records intact')
      setDuplicateModal({ show: false, candidate: null })
      setManualFormData({
        first_name: '',
        middle_name: '',
        last_name: '',
        date_of_birth: '',
        gender: '',
        class_id: teacherClasses.length === 1 ? teacherClasses[0].class_id : '',
        guardian_name: '',
        guardian_phone: '',
        guardian_email: ''
      })
      setFormErrors({})
      setSubmitSuccess(true)
      setTimeout(() => setSubmitSuccess(false), 5000)
    } catch (error: any) {
      console.error('Error reactivating student:', error)
      toast.error('Failed to re-activate student: ' + error.message)
    } finally {
      setCheckingDuplicate(false)
    }
  }

  function handleProceedAsNew() {
    setDuplicateModal({ show: false, candidate: null })
    performInsert(true)
  }

  async function performInsert(skipDuplicateCheck = false) {
    if (!teacher) return
    if (!validateManualForm()) return

    setSubmitting(true)
    setSubmitSuccess(false)

    try {
      if (!skipDuplicateCheck) {
        setCheckingDuplicate(true)
        const existing = await findExistingStudent(manualFormData.first_name, manualFormData.last_name)
        setCheckingDuplicate(false)
        if (existing) {
          setSubmitting(false)
          setDuplicateModal({ show: true, candidate: existing })
          return
        }
      }

      const isAssigned = await isTeacherAssignedToClass(teacher.id, manualFormData.class_id)
      if (!isAssigned) {
        setFormErrors({ class_id: 'You are not assigned to manage this class' })
        setSubmitting(false)
        return
      }

      const response = await fetch('/api/students/bulk-upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          students: [
            {
              first_name: manualFormData.first_name.trim(),
              middle_name: manualFormData.middle_name.trim() || null,
              last_name: manualFormData.last_name.trim(),
              date_of_birth: manualFormData.date_of_birth,
              gender: manualFormData.gender,
              guardian_name: manualFormData.guardian_name.trim() || null,
              guardian_phone: manualFormData.guardian_phone.trim() || null,
              guardian_email: manualFormData.guardian_email.trim() || null
            }
          ],
          classId: manualFormData.class_id
        })
      })

      const result = await response.json()

      if (!response.ok || result.failed > 0) {
        throw new Error(result.errors?.[0] || result.error || 'Failed to enroll student')
      }

      setSubmitSuccess(true)
      setManualFormData({
        first_name: '',
        middle_name: '',
        last_name: '',
        date_of_birth: '',
        gender: '',
        class_id: teacherClasses.length === 1 ? teacherClasses[0].class_id : '',
        guardian_name: '',
        guardian_phone: '',
        guardian_email: ''
      })
      setFormErrors({})

      setTimeout(() => setSubmitSuccess(false), 5000)
    } catch (error: any) {
      console.error('Error adding student:', error)
      setFormErrors({ submit: error.message || 'Failed to add student. Please try again.' })
    } finally {
      setSubmitting(false)
    }
  }

  function parseDate(dateStr: string): string | null {
    if (!dateStr) return null
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr
    
    const ddmmyyyy = dateStr.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/)
    if (ddmmyyyy) {
      const day = ddmmyyyy[1].padStart(2, '0')
      const month = ddmmyyyy[2].padStart(2, '0')
      const year = ddmmyyyy[3]
      return `${year}-${month}-${day}`
    }

    const ddmmyy = dateStr.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2})$/)
    if (ddmmyy) {
      const day = ddmmyy[1].padStart(2, '0')
      const month = ddmmyy[2].padStart(2, '0')
      const year = '20' + ddmmyy[3]
      return `${year}-${month}-${day}`
    }

    return null
  }

  async function handleCsvUpload() {
    if (!csvFile || !selectedClassId || !teacher) {
      setFormErrors({ csv: 'Please select both an assigned class and a valid CSV file.' })
      return
    }

    if (!csvFile.name.endsWith('.csv')) {
      setFormErrors({ csv: 'Please upload a file with a .csv extension.' })
      return
    }

    if (csvFile.size > 5 * 1024 * 1024) {
      setFormErrors({ csv: 'File size exceeds maximum limit of 5MB.' })
      return
    }

    setUploading(true)
    setUploadResults(null)
    setFormErrors({})

    try {
      const isAssigned = await isTeacherAssignedToClass(teacher.id, selectedClassId)
      if (!isAssigned) {
        setFormErrors({ csv: 'You are not assigned to manage this class.' })
        setUploading(false)
        return
      }

      const text = await csvFile.text()
      const lines = text.split('\n').filter((line) => line.trim())

      if (lines.length < 2) {
        setFormErrors({ csv: 'CSV file must contain at least a header row and one student entry.' })
        setUploading(false)
        return
      }

      const headers = lines[0].split(',').map((h) => h.trim().toLowerCase())
      const requiredHeaders = ['first_name', 'last_name', 'gender']
      const missingHeaders = requiredHeaders.filter(
        (h) =>
          !headers.some(
            (header) =>
              header === h ||
              (h === 'first_name' && header === 'firstname') ||
              (h === 'last_name' && header === 'lastname')
          )
      )

      if (missingHeaders.length > 0) {
        setFormErrors({ csv: `Missing required column headers: ${missingHeaders.join(', ')}` })
        setUploading(false)
        return
      }

      const studentsData: any[] = []
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map((v) => v.trim())
        const student: any = {}

        headers.forEach((header, index) => {
          const value = values[index]
          switch (header) {
            case 'first_name':
            case 'firstname':
              student.first_name = value
              break
            case 'middle_name':
            case 'middlename':
              student.middle_name = value || null
              break
            case 'last_name':
            case 'lastname':
              student.last_name = value
              break
            case 'date_of_birth':
            case 'dob':
              student.date_of_birth = parseDate(value)
              break
            case 'gender':
              student.gender = value.toLowerCase()
              break
            case 'guardian_name':
              student.guardian_name = value || null
              break
            case 'guardian_phone':
            case 'phone':
              student.guardian_phone = value || null
              break
            case 'guardian_email':
            case 'email':
              student.guardian_email = value || null
              break
          }
        })

        if (student.first_name && student.last_name) {
          studentsData.push(student)
        }
      }

      // Auto-compute missing DOB based on cohort mode
      const validDobYears = studentsData
        .map((s) => (s.date_of_birth ? new Date(s.date_of_birth).getFullYear() : null))
        .filter((y) => y !== null) as number[]

      let defaultYear = new Date().getFullYear() - 10
      if (validDobYears.length > 0) {
        const frequency: Record<number, number> = {}
        let maxFreq = 0
        let mode = validDobYears[0]

        for (const year of validDobYears) {
          frequency[year] = (frequency[year] || 0) + 1
          if (frequency[year] > maxFreq) {
            maxFreq = frequency[year]
            mode = year
          }
        }
        defaultYear = mode
      }

      studentsData.forEach((student) => {
        if (!student.date_of_birth) {
          student.date_of_birth = `${defaultYear}-01-01`
        }
      })

      const response = await fetch('/api/students/bulk-upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          students: studentsData,
          classId: selectedClassId
        })
      })

      const results = await response.json()

      if (!response.ok) {
        setFormErrors({ csv: results.error || 'Upload could not be completed.' })
        setUploading(false)
        return
      }

      setUploadResults(results)
      if (results.success > 0) {
        setCsvFile(null)
      }
    } catch (error: any) {
      console.error('Error processing CSV:', error)
      setFormErrors({ csv: error.message || 'Failed to process CSV file.' })
      setUploadResults(null)
    } finally {
      setUploading(false)
    }
  }

  function downloadTemplate() {
    const template = `first_name,middle_name,last_name,date_of_birth,gender,guardian_name,guardian_phone,guardian_email\nJohn,,Doe,2012-05-15,male,Jane Doe,0241234567,jane@email.com\nMary,Ann,Smith,2013-03-20,female,,,`
    const blob = new Blob([template], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'student_enrollment_template.csv'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50/50 dark:bg-gray-900 pb-20">
        <header className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 shadow-sm sticky top-0 z-30">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" />
              <div className="space-y-1.5 flex-1">
                <div className="h-6 w-40 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
                <div className="h-4 w-56 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
              </div>
            </div>
          </div>
        </header>
        <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
          <div className="h-14 w-full bg-white dark:bg-gray-800 rounded-2xl animate-pulse" />
          <div className="h-96 w-full bg-white dark:bg-gray-800 rounded-3xl animate-pulse" />
        </main>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50/50 dark:bg-gray-900 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl border border-gray-100 dark:border-gray-700 p-6 sm:p-8 max-w-md w-full text-center space-y-4">
          <div className="w-14 h-14 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 rounded-2xl mx-auto flex items-center justify-center">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h2 className="text-lg sm:text-xl font-black text-gray-900 dark:text-white">Enrollment Restricted</h2>
          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{error}</p>
          <div className="flex flex-col sm:flex-row gap-2 pt-2">
            <button
              onClick={() => window.location.reload()}
              className="flex-1 py-2.5 px-4 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-xl font-bold text-xs hover:bg-gray-200 transition"
            >
              Retry
            </button>
            <Link
              href="/teacher/dashboard"
              className="flex-1 py-2.5 px-4 bg-[#003B5C] text-white rounded-xl font-bold text-xs hover:bg-[#002a42] transition flex items-center justify-center"
            >
              Dashboard
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50/50 dark:bg-gray-900 pb-24 font-sans text-gray-900 dark:text-gray-100">
      {/* Sticky Header Banner */}
      <header className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-md border-b border-gray-200/80 dark:border-gray-800 sticky top-0 z-30 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3.5 sm:py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center space-x-3 sm:space-x-4 min-w-0">
              <BackButton href="/teacher/students" className="shrink-0 shadow-sm" />
              <div className="min-w-0">
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-gray-900 dark:text-white flex items-center gap-2 truncate">
                  <UserPlus className="w-6 h-6 text-[#003B5C] dark:text-blue-400 shrink-0" />
                  <span>Enroll Students</span>
                </h1>
                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 font-medium truncate">
                  Register new learners into your assigned classroom cohorts
                </p>
              </div>
            </div>

            <div className="hidden sm:flex items-center gap-2">
              <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-800 px-3 py-1 rounded-full">
                Class Teacher Mode
              </span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-3 sm:px-6 py-5 sm:py-8 space-y-6">
        {/* Responsive Segmented Switcher */}
        <div className="bg-gray-200/60 dark:bg-gray-800/80 p-1.5 rounded-2xl flex gap-1.5 shadow-inner">
          <button
            type="button"
            onClick={() => setActiveTab('manual')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 sm:py-3 px-4 rounded-xl font-bold text-xs sm:text-sm transition-all duration-200 ${
              activeTab === 'manual'
                ? 'bg-white dark:bg-gray-700 text-[#003B5C] dark:text-blue-300 shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            <UserPlus className="w-4 h-4 shrink-0" />
            <span>Single Student Form</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('csv')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 sm:py-3 px-4 rounded-xl font-bold text-xs sm:text-sm transition-all duration-200 ${
              activeTab === 'csv'
                ? 'bg-white dark:bg-gray-700 text-[#003B5C] dark:text-blue-300 shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            <Upload className="w-4 h-4 shrink-0" />
            <span>Bulk CSV Import</span>
          </button>
        </div>

        {/* Tab 1: Manual Registration Form */}
        {activeTab === 'manual' && (
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-200/80 dark:border-gray-700 p-5 sm:p-7 md:p-8 space-y-6">
            {submitSuccess && (
              <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-4 flex items-start gap-3 animate-in fade-in">
                <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <div className="text-xs sm:text-sm">
                  <p className="text-emerald-800 dark:text-emerald-300 font-bold">Student registered successfully!</p>
                  <p className="text-emerald-700 dark:text-emerald-400 mt-0.5">
                    Credentials have been generated. You may register another student below.
                  </p>
                </div>
              </div>
            )}

            {formErrors.submit && (
              <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-2xl p-4 flex items-start gap-3 animate-in fade-in">
                <XCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                <p className="text-xs sm:text-sm text-rose-800 dark:text-rose-300 font-medium">{formErrors.submit}</p>
              </div>
            )}

            <form onSubmit={handleManualSubmit} className="space-y-6">
              {/* Section: Personal Identification */}
              <div className="space-y-4">
                <div className="border-b border-gray-100 dark:border-gray-700 pb-2">
                  <h3 className="text-xs font-black uppercase tracking-wider text-[#003B5C] dark:text-blue-400">
                    1. Student Identity
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5 sm:gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                      First Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={manualFormData.first_name}
                      onChange={(e) => {
                        setManualFormData({ ...manualFormData, first_name: e.target.value })
                        if (formErrors.first_name) setFormErrors({ ...formErrors, first_name: '' })
                      }}
                      placeholder="e.g. Kwesi"
                      className={`w-full px-3.5 py-2.5 sm:py-3 text-xs sm:text-sm border rounded-xl bg-gray-50/50 dark:bg-gray-900/50 focus:bg-white dark:focus:bg-gray-900 focus:ring-2 focus:ring-[#003B5C] outline-none transition font-medium ${
                        formErrors.first_name ? 'border-rose-300 bg-rose-50/50' : 'border-gray-200 dark:border-gray-700'
                      }`}
                    />
                    {formErrors.first_name && <p className="text-rose-600 text-xs mt-1 font-semibold">{formErrors.first_name}</p>}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                      Middle Name <span className="text-gray-400 font-normal">(Optional)</span>
                    </label>
                    <input
                      type="text"
                      value={manualFormData.middle_name}
                      onChange={(e) => setManualFormData({ ...manualFormData, middle_name: e.target.value })}
                      placeholder="e.g. Mensah"
                      className="w-full px-3.5 py-2.5 sm:py-3 text-xs sm:text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50/50 dark:bg-gray-900/50 focus:bg-white dark:focus:bg-gray-900 focus:ring-2 focus:ring-[#003B5C] outline-none transition font-medium"
                    />
                  </div>

                  <div className="sm:col-span-2 md:col-span-1">
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                      Last Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={manualFormData.last_name}
                      onChange={(e) => {
                        setManualFormData({ ...manualFormData, last_name: e.target.value })
                        if (formErrors.last_name) setFormErrors({ ...formErrors, last_name: '' })
                      }}
                      placeholder="e.g. Annan"
                      className={`w-full px-3.5 py-2.5 sm:py-3 text-xs sm:text-sm border rounded-xl bg-gray-50/50 dark:bg-gray-900/50 focus:bg-white dark:focus:bg-gray-900 focus:ring-2 focus:ring-[#003B5C] outline-none transition font-medium ${
                        formErrors.last_name ? 'border-rose-300 bg-rose-50/50' : 'border-gray-200 dark:border-gray-700'
                      }`}
                    />
                    {formErrors.last_name && <p className="text-rose-600 text-xs mt-1 font-semibold">{formErrors.last_name}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                      Date of Birth <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={manualFormData.date_of_birth}
                      max={new Date().toISOString().split('T')[0]}
                      onChange={(e) => {
                        setManualFormData({ ...manualFormData, date_of_birth: e.target.value })
                        if (formErrors.date_of_birth) setFormErrors({ ...formErrors, date_of_birth: '' })
                      }}
                      className={`w-full px-3.5 py-2.5 sm:py-3 text-xs sm:text-sm border rounded-xl bg-gray-50/50 dark:bg-gray-900/50 focus:bg-white dark:focus:bg-gray-900 focus:ring-2 focus:ring-[#003B5C] outline-none transition font-medium ${
                        formErrors.date_of_birth ? 'border-rose-300 bg-rose-50/50' : 'border-gray-200 dark:border-gray-700'
                      }`}
                    />
                    {formErrors.date_of_birth && <p className="text-rose-600 text-xs mt-1 font-semibold">{formErrors.date_of_birth}</p>}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                      Gender <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={manualFormData.gender}
                      onChange={(e) => {
                        setManualFormData({ ...manualFormData, gender: e.target.value })
                        if (formErrors.gender) setFormErrors({ ...formErrors, gender: '' })
                      }}
                      className={`w-full px-3.5 py-2.5 sm:py-3 text-xs sm:text-sm border rounded-xl bg-gray-50/50 dark:bg-gray-900/50 focus:bg-white dark:focus:bg-gray-900 focus:ring-2 focus:ring-[#003B5C] outline-none transition font-medium cursor-pointer ${
                        formErrors.gender ? 'border-rose-300 bg-rose-50/50' : 'border-gray-200 dark:border-gray-700'
                      }`}
                    >
                      <option value="">Select Gender</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                    </select>
                    {formErrors.gender && <p className="text-rose-600 text-xs mt-1 font-semibold">{formErrors.gender}</p>}
                  </div>
                </div>
              </div>

              {/* Section: Academic Class Placement */}
              <div className="space-y-4">
                <div className="border-b border-gray-100 dark:border-gray-700 pb-2">
                  <h3 className="text-xs font-black uppercase tracking-wider text-[#003B5C] dark:text-blue-400">
                    2. Class Allocation
                  </h3>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                    Target Class Cohort <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={manualFormData.class_id}
                    onChange={(e) => {
                      setManualFormData({ ...manualFormData, class_id: e.target.value })
                      if (formErrors.class_id) setFormErrors({ ...formErrors, class_id: '' })
                    }}
                    className={`w-full px-3.5 py-2.5 sm:py-3 text-xs sm:text-sm border rounded-xl bg-gray-50/50 dark:bg-gray-900/50 focus:bg-white dark:focus:bg-gray-900 focus:ring-2 focus:ring-[#003B5C] outline-none transition font-medium cursor-pointer ${
                      formErrors.class_id ? 'border-rose-300 bg-rose-50/50' : 'border-gray-200 dark:border-gray-700'
                    }`}
                  >
                    <option value="">Select an Assigned Class</option>
                    {teacherClasses.map((cls) => (
                      <option key={cls.class_id} value={cls.class_id}>
                        {cls.class_name}
                      </option>
                    ))}
                  </select>
                  {formErrors.class_id && <p className="text-rose-600 text-xs mt-1 font-semibold">{formErrors.class_id}</p>}
                </div>
              </div>

              {/* Section: Guardian Information */}
              <div className="space-y-4">
                <div className="border-b border-gray-100 dark:border-gray-700 pb-2">
                  <h3 className="text-xs font-black uppercase tracking-wider text-[#003B5C] dark:text-blue-400">
                    3. Guardian & Emergency Contact (Optional)
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">Guardian Name</label>
                    <input
                      type="text"
                      value={manualFormData.guardian_name}
                      onChange={(e) => setManualFormData({ ...manualFormData, guardian_name: e.target.value })}
                      placeholder="e.g. George Annan"
                      className="w-full px-3.5 py-2.5 sm:py-3 text-xs sm:text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50/50 dark:bg-gray-900/50 focus:bg-white dark:focus:bg-gray-900 focus:ring-2 focus:ring-[#003B5C] outline-none transition font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">Phone Number</label>
                    <input
                      type="tel"
                      value={manualFormData.guardian_phone}
                      onChange={(e) => {
                        setManualFormData({ ...manualFormData, guardian_phone: e.target.value })
                        if (formErrors.guardian_phone) setFormErrors({ ...formErrors, guardian_phone: '' })
                      }}
                      placeholder="024XXXXXXX"
                      className="w-full px-3.5 py-2.5 sm:py-3 text-xs sm:text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50/50 dark:bg-gray-900/50 focus:bg-white dark:focus:bg-gray-900 focus:ring-2 focus:ring-[#003B5C] outline-none transition font-mono"
                    />
                    {formErrors.guardian_phone && <p className="text-rose-600 text-xs mt-1">{formErrors.guardian_phone}</p>}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">Email Address</label>
                    <input
                      type="email"
                      value={manualFormData.guardian_email}
                      onChange={(e) => {
                        setManualFormData({ ...manualFormData, guardian_email: e.target.value })
                        if (formErrors.guardian_email) setFormErrors({ ...formErrors, guardian_email: '' })
                      }}
                      placeholder="guardian@example.com"
                      className="w-full px-3.5 py-2.5 sm:py-3 text-xs sm:text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50/50 dark:bg-gray-900/50 focus:bg-white dark:focus:bg-gray-900 focus:ring-2 focus:ring-[#003B5C] outline-none transition font-medium"
                    />
                    {formErrors.guardian_email && <p className="text-rose-600 text-xs mt-1">{formErrors.guardian_email}</p>}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-700">
                <Link
                  href="/teacher/students"
                  className="w-full sm:w-auto px-5 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl text-xs sm:text-sm font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 text-center transition"
                >
                  Cancel
                </Link>
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full sm:w-auto px-6 py-2.5 bg-[#003B5C] hover:bg-[#002a42] text-white rounded-xl text-xs sm:text-sm font-bold shadow-md hover:shadow-lg flex items-center justify-center gap-2 transition active:scale-95 disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Verifying & Enrolling...</span>
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4" />
                      <span>Complete Enrollment</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Tab 2: Bulk CSV Upload */}
        {activeTab === 'csv' && (
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-200/80 dark:border-gray-700 p-5 sm:p-7 md:p-8 space-y-6">
            {formErrors.csv && (
              <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-2xl p-4 flex items-start gap-3 animate-in fade-in">
                <XCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                <p className="text-xs sm:text-sm text-rose-800 dark:text-rose-300 font-medium">{formErrors.csv}</p>
              </div>
            )}

            {/* Instruction Checklist Card */}
            <div className="bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-800 rounded-2xl p-4 sm:p-5 space-y-2 text-xs sm:text-sm text-blue-950 dark:text-blue-200">
              <h3 className="font-bold flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-[#003B5C] dark:text-blue-400" />
                <span>Formatting Guidelines</span>
              </h3>
              <ul className="list-disc list-inside space-y-1 text-xs text-blue-900/80 dark:text-blue-300/90 pl-1">
                <li>Required columns: <code className="font-mono bg-blue-100 dark:bg-blue-900 px-1 py-0.5 rounded">first_name</code>, <code className="font-mono bg-blue-100 dark:bg-blue-900 px-1 py-0.5 rounded">last_name</code>, <code className="font-mono bg-blue-100 dark:bg-blue-900 px-1 py-0.5 rounded">gender</code></li>
                <li>Date of birth format: <span className="font-mono font-bold">YYYY-MM-DD</span> (e.g. 2014-04-20)</li>
                <li>Gender values: <span className="font-bold">male</span> or <span className="font-bold">female</span></li>
                <li>Maximum batch payload size: 5MB</li>
              </ul>
            </div>

            {/* Template Download Option */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-gray-50/70 dark:bg-gray-900/50 p-4 rounded-2xl border border-gray-100 dark:border-gray-700">
              <div>
                <p className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white">Sample CSV Template</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Download formatted columns with dummy student records</p>
              </div>
              <button
                type="button"
                onClick={downloadTemplate}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 text-[#003B5C] dark:text-blue-400 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-bold hover:bg-gray-50 dark:hover:bg-gray-700 transition shadow-sm"
              >
                <Download className="w-4 h-4" />
                <span>Download Template (.csv)</span>
              </button>
            </div>

            <div className="space-y-4">
              {/* Cohort Select */}
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                  Select Destination Class <span className="text-rose-500">*</span>
                </label>
                <select
                  value={selectedClassId}
                  onChange={(e) => {
                    setSelectedClassId(e.target.value)
                    if (formErrors.csv) setFormErrors({ ...formErrors, csv: '' })
                  }}
                  disabled={uploading}
                  className="w-full px-3.5 py-2.5 sm:py-3 text-xs sm:text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50/50 dark:bg-gray-900/50 focus:bg-white dark:focus:bg-gray-900 focus:ring-2 focus:ring-[#003B5C] outline-none font-bold"
                >
                  <option value="">Choose Assigned Class</option>
                  {teacherClasses.map((cls) => (
                    <option key={cls.class_id} value={cls.class_id}>
                      {cls.class_name}
                    </option>
                  ))}
                </select>
              </div>

              {/* File Dropzone */}
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                  Upload CSV File <span className="text-rose-500">*</span>
                </label>
                <input
                  type="file"
                  accept=".csv"
                  onChange={(e) => {
                    setCsvFile(e.target.files?.[0] || null)
                    if (formErrors.csv) setFormErrors({ ...formErrors, csv: '' })
                    setUploadResults(null)
                  }}
                  disabled={uploading}
                  className="w-full text-xs file:mr-3 file:py-2.5 file:px-3.5 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-[#003B5C]/10 file:text-[#003B5C] dark:file:bg-[#003B5C]/30 dark:file:text-blue-300 hover:file:bg-[#003B5C]/20 border border-gray-200 dark:border-gray-700 rounded-xl p-2 bg-gray-50/50 dark:bg-gray-900/50"
                />
                {csvFile && (
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-2 font-semibold flex items-center gap-1.5">
                    <CheckCircle className="w-4 h-4" />
                    <span>Selected: {csvFile.name} ({(csvFile.size / 1024).toFixed(1)} KB)</span>
                  </p>
                )}
              </div>
            </div>

            {/* Results Output */}
            {uploadResults && (
              <div
                className={`border rounded-2xl p-4 sm:p-5 space-y-3 ${
                  uploadResults.failed === 0
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800'
                    : 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800'
                }`}
              >
                <div className="flex items-start gap-3">
                  {uploadResults.failed === 0 ? (
                    <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  )}
                  <div className="space-y-1 text-xs sm:text-sm">
                    <p className="font-bold text-gray-900 dark:text-white">Batch Import Outcome</p>
                    <p className="text-emerald-700 dark:text-emerald-300 font-semibold">
                      Successfully enrolled: {uploadResults.success} learner{uploadResults.success !== 1 ? 's' : ''}
                    </p>
                    {uploadResults.failed > 0 && (
                      <p className="text-rose-700 dark:text-rose-300 font-semibold">
                        Failed entries: {uploadResults.failed}
                      </p>
                    )}
                  </div>
                </div>

                {uploadResults.errors?.length > 0 && (
                  <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3 text-xs max-h-40 overflow-y-auto space-y-1">
                    <p className="font-bold text-gray-700 dark:text-gray-300">Errors encountered:</p>
                    {uploadResults.errors.slice(0, 10).map((err, i) => (
                      <p key={i} className="text-rose-600 dark:text-rose-400 font-mono text-[11px]">
                        • {err}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Submit Action */}
            <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-700">
              <Link
                href="/teacher/students"
                className="w-full sm:w-auto px-5 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl text-xs sm:text-sm font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 text-center transition"
              >
                Back to Roster
              </Link>
              <button
                type="button"
                onClick={handleCsvUpload}
                disabled={!csvFile || !selectedClassId || uploading}
                className="w-full sm:w-auto px-6 py-2.5 bg-[#003B5C] hover:bg-[#002a42] text-white rounded-xl text-xs sm:text-sm font-bold shadow-md hover:shadow-lg flex items-center justify-center gap-2 transition active:scale-95 disabled:opacity-50"
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Processing CSV Payload...</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    <span>Upload & Process CSV</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Duplicate / Re-activation Bottom Sheet Modal */}
      {duplicateModal.show && duplicateModal.candidate && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-gray-800 rounded-t-3xl sm:rounded-2xl max-w-lg w-full shadow-2xl p-5 sm:p-6 max-h-[90vh] overflow-y-auto space-y-4">
            <div className="flex items-center space-x-3 text-amber-600 dark:text-amber-400">
              <div className="p-2.5 bg-amber-50 dark:bg-amber-950/40 rounded-xl shrink-0">
                <AlertCircle className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">Existing Record Found</h3>
                <p className="text-xs text-amber-600 font-bold uppercase tracking-wider">Duplicate Protection</p>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
              We found a previously enrolled record matching this name. Re-activating will preserve their historical scores,
              term reports, and remarks instead of creating a duplicate student ID.
            </p>

            {/* Candidate Metadata Summary */}
            <div className="bg-gray-50/80 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-2xl p-3.5 sm:p-4">
              <div className="grid grid-cols-2 gap-2.5 text-xs">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Full Name</span>
                  <p className="font-bold text-gray-900 dark:text-white truncate">
                    {[duplicateModal.candidate.last_name, duplicateModal.candidate.middle_name, duplicateModal.candidate.first_name]
                      .filter(Boolean)
                      .join(', ')}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Assigned ID</span>
                  <p className="font-bold font-mono text-gray-900 dark:text-white">{duplicateModal.candidate.student_id || '—'}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Gender</span>
                  <p className="font-semibold text-gray-700 dark:text-gray-300 capitalize">{duplicateModal.candidate.gender || '—'}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Historical Status</span>
                  <p className="font-bold uppercase text-[11px] text-purple-700 dark:text-purple-300">
                    {duplicateModal.candidate.status}
                  </p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col-reverse sm:flex-row justify-end gap-2.5 pt-2 border-t border-gray-100 dark:border-gray-700">
              <button
                type="button"
                onClick={handleProceedAsNew}
                disabled={checkingDuplicate}
                className="w-full sm:w-auto px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl text-xs font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 transition"
              >
                Different Person (Create New)
              </button>
              <button
                type="button"
                onClick={handleReactivateExisting}
                disabled={checkingDuplicate}
                className="w-full sm:w-auto px-5 py-2.5 bg-[#003B5C] hover:bg-[#002a42] text-white rounded-xl text-xs font-bold transition shadow-sm flex items-center justify-center gap-2"
              >
                {checkingDuplicate ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Re-activating...</span>
                  </>
                ) : (
                  <>
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Re-activate Existing Profile</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}