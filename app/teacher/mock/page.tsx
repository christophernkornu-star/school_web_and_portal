'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Plus, Save, Printer, FileSpreadsheet, Search, Trash2, Filter, ArrowUpDown } from 'lucide-react'
import { getCurrentUser, getTeacherData } from '@/lib/auth'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'
import { toast } from 'react-hot-toast'
import BackButton from '@/components/ui/back-button'
import { Skeleton } from '@/components/ui/skeleton'
import { getGradeValue, calculateAggregate, formatStudentName } from '@/lib/academic-utils'

interface Student {
  id: string
  first_name: string
  last_name: string
  middle_name?: string
  gender: string
}

interface Subject {
  id: string
  name: string
  code: string
}

interface MockExam {
  id: string
  name: string
  academic_year: string
  term_id: string
  created_by: string
}

const getShortSubjectName = (name: string) => {
  const n = name.toLowerCase()
  if (n.includes('mathematics') || n.includes('maths')) return 'Math'
  if (n.includes('english')) return 'Eng'
  if (n.includes('science')) return 'Sci'
  if (n.includes('social')) return 'Soc'
  if (n.includes('religious') || n.includes('rme')) return 'RME'
  if (n.includes('creative') || n.includes('arts')) return 'CAD'
  if (n.includes('computing') || n.includes('ict')) return 'Comp'
  if (n.includes('world') || n.includes('people')) return 'OWOP'
  if (n.includes('history')) return 'Hist'
  if (n.includes('french')) return 'Fren'
  if (n.includes('ghanaian')) return 'G.Lang'
  if (n.includes('career')) return 'C.Tech'
  
  return name.substring(0, 4)
}
// Functions getGradeValue and calculateAggregate moved to @/lib/academic-utils


export default function MockExamsPage() {
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()
  
  const [loading, setLoading] = useState(true)
  const [teacherId, setTeacherId] = useState<string | null>(null)
  
  // Data State
  const [classes, setClasses] = useState<any[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [mocks, setMocks] = useState<MockExam[]>([])

  // Permissions State
  const [isClassTeacher, setIsClassTeacher] = useState(false)
  const [allowedSubjects, setAllowedSubjects] = useState<string[]>([])
  const [classPermissions, setClassPermissions] = useState<Record<string, { isClassTeacher: boolean, subjects: string[] }>>({})
  
  const [selectedClass, setSelectedClass] = useState('')
  const [selectedMock, setSelectedMock] = useState('') // ID
  
  // New Mock State
  const [isCreating, setIsCreating] = useState(false)
  const [newMockName, setNewMockName] = useState('') // e.g. "First", "Second"
  const [currentTermId, setCurrentTermId] = useState('')
  const [currentAcademicYear, setCurrentAcademicYear] = useState('')

  // Scores State
  // Map: studentId -> { subjectId: score }
  const [scores, setScores] = useState<Record<string, Record<string, string>>>({})
  const [saving, setSaving] = useState(false)
  
  // Sorting & Filtering State
  const [searchQuery, setSearchQuery] = useState('')
  const [filterGender, setFilterGender] = useState<string>('all') // 'all', 'Male', 'Female'
  const [sortBy, setSortBy] = useState<string>('name') // 'name', 'gender_m_f', 'gender_f_m'

  // Sheet View
  const [showSheet, setShowSheet] = useState(false)

  useEffect(() => {
    init()
  }, [])

  useEffect(() => {
    if (selectedClass) {
      loadClassDetails(selectedClass)
    } else {
        setSubjects([])
        setStudents([])
        setMocks([])
        setIsClassTeacher(false)
        setAllowedSubjects([])
    }
  }, [selectedClass])

  useEffect(() => {
    if (selectedMock) {
        loadMockScores(selectedMock)
    } else {
        setScores({})
    }
  }, [selectedMock])

  async function init() {
    const user = await getCurrentUser()
    if (!user) {
      router.push('/login?portal=teacher')
      return
    }

    const { data: teacherData } = await getTeacherData(user.id)
    if (!teacherData) return
    setTeacherId(teacherData.id)

    const [{ data: classAssignments }, { data: subjectAssignments }] = await Promise.all([
        supabase.from('teacher_class_assignments').select('class_id, is_class_teacher').eq('teacher_id', teacherData.id),
        supabase.from('teacher_subject_assignments').select('class_id, subject_id, can_edit').eq('teacher_id', teacherData.id)
    ])
    
    const classIds = new Set<string>()
    const perms: Record<string, { isClassTeacher: boolean, subjects: string[] }> = {}
    
    if (classAssignments) {
        classAssignments.forEach((a: any) => {
            classIds.add(a.class_id)
            if (!perms[a.class_id]) perms[a.class_id] = { isClassTeacher: false, subjects: [] }
            if (a.is_class_teacher) perms[a.class_id].isClassTeacher = true
        })
    }
    
    if (subjectAssignments) {
        subjectAssignments.forEach((a: any) => {
            classIds.add(a.class_id)
            if (!perms[a.class_id]) perms[a.class_id] = { isClassTeacher: false, subjects: [] }
            // Always add allowed subjects for everyone, including class teachers
            if (a.can_edit !== false) perms[a.class_id].subjects.push(a.subject_id)
        })
    }
    
    // Explicitly add all subjects for Class Teacher? NO.
    // User Requirement: "the class teacher too should only see the subjects he has been assigned and be able to enter the scores"
    // So if isClassTeacher is true, we simply note it (for Delete privileges and creation), 
    // BUT we do NOT automatically add all subjects to 'subjects' array for editing view.
    
    if (classIds.size > 0) {
        const { data: classesData } = await supabase
          .from('classes')
          .select('id, name, level')
          .in('id', Array.from(classIds))
        
        if (classesData) {
            const basic9Classes = classesData.filter((c: any) => {
                 const name = (c.name || '').toLowerCase()
                 return name.includes('basic 9') || name.includes('jhs 3')
            })
            setClasses(basic9Classes)
        }
    }
    
    setClassPermissions(perms)

    const { data: terms } = await supabase
        .from('academic_terms')
        .select('*')
        .eq('is_current', true)
        .single()
    
    if (terms) {
        setCurrentTermId(terms.id)
        setCurrentAcademicYear(terms.academic_year)
    }
    
    setLoading(false)
  }

  async function loadClassDetails(classId: string) {
    const perm = classPermissions[classId]
    setIsClassTeacher(perm?.isClassTeacher || false)
    setAllowedSubjects(perm?.subjects || [])

    // 1. Get Subjects for this class level
    const cls = classes.find(c => c.id === classId)
    if (!cls) return

    const { data: subjectsData } = await supabase
        .from('subjects')
        .select('id, name, code')
        .eq('level', cls.level)
        .order('name')
    
    if (subjectsData) {
        // Sort: English, Math, Science, Social, others A-Z
        const sortedSubjects = [...subjectsData].sort((a, b) => {
            const getPriority = (name: string) => {
                const n = name.toLowerCase()
                if (n.includes('english')) return 1
                if (n.includes('mathematics') || n.includes('maths')) return 2
                if (n.includes('science') && !n.includes('computer')) return 3
                if (n.includes('social')) return 4
                return 100
            }
            
            const pA = getPriority(a.name)
            const pB = getPriority(b.name)
            
            if (pA !== pB) return pA - pB
            return a.name.localeCompare(b.name)
        })
        setSubjects(sortedSubjects)
    }

    // 2. Get Students
    const { data: studentsData } = await supabase
        .from('students')
        .select('id, first_name, last_name, middle_name, gender')
        .eq('class_id', classId)
        .eq('status', 'active')
        .order('last_name')
    
    if (studentsData) {
        setStudents(studentsData)
        // Initialize scores map
        const initialScores: Record<string, Record<string, string>> = {}
        studentsData.forEach((s: any) => {
            initialScores[s.id] = {}
        })
        setScores(initialScores)
    }

    // 3. Get Mocks for this class
    const { data: mocksData } = await supabase
        .from('mock_exams')
        .select('*')
        .eq('class_id', classId)
        .order('created_at', { ascending: false })
    
    if (mocksData) setMocks(mocksData)
  }

  async function createMock() {
      if (!newMockName || !selectedClass || !currentTermId) return
      
      const { data, error } = await supabase
        .from('mock_exams')
        .insert({
            class_id: selectedClass,
            term_id: currentTermId,
            name: newMockName, // e.g., "Second"
            academic_year: currentAcademicYear,
            created_by: (await getTeacherData((await getCurrentUser())!.id)).data.id
        })
        .select()
        .single()
      
      if (error) {
          toast.error('Failed to create mock: ' + error.message)
      } else {
          toast.success('Mock created!')
          setMocks([data, ...mocks])
          setSelectedMock(data.id)
          setIsCreating(false)
          setNewMockName('')
      }
  }

  async function loadMockScores(mockId: string) {
      const { data } = await supabase
        .from('mock_scores')
        .select('student_id, subject_id, score')
        .eq('mock_exam_id', mockId)
      
      if (data) {
          const loadedScores: Record<string, Record<string, string>> = {}
          students.forEach(s => loadedScores[s.id] = {})
          
          data.forEach((item: any) => {
              if (!loadedScores[item.student_id]) loadedScores[item.student_id] = {}
              loadedScores[item.student_id][item.subject_id] = item.score.toString()
          })
          setScores(loadedScores)
      }
  }

  async function saveScores() {
      if (!selectedMock) return
      setSaving(true)
      
      const upserts: any[] = []
      
      Object.entries(scores).forEach(([studentId, subjectScores]) => {
          Object.entries(subjectScores).forEach(([subjectId, scoreVal]) => {
              if (scoreVal !== '') {
                  upserts.push({
                      mock_exam_id: selectedMock,
                      student_id: studentId,
                      subject_id: subjectId,
                      score: parseFloat(scoreVal)
                  })
              }
          })
      })
      
      if (upserts.length > 0) {
          const { error } = await supabase
            .from('mock_scores')
            .upsert(upserts, { onConflict: 'mock_exam_id, student_id, subject_id' })
            
          if (error) toast.error('Error saving: ' + error.message)
          else toast.success('Scores saved successfully')
      }
      
      setSaving(false)
  }

  async function deleteMock(mockId: string) {
      if (!confirm('Are you sure you want to delete this mock exam? This will delete all scores associated with it.')) return
      
      const { error } = await supabase
          .from('mock_exams')
          .delete()
          .eq('id', mockId)
      
      if (error) {
          toast.error('Failed to delete: ' + error.message)
      } else {
          toast.success('Mock deleted')
          setMocks(mocks.filter(m => m.id !== mockId))
          if (selectedMock === mockId) setSelectedMock('')
      }
  }

  const getFilteredAndSortedStudents = () => {
      let result = [...students]

      // Search (Name filter)
      if (searchQuery.trim() !== '') {
          const lowerQuery = searchQuery.toLowerCase()
          result = result.filter(s => {
              const fullName = `${s.first_name} ${s.middle_name || ''} ${s.last_name}`.toLowerCase()
              return fullName.includes(lowerQuery)
          })
      }

      // Filter
      if (filterGender !== 'all') {
          result = result.filter(s => s.gender === filterGender)
      }

      // Sort
      result.sort((a, b) => {
          if (sortBy === 'name') {
              return a.last_name.localeCompare(b.last_name)
          } else if (sortBy === 'gender_m_f') {
             // Boys first (Male < Female alphabetically? No, M comes after F)
             // We want Male first.
             if (a.gender === b.gender) return a.last_name.localeCompare(b.last_name)
             return a.gender === 'Male' ? -1 : 1
          } else if (sortBy === 'gender_f_m') {
             // Girls first
             if (a.gender === b.gender) return a.last_name.localeCompare(b.last_name)
             return a.gender === 'Female' ? -1 : 1
          }
          return 0
      })

      return result
  }

  const handleScoreChange = (studentId: string, subjectId: string, val: string) => {
      setScores(prev => ({
          ...prev,
          [studentId]: {
              ...prev[studentId],
              [subjectId]: val
          }
      }))
  }

  // Calculation Logic for Sheet
  const getProcessedData = () => {
      // Use filtered/sorted list for sheet too? Usually sheet should include everyone, 
      // but maybe sorted as per view? 
      // User requirement: "sort names... alphabetical order... boys first..."
      // Likely they want the sheet to reflect this order too if possible, 
      // OR they just mean for entry.
      // Usually sheets are ranked by position. 
      // If position is used, sorting by name/gender might break position order flow.
      // But let's assume filtering applies to view only, OR filtering applies to sheet too?
      // "all the teachers... should be able to sort the names... boys or boys first"
      // This usually implies for data entry convenience.
      
      // For the SHEET, we usually sort by Position (Aggregate/Score).
      // So let's keep getProcessedData sorting by Performance for the printed sheet.
      // However, the printed sheet request was specific to Performance Ranking.
      
      // But if they want to print a "Checklist", they might want name order.
      // But the current sheet has positions.
      
      return students.map(student => {
          const studentScores = scores[student.id] || {}
          
          // Calculate Average
          let total = 0
          let count = 0
          const scoreObjects: { subjectName: string, score: number }[] = []

          subjects.forEach(sub => {
              const val = parseFloat(studentScores[sub.id])
              if (!isNaN(val)) {
                  total += val
                  count++
                  scoreObjects.push({ subjectName: sub.name, score: val })
              }
          })
          
          const divisor = subjects.length > 0 ? subjects.length : 1
          const average = total / divisor
          
          const aggregate = calculateAggregate(scoreObjects).total
          
          return {
              ...student,
              fullname: formatStudentName(student),
              scores: studentScores,
              totalScore: total,
              average,
              aggregate
          }
      }).sort((a, b) => {
          // Sort Alphabetically by name
          return a.fullname.localeCompare(b.fullname);
      })
  }

  if (loading) return <div className="p-8"><Skeleton className="h-12 w-full" /></div>
  
  const processedData = showSheet ? getProcessedData() : []
  const visibleStudents = getFilteredAndSortedStudents()
  const currentMockData = mocks.find(m => m.id === selectedMock)

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 font-sans text-gray-900 dark:text-gray-100 transition-colors">
        {/* Header Controls (Hidden on Print) */}
        {!showSheet && (
           <div className="max-w-6xl mx-auto space-y-6">
               <div className="flex items-center gap-4">
                   <BackButton />
                   <h1 className="text-2xl font-bold">Mock Exams Management (Basic 9)</h1>
               </div>

               {classes.length === 0 ? (
                   <div className="bg-yellow-50 p-4 rounded text-yellow-800">
                       You are not assigned to any Basic 9 classes as either a Class Teacher or Subject Teacher.
                   </div>
               ) : (
                   <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow space-y-4">
                       <div className="grid md:grid-cols-2 gap-4">
                           <div>
                               <label className="block text-sm font-medium mb-1">Select Class</label>
                               <select 
                                 className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600"
                                 value={selectedClass}
                                 onChange={e => setSelectedClass(e.target.value)}
                               >
                                   <option value="">-- Select --</option>
                                   {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                               </select>
                           </div>
                           
                           {selectedClass && (
                               <div>
                                   <label className="block text-sm font-medium mb-1">Select Mock</label>
                                   <div className="flex gap-2">
                                       <select 
                                         className="flex-1 p-2 border rounded dark:bg-gray-700 dark:border-gray-600"
                                         value={selectedMock}
                                         onChange={e => setSelectedMock(e.target.value)}
                                       >
                                           <option value="">-- Select Mock --</option>
                                           {mocks.map(m => <option key={m.id} value={m.id}>{m.name} Mock ({m.academic_year})</option>)}
                                       </select>
                                       {isClassTeacher && (
                                           <button 
                                             onClick={() => setIsCreating(!isCreating)}
                                             className="bg-blue-600 text-white px-3 py-2 rounded hover:bg-blue-700 h-10 w-10 flex items-center justify-center shrink-0"
                                             title="Create New Mock"
                                           >
                                               <Plus className="w-5 h-5" />
                                           </button>
                                       )}
                                       {selectedMock && isClassTeacher && (
                                            <button 
                                              onClick={() => deleteMock(selectedMock)}
                                              className="bg-red-600 text-white px-3 py-2 rounded hover:bg-red-700 h-10 w-10 flex items-center justify-center shrink-0"
                                              title="Delete Selected Mock"
                                            >
                                                <Trash2 className="w-5 h-5" />
                                            </button>
                                       )}
                                   </div>
                               </div>
                           )}
                       </div>
                       
                       {isCreating && isClassTeacher && selectedClass && (
                           <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded border dark:border-gray-600 flex flex-col md:flex-row items-end gap-2">
                               <div className="flex-1 w-full">
                                   <label className="block text-sm font-medium mb-1">Mock Name (e.g. First, Second)</label>
                                   <input 
                                     type="text" 
                                     value={newMockName}
                                     onChange={e => setNewMockName(e.target.value)}
                                     placeholder="Enter mock name..."
                                     className="w-full p-2 border rounded dark:bg-gray-800 dark:border-gray-600"
                                   />
                               </div>
                               <button 
                                 onClick={createMock}
                                 disabled={!newMockName}
                                 className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50 w-full md:w-auto mt-2 md:mt-0"
                               >
                                   Create
                               </button>
                           </div>
                       )}
                   </div>
               )}

               {selectedClass && selectedMock && (
                   <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
                       <div className="p-4 border-b dark:border-gray-700 flex flex-col md:flex-row justify-between items-center gap-4 bg-gray-50 dark:bg-gray-700">
                           <h2 className="font-bold flex items-center gap-2">
                               Enter Scores
                               {!isClassTeacher && (
                                   <span className="text-xs font-normal px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full">
                                       Subject Teacher View
                                   </span>
                               )}
                           </h2>
                           <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                                <div className="relative flex-1 md:w-48 lg:w-64 mr-2">
                                    <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                                    <input
                                        type="text"
                                        placeholder="Search students..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="pl-9 pr-4 py-2 w-full border rounded-lg bg-white dark:bg-gray-800 dark:border-gray-600 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
                                    />
                                </div>
                                <div className="flex items-center bg-white dark:bg-gray-800 border dark:border-gray-600 rounded-lg p-1 mr-2">
                                     <button
                                       onClick={() => {
                                           if (sortBy === 'name') setSortBy('gender_m_f')
                                           else if (sortBy === 'gender_m_f') setSortBy('gender_f_m')
                                           else setSortBy('name')
                                       }}
                                       className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-gray-600 dark:text-gray-300"
                                       title={`Sort: ${sortBy === 'name' ? 'A-Z' : sortBy === 'gender_m_f' ? 'Boys First' : 'Girls First'}`}
                                     >
                                        <ArrowUpDown className="w-4 h-4" />
                                     </button>
                                     <div className="w-px bg-gray-200 dark:bg-gray-600 mx-1 my-1"></div>
                                     <select
                                       value={filterGender}
                                       onChange={(e) => setFilterGender(e.target.value)}
                                       className="bg-transparent text-sm font-medium outline-none text-gray-600 dark:text-gray-300 pr-2"
                                     >
                                         <option value="all">All</option>
                                         <option value="Male">Boys</option>
                                         <option value="Female">Girls</option>
                                     </select>
                                </div>

                                <button 
                                 onClick={() => setShowSheet(true)}
                                 className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700"
                               >
                                   <FileSpreadsheet className="w-4 h-4" /> <span className="hidden sm:inline">Sheet</span>
                               </button>
                               <button 
                                 onClick={saveScores}
                                 disabled={saving}
                                 className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-ghana-green text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50"
                               >
                                   <Save className="w-4 h-4" /> {saving ? 'Saving...' : <span className="hidden sm:inline">Save</span>}
                               </button>
                           </div>
                       </div>
                       
                       <div className="overflow-x-auto">
                           <table className="w-full text-sm">
                               <thead className="bg-gray-100 dark:bg-gray-900 border-b">
                                   <tr>
                                       <th className="p-3 text-left w-40 md:w-64 sticky left-0 bg-gray-100 dark:bg-gray-900 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">Student</th>
                                       {subjects.filter(s => allowedSubjects.includes(s.id)).map(s => (
                                           <th key={s.id} className="p-3 text-center min-w-[80px]">
                                               {getShortSubjectName(s.name)}
                                               {(!isClassTeacher && allowedSubjects.includes(s.id)) && (
                                                   <div className="h-1 w-full bg-green-500 rounded-full mt-1"></div>
                                               )}
                                           </th>
                                       ))}
                                   </tr>
                               </thead>
                               <tbody className="divide-y dark:divide-gray-700">
                                   {visibleStudents.map(s => (
                                       <tr key={s.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                                           <td className="p-3 font-medium sticky left-0 bg-white dark:bg-gray-800 border-r border-gray-100 dark:border-gray-700 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] text-xs md:text-sm">
                                               <div className="truncate w-32 md:w-60" title={`${s.last_name}, ${s.first_name}`}>
                                                   {s.last_name}, {s.first_name}
                                               </div>
                                           </td>
                                           {subjects.filter(s => allowedSubjects.includes(s.id)).map(sub => {
                                               const canEdit = allowedSubjects.includes(sub.id)
                                               const currentScore = scores[s.id]?.[sub.id]
                                               const grade = currentScore ? getGradeValue(parseInt(currentScore)) : null
                                               
                                               return (
                                                   <td key={sub.id} className="p-2 text-center align-middle">
                                                       <div className="flex flex-col items-center justify-center gap-1">
                                                           <input 
                                                             type="number" 
                                                             min="0" 
                                                             max="100" 
                                                             className={`w-14 md:w-16 p-2 border rounded text-center dark:bg-gray-700 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 outline-none transition-all ${!canEdit ? 'opacity-50 bg-gray-100 dark:bg-gray-800 cursor-not-allowed' : ''}`}
                                                             value={currentScore || ''}
                                                             onChange={e => handleScoreChange(s.id, sub.id, e.target.value)}
                                                             disabled={!canEdit}
                                                           />
                                                           {grade !== null && (
                                                               <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                                                                   grade === 1 ? 'bg-green-100 text-green-700' :
                                                                   grade <= 3 ? 'bg-blue-100 text-blue-700' :
                                                                   grade <= 6 ? 'bg-yellow-100 text-yellow-700' :
                                                                   'bg-red-100 text-red-700'
                                                               }`}>
                                                                   Grade: {grade}
                                                               </span>
                                                           )}
                                                       </div>
                                                   </td>
                                               )
                                           })}
                                       </tr>
                                   ))}
                               </tbody>
                           </table>
                       </div>
                   </div>
               )}
           </div>
        )}

        {/* Sheet View for Printing */}
        {showSheet && selectedMock && currentMockData && (
             <div className="bg-white text-black min-h-screen fixed inset-0 z-50 overflow-auto">
                 {/* Print Controls */}
                 <div className="fixed top-4 right-4 print:hidden flex gap-2 z-[60]">
                     <button onClick={() => window.print()} className="bg-blue-600 text-white px-4 py-2 rounded shadow hover:bg-blue-700">PRINT</button>
                     <button onClick={() => setShowSheet(false)} className="bg-gray-600 text-white px-4 py-2 rounded shadow hover:bg-gray-700">CLOSE</button>
                 </div>

                 {/* Pagination Logic */}
                 {(() => {
                    // Optimized for A4 Landscape with ~25 rows per page to prevent overflow with larger font
                    const STUDENTS_PER_PAGE = 25;
                    const pages = [];
                    for (let i = 0; i < processedData.length; i += STUDENTS_PER_PAGE) {
                        pages.push(processedData.slice(i, i + STUDENTS_PER_PAGE));
                    }
                    if (pages.length === 0) pages.push([]); // Handle empty case if needed

                    return pages.map((pageStudents, pageIndex) => (
                        <div key={pageIndex} className={`max-w-[297mm] mx-auto p-2 md:p-8 print:p-0 page-container`}>
                            {pageIndex === 0 && (
                                <div className="text-center mb-2 border-b-2 border-black pb-1">
                                    <h1 className="text-xl md:text-2xl font-bold font-serif uppercase tracking-wide">Biriwa Methodist "C" Basic School</h1>
                                    <h2 className="text-lg md:text-xl font-bold uppercase mt-0">
                                        {currentMockData.academic_year} {currentMockData.name.replace(/mock/i, '').trim()} Mock Results
                                    </h2>
                                </div>
                            )}

                            {/* Responsive Table Wrapper for Screen */}
                            <div className="overflow-x-auto">
                                <table className="w-full border-collapse border border-black text-xs md:text-sm min-w-[800px] md:min-w-0">
                                    <thead>
                                        <tr className="bg-gray-100">
                                            <th className="border border-black px-1 py-0.5 w-8 text-center">SN</th>
                                            <th className="border border-black px-1 py-0.5 text-left min-w-[150px]">NAME</th>
                                            {subjects.map(s => (
                                                <th key={s.id} className="border border-black px-1 py-0.5 w-10 text-center rotate-heads">
                                                    {getShortSubjectName(s.name)}
                                                </th>
                                            ))}
                                            <th className="border border-black px-1 py-0.5 w-10 text-center bg-gray-50 font-bold whitespace-nowrap">TOT. SCO</th>
                                            <th className="border border-black px-1 py-0.5 w-10 text-center bg-gray-50">AVG</th>
                                            <th className="border border-black px-1 py-0.5 w-10 text-center bg-gray-200">AGG</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {pageStudents.map((student, idx) => (
                                            <tr key={student.id}>
                                                <td className="border border-black px-1 py-0.5 text-center">{pageIndex * STUDENTS_PER_PAGE + idx + 1}</td>
                                                <td className="border border-black px-1 py-0.5 font-medium uppercase whitespace-nowrap px-2 truncate max-w-[150px]">{student.fullname}</td>
                                                {subjects.map(s => {
                                                    const scoreVal = student.scores[s.id] ? parseInt(student.scores[s.id]) : null;
                                                    const grade = scoreVal !== null ? getGradeValue(scoreVal) : null;
                                                    return (
                                                        <td key={s.id} className="border border-black px-1 py-0.5 text-center">
                                                            {scoreVal !== null ? (
                                                                <span className="inline-flex items-baseline gap-0.5">
                                                                    <span>{scoreVal}</span>
                                                                    <sup className="text-[9px] font-bold text-gray-700">{grade}</sup>
                                                                </span>
                                                            ) : '-'}
                                                        </td>
                                                    )
                                                })}
                                                <td className="border border-black px-1 py-0.5 text-center font-bold bg-gray-50">{student.totalScore}</td>
                                                <td className="border border-black px-1 py-0.5 text-center font-bold">{student.average.toFixed(1)}</td>
                                                <td className="border border-black px-1 py-0.5 text-center font-bold bg-gray-100">{student.aggregate}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            
                            <div className="mt-2 text-[10px] flex justify-between items-center text-gray-500">
                                <span>Page {pageIndex + 1} of {pages.length}</span>
                                <span>Generated on: {new Date().toLocaleDateString('en-GB')}</span>
                            </div>
                        </div>
                    ));
                 })()}
             </div>
        )}
        
        <style jsx global>{`
           @media print {
               @page { size: landscape; margin: 5mm; }
               body { background: white; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
               .no-print { display: none; }
               .page-container { break-inside: avoid; page-break-after: always; break-after: page; }
               .page-container:last-child { page-break-after: auto; break-after: auto; }
           }
        `}</style>
    </div>
  )
}
