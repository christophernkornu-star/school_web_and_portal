'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Palette,
  Users,
  Printer,
  Shield,
  X,
  ArrowLeft,
  Loader2
} from 'lucide-react'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'
import { getCurrentUser, getTeacherData } from '@/lib/auth'
import { getTeacherClassAccess } from '@/lib/teacher-permissions'
import { SectionBadge } from '@/components/sections/SectionBadge'
import { Skeleton } from '@/components/ui/skeleton'
import BackButton from '@/components/ui/back-button'

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
      const user = await getCurrentUser()
      if (!user) {
        router.push('/login?portal=teacher')
        return
      }

      const { data: teacherData, error: teacherError } = await getTeacherData(user.id)
      if (teacherError || !teacherData) {
        router.push('/login?portal=teacher')
        return
      }

      // Get teacher's class access
      const classAccess = await getTeacherClassAccess(teacherData.profile_id || user.id)
      let resolvedClassIds: string[] = []
      if (classAccess && classAccess.length > 0) {
        resolvedClassIds = classAccess.map((c: { class_id: string }) => c.class_id)
        setTeacherClassIds(resolvedClassIds)
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
        // Query active students counted within teacher's scope
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

              if (resolvedClassIds.length > 0) {
                countQuery = countQuery.in('class_id', resolvedClassIds)
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

        if (teacherClassIds.length > 0) {
          queryBuilder = queryBuilder.in('class_id', teacherClassIds)
        }

        const { data: studentsData } = await queryBuilder
        setSectionStudents((studentsData || []) as unknown as StudentInfo[])
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
      '.print-header { text-align: center; padding-bottom: 16px; border-bottom: 3px double #003B5C; margin-bottom: 8px; }' +
      '.print-header h1 { font-size: 20px; font-weight: 800; color: #003B5C; letter-spacing: 1.5px; text-transform: uppercase; margin-bottom: 2px; }' +
      '.print-header .subtitle { font-size: 11px; color: #666; }' +
      '.print-section-title { text-align: center; font-size: 16px; font-weight: 700; color: #333; padding: 12px 0 4px; }' +
      '.print-section-title .dot { display: inline-block; width: 10px; height: 10px; border-radius: 50%; margin-right: 6px; vertical-align: middle; }' +
      '.print-meta { text-align: center; font-size: 11px; color: #888; margin-bottom: 20px; }' +
      'table { width: 100%; border-collapse: collapse; margin-bottom: 18px; }' +
      'thead { display: table-header-group; }' +
      'th { background: #f0f0f0; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; color: #555; padding: 8px 10px; text-align: left; border: 1px solid #ccc; font-weight: 700; }' +
      'td { padding: 6px 10px; border: 1px solid #ddd; font-size: 12px; }' +
      'tr:nth-child(even) { background: #fafafa; }' +
      '.class-header { font-size: 13px; font-weight: 700; color: #003B5C; padding: 16px 0 6px; border-bottom: 2px solid #003B5C; margin-bottom: 8px; margin-top: 12px; }' +
      '.class-header span { font-weight: 400; color: #888; font-size: 11px; }' +
      '.footer { text-align: center; font-size: 10px; color: #aaa; border-top: 1px solid #ddd; padding-top: 12px; margin-top: 20px; }' +
      '</style></head><body>' +
      '<div class="print-header"><h1>School Portal</h1><div class="subtitle">Section Members Report</div></div>' +
      '<div class="print-section-title"><span class="dot" style="background:' + sectionColour + '"></span>' + sectionName + '</div>' +
      '<div class="print-meta">Total: ' + totalStudents + ' student' + (totalStudents !== 1 ? 's' : '') + ' &middot; ' + dateStr + '</div>' +
      tableHtml +
      '<div class="footer">Generated by Portal &middot; Class: ' + (teacherClassName || 'Assigned Cohort') + '</div>' +
      '</body></html>'
    )
    printWindow.document.close()
    printWindow.focus()
    setTimeout(function () { printWindow.print(); printWindow.close() }, 500)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50/50 dark:bg-gray-900 pb-20 p-4 sm:p-6 lg:p-8 space-y-6">
        <div className="max-w-[1400px] mx-auto space-y-6">
          <Skeleton className="h-28 w-full rounded-2xl sm:rounded-3xl" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-24 rounded-2xl" />
            ))}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-56 rounded-2xl" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  const totalAssignedStudents = sections.reduce((sum, s) => sum + (s.student_count || 0), 0)

  return (
    <div className="min-h-screen bg-gray-50/50 dark:bg-gray-900 pb-24 font-sans text-gray-900 dark:text-gray-100">
      <div className="max-w-[1400px] mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-5 sm:space-y-8">
        
        {/* Header Banner */}
        <div className="bg-white dark:bg-gray-800 p-4 sm:p-6 md:p-8 rounded-2xl sm:rounded-3xl shadow-sm border border-gray-200/80 dark:border-gray-700 flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative overflow-hidden">
          <div className="absolute right-0 top-0 w-64 h-full bg-gradient-to-l from-[#003B5C]/10 to-transparent pointer-events-none" />

          <div className="flex items-start sm:items-center gap-3 sm:gap-4 relative z-10">
            <BackButton href="/teacher/dashboard" className="shrink-0 mt-0.5 sm:mt-0 shadow-sm" />
            <div>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-gray-900 dark:text-white tracking-tight flex items-center gap-2.5">
                <Palette className="w-6 h-6 sm:w-8 sm:h-8 text-[#003B5C] dark:text-blue-400 shrink-0" />
                <span>School Sections</span>
              </h1>
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 font-medium mt-0.5 flex items-center gap-2 flex-wrap">
                <span>View house allocations and print section rosters</span>
                {teacherClassName && (
                  <span className="text-[11px] font-bold bg-[#003B5C]/10 dark:bg-[#003B5C]/30 text-[#003B5C] dark:text-blue-300 px-2.5 py-0.5 rounded-full border border-[#003B5C]/20">
                    {teacherClassName}
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 sm:p-5 border border-gray-200/80 dark:border-gray-700 shadow-sm flex flex-col justify-between">
            <p className="text-[10px] sm:text-xs text-gray-400 uppercase tracking-widest font-black">Active Houses</p>
            <p className="text-xl sm:text-2xl lg:text-3xl font-black text-gray-900 dark:text-white mt-1.5">{sections.length}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 sm:p-5 border border-gray-200/80 dark:border-gray-700 shadow-sm flex flex-col justify-between">
            <p className="text-[10px] sm:text-xs text-gray-400 uppercase tracking-widest font-black">Class Students</p>
            <p className="text-xl sm:text-2xl lg:text-3xl font-black text-emerald-600 dark:text-emerald-400 mt-1.5">
              {totalAssignedStudents}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 sm:p-5 border border-gray-200/80 dark:border-gray-700 shadow-sm flex flex-col justify-between">
            <p className="text-[10px] sm:text-xs text-gray-400 uppercase tracking-widest font-black">Avg Per House</p>
            <p className="text-xl sm:text-2xl lg:text-3xl font-black text-[#003B5C] dark:text-blue-400 mt-1.5">
              {sections.length > 0 ? Math.round(totalAssignedStudents / sections.length) : 0}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 sm:p-5 border border-gray-200/80 dark:border-gray-700 shadow-sm flex flex-col justify-between">
            <p className="text-[10px] sm:text-xs text-gray-400 uppercase tracking-widest font-black">Largest House</p>
            <p className="text-xl sm:text-2xl lg:text-3xl font-black text-gray-900 dark:text-white mt-1.5">
              {sections.length > 0 ? Math.max(...sections.map((s) => s.student_count || 0)) : 0}
            </p>
          </div>
        </div>

        {/* Sections Grid */}
        {sections.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5 md:gap-6">
            {sections.map((section) => (
              <div
                key={section.id}
                className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200/80 dark:border-gray-700 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col justify-between group"
              >
                <div>
                  <div className="h-2.5 w-full" style={{ backgroundColor: section.colour }} />

                  <div className="p-4 sm:p-5 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <SectionBadge
                        section={section}
                        size="lg"
                        className="text-sm sm:text-base font-bold truncate"
                      />
                    </div>

                    {section.description && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 leading-relaxed">
                        {section.description}
                      </p>
                    )}
                  </div>
                </div>

                <div className="p-4 sm:p-5 pt-0 space-y-3">
                  <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-700/60 text-xs text-gray-600 dark:text-gray-300">
                    <div className="flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-gray-400" />
                      <span className="font-bold text-gray-900 dark:text-white">{section.student_count || 0}</span>
                      <span className="text-gray-400">students</span>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md uppercase">
                      Active
                    </span>
                  </div>

                  <button
                    onClick={() => viewSectionMembers(section)}
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#003B5C] hover:bg-[#002a42] text-white rounded-xl font-bold text-xs sm:text-sm transition-all shadow-sm active:scale-95"
                  >
                    <Users className="w-4 h-4" />
                    <span>View Members</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-3xl p-10 sm:p-14 border border-dashed border-gray-200 dark:border-gray-700 max-w-lg mx-auto text-center space-y-3 shadow-sm">
            <Palette className="w-14 h-14 text-gray-300 dark:text-gray-600 mx-auto" />
            <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">No Sections Configured</h3>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
              Sections or houses have not been initialized yet. Contact your administrator to configure school houses.
            </p>
          </div>
        )}
      </div>

      {/* Section Members Modal */}
      {selectedSection && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-gray-800 rounded-t-3xl sm:rounded-3xl max-w-2xl w-full shadow-2xl max-h-[92vh] sm:max-h-[85vh] flex flex-col overflow-hidden border-t sm:border border-gray-100 dark:border-gray-700">
            
            {/* Modal Header */}
            <div className="p-4 sm:p-6 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between gap-3 shrink-0 bg-gray-50/70 dark:bg-gray-850">
              <div className="flex items-center gap-3 min-w-0">
                <span
                  className="w-4 h-4 rounded-full shadow-sm shrink-0"
                  style={{ backgroundColor: selectedSection.colour }}
                />
                <div className="min-w-0">
                  <h3 className="text-base sm:text-lg font-black text-gray-900 dark:text-white truncate">
                    {selectedSection.name}
                  </h3>
                  <p className="text-xs text-gray-400 font-medium">
                    {sectionStudents.length} learner{sectionStudents.length !== 1 ? 's' : ''} assigned
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {sectionStudents.length > 0 && (
                  <button
                    onClick={() => handlePrintMembers(selectedSection, sectionStudents)}
                    className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#003B5C] hover:bg-[#002a42] text-white rounded-xl text-xs font-bold transition shadow-sm"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Print</span>
                  </button>
                )}
                <button
                  onClick={() => {
                    setSelectedSection(null)
                    setSectionStudents([])
                  }}
                  className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition"
                  aria-label="Close modal"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 space-y-4">
              {loadingStudents ? (
                <div className="py-12 flex flex-col items-center justify-center space-y-3 text-gray-400">
                  <Loader2 className="w-8 h-8 animate-spin text-[#003B5C]" />
                  <p className="text-xs font-bold uppercase tracking-wider">Loading roster...</p>
                </div>
              ) : sectionStudents.length === 0 ? (
                <div className="text-center py-12 space-y-2">
                  <Users className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto" />
                  <p className="text-sm font-bold text-gray-800 dark:text-gray-200">No active students found</p>
                  <p className="text-xs text-gray-400">There are no learners from your class assigned to this house.</p>
                </div>
              ) : (
                <div className="space-y-4">
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
                        <div key={className} className="bg-gray-50/80 dark:bg-gray-900/50 rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-750 shadow-sm">
                          <div className="px-4 py-2.5 bg-gray-100/70 dark:bg-gray-800 flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <Shield className="w-3.5 h-3.5 text-[#003B5C] dark:text-blue-400" />
                              <h4 className="font-bold text-gray-900 dark:text-gray-100 text-xs sm:text-sm">{className}</h4>
                            </div>
                            <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-700 px-2 py-0.5 rounded-full border border-gray-200/60 dark:border-gray-600">
                              {classStudents.length}
                            </span>
                          </div>

                          <div className="divide-y divide-gray-100 dark:divide-gray-800">
                            {classStudents.map((student, idx) => (
                              <div
                                key={student.id}
                                className="flex items-center gap-3 px-3.5 sm:px-4 py-2.5 hover:bg-white dark:hover:bg-gray-800/40 transition-colors text-xs"
                              >
                                <span className="text-gray-400 w-5 text-right font-mono shrink-0">{idx + 1}.</span>
                                <div className="min-w-0 flex-1">
                                  <p className="font-bold text-gray-900 dark:text-white truncate">
                                    {[student.first_name, student.middle_name, student.last_name].filter(Boolean).join(' ')}
                                  </p>
                                  <p className="text-[11px] text-gray-400 font-mono">
                                    {student.student_id || '—'}
                                  </p>
                                </div>
                                {student.gender && (
                                  <span
                                    className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase shrink-0 ${
                                      student.gender.toLowerCase() === 'male'
                                        ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300'
                                        : student.gender.toLowerCase() === 'female'
                                        ? 'bg-pink-50 text-pink-700 dark:bg-pink-950/40 dark:text-pink-300'
                                        : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
                                    }`}
                                  >
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
            <div className="p-3.5 sm:p-4 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between gap-3 shrink-0 bg-gray-50/70 dark:bg-gray-850">
              <span className="text-xs font-bold text-gray-500 dark:text-gray-400">
                Total: {sectionStudents.length} learner{sectionStudents.length !== 1 ? 's' : ''}
              </span>
              {sectionStudents.length > 0 && (
                <button
                  onClick={() => handlePrintMembers(selectedSection, sectionStudents)}
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-[#003B5C] hover:bg-[#002a42] text-white rounded-xl font-bold text-xs shadow-sm transition active:scale-95"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Roster</span>
                </button>
              )}
            </div>

          </div>
        </div>
      )}
    </div>
  )
}