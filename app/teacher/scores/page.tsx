'use client'

import { useState, useEffect, Fragment } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, FileText, Upload, Download, Users, AlertCircle, CheckCircle, XCircle, Filter, BookOpen, Camera, Grid, Calculator, Plus, Trash2, User } from 'lucide-react'
import { getCurrentUser, getTeacherData } from '@/lib/auth'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'
import { getTeacherClassAccess } from '@/lib/teacher-permissions'

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
  class_id: string
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
  
  const [activeTab, setActiveTab] = useState<'manual' | 'csv' | 'ungraded' | 'grid'>('manual')
  const [selectedClass, setSelectedClass] = useState('')
  const [selectedSubject, setSelectedSubject] = useState('')
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([])
  const [selectedTerm, setSelectedTerm] = useState('')
  const [currentTermName, setCurrentTermName] = useState('')
  const [terms, setTerms] = useState<any[]>([])
  
  // Score type selection
  const [scoreType, setScoreType] = useState<'both' | 'class_only' | 'exam_only'>('both')

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

  // CSV upload state
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadResults, setUploadResults] = useState<{
    success: number
    failed: number
    errors: string[]
  } | null>(null)

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

        const { data: teacherData, error: teacherError } = await getTeacherData(user.id)
        if (teacherError || !teacherData) {
          setError('Teacher profile not found. Please contact an administrator.')
          setLoading(false)
          return
        }

        setTeacher(teacherData)

        // Load teacher's assigned classes
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

        // Load all subjects with level
        const { data: subjectsData, error: subjectsError } = await supabase
          .from('subjects')
          .select('id, name, code, level')
          .order('name') as { data: any[] | null; error: any }

        if (!subjectsError && subjectsData) {
          setSubjects(subjectsData)
        }

        // Load terms
        const { data: termsData, error: termsError } = await supabase
          .from('academic_terms')
          .select('*')
          .order('created_at', { ascending: false }) as { data: any[] | null; error: any }

        if (!termsError && termsData) {
          setTerms(termsData)
          
          // Auto-select current term from system settings
          try {
            const { data: currentTermData } = await supabase
              .from('system_settings')
              .select('setting_value')
              .eq('setting_key', 'current_term')
              .maybeSingle() as { data: any }
            
            if (currentTermData?.setting_value) {
              const matchingTerm = termsData.find((t: any) => t.id === currentTermData.setting_value)
              if (matchingTerm) {
                setSelectedTerm(currentTermData.setting_value)
                setCurrentTermName(`${matchingTerm.name} (${matchingTerm.academic_year})`)
              }
            }
          } catch (err) {
            console.error('Error loading current term:', err)
          }
        }

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
          .select('id, student_id, first_name, last_name, class_id')
          .eq('class_id', selectedClass)
          .eq('status', 'active')
          .order('first_name') as { data: any[] | null; error: any }

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
    // Convert any class score to max 40
    // Example: 80/100 -> (80/100) * 40 = 32/40
    return Math.round((inputScore / maxScore) * 40 * 10) / 10 // Round to 1 decimal
  }

  function convertExamScore(inputScore: number): number {
    // Convert exam score from 100 to 60
    // Example: 85/100 -> (85/100) * 60 = 51/60
    return Math.round((inputScore / 100) * 60 * 10) / 10 // Round to 1 decimal
  }

  // Auto-calculate total when scores change
  useEffect(() => {
    const classScore = parseFloat(manualScores.class_score)
    const examScore = parseFloat(manualScores.exam_score)
    
    // Convert scores before calculating total (only if provided)
    const convertedClassScore = !isNaN(classScore) ? convertClassScore(classScore) : 0
    const convertedExamScore = !isNaN(examScore) ? convertExamScore(examScore) : 0
    const total = convertedClassScore + convertedExamScore

    if (manualScores.class_score || manualScores.exam_score) {
      setManualScores(prev => ({
        ...prev,
        total: total.toFixed(1),
        grade: calculateGrade(total)
      }))
    }
  }, [manualScores.class_score, manualScores.exam_score])

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




  function validateManualForm(): boolean {
    const errors: Record<string, string> = {}

    if (!selectedClass) errors.class = 'Please select a class'
    if (!selectedSubject) errors.subject = 'Please select a subject'
    if (!selectedTerm) errors.term = 'Please select a term'
    if (!selectedStudent) errors.student = 'Please select a student'
    
    const classScore = parseFloat(manualScores.class_score)
    const examScore = parseFloat(manualScores.exam_score)

    // Validate based on score type
    if (scoreType === 'both') {
      if (!manualScores.class_score && !manualScores.exam_score) {
        errors.class_score = 'At least one score (class or exam) is required'
        errors.exam_score = 'At least one score (class or exam) is required'
      }
    } else if (scoreType === 'class_only') {
      if (!manualScores.class_score) {
        errors.class_score = 'Class score is required'
      }
    } else if (scoreType === 'exam_only') {
      if (!manualScores.exam_score) {
        errors.exam_score = 'Exam score is required'
      }
    }

    // Validate class score if provided
    if (manualScores.class_score && (isNaN(classScore) || classScore < 0 || classScore > 100)) {
      errors.class_score = 'Class score must be between 0 and 100 (will be converted to max 40)'
    }

    // Validate exam score if provided
    if (manualScores.exam_score && (isNaN(examScore) || examScore < 0 || examScore > 100)) {
      errors.exam_score = 'Exam score must be between 0 and 100 (will be converted to max 60)'
    }

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  async function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!validateManualForm()) return

    setSubmitting(true)
    setSubmitSuccess(false)

    try {
      // Check if teacher can edit this subject
      const classAccess = teacherClasses.find(c => c.class_id === selectedClass)
      if (!classAccess) {
        throw new Error('You do not have access to this class')
      }

      // Get full class access with subject permissions
      const fullAccess = await getTeacherClassAccess(teacher.profile_id)
      console.log('Full access from RPC:', JSON.stringify(fullAccess, null, 2))
      
      const access = fullAccess.find(c => c.class_id === selectedClass)
      console.log('Access for selected class:', JSON.stringify(access, null, 2))
      
      if (!access) {
        throw new Error('You do not have access to this class')
      }

      // SIMPLIFIED PERMISSION CHECK:
      // Class teachers (is_class_teacher = true) can ALWAYS edit scores for their class
      // This is the expected behavior for lower-primary teachers
      const isClassTeacher = Boolean(access.is_class_teacher)
      
      console.log('isClassTeacher:', isClassTeacher)
      console.log('can_edit_all_subjects:', access.can_edit_all_subjects)
      
      // If class teacher OR has edit all permission, allow editing - no further checks needed
      if (!isClassTeacher && !access.can_edit_all_subjects) {
        // Not a class teacher and doesn't have edit all permission
        // Check if they're assigned to this specific subject
        const subjectsTaught = access.subjects_taught || []
        
        // The RPC returns subject names as strings, not objects with subject_id
        // So we need to match by subject name instead
        const selectedSubjectData = subjects.find(s => s.id === selectedSubject)
        const selectedSubjectName = selectedSubjectData?.name || ''
        
        console.log('Checking subject permission for:', selectedSubjectName)
        console.log('Teacher subjects_taught:', subjectsTaught)
        
        const subjectsTaughtMatches = subjectsTaught.some((s: any) => {
          if (typeof s === 'string') {
            // RPC returns subject names as strings
            return s === selectedSubjectName
          }
          // Fallback: check by subject_id if it's an object
          return String(s.subject_id) === String(selectedSubject)
        })
        
        if (!subjectsTaughtMatches) {
          throw new Error('You are not assigned to teach this subject')
        }
      }

      const rawClassName = classAccess?.class_name || ''
      const className = rawClassName
      
      // Fetch existing score first to support cumulative class scores
      const { data: existingScoreData, error: fetchError } = await supabase
        .from('scores')
        .select('class_score, exam_score')
        .eq('student_id', selectedStudent)
        .eq('subject_id', selectedSubject)
        .eq('term_id', selectedTerm)
        .maybeSingle()
      
      if (fetchError) throw fetchError

      const currentClassScore = existingScoreData?.class_score || 0
      const currentExamScore = existingScoreData?.exam_score || 0

      // Convert scores before saving (only if provided)
      const classScoreInput = parseFloat(manualScores.class_score)
      const examScoreInput = parseFloat(manualScores.exam_score)
      
      let finalClassScore = currentClassScore
      let finalExamScore = currentExamScore

      // Logic: Class scores are cumulative (added to existing), Exam scores are overwritten
      if (!isNaN(classScoreInput)) {
          const convertedInput = convertClassScore(classScoreInput)
          finalClassScore = Math.min(40, currentClassScore + convertedInput)
      }

      if (!isNaN(examScoreInput)) {
          finalExamScore = convertExamScore(examScoreInput)
      }
      
      const convertedTotal = finalClassScore + finalExamScore
      
      const gradeData = calculateGradeAndRemark(convertedTotal, className)

      const { error } = await supabase
        .from('scores')
        .upsert({
          student_id: selectedStudent,
          subject_id: selectedSubject,
          term_id: selectedTerm,
          class_score: finalClassScore,
          exam_score: finalExamScore,
          total: convertedTotal,
          grade: gradeData.grade,
          remarks: gradeData.remark,
          teacher_id: teacher.id
        }, { onConflict: 'student_id, subject_id, term_id' })

      if (error) throw error

      setSubmitSuccess(true)
      setManualScores({
        class_score: '',
        exam_score: '',
        total: '',
        grade: '',
        remarks: ''
      })
      setSelectedStudent('')
      setFormErrors({})

      setTimeout(() => setSubmitSuccess(false), 5000)
    } catch (error: any) {
      console.error('Error submitting score:', error)
      setFormErrors({ submit: error.message || 'Failed to submit score. Please try again.' })
    } finally {
      setSubmitting(false)
    }
  }

  async function handleCsvUpload() {
    if (!csvFile || !selectedClass || !selectedTerm) {
      setFormErrors({ csv: 'Please select class, term, and CSV file' })
      return
    }

    if (!csvFile.name.endsWith('.csv')) {
      setFormErrors({ csv: 'Please upload a CSV file (.csv)' })
      return
    }

    if (csvFile.size > 5 * 1024 * 1024) {
      setFormErrors({ csv: 'File size must be less than 5MB' })
      return
    }

    setUploading(true)
    setUploadResults(null)
    setFormErrors({})

    try {
      const text = await csvFile.text()
      const lines = text.split('\n').filter(line => line.trim())

      if (lines.length < 2) {
        setFormErrors({ csv: 'CSV file must contain at least a header row and one data row' })
        setUploading(false)
        return
      }

      const headers = lines[0].split(',').map(h => h.trim().toLowerCase())

      // Auto-detect subjects from CSV headers
      // Headers should be: student_name, subject1_class, subject1_exam, subject2_class, subject2_exam, ...
      const detectedSubjects: Subject[] = []
      const subjectNames = new Set<string>()

      headers.forEach(header => {
        if (header === 'student_name') return
        
        // Extract subject name from header (e.g., "mathematics_class" -> "mathematics")
        const match = header.match(/^(.+?)_(class|exam)$/)
        if (match) {
          subjectNames.add(match[1].replace(/_/g, ' '))
        }
      })

      // Match detected subject names with database subjects
      for (const subjectName of subjectNames) {
        const subject = filteredSubjects.find(s => 
          s.name.toLowerCase().replace(/\s+/g, ' ') === subjectName.toLowerCase()
        )
        if (subject) {
          detectedSubjects.push(subject)
        } else {
          setFormErrors({ csv: `Subject "${subjectName}" not found in system. Please check CSV headers.` })
          setUploading(false)
          return
        }
      }

      if (detectedSubjects.length === 0) {
        setFormErrors({ csv: 'No valid subjects detected in CSV. Headers should be: student_name, subject_name_class, subject_name_exam' })
        setUploading(false)
        return
      }

      const subjectsToInclude = detectedSubjects

      const results = {
        success: 0,
        failed: 0,
        errors: [] as string[]
      }

      // Process each row
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim())

        try {
          // Build row data object
          const rowData: any = {}
          headers.forEach((header, index) => {
            rowData[header] = values[index]
          })

          // Validate student identifier
          if (!rowData.student_name) {
            results.failed++
            results.errors.push(`Row ${i + 1}: Missing student_name`)
            continue
          }

          // Parse name (assuming format: "LastName FirstName")
          const nameParts = rowData.student_name.trim().split(/\s+/)
          const lastName = nameParts[0]
          const firstName = nameParts.slice(1).join(' ') || lastName

          const { data: studentData, error: studentError } = await supabase
            .from('students')
            .select('id')
            .eq('class_id', selectedClass)
            .ilike('last_name', lastName)
            .ilike('first_name', `%${firstName}%`)
            .maybeSingle() as { data: any; error: any }

          if (studentError || !studentData) {
            results.failed++
            results.errors.push(`Row ${i + 1}: Student "${rowData.student_name}" not found in selected class`)
            continue
          }

          // Process scores for each selected subject
          const className = teacherClasses.find(c => c.class_id === selectedClass)?.class_name || ''
          
          for (const subject of subjectsToInclude) {
            const shortName = subject!.name.replace(/\s+/g, '_').toLowerCase()
            const classScoreKey = `${shortName}_class`
            const examScoreKey = `${shortName}_exam`

            const classScore = parseFloat(rowData[classScoreKey])
            const examScore = parseFloat(rowData[examScoreKey])

            // Skip if both scores are empty
            if (isNaN(classScore) && isNaN(examScore)) {
              continue
            }

            // Validate class score if provided
            if (!isNaN(classScore) && (classScore < 0 || classScore > 100)) {
              results.failed++
              results.errors.push(`Row ${i + 1}, ${subject!.name}: Invalid class score (must be 0-100)`)
              continue
            }

            // Validate exam score if provided
            if (!isNaN(examScore) && (examScore < 0 || examScore > 100)) {
              results.failed++
              results.errors.push(`Row ${i + 1}, ${subject!.name}: Invalid exam score (must be 0-100)`)
              continue
            }

            // Convert scores before calculating total (only if provided)
            const convertedClassScore = !isNaN(classScore) ? convertClassScore(classScore) : 0
            const convertedExamScore = !isNaN(examScore) ? convertExamScore(examScore) : 0
            const total = convertedClassScore + convertedExamScore
            const gradeData = calculateGradeAndRemark(total, className)

            const { error } = await supabase
              .from('scores')
              .insert({
                student_id: studentData.id,
                subject_id: subject!.id,
                term_id: selectedTerm,
                class_score: convertedClassScore,
                exam_score: convertedExamScore,
                total: total,
                grade: gradeData.grade,
                remarks: gradeData.remark,
                teacher_id: teacher.id
              })

            if (error) {
              results.failed++
              results.errors.push(`Row ${i + 1}, ${subject!.name}: ${error.message}`)
            } else {
              results.success++
            }
          }

          // Rate limiting
          if (i % 5 === 0) {
            await new Promise(resolve => setTimeout(resolve, 1000))
          }
        } catch (error: any) {
          results.failed++
          results.errors.push(`Row ${i + 1}: ${error.message}`)
        }
      }

      setUploadResults(results)

      if (results.success > 0) {
        setCsvFile(null)
      }
    } catch (error: any) {
      console.error('Error processing CSV:', error)
      setFormErrors({ csv: error.message || 'Failed to process CSV file. Please try again.' })
      setUploadResults(null)
    } finally {
      setUploading(false)
    }
  }

  async function downloadTemplate() {
    if (!selectedClass) {
      alert('Please select a class first to download the template with student names.')
      return
    }

    // Check if at least one subject is selected
    if (selectedSubjects.length === 0) {
      alert('Please select at least one subject to include in the template.')
      return
    }

    try {
      // Fetch all students in the selected class
      const { data: classStudents, error } = await supabase
        .from('students')
        .select('student_id, first_name, last_name')
        .eq('class_id', selectedClass)
        .eq('status', 'active')
        .order('last_name') as { data: any[] | null; error: any }

      if (error) throw error

      // Get only the selected subjects in the order they were selected
      const subjectsToInclude = selectedSubjects
        .map(id => filteredSubjects.find(s => s.id === id))
        .filter(Boolean)
      const subjectNames = subjectsToInclude.map(s => s!.name)

      // Build header based on score type
      let template = 'student_name'
      subjectNames.forEach(subjectName => {
        const shortName = subjectName.replace(/\s+/g, '_').toLowerCase()
        if (scoreType === 'both') {
          template += `,${shortName}_class,${shortName}_exam`
        } else if (scoreType === 'class_only') {
          template += `,${shortName}_class`
        } else if (scoreType === 'exam_only') {
          template += `,${shortName}_exam`
        }
      })
      template += '\n'

      // Helper to add empty cells for each subject based on scoreType
      const addEmptyCells = () => {
        subjectNames.forEach(() => {
          if (scoreType === 'both') {
            template += ',,'
          } else {
            template += ','
          }
        })
      }

      if (classStudents && classStudents.length > 0) {
        // Add all students from the selected class with empty cells
        classStudents.forEach(student => {
          const fullName = `${student.last_name} ${student.first_name}`
          template += fullName
          addEmptyCells()
          template += '\n'
        })
      } else {
        // If no students, add sample data
        template += 'Mensah Kwame'
        addEmptyCells()
        template += '\n'
        template += 'Asante Ama'
        addEmptyCells()
        template += '\n'
      }

      const blob = new Blob([template], { type: 'text/csv' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const className = teacherClasses.find(c => c.class_id === selectedClass)?.class_name || 'class'
      a.download = `exam_scores_${className.replace(/\s+/g, '_')}_template.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
    } catch (error: any) {
      console.error('Error generating template:', error)
      alert('Failed to generate template. Please try again.')
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
            // Class score is raw (max 40)
            let displayClassScore = ''
            if (score.class_score !== null && score.class_score !== undefined) {
                displayClassScore = score.class_score.toString()
            }

            // Convert exam score from 60-basis to 100-basis for display
            let displayExamScore = ''
            if (score.exam_score !== null && score.exam_score !== undefined) {
                // (Score / 60) * 100
                const val = (parseFloat(score.exam_score) / 60) * 100
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
        if (numVal < 0 || numVal > 40) {
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
            
            // Class score is raw (max 40)
            const inputClassScore = parseFloat(scoreData.class_score)
            const storedClassScore = !isNaN(inputClassScore) ? inputClassScore : NaN

            // Convert input exam score (100-basis) to stored score (60-basis)
            const inputExamScore = parseFloat(scoreData.exam_score)
            const storedExamScore = !isNaN(inputExamScore) ? Math.round((inputExamScore / 100) * 60 * 100) / 100 : NaN
            
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-ghana-green mx-auto mb-4"></div>
          <p className="text-gray-600">Loading exam scores...</p>
        </div>
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
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center space-x-4">
            <Link href="/teacher/dashboard" className="text-ghana-green hover:text-green-700">
              <ArrowLeft className="w-6 h-6" />
            </Link>
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-gray-800 dark:text-white">Exam Scores</h1>
              <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400">Enter exam scores manually or upload via CSV</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        <div className="max-w-4xl mx-auto">
          {/* OCR Option Banner */}
          <div className="bg-gradient-to-r from-blue-50 to-green-50 dark:from-blue-900/20 dark:to-green-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Camera className="w-8 h-8 text-ghana-green" />
                <div>
                  <h3 className="font-semibold text-gray-800 dark:text-gray-100">Can't type? Use OCR!</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300">Upload a photo of your handwritten scores and let AI extract them</p>
                </div>
              </div>
              <Link
                href="/teacher/scores/ocr"
                className="bg-ghana-green text-white px-6 py-2 rounded-lg hover:bg-green-700 transition flex items-center space-x-2"
              >
                <Camera className="w-5 h-5" />
                <span>Try OCR Entry</span>
              </Link>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="bg-white dark:bg-gray-800 rounded-t-lg shadow border-b dark:border-gray-700">
            <div className="flex">
              <button
                onClick={() => setActiveTab('manual')}
                className={`flex-1 flex items-center justify-center space-x-2 px-6 py-4 text-xs md:text-sm font-medium transition-colors ${
                  activeTab === 'manual'
                    ? 'text-ghana-green border-b-2 border-ghana-green'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                }`}
              >
                <FileText className="w-5 h-5" />
                <span>Enter Manually</span>
              </button>
              <button
                onClick={() => setActiveTab('csv')}
                className={`flex-1 flex items-center justify-center space-x-2 px-6 py-4 text-xs md:text-sm font-medium transition-colors ${
                  activeTab === 'csv'
                    ? 'text-ghana-green border-b-2 border-ghana-green'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                }`}
              >
                <Upload className="w-5 h-5" />
                <span>Upload CSV</span>
              </button>
              <button
                onClick={() => setActiveTab('ungraded')}
                className={`flex-1 flex items-center justify-center space-x-2 px-6 py-4 text-xs md:text-sm font-medium transition-colors ${
                  activeTab === 'ungraded'
                    ? 'text-ghana-green border-b-2 border-ghana-green'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                }`}
              >
                <AlertCircle className="w-5 h-5" />
                <span>Ungraded Subjects</span>
              </button>
              <button
                onClick={() => setActiveTab('grid')}
                className={`flex-1 flex items-center justify-center space-x-2 px-6 py-4 text-xs md:text-sm font-medium transition-colors ${
                  activeTab === 'grid'
                    ? 'text-ghana-green border-b-2 border-ghana-green'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                }`}
              >
                <Grid className="w-5 h-5" />
                <span>Spreadsheet View</span>
              </button>
            </div>
          </div>

          {/* Manual Entry Tab */}
          {activeTab === 'manual' && (
            <div className="bg-white dark:bg-gray-800 rounded-b-lg shadow p-6">
              {submitSuccess && (
                <div className="mb-6 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 flex items-start space-x-3">
                  <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-green-800 dark:text-green-200 font-medium">Score submitted successfully!</p>
                    <p className="text-green-700 dark:text-green-300 text-sm mt-1">You can enter another score or view the scores list.</p>
                  </div>
                </div>
              )}

              {formErrors.submit && (
                <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-start space-x-3">
                  <XCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                  <p className="text-red-800 dark:text-red-200">{formErrors.submit}</p>
                </div>
              )}

              <form onSubmit={handleManualSubmit} className="space-y-6">
                {/* Score Type Selection */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-3">Score Entry Type</h3>
                  <div className="grid md:grid-cols-3 gap-3">
                    <button
                      type="button"
                      onClick={() => setScoreType('both')}
                      className={`px-4 py-3 rounded-lg border-2 transition ${
                        scoreType === 'both'
                          ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-500 text-blue-700 dark:text-blue-300'
                          : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-gray-400 dark:hover:border-gray-500'
                      }`}
                    >
                      <div className="font-medium">Both Scores</div>
                      <div className="text-xs mt-1">Class + Exam</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setScoreType('class_only')}
                      className={`px-4 py-3 rounded-lg border-2 transition ${
                        scoreType === 'class_only'
                          ? 'bg-ghana-green text-white border-ghana-green'
                          : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-gray-400 dark:hover:border-gray-500'
                      }`}
                    >
                      <div className="font-medium">Class Score Only</div>
                      <div className="text-xs mt-1">Max 40 marks</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setScoreType('exam_only')}
                      className={`px-4 py-3 rounded-lg border-2 transition ${
                        scoreType === 'exam_only'
                          ? 'bg-ghana-red text-white border-ghana-red'
                          : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-gray-400 dark:hover:border-gray-500'
                      }`}
                    >
                      <div className="font-medium">Exam Score Only</div>
                      <div className="text-xs mt-1">Max 60 marks</div>
                    </button>
                  </div>
                </div>

                {/* Selection Filters */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">Select Filters</h3>
                  <div className="grid md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs md:text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Class *
                      </label>
                      <select
                        value={selectedClass}
                        onChange={(e) => {
                          setSelectedClass(e.target.value)
                          setSelectedStudent('')
                          if (formErrors.class) {
                            setFormErrors({...formErrors, class: ''})
                          }
                        }}
                        className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-ghana-green focus:border-transparent dark:bg-gray-700 dark:text-white ${
                          formErrors.class ? 'border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-900/20' : 'border-gray-300 dark:border-gray-600'
                        }`}
                      >
                        <option value="">Select Class</option>
                        {teacherClasses.map(cls => (
                          <option key={cls.class_id} value={cls.class_id}>
                            {cls.class_name}
                          </option>
                        ))}
                      </select>
                      {formErrors.class && (
                        <p className="mt-1 text-sm text-red-600 dark:text-red-400">{formErrors.class}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs md:text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Subject *
                      </label>
                      <select
                        value={selectedSubject}
                        onChange={(e) => {
                          setSelectedSubject(e.target.value)
                          if (formErrors.subject) {
                            setFormErrors({...formErrors, subject: ''})
                          }
                        }}
                        className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-ghana-green focus:border-transparent dark:bg-gray-700 dark:text-white ${
                          formErrors.subject ? 'border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-900/20' : 'border-gray-300 dark:border-gray-600'
                        }`}
                      >
                        <option value="">Select Subject</option>
                        {filteredSubjects.map(subject => (
                          <option key={subject.id} value={subject.id}>
                            {subject.name}
                          </option>
                        ))}
                        {filteredSubjects.length === 0 && selectedClass && (
                          <option value="" disabled>No subjects for this level</option>
                        )}
                      </select>
                      {formErrors.subject && (
                        <p className="mt-1 text-sm text-red-600 dark:text-red-400">{formErrors.subject}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs md:text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Term <span className="text-xs text-gray-500 dark:text-gray-400">(Set by Admin)</span>
                      </label>
                      <div className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium">
                        {currentTermName || 'No current term set'}
                      </div>
                      {!selectedTerm && (
                        <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">Admin must set current term in system settings</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Student Selection */}
                {selectedClass && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">Student</h3>
                    <div>
                      <label className="block text-xs md:text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Select Student *
                      </label>
                      <select
                        value={selectedStudent}
                        onChange={(e) => {
                          setSelectedStudent(e.target.value)
                          if (formErrors.student) {
                            setFormErrors({...formErrors, student: ''})
                          }
                        }}
                        className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-ghana-green focus:border-transparent dark:bg-gray-700 dark:text-white ${
                          formErrors.student ? 'border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-900/20' : 'border-gray-300 dark:border-gray-600'
                        }`}
                      >
                        <option value="">Select Student</option>
                        {students.map(student => (
                          <option key={student.id} value={student.id}>
                            {student.first_name} {student.last_name} ({student.student_id})
                          </option>
                        ))}
                      </select>
                      {formErrors.student && (
                        <p className="mt-1 text-sm text-red-600 dark:text-red-400">{formErrors.student}</p>
                      )}
                      {students.length === 0 && selectedClass && (
                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">No students found in this class</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Score Entry */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">Scores</h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <>
                      {(scoreType === 'both' || scoreType === 'class_only') && (
                        <div>
                          <label className="block text-xs md:text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Class Score (0-100) {scoreType === 'class_only' ? '*' : ''}
                            <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">Converts to max 40</span>
                          </label>
                          <input
                            type="number"
                            step="0.1"
                            min="0"
                            max="100"
                            value={manualScores.class_score}
                            onChange={(e) => {
                              setManualScores({...manualScores, class_score: e.target.value})
                              if (formErrors.class_score) {
                                setFormErrors({...formErrors, class_score: ''})
                              }
                            }}
                            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-ghana-green focus:border-transparent dark:bg-gray-700 dark:text-white ${
                              formErrors.class_score ? 'border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-900/20' : 'border-gray-300 dark:border-gray-600'
                            }`}
                            placeholder="e.g., 80"
                          />
                          <p className="text-[10px] text-blue-600 dark:text-blue-400 mt-1">
                            * New scores are added to existing class scores (Cumulative)
                          </p>
                          {formErrors.class_score && (
                            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{formErrors.class_score}</p>
                          )}
                        </div>
                      )}

                      {(scoreType === 'both' || scoreType === 'exam_only') && (
                        <div>
                          <label className="block text-xs md:text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Exam Score (0-100) {scoreType === 'exam_only' ? '*' : ''}
                            <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">Converts to max 60</span>
                          </label>
                          <input
                            type="number"
                            step="0.1"
                            min="0"
                            max="100"
                            value={manualScores.exam_score}
                            onChange={(e) => {
                              setManualScores({...manualScores, exam_score: e.target.value})
                              if (formErrors.exam_score) {
                                setFormErrors({...formErrors, exam_score: ''})
                              }
                            }}
                            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-ghana-green focus:border-transparent dark:bg-gray-700 dark:text-white ${
                              formErrors.exam_score ? 'border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-900/20' : 'border-gray-300 dark:border-gray-600'
                            }`}
                            placeholder="e.g., 75"
                          />
                          <p className="text-[10px] text-orange-600 dark:text-orange-400 mt-1">
                            * New score overwrites existing exam score
                          </p>
                          {formErrors.exam_score && (
                            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{formErrors.exam_score}</p>
                          )}
                        </div>
                      )}

                      <div>
                        <label className="block text-xs md:text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Total Score
                        </label>
                        <input
                          type="text"
                          value={manualScores.total}
                          readOnly
                          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-semibold"
                          placeholder="Auto-calculated"
                        />
                      </div>

                      <div>
                        <label className="block text-xs md:text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Grade
                        </label>
                        <input
                          type="text"
                          value={manualScores.grade}
                          readOnly
                          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-semibold"
                          placeholder="Auto-calculated"
                        />
                      </div>
                    </>
                  </div>

                  <div className="mt-4">
                    <label className="block text-xs md:text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Remarks (Optional)
                    </label>
                    <textarea
                      value={manualScores.remarks}
                      onChange={(e) => setManualScores({...manualScores, remarks: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-ghana-green focus:border-transparent dark:bg-gray-700 dark:text-white"
                      rows={3}
                      placeholder="e.g., Excellent performance, needs improvement, etc."
                    />
                  </div>
                </div>

                {/* Grading Scale Info */}
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-6">
                  <h3 className="font-semibold text-gray-800 dark:text-gray-100 mb-3">Grading Scale</h3>
                  <div className="grid md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="font-medium text-gray-700 dark:text-gray-300 mb-2">Primary (Basic 1-6):</p>
                      <ul className="space-y-1 text-gray-600 dark:text-gray-400">
                        <li>• 80-100: Grade 1 - Advance</li>
                        <li>• 70-79: Grade 2 - Proficient</li>
                        <li>• 60-69: Grade 3 - Approaching Proficiency</li>
                        <li>• 50-59: Grade 4 - Developing</li>
                        <li>• 0-49: Grade 5 - Beginning</li>
                      </ul>
                    </div>
                    <div>
                      <p className="font-medium text-gray-700 dark:text-gray-300 mb-2">JHS (Basic 7-9):</p>
                      <ul className="space-y-1 text-gray-600 dark:text-gray-400">
                        <li>• 80-100: Grade 1 - High proficient</li>
                        <li>• 70-79: Grade 2 - Proficient</li>
                        <li>• 60-69: Grade 3 - Proficient</li>
                        <li>• 50-59: Grade 4 - Approaching proficiency</li>
                        <li>• 40-49: Grade 5 - Developing</li>
                        <li>• 0-39: Grade 6 - Emerging</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Submit Button */}
                <div className="flex justify-end space-x-4">
                  <Link
                    href="/teacher/dashboard"
                    className="px-6 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                  >
                    Cancel
                  </Link>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-6 py-2 bg-ghana-green text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 transition"
                  >
                    <FileText className="w-5 h-5" />
                    <span>{submitting ? 'Submitting...' : 'Submit Score'}</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* CSV Upload Tab */}
          {activeTab === 'csv' && (
            <div className="bg-white dark:bg-gray-800 rounded-b-lg shadow p-6">
              <div className="space-y-6">
                {formErrors.csv && (
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-start space-x-3">
                    <XCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                    <p className="text-red-800 dark:text-red-200">{formErrors.csv}</p>
                  </div>
                )}

                {/* Score Type Selection */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-3">Score Entry Type</h3>
                  <div className="grid md:grid-cols-3 gap-3">
                    <button
                      type="button"
                      onClick={() => setScoreType('both')}
                      className={`px-4 py-3 rounded-lg border-2 transition ${
                        scoreType === 'both'
                          ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-500 text-blue-700 dark:text-blue-300'
                          : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-gray-400 dark:hover:border-gray-500'
                      }`}
                    >
                      <div className="font-medium">Both Scores</div>
                      <div className="text-xs mt-1">Class + Exam</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setScoreType('class_only')}
                      className={`px-4 py-3 rounded-lg border-2 transition ${
                        scoreType === 'class_only'
                          ? 'bg-ghana-green text-white border-ghana-green'
                          : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-gray-400 dark:hover:border-gray-500'
                      }`}
                    >
                      <div className="font-medium">Class Score Only</div>
                      <div className="text-xs mt-1">Max 40 marks</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setScoreType('exam_only')}
                      className={`px-4 py-3 rounded-lg border-2 transition ${
                        scoreType === 'exam_only'
                          ? 'bg-ghana-red text-white border-ghana-red'
                          : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-gray-400 dark:hover:border-gray-500'
                      }`}
                    >
                      <div className="font-medium">Exam Score Only</div>
                      <div className="text-xs mt-1">Max 60 marks</div>
                    </button>
                  </div>
                </div>

                {/* Instructions */}
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-800 dark:text-gray-100 mb-2 flex items-center space-x-2">
                    <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    <span>CSV Upload Instructions</span>
                  </h3>
                  <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-1 list-disc list-inside ml-7">
                    <li><strong>Select score type above</strong> - Choose what scores to enter</li>
                    <li><strong>Select a class and subjects</strong> - Click subjects below to select them</li>
                    <li>Template includes columns <strong>only for selected subjects</strong> in the order you select them</li>
                    <li>Student names pre-filled in format: "LastName FirstName"</li>
                    {scoreType === 'both' && <li>Each subject has 2 columns: subject_class (0-100) and subject_exam (0-100)</li>}
                    {scoreType === 'class_only' && <li>Each subject has 1 column: subject_class (0-100, converts to max 40)</li>}
                    {scoreType === 'exam_only' && <li>Each subject has 1 column: subject_exam (0-100, converts to max 60)</li>}
                    <li>Leave cells empty to skip a subject for specific students</li>
                    <li>Scores auto-converted and total/grade/remarks calculated per grading scale</li>
                    <li>Maximum file size: 5MB</li>
                  </ul>
                </div>

                {/* Grading Scale Info */}
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-800 dark:text-gray-100 mb-2">Grading Scale</h3>
                  <div className="grid md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="font-medium text-gray-700 dark:text-gray-300 mb-1">Primary (Basic 1-6):</p>
                      <ul className="space-y-1 text-gray-600 dark:text-gray-400">
                        <li>80-100: Grade 1 - Advance</li>
                        <li>70-79: Grade 2 - Proficient</li>
                        <li>60-69: Grade 3 - Approaching Proficiency</li>
                        <li>50-59: Grade 4 - Developing</li>
                        <li>0-49: Grade 5 - Beginning</li>
                      </ul>
                    </div>
                    <div>
                      <p className="font-medium text-gray-700 dark:text-gray-300 mb-1">JHS (Basic 7-9):</p>
                      <ul className="space-y-1 text-gray-600 dark:text-gray-400">
                        <li>80-100: Grade 1 - High proficient</li>
                        <li>70-79: Grade 2 - Proficient</li>
                        <li>60-69: Grade 3 - Proficient</li>
                        <li>50-59: Grade 4 - Approaching proficiency</li>
                        <li>40-49: Grade 5 - Developing</li>
                        <li>0-39: Grade 6 - Emerging</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Download Template */}
                <div>
                  <button
                    type="button"
                    onClick={downloadTemplate}
                    disabled={!selectedClass || selectedSubjects.length === 0}
                    className="flex items-center space-x-2 px-4 py-2 bg-ghana-green text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Download className="w-5 h-5" />
                    <span className="font-medium">
                      {selectedSubjects.length > 0 
                        ? `Download Template (${selectedSubjects.length} subject${selectedSubjects.length > 1 ? 's' : ''})`
                        : 'Select subjects to download template'}
                    </span>
                  </button>
                  {selectedClass && selectedSubjects.length > 0 && (
                    <p className="mt-2 text-xs text-gray-600 dark:text-gray-400">
                      Template includes: {selectedSubjects.map(id => filteredSubjects.find(s => s.id === id)?.name).filter(Boolean).join(', ')}
                    </p>
                  )}
                </div>

                {/* Filter Selection */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">Select Filters</h3>
                  <div className="grid md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs md:text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Class *
                      </label>
                      <select
                        value={selectedClass}
                        onChange={(e) => {
                          setSelectedClass(e.target.value)
                          if (formErrors.csv) {
                            setFormErrors({...formErrors, csv: ''})
                          }
                        }}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-ghana-green focus:border-transparent dark:bg-gray-700 dark:text-white"
                        disabled={uploading}
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
                        Subjects for Template <span className="text-xs text-gray-500 dark:text-gray-400">({selectedSubjects.length} selected)</span>
                      </label>
                      <div className="border border-gray-300 dark:border-gray-600 rounded-lg p-3 max-h-48 overflow-y-auto bg-white dark:bg-gray-700">
                        {filteredSubjects.length === 0 && selectedClass ? (
                          <p className="text-sm text-gray-500 dark:text-gray-400">No subjects for this level</p>
                        ) : filteredSubjects.length === 0 ? (
                          <p className="text-sm text-gray-500 dark:text-gray-400">Select a class first</p>
                        ) : (
                          <div className="space-y-2">
                            {filteredSubjects.map((subject, index) => {
                              const isSelected = selectedSubjects.includes(subject.id)
                              const selectionOrder = selectedSubjects.indexOf(subject.id) + 1
                              return (
                                <button
                                  key={subject.id}
                                  type="button"
                                  onClick={() => {
                                    if (isSelected) {
                                      // Remove subject
                                      setSelectedSubjects(prev => prev.filter(id => id !== subject.id))
                                    } else {
                                      // Add subject
                                      setSelectedSubjects(prev => [...prev, subject.id])
                                    }
                                    if (formErrors.csv) {
                                      setFormErrors({...formErrors, csv: ''})
                                    }
                                  }}
                                  disabled={uploading}
                                  className={`w-full text-left px-3 py-2 rounded-md border transition ${
                                    isSelected
                                      ? 'bg-ghana-green text-white border-ghana-green hover:bg-green-700'
                                      : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
                                  } ${uploading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                                >
                                  <div className="flex items-center justify-between">
                                    <span className="font-medium">{subject.name}</span>
                                    {isSelected && (
                                      <span className="text-xs bg-white dark:bg-gray-700 text-ghana-green px-2 py-1 rounded-full font-semibold">
                                        #{selectionOrder}
                                      </span>
                                    )}
                                  </div>
                                </button>
                              )
                            })}
                          </div>
                        )}
                      </div>
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        Select subjects for template download. When uploading, subjects are auto-detected from CSV.
                      </p>
                    </div>

                    <div>
                      <label className="block text-xs md:text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Term <span className="text-xs text-gray-500 dark:text-gray-400">(Set by Admin)</span>
                      </label>
                      <div className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium">
                        {currentTermName || 'No current term set'}
                      </div>
                      {!selectedTerm && (
                        <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">Admin must set current term in system settings</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* File Upload */}
                <div>
                  <label className="block text-xs md:text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Upload CSV File *
                  </label>
                  <input
                    type="file"
                    accept=".csv"
                    onChange={(e) => {
                      setCsvFile(e.target.files?.[0] || null)
                      if (formErrors.csv) {
                        setFormErrors({...formErrors, csv: ''})
                      }
                      setUploadResults(null)
                    }}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-ghana-green focus:border-transparent dark:bg-gray-700 dark:text-white"
                    disabled={uploading}
                  />
                  {csvFile && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 flex items-center space-x-2">
                      <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                      <span>Selected: {csvFile.name} ({(csvFile.size / 1024).toFixed(1)} KB)</span>
                    </p>
                  )}
                </div>

                {/* Upload Results */}
                {uploadResults && (
                  <div className={`border rounded-lg p-4 ${
                    uploadResults.failed === 0 ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' : 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
                  }`}>
                    <div className="flex items-start space-x-3 mb-3">
                      {uploadResults.failed === 0 ? (
                        <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400 flex-shrink-0" />
                      ) : (
                        <AlertCircle className="w-6 h-6 text-yellow-600 dark:text-yellow-400 flex-shrink-0" />
                      )}
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-800 dark:text-gray-100 mb-2">Upload Results</h3>
                        <div className="space-y-1 text-sm">
                          <p className="text-green-700 dark:text-green-300 flex items-center space-x-2">
                            <CheckCircle className="w-4 h-4" />
                            <span>Successfully added: <strong>{uploadResults.success}</strong> score{uploadResults.success !== 1 ? 's' : ''}</span>
                          </p>
                          {uploadResults.failed > 0 && (
                            <>
                              <p className="text-red-700 dark:text-red-300 flex items-center space-x-2">
                                <XCircle className="w-4 h-4" />
                                <span>Failed: <strong>{uploadResults.failed}</strong> score{uploadResults.failed !== 1 ? 's' : ''}</span>
                              </p>
                              {uploadResults.errors.length > 0 && (
                                <div className="mt-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded p-3">
                                  <p className="font-medium text-gray-800 dark:text-gray-100 mb-2">Error Details:</p>
                                  <ul className="space-y-1 text-gray-700 dark:text-gray-300 text-xs max-h-48 overflow-y-auto">
                                    {uploadResults.errors.slice(0, 20).map((error, i) => (
                                      <li key={i} className="flex items-start space-x-2">
                                        <span className="text-red-500 flex-shrink-0">•</span>
                                        <span>{error}</span>
                                      </li>
                                    ))}
                                    {uploadResults.errors.length > 20 && (
                                      <li className="text-gray-500 dark:text-gray-400 italic">
                                        ... and {uploadResults.errors.length - 20} more errors
                                      </li>
                                    )}
                                  </ul>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Upload Progress */}
                {uploading && (
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                    <div className="flex items-center space-x-3">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-ghana-green"></div>
                      <div>
                        <p className="font-medium text-gray-800 dark:text-gray-100">Processing CSV file...</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">This may take a moment depending on the file size</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Upload Button */}
                <div className="flex justify-end space-x-4">
                  <Link
                    href="/teacher/dashboard"
                    className={`px-6 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition ${
                      uploading ? 'pointer-events-none opacity-50' : ''
                    }`}
                  >
                    Cancel
                  </Link>
                  <button
                    type="button"
                    onClick={handleCsvUpload}
                    disabled={!csvFile || !selectedClass || !selectedTerm || uploading}
                    className="px-6 py-2
                            bg-ghana-green text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 transition"
                  >
                    <Upload className="w-5 h-5" />
                    <span>{uploading ? 'Uploading...' : 'Upload CSV'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Ungraded Subjects Tab */}
          {activeTab === 'ungraded' && (
            <div className="bg-white dark:bg-gray-800 rounded-b-lg shadow p-6">
              {/* Filters */}
              <div className="grid md:grid-cols-3 gap-4 mb-6">
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
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                      <thead className="bg-gray-50 dark:bg-gray-700">
                        <tr>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Student
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Missing Subjects
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Progress
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                        {ungradedData.map((item, index) => (
                          <tr key={item.student.id} className={index % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-700/50'}>
                            <td className="px-6 py-4 whitespace-nowrap">
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
                            <td className="px-6 py-4">
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
                            <td className="px-6 py-4 whitespace-nowrap">
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
            <div className="bg-white dark:bg-gray-800 rounded-b-lg shadow p-6">
              {/* Filters */}
              <div className="grid md:grid-cols-3 gap-4 mb-6">
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
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
                      Enter Scores ({students.length} Students)
                    </h3>
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
                    <div className="overflow-x-auto border dark:border-gray-700 rounded-lg max-h-[70vh]">
                      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 border-collapse">
                        <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0 z-20 shadow-sm">
                          <tr>
                            <th rowSpan={2} className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider sticky left-0 bg-gray-50 dark:bg-gray-700 z-30 border-r dark:border-r-gray-600 border-b dark:border-b-gray-600">
                              Student
                            </th>
                            {selectedSubjects.map(subjectId => {
                                const subject = filteredSubjects.find(s => s.id === subjectId)
                                return (
                                    <th key={subjectId} colSpan={4} className="px-6 py-2 text-center text-xs font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wider border-b dark:border-b-gray-600 border-r dark:border-r-gray-600 bg-gray-100 dark:bg-gray-600">
                                        {subject?.name || 'Unknown Subject'}
                                    </th>
                                )
                            })}
                          </tr>
                          <tr>
                            {selectedSubjects.map(subjectId => (
                                <Fragment key={subjectId}>
                                    <th key={`${subjectId}-class`} className="px-2 py-2 text-center text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider border-b dark:border-b-gray-600 w-20 bg-gray-50 dark:bg-gray-700">Class (40%)</th>
                                    <th key={`${subjectId}-exam`} className="px-2 py-2 text-center text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider border-b dark:border-b-gray-600 w-20 bg-gray-50 dark:bg-gray-700">Exam (100%)</th>
                                    <th key={`${subjectId}-total`} className="px-2 py-2 text-center text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider border-b dark:border-b-gray-600 w-16 bg-gray-50 dark:bg-gray-700">Total</th>
                                    <th key={`${subjectId}-grade`} className="px-2 py-2 text-center text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider border-b dark:border-b-gray-600 w-16 border-r dark:border-r-gray-600 bg-gray-50 dark:bg-gray-700">Grade</th>
                                </Fragment>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                          {students.map((student) => {
                            const hasChanges = gridChanges.has(student.id)
                            return (
                              <tr key={student.id} className={hasChanges ? 'bg-blue-50 dark:bg-blue-900/20' : 'hover:bg-gray-50 dark:hover:bg-gray-700'}>
                                <td className="px-6 py-4 whitespace-nowrap sticky left-0 bg-white dark:bg-gray-800 z-10 border-r dark:border-r-gray-600 shadow-sm">
                                  <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                    {student.last_name} {student.first_name}
                                  </div>
                                  <div className="text-xs text-gray-500 dark:text-gray-400">
                                    {student.student_id}
                                  </div>
                                </td>
                                {selectedSubjects.map(subjectId => {
                                    const scores = gridScores[student.id]?.[subjectId] || { class_score: '', exam_score: '' }
                                    const classScore = parseFloat(scores.class_score) || 0
                                    const examScore = parseFloat(scores.exam_score) || 0
                                    // Calculate total: Class + (Exam * 0.6)
                                    const total = classScore + (examScore * 0.6)
                                    const className = teacherClasses.find(c => c.class_id === selectedClass)?.class_name || ''
                                    const { grade } = calculateGradeAndRemark(total, className)
                                    const hasData = scores.class_score || scores.exam_score

                                    return (
                                        <Fragment key={subjectId}>
                                            <td key={`${subjectId}-class`} className="px-2 py-4 whitespace-nowrap text-center">
                                                <input
                                                    type="number"
                                                    min="0"
                                                    max="40"
                                                    step="0.1"
                                                    value={scores.class_score}
                                                    onChange={(e) => handleGridScoreChange(student.id, subjectId, 'class_score', e.target.value)}
                                                    className="w-16 px-1 py-1 text-center border border-gray-300 dark:border-gray-600 rounded focus:ring-1 focus:ring-ghana-green focus:border-ghana-green text-sm dark:bg-gray-700 dark:text-white"
                                                />
                                            </td>
                                            <td key={`${subjectId}-exam`} className="px-2 py-4 whitespace-nowrap text-center">
                                                <input
                                                    type="number"
                                                    min="0"
                                                    max="100"
                                                    step="0.1"
                                                    value={scores.exam_score}
                                                    onChange={(e) => handleGridScoreChange(student.id, subjectId, 'exam_score', e.target.value)}
                                                    className="w-16 px-1 py-1 text-center border border-gray-300 dark:border-gray-600 rounded focus:ring-1 focus:ring-ghana-green focus:border-ghana-green text-sm dark:bg-gray-700 dark:text-white"
                                                />
                                            </td>
                                            <td key={`${subjectId}-total`} className="px-2 py-4 whitespace-nowrap text-center">
                                                <span className={`text-sm font-medium ${total > 0 ? 'text-gray-900 dark:text-gray-100' : 'text-gray-400 dark:text-gray-500'}`}>
                                                    {hasData ? total.toFixed(1) : '-'}
                                                </span>
                                            </td>
                                            <td key={`${subjectId}-grade`} className="px-2 py-4 whitespace-nowrap text-center border-r dark:border-r-gray-600">
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
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
