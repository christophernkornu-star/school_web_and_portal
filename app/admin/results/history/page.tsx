'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Search, User, Users, Calendar } from 'lucide-react'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'

export default function HistoricalRecordsPage() {
  const supabase = getSupabaseBrowserClient()
  const [activeTab, setActiveTab] = useState<'students' | 'teachers'>('students')
  const [loading, setLoading] = useState(true)
  
  // Filters
  const [academicYears, setAcademicYears] = useState<string[]>([])
  const [selectedYear, setSelectedYear] = useState('')
  const [selectedTerm, setSelectedTerm] = useState('')
  const [terms, setTerms] = useState<any[]>([])

  // Data
  const [records, setRecords] = useState<any[]>([])
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    loadFilterOptions()
  }, [])

  useEffect(() => {
    if (selectedYear) {
      loadRecords()
    } else {
      setRecords([])
    }
  }, [selectedYear, selectedTerm, activeTab])

  async function loadFilterOptions() {
    try {
      // Fetch distinct academic years from relevant tables or default settings
      // For now, we'll fetch from academic_terms
      const { data: termsData } = await supabase
        .from('academic_terms')
        .select('academic_year, name, id')
        .order('start_date', { ascending: false })
      
      if (termsData && termsData.length > 0) {
        // Extract unique years
        const years: string[] = Array.from(new Set(termsData.map((t: any) => String(t.academic_year))))
        setAcademicYears(years)
        if (years.length > 0) {
          setSelectedYear(years[0])
          // Set terms for the first year
          const yearTerms = termsData.filter((t: any) => t.academic_year === years[0])
          setTerms(yearTerms)
          if (yearTerms.length > 0) setSelectedTerm(yearTerms[0].id)
        }
      }
    } catch (error) {
      console.error('Error loading filters:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleYearChange = async (year: string) => {
    setSelectedYear(year)
    // Update terms list
    const { data: termsData } = await supabase
      .from('academic_terms')
      .select('academic_year, name, id')
      .eq('academic_year', year)
    
    if (termsData) {
        setTerms(termsData)
        if (termsData.length > 0) setSelectedTerm(termsData[0].id)
        else setSelectedTerm('')
    }
  }

  async function loadRecords() {
    setLoading(true)
    try {
      if (activeTab === 'students') {
        // Try to fetch historical enrollment if available, otherwise current students 
        // Logic: Search student_promotions for that year, OR fallback to current students
        
        // Let's check promotion history first
        const { data: promoData, error: promoError } = await supabase
            .from('student_promotions')
            .select(`
                student_id,
                academic_year,
                current_class:classes(name),
                student:students(id, first_name, middle_name, last_name, student_id, gender, status)
            `)
            .eq('academic_year', selectedYear)
        
        if (promoData && promoData.length > 0) {
            setRecords(promoData.map((p: any) => ({
                id: p.student.id,
                identifier: p.student.student_id,
                name: `${p.student.first_name} ${p.student.middle_name ? p.student.middle_name + ' ' : ''}${p.student.last_name}`,
                role_detail: p.current_class?.name || 'Unknown Class',
                status: p.student.status,
                gender: p.student.gender
            })))
        } else {
             // Fallback: If searching current year, show current students
             // If searching past year and no records, empty
             // For now, we will just show all students and note that exact historical class placement depends on promotion records
             
             // Simulating "active in term" by filtering students created before the term end date
             // First get term end date
             const { data: termData } = await supabase.from('academic_terms').select('end_date').eq('id', selectedTerm).single()
             
             let query = supabase.from('students').select('id, student_id, first_name, middle_name, last_name, gender, status, classes(name)')
             
             if (termData) {
                 query = query.lte('admission_date', termData.end_date)
             }
             
             const { data: stdData } = await query
             
             if (stdData) {
                 setRecords(stdData.map((s: any) => ({
                    id: s.id,
                    identifier: s.student_id,
                    name: `${s.first_name} ${s.middle_name ? s.middle_name + ' ' : ''}${s.last_name}`,
                    role_detail: s.classes?.name || 'Unassigned',
                    status: s.status,
                    gender: s.gender
                 })))
             }
        }

      } else {
        // Teachers
        // Find teachers assigned to subjects in that year
        const { data: assignData } = await supabase
            .from('class_subjects')
            .select(`
                teacher:teachers(id, teacher_id, first_name, middle_name, last_name, phone, status),
                class:classes(name),
                subject:subjects(name)
            `)
            .eq('academic_year', selectedYear)
        
        if (assignData) {
            // Deduplicate teachers
            const uniqueTeachers = new Map()
            assignData.forEach((item: any) => {
                if (item.teacher && !uniqueTeachers.has(item.teacher.id)) {
                    uniqueTeachers.set(item.teacher.id, {
                        id: item.teacher.id,
                        identifier: item.teacher.teacher_id,
                        name: `${item.teacher.first_name} ${item.teacher.middle_name ? item.teacher.middle_name + ' ' : ''}${item.teacher.last_name}`,
                        role_detail: item.teacher.status, // Or maybe list count of subjects
                        contact: item.teacher.phone,
                        status: item.teacher.status
                    })
                }
            })
            setRecords(Array.from(uniqueTeachers.values()))
        }
      }
    } catch (error) {
      console.error('Error loading records:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredRecords = records.filter(r => 
    r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.identifier.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center space-x-4">
            <Link href="/admin/results" className="text-gray-600 hover:text-gray-900">
              <ArrowLeft className="w-6 h-6" />
            </Link>
            <h1 className="text-2xl font-bold text-gray-800">Historical Records</h1>
          </div>
          
           <div className="flex space-x-2 bg-white rounded-lg p-1 shadow-sm border border-gray-200">
            <button
              onClick={() => setActiveTab('students')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'students' 
                  ? 'bg-blue-100 text-blue-700' 
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              Students
            </button>
            <button
              onClick={() => setActiveTab('teachers')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'teachers' 
                  ? 'bg-blue-100 text-blue-700' 
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              Teachers
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-4 mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
             <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Academic Year</label>
                <select 
                    value={selectedYear}
                    onChange={(e) => handleYearChange(e.target.value)}
                    className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                >
                    {academicYears.map(year => (
                        <option key={year} value={year}>{year}</option>
                    ))}
                </select>
             </div>
             <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Term</label>
                <select 
                    value={selectedTerm}
                    onChange={(e) => setSelectedTerm(e.target.value)}
                    className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                >
                    {terms.map(term => (
                        <option key={term.id} value={term.id}>{term.name}</option>
                    ))}
                </select>
             </div>
             <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
                <div className="relative">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                    <input 
                        type="text" 
                        placeholder={`Search ${activeTab}...`}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-9 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    />
                </div>
             </div>
        </div>

        {/* Results Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
            {loading ? (
                <div className="p-8 text-center">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <p className="mt-2 text-gray-500">Loading records...</p>
                </div>
            ) : (
                <>
                    {/* Desktop Table View */}
                    <div className="hidden md:block overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Name
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        ID
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        {activeTab === 'students' ? 'Class' : 'Status'}
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        {activeTab === 'students' ? 'Gender' : 'Contact'}
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {filteredRecords.length > 0 ? (
                                    filteredRecords.map((record) => (
                                        <tr key={record.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="font-medium text-gray-900">{record.name}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {record.identifier}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {record.role_detail}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {activeTab === 'students' ? record.gender : record.contact}
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                                            No records found for the selected period.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Mobile Card View */}
                    <div className="md:hidden">
                        <div className="divide-y divide-gray-200">
                            {filteredRecords.length > 0 ? (
                                filteredRecords.map((record) => (
                                    <div key={record.id} className="p-4 bg-white space-y-3">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <div className="font-medium text-gray-900">{record.name}</div>
                                                <div className="text-sm text-gray-500">{record.identifier}</div>
                                            </div>
                                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                                                record.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                                            }`}>
                                                {record.status || (activeTab === 'students' ? 'Student' : 'Teacher')}
                                            </span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2 text-sm">
                                            <div>
                                                <span className="text-gray-500 block text-xs uppercase tracking-wide">{activeTab === 'students' ? 'Class' : 'Status'}</span>
                                                <span className="font-medium">{record.role_detail}</span>
                                            </div>
                                            <div>
                                                <span className="text-gray-500 block text-xs uppercase tracking-wide">{activeTab === 'students' ? 'Gender' : 'Contact'}</span>
                                                <span className="font-medium">{activeTab === 'students' ? record.gender : record.contact}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="p-8 text-center text-gray-500">
                                    No records found for the selected period.
                                </div>
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
      </div>
    </div>
  )
}
