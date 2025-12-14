'use client'

import { useState, useEffect, Fragment, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, FileText, Upload, Camera, AlertCircle, CheckCircle, Grid } from 'lucide-react'
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
}

interface Teacher {
  id: string
  profile_id: string
  first_name: string
  last_name: string
}

function ClassScoresContent() {
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()
  const searchParams = useSearchParams()
  const method = searchParams.get('method') || 'manual'

  const [loading, setLoading] = useState(true)
  const [teacher, setTeacher] = useState<Teacher | null>(null)
  const [teacherClasses, setTeacherClasses] = useState<TeacherClass[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [filteredSubjects, setFilteredSubjects] = useState<Subject[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [terms, setTerms] = useState<any[]>([])
  
  const [selectedClass, setSelectedClass] = useState('')
  const [selectedSubject, setSelectedSubject] = useState('')
  const [selectedTerm, setSelectedTerm] = useState('')
  const [selectedStudent, setSelectedStudent] = useState('')
  const [currentTermName, setCurrentTermName] = useState('')
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([])
  
  const [classScore, setClassScore] = useState('')
  const [csvFile, setCsvFile] = useState<File | null>(null)
  
  // Grid view state
  const [activeTab, setActiveTab] = useState<'manual' | 'csv' | 'grid'>('manual')
  const [gridScores, setGridScores] = useState<Record<string, Record<string, { current_score: number, add_score: string, exam_score: number, id?: string }>>>({})
  const [gridSaving, setGridSaving] = useState(false)
  const [gridLoading, setGridLoading] = useState(false)
  const [gridChanges, setGridChanges] = useState<Set<string>>(new Set())
  const [isSubjectDropdownOpen, setIsSubjectDropdownOpen] = useState(false)

  const [submitting, setSubmitting] = useState(false)
  const [submitSuccess, setSubmitSuccess] = useState(false)
  const [uploadResults, setUploadResults] = useState<any>(null)
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [error, setError] = useState('')

  useEffect(() => {
    if (method === 'csv') setActiveTab('csv')
    else if (method === 'grid') setActiveTab('grid')
    else setActiveTab('manual')
  }, [method])

  useEffect(() => {
    async function loadData() {
      try {
        const user = await getCurrentUser()
        if (!user) {
          router.push('/login')
          return
        }

        const { data: teacherData, error: teacherError } = await getTeacherData(user.id)
        if (teacherError || !teacherData) {
          throw new Error('Teacher profile not found')
        }

        setTeacher({
          id: teacherData.id,
          profile_id: teacherData.profile_id,
          first_name: teacherData.first_name,
          last_name: teacherData.last_name
        })

        const classAccess = await getTeacherClassAccess(teacherData.profile_id)
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
        }

        setLoading(false)
      } catch (err: any) {
        console.error('Error loading data:', err)
        setError(err.message || 'Failed to load data')
        setLoading(false)
      }
    }

    loadData()
  }, [router])

  // Filter subjects and load students when class changes
  useEffect(() => {
    async function filterData() {
      if (!selectedClass || !teacher) {
        setFilteredSubjects([])
        setStudents([])
        return
      }

      const selectedClassData = teacherClasses.find(c => c.class_id === selectedClass)
      if (!selectedClassData) return

      const fullAccess = await getTeacherClassAccess(teacher.profile_id)
      const access = fullAccess.find(c => c.class_id === selectedClass)
      if (!access) return

      // Determine class category
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

      // If no level-specific subjects found, show all subjects
      if (filtered.length === 0) {
        filtered = [...subjects]
      }

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

      // Load students
      const { data: studentsData } = await supabase
        .from('students')
        .select('id, student_id, first_name, last_name')
        .eq('class_id', selectedClass)
        .eq('status', 'active')
        .order('first_name') as { data: any[] | null }

      if (studentsData) {
        setStudents(studentsData)
      }
    }

    filterData()
  }, [selectedClass, teacher, teacherClasses, subjects])

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

      const scoresMap: Record<string, Record<string, { current_score: number, add_score: string, exam_score: number, id?: string }>> = {}
      
      // Initialize
      students.forEach(student => {
        scoresMap[student.id] = {}
        selectedSubjects.forEach(subjectId => {
            scoresMap[student.id][subjectId] = { current_score: 0, add_score: '', exam_score: 0 }
        })
      })

      // Fill
      data?.forEach((score: any) => {
        if (scoresMap[score.student_id]) {
            scoresMap[score.student_id][score.subject_id] = {
                current_score: score.class_score || 0,
                add_score: '',
                exam_score: score.exam_score || 0,
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

  function handleGridScoreChange(studentId: string, subjectId: string, value: string) {
    setGridScores(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [subjectId]: {
            ...prev[studentId][subjectId],
            add_score: value
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
      const fullAccess = await getTeacherClassAccess(teacher!.profile_id)
      const access = fullAccess.find(c => c.class_id === selectedClass)
      
      if (!access) throw new Error('You do not have access to this class')
      
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
                 
                 if (!isAssigned) return
            }

            const scoreData = studentScores[subjectId]
            const addScore = parseFloat(scoreData.add_score)
            
            // Only save if we have a valid score to add
            if (!isNaN(addScore)) {
                // Convert the raw input (0-100) to weighted score (0-40)
                const weightedAdd = convertClassScore(addScore)
                const newClassScore = (scoreData.current_score || 0) + weightedAdd
                const total = newClassScore + (scoreData.exam_score || 0)
                const className = teacherClasses.find(c => c.class_id === selectedClass)?.class_name || ''
                const { grade, remark } = calculateGradeAndRemark(total, className)
                
                updates.push({
                    id: scoreData.id,
                    student_id: studentId,
                    subject_id: subjectId,
                    term_id: selectedTerm,
                    class_score: newClassScore,
                    exam_score: scoreData.exam_score || 0,
                    total: total,
                    grade,
                    remarks: remark,
                    teacher_id: teacher!.id
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
        .upsert(updates.map(({ id, ...rest }) => ({ ...rest, id: id || undefined })))
      
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

  function convertClassScore(inputScore: number, maxScore: number = 100): number {
    return Math.round((inputScore / maxScore) * 40 * 10) / 10
  }

  function calculateGradeAndRemark(total: number, classLevel: string): { grade: string, remark: string } {
    // Determine if Primary (Basic 1-6 or Primary 1-6) or JHS (Basic 7-9 or JHS 1-3)
    const className = classLevel.toLowerCase()
    const isPrimary = (className.includes('basic') || className.includes('primary')) && 
                      (className.includes('1') || className.includes('2') || className.includes('3') || 
                       className.includes('4') || className.includes('5') || className.includes('6')) &&
                      !className.includes('jhs')
    
    if (isPrimary) {
      // PRIMARY GRADING SYSTEM (Standard Based Curriculum)
      if (total >= 80) return { grade: '1', remark: 'Highly Proficient' }
      if (total >= 70) return { grade: '2', remark: 'Proficient' }
      if (total >= 60) return { grade: '3', remark: 'Approaching Proficiency' }
      if (total >= 50) return { grade: '4', remark: 'Developing' }
      return { grade: '5', remark: 'Beginning' }
    } else {
      // JHS GRADING SYSTEM
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
    
    const score = parseFloat(classScore)

    if (!classScore) {
      errors.class_score = 'Class score is required'
    } else if (isNaN(score) || score < 0 || score > 100) {
      errors.class_score = 'Class score must be between 0 and 100'
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
      const classAccess = teacherClasses.find(c => c.class_id === selectedClass)
      if (!classAccess) throw new Error('No access to this class')

      const fullAccess = await getTeacherClassAccess(teacher!.profile_id)
      const access = fullAccess.find(c => c.class_id === selectedClass)
      
      if (!access) throw new Error('No access to this class')

      // SIMPLIFIED PERMISSION CHECK:
      // Class teachers (is_class_teacher = true) can ALWAYS edit scores for their class
      const isClassTeacher = Boolean(access.is_class_teacher)
      
      // If class teacher OR has edit all permission, allow editing - no further checks needed
      if (!isClassTeacher && !access.can_edit_all_subjects) {
        // Not a class teacher and doesn't have edit all permission
        // Check if they're assigned to this specific subject
        const subjectsTaught = access.subjects_taught || []
        
        // The RPC returns subject names as strings, not objects with subject_id
        // So we need to match by subject name instead
        const selectedSubjectData = subjects.find(s => s.id === selectedSubject)
        const selectedSubjectName = selectedSubjectData?.name || ''
        
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

      const inputScore = parseFloat(classScore)
      const convertedClassScore = convertClassScore(inputScore)

      // Check if score already exists
      const { data: existingScore } = await supabase
        .from('scores')
        .select('*')
        .eq('student_id', selectedStudent)
        .eq('subject_id', selectedSubject)
        .eq('term_id', selectedTerm)
        .maybeSingle() as { data: any }

      if (existingScore) {
        // Update existing score - only update class_score and recalculate total
        const examScore = existingScore.exam_score || 0
        const newTotal = convertedClassScore + examScore
        const gradeData = calculateGradeAndRemark(newTotal, classAccess.class_name)

        const { error: updateError } = await supabase
          .from('scores')
          .update({
            class_score: convertedClassScore,
            total: newTotal,
            grade: gradeData.grade,
            remarks: gradeData.remark,
            teacher_id: teacher!.id
          })
          .eq('id', existingScore.id)

        if (updateError) throw updateError
      } else {
        // Insert new score with only class_score
        const total = convertedClassScore
        const gradeData = calculateGradeAndRemark(total, classAccess.class_name)

        const { error: insertError } = await supabase
          .from('scores')
          .insert({
            student_id: selectedStudent,
            subject_id: selectedSubject,
            term_id: selectedTerm,
            class_score: convertedClassScore,
            exam_score: 0,
            total: total,
            grade: gradeData.grade,
            remarks: gradeData.remark,
            teacher_id: teacher!.id
          })

        if (insertError) throw insertError
      }

      setSubmitSuccess(true)
      setClassScore('')
      setSelectedStudent('')
      setFormErrors({})

      setTimeout(() => setSubmitSuccess(false), 5000)
    } catch (error: any) {
      console.error('Error submitting score:', error)
      setFormErrors({ submit: error.message || 'Failed to submit score' })
    } finally {
      setSubmitting(false)
    }
  }

  async function downloadTemplate() {
    if (!selectedClass) {
      alert('Please select a class first to download the template with student names.')
      return
    }

    if (selectedSubjects.length === 0) {
      alert('Please select at least one subject to include in the template.')
      return
    }

    try {
      const { data: classStudents, error } = await supabase
        .from('students')
        .select('student_id, first_name, last_name')
        .eq('class_id', selectedClass)
        .eq('status', 'active')
        .order('last_name') as { data: any[] | null; error: any }

      if (error) throw error

      const subjectsToInclude = selectedSubjects
        .map(id => filteredSubjects.find(s => s.id === id))
        .filter(Boolean)
      const subjectNames = subjectsToInclude.map(s => s!.name)

      let template = 'student_name'
      subjectNames.forEach(subjectName => {
        const shortName = subjectName.replace(/\s+/g, '_').toLowerCase()
        template += `,${shortName}_class`
      })
      template += '\n'

      if (classStudents && classStudents.length > 0) {
        classStudents.forEach(student => {
          const fullName = `${student.last_name} ${student.first_name}`
          template += fullName
          subjectNames.forEach(() => template += ',')
          template += '\n'
        })
      } else {
        template += 'Mensah Kwame'
        subjectNames.forEach(() => template += ',')
        template += '\n'
        template += 'Asante Ama'
        subjectNames.forEach(() => template += ',')
        template += '\n'
      }

      const blob = new Blob([template], { type: 'text/csv' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const className = teacherClasses.find(c => c.class_id === selectedClass)?.class_name || 'class'
      a.download = `class_scores_${className.replace(/\s+/g, '_')}_template.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error generating template:', error)
      alert('Failed to generate template')
    }
  }

  function toggleSubject(subjectId: string) {
    setSelectedSubjects(prev => 
      prev.includes(subjectId)
        ? prev.filter(id => id !== subjectId)
        : [...prev, subjectId]
    )
  }

  async function handleCsvUpload() {
    if (!csvFile || !selectedClass) {
      setFormErrors({ csv: 'Please select class and CSV file' })
      return
    }

    if (!selectedTerm) {
      setFormErrors({ csv: 'No current term set. Please contact admin to set the current term.' })
      return
    }

    setSubmitting(true)
    setUploadResults(null)
    setFormErrors({})

    try {
      const text = await csvFile.text()
      const lines = text.split('\n').filter(line => line.trim())

      if (lines.length < 2) {
        setFormErrors({ csv: 'CSV must contain header and data rows' })
        setSubmitting(false)
        return
      }

      const headers = lines[0].split(',').map(h => h.trim().toLowerCase())
      
      // Auto-detect subjects
      const detectedSubjects: Subject[] = []
      const subjectNames = new Set<string>()

      headers.forEach(header => {
        if (header === 'student_name') return
        const match = header.match(/^(.+?)_class$/)
        if (match) {
          subjectNames.add(match[1].replace(/_/g, ' '))
        }
      })

      for (const subjectName of subjectNames) {
        const subject = filteredSubjects.find(s => 
          s.name.toLowerCase().replace(/\s+/g, ' ') === subjectName.toLowerCase()
        )
        if (subject) {
          detectedSubjects.push(subject)
        } else {
          setFormErrors({ csv: `Subject "${subjectName}" not found` })
          setSubmitting(false)
          return
        }
      }

      if (detectedSubjects.length === 0) {
        setFormErrors({ csv: 'No valid subjects detected. Headers should be: student_name, subject_name_class' })
        setSubmitting(false)
        return
      }

      const results = {
        success: 0,
        failed: 0,
        errors: [] as string[]
      }

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim())
        const rowData: any = {}
        headers.forEach((header, index) => {
          rowData[header] = values[index]
        })

        if (!rowData.student_name) {
          results.failed++
          results.errors.push(`Row ${i + 1}: Missing student_name`)
          continue
        }

        const nameParts = rowData.student_name.trim().split(/\s+/)
        const lastName = nameParts[0]
        const firstName = nameParts.slice(1).join(' ') || lastName

        const { data: studentData } = await supabase
          .from('students')
          .select('id')
          .eq('class_id', selectedClass)
          .ilike('last_name', lastName)
          .ilike('first_name', `%${firstName}%`)
          .maybeSingle() as { data: any }

        if (!studentData) {
          results.failed++
          results.errors.push(`Row ${i + 1}: Student "${rowData.student_name}" not found`)
          continue
        }

        for (const subject of detectedSubjects) {
          const shortName = subject.name.replace(/\s+/g, '_').toLowerCase()
          const classScoreKey = `${shortName}_class`
          const classScoreValue = parseFloat(rowData[classScoreKey])

          if (isNaN(classScoreValue)) continue

          if (classScoreValue < 0 || classScoreValue > 100) {
            results.failed++
            results.errors.push(`Row ${i + 1}, ${subject.name}: Invalid class score (must be 0-100)`)
            continue
          }

          const convertedClassScore = convertClassScore(classScoreValue)

          // Check if score exists
          const { data: existingScore } = await supabase
            .from('scores')
            .select('*')
            .eq('student_id', studentData.id)
            .eq('subject_id', subject.id)
            .eq('term_id', selectedTerm)
            .maybeSingle() as { data: any }

          if (existingScore) {
            const examScore = existingScore.exam_score || 0
            const newTotal = convertedClassScore + examScore

            const { error } = await supabase
              .from('scores')
              .update({
                class_score: convertedClassScore,
                total: newTotal,
                teacher_id: teacher!.id
              })
              .eq('id', existingScore.id)

            if (error) {
              results.failed++
              results.errors.push(`Row ${i + 1}, ${subject.name}: ${error.message}`)
            } else {
              results.success++
            }
          } else {
            const { error } = await supabase
              .from('scores')
              .insert({
                student_id: studentData.id,
                subject_id: subject.id,
                term_id: selectedTerm,
                class_score: convertedClassScore,
                exam_score: 0,
                total: convertedClassScore,
                teacher_id: teacher!.id
              })

            if (error) {
              results.failed++
              results.errors.push(`Row ${i + 1}, ${subject.name}: ${error.message}`)
            } else {
              results.success++
            }
          }
        }
      }

      setUploadResults(results)
      setCsvFile(null)
    } catch (error: any) {
      console.error('Error uploading CSV:', error)
      setFormErrors({ csv: error.message || 'Failed to upload CSV' })
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-ghana-green mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="mb-8">
          <Link
            href="/teacher/dashboard"
            className="inline-flex items-center text-ghana-green hover:text-green-700 mb-4 text-xs md:text-sm"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Link>
          <h1 className="text-lg md:text-xl font-bold text-gray-900">Class Scores</h1>
          <p className="text-xs md:text-sm text-gray-600 mt-2">
            Record multiple class assessments. System automatically calculates final class score (max 40 marks).
          </p>
        </div>

        {/* Method Tabs */}
        <div className="flex space-x-2 mb-6">
          <Link
            href="/teacher/upload-scores/class?method=manual"
            className={`px-4 py-2 rounded text-xs md:text-sm ${method === 'manual' ? 'bg-ghana-green text-white' : 'bg-white text-gray-700'}`}
          >
            <FileText className="w-4 h-4 inline mr-2" />
            Manual
          </Link>
          <Link
            href="/teacher/upload-scores/class?method=csv"
            className={`px-4 py-2 rounded text-xs md:text-sm ${method === 'csv' ? 'bg-ghana-green text-white' : 'bg-white text-gray-700'}`}
          >
            <Upload className="w-4 h-4 inline mr-2" />
            CSV
          </Link>
          <Link
            href="/teacher/upload-scores/class?method=ocr"
            className={`px-4 py-2 rounded text-xs md:text-sm ${method === 'ocr' ? 'bg-ghana-green text-white' : 'bg-white text-gray-700'}`}
          >
            <Camera className="w-4 h-4 inline mr-2" />
            OCR
          </Link>
          <Link
            href="/teacher/upload-scores/class?method=grid"
            className={`px-4 py-2 rounded text-xs md:text-sm ${method === 'grid' ? 'bg-ghana-green text-white' : 'bg-white text-gray-700'}`}
          >
            <Grid className="w-4 h-4 inline mr-2" />
            Spreadsheet View
          </Link>
        </div>

        {/* Forms based on method */}
        <div className="bg-white rounded-lg shadow-md p-6">
          {method === 'grid' && (
            <div className="space-y-6">
                {/* Filters */}
                <div className="grid md:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-xs md:text-sm font-medium text-gray-700 mb-2">Class *</label>
                        <select
                            value={selectedClass}
                            onChange={(e) => setSelectedClass(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg text-xs md:text-sm"
                        >
                            <option value="">Select class</option>
                            {teacherClasses.map(cls => (
                                <option key={cls.class_id} value={cls.class_id}>{cls.class_name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="relative">
                        <label className="block text-xs md:text-sm font-medium text-gray-700 mb-2">Subjects *</label>
                        <button
                            type="button"
                            onClick={() => setIsSubjectDropdownOpen(!isSubjectDropdownOpen)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg text-left bg-white flex justify-between items-center text-xs md:text-sm"
                        >
                            <span className="truncate">
                                {selectedSubjects.length === 0 
                                    ? 'Select Subjects' 
                                    : `${selectedSubjects.length} Selected`}
                            </span>
                            <Grid className="w-4 h-4 text-gray-500" />
                        </button>
                        
                        {isSubjectDropdownOpen && (
                            <div className="absolute z-50 mt-1 w-full bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                                <div className="p-2 border-b sticky top-0 bg-white">
                                    <button
                                        onClick={() => {
                                            if (selectedSubjects.length === filteredSubjects.length) {
                                                setSelectedSubjects([])
                                            } else {
                                                setSelectedSubjects(filteredSubjects.map(s => s.id))
                                            }
                                        }}
                                        className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                                    >
                                        {selectedSubjects.length === filteredSubjects.length ? 'Deselect All' : 'Select All'}
                                    </button>
                                </div>
                                {filteredSubjects.map(subject => (
                                    <label key={subject.id} className="flex items-center px-4 py-2 hover:bg-gray-50 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={selectedSubjects.includes(subject.id)}
                                            onChange={(e) => toggleSubject(subject.id)}
                                            className="mr-3 h-4 w-4 text-ghana-green focus:ring-ghana-green border-gray-300 rounded"
                                        />
                                        <span className="text-sm text-gray-700">{subject.name}</span>
                                    </label>
                                ))}
                            </div>
                        )}
                        {isSubjectDropdownOpen && (
                            <div className="fixed inset-0 z-40" onClick={() => setIsSubjectDropdownOpen(false)}></div>
                        )}
                    </div>

                    <div>
                        <label className="block text-xs md:text-sm font-medium text-gray-700 mb-2">Term</label>
                        <div className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700 font-medium text-xs md:text-sm">
                            {currentTermName || 'No current term set'}
                        </div>
                    </div>
                </div>

                {/* Grid Table */}
                {selectedClass && selectedSubjects.length > 0 && selectedTerm ? (
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-gray-800">Enter Scores</h3>
                            <button
                                onClick={saveGridScores}
                                disabled={gridSaving || gridChanges.size === 0}
                                className="bg-ghana-green text-white px-6 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 transition text-xs md:text-sm"
                            >
                                {gridSaving ? 'Saving...' : `Save Changes (${gridChanges.size})`}
                            </button>
                        </div>

                        {gridLoading ? (
                            <div className="text-center py-12">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-ghana-green mx-auto mb-4"></div>
                                <p className="text-gray-600">Loading scores...</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto border rounded-lg max-h-[70vh]">
                                <table className="min-w-full divide-y divide-gray-200 border-collapse">
                                    <thead className="bg-gray-50 sticky top-0 z-20 shadow-sm">
                                        <tr>
                                            <th rowSpan={2} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50 z-30 border-r border-b">
                                                Student
                                            </th>
                                            {selectedSubjects.map(subjectId => {
                                                const subject = filteredSubjects.find(s => s.id === subjectId)
                                                return (
                                                    <th key={subjectId} colSpan={2} className="px-6 py-2 text-center text-xs font-bold text-gray-700 uppercase tracking-wider border-b border-r bg-gray-100">
                                                        {subject?.name || 'Unknown'}
                                                    </th>
                                                )
                                            })}
                                        </tr>
                                        <tr>
                                            {selectedSubjects.map(subjectId => (
                                                <Fragment key={subjectId}>
                                                    <th key={`${subjectId}-current`} className="px-2 py-2 text-center text-[10px] font-medium text-gray-500 uppercase tracking-wider border-b w-24 bg-gray-50">Current (40%)</th>
                                                    <th key={`${subjectId}-add`} className="px-2 py-2 text-center text-[10px] font-medium text-gray-500 uppercase tracking-wider border-b w-24 border-r bg-gray-50">Add (0-100)</th>
                                                </Fragment>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {students.map((student) => {
                                            const hasChanges = gridChanges.has(student.id)
                                            return (
                                                <tr key={student.id} className={hasChanges ? 'bg-blue-50' : 'hover:bg-gray-50'}>
                                                    <td className="px-6 py-4 whitespace-nowrap sticky left-0 bg-white z-10 border-r shadow-sm">
                                                        <div className="text-sm font-medium text-gray-900">
                                                            {student.last_name} {student.first_name}
                                                        </div>
                                                    </td>
                                                    {selectedSubjects.map(subjectId => {
                                                        const scores = gridScores[student.id]?.[subjectId] || { current_score: 0, add_score: '' }
                                                        return (
                                                            <Fragment key={subjectId}>
                                                                <td key={`${subjectId}-current`} className="px-2 py-4 whitespace-nowrap text-center">
                                                                    <span className="text-sm font-medium text-gray-700">
                                                                        {scores.current_score.toFixed(1)}
                                                                    </span>
                                                                </td>
                                                                <td key={`${subjectId}-add`} className="px-2 py-4 whitespace-nowrap text-center border-r">
                                                                    <input
                                                                        type="number"
                                                                        min="0"
                                                                        max="100"
                                                                        step="0.1"
                                                                        value={scores.add_score}
                                                                        onChange={(e) => handleGridScoreChange(student.id, subjectId, e.target.value)}
                                                                        className="w-20 px-2 py-1 text-center border border-gray-300 rounded focus:ring-1 focus:ring-ghana-green focus:border-ghana-green text-sm"
                                                                        placeholder="+"
                                                                    />
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
                    <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
                        <Grid className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">Select Filters</h3>
                        <p className="text-gray-600">Please select a class and at least one subject to view the grid.</p>
                    </div>
                )}
            </div>
          )}

          {method === 'manual' && (
            <form onSubmit={handleManualSubmit}>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs md:text-sm font-medium text-gray-700 mb-2">Class *</label>
                  <select
                    value={selectedClass}
                    onChange={(e) => setSelectedClass(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-xs md:text-sm"
                  >
                    <option value="">Select class</option>
                    {teacherClasses.map(cls => (
                      <option key={cls.class_id} value={cls.class_id}>{cls.class_name}</option>
                    ))}
                  </select>
                  {formErrors.class && <p className="text-red-600 text-xs md:text-sm mt-1">{formErrors.class}</p>}
                </div>

                <div>
                  <label className="block text-xs md:text-sm font-medium text-gray-700 mb-2">Subject *</label>
                  <select
                    value={selectedSubject}
                    onChange={(e) => setSelectedSubject(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-xs md:text-sm"
                    disabled={!selectedClass}
                  >
                    <option value="">Select subject</option>
                    {filteredSubjects.map(subject => (
                      <option key={subject.id} value={subject.id}>{subject.name}</option>
                    ))}
                  </select>
                  {formErrors.subject && <p className="text-red-600 text-xs md:text-sm mt-1">{formErrors.subject}</p>}
                </div>

                <div>
                  <label className="block text-xs md:text-sm font-medium text-gray-700 mb-2">Student *</label>
                  <select
                    value={selectedStudent}
                    onChange={(e) => setSelectedStudent(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-xs md:text-sm"
                    disabled={!selectedClass}
                  >
                    <option value="">Select student</option>
                    {students.map(student => (
                      <option key={student.id} value={student.id}>
                        {student.first_name} {student.last_name}
                      </option>
                    ))}
                  </select>
                  {formErrors.student && <p className="text-red-600 text-xs md:text-sm mt-1">{formErrors.student}</p>}
                </div>

                <div>
                  <label className="block text-xs md:text-sm font-medium text-gray-700 mb-2">Class Score (0-100) *</label>
                  <input
                    type="number"
                    value={classScore}
                    onChange={(e) => setClassScore(e.target.value)}
                    step="0.1"
                    min="0"
                    max="100"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-xs md:text-sm"
                    placeholder="Enter score (e.g., 85)"
                  />
                  {formErrors.class_score && <p className="text-red-600 text-xs md:text-sm mt-1">{formErrors.class_score}</p>}
                </div>

                <div>
                  <label className="block text-xs md:text-sm font-medium text-gray-700 mb-2">Term</label>
                  <input
                    type="text"
                    value={currentTermName}
                    disabled
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-xs md:text-sm"
                  />
                </div>

                {formErrors.submit && (
                  <div className="flex items-center space-x-2 text-red-600 text-xs md:text-sm">
                    <AlertCircle className="w-4 h-4" />
                    <p>{formErrors.submit}</p>
                  </div>
                )}

                {submitSuccess && (
                  <div className="flex items-center space-x-2 text-green-600 text-xs md:text-sm">
                    <CheckCircle className="w-4 h-4" />
                    <p>Class score submitted successfully!</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-ghana-green text-white py-3 rounded-lg hover:bg-green-700 transition disabled:bg-gray-400 text-xs md:text-sm"
                >
                  {submitting ? 'Submitting...' : 'Submit Class Score'}
                </button>
              </div>
            </form>
          )}

          {method === 'csv' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs md:text-sm font-medium text-gray-700 mb-2">Class *</label>
                <select
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-xs md:text-sm"
                >
                  <option value="">Select class</option>
                  {teacherClasses.map(cls => (
                    <option key={cls.class_id} value={cls.class_id}>{cls.class_name}</option>
                  ))}
                </select>
              </div>

              {currentTermName && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-xs md:text-sm text-blue-800">
                    <strong>Current Term:</strong> {currentTermName}
                  </p>
                </div>
              )}

              {selectedClass && (
                <div>
                  <label className="block text-xs md:text-sm font-medium text-gray-700 mb-2">
                    Select Subjects for Template * (Select at least one)
                  </label>
                  <div className="border border-gray-300 rounded-lg p-4 max-h-60 overflow-y-auto space-y-2">
                    {filteredSubjects.length > 0 ? (
                      filteredSubjects.map(subject => (
                        <label key={subject.id} className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-2 rounded">
                          <input
                            type="checkbox"
                            checked={selectedSubjects.includes(subject.id)}
                            onChange={() => toggleSubject(subject.id)}
                            className="w-4 h-4 text-ghana-green"
                          />
                          <span className="text-xs md:text-sm">{subject.name}</span>
                        </label>
                      ))
                    ) : (
                      <p className="text-xs md:text-sm text-gray-500">No subjects available for this class</p>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {selectedSubjects.length} subject{selectedSubjects.length !== 1 ? 's' : ''} selected
                  </p>
                </div>
              )}

              {selectedClass && selectedSubjects.length > 0 && (
                <button
                  type="button"
                  onClick={downloadTemplate}
                  className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition flex items-center justify-center space-x-2 text-xs md:text-sm"
                >
                  <FileText className="w-4 h-4" />
                  <span>Download CSV Template</span>
                </button>
              )}

              <div>
                <label className="block text-xs md:text-sm font-medium text-gray-700 mb-2">CSV File *</label>
                <input
                  type="file"
                  accept=".csv"
                  onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-xs md:text-sm"
                />
                <p className="text-xs md:text-sm text-gray-500 mt-1">
                  Format: student_name, mathematics_class, english_language_class, ...
                </p>
              </div>

              {formErrors.csv && (
                <div className="flex items-center space-x-2 text-red-600 text-xs md:text-sm">
                  <AlertCircle className="w-4 h-4" />
                  <p>{formErrors.csv}</p>
                </div>
              )}

              {uploadResults && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-xs md:text-sm">
                  <p className="font-medium">Upload Results:</p>
                  <p className="text-green-600">✓ Success: {uploadResults.success}</p>
                  <p className="text-red-600">✗ Failed: {uploadResults.failed}</p>
                  {uploadResults.errors.length > 0 && (
                    <div className="mt-2 max-h-40 overflow-y-auto">
                      {uploadResults.errors.map((err: string, i: number) => (
                        <p key={i} className="text-xs md:text-sm text-red-600">{err}</p>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <button
                onClick={handleCsvUpload}
                disabled={submitting || !csvFile || !selectedClass}
                className="w-full bg-ghana-green text-white py-3 rounded-lg hover:bg-green-700 transition disabled:bg-gray-400 text-xs md:text-sm"
              >
                {submitting ? 'Uploading...' : 'Upload CSV'}
              </button>
            </div>
          )}

          {method === 'ocr' && (
            <div className="text-center py-8">
              <Camera className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 text-xs md:text-sm">OCR feature coming soon</p>
              <Link
                href="/teacher/scores/ocr"
                className="text-ghana-green hover:underline mt-2 inline-block text-xs md:text-sm"
              >
                Or use existing OCR page →
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function ClassScoresPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <ClassScoresContent />
    </Suspense>
  )
}
