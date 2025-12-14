'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, FileText, Upload, Camera, AlertCircle, CheckCircle } from 'lucide-react'
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

function ExamScoresContent() {
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
  
  const [examScore, setExamScore] = useState('')
  const [csvFile, setCsvFile] = useState<File | null>(null)
  
  const [submitting, setSubmitting] = useState(false)
  const [submitSuccess, setSubmitSuccess] = useState(false)
  const [uploadResults, setUploadResults] = useState<any>(null)
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadData() {
      try {
        const user = await getCurrentUser()
        if (!user) {
          router.push('/login')
          return
        }

        const { data: teacherData, error: teacherError} = await getTeacherData(user.id)
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

        const { data: subjectsData, error: subjectsError } = await supabase
          .from('subjects')
          .select('id, name, code, level')
          .order('name') as { data: any[] | null; error: any }

        if (!subjectsError && subjectsData) {
          setSubjects(subjectsData)
        }

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
        const assignedSubjectIds = access.subjects_taught.map(s => s.subject_id)
        const filteredByAssignment = filtered.filter(s => assignedSubjectIds.includes(s.id))
        
        // If teacher has no assigned subjects but has class access, show all subjects
        if (filteredByAssignment.length === 0 && filtered.length > 0) {
          // Keep all subjects
        } else {
          filtered = filteredByAssignment
        }
      }

      setFilteredSubjects(filtered)

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

  function convertExamScore(inputScore: number, maxScore: number = 100): number {
    return Math.round((inputScore / maxScore) * 60 * 10) / 10
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
    
    const score = parseFloat(examScore)

    if (!examScore) {
      errors.exam_score = 'Exam score is required'
    } else if (isNaN(score) || score < 0 || score > 100) {
      errors.exam_score = 'Exam score must be between 0 and 100'
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

      const inputScore = parseFloat(examScore)
      const convertedExamScore = convertExamScore(inputScore)

      const { data: existingScore } = await supabase
        .from('scores')
        .select('*')
        .eq('student_id', selectedStudent)
        .eq('subject_id', selectedSubject)
        .eq('term_id', selectedTerm)
        .maybeSingle() as { data: any }

      if (existingScore) {
        const classScore = existingScore.class_score || 0
        const newTotal = classScore + convertedExamScore
        const gradeData = calculateGradeAndRemark(newTotal, classAccess.class_name)

        const { error: updateError } = await supabase
          .from('scores')
          .update({
            exam_score: convertedExamScore,
            total: newTotal,
            grade: gradeData.grade,
            remarks: gradeData.remark,
            teacher_id: teacher!.id
          })
          .eq('id', existingScore.id)

        if (updateError) throw updateError
      } else {
        const total = convertedExamScore
        const gradeData = calculateGradeAndRemark(total, classAccess.class_name)

        const { error: insertError } = await supabase
          .from('scores')
          .insert({
            student_id: selectedStudent,
            subject_id: selectedSubject,
            term_id: selectedTerm,
            class_score: 0,
            exam_score: convertedExamScore,
            total: total,
            grade: gradeData.grade,
            remarks: gradeData.remark,
            teacher_id: teacher!.id
          })

        if (insertError) throw insertError
      }

      setSubmitSuccess(true)
      setExamScore('')
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

  async function handleCsvUpload() {
    if (!csvFile || !selectedClass || !selectedTerm) {
      setFormErrors({ csv: 'Please select class, term, and CSV file' })
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
      
      const detectedSubjects: Subject[] = []
      const subjectNames = new Set<string>()

      headers.forEach(header => {
        if (header === 'student_name') return
        const match = header.match(/^(.+?)_exam$/)
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
        setFormErrors({ csv: 'No valid subjects detected. Headers should be: student_name, subject_name_exam' })
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
          const examScoreKey = `${shortName}_exam`
          const examScoreValue = parseFloat(rowData[examScoreKey])

          if (isNaN(examScoreValue)) continue

          if (examScoreValue < 0 || examScoreValue > 100) {
            results.failed++
            results.errors.push(`Row ${i + 1}, ${subject.name}: Invalid exam score (must be 0-100)`)
            continue
          }

          const convertedExamScore = convertExamScore(examScoreValue)

          const { data: existingScore } = await supabase
            .from('scores')
            .select('*')
            .eq('student_id', studentData.id)
            .eq('subject_id', subject.id)
            .eq('term_id', selectedTerm)
            .maybeSingle() as { data: any }

          if (existingScore) {
            const classScore = existingScore.class_score || 0
            const newTotal = classScore + convertedExamScore

            const { error } = await supabase
              .from('scores')
              .update({
                exam_score: convertedExamScore,
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
                class_score: 0,
                exam_score: convertedExamScore,
                total: convertedExamScore,
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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-ghana-red mx-auto mb-4"></div>
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
            href="/teacher/upload-scores"
            className="inline-flex items-center text-ghana-red hover:text-red-700 mb-4 text-xs md:text-sm"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Upload Scores
          </Link>
          <h1 className="text-lg md:text-xl font-bold text-gray-900">Upload Exam Scores</h1>
          <p className="text-xs md:text-sm text-gray-600 mt-2">
            Enter exam scores (0-100). System converts to max 60 marks.
          </p>
        </div>

        <div className="flex space-x-2 mb-6">
          <Link
            href="/teacher/upload-scores/exam?method=manual"
            className={`px-4 py-2 rounded text-xs md:text-sm ${method === 'manual' ? 'bg-ghana-red text-white' : 'bg-white text-gray-700'}`}
          >
            <FileText className="w-4 h-4 inline mr-2" />
            Manual
          </Link>
          <Link
            href="/teacher/upload-scores/exam?method=csv"
            className={`px-4 py-2 rounded text-xs md:text-sm ${method === 'csv' ? 'bg-ghana-red text-white' : 'bg-white text-gray-700'}`}
          >
            <Upload className="w-4 h-4 inline mr-2" />
            CSV
          </Link>
          <Link
            href="/teacher/upload-scores/exam?method=ocr"
            className={`px-4 py-2 rounded text-xs md:text-sm ${method === 'ocr' ? 'bg-ghana-red text-white' : 'bg-white text-gray-700'}`}
          >
            <Camera className="w-4 h-4 inline mr-2" />
            OCR
          </Link>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
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
                  <label className="block text-xs md:text-sm font-medium text-gray-700 mb-2">Exam Score (0-100) *</label>
                  <input
                    type="number"
                    value={examScore}
                    onChange={(e) => setExamScore(e.target.value)}
                    step="0.1"
                    min="0"
                    max="100"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-xs md:text-sm"
                    placeholder="Enter score (e.g., 75)"
                  />
                  {formErrors.exam_score && <p className="text-red-600 text-xs md:text-sm mt-1">{formErrors.exam_score}</p>}
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
                    <p>Exam score submitted successfully!</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-ghana-red text-white py-3 rounded-lg hover:bg-red-700 transition disabled:bg-gray-400 text-xs md:text-sm"
                >
                  {submitting ? 'Submitting...' : 'Submit Exam Score'}
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

              <div>
                <label className="block text-xs md:text-sm font-medium text-gray-700 mb-2">CSV File *</label>
                <input
                  type="file"
                  accept=".csv"
                  onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-xs md:text-sm"
                />
                <p className="text-xs md:text-sm text-gray-500 mt-1">
                  Format: student_name, mathematics_exam, english_language_exam, ...
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
                className="w-full bg-ghana-red text-white py-3 rounded-lg hover:bg-red-700 transition disabled:bg-gray-400 text-xs md:text-sm"
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
                className="text-ghana-red hover:underline mt-2 inline-block text-xs md:text-sm"
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

export default function ExamScoresPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <ExamScoresContent />
    </Suspense>
  )
}
