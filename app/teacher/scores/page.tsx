'use client'

import { useState, useEffect, Fragment, useMemo, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  Users, AlertCircle, CheckCircle, Filter, Grid, User,
  Clock, Search, Save, Layers, ArrowUpDown, ChevronDown, 
  Loader2, ArrowLeft, X, AlertTriangle, ShieldCheck
} from 'lucide-react'
import { getCurrentUser, getTeacherData } from '@/lib/auth'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'
import { getTeacherClassAccess } from '@/lib/teacher-permissions'
import { Skeleton } from '@/components/ui/skeleton'
import BackButton from '@/components/ui/back-button'
import { toast } from 'react-hot-toast'

interface TeacherClass {
  class_id: string
  class_name: string
  level: string
}

interface Subject {
  id: string
  name: string
  code: string
}

interface Student {
  id: string
  student_id: string
  first_name: string
  last_name: string
  middle_name?: string
  class_id: string
  gender: string
}

function ScoreInput({ 
  initialValue, 
  max, 
  onChange,
  readOnly = false,
  className = ''
}: { 
  initialValue: string | number
  max: number
  onChange: (val: string) => void
  readOnly?: boolean
  className?: string
}) {
  const [val, setVal] = useState(initialValue)
  
  useEffect(() => {
    setVal(initialValue)
  }, [initialValue])

  return (
    <input
      type="number"
      min="0"
      max={max}
      step="0.1"
      value={val}
      readOnly={readOnly}
      title={readOnly ? 'Class score is auto-calculated from continuous assessments' : undefined}
      onChange={(e) => setVal(e.target.value)}
      onBlur={() => onChange(val.toString())}
      className={className || `w-14 sm:w-16 px-1.5 py-1 text-center font-mono font-bold rounded-lg border text-xs sm:text-sm outline-none transition ${
        readOnly
          ? 'border-gray-200 dark:border-gray-700 bg-gray-100/80 dark:bg-gray-800/80 text-gray-400 dark:text-gray-500 cursor-not-allowed'
          : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#003B5C] focus:border-[#003B5C]'
      }`}
    />
  )
}

export default function ExamScoresPage() {
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [teacher, setTeacher] = useState<any>(null)
  const [teacherClasses, setTeacherClasses] = useState<TeacherClass[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [filteredSubjects, setFilteredSubjects] = useState<Subject[]>([])
  const [students, setStudents] = useState<Student[]>([])
  
  const [activeTab, setActiveTab] = useState<'grid' | 'ungraded'>('grid')
  const [gridSearchQuery, setGridSearchQuery] = useState('')
  const [gridSortOrder, setGridSortOrder] = useState<'default' | 'male_first' | 'female_first'>('default')
  const [selectedClass, setSelectedClass] = useState('')
  const [selectedSubject, setSelectedSubject] = useState('')
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([])
  const [selectedTerm, setSelectedTerm] = useState('')
  const [currentTermName, setCurrentTermName] = useState('')
  const [terms, setTerms] = useState<any[]>([])
  
  const [classScorePercentage, setClassScorePercentage] = useState(40)
  const [examScorePercentage, setExamScorePercentage] = useState(60)
  const [allowClassScoreEntry, setAllowClassScoreEntry] = useState(true)

  const [gridScores, setGridScores] = useState<Record<string, Record<string, { class_score: string, exam_score: string, id?: string }>>>({})
  const [gridSaving, setGridSaving] = useState(false)
  const [gridLoading, setGridLoading] = useState(false)
  const [gridChanges, setGridChanges] = useState<Set<string>>(new Set())

  const [ungradedData, setUngradedData] = useState<any[]>([])
  const [loadingUngraded, setLoadingUngraded] = useState(false)
  const [isSubjectDropdownOpen, setIsSubjectDropdownOpen] = useState(false)

  // Unsaved changes confirmation modal
  const [pendingAction, setPendingAction] = useState<{
    type: 'navigate' | 'tab' | 'class'
    target: string
  } | null>(null)

  // Sync state to refs for window and global click listeners
  const gridChangesRef = useRef<Set<string>>(gridChanges)
  const gridScoresRef = useRef(gridScores)
  const selectedClassRef = useRef(selectedClass)
  const selectedTermRef = useRef(selectedTerm)
  const teacherRef = useRef(teacher)
  const teacherClassesRef = useRef(teacherClasses)
  const examScorePercentageRef = useRef(examScorePercentage)

  useEffect(() => { gridChangesRef.current = gridChanges }, [gridChanges])
  useEffect(() => { gridScoresRef.current = gridScores }, [gridScores])
  useEffect(() => { selectedClassRef.current = selectedClass }, [selectedClass])
  useEffect(() => { selectedTermRef.current = selectedTerm }, [selectedTerm])
  useEffect(() => { teacherRef.current = teacher }, [teacher])
  useEffect(() => { teacherClassesRef.current = teacherClasses }, [teacherClasses])
  useEffect(() => { examScorePercentageRef.current = examScorePercentage }, [examScorePercentage])

  function calculateGradeAndRemark(total: number, classLevel: string): { grade: string, remark: string } {
    const className = classLevel.toLowerCase()
    const isPrimary = (className.includes('basic') || className.includes('primary')) && 
                      (className.includes('1') || className.includes('2') || 
                       className.includes('3') || className.includes('4') || 
                       className.includes('5') || className.includes('6')) &&
                      !className.includes('jhs')
    
    if (isPrimary) {
      if (total >= 80) return { grade: '1', remark: 'Highly Proficient' }
      if (total >= 70) return { grade: '2', remark: 'Proficient' }
      if (total >= 60) return { grade: '3', remark: 'Approaching Proficiency' }
      if (total >= 50) return { grade: '4', remark: 'Developing' }
      return { grade: '5', remark: 'Beginning' }
    } else {
      if (total >= 80) return { grade: '1', remark: 'High proficient' }
      if (total >= 70) return { grade: '2', remark: 'Proficient' }
      if (total >= 60) return { grade: '3', remark: 'Proficient' }
      if (total >= 50) return { grade: '4', remark: 'Approaching proficiency' }
      if (total >= 40) return { grade: '5', remark: 'Developing' }
      return { grade: '6', remark: 'Emerging' }
    }
  }

  const buildUpdatesPayload = useCallback((
    changes: Set<string>,
    scores: Record<string, Record<string, { class_score: string, exam_score: string, id?: string }>>,
    currClass: string,
    currTerm: string,
    currTeacher: any,
    classList: TeacherClass[],
    examPct: number
  ) => {
    const updates: any[] = []
    const className = classList.find(c => c.class_id === currClass)?.class_name || ''

    Array.from(changes).forEach(studentId => {
      const studentScores = scores[studentId]
      if (!studentScores) return

      Object.keys(studentScores).forEach(subjectId => {
        const scoreData = studentScores[subjectId]
        const inputClassScore = parseFloat(scoreData.class_score)
        const storedClassScore = !isNaN(inputClassScore) ? inputClassScore : NaN

        const inputExamScore = parseFloat(scoreData.exam_score)
        const storedExamScore = !isNaN(inputExamScore) ? Math.round((inputExamScore / 100) * examPct * 100) / 100 : NaN
        
        if (!isNaN(storedClassScore) || !isNaN(storedExamScore) || scoreData.id) {
          const total = (isNaN(storedClassScore) ? 0 : storedClassScore) + (isNaN(storedExamScore) ? 0 : storedExamScore)
          const { grade, remark } = calculateGradeAndRemark(total, className)

          updates.push({
            id: scoreData.id,
            student_id: studentId,
            subject_id: subjectId,
            term_id: currTerm,
            class_id: currClass,
            class_score: isNaN(storedClassScore) ? 0 : storedClassScore,
            exam_score: isNaN(storedExamScore) ? 0 : storedExamScore,
            total: total,
            grade,
            remarks: remark,
            teacher_id: currTeacher?.id
          })
        }
      })
    })

    return updates
  }, [])

  // Emergency auto-save on force close or hide
  const triggerEmergencyAutoSave = useCallback(async () => {
    if (gridChangesRef.current.size === 0 || !teacherRef.current) return

    const updates = buildUpdatesPayload(
      gridChangesRef.current,
      gridScoresRef.current,
      selectedClassRef.current,
      selectedTermRef.current,
      teacherRef.current,
      teacherClassesRef.current,
      examScorePercentageRef.current
    )

    if (updates.length === 0) return

    const storageKey = `backup_scores_${selectedClassRef.current}_${selectedTermRef.current}`

    try {
      localStorage.setItem(storageKey, JSON.stringify({
        timestamp: Date.now(),
        updates
      }))
    } catch (e) {
      console.error('LocalStorage backup error:', e)
    }

    try {
      await supabase
        .from('scores')
        .upsert(
          updates.map(({ id, ...rest }: any) => rest),
          { onConflict: 'student_id, subject_id, term_id' }
        )
      localStorage.removeItem(storageKey)
    } catch (err) {
      console.error('Emergency background push error:', err)
    }
  }, [supabase, buildUpdatesPayload])

  // Window unload & visibility management
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (gridChangesRef.current.size > 0) {
        triggerEmergencyAutoSave()
        e.preventDefault()
        e.returnValue = ''
      }
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && gridChangesRef.current.size > 0) {
        triggerEmergencyAutoSave()
      }
    }

    const handlePageHide = () => {
      if (gridChangesRef.current.size > 0) {
        triggerEmergencyAutoSave()
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    window.addEventListener('pagehide', handlePageHide)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      window.removeEventListener('pagehide', handlePageHide)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [triggerEmergencyAutoSave])

  // Capture-phase listener on document to intercept clicks anywhere on the page/sidebar
  useEffect(() => {
    const handleGlobalClick = (e: MouseEvent) => {
      if (gridChangesRef.current.size === 0) return

      const target = e.target as HTMLElement | null
      const anchor = target?.closest('a')
      if (!anchor) return

      // Allow explicit downloads or target="_blank"
      if (anchor.hasAttribute('download') || anchor.target === '_blank') return

      const rawHref = anchor.getAttribute('href')
      if (!rawHref) return

      // Skip in-page hashes, mailto, tel, javascript:
      if (
        rawHref.startsWith('#') || 
        rawHref.startsWith('tel:') || 
        rawHref.startsWith('mailto:') || 
        rawHref.startsWith('javascript:')
      ) {
        return
      }

      let targetUrl: URL
      try {
        targetUrl = new URL(rawHref, window.location.href)
      } catch {
        return
      }

      // Check if link is an internal route
      if (targetUrl.origin !== window.location.origin) return

      const currentPath = window.location.pathname + window.location.search
      const targetPath = targetUrl.pathname + targetUrl.search

      if (currentPath === targetPath) return

      // Intercept Next.js Link click in the capture phase
      e.preventDefault()
      e.stopPropagation()

      setPendingAction({
        type: 'navigate',
        target: targetPath
      })
    }

    // Capture phase intercepts before Next.js Link click handler fires
    document.addEventListener('click', handleGlobalClick, true)

    return () => {
      document.removeEventListener('click', handleGlobalClick, true)
    }
  }, [])

  // Restore unsaved session backups safely
  useEffect(() => {
    if (!selectedClass || !selectedTerm) return
    const storageKey = `backup_scores_${selectedClass}_${selectedTerm}`
    const backupJson = typeof window !== 'undefined' ? localStorage.getItem(storageKey) : null
    if (!backupJson) return

    async function restoreBackup() {
      try {
        const backup = JSON.parse(backupJson!)
        if (backup?.updates?.length > 0) {
          const { error: restoreError } = await supabase
            .from('scores')
            .upsert(
              backup.updates.map(({ id, ...rest }: any) => rest),
              { onConflict: 'student_id, subject_id, term_id' }
            )

          if (!restoreError) {
            localStorage.removeItem(storageKey)
            toast.success('Restored and saved unsaved scores from previous session!')
            loadGridScores()
          }
        }
      } catch (e) {
        localStorage.removeItem(storageKey)
      }
    }

    restoreBackup()
  }, [selectedClass, selectedTerm])

  useEffect(() => {
    async function loadData() {
      try {
        setError(null)
        const user = await getCurrentUser()
        if (!user) {
          router.push('/login?portal=teacher')
          return
        }

        const [
          settingsRes,
          teacherRes,
          subjectsRes,
          termsRes,
          currentTermRes
        ] = await Promise.all([
          supabase.from('system_settings').select('*').in('setting_key', ['class_score_percentage', 'exam_score_percentage', 'allow_teacher_class_score_entry']),
          getTeacherData(user.id),
          supabase.from('subjects').select('id, name, code, level').order('name'),
          supabase.from('academic_terms').select('*').order('created_at', { ascending: false }),
          supabase.from('system_settings').select('setting_value').eq('setting_key', 'current_term').maybeSingle()
        ])

        if (settingsRes.data) {
          settingsRes.data.forEach((setting: any) => {
            if (setting.setting_key === 'class_score_percentage') {
              setClassScorePercentage(Number(setting.setting_value))
            } else if (setting.setting_key === 'exam_score_percentage') {
              setExamScorePercentage(Number(setting.setting_value))
            } else if (setting.setting_key === 'allow_teacher_class_score_entry') {
              setAllowClassScoreEntry(setting.setting_value !== 'false')
            }
          })
        }

        if (teacherRes.error || !teacherRes.data) {
          setError('Teacher profile not found. Please contact an administrator.')
          setLoading(false)
          return
        }
        const teacherData = teacherRes.data
        setTeacher(teacherData)

        if (subjectsRes.data) {
          setSubjects(subjectsRes.data)
        }

        if (termsRes.data) {
          setTerms(termsRes.data)
          if (currentTermRes.data?.setting_value) {
            const matchingTerm = termsRes.data.find((t: any) => t.id === currentTermRes.data.setting_value)
            if (matchingTerm) {
              setSelectedTerm(currentTermRes.data.setting_value)
              setCurrentTermName(`${matchingTerm.name} (${matchingTerm.academic_year})`)
            }
          }
        }

        const classAccess = await getTeacherClassAccess(teacherData.profile_id)
        if (classAccess.length === 0) {
          setError('You are not assigned to any classes. Please contact an administrator.')
          setLoading(false)
          return
        }

        setTeacherClasses(classAccess.map((c: any) => ({
          class_id: c.class_id,
          class_name: c.class_name,
          level: c.level
        })))

        setLoading(false)
      } catch (err: any) {
        console.error('Error loading data:', err)
        setError(err.message || 'Failed to load initial data.')
        setLoading(false)
      }
    }

    loadData()
  }, [router, supabase])

  useEffect(() => {
    async function loadStudents() {
      if (!selectedClass) {
        setStudents([])
        return
      }

      try {
        const { data, error } = await supabase
          .from('students')
          .select('id, student_id, first_name, last_name, middle_name, class_id, gender')
          .eq('class_id', selectedClass)
          .eq('status', 'active')
          .order('last_name') as { data: any[] | null; error: any }

        if (error) throw error
        setStudents(data || [])
      } catch (err: any) {
        console.error('Error loading students:', err)
        toast.error('Failed to load class roster')
      }
    }

    loadStudents()
  }, [selectedClass, supabase])

  useEffect(() => {
    if (activeTab === 'ungraded' && selectedClass && selectedTerm) {
      loadUngradedSubjects()
    }
  }, [activeTab, selectedClass, selectedTerm])

  async function loadUngradedSubjects() {
    if (!selectedClass || !selectedTerm) return

    setLoadingUngraded(true)
    try {
      const { data: studentsData, error: studentsError } = await supabase
        .from('students')
        .select('id, student_id, first_name, last_name')
        .eq('class_id', selectedClass)
        .eq('status', 'active')
        .order('first_name') as { data: any[] | null; error: any }

      if (studentsError) throw studentsError

      const classData = teacherClasses.find(c => c.class_id === selectedClass)
      if (!classData) return

      const className = classData.class_name.toLowerCase()
      let category = ''

      if (className.includes('kg')) {
        category = 'kindergarten'
      } else if (className.includes('basic 1') || className.includes('basic 2') || className.includes('basic 3') ||
                 className.includes('primary 1') || className.includes('primary 2') || className.includes('primary 3')) {
        category = 'lower_primary'
      } else if (className.includes('basic 4') || className.includes('basic 5') || className.includes('basic 6') ||
                 className.includes('primary 4') || className.includes('primary 5') || className.includes('primary 6')) {
        category = 'upper_primary'
      } else if (className.includes('basic 7') || className.includes('basic 8') || className.includes('basic 9') ||
                 className.includes('jhs 1') || className.includes('jhs 2') || className.includes('jhs 3')) {
        category = 'jhs'
      }

      const classSubjects = subjects.filter(s => (s as any).level === category)

      const { data: scoresData, error: scoresError } = await supabase
        .from('scores')
        .select('student_id, subject_id')
        .in('student_id', studentsData?.map((s: any) => s.id) || [])
        .eq('term_id', selectedTerm) as { data: any[] | null; error: any }

      if (scoresError) throw scoresError

      const ungradedReport = studentsData?.map(student => {
        const studentScores = scoresData?.filter(s => s.student_id === student.id) || []
        const gradedSubjectIds = studentScores.map(s => s.subject_id)
        
        const missingSubjects = classSubjects.filter(
          subject => !gradedSubjectIds.includes(subject.id)
        )

        return {
          student,
          missingSubjects,
          totalSubjects: classSubjects.length,
          gradedCount: gradedSubjectIds.length,
          ungradedCount: missingSubjects.length
        }
      }).filter(item => item.ungradedCount > 0)

      setUngradedData(ungradedReport || [])
    } catch (err) {
      console.error('Error loading ungraded subjects:', err)
      toast.error('Failed to analyze missing grades')
    } finally {
      setLoadingUngraded(false)
    }
  }

  useEffect(() => {
    async function filterSubjects() {
      if (!selectedClass || subjects.length === 0 || !teacher) {
        setFilteredSubjects([])
        return
      }

      const selectedClassData = teacherClasses.find(c => c.class_id === selectedClass)
      if (!selectedClassData) {
        setFilteredSubjects([])
        return
      }

      const fullAccess = await getTeacherClassAccess(teacher.profile_id)
      const access = fullAccess.find(c => c.class_id === selectedClass)
      
      if (!access) {
        setFilteredSubjects([])
        return
      }

      const className = selectedClassData.class_name.toLowerCase()
      let category = ''

      if (className.includes('kg')) {
        category = 'kindergarten'
      } else if (className.includes('basic 1') || className.includes('basic 2') || className.includes('basic 3') ||
                 className.includes('primary 1') || className.includes('primary 2') || className.includes('primary 3')) {
        category = 'lower_primary'
      } else if (className.includes('basic 4') || className.includes('basic 5') || className.includes('basic 6') ||
                 className.includes('primary 4') || className.includes('primary 5') || className.includes('primary 6')) {
        category = 'upper_primary'
      } else if (className.includes('basic 7') || className.includes('basic 8') || className.includes('basic 9') ||
                 className.includes('jhs 1') || className.includes('jhs 2') || className.includes('jhs 3')) {
        category = 'jhs'
      }

      let filtered = subjects.filter(s => {
        const subjectLevel = (s as any).level || ''
        return subjectLevel === category
      })

      if (filtered.length === 0) {
        filtered = [...subjects]
      }

      if (!access.can_edit_all_subjects) {
        const subjectsTaught = access.subjects_taught || []
        filtered = filtered.filter(s => {
          return subjectsTaught.some((assigned: any) => {
            if (typeof assigned === 'string') {
              return assigned.toLowerCase() === s.name.toLowerCase()
            }
            return String(assigned.subject_id) === String(s.id)
          })
        })
      }

      setFilteredSubjects(filtered)
      if (selectedSubject && !filtered.find(s => s.id === selectedSubject)) {
        setSelectedSubject('')
      }
      setSelectedSubjects(prev => prev.filter(id => filtered.find(s => s.id === id)))
    }

    filterSubjects()
  }, [selectedClass, subjects, teacherClasses, selectedSubject, teacher])

  useEffect(() => {
    if (activeTab === 'grid' && selectedClass && selectedSubjects.length > 0 && selectedTerm) {
      loadGridScores()
    }
  }, [activeTab, selectedClass, selectedSubjects, selectedTerm])

  async function loadGridScores() {
    if (!selectedClass || selectedSubjects.length === 0 || !selectedTerm) return

    setGridLoading(true)
    setGridChanges(new Set())
    try {
      const { data, error } = await supabase
        .from('scores')
        .select('id, student_id, subject_id, class_score, exam_score')
        .in('subject_id', selectedSubjects)
        .eq('term_id', selectedTerm)
        .in('student_id', students.map(s => s.id))

      if (error) throw error

      const scoresMap: Record<string, Record<string, { class_score: string, exam_score: string, id?: string }>> = {}
      
      students.forEach(student => {
        scoresMap[student.id] = {}
        selectedSubjects.forEach(subjectId => {
          scoresMap[student.id][subjectId] = { class_score: '', exam_score: '' }
        })
      })

      data?.forEach((score: any) => {
        if (scoresMap[score.student_id]) {
          let displayClassScore = ''
          if (score.class_score !== null && score.class_score !== undefined) {
            displayClassScore = score.class_score.toString()
          }

          let displayExamScore = ''
          if (score.exam_score !== null && score.exam_score !== undefined) {
            const val = (parseFloat(score.exam_score) / examScorePercentage) * 100
            displayExamScore = Math.round(val * 100) / 100 + ''
          }

          scoresMap[score.student_id][score.subject_id] = {
            class_score: displayClassScore,
            exam_score: displayExamScore,
            id: score.id
          }
        }
      })

      setGridScores(scoresMap)
    } catch (err: any) {
      console.error('Error loading grid scores:', err)
      toast.error('Failed to load score matrix')
    } finally {
      setGridLoading(false)
    }
  }

  function handleGridScoreChange(studentId: string, subjectId: string, field: 'class_score' | 'exam_score', value: string) {
    if (field === 'class_score' && !allowClassScoreEntry) return
    
    if (value === '') {
      setGridScores(prev => ({
        ...prev,
        [studentId]: {
          ...prev[studentId],
          [subjectId]: {
            ...prev[studentId][subjectId],
            [field]: value
          }
        }
      }))
      setGridChanges(prev => new Set(prev).add(studentId))
      return
    }

    const numVal = parseFloat(value)
    if (isNaN(numVal)) return 

    if (field === 'class_score') {
      if (numVal < 0 || numVal > classScorePercentage) return
    } else if (field === 'exam_score') {
      if (numVal < 0 || numVal > 100) return
    }

    setGridScores(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [subjectId]: {
          ...prev[studentId][subjectId],
          [field]: value
        }
      }
    }))
    setGridChanges(prev => new Set(prev).add(studentId))
  }

  async function saveGridScores(): Promise<boolean> {
    if (gridChanges.size === 0) return true

    setGridSaving(true)
    try {
      const fullAccess = await getTeacherClassAccess(teacher.profile_id)
      const access = fullAccess.find(c => c.class_id === selectedClass)
      
      if (!access) throw new Error('You do not have access to this class')

      const updates = buildUpdatesPayload(
        gridChanges,
        gridScores,
        selectedClass,
        selectedTerm,
        teacher,
        teacherClasses,
        examScorePercentage
      )

      if (updates.length === 0) {
        setGridSaving(false)
        return true
      }

      const { error } = await supabase
        .from('scores')
        .upsert(
          updates.map(({ id, ...rest }: any) => rest),
          { onConflict: 'student_id, subject_id, term_id' }
        )
      
      if (error) throw error

      setGridChanges(new Set())
      localStorage.removeItem(`backup_scores_${selectedClass}_${selectedTerm}`)
      loadGridScores()
      toast.success('Exam scores saved successfully!')
      return true
    } catch (err: any) {
      console.error('Error saving grid scores:', err)
      toast.error('Failed to save scores: ' + err.message)
      return false
    } finally {
      setGridSaving(false)
    }
  }

  // Navigation interceptor
  const handleRequestNavigation = (type: 'navigate' | 'tab' | 'class', target: string) => {
    if (gridChanges.size > 0) {
      setPendingAction({ type, target })
    } else {
      executePendingAction({ type, target })
    }
  }

  const executePendingAction = (action: { type: 'navigate' | 'tab' | 'class', target: string }) => {
    if (action.type === 'navigate') {
      router.push(action.target)
    } else if (action.type === 'tab') {
      setActiveTab(action.target as any)
    } else if (action.type === 'class') {
      setSelectedClass(action.target)
    }
  }

  const handleModalSaveAndExit = async () => {
    const success = await saveGridScores()
    if (success && pendingAction) {
      const action = pendingAction
      setPendingAction(null)
      executePendingAction(action)
    }
  }

  const handleModalDiscardAndExit = () => {
    setGridChanges(new Set())
    localStorage.removeItem(`backup_scores_${selectedClass}_${selectedTerm}`)
    if (pendingAction) {
      const action = pendingAction
      setPendingAction(null)
      executePendingAction(action)
    }
  }

  const sortedAndFilteredStudents = useMemo(() => {
    return students
      .filter(student => {
        const query = gridSearchQuery.toLowerCase()
        return (
          student.first_name.toLowerCase().includes(query) ||
          student.last_name.toLowerCase().includes(query) ||
          student.student_id.toLowerCase().includes(query)
        )
      })
      .sort((a, b) => {
        const nameCompare = a.last_name.localeCompare(b.last_name) || a.first_name.localeCompare(b.first_name)
        if (gridSortOrder === 'default') return nameCompare

        const genderA = a.gender?.toLowerCase()
        const genderB = b.gender?.toLowerCase()
        if (genderA === genderB) return nameCompare

        if (gridSortOrder === 'male_first') return genderA === 'male' ? -1 : 1
        if (gridSortOrder === 'female_first') return genderA === 'female' ? -1 : 1
        return nameCompare
      })
  }, [students, gridSearchQuery, gridSortOrder])

  return (
    <div className="min-h-screen bg-gray-50/50 dark:bg-gray-900 pb-24 font-sans text-gray-900 dark:text-gray-100 transition-colors">
      {/* Sticky Header Banner */}
      <header className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-md border-b border-gray-200/80 dark:border-gray-800 sticky top-0 z-30 shadow-sm">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-3.5 sm:py-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start sm:items-center space-x-3 sm:space-x-4 min-w-0">
              <button
                type="button"
                onClick={() => handleRequestNavigation('navigate', '/teacher/manage-scores')}
                className="p-2 -ml-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition shrink-0"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="min-w-0">
                <h1 className="text-xl sm:text-2xl md:text-3xl font-black tracking-tight text-gray-900 dark:text-white flex items-center gap-2 truncate">
                  <Grid className="w-6 h-6 text-[#003B5C] dark:text-blue-400 shrink-0" />
                  <span>Terminal Exam Scores</span>
                </h1>
                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 font-medium truncate">
                  Scaled computation: Class ({classScorePercentage}%) + Exam ({examScorePercentage}%)
                </p>
              </div>
            </div>

            {activeTab === 'grid' && selectedClass && selectedSubjects.length > 0 && selectedTerm && (
              <button
                onClick={saveGridScores}
                disabled={gridSaving || gridChanges.size === 0}
                className="hidden sm:inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-[#003B5C] hover:bg-[#002a42] text-white rounded-xl text-xs sm:text-sm font-bold shadow-md hover:shadow-lg transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
              >
                {gridSaving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Save Changes ({gridChanges.size})</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-[1400px] mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-5 sm:space-y-6">
        {/* Navigation Tabs */}
        <div className="w-full overflow-x-auto pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          <div className="bg-gray-200/70 dark:bg-gray-800/90 p-1.5 rounded-2xl inline-flex items-center gap-1.5 min-w-full sm:min-w-0 shadow-inner">
            <button
              type="button"
              onClick={() => handleRequestNavigation('tab', 'grid')}
              className={`shrink-0 inline-flex items-center justify-center gap-2 px-4 py-2 sm:py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all duration-200 whitespace-nowrap ${
                activeTab === 'grid'
                  ? 'bg-white dark:bg-gray-700 text-[#003B5C] dark:text-blue-300 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <Grid className="w-4 h-4 shrink-0" />
              <span>Spreadsheet Matrix</span>
            </button>
            <button
              type="button"
              onClick={() => handleRequestNavigation('tab', 'ungraded')}
              className={`shrink-0 inline-flex items-center justify-center gap-2 px-4 py-2 sm:py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all duration-200 whitespace-nowrap ${
                activeTab === 'ungraded'
                  ? 'bg-white dark:bg-gray-700 text-[#003B5C] dark:text-blue-300 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>Ungraded Analysis</span>
            </button>
          </div>
        </div>

        {/* Tab 1: Spreadsheet Matrix View */}
        {activeTab === 'grid' && (
          <div className="space-y-4 sm:space-y-6">
            {/* Filter Configuration Card */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl sm:rounded-3xl shadow-sm border border-gray-200/80 dark:border-gray-700 p-4 sm:p-5 md:p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5 sm:gap-4">
                {/* Class Cohort */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5 uppercase tracking-wider">
                    Assigned Class <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <select
                      value={selectedClass}
                      onChange={(e) => handleRequestNavigation('class', e.target.value)}
                      className="w-full px-3.5 py-2.5 text-xs sm:text-sm font-bold border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50/50 dark:bg-gray-900/50 text-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-[#003B5C] appearance-none cursor-pointer"
                    >
                      <option value="">Select class cohort</option>
                      {teacherClasses.map(cls => (
                        <option key={cls.class_id} value={cls.class_id}>{cls.class_name}</option>
                      ))}
                    </select>
                    <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                {/* Multi-Subject Filter Dropdown */}
                <div className="relative">
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5 uppercase tracking-wider">
                    Subjects To Score <span className="text-rose-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsSubjectDropdownOpen(!isSubjectDropdownOpen)}
                    className="w-full px-3.5 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-left bg-gray-50/50 dark:bg-gray-900/50 flex justify-between items-center text-xs sm:text-sm font-bold text-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-[#003B5C]"
                  >
                    <span className="truncate">
                      {selectedSubjects.length === 0 
                        ? 'Select Subjects' 
                        : `${selectedSubjects.length} Subject${selectedSubjects.length !== 1 ? 's' : ''} Selected`}
                    </span>
                    <Layers className="w-4 h-4 text-gray-400 shrink-0" />
                  </button>
                  
                  {isSubjectDropdownOpen && (
                    <div className="absolute z-50 mt-1.5 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-xl max-h-64 overflow-y-auto p-1.5 animate-in fade-in duration-150">
                      <div className="p-2 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-800/80 rounded-xl mb-1">
                        <span className="text-[11px] font-bold text-gray-400 uppercase">Available Subjects</span>
                        <button
                          type="button"
                          onClick={() => {
                            if (selectedSubjects.length === filteredSubjects.length) {
                              setSelectedSubjects([])
                            } else {
                              setSelectedSubjects(filteredSubjects.map(s => s.id))
                            }
                          }}
                          className="text-xs text-[#003B5C] dark:text-blue-400 hover:underline font-bold"
                        >
                          {selectedSubjects.length === filteredSubjects.length ? 'Deselect All' : 'Select All'}
                        </button>
                      </div>
                      <div className="space-y-0.5">
                        {filteredSubjects.map(subject => (
                          <label 
                            key={subject.id} 
                            className="flex items-center px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-xl cursor-pointer text-xs font-semibold text-gray-700 dark:text-gray-200"
                          >
                            <input
                              type="checkbox"
                              checked={selectedSubjects.includes(subject.id)}
                              onChange={() => {
                                setSelectedSubjects(prev =>
                                  prev.includes(subject.id)
                                    ? prev.filter(id => id !== subject.id)
                                    : [...prev, subject.id]
                                )
                              }}
                              className="mr-2.5 h-4 w-4 text-[#003B5C] rounded border-gray-300 focus:ring-[#003B5C]"
                            />
                            <span className="truncate">{subject.name}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                  {isSubjectDropdownOpen && (
                    <div className="fixed inset-0 z-40" onClick={() => setIsSubjectDropdownOpen(false)} />
                  )}
                </div>

                {/* Term Indicator */}
                <div className="sm:col-span-2 md:col-span-1">
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5 uppercase tracking-wider">
                    Academic Term
                  </label>
                  <div className="w-full px-3.5 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-100/70 dark:bg-gray-900/60 text-gray-700 dark:text-gray-300 font-bold text-xs sm:text-sm flex items-center gap-2 truncate">
                    <Clock className="w-4 h-4 text-[#003B5C] dark:text-blue-400 shrink-0" />
                    <span className="truncate">{currentTermName || 'No active term set'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Score Entry View */}
            {selectedClass && selectedSubjects.length > 0 && selectedTerm ? (
              <div className="bg-white dark:bg-gray-800 rounded-2xl sm:rounded-3xl shadow-sm border border-gray-200/80 dark:border-gray-700 overflow-hidden space-y-0">
                {!allowClassScoreEntry && (
                  <div className="p-3.5 bg-amber-50/80 dark:bg-amber-950/30 border-b border-amber-200/80 dark:border-amber-800 flex items-start gap-2.5 text-xs text-amber-900 dark:text-amber-200">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <span>
                      <strong>Notice:</strong> Class score manual entry is locked. Class scores are auto-computed from recorded assessments. You can enter or update the <strong>Exam Score (100%)</strong> below.
                    </span>
                  </div>
                )}

                {/* Filter & Sort Controls */}
                <div className="p-3.5 sm:p-5 border-b border-gray-100 dark:border-gray-700 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3.5 bg-gray-50/50 dark:bg-gray-850">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm sm:text-base font-black text-gray-900 dark:text-white">
                      Exam Entry Matrix
                    </h3>
                    <span className="text-xs font-bold text-gray-400">
                      ({sortedAndFilteredStudents.length} Students)
                    </span>
                  </div>

                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full md:w-auto">
                    <div className="relative flex-1 sm:w-56">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search student..."
                        value={gridSearchQuery}
                        onChange={(e) => setGridSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 text-xs border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-[#003B5C]"
                      />
                    </div>

                    <div className="relative">
                      <ArrowUpDown className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                      <select
                        value={gridSortOrder}
                        onChange={(e) => setGridSortOrder(e.target.value as any)}
                        className="w-full sm:w-auto pl-8 pr-7 py-2 text-xs font-bold border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-[#003B5C] appearance-none cursor-pointer"
                      >
                        <option value="default">Default Sort (A-Z)</option>
                        <option value="male_first">Boys First</option>
                        <option value="female_first">Girls First</option>
                      </select>
                      <ChevronDown className="w-3.5 h-3.5 text-gray-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>
                </div>

                {gridLoading ? (
                  <div className="py-16 text-center space-y-3">
                    <div className="w-8 h-8 border-2 border-[#003B5C] border-t-transparent rounded-full animate-spin mx-auto" />
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Loading grade matrix...</p>
                  </div>
                ) : sortedAndFilteredStudents.length === 0 ? (
                  <div className="py-14 text-center text-xs text-gray-400">
                    No students match the current filter criteria
                  </div>
                ) : (
                  <>
                    {/* MOBILE CARD VIEW (< md) */}
                    <div className="block md:hidden divide-y divide-gray-100 dark:divide-gray-800">
                      {sortedAndFilteredStudents.map(student => (
                        <div key={student.id} className="p-4 space-y-3.5 hover:bg-gray-50/50 dark:hover:bg-gray-750/50 transition">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <h4 className="font-bold text-sm text-gray-900 dark:text-white">
                                {student.last_name}, {student.first_name} {student.middle_name || ''}
                              </h4>
                              <p className="text-[11px] text-gray-400 font-mono mt-0.5">{student.student_id}</p>
                            </div>
                            {student.gender && (
                              <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                                student.gender.toLowerCase() === 'male'
                                  ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300'
                                  : 'bg-pink-50 text-pink-700 dark:bg-pink-950/40 dark:text-pink-300'
                              }`}>
                                {student.gender}
                              </span>
                            )}
                          </div>

                          <div className="space-y-2.5">
                            {selectedSubjects.map(subjectId => {
                              const subject = filteredSubjects.find(s => s.id === subjectId)
                              const scores = gridScores[student.id]?.[subjectId] || { class_score: '', exam_score: '' }
                              const classScore = parseFloat(scores.class_score) || 0
                              const examScore = parseFloat(scores.exam_score) || 0
                              const total = classScore + (examScore * (examScorePercentage / 100))
                              const className = teacherClasses.find(c => c.class_id === selectedClass)?.class_name || ''
                              const { grade } = calculateGradeAndRemark(total, className)
                              const hasData = scores.class_score || scores.exam_score

                              return (
                                <div key={subjectId} className="bg-gray-50/80 dark:bg-gray-900/40 p-3 rounded-2xl border border-gray-100 dark:border-gray-800 space-y-2">
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="font-black text-xs text-[#003B5C] dark:text-blue-300 truncate">
                                      {subject?.name}
                                    </span>
                                    <div className="flex items-center gap-1.5 shrink-0">
                                      <span className="font-mono text-xs font-bold text-gray-700 dark:text-gray-200">
                                        {hasData ? `${total.toFixed(1)}%` : '—'}
                                      </span>
                                      <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                                        !hasData
                                          ? 'bg-gray-200/80 dark:bg-gray-700 text-gray-400'
                                          : total >= 50
                                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200/60'
                                          : 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200/60'
                                      }`}>
                                        {hasData ? grade : '—'}
                                      </span>
                                    </div>
                                  </div>

                                  <div className="grid grid-cols-2 gap-2 pt-1">
                                    <div>
                                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                                        Class ({classScorePercentage}%){!allowClassScoreEntry ? ' (Locked)' : ''}
                                      </label>
                                      <ScoreInput
                                        initialValue={scores.class_score}
                                        max={classScorePercentage}
                                        readOnly={!allowClassScoreEntry}
                                        onChange={(val) => handleGridScoreChange(student.id, subjectId, 'class_score', val)}
                                        className="w-full h-9 px-2 text-center font-mono font-bold rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-[#003B5C] text-xs"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                                        Exam (100%)
                                      </label>
                                      <ScoreInput
                                        initialValue={scores.exam_score}
                                        max={100}
                                        onChange={(val) => handleGridScoreChange(student.id, subjectId, 'exam_score', val)}
                                        className="w-full h-9 px-2 text-center font-mono font-bold rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-[#003B5C] text-xs"
                                      />
                                    </div>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* TABLET & DESKTOP TABLE VIEW (≥ md) */}
                    <div className="hidden md:block overflow-x-auto relative">
                      <table className="w-full text-left border-collapse min-w-[760px]">
                        <thead className="bg-gray-50/80 dark:bg-gray-900/60 sticky top-0 z-30 shadow-sm border-b border-gray-200 dark:border-gray-700">
                          <tr>
                            <th 
                              rowSpan={2} 
                              className="p-3.5 sm:p-4 text-left text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-wider sticky left-0 bg-gray-50/95 dark:bg-gray-900/95 z-40 border-r border-gray-200 dark:border-gray-700 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] w-48 sm:w-64"
                            >
                              Student
                            </th>
                            {selectedSubjects.map(subjectId => {
                              const subject = filteredSubjects.find(s => s.id === subjectId)
                              return (
                                <th 
                                  key={subjectId} 
                                  colSpan={4} 
                                  className="p-3 text-center text-xs font-black text-gray-800 dark:text-gray-100 uppercase border-r border-gray-200 dark:border-gray-700 border-b border-gray-200 dark:border-gray-700 min-w-[260px] bg-gray-100/50 dark:bg-gray-800"
                                >
                                  <div className="truncate max-w-[240px] mx-auto">{subject?.name || 'Subject'}</div>
                                </th>
                              )
                            })}
                          </tr>
                          <tr>
                            {selectedSubjects.map(subjectId => (
                              <Fragment key={subjectId}>
                                <th className="p-2 text-center text-[10px] font-bold text-gray-500 uppercase border-b border-gray-200 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-900/60 min-w-[65px]">
                                  Class ({classScorePercentage}%)
                                </th>
                                <th className="p-2 text-center text-[10px] font-bold text-gray-500 uppercase border-b border-gray-200 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-900/60 min-w-[65px]">
                                  Exam (100%)
                                </th>
                                <th className="p-2 text-center text-[10px] font-bold text-gray-500 uppercase border-b border-gray-200 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-900/60 min-w-[60px]">
                                  Total
                                </th>
                                <th className="p-2 text-center text-[10px] font-bold text-gray-500 uppercase border-b border-gray-200 dark:border-gray-700 border-r border-gray-200 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-900/60 min-w-[60px]">
                                  Grade
                                </th>
                              </Fragment>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-750 text-xs sm:text-sm font-medium">
                          {sortedAndFilteredStudents.map((student) => {
                            const hasChanges = gridChanges.has(student.id)
                            return (
                              <tr 
                                key={student.id} 
                                className={`transition ${hasChanges ? 'bg-blue-50/40 dark:bg-blue-950/20' : 'hover:bg-gray-50/60 dark:hover:bg-gray-750/50'}`}
                              >
                                <td className="p-3 sm:p-4 sticky left-0 bg-white dark:bg-gray-800 z-20 border-r border-gray-200 dark:border-gray-700 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                                  <div className="font-bold text-gray-900 dark:text-white truncate max-w-[180px] sm:max-w-[220px]">
                                    {student.last_name}, {student.first_name} {student.middle_name || ''}
                                  </div>
                                  <div className="text-[11px] text-gray-400 font-mono mt-0.5">{student.student_id}</div>
                                </td>

                                {selectedSubjects.map(subjectId => {
                                  const scores = gridScores[student.id]?.[subjectId] || { class_score: '', exam_score: '' }
                                  const classScore = parseFloat(scores.class_score) || 0
                                  const examScore = parseFloat(scores.exam_score) || 0
                                  const total = classScore + (examScore * (examScorePercentage / 100))
                                  const className = teacherClasses.find(c => c.class_id === selectedClass)?.class_name || ''
                                  const { grade } = calculateGradeAndRemark(total, className)
                                  const hasData = scores.class_score || scores.exam_score

                                  return (
                                    <Fragment key={subjectId}>
                                      <td className="p-2 text-center whitespace-nowrap">
                                        <ScoreInput
                                          initialValue={scores.class_score}
                                          max={classScorePercentage}
                                          readOnly={!allowClassScoreEntry}
                                          onChange={(val) => handleGridScoreChange(student.id, subjectId, 'class_score', val)}
                                        />
                                      </td>
                                      <td className="p-2 text-center whitespace-nowrap">
                                        <ScoreInput
                                          initialValue={scores.exam_score}
                                          max={100}
                                          onChange={(val) => handleGridScoreChange(student.id, subjectId, 'exam_score', val)}
                                        />
                                      </td>
                                      <td className="p-2 text-center whitespace-nowrap">
                                        <span className={`font-mono font-bold ${total > 0 ? 'text-gray-900 dark:text-white' : 'text-gray-400'}`}>
                                          {hasData ? total.toFixed(1) : '—'}
                                        </span>
                                      </td>
                                      <td className="p-2 text-center whitespace-nowrap border-r border-gray-200 dark:border-gray-700">
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-black uppercase ${
                                          !hasData 
                                            ? 'bg-gray-100 dark:bg-gray-700 text-gray-400' 
                                            : total >= 50 
                                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200/60' 
                                            : 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200/60'
                                        }`}>
                                          {hasData ? grade : '—'}
                                        </span>
                                      </td>
                                    </Fragment>
                                  )
                                })}
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="text-center py-14 sm:py-20 bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-200/80 dark:border-gray-700 space-y-3">
                <Grid className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto" />
                <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">Configure Score Matrix</h3>
                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 max-w-sm mx-auto px-4 leading-relaxed">
                  Select a classroom cohort and pick at least one subject to generate the terminal exam score sheet.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Ungraded Subjects Analysis */}
        {activeTab === 'ungraded' && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl sm:rounded-3xl shadow-sm border border-gray-200/80 dark:border-gray-700 p-4 sm:p-6 space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5 uppercase tracking-wider">
                  Class Cohort <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <select
                    value={selectedClass}
                    onChange={(e) => handleRequestNavigation('class', e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs sm:text-sm font-bold border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50/50 dark:bg-gray-900/50 text-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-[#003B5C] appearance-none cursor-pointer"
                  >
                    <option value="">Select class cohort</option>
                    {teacherClasses.map(cls => (
                      <option key={cls.class_id} value={cls.class_id}>{cls.class_name}</option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5 uppercase tracking-wider">
                  Active Term
                </label>
                <div className="w-full px-3.5 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-100/70 dark:bg-gray-900/60 text-gray-700 dark:text-gray-300 font-bold text-xs sm:text-sm flex items-center gap-2 truncate">
                  <Clock className="w-4 h-4 text-[#003B5C] dark:text-blue-400 shrink-0" />
                  <span className="truncate">{currentTermName || 'No current term set'}</span>
                </div>
              </div>
            </div>

            {loadingUngraded ? (
              <div className="py-16 text-center space-y-3">
                <div className="w-8 h-8 border-2 border-[#003B5C] border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Auditing class grades...</p>
              </div>
            ) : ungradedData.length > 0 ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-1 border-b border-gray-100 dark:border-gray-700">
                  <h4 className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white">
                    Learners With Incomplete Assessments
                  </h4>
                  <span className="text-xs font-bold text-rose-600 bg-rose-50 dark:bg-rose-950/40 px-2.5 py-0.5 rounded-full">
                    {ungradedData.length} pending
                  </span>
                </div>

                <div className="divide-y divide-gray-100 dark:divide-gray-750 border border-gray-200/80 dark:border-gray-700 rounded-2xl overflow-hidden">
                  {ungradedData.map((item) => (
                    <div key={item.student.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-gray-800">
                      <div className="space-y-1">
                        <div className="font-bold text-xs sm:text-sm text-gray-900 dark:text-white">
                          {item.student.first_name} {item.student.last_name}
                        </div>
                        <div className="text-[11px] text-gray-400 font-mono">{item.student.student_id}</div>
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {item.missingSubjects.map((subject: any) => (
                            <span 
                              key={subject.id} 
                              className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-800"
                            >
                              {subject.name}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="sm:text-right shrink-0">
                        <span className="text-xs font-bold text-gray-500 dark:text-gray-400">
                          {item.gradedCount} of {item.totalSubjects} graded
                        </span>
                        <div className="w-full sm:w-28 bg-gray-100 dark:bg-gray-700 rounded-full h-2 mt-1.5 overflow-hidden">
                          <div 
                            className="bg-[#003B5C] dark:bg-blue-400 h-full rounded-full"
                            style={{ width: `${(item.gradedCount / item.totalSubjects) * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : selectedClass ? (
              <div className="text-center py-12 space-y-2">
                <CheckCircle className="w-10 h-10 text-emerald-500 mx-auto" />
                <h4 className="text-sm font-bold text-gray-800 dark:text-gray-200">All Subjects Graded!</h4>
                <p className="text-xs text-gray-400">Every active learner in this class has recorded scores for all subjects.</p>
              </div>
            ) : (
              <div className="text-center py-12 text-xs text-gray-400">
                Please select a classroom cohort above to inspect ungraded subjects.
              </div>
            )}
          </div>
        )}
      </main>

      {/* Floating Bottom Save Action for Mobile */}
      {activeTab === 'grid' && gridChanges.size > 0 && (
        <div className="fixed bottom-4 left-4 right-4 z-40 sm:hidden animate-in slide-in-from-bottom-4">
          <button
            type="button"
            onClick={saveGridScores}
            disabled={gridSaving}
            className="w-full py-3.5 px-6 bg-[#003B5C] hover:bg-[#002a42] text-white rounded-2xl font-black text-sm shadow-2xl flex items-center justify-center gap-2 active:scale-95 transition-all"
          >
            {gridSaving ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Saving scores...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Save {gridChanges.size} Changed Student{gridChanges.size > 1 ? 's' : ''}</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Unsaved Changes Confirmation Modal */}
      {pendingAction && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-gray-800 rounded-t-3xl sm:rounded-3xl max-w-md w-full shadow-2xl p-5 sm:p-6 space-y-4 border-t sm:border border-gray-100 dark:border-gray-700">
            <div className="flex items-center space-x-3 text-amber-600 dark:text-amber-400">
              <div className="p-2.5 bg-amber-50 dark:bg-amber-950/40 rounded-xl shrink-0">
                <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-black text-gray-900 dark:text-white">Unsaved Score Changes</h3>
                <p className="text-xs text-amber-600 font-bold uppercase tracking-wider">Pending updates detected</p>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
              You have modified scores for <strong className="text-gray-900 dark:text-white">{gridChanges.size} student(s)</strong> that have not been saved yet. What would you like to do before leaving?
            </p>

            <div className="flex flex-col gap-2 pt-2 border-t border-gray-100 dark:border-gray-700">
              <button
                type="button"
                onClick={handleModalSaveAndExit}
                disabled={gridSaving}
                className="w-full py-2.5 px-4 bg-[#003B5C] hover:bg-[#002a42] text-white rounded-xl text-xs sm:text-sm font-bold transition flex items-center justify-center gap-2 shadow-sm"
              >
                {gridSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Save Changes & Continue</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleModalDiscardAndExit}
                className="w-full py-2.5 px-4 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/50 text-rose-700 dark:text-rose-300 rounded-xl text-xs sm:text-sm font-bold transition text-center"
              >
                Discard Unsaved Edits
              </button>

              <button
                type="button"
                onClick={() => setPendingAction(null)}
                className="w-full py-2.5 px-4 border border-gray-200 dark:border-gray-700 rounded-xl text-xs sm:text-sm font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-750 transition text-center"
              >
                Stay on Page
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}