'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Save, Search, Filter, Lock, Unlock, AlertTriangle } from 'lucide-react'
import { getCurrentUser } from '@/lib/auth'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'

export default function ResultsApprovalPage() {
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()
  const [loading, setLoading] = useState(true)
  const [classes, setClasses] = useState<any[]>([])
  const [selectedClass, setSelectedClass] = useState('')
  const [students, setStudents] = useState<any[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    loadInitialData()
  }, [])

  useEffect(() => {
    if (selectedClass) {
      loadStudents(selectedClass)
    } else {
      setStudents([])
    }
  }, [selectedClass])

  async function loadInitialData() {
    try {
      const user = await getCurrentUser()
      if (!user) {
        router.push('/login?portal=admin')
        return
      }

      const { data: classesData } = await supabase
        .from('classes')
        .select('id, name')
        .order('name')
      
      if (classesData) setClasses(classesData)
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  async function loadStudents(classId: string) {
    setLoading(true)
    try {
      const { data } = await supabase
        .from('students')
        .select('id, student_id, first_name, last_name, results_withheld, withheld_reason')
        .eq('class_id', classId)
        .eq('status', 'active')
        .order('last_name')
      
      if (data) {
        setStudents(data.map((s: any) => ({
          ...s,
          results_withheld: s.results_withheld || false,
          withheld_reason: s.withheld_reason || ''
        })))
      }
    } catch (error) {
      console.error('Error loading students:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleToggleWithheld = (studentId: string, currentStatus: boolean) => {
    setStudents(prev => prev.map(s => {
      if (s.id === studentId) {
        return { ...s, results_withheld: !currentStatus, isDirty: true }
      }
      return s
    }))
  }

  const handleReasonChange = (studentId: string, reason: string) => {
    setStudents(prev => prev.map(s => {
      if (s.id === studentId) {
        return { ...s, withheld_reason: reason, isDirty: true }
      }
      return s
    }))
  }

  const handleSave = async () => {
    setSaving(true)
    setMessage('')
    
    const updates = students
      .filter(s => s.isDirty)
      .map(s => ({
        id: s.id,
        results_withheld: s.results_withheld,
        withheld_reason: s.withheld_reason
      }))

    if (updates.length === 0) {
      setSaving(false)
      return
    }

    try {
      for (const update of updates) {
        const { error } = await supabase
          .from('students')
          .update({
            results_withheld: update.results_withheld,
            withheld_reason: update.withheld_reason
          })
          .eq('id', update.id)
        
        if (error) throw error
      }

      setMessage(`Successfully updated ${updates.length} students`)
      
      // Reset dirty state
      setStudents(prev => prev.map(s => ({ ...s, isDirty: false })))
      
      setTimeout(() => setMessage(''), 3000)
    } catch (error) {
      console.error('Error saving:', error)
      setMessage('Error saving changes')
    } finally {
      setSaving(false)
    }
  }

  const filteredStudents = students.filter(s => 
    s.first_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.last_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.student_id.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center space-x-4">
            <Link href="/admin/results" className="text-gray-600 hover:text-gray-900">
              <ArrowLeft className="w-6 h-6" />
            </Link>
            <h1 className="text-lg md:text-2xl font-bold text-gray-800">Results Approval & Withholding</h1>
          </div>
          {message && (
            <div className={`px-4 py-2 rounded-lg text-sm ${message.includes('Error') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
              {message}
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow p-4 md:p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Select Class</label>
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select a class...</option>
                {classes.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Search Student</label>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Name or ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex justify-end md:justify-start">
              <button
                onClick={handleSave}
                disabled={saving || !students.some(s => s.isDirty)}
                className="w-full md:w-auto flex items-center justify-center space-x-2 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className="w-5 h-5" />
                <span>{saving ? 'Saving...' : 'Save Changes'}</span>
              </button>
            </div>
          </div>
        </div>

        {selectedClass && (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student</th>
                    <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[200px]">Reason for Withholding</th>
                    <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredStudents.map((student) => (
                    <tr key={student.id} className={student.results_withheld ? 'bg-red-50' : ''}>
                      <td className="px-4 md:px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {student.first_name} {student.last_name}
                            </div>
                            <div className="text-xs md:text-sm text-gray-500">{student.student_id}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 md:px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          student.results_withheld 
                            ? 'bg-red-100 text-red-800' 
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {student.results_withheld ? 'Withheld' : 'Released'}
                        </span>
                      </td>
                      <td className="px-4 md:px-6 py-4 whitespace-nowrap">
                        <input
                          type="text"
                          value={student.withheld_reason}
                          onChange={(e) => handleReasonChange(student.id, e.target.value)}
                          placeholder="Reason (e.g. Fees owing)"
                          disabled={!student.results_withheld}
                          className="w-full px-3 py-1 border border-gray-300 rounded text-sm disabled:bg-gray-100 disabled:text-gray-400"
                        />
                      </td>
                      <td className="px-4 md:px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => handleToggleWithheld(student.id, student.results_withheld)}
                          className={`flex items-center space-x-1 ${
                            student.results_withheld 
                              ? 'text-green-600 hover:text-green-900' 
                              : 'text-red-600 hover:text-red-900'
                          }`}
                        >
                          {student.results_withheld ? (
                            <>
                              <Unlock className="w-4 h-4" />
                              <span className="hidden md:inline">Release</span>
                            </>
                          ) : (
                            <>
                              <Lock className="w-4 h-4" />
                              <span className="hidden md:inline">Withhold</span>
                            </>
                          )}
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredStudents.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-6 py-4 text-center text-gray-500">
                        No students found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
