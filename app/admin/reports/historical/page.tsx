'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Search, FileText, Loader2, Archive, Users, RotateCcw, X } from 'lucide-react'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'
import { resolveActiveAcademicYear, isPastYear } from '@/lib/academic-year'
import { Skeleton } from '@/components/ui/skeleton'
import BackButton from '@/components/ui/back-button'
import { toast } from 'react-hot-toast'

interface ClassItem { id: string; name: string }
interface TermItem { id: string; name: string; academic_year: string }

export default function AdminHistoricalReportsPage() {
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()
  const [loading, setLoading] = useState(true)
  const [loadingRoster, setLoadingRoster] = useState(false)
  const [classes, setClasses] = useState<ClassItem[]>([])
  const [selectedClass, setSelectedClass] = useState('')

  // Grouped terms by academic year for a clean "Year > Term" drill-down
  const [years, setYears] = useState<string[]>([])
  const [selectedYear, setSelectedYear] = useState('')
  const [terms, setTerms] = useState<TermItem[]>([])
  const [selectedTerm, setSelectedTerm] = useState('')

  const [roster, setRoster] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [reactivateModal, setReactivateModal] = useState<{ show: boolean; student: any | null }>({ show: false, student: null })
  const [reactivating, setReactivating] = useState(false)

  // Load classes + academic years (from academic_terms)
  useEffect(() => {
    async function init() {
      const user = await supabase.auth.getUser()
      if (!user.data?.user) { router.push('/login?portal=admin'); return }

      const [clsRes, termRes] = await Promise.all([
        supabase.from('classes').select('id, name').order('name'),
        supabase.from('academic_terms').select('name, academic_year').order('academic_year', { ascending: false })
      ])
      setClasses(clsRes.data || [])

      // PAST years only — exclude the current/active academic year from the
      // historical drill-down (historical browsing should not show the live session).
      const activeYear = await resolveActiveAcademicYear(supabase)

      const yearSet: string[] = Array.from(
        new Set<string>((termRes.data || []).map((t: any) => String(t.academic_year)))
      ).filter((y) => isPastYear(y, activeYear))
      setYears(yearSet)

      if (clsRes.data?.length) setSelectedClass(clsRes.data[0].id)
      if (yearSet.length) setSelectedYear(yearSet[0])

      setLoading(false)
    }
    init()
  }, [supabase, router])

  // Load terms for the selected year
  useEffect(() => {
    async function loadTermsForYear() {
      if (!selectedYear) { setTerms([]); setSelectedTerm(''); return }
      const { data } = await supabase
        .from('academic_terms')
        .select('id, name, academic_year')
        .eq('academic_year', selectedYear)
        .order('name')
      setTerms(data || [])
      const current = data?.find((t: any) => t.is_current)
      setSelectedTerm(current?.id || data?.[0]?.id || '')
    }
    loadTermsForYear()
  }, [supabase, selectedYear])

  // Load the roster based on class + term. We find students who actually have
  // scores for this class + term (via scored class_id) so we capture everyone who
  // was in that class that term — including graduated & transferred students.
  useEffect(() => {
    async function loadRoster() {
      if (!selectedClass || !selectedTerm) { setRoster([]); return }
      setLoadingRoster(true)
      try {
        // Distinct students who have scores in this class for this term
        const { data, error } = await supabase
          .from('scores')
          .select('student_id, students(first_name, middle_name, last_name, student_id, gender, status, graduated_at)')
          .eq('class_id', selectedClass)
          .eq('term_id', selectedTerm)

        if (error) throw error

        // De-duplicate by student_id
        const map = new Map()
        ;(data || []).forEach((row: any) => {
          const s = row.students
          if (!s) return
          if (!map.has(row.student_id)) {
            map.set(row.student_id, {
              id: row.student_id,
              first_name: s.first_name,
              middle_name: s.middle_name,
              last_name: s.last_name,
              student_id: s.student_id,
              gender: s.gender,
              status: s.status,
              graduated_at: s.graduated_at,
            })
          }
        })

        const list = Array.from(map.values())
          .sort((a: any, b: any) => (a.last_name || '').localeCompare(b.last_name || ''))

        setRoster(list)
      } catch (e: any) {
        console.error('Error loading historical roster:', e)
        toast.error('Failed to load roster')
        setRoster([])
      } finally {
        setLoadingRoster(false)
      }
    }
    loadRoster()
  }, [supabase, selectedClass, selectedTerm])

  const selectedTermInfo = terms.find(t => t.id === selectedTerm)

  const filteredRoster = roster.filter((st: any) => {
    const q = searchTerm.toLowerCase()
    return (st.last_name || '').toLowerCase().includes(q) ||
           (st.first_name || '').toLowerCase().includes(q) ||
           (st.student_id || '').toLowerCase().includes(q)
  })

  // Re-activate a previously graduated/transferred/inactive student while keeping all
  // their historical records intact (soft re-enrolment, no data loss).
  async function handleReactivate() {
    if (!reactivateModal.student) return
    setReactivating(true)
    try {
      const updates: any = { status: 'active' }
      // If the student was marked graduated, clear the graduation timestamp on return.
      if (reactivateModal.student.status === 'graduated') {
        updates.graduated_at = null
      }
      const { error } = await supabase
        .from('students')
        .update(updates)
        .eq('id', reactivateModal.student.id)
      if (error) throw error

      toast.success('Student re-activated with historical records intact')
      // Remove from current (historical) roster view
      setRoster(roster.filter((s: any) => s.id !== reactivateModal.student.id))
      setReactivateModal({ show: false, student: null })
    } catch (e: any) {
      console.error('Error reactivating student:', e)
      toast.error('Failed to re-activate student: ' + e.message)
    } finally {
      setReactivating(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center mb-6">
          <BackButton href="/admin/reports" />
          <div className="ml-4">
            <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              <Archive className="w-6 h-6 text-purple-600" />
              Historical Reports
            </h1>
            <p className="text-gray-600">Browse past term reports by class, including graduated students</p>
          </div>
        </div>

        {/* Filters: Class + Academic Year + Term */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Class</label>
              <div className="relative">
                <select
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                  className="w-full p-2 border rounded-lg appearance-none bg-white focus:ring-2 focus:ring-purple-500 outline-none"
                >
                  <option value="">Select class</option>
                  {classes.map(cls => (
                    <option key={cls.id} value={cls.id}>{cls.name}</option>
                  ))}
                </select>
                <Users className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Academic Year</label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="w-full p-2 border rounded-lg appearance-none bg-white focus:ring-2 focus:ring-purple-500 outline-none"
              >
                <option value="">Select year</option>
                {years.map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Term</label>
              <select
                value={selectedTerm}
                onChange={(e) => setSelectedTerm(e.target.value)}
                className="w-full p-2 border rounded-lg appearance-none bg-white focus:ring-2 focus:ring-purple-500 outline-none"
              >
                <option value="">Select term</option>
                {terms.map(t => (
                  <option key={t.id} value={t.id}>{t.name} ({t.academic_year})</option>
                ))}
              </select>
            </div>
          </div>

          {/* Search */}
          <div className="mt-4">
            <div className="relative max-w-md">
              <input
                type="text"
                placeholder="Search student name or ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full p-2 pl-10 border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Roster */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="font-semibold text-gray-800">
              Students in {classes.find(c => c.id === selectedClass)?.name || 'class'}
              {selectedTermInfo ? ` — ${selectedTermInfo.name} ${selectedYear}` : ''}
            </h2>
            <span className="text-sm text-gray-500">{roster.length} student{roster.length === 1 ? '' : 's'}</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Gender</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Report</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {loading || loadingRoster ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i}>
                      <td className="px-6 py-4">
                        <Skeleton className="h-4 w-48" />
                      </td>
                      <td className="px-6 py-4 text-center"><Skeleton className="h-4 w-12 mx-auto" /></td>
                      <td className="px-6 py-4 text-center"><Skeleton className="h-5 w-16 mx-auto rounded-full" /></td>
                      <td className="px-6 py-4 text-right"><Skeleton className="h-8 w-24 ml-auto rounded" /></td>
                    </tr>
                  ))
                ) : filteredRoster.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center">
                      {selectedClass && selectedTerm
                        ? <p className="text-gray-500">No students have scores recorded for this class &amp; term yet.</p>
                        : <p className="text-gray-500">Select a class, year, and term to view the historical roster.</p>}
                    </td>
                  </tr>
                ) : (
                  filteredRoster.map((st: any) => (
                    <tr key={st.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {[st.last_name, st.middle_name, st.first_name].filter(Boolean).join(', ')}
                        </div>
                        <div className="text-sm text-gray-500">{st.student_id}</div>
                      </td>
                      <td className="px-6 py-4 text-center text-sm text-gray-500">{st.gender}</td>
                      <td className="px-6 py-4 text-center">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                          st.status === 'graduated' ? 'bg-purple-100 text-purple-800'
                          : st.status === 'transferred' ? 'bg-yellow-100 text-yellow-800'
                          : st.status === 'inactive' ? 'bg-gray-100 text-gray-700'
                          : 'bg-green-100 text-green-800'
                        }`}>
                          {st.status === 'graduated' ? 'Graduated' : st.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/admin/reports/student/${st.id}?term=${selectedTerm}&class=${selectedClass}`}
                            className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-purple-700 bg-purple-100 hover:bg-purple-200"
                          >
                            <FileText className="w-4 h-4 mr-1" />
                            View Report
                          </Link>
                          {st.status !== 'active' && (
                            <button
                              onClick={() => setReactivateModal({ show: true, student: st })}
                              className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-emerald-700 bg-emerald-100 hover:bg-emerald-200"
                              title="Re-activate this student (keeps historical records)"
                            >
                              <RotateCcw className="w-4 h-4 mr-1" />
                              Re-activate
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Re-activate Confirmation Modal */}
      {reactivateModal.show && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="bg-emerald-100 p-2 rounded-full">
                  <RotateCcw className="w-5 h-5 text-emerald-600" />
                </div>
                <h3 className="text-lg font-bold text-gray-900">Re-activate Student</h3>
              </div>
              <button onClick={() => setReactivateModal({ show: false, student: null })} className="p-1 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <p className="text-gray-600 mb-2 text-sm">
              Re-activate <span className="font-semibold text-gray-900">{reactivateModal.student?.last_name} {reactivateModal.student?.first_name}</span> (currently <span className="font-semibold">{reactivateModal.student?.status}</span>)?
            </p>
            <p className="text-gray-500 mb-6 text-sm">
              The student will return to the active roster and reappear in classes. <strong>All historical scores,
              remarks, and promotion records are preserved.</strong> They will need to be assigned to a current class to
              appear on active year reports.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setReactivateModal({ show: false, student: null })}
                disabled={reactivating}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleReactivate}
                disabled={reactivating}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-2 text-sm"
              >
                {reactivating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Re-activating...
                  </>
                ) : (
                  <>
                    <RotateCcw className="w-4 h-4" />
                    Re-activate
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
