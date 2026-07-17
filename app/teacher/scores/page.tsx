'use client'

import { useState, useEffect, Fragment } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Users, AlertCircle, CheckCircle, Filter, Grid, User } from 'lucide-react'
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

// Small optimization component to prevent the massive grid from re-rendering on every keystroke
function ScoreInput({ 
  initialValue, 
  max, 
  onChange 
}: { 
  initialValue: string | number; 
  max: number; 
  onChange: (val: string) => void;
}) {
  const [val, setVal] = useState(initialValue);
  
  useEffect(() => {
    setVal(initialValue);
  }, [initialValue]);

  return (
    <input
      type="number"
      min="0"
      max={max}
      step="0.1"
      value={val}
      onChange={(e) => setVal(e.target.value)}
      onBlur={() => onChange(val.toString())}
      className="w-14 md:w-16 px-1 py-1 text-center border border-gray-300 dark:border-gray-600 rounded focus:ring-1 focus:ring-ghana-green focus:border-ghana-green text-xs md:text-sm dark:bg-gray-700 dark:text-white"
    />
  );
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
  
  const [activeTab, setActiveTab] = useState<'ungraded' | 'grid'>('grid')
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

  // Grid view state
  const [gridScores, setGridScores] = useState<Record<string, Record<string, { class_score: string, exam_score: string, id?: string }>>>({})
  const [gridSaving, setGridSaving] = useState(false)
  const [gridLoading, setGridLoading] = useState(false)
  const [gridChanges, setGridChanges] = useState<Set<string>>(new Set())
  
  // Dynamic Assessment Columns - Removed for Multi-Subject View
  // const [assessmentColumns, setAssessmentColumns] = useState<{id: string, name: string, max: string}[]>([])
  // const [showColumnSetupModal, setShowColumnSetupModal] = useState(false)

  // Assessment Modal State
  const [showAssessmentModal, setShowAssessmentModal] = useState(false)
  const [currentAssessmentStudent, setCurrentAssessmentStudent] = useState<string | null>(null)
  const [assessmentItems, setAssessmentItems] = useState<{id: string, name: string, score: string, max: string}[]>([])


  // Manual entry state
  const [selectedStudent, setSelectedStudent] = useState('')
  const [manualScores, setManualScores] = useState({
    class_score: '',
    exam_score: '',
    total: '',
    grade: '',
    remarks: ''
  })
  const [submitting, setSubmitting] = useState(false)
  const [submitSuccess, setSubmitSuccess] = useState(false)
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})

  

  // Ungraded subjects state
  const [ungradedData, setUngradedData] = useState<any[]>([])
  const [loadingUngraded, setLoadingUngraded] = useState(false)

  // Subject dropdown visibility state
  const [isSubjectDropdownOpen, setIsSubjectDropdownOpen] = useState(false)

  useEffect(() => {
    async function loadData() {
      try {
        setError(null)
        const user = await getCurrentUser()
        if (!user) {
          router.push('/login?portal=teacher')
          return
        }

        // Parallel Fetch: Settings, Teacher, Subjects, Terms, Current Term
        // We start these requests simultaneously to avoid waterfall
        const [
          settingsRes,
          teacherRes,
          subjectsRes,
          termsRes,
          currentTermRes
        ] = await Promise.all([
          supabase.from('system_settings').select('*').in('setting_key', ['class_score_percentage', 'exam_score_percentage']),
          getTeacherData(user.id),
          supabase.from('subjects').select('id, name, code, level').order('name'),
          supabase.from('academic_terms').select('*').order('created_at', { ascending: false }),
          supabase.from('system_settings').select('setting_value').eq('setting_key', 'current_term').maybeSingle()
        ])

        // 1. Process Grading Settings
        if (settingsRes.data) {
          settingsRes.data.forEach((setting: any) => {
            if (setting.setting_key === 'class_score_percentage') {
              setClassScorePercentage(Number(setting.setting_value))
            } else if (setting.setting_key === 'exam_score_percentage') {
              setExamScorePercentage(Number(setting.setting_value))
            }
          })
        }

        // 2. Process Teacher Data
        if (teacherRes.error || !teacherRes.data) {
          setError('Teacher profile not found. Please contact an administrator.')
          setLoading(false)
          return
        }
        const teacherData = teacherRes.data
        setTeacher(teacherData)

        // 3. Process Subjects
        if (subjectsRes.data) {
          setSubjects(subjectsRes.data)
        }

        // 4. Process Terms & Current Term
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

        // 5. Load teacher's assigned classes (Dependent on Teacher ID)
        const classAccess = await getTeacherClassAccess(teacherData.profile_id)
        if (classAccess.length === 0) {
          setError('You are not assigned to any classes. Please contact an administrator.')
          setLoading(false)
          return
        }

        setTeacherClasses(classAccess.map(c => ({
          class_id: c.class_id,
          class_name: c.class_name,
          level: c.level
        })))

        setLoading(false)
      } catch (err: any) {
        console.error('Error loading data:', err)
        setError(err.message || 'Failed to load data. Please try again.')
        setLoading(false)
      }
    }

    loadData()
  }, [router])

  // Load students when class is selected
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
        setFormErrors({ ...formErrors, class: 'Failed to load students' })
      }
    }

    loadStudents()
  }, [selectedClass])

  // Load ungraded subjects when class and term are selected
  useEffect(() => {
    if (activeTab === 'ungraded' && selectedClass && selectedTerm) {
      loadUngradedSubjects()
    }
  }, [activeTab, selectedClass, selectedTerm])

  async function loadUngradedSubjects() {
    if (!selectedClass || !selectedTerm) return

    setLoadingUngraded(true)
    try {
      // Get all students in the class
      const { data: studentsData, error: studentsError } = await supabase
        .from('students')
        .select('id, student_id, first_name, last_name')
        .eq('class_id', selectedClass)
        .eq('status', 'active')
        .order('first_name') as { data: any[] | null; error: any }

      if (studentsError) throw studentsError

      // Get all subjects for this class level
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

      // Get all existing scores for this class and term
      const { data: scoresData, error: scoresError } = await supabase
        .from('scores')
        .select('student_id, subject_id')
        .in('student_id', studentsData?.map((s: any) => s.id) || [])
        .eq('term_id', selectedTerm) as { data: any[] | null; error: any }

      if (scoresError) throw scoresError

      // Build ungraded report
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
      }).filter(item => item.ungradedCount > 0) // Only show students with missing grades

      setUngradedData(ungradedReport || [])
    } catch (error) {
      console.error('Error loading ungraded subjects:', error)
      setError('Failed to load ungraded subjects')
    } finally {
      setLoadingUngraded(false)
    }
  }

  // Filter subjects based on selected class level AND teacher's assigned subjects
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

      // Get teacher's access for this class
      const fullAccess = await getTeacherClassAccess(teacher.profile_id)
      const access = fullAccess.find(c => c.class_id === selectedClass)
      
      if (!access) {
        setFilteredSubjects([])
        return
      }

      // Determine class category based on class name
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

      // Filter subjects by level first
      let filtered = subjects.filter(s => {
        const subjectLevel = (s as any).level || ''
        return subjectLevel === category
      })

      // If no level-specific subjects found, show all subjects (fallback for when levels aren't configured)
      if (filtered.length === 0) {
        filtered = [...subjects]
      }

      // If teacher does not have permission to edit all subjects, filter to only assigned subjects
      // This applies even to class teachers if they don't have 'can_edit_all_subjects' permission
      if (!access.can_edit_all_subjects) {
        const subjectsTaught = access.subjects_taught || []
        
        const filteredByAssignment = filtered.filter(s => {
            return subjectsTaught.some((assigned: any) => {
                if (typeof assigned === 'string') {
                    return assigned.toLowerCase() === s.name.toLowerCase()
                }
                return String(assigned.subject_id) === String(s.id)
            })
        })
        
        filtered = filteredByAssignment
      }

      setFilteredSubjects(filtered)
      // Reset selected subject if it's not in the filtered list
      if (selectedSubject && !filtered.find(s => s.id === selectedSubject)) {
        setSelectedSubject('')
      }

      // Filter selectedSubjects to ensure they are still valid for the new class/filter
      setSelectedSubjects(prev => prev.filter(id => filtered.find(s => s.id === id)))
    }

    filterSubjects()
  }, [selectedClass, subjects, teacherClasses, selectedSubject, teacher])

    // Score conversion functions
    function convertClassScore(inputScore: number, maxScore: number = 100): number {
      // Convert any class score to max {classScorePercentage}
      return Math.round((inputScore / maxScore) * classScorePercentage * 10) / 10 // Round to 1 decimal
    }
  
    function convertExamScore(inputScore: number): number {
      // Convert any exam score to max {examScorePercentage}
      return Math.round((inputScore / 100) * examScorePercentage * 10) / 10 // Round to 1 decimal
    }  // Auto-calculate total when scores change
  function calculateGrade(total: number): string {
    if (total >= 80) return 'A'
    if (total >= 70) return 'B'
    if (total >= 60) return 'C'
    if (total >= 50) return 'D'
    if (total >= 40) return 'E'
    return 'F'
  }

  function calculateGradeAndRemark(total: number, classLevel: string): { grade: string, remark: string } {
    // Determine if Primary (Basic 1-6) or JHS (Basic 7-9)
    const isPrimary = (classLevel.toLowerCase().includes('basic') || classLevel.toLowerCase().includes('primary')) && 
                      (classLevel.includes('1') || classLevel.includes('2') || 
                       classLevel.includes('3') || classLevel.includes('4') || 
                       classLevel.includes('5') || classLevel.includes('6')) &&
                      !classLevel.toLowerCase().includes('jhs')
    
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




  // Load grid scores when tab is active and filters are selected
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
      
      // Initialize
      students.forEach(student => {
        scoresMap[student.id] = {}
        selectedSubjects.forEach(subjectId => {
            scoresMap[student.id][subjectId] = { class_score: '', exam_score: '' }
        })
      })

      // Fill
      data?.forEach((score: any) => {
        if (scoresMap[score.student_id]) {
            // Class score is raw (max {classScorePercentage})
            let displayClassScore = ''
            if (score.class_score !== null && score.class_score !== undefined) {
                displayClassScore = score.class_score.toString()
            }

            // Convert exam score from {examScorePercentage}-basis to 100-basis for display
            let displayExamScore = ''
            if (score.exam_score !== null && score.exam_score !== undefined) {
                // (Score / {examScorePercentage}) * 100
                const val = (parseFloat(score.exam_score) / examScorePercentage) * 100
                displayExamScore = Math.round(val * 100) / 100 + '' // Round to 2 decimal places
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
      setError('Failed to load scores for grid view')
    } finally {
      setGridLoading(false)
    }
  }

  function handleGridScoreChange(studentId: string, subjectId: string, field: 'class_score' | 'exam_score', value: string) {
    // Allow empty string
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
    
    // Check if valid number
    if (isNaN(numVal)) return 

    // Check ranges
    if (field === 'class_score') {
        if (numVal < 0 || numVal > classScorePercentage) {
            // Invalid class score - ignore input
            return
        }
    } else if (field === 'exam_score') {
        if (numVal < 0 || numVal > 100) {
            // Invalid exam score - ignore input
            return
        }
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



  async function saveGridScores() {
    if (gridChanges.size === 0) return

    setGridSaving(true)
    try {
      // Verify permissions first
      const fullAccess = await getTeacherClassAccess(teacher.profile_id)
      const access = fullAccess.find(c => c.class_id === selectedClass)
      
      if (!access) throw new Error('You do not have access to this class')
      
      const isClassTeacher = Boolean(access.is_class_teacher)
      const subjectsTaught = access.subjects_taught || []

      const updates: any[] = []
      
      Array.from(gridChanges).forEach(studentId => {
        const studentScores = gridScores[studentId]
        if (!studentScores) return

        Object.keys(studentScores).forEach(subjectId => {
            // Check subject permission
            if (!access.can_edit_all_subjects) {
                 const subject = subjects.find(s => s.id === subjectId)
                 const subjectName = subject?.name || ''
                 
                 const isAssigned = subjectsTaught.some((s: any) => {
                    if (typeof s === 'string') return s.toLowerCase() === subjectName.toLowerCase()
                    return String(s.subject_id) === String(subjectId)
                 })
                 
                 if (!isAssigned) {
                     console.warn(`Skipping save for unassigned subject: ${subjectName}`)
                     return // Skip this subject
                 }
            }

            const scoreData = studentScores[subjectId]
            
            // Class score is raw (max {classScorePercentage})
            const inputClassScore = parseFloat(scoreData.class_score)
            const storedClassScore = !isNaN(inputClassScore) ? inputClassScore : NaN

            // Convert input exam score (100-basis) to stored score ({examScorePercentage}-basis)
            const inputExamScore = parseFloat(scoreData.exam_score)
            const storedExamScore = !isNaN(inputExamScore) ? Math.round((inputExamScore / 100) * examScorePercentage * 100) / 100 : NaN
            
            // Only save if at least one score is present or we are updating an existing record
            if (!isNaN(storedClassScore) || !isNaN(storedExamScore) || scoreData.id) {
                const total = (isNaN(storedClassScore) ? 0 : storedClassScore) + (isNaN(storedExamScore) ? 0 : storedExamScore)
                const className = teacherClasses.find(c => c.class_id === selectedClass)?.class_name || ''
                const { grade, remark } = calculateGradeAndRemark(total, className)

                updates.push({
                    id: scoreData.id,
                    student_id: studentId,
                    subject_id: subjectId,
                    term_id: selectedTerm,
                    class_score: isNaN(storedClassScore) ? 0 : storedClassScore,
                    exam_score: isNaN(storedExamScore) ? 0 : storedExamScore,
                    total: total,
                    grade,
                    remarks: remark,
                    teacher_id: teacher.id
                })
            }
        })
      })

      if (updates.length === 0) {
          setGridSaving(false)
          return
      }

      const { error } = await supabase
        .from('scores')
        .upsert(
          updates.map(({ id, ...rest }) => rest),
          { onConflict: 'student_id, subject_id, term_id' }
        )
      
      if (error) throw error

      setGridChanges(new Set())
      loadGridScores()
      setSubmitSuccess(true)
      setTimeout(() => setSubmitSuccess(false), 3000)

    } catch (err: any) {
      console.error('Error saving grid scores:', err)
      setError('Failed to save scores: ' + err.message)
    } finally {
      setGridSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
          <header className="bg-white dark:bg-gray-800 shadow">
            <div className="container mx-auto px-4 py-4">
               <div className="flex items-center gap-4">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <div className="space-y-2">
                       <Skeleton className="h-6 w-48 rounded" />
                       <Skeleton className="h-4 w-32 rounded" />
                  </div>
               </div>
            </div>
          </header>
          <main className="flex-1 container mx-auto px-4 py-8">
            <div className="space-y-6">
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                   <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                       <Skeleton className="h-10 w-full" />
                       <Skeleton className="h-10 w-full" />
                       <Skeleton className="h-10 w-full" />
                   </div>
                    <Skeleton className="h-10 w-full mb-4" />
                   <Skeleton className="h-96 w-full rounded" />
                </div>
            </div>
          </main>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-md p-8 max-w-md">
          <div className="flex items-center space-x-3 text-red-600 mb-4">
            <AlertCircle className="w-8 h-8" />
            <h2 className="text-xl font-semibold">Error Loading Page</h2>
          </div>
          <p className="text-gray-700 mb-6">{error}</p>
          <div className="flex space-x-4">
            <button
              onClick={() => window.location.reload()}
              className="flex-1 bg-ghana-green text-white px-4 py-2 rounded hover:bg-green-700 transition"
            >
              Try Again
            </button>
            <Link
              href="/teacher/dashboard"
              className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded hover:bg-gray-300 transition text-center"
            >
              Go to Dashboard
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 shadow">
        <div className="container mx-auto px-4 md:px-6 py-4">
          <div className="flex items-center gap-4">
            <BackButton href="/teacher/manage-scores" />
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-gray-800 dark:text-white">Exam Scores</h1>
              <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400">Manage exam scores with spreadsheet view</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 md:px-6 py-8">
        <div className="max-w-4xl xl:max-w-5xl w-full mx-auto">
          

                    {/* Tab Navigation */}
          <div className="bg-white dark:bg-gray-800 rounded-t-lg shadow border-b dark:border-gray-700 overflow-x-auto scrollbar-hide">
            <div className="flex min-w-full md:min-w-max">
              <button
                onClick={() => setActiveTab('grid')}
                className={`flex-1 flex items-center justify-center space-x-2 px-3 py-3 md:px-6 md:py-4 text-xs md:text-sm font-medium transition-colors whitespace-nowrap ${
                  activeTab === 'grid'
                    ? 'text-ghana-green border-b-2 border-ghana-green'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                }`}
              >
                <Grid className="w-4 h-4 md:w-5 md:h-5" />
                <span className="hidden md:inline">Spreadsheet View</span>
                <span className="md:hidden">Grid</span>
              </button>
              <button
                onClick={() => setActiveTab('ungraded')}
                className={`flex-1 flex items-center justify-center space-x-2 px-3 py-3 md:px-6 md:py-4 text-xs md:text-sm font-medium transition-colors whitespace-nowrap ${
                  activeTab === 'ungraded'
                    ? 'text-ghana-green border-b-2 border-ghana-green'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                }`}
              >
                <AlertCircle className="w-4 h-4 md:w-5 md:h-5" />
                <span>Ungraded Subjects</span>
              </button>
            </div>
          </div>

                    

          {/* Ungraded Subjects Tab */}
          {activeTab === 'ungraded' && (
            <div className="bg-white dark:bg-gray-800 rounded-b-lg shadow p-4 md:p-6">
              {/* Filters */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div>
                  <label className="block text-xs md:text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Class *
                  </label>
                  <select
                    value={selectedClass}
                    onChange={(e) => setSelectedClass(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-ghana-green focus:border-transparent dark:bg-gray-700 dark:text-white"
                  >
                    <option value="">Select Class</option>
                    {teacherClasses.map(cls => (
                      <option key={cls.class_id} value={cls.class_id}>
                        {cls.class_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs md:text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Term *
                  </label>
                  <div className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium">
                    {currentTermName || 'No current term set'}
                  </div>
                </div>
              </div>

              {/* Ungraded Report */}
              {ungradedData.length > 0 ? (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
                  <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700 border-b dark:border-gray-600 flex justify-between items-center">
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
                      Ungraded Subjects Report
                    </h3>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {ungradedData.length} students with missing grades
                    </span>
                  </div>
                  <div
                    className="overflow-x-auto w-full max-w-[calc(100vw-6rem)] md:max-w-full mx-auto"
                    style={{ scrollbarGutter: 'stable both-edges' }}
                  >
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                      <thead className="bg-gray-50 dark:bg-gray-700">
                        <tr>
                          <th scope="col" className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Student
                          </th>
                          <th scope="col" className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Missing Subjects
                          </th>
                          <th scope="col" className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Progress
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                        {ungradedData.map((item, index) => (
                          <tr key={item.student.id} className={index % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-700/50'}>
                            <td className="px-3 md:px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="flex-shrink-0 h-10 w-10 bg-gray-100 dark:bg-gray-600 rounded-full flex items-center justify-center">
                                  <User className="h-5 w-5 text-gray-500 dark:text-gray-300" />
                                </div>
                                <div className="ml-4">
                                  <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                    {item.student.first_name} {item.student.last_name}
                                  </div>
                                  <div className="text-sm text-gray-500 dark:text-gray-400">
                                    {item.student.student_id}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-3 md:px-6 py-4">
                              <div className="flex flex-wrap gap-2">
                                {item.missingSubjects.map((subject: any) => (
                                  <span 
                                    key={subject.id}
                                    className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-200"
                                  >
                                    {subject.name}
                                  </span>
                                ))}
                              </div>
                            </td>
                            <td className="px-3 md:px-6 py-4 whitespace-nowrap">
                              <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2.5 max-w-[100px]">
                                <div 
                                  className="bg-blue-600 h-2.5 rounded-full" 
                                  style={{ width: `${(item.gradedCount / item.totalSubjects) * 100}%` }}
                                ></div>
                              </div>
                              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                {item.gradedCount} of {item.totalSubjects} graded
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                  <AlertCircle className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-3" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No Data</h3>
                  <p className="text-gray-600 dark:text-gray-400">No ungraded subjects found for the selected criteria.</p>
                </div>
              )}
            </div>
          )}

          {/* Spreadsheet View Tab */}
          {activeTab === 'grid' && (
            <div className="bg-white dark:bg-gray-800 rounded-b-lg shadow p-4 md:p-6">
              {/* Filters */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div>
                  <label className="block text-xs md:text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Class *
                  </label>
                  <select
                    value={selectedClass}
                    onChange={(e) => setSelectedClass(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-ghana-green focus:border-transparent dark:bg-gray-700 dark:text-white"
                  >
                    <option value="">Select Class</option>
                    {teacherClasses.map(cls => (
                      <option key={cls.class_id} value={cls.class_id}>
                        {cls.class_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="relative">
                  <label className="block text-xs md:text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Subjects *
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsSubjectDropdownOpen(!isSubjectDropdownOpen)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-ghana-green focus:border-transparent text-left bg-white dark:bg-gray-700 flex justify-between items-center"
                  >
                    <span className="truncate dark:text-white">
                      {selectedSubjects.length === 0 
                        ? 'Select Subjects' 
                        : `${selectedSubjects.length} Selected`}
                    </span>
                    <Filter className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                  </button>
                  
                  {isSubjectDropdownOpen && (
                    <div className="absolute z-50 mt-1 w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      <div className="p-2 border-b dark:border-gray-600 sticky top-0 bg-white dark:bg-gray-700">
                        <button
                            onClick={() => {
                                if (selectedSubjects.length === filteredSubjects.length) {
                                    setSelectedSubjects([])
                                } else {
                                    setSelectedSubjects(filteredSubjects.map(s => s.id))
                                }
                            }}
                            className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium"
                        >
                            {selectedSubjects.length === filteredSubjects.length ? 'Deselect All' : 'Select All'}
                        </button>
                      </div>
                      {filteredSubjects.map(subject => (
                        <label key={subject.id} className="flex items-center px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-600 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selectedSubjects.includes(subject.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedSubjects([...selectedSubjects, subject.id])
                              } else {
                                setSelectedSubjects(selectedSubjects.filter(id => id !== subject.id))
                              }
                            }}
                            className="mr-3 h-4 w-4 text-ghana-green focus:ring-ghana-green border-gray-300 dark:border-gray-500 rounded dark:bg-gray-600"
                          />
                          <span className="text-sm text-gray-700 dark:text-gray-200">{subject.name}</span>
                        </label>
                      ))}
                    </div>
                  )}
                  {/* Overlay to close dropdown */}
                  {isSubjectDropdownOpen && (
                    <div 
                        className="fixed inset-0 z-40" 
                        onClick={() => setIsSubjectDropdownOpen(false)}
                    ></div>
                  )}
                </div>

                <div>
                  <label className="block text-xs md:text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Term *
                  </label>
                  <div className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium">
                    {currentTermName || 'No current term set'}
                  </div>
                </div>
              </div>

              {/* Grid Table */}
              {selectedClass && selectedSubjects.length > 0 && selectedTerm ? (
                <div>
                  <div className="flex flex-col md:flex-row items-center justify-between mb-4 gap-4">
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 whitespace-nowrap">
                      Enter Scores ({students.length} Students)
                    </h3>
                    
                    <div className="flex-1 w-full md:max-w-md flex gap-2">
                       <div className="relative flex-1">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type="text"
                          placeholder="Search students..."
                          value={gridSearchQuery}
                          onChange={(e) => setGridSearchQuery(e.target.value)}
                          className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-ghana-green focus:border-transparent dark:bg-gray-700 dark:text-white sm:text-sm"
                        />
                      </div>
                      <select
                        value={gridSortOrder}
                        onChange={(e) => setGridSortOrder(e.target.value as any)}
                        className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-ghana-green focus:border-transparent dark:bg-gray-700 dark:text-white sm:text-sm"
                      >
                        <option value="default">Default Sort</option>
                        <option value="male_first">Males First</option>
                        <option value="female_first">Females First</option>
                      </select>
                    </div>

                    <div className="flex space-x-2">
                      <button
                        onClick={saveGridScores}
                        disabled={gridSaving || gridChanges.size === 0}
                        className="bg-ghana-green text-white px-6 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 transition"
                      >
                        {gridSaving ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white dark:border-gray-800"></div>
                            <span>Saving...</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle className="w-5 h-5" />
                            <span>Save Changes ({gridChanges.size})</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {gridLoading ? (
                    <div className="text-center py-12">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-ghana-green mx-auto mb-4"></div>
                      <p className="text-gray-600 dark:text-gray-400">Loading scores...</p>
                    </div>
                  ) : students.length === 0 ? (
                    <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                      <Users className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-3" />
                      <p className="text-gray-600 dark:text-gray-400">No students found in this class.</p>
                    </div>
                  ) : (
                    <div
                      className="border dark:border-gray-700 rounded-lg max-h-[70vh] w-full max-w-[calc(100vw-6rem)] md:max-w-full overflow-auto relative min-w-0 mx-auto"
                      style={{ scrollbarGutter: 'stable both-edges' }}
                    >
                      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 border-collapse">
                        <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0 z-30 shadow-sm">
                          <tr>
                            <th rowSpan={2} className="px-1 md:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider sticky left-0 bg-gray-50 dark:bg-gray-700 z-40 border-r dark:border-r-gray-600 border-b dark:border-b-gray-600 w-[80px] min-w-[80px] max-w-[80px] md:w-auto md:min-w-[200px] md:max-w-none shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                              Student
                            </th>
                            {selectedSubjects.map(subjectId => {
                                const subject = filteredSubjects.find(s => s.id === subjectId)
                                return (
                                    <th key={subjectId} colSpan={4} className="px-2 md:px-6 py-2 text-center text-xs font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wider border-b dark:border-b-gray-600 border-r dark:border-r-gray-600 bg-gray-100 dark:bg-gray-600 min-w-[260px]">
                                        <div className="truncate max-w-[260px] mx-auto">{subject?.name || 'Unknown Subject'}</div>
                                    </th>
                                )
                            })}
                          </tr>
                          <tr>
                            {selectedSubjects.map(subjectId => (
                                <Fragment key={subjectId}>
                                    <th key={`${subjectId}-class`} className="px-1 py-2 text-center text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider border-b dark:border-b-gray-600 min-w-[65px] bg-gray-50 dark:bg-gray-700">Class ({classScorePercentage}%)</th>
                                    <th key={`${subjectId}-exam`} className="px-1 py-2 text-center text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider border-b dark:border-b-gray-600 min-w-[65px] bg-gray-50 dark:bg-gray-700">Exam (100%)</th>
                                    <th key={`${subjectId}-total`} className="px-1 py-2 text-center text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider border-b dark:border-b-gray-600 min-w-[65px] bg-gray-50 dark:bg-gray-700">Total</th>
                                    <th key={`${subjectId}-grade`} className="px-1 py-2 text-center text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider border-b dark:border-b-gray-600 min-w-[65px] border-r dark:border-r-gray-600 bg-gray-50 dark:bg-gray-700">Grade</th>
                                </Fragment>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                          {students.filter(student => {
                            const query = gridSearchQuery.toLowerCase()
                            return (
                              student.first_name.toLowerCase().includes(query) ||
                              student.last_name.toLowerCase().includes(query) ||
                              student.student_id.toLowerCase().includes(query)
                            )
                          }).sort((a, b) => {
                            // Secondary sort by name (Last Name then First Name)
                            const nameCompare = a.last_name.localeCompare(b.last_name) || a.first_name.localeCompare(b.first_name)

                            if (gridSortOrder === 'default') {
                              // If default, we can respect the original fetch order (which is first_name) 
                              // or enforce last_name sort. Users usually prefer last_name in lists.
                              // Let's stick to the explicit name compare for consistency.
                              return nameCompare
                            }

                            const genderA = a.gender?.toLowerCase()
                            const genderB = b.gender?.toLowerCase()

                            // If genders are the same, use name comparison
                            if (genderA === genderB) return nameCompare

                            if (gridSortOrder === 'male_first') {
                              return genderA === 'male' ? -1 : 1
                            }
                            
                            if (gridSortOrder === 'female_first') {
                              return genderA === 'female' ? -1 : 1
                            }
                            
                            return nameCompare
                          }).map((student) => {
                            const hasChanges = gridChanges.has(student.id)
                            return (
                              <tr key={student.id} className={hasChanges ? 'bg-blue-50 dark:bg-blue-900/20' : 'hover:bg-gray-50 dark:hover:bg-gray-700'}>
                                <td className="px-1 md:px-6 py-4 sticky left-0 bg-white dark:bg-gray-800 z-20 border-r dark:border-r-gray-600 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] w-[80px] min-w-[80px] max-w-[80px] md:w-auto md:min-w-[200px] md:max-w-none">
                                  <div className="text-xs md:text-sm font-medium text-gray-900 dark:text-gray-100 whitespace-normal break-words leading-tight">
                                    {student.last_name}, {student.first_name} {student.middle_name}
                                  </div>
                                  <div className="text-[10px] md:text-xs text-gray-500 dark:text-gray-400 truncate mt-1">
                                    {student.student_id}
                                  </div>
                                </td>
                                {selectedSubjects.map(subjectId => {
                                    const scores = gridScores[student.id]?.[subjectId] || { class_score: '', exam_score: '' }
                                    const classScore = parseFloat(scores.class_score) || 0
                                    const examScore = parseFloat(scores.exam_score) || 0
                                    // Calculate total: Class + (Exam * (examScorePercentage / 100))
                                    const total = classScore + (examScore * (examScorePercentage / 100))
                                    const className = teacherClasses.find(c => c.class_id === selectedClass)?.class_name || ''
                                    const { grade } = calculateGradeAndRemark(total, className)
                                    const hasData = scores.class_score || scores.exam_score

                                    return (
                                        <Fragment key={subjectId}>
                                            <td key={`${subjectId}-class`} className="px-1 md:px-2 py-4 whitespace-nowrap text-center min-w-[70px]">
                                                <ScoreInput
                                                    initialValue={scores.class_score}
                                                    max={40}
                                                    onChange={(val) => handleGridScoreChange(student.id, subjectId, 'class_score', val)}
                                                />
                                            </td>
                                            <td key={`${subjectId}-exam`} className="px-1 md:px-2 py-4 whitespace-nowrap text-center min-w-[70px]">
                                                <ScoreInput
                                                    initialValue={scores.exam_score}
                                                    max={100}
                                                    onChange={(val) => handleGridScoreChange(student.id, subjectId, 'exam_score', val)}
                                                />
                                            </td>
                                            <td key={`${subjectId}-total`} className="px-1 md:px-2 py-4 whitespace-nowrap text-center min-w-[60px]">
                                                <span className={`text-xs md:text-sm font-medium ${total > 0 ? 'text-gray-900 dark:text-gray-100' : 'text-gray-400 dark:text-gray-500'}`}>
                                                    {hasData ? total.toFixed(1) : '-'}
                                                </span>
                                            </td>
                                            <td key={`${subjectId}-grade`} className="px-1 md:px-2 py-4 whitespace-nowrap text-center border-r dark:border-r-gray-600 min-w-[60px]">
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] md:text-xs font-medium ${
                                                    !hasData ? 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400' :
                                                    total >= 50 ? 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200' : 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-200'
                                                }`}>
                                                    {hasData ? grade : '-'}
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
                  )}
                </div>
              ) : (
                <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                  <Filter className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-3" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">Select Filters</h3>
                  <p className="text-gray-600 dark:text-gray-400">Please select a class, at least one subject, and term to view the score grid.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
