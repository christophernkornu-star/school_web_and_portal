'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Palette, Users, Printer, Shield
} from 'lucide-react'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'
import { getCurrentUser, getTeacherData } from '@/lib/auth'
import { getTeacherClassAccess } from '@/lib/teacher-permissions'
import { SectionBadge } from '@/components/sections/SectionBadge'
import { Skeleton } from '@/components/ui/skeleton'

interface Section {
  id: string
  name: string
  colour: string
  emblem_url: string | null
  description: string | null
  is_active: boolean
  sort_order: number
  student_count?: number
  created_at: string
}

interface StudentInfo {
  id: string
  first_name: string
  middle_name: string | null
  last_name: string
  student_id: string | null
  gender: string | null
  classes: { id: string; name: string; level: number } | null
}

export default function TeacherSectionsPage() {
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()
  const [sections, setSections] = useState<Section[]>([])
  const [loading, setLoading] = useState(true)
  const [teacherClassIds, setTeacherClassIds] = useState<string[]>([])
  const [teacherClassName, setTeacherClassName] = useState<string>('')

  // Section members modal
  const [selectedSection, setSelectedSection] = useState<Section | null>(null)
  const [sectionStudents, setSectionStudents] = useState<StudentInfo[]>([])
  const [loadingStudents, setLoadingStudents] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    try {
      // Get teacher info
      const user = await getCurrentUser()
      if (!user) {
        router.push('/login?portal=teacher')
        return
      }

      const teacherData = await getTeacherData(user.id)
      if (!teacherData) {
        router.push('/login?portal=teacher')
        return
      }

      // Get teacher's class access
      const classAccess = await getTeacherClassAccess(user.id)
      if (classAccess && classAccess.length > 0) {
        setTeacherClassIds(classAccess.map((c: { class_id: string }) => c.class_id))
        setTeacherClassName(classAccess[0].class_name || '')
      }

      // Load all active sections
      const { data: sectionsData } = await supabase
        .from('sections')
        .select('*')
        .eq('is_active', true)
        .order('sort_order')
        .order('name')

      if (sectionsData) {
        // Get student counts for each section (only active students)
        const sectionsWithCounts = await Promise.all(
          sectionsData.map(async (sec: Section) => {
            const { data: ssData } = await supabase
              .from('student_sections')
              .select('student_id')
              .eq('section_id', sec.id)

            let activeCount = 0
            if (ssData && ssData.length > 0) {
              const studentIds = ssData.map((s: { student_id: string }) => s.student_id)
              let countQuery = supabase
                .from('students')
                .select('id', { count: 'exact', head: true })
                .in('id', studentIds)
                .eq('status', 'active')

              // Only count students from the teacher's own classes
              if (teacherClassIds.length > 0) {
                countQuery = countQuery.in('class_id', teacherClassIds)
              }

              const { count } = await countQuery
              activeCount = count || 0
            }
            return { ...sec, student_count: activeCount }
          })
        )
        setSections(sectionsWithCounts)
      }
    } catch (e) {
      console.error('Error loading sections:', e)
    }
    setLoading(false)
  }

  async function viewSectionMembers(section: Section) {
    setSelectedSection(section)
    setLoadingStudents(true)
    setSectionStudents([])

    try {
      const { data: ssData } = await supabase
        .from('student_sections')
        .select('student_id')
        .eq('section_id', section.id)

      if (ssData && ssData.length > 0) {
        const studentIds = ssData.map((s: { student_id: string }) => s.student_id)
        let queryBuilder = supabase
          .from('students')
          .select(`
            id, first_name, middle_name, last_name, student_id, gender,
            classes(id, name, level)
          `)
          .in('id', studentIds)
          .eq('status', 'active')
          .order('last_name')

        // Filter by teacher's classes if they have class access
        if (teacherClassIds.length > 0) {
          queryBuilder = queryBuilder.in('class_id', teacherClassIds)
        }

        const { data: studentsData } = await queryBuilder
        setSectionStudents(studentsData || [])
      }
    } catch (e) {
      console.error('Error loading students:', e)
    }
    setLoadingStudents(false)
  }

  function handlePrintMembers(section: Section, students: StudentInfo[]) {
    const sectionName = section.name
    const sectionColour = section.colour
    const totalStudents = students.length
    const dateStr = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })

    // Group by class
    const grouped: Record<string, StudentInfo[]> = {}
    students.forEach((student) => {
      const className = student.classes?.name || 'Unassigned'
      if (!grouped[className]) grouped[className] = []
      grouped[className].push(student)
    })

    let tableHtml = ''
    for (const [className, classStudents] of Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b))) {
      tableHtml += `<div class="class-header">${className} <span>(${classStudents.length})</span></div>`
      tableHtml += `<table><thead><tr><th>#</th><th>Student ID</th><th>Full Name</th><th>Gender</th></tr></thead><tbody>`
      for (let i = 0; i < classStudents.length; i++) {
        const s = classStudents[i]
        const name = [s.first_name, s.middle_name, s.last_name].filter(Boolean).join(' ')
        tableHtml += `<tr><td>${i + 1}</td><td style="font-family:monospace;font-size:11px">${s.student_id || '&mdash;'}</td><td>${name}</td><td>${s.gender || '&mdash;'}</td></tr>`
      }
      tableHtml += `</tbody></table>`
    }

    const printWindow = window.open('', '_blank', 'width=900,height=700')
    if (!printWindow) return
    printWindow.document.write(
      '<!DOCTYPE html><html><head><title>' + sectionName + ' - Section Members</title><style>' +
      '@page { margin: 15mm 20mm; size: A4 portrait; }' +
      '* { margin: 0; padding: 0; box-sizing: border-box; }' +
      'body { font-family: Segoe UI, Arial, sans-serif; color: #222; background: white; }' +
      '.print-header { text-align: center; padding-bottom: 16px; border-bottom: 3px double #1e3a5f; margin-bottom: 8px; }' +
      '.print-header h1 { font-size: 20px; font-weight: 800; color: #1e3a5f; letter-spacing: 1.5px; text-transform: uppercase; margin-bottom: 2px; }' +
      '.print-header .subtitle { font-size: 11px; color: #666; }' +
      '.print-section-title { text-align: center; font-size: 16px; font-weight: 700; color: #333; padding: 12px 0 4px; }' +
      '.print-section-title .dot { display: inline-block; width: 10px; height: 10px; border-radius: 50%; margin-right: 6px; vertical-align: middle; }' +
      '.print-meta { text-align: center; font-size: 11px; color: #888; margin-bottom: 20px; }' +
      'table { width: 100%; border-collapse: collapse; margin-bottom: 18px; }' +
      'thead { display: table-header-group; }' +
      'th { background: #f0f0f0; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; color: #555; padding: 8px 10px; text-align: left; border: 1px solid #ccc; font-weight: 700; }' +
      'td { padding: 6px 10px; border: 1px solid #ddd; font-size: 12px; }' +
      'tr:nth-child(even) { background: #fafafa; }' +
      '.class-header { font-size: 13px; font-weight: 700; color: #1e3a5f; padding: 16px 0 6px; border-bottom: 2px solid #1e3a5f; margin-bottom: 8px; margin-top: 12px; }' +
      '.class-header span { font-weight: 400; color: #888; font-size: 11px; }' +
      '.footer { text-align: center; font-size: 10px; color: #aaa; border-top: 1px solid #ddd; padding-top: 12px; margin-top: 20px; }' +
      '</style></head><body>' +
      '<div class="print-header"><h1>Biriwa Methodist \'C\' Basic School</h1><div class="subtitle">Section Members Report</div></div>' +
      '<div class="print-section-title"><span class="dot" style="background:' + sectionColour + '"></span>' + sectionName + '</div>' +
      '<div class="print-meta">Total: ' + totalStudents + ' student' + (totalStudents !== 1 ? 's' : '') + ' &middot; ' + dateStr + '</div>' +
      tableHtml +
      '<div class="footer">Generated by Biriwa Methodist \'C\' Basic School Portal &middot; Teacher: ' + (teacherClassName || 'Class Teacher') + '</div>' +
      '</body></html>'
    )
    printWindow.document.close()
    printWindow.focus()
    setTimeout(function () { printWindow.print(); printWindow.close() }, 500)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6 space-y-6">
        <Skeleton className="h-10 w-1/3 mb-2" />
        <Skeleton className="h-5 w-1/2 mb-6" />
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-48 rounded-2xl" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
              <Palette className="w-7 h-7 text-purple-600" />
              School Sections
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              View student sections/houses and print member lists
              {teacherClassName && (
                <span className="ml-2 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full">
                  {teacherClassName}
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Stats Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700 shadow-sm">
            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider font-medium">Total Sections</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{sections.length}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700 shadow-sm">
            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider font-medium">Total Students</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
              {sections.reduce((sum, s) => sum + (s.student_count || 0), 0)}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700 shadow-sm">
            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider font-medium">Avg Per Section</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
              {sections.length > 0
                ? Math.round(sections.reduce((sum, s) => sum + (s.student_count || 0), 0) / sections.length)
                : 0}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700 shadow-sm">
            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider font-medium">Largest Section</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
              {sections.length > 0 ? Math.max(...sections.map(s => s.student_count || 0)) : 0}
            </p>
          </div>
        </div>

        {/* Sections Grid */}
        {sections.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {sections.map((section) => (
              <div
                key={section.id}
                className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 
                           shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 overflow-hidden"
              >
                {/* Colour header */}
                <div className="h-2.5 w-full" style={{ backgroundColor: section.colour }} />

                <div className="p-5">
                  {/* Section name */}
                  <div className="flex items-center justify-between mb-4">
                    <SectionBadge
                      section={section}
                      size="lg"
                      className="text-base font-bold"
                    />
                  </div>

                  {/* Description */}
                  {section.description && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-4 line-clamp-2">
                      {section.description}
                    </p>
                  )}

                  {/* Stats */}
                  <div className="flex items-center justify-between pt-3 border-t border-gray-50 dark:border-gray-700/50 mb-4">
                    <div className="flex items-center gap-2 text-sm">
                      <Users className="w-4 h-4 text-gray-400" />
                      <span className="font-semibold text-gray-700 dark:text-gray-300">
                        {section.student_count || 0}
                      </span>
                      <span className="text-gray-400">students</span>
                    </div>
                  </div>

                  {/* View & Print Buttons */}
                  <button
                    onClick={() => viewSectionMembers(section)}
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 
                               bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl
                               hover:shadow-lg hover:shadow-purple-500/25 hover:-translate-y-0.5 
                               transition-all font-medium text-sm shadow-md"
                  >
                    <Users className="w-4 h-4" />
                    View Members
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-12 border border-dashed border-gray-200 dark:border-gray-700 max-w-lg mx-auto">
              <Palette className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-200 mb-2">No Sections Available</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                No sections have been created yet. Contact the school administrator to set up sections.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Section Members Modal */}
      {selectedSection && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-start sm:items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-2xl w-full shadow-2xl my-8 max-h-[85vh] flex flex-col">
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-3">
                <span
                  className="w-4 h-4 rounded-full shadow-sm flex-shrink-0"
                  style={{ backgroundColor: selectedSection.colour }}
                />
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                    {selectedSection.name}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {sectionStudents.length} active student{sectionStudents.length !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {sectionStudents.length > 0 && (
                  <button
                    onClick={() => handlePrintMembers(selectedSection, sectionStudents)}
                    className="inline-flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors text-sm font-medium"
                  >
                    <Printer className="w-4 h-4" />
                    Print
                  </button>
                )}
                <button
                  onClick={() => { setSelectedSection(null); setSectionStudents([]); }}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6">
              {loadingStudents ? (
                <div className="space-y-4">
                  {[1, 2, 3].map(i => (
                    <Skeleton key={i} className="h-16 rounded-xl" />
                  ))}
                </div>
              ) : sectionStudents.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-500 dark:text-gray-400">No active students assigned to this section.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Group by class */}
                  {(() => {
                    const grouped: Record<string, StudentInfo[]> = {}
                    sectionStudents.forEach((student) => {
                      const className = student.classes?.name || 'Unassigned'
                      if (!grouped[className]) grouped[className] = []
                      grouped[className].push(student)
                    })

                    return Object.entries(grouped)
                      .sort(([a], [b]) => a.localeCompare(b))
                      .map(([className, classStudents]) => (
                        <div key={className} className="bg-gray-50 dark:bg-gray-900/50 rounded-xl overflow-hidden">
                          <div className="px-4 py-3 bg-gray-100 dark:bg-gray-800 flex items-center gap-2">
                            <Shield className="w-4 h-4 text-purple-500" />
                            <h4 className="font-bold text-gray-800 dark:text-gray-200 text-sm">{className}</h4>
                            <span className="text-xs text-gray-400 bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded-full">
                              {classStudents.length}
                            </span>
                          </div>
                          <div className="divide-y divide-gray-100 dark:divide-gray-800">
                            {classStudents.map((student, idx) => (
                              <div key={student.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-white dark:hover:bg-gray-800/50 transition-colors">
                                <span className="text-xs text-gray-400 w-6 flex-shrink-0">{idx + 1}.</span>
                                <div className="min-w-0 flex-1">
                                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                    {[student.first_name, student.middle_name, student.last_name].filter(Boolean).join(' ')}
                                  </p>
                                  <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                                    {student.student_id || '\u2014'}
                                  </p>
                                </div>
                                {student.gender && (
                                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${
                                    student.gender === 'Male'
                                      ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300'
                                      : student.gender === 'Female'
                                      ? 'bg-pink-50 text-pink-700 dark:bg-pink-900/20 dark:text-pink-300'
                                      : 'bg-gray-100 text-gray-500'
                                  }`}>
                                    {student.gender}
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))
                  })()}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between flex-shrink-0 bg-gray-50 dark:bg-gray-800/50">
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {sectionStudents.length} student{sectionStudents.length !== 1 ? 's' : ''} total
              </span>
              {sectionStudents.length > 0 && (
                <button
                  onClick={() => handlePrintMembers(selectedSection, sectionStudents)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors text-sm font-medium"
                >
                  <Printer className="w-4 h-4" />
                  Print List
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
