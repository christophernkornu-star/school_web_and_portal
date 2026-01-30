'use client'

import { useState, useEffect, Fragment, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, FileText, Upload, AlertCircle, CheckCircle, Grid } from 'lucide-react'
import { getCurrentUser, getTeacherData } from '@/lib/auth'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'
import { getTeacherClassAccess } from '@/lib/teacher-permissions'
import { toast } from 'react-hot-toast'
import { Skeleton } from "@/components/ui/skeleton"

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
  const method = searchParams.get('method') || 'grid'

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

  const [currentTermName, setCurrentTermName] = useState('')
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([])
  

  const [csvFile, setCsvFile] = useState<File | null>(null)
  
  // Grid view state
  const [activeTab, setActiveTab] = useState<'csv' | 'grid'>('grid')
  const [gridScores, setGridScores] = useState<Record<string, Record<string, { current_score: number, add_score: string, exam_score: number, id?: string, assessments_count?: number, total_assessments?: number }>>>({})
  const [gridSaving, setGridSaving] = useState(false)
  const [gridLoading, setGridLoading] = useState(false)
  const [gridChanges, setGridChanges] = useState<Set<string>>(new Set())
  const [isSubjectDropdownOpen, setIsSubjectDropdownOpen] = useState(false)
  const [classScorePercentage, setClassScorePercentage] = useState(40)
  const [examScorePercentage, setExamScorePercentage] = useState(60)

  const [submitting, setSubmitting] = useState(false)
  const [submitSuccess, setSubmitSuccess] = useState(false)
  const [uploadResults, setUploadResults] = useState<any>(null)
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [error, setError] = useState('')

  useEffect(() => {
    if (method === 'csv') setActiveTab('csv')
    else setActiveTab('grid')
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

        // Fetch all initial data in parallel
        const [
          gradingSettingsRes,
          classAccess,
          subjectsRes,
          termsRes,
          currentTermRes
        ] = await Promise.all([
          // 1. Grading settings
          supabase
            .from('system_settings')
            .select('*')
            .in('setting_key', ['class_score_percentage', 'exam_score_percentage']),
          
          // 2. Class access
          getTeacherClassAccess(teacherData.profile_id),
          
          // 3. Subjects
          supabase
            .from('subjects')
            .select('id, name, code, level')
            .order('name'),
          
          // 4. Terms
          supabase
            .from('academic_terms')
            .select('*')
            .order('created_at', { ascending: false }),
          
          // 5. Current term
          supabase
            .from('system_settings')
            .select('setting_value')
            .eq('setting_key', 'current_term')
            .maybeSingle()
        ])

        // Process Grading Settings
        if (gradingSettingsRes.data) {
           gradingSettingsRes.data.forEach((setting: any) => {
             if (setting.setting_key === 'class_score_percentage') {
               setClassScorePercentage(Number(setting.setting_value))
             } else if (setting.setting_key === 'exam_score_percentage') {
               setExamScorePercentage(Number(setting.setting_value))
             }
           })
        }

        // Process Class Access
        setTeacherClasses(classAccess.map(c => ({
          class_id: c.class_id,
          class_name: c.class_name,
          level: c.level
        })))

        // Process Subjects
        if (!subjectsRes.error && subjectsRes.data) {
          setSubjects(subjectsRes.data)
        }

        // Process Terms and Current Term
        if (!termsRes.error && termsRes.data) {
          setTerms(termsRes.data)
          
          const currentTermId = currentTermRes.data?.setting_value
          if (currentTermId) {
            const matchingTerm = termsRes.data.find((t: any) => t.id === currentTermId)
            if (matchingTerm) {
              setSelectedTerm(currentTermId)
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
        .select('id, student_id, first_name, last_name, middle_name')
        .eq('class_id', selectedClass)
        .eq('status', 'active')
        .order('last_name') as { data: any[] | null }

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

      const scoresMap: Record<string, Record<string, { current_score: number, add_score: string, exam_score: number, id?: string, assessments_count?: number, total_assessments?: number }>> = {}
      
      // Initialize
      students.forEach(student => {
        scoresMap[student.id] = {}
        selectedSubjects.forEach(subjectId => {
            scoresMap[student.id][subjectId] = { current_score: 0, add_score: '', exam_score: 0, assessments_count: 0, total_assessments: 0 }
        })
      })

      // Fetch assessment info for each subject
      for (const subjectId of selectedSubjects) {
          // Get class_subject_id
          const { data: classSubject } = await supabase
            .from('class_subjects')
            .select('id')
            .eq('class_id', selectedClass)
            .eq('subject_id', subjectId)
            .maybeSingle()
          
          if (classSubject) {
              // Get assessments
              const { data: assessments } = await supabase
                .from('assessments')
                .select('id')
                .eq('class_subject_id', classSubject.id)
                .eq('term_id', selectedTerm)
              
              const assessmentIds = assessments?.map((a: { id: string }) => a.id) || []
              const totalAssessments = assessmentIds.length

              if (totalAssessments > 0) {
                  // Get student participation counts
                  const { data: participation } = await supabase
                    .from('student_scores')
                    .select('student_id')
                    .in('assessment_id', assessmentIds)
                  
                  // Count per student
                  const studentCounts: Record<string, number> = {}
                  participation?.forEach((p: any) => {
                      studentCounts[p.student_id] = (studentCounts[p.student_id] || 0) + 1
                  })

                  // Update scoresMap
                  students.forEach(student => {
                      if (scoresMap[student.id][subjectId]) {
                          scoresMap[student.id][subjectId].total_assessments = totalAssessments
                          scoresMap[student.id][subjectId].assessments_count = studentCounts[student.id] || 0
                      }
                  })
              }
          }
      }

      // Fill
      data?.forEach((score: any) => {
        if (scoresMap[score.student_id]) {
            scoresMap[score.student_id][score.subject_id] = {
                ...scoresMap[score.student_id][score.subject_id],
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
    // Immediate validation
    const numVal = parseFloat(value)
    if (!isNaN(numVal) && numVal > 10) {
        toast.error("Score cannot exceed 10")
        return // Do not update state
    }

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

      // Group changes by subject
      const changesBySubject: Record<string, { studentId: string, score: number }[]> = {}
      const validationErrors: string[] = []

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
                // Validate score (must be <= 10)
                if (addScore > 10) {
                    const student = students.find(s => s.id === studentId)
                    const subject = subjects.find(s => s.id === subjectId)
                    validationErrors.push(`${student?.first_name} ${student?.last_name} - ${subject?.name}: Score ${addScore} exceeds limit of 10`)
                } else {
                    if (!changesBySubject[subjectId]) {
                        changesBySubject[subjectId] = []
                    }
                    changesBySubject[subjectId].push({ studentId, score: addScore })
                }
            }
        })
      })

      if (validationErrors.length > 0) {
          setError(`Validation Error:\n${validationErrors.join('\n')}`)
          setGridSaving(false)
          return
      }

      // Process each subject
      for (const subjectId of Object.keys(changesBySubject)) {
          const updates = changesBySubject[subjectId]
          if (updates.length === 0) continue

          // 1. Create Assessment
          // First get class_subject_id
          const { data: classSubject, error: csError } = await supabase
            .from('class_subjects')
            .select('id')
            .eq('class_id', selectedClass)
            .eq('subject_id', subjectId)
            .maybeSingle()
          
          if (csError) throw csError
          
          // If no class_subject exists, we might need to create one or handle error
          // For now, assume it exists or try to find it via other means if needed
          // But schema requires class_subject_id for assessments
          
          let classSubjectId = classSubject?.id
          
          if (!classSubjectId) {
             // Try to find academic year from term
             const { data: termData } = await supabase
                .from('academic_terms')
                .select('academic_year')
                .eq('id', selectedTerm)
                .single()
             
             if (termData) {
                 // Check if we can create it or if it exists with different criteria
                 // For now, let's try to insert if missing (auto-create relationship)
                 const { data: newCS, error: createError } = await supabase
                    .from('class_subjects')
                    .insert({
                        class_id: selectedClass,
                        subject_id: subjectId,
                        academic_year: termData.academic_year
                    })
                    .select()
                    .single()
                 
                 if (createError) {
                     console.error('Error creating class_subject:', createError)
                     throw new Error(`Subject not assigned to this class. Please contact admin.`)
                 }
                 classSubjectId = newCS.id
             } else {
                 throw new Error('Could not determine academic year for class subject.')
             }
          }

          const { data: assessment, error: assessmentError } = await supabase
            .from('assessments')
            .insert({
                class_subject_id: classSubjectId,
                term_id: selectedTerm,
                assessment_type: 'class_work',
                title: `Grid Entry - ${new Date().toLocaleString()}`,
                max_score: 10,
                assessment_date: new Date().toISOString()
            })
            .select()
            .single()
          
          if (assessmentError) throw assessmentError

          // 2. Insert Student Scores
          const scoreInserts = updates.map(u => ({
              assessment_id: assessment.id,
              student_id: u.studentId,
              score: u.score,
              entered_by: teacher!.id
          }))

          const { error: scoreError } = await supabase
            .from('student_scores')
            .insert(scoreInserts)
          
          if (scoreError) throw scoreError

          // 3. Recalculate Class Scores for these students
          // Need to find assessments via class_subject_id
          const { data: termAssessments } = await supabase
            .from('assessments')
            .select('id')
            .eq('class_subject_id', classSubjectId)
            .eq('term_id', selectedTerm)
          
          const assessmentIds = termAssessments?.map((a: any) => a.id) || []

          for (const update of updates) {
              const { data: studentScores } = await supabase
                  .from('student_scores')
                  .select('score')
                  .in('assessment_id', assessmentIds)
                  .eq('student_id', update.studentId)
              
              if (studentScores) {
                  const totalScoreGotten = studentScores.reduce((sum: number, s: any) => sum + (s.score || 0), 0)
                  const numberOfAssessments = studentScores.length
                  const expectedScore = numberOfAssessments * 10
                  
                  let calculatedClassScore = 0
                  if (expectedScore > 0) {
                      calculatedClassScore = (totalScoreGotten / expectedScore) * classScorePercentage
                  }
                  calculatedClassScore = Math.round(calculatedClassScore * 100) / 100

                  // Update scores table
                  const { data: existingScore } = await supabase
                    .from('scores')
                    .select('*')
                    .eq('student_id', update.studentId)
                    .eq('subject_id', subjectId)
                    .eq('term_id', selectedTerm)
                    .maybeSingle()
                  
                  const examScore = existingScore?.exam_score || 0
                  const total = calculatedClassScore + examScore
                  const className = teacherClasses.find(c => c.class_id === selectedClass)?.class_name || ''
                  const { grade, remark } = calculateGradeAndRemark(total, className)

                  await supabase
                    .from('scores')
                    .upsert({
                        student_id: update.studentId,
                        subject_id: subjectId,
                        term_id: selectedTerm,
                        teacher_id: teacher!.id,
                        class_score: calculatedClassScore,
                        exam_score: examScore,
                        total: total,
                        grade,
                        remarks: remark
                    }, {
                        onConflict: 'student_id,subject_id,term_id'
                    })
              }
          }
      }

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
    return Math.round((inputScore / maxScore) * classScorePercentage * 10) / 10
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





  async function downloadTemplate() {
    if (!selectedClass) {
      toast.error('Please select a class first to download the template with student names.')
      return
    }

    if (selectedSubjects.length === 0) {
      toast.error('Please select at least one subject to include in the template.')
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
      toast.error('Failed to generate template')
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

      // Create assessments for detected subjects
      const assessmentMap: Record<string, string> = {}
      const classSubjectMap: Record<string, string> = {}

      for (const subject of detectedSubjects) {
        // Get class_subject_id first
        const { data: classSubject, error: csError } = await supabase
          .from('class_subjects')
          .select('id')
          .eq('class_id', selectedClass)
          .eq('subject_id', subject.id)
          .maybeSingle()
        
        if (csError) throw csError

        let classSubjectId = classSubject?.id

        if (!classSubjectId) {
             // Try to find academic year from term
             const { data: termData } = await supabase
                .from('academic_terms')
                .select('academic_year')
                .eq('id', selectedTerm)
                .single()
             
             if (termData) {
                 const { data: newCS, error: createError } = await supabase
                    .from('class_subjects')
                    .insert({
                        class_id: selectedClass,
                        subject_id: subject.id,
                        academic_year: termData.academic_year
                    })
                    .select()
                    .single()
                 
                 if (createError) {
                     console.error('Error creating class_subject:', createError)
                     throw new Error(`Subject ${subject.name} not assigned to this class.`)
                 }
                 classSubjectId = newCS.id
             } else {
                 throw new Error('Could not determine academic year for class subject.')
             }
        }
        
        classSubjectMap[subject.id] = classSubjectId

        const { data: assessment, error: assessmentError } = await supabase
          .from('assessments')
          .insert({
            class_subject_id: classSubjectId,
            term_id: selectedTerm,
            teacher_id: teacher!.id,
            assessment_type: 'class_work',
            title: `CSV Upload - ${new Date().toLocaleString()}`,
            max_score: 10,
            assessment_date: new Date().toISOString()
          })
          .select()
          .single()
          
        if (assessmentError) throw assessmentError
        assessmentMap[subject.id] = assessment.id
      }

      const results = {
        success: 0,
        failed: 0,
        errors: [] as string[]
      }

      const classAccess = teacherClasses.find(c => c.class_id === selectedClass)

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

          if (classScoreValue < 0 || classScoreValue > 10) {
            results.failed++
            results.errors.push(`Row ${i + 1}, ${subject.name}: Invalid class score (must be 0-10)`)
            continue
          }

          // Insert into student_scores
          const { error: scoreError } = await supabase
            .from('student_scores')
            .insert({
              assessment_id: assessmentMap[subject.id],
              student_id: studentData.id,
              score: classScoreValue,
              entered_by: teacher!.id
            })

          if (scoreError) {
            results.failed++
            results.errors.push(`Row ${i + 1}, ${subject.name}: ${scoreError.message}`)
            continue
          }

          // Recalculate Class Score
          const { data: termAssessments } = await supabase
            .from('assessments')
            .select('id')
            .eq('class_subject_id', classSubjectMap[subject.id])
            .eq('term_id', selectedTerm)

          if (termAssessments && termAssessments.length > 0) {
            const assessmentIds = termAssessments.map((a: any) => a.id)
            
            const { data: studentScores } = await supabase
              .from('student_scores')
              .select('score')
              .in('assessment_id', assessmentIds)
              .eq('student_id', studentData.id)

            if (studentScores) {
              const totalScoreGotten = studentScores.reduce((sum: number, s: any) => sum + (s.score || 0), 0)
              const numberOfAssessments = studentScores.length
              const expectedScore = numberOfAssessments * 10
              
              let calculatedClassScore = 0
              if (expectedScore > 0) {
                calculatedClassScore = (totalScoreGotten / expectedScore) * classScorePercentage
              }
              
              calculatedClassScore = Math.round(calculatedClassScore * 100) / 100

              const { data: existingScore } = await supabase
                .from('scores')
                .select('*')
                .eq('student_id', studentData.id)
                .eq('subject_id', subject.id)
                .eq('term_id', selectedTerm)
                .maybeSingle() as { data: any }

              const examScore = existingScore?.exam_score || 0
              const total = calculatedClassScore + examScore
              const gradeData = calculateGradeAndRemark(total, classAccess?.class_name || '')

              const { error: updateError } = await supabase
                .from('scores')
                .upsert({
                  student_id: studentData.id,
                  subject_id: subject.id,
                  term_id: selectedTerm,
                  teacher_id: teacher!.id,
                  class_score: calculatedClassScore,
                  exam_score: examScore,
                  total: total,
                  grade: gradeData.grade,
                  remarks: gradeData.remark
                }, {
                  onConflict: 'student_id,subject_id,term_id'
                })

              if (updateError) {
                 console.error('Error updating score:', updateError)
              } else {
                 results.success++
              }
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
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4 transition-colors">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex items-center space-x-2">
            <Skeleton className="h-4 w-4" />
            <Skeleton className="h-4 w-24" />
          </div>
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-96" />
          
          <div className="flex space-x-2">
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-32" />
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 space-y-6">
            <div className="grid md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-10 w-full" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-10 w-full" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-10 w-full" />
              </div>
            </div>
            
            <div className="space-y-4 pt-4">
              <Skeleton className="h-8 w-32" />
              <div className="space-y-2">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 transition-colors">
      <div className="max-w-4xl mx-auto px-4">
        <div className="mb-8">
          <Link
            href="/teacher/manage-scores"
            className="inline-flex items-center text-ghana-green hover:text-green-700 dark:hover:text-green-400 mb-4 text-xs md:text-sm"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Manage Scores
          </Link>
          <h1 className="text-lg md:text-xl font-bold text-gray-900 dark:text-gray-100">Class Scores</h1>
          <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400 mt-2">
            Record multiple class assessments. System automatically calculates final class score (max {classScorePercentage} marks).
          </p>
        </div>

        {/* Method Tabs */}
        <div className="flex space-x-2 mb-6">
          <Link
            href="/teacher/upload-scores/class?method=grid"
            className={`px-4 py-2 rounded text-xs md:text-sm transition-colors ${method === 'grid' ? 'bg-ghana-green text-white' : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
          >
            <Grid className="w-4 h-4 inline mr-2" />
            Spreadsheet View
          </Link>
          <Link
            href="/teacher/upload-scores/class?method=csv"
            className={`px-4 py-2 rounded text-xs md:text-sm transition-colors ${method === 'csv' ? 'bg-ghana-green text-white' : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
          >
            <Upload className="w-4 h-4 inline mr-2" />
            CSV
          </Link>
        </div>

        {/* Forms based on method */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 transition-colors">
          {method === 'grid' && (
            <div className="space-y-6">
                {/* Filters */}
                <div className="grid md:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-xs md:text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Class *</label>
                        <select
                            value={selectedClass}
                            onChange={(e) => setSelectedClass(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-xs md:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                        >
                            <option value="">Select class</option>
                            {teacherClasses.map(cls => (
                                <option key={cls.class_id} value={cls.class_id}>{cls.class_name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="relative">
                        <label className="block text-xs md:text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Subjects *</label>
                        <button
                            type="button"
                            onClick={() => setIsSubjectDropdownOpen(!isSubjectDropdownOpen)}
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-left bg-white dark:bg-gray-700 flex justify-between items-center text-xs md:text-sm text-gray-900 dark:text-gray-100"
                        >
                            <span className="truncate">
                                {selectedSubjects.length === 0 
                                    ? 'Select Subjects' 
                                    : `${selectedSubjects.length} Selected`}
                            </span>
                            <Grid className="w-4 h-4 text-gray-500 dark:text-gray-400" />
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
                                            onChange={(e) => toggleSubject(subject.id)}
                                            className="mr-3 h-4 w-4 text-ghana-green focus:ring-ghana-green border-gray-300 dark:border-gray-500 rounded bg-white dark:bg-gray-600"
                                        />
                                        <span className="text-sm text-gray-700 dark:text-gray-200">{subject.name}</span>
                                    </label>
                                ))}
                            </div>
                        )}
                        {isSubjectDropdownOpen && (
                            <div className="fixed inset-0 z-40" onClick={() => setIsSubjectDropdownOpen(false)}></div>
                        )}
                    </div>

                    <div>
                        <label className="block text-xs md:text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Term</label>
                        <div className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium text-xs md:text-sm">
                            {currentTermName || 'No current term set'}
                        </div>
                    </div>
                </div>

                {/* Grid Table */}
                {selectedClass && selectedSubjects.length > 0 && selectedTerm ? (
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Enter Scores</h3>
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
                                <p className="text-gray-600 dark:text-gray-400">Loading scores...</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto border dark:border-gray-700 rounded-lg max-h-[70vh]">
                                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 border-collapse">
                                    <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0 z-20 shadow-sm">
                                        <tr>
                                            <th rowSpan={2} className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider sticky left-0 bg-gray-50 dark:bg-gray-700 z-30 border-r dark:border-gray-600 border-b dark:border-gray-600">
                                                Student
                                            </th>
                                            {selectedSubjects.map(subjectId => {
                                                const subject = filteredSubjects.find(s => s.id === subjectId)
                                                const firstStudentId = students[0]?.id
                                                const totalAssessments = gridScores[firstStudentId]?.[subjectId]?.total_assessments || 0
                                                return (
                                                    <th key={subjectId} colSpan={2} className="px-6 py-2 text-center text-xs font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wider border-b dark:border-gray-600 border-r dark:border-gray-600 bg-gray-100 dark:bg-gray-800">
                                                        <div>{subject?.name || 'Unknown'}</div>
                                                        {totalAssessments > 0 && (
                                                            <div className="text-[10px] text-gray-500 dark:text-gray-400 font-normal mt-0.5">
                                                                {totalAssessments} Assessments
                                                            </div>
                                                        )}
                                                    </th>
                                                )
                                            })}
                                        </tr>
                                        <tr>
                                            {selectedSubjects.map(subjectId => (
                                                <Fragment key={subjectId}>
                                                    <th key={`${subjectId}-current`} className="px-2 py-2 text-center text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider border-b dark:border-gray-600 w-24 bg-gray-50 dark:bg-gray-700">Current ({classScorePercentage}%)</th>
                                                    <th key={`${subjectId}-add`} className="px-2 py-2 text-center text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider border-b dark:border-gray-600 w-24 border-r dark:border-gray-600 bg-gray-50 dark:bg-gray-700">Add (0-10)</th>
                                                </Fragment>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                        {students.map((student) => {
                                            const hasChanges = gridChanges.has(student.id)
                                            return (
                                                <tr key={student.id} className={hasChanges ? 'bg-blue-50 dark:bg-blue-900/20' : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'}>
                                                    <td className="px-6 py-4 whitespace-nowrap sticky left-0 bg-white dark:bg-gray-800 z-10 border-r dark:border-gray-600 shadow-sm">
                                                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                                            {student.last_name}, {student.first_name} {student.middle_name}
                                                        </div>
                                                    </td>
                                                    {selectedSubjects.map(subjectId => {
                                                        const scores = gridScores[student.id]?.[subjectId] || { current_score: 0, add_score: '' }
                                                        const showWarning = scores.total_assessments && scores.assessments_count !== undefined && scores.assessments_count < scores.total_assessments
                                                        
                                                        return (
                                                            <Fragment key={subjectId}>
                                                                <td key={`${subjectId}-current`} className="px-2 py-4 whitespace-nowrap text-center relative group">
                                                                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                                                        {scores.current_score.toFixed(1)}
                                                                    </span>
                                                                    {showWarning ? (
                                                                        <div 
                                                                            className="absolute top-1 right-1 cursor-help"
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                toast(`Assessment Check: Student has taken ${scores.assessments_count} out of ${scores.total_assessments} assessments recorded for this subject.`, { icon: 'ℹ️' });
                                                                            }}
                                                                        >
                                                                            <AlertCircle className="w-3 h-3 text-amber-500" />
                                                                            <div className="hidden group-hover:block absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 px-2 py-1 bg-gray-800 text-white text-xs rounded whitespace-nowrap z-50 shadow-lg">
                                                                                Taken: {scores.assessments_count}/{scores.total_assessments}
                                                                            </div>
                                                                        </div>
                                                                    ) : null}
                                                                </td>
                                                                <td key={`${subjectId}-add`} className="px-2 py-4 whitespace-nowrap text-center border-r dark:border-gray-600">
                                                                    <input
                                                                        type="number"
                                                                        min="0"
                                                                        max="10"
                                                                        step="0.1"
                                                                        value={scores.add_score}
                                                                        onChange={(e) => {
                                                                            const val = parseFloat(e.target.value);
                                                                            if (val > 10) {
                                                                                toast.error("Score cannot exceed 10");
                                                                                return;
                                                                            }
                                                                            handleGridScoreChange(student.id, subjectId, e.target.value)
                                                                        }}
                                                                        className="w-20 px-2 py-1 text-center border border-gray-300 dark:border-gray-600 rounded focus:ring-1 focus:ring-ghana-green focus:border-ghana-green text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
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
                    <div className="text-center py-12 bg-gray-50 dark:bg-gray-700/30 rounded-lg border border-gray-200 dark:border-gray-700">
                        <Grid className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-3" />
                        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">Select Filters</h3>
                        <p className="text-gray-600 dark:text-gray-400">Please select a class and at least one subject to view the grid.</p>
                    </div>
                )}
            </div>
          )}



          {method === 'csv' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs md:text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Class *</label>
                <select
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-xs md:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                >
                  <option value="">Select class</option>
                  {teacherClasses.map(cls => (
                    <option key={cls.class_id} value={cls.class_id}>{cls.class_name}</option>
                  ))}
                </select>
              </div>

              {currentTermName && (
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                  <p className="text-xs md:text-sm text-blue-800 dark:text-blue-300">
                    <strong>Current Term:</strong> {currentTermName}
                  </p>
                </div>
              )}

              {selectedClass && (
                <div>
                  <label className="block text-xs md:text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Select Subjects for Template * (Select at least one)
                  </label>
                  <div className="border border-gray-300 dark:border-gray-600 rounded-lg p-4 max-h-60 overflow-y-auto space-y-2 bg-white dark:bg-gray-700">
                    {filteredSubjects.length > 0 ? (
                      filteredSubjects.map(subject => (
                        <label key={subject.id} className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-600 p-2 rounded">
                          <input
                            type="checkbox"
                            checked={selectedSubjects.includes(subject.id)}
                            onChange={() => toggleSubject(subject.id)}
                            className="w-4 h-4 text-ghana-green bg-white dark:bg-gray-600 border-gray-300 dark:border-gray-500"
                          />
                          <span className="text-xs md:text-sm text-gray-700 dark:text-gray-200">{subject.name}</span>
                        </label>
                      ))
                    ) : (
                      <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400">No subjects available for this class</p>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
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
                <label className="block text-xs md:text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">CSV File *</label>
                <input
                  type="file"
                  accept=".csv"
                  onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-xs md:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-ghana-green file:text-white hover:file:bg-green-700"
                />
                <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Format: student_name, mathematics_class, english_language_class, ...
                </p>
              </div>

              {formErrors.csv && (
                <div className="flex items-center space-x-2 text-red-600 dark:text-red-400 text-xs md:text-sm">
                  <AlertCircle className="w-4 h-4" />
                  <p>{formErrors.csv}</p>
                </div>
              )}

              {uploadResults && (
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 text-xs md:text-sm">
                  <p className="font-medium text-gray-900 dark:text-gray-100">Upload Results:</p>
                  <p className="text-green-600 dark:text-green-400">✓ Success: {uploadResults.success}</p>
                  <p className="text-red-600 dark:text-red-400">✗ Failed: {uploadResults.failed}</p>
                  {uploadResults.errors.length > 0 && (
                    <div className="mt-2 max-h-40 overflow-y-auto">
                      {uploadResults.errors.map((err: string, i: number) => (
                        <p key={i} className="text-xs md:text-sm text-red-600 dark:text-red-400">{err}</p>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <button
                onClick={handleCsvUpload}
                disabled={submitting || !csvFile || !selectedClass}
                className="w-full bg-ghana-green text-white py-3 rounded-lg hover:bg-green-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed text-xs md:text-sm"
              >
                {submitting ? 'Uploading...' : 'Upload CSV'}
              </button>
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
