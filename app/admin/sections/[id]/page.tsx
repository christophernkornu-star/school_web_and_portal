'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft, Users, Search, X, Palette, Shield, Printer } from 'lucide-react'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'
import { SectionBadge } from '@/components/sections/SectionBadge'
import { Skeleton } from '@/components/ui/skeleton'
import { useAdmin } from '@/components/providers/AdminContext'

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

export default function SectionStudentsPage() {
  const router = useRouter()
  const params = useParams()
  const supabase = getSupabaseBrowserClient()
  const { user, loading: contextLoading } = useAdmin()

  const [section, setSection] = useState<Section | null>(null)
  const [students, setStudents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Filters
  const [filterClass, setFilterClass] = useState('all')
  const [filterGender, setFilterGender] = useState('all')

  useEffect(() => {
    if (!contextLoading && !user) {
      router.push('/login?portal=admin')
      return
    }
    if (contextLoading || !user) return

    const sectionId = params.id as string
    if (!sectionId) return

    loadData(sectionId)
  }, [params.id, user, contextLoading])

  async function loadData(sectionId: string) {
    setLoading(true)
    try {
      // Load section details
      const { data: sectionData } = await supabase
        .from('sections')
        .select('*')
        .eq('id', sectionId)
        .single()

      if (sectionData) setSection(sectionData)

      // Load students in this section
      const { data: ssData } = await supabase
        .from('student_sections')
        .select('student_id')
        .eq('section_id', sectionId)

      if (ssData && ssData.length > 0) {
        const studentIds = ssData.map((s: { student_id: string }) => s.student_id)
        const { data: studentsData } = await supabase
          .from('students')
          .select(`
            id, first_name, middle_name, last_name, student_id, gender, date_of_birth,
            classes(id, name, level)
          `)
          .in('id', studentIds)
          .eq('status', 'active')
          .order('last_name')

        setStudents(studentsData || [])
      }
    } catch (e) {
      console.error(e)
    }
    setLoading(false)
  }

  const filteredStudents = students.filter((student: any) => {
    if (filterClass !== 'all' && student.classes?.name !== filterClass) return false
    if (filterGender !== 'all' && student.gender?.toLowerCase() !== filterGender) return false
    return true
  })

  // Get unique classes for filter dropdown
  const uniqueClasses = [...new Set(students.map((s: any) => s.classes?.name).filter(Boolean))].sort()

  // Group by class
  const grouped: Record<string, any[]> = {}
  filteredStudents.forEach((student: any) => {
    const className = student.classes?.name || 'Unassigned'
    if (!grouped[className]) grouped[className] = []
    grouped[className].push(student)
  })

  const handlePrint = () => {
    const sectionName = section?.name || 'Section'
    const sectionColour = section?.colour || '#8B5CF6'
    const totalStudents = filteredStudents.length
    const dateStr = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })

    let tableHtml = ''
    for (const [className, students] of Object.entries(grouped).sort(([a],[b]) => a.localeCompare(b))) {
      tableHtml += `<div class="class-header">${className} <span>(${students.length})</span></div>`
      tableHtml += `<table><thead><tr><th>#</th><th>Student ID</th><th>Full Name</th><th>Gender</th></tr></thead><tbody>`
      for (let i = 0; i < students.length; i++) {
        const s = students[i]
        const name = [s.first_name, s.middle_name, s.last_name].filter(Boolean).join(' ')
        tableHtml += `<tr><td>${i + 1}</td><td style="font-family:monospace;font-size:11px">${s.student_id || '&mdash;'}</td><td>${name}</td><td>${s.gender || '&mdash;'}</td></tr>`
      }
      tableHtml += `</tbody></table>`
    }

    const printWindow = window.open('', '_blank', 'width=900,height=700')
    if (!printWindow) return
    printWindow.document.write(
      '<!DOCTYPE html><html><head><title>' + sectionName + ' - Section Report</title><style>' +
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
      '<div class="footer">Generated by Biriwa Methodist \'C\' Basic School Portal &middot; Section: ' + sectionName + '</div>' +
      '</body></html>'
    )
    printWindow.document.close()
    printWindow.focus()
    setTimeout(function () { printWindow.print(); printWindow.close() }, 500)
  }

  if (contextLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
          <Skeleton className="h-10 w-1/3 mb-2" />
          <Skeleton className="h-5 w-1/2 mb-6" />
          <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map(i => (
              <Skeleton key={i} className="h-48 rounded-2xl" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (!section) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500">Section not found.</p>
          <button onClick={() => router.push('/admin/sections')} className="text-blue-600 hover:underline mt-2">
            Back to sections
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/admin/sections')}
              className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl transition-colors"
              title="Back to sections"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
            </button>
            <div className="flex items-center gap-3">
              <span
                className="w-6 h-6 rounded-full shadow-sm flex-shrink-0"
                style={{ backgroundColor: section.colour }}
              />
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                  {section.name}
                  <span className="text-sm font-normal text-gray-500 bg-gray-100 dark:bg-gray-700 px-2.5 py-0.5 rounded-full">
                    {students.length} student{students.length !== 1 ? 's' : ''}
                  </span>
                </h1>
                {section.description && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{section.description}</p>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors shadow-sm font-medium text-sm"
          >
            <Printer className="w-4 h-4" />
            Print Report
          </button>
        </div>

        {/* Filter Bar */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-100 dark:border-gray-700 shadow-sm">
          <div className="flex flex-wrap items-center gap-4">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Filter:</span>

            {/* Class Filter */}
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-500">Class</label>
              <select
                value={filterClass}
                onChange={e => setFilterClass(e.target.value)}
                className="text-sm border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-1.5 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-purple-500"
              >
                <option value="all">All Classes</option>
                {uniqueClasses.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* Gender Filter */}
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-500">Gender</label>
              <select
                value={filterGender}
                onChange={e => setFilterGender(e.target.value)}
                className="text-sm border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-1.5 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-purple-500"
              >
                <option value="all">All</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </div>

            <span className="text-xs text-gray-400 ml-auto">
              {filteredStudents.length} of {students.length} shown
            </span>
          </div>
        </div>

        {/* Students List */}
        {filteredStudents.length === 0 ? (
          <div className="text-center py-20">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-12 border border-dashed border-gray-200 dark:border-gray-700 max-w-lg mx-auto">
              <Users className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-200 mb-2">
                {students.length === 0 ? 'No students assigned' : 'No students match filters'}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                {students.length === 0
                  ? 'Use "Distribute Remaining" on the sections page to auto-assign students.'
                  : 'Try adjusting your filter criteria.'}
              </p>
              {students.length > 0 && (
                <button
                  onClick={() => { setFilterClass('all'); setFilterGender('all') }}
                  className="text-sm text-blue-600 hover:underline"
                >
                  Clear filters
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(grouped)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([className, classStudents]) => (
                <div key={className} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex items-center gap-2">
                    <Shield className="w-4 h-4 text-purple-500" />
                    <h3 className="font-bold text-gray-800 dark:text-gray-200 text-sm">{className}</h3>
                    <span className="text-xs text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full">
                      {classStudents.length}
                    </span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-100 dark:border-gray-700">
                          <th className="text-left px-6 py-3 font-semibold text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider w-12">#</th>
                          <th className="text-left px-6 py-3 font-semibold text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">Student ID</th>
                          <th className="text-left px-6 py-3 font-semibold text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">Full Name</th>
                          <th className="text-left px-6 py-3 font-semibold text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">Gender</th>
                        </tr>
                      </thead>
                      <tbody>
                        {classStudents.map((student: any, idx: number) => (
                          <tr key={student.id} className="border-b border-gray-50 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                            <td className="px-6 py-3 text-gray-400 text-xs">{idx + 1}</td>
                            <td className="px-6 py-3 font-mono text-xs text-gray-500 dark:text-gray-400">
                              {student.student_id || '—'}
                            </td>
                            <td className="px-6 py-3">
                              <span className="font-medium text-gray-900 dark:text-white">
                                {[student.first_name, student.middle_name, student.last_name].filter(Boolean).join(' ')}
                              </span>
                            </td>
                            <td className="px-6 py-3">
                              <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
                                student.gender === 'Male'
                                  ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300'
                                  : student.gender === 'Female'
                                  ? 'bg-pink-50 text-pink-700 dark:bg-pink-900/20 dark:text-pink-300'
                                  : 'bg-gray-100 text-gray-500'
                              }`}>
                                {student.gender || '—'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
          </div>
        )}

      </div>
    </div>
  )
}
