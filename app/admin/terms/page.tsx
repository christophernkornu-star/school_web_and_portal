'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Skeleton } from '@/components/ui/skeleton'
import BackButton from '@/components/ui/BackButton'
import { toast } from 'react-hot-toast'
import { ArrowLeft, Calendar, Plus, Edit, Trash2, AlertTriangle } from 'lucide-react'
import { getCurrentUser } from '@/lib/auth'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'

interface Term {
  id: string
  name: string
  academic_year: string
  start_date: string
  end_date: string
  is_current: boolean
  created_at: string
}

export default function TermsPage() {
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()
  const [terms, setTerms] = useState<Term[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showDeleteYearModal, setShowDeleteYearModal] = useState(false)
  const [selectedTerm, setSelectedTerm] = useState<Term | null>(null)
  const [selectedYear, setSelectedYear] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const [formData, setFormData] = useState({
    name: 'Term 1',
    academic_year: '',
    start_date: '',
    end_date: '',
    is_current: false
  })

  useEffect(() => {
    loadTerms()
  }, [router])

  async function loadTerms() {
    const user = await getCurrentUser()
    if (!user) {
      router.push('/login?portal=admin')
      return
    }

    const { data, error } = await supabase
      .from('academic_terms')
      .select('*')
      .order('academic_year', { ascending: false })
      .order('name') as { data: Term[] | null, error: any }

    if (data) setTerms(data)
    setLoading(false)
  }

  const handleAdd = async () => {
    setSaving(true)

    if (!formData.name || !formData.academic_year || !formData.start_date || !formData.end_date) {
      toast.error('Please fill in all required fields')
      setSaving(false)
      return
    }

    if (formData.is_current) {
      await supabase
        .from('academic_terms')
        .update({ is_current: false })
        .eq('is_current', true)
    }

    const { data: newTerm, error } = await supabase
      .from('academic_terms')
      .insert({
        name: formData.name,
        academic_year: formData.academic_year,
        start_date: formData.start_date,
        end_date: formData.end_date,
        is_current: formData.is_current
      })
      .select()
      .single()

    if (error) {
      toast.error(error.message)
    } else {
      if (formData.is_current && newTerm) {
        // Update academic_settings
        const { data: settingsData } = await supabase
          .from('academic_settings')
          .select('id')
          .limit(1) as { data: any[] | null }

        if (settingsData && settingsData.length > 0) {
          await supabase
            .from('academic_settings')
            .update({ 
              current_term: newTerm.name,
              current_academic_year: newTerm.academic_year
            })
            .eq('id', settingsData[0].id)
        }

        // Update system_settings
        const { data: systemSettings } = await supabase
          .from('system_settings')
          .select('id')
          .eq('setting_key', 'current_term')
          .maybeSingle()

        if (systemSettings) {
          await supabase
            .from('system_settings')
            .update({ setting_value: newTerm.id })
            .eq('id', systemSettings.id)
        } else {
          await supabase
            .from('system_settings')
            .insert({ 
              setting_key: 'current_term', 
              setting_value: newTerm.id,
              description: 'Current Academic Term ID'
            })
        }
      }

      toast.success('Term added successfully!')
      setShowAddModal(false)
      resetForm()
      loadTerms()
    }
    setSaving(false)
  }

  const handleEdit = async () => {
    if (!selectedTerm) return
    setSaving(true)

    if (formData.is_current) {
      await supabase
        .from('academic_terms')
        .update({ is_current: false })
        .neq('id', selectedTerm.id)
    }

    const { error } = await supabase
      .from('academic_terms')
      .update({
        name: formData.name,
        academic_year: formData.academic_year,
        start_date: formData.start_date,
        end_date: formData.end_date,
        is_current: formData.is_current
      })
      .eq('id', selectedTerm.id)

    if (error) {
      toast.error(error.message)
    } else {
      if (formData.is_current) {
        // Update academic_settings
        const { data: settingsData } = await supabase
          .from('academic_settings')
          .select('id')
          .limit(1) as { data: any[] | null }

        if (settingsData && settingsData.length > 0) {
          await supabase
            .from('academic_settings')
            .update({ 
              current_term: formData.name,
              current_academic_year: formData.academic_year
            })
            .eq('id', settingsData[0].id)
        }

        // Update system_settings
        const { data: systemSettings } = await supabase
          .from('system_settings')
          .select('id')
          .eq('setting_key', 'current_term')
          .maybeSingle()

        if (systemSettings) {
          await supabase
            .from('system_settings')
            .update({ setting_value: selectedTerm.id })
            .eq('id', systemSettings.id)
        } else {
          await supabase
            .from('system_settings')
            .insert({
              setting_key: 'current_term', 
              setting_value: selectedTerm.id,
              description: 'Current Academic Term ID'
            })
        }
      }
      
      toast.success('Term updated successfully!')
      setShowEditModal(false)
      loadTerms()
    }
    setSaving(false)
  }

  const handleDelete = async () => {
    if (!selectedTerm) return
    setSaving(true)

    try {
      const { data, error } = await supabase.rpc('delete_academic_term', {
        p_term_id: selectedTerm.id
      })

      if (error) throw error

      toast.success('Term deleted successfully!')
      setShowDeleteModal(false)
      loadTerms()
    } catch (error: any) {
      console.error('Error deleting term:', error)
      toast.error('Error deleting term: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  const handleSetCurrent = async (term: Term) => {
    await supabase
      .from('academic_terms')
      .update({ is_current: false })
      .eq('is_current', true)

    await supabase
      .from('academic_terms')
      .update({ is_current: true })
      .eq('id', term.id)

    const { data: settingsData } = await supabase
      .from('academic_settings')
      .select('id')
      .limit(1) as { data: any[] | null }

    if (settingsData && settingsData.length > 0) {
      await supabase
        .from('academic_settings')
        .update({ 
          current_term: term.name,
          current_academic_year: term.academic_year
        })
        .eq('id', settingsData[0].id)
    }

    // Also update system_settings for other portals
    const { data: systemSettings } = await supabase
      .from('system_settings')
      .select('id')
      .eq('setting_key', 'current_term')
      .maybeSingle()

    if (systemSettings) {
      await supabase
        .from('system_settings')
        .update({ setting_value: term.id })
        .eq('id', systemSettings.id)
    } else {
      // Create if not exists
      await supabase
        .from('system_settings')
        .insert({ 
          setting_key: 'current_term', 
          setting_value: term.id,
          description: 'Current Academic Term ID'
        })
    }

    loadTerms()
    toast.success(`${term.name} set as current term`)
  }

  const handleDeleteYear = async () => {
    if (!selectedYear) return
    setSaving(true)

    try {
      const { data, error } = await supabase.rpc('delete_academic_year', {
        p_academic_year: selectedYear
      })

      if (error) throw error

      toast.success(`${selectedYear} Academic Year deleted completely`)
      setShowDeleteYearModal(false)
      loadTerms()
    } catch (error: any) {
      console.error('Error deleting year:', error)
      toast.error('Error deleting year: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  const openDeleteYearModal = (year: string) => {
    setSelectedYear(year)
    setShowDeleteYearModal(true)
  }

  const openEditModal = (term: Term) => {
    setSelectedTerm(term)
    setFormData({
      name: term.name,
      academic_year: term.academic_year,
      start_date: term.start_date,
      end_date: term.end_date,
      is_current: term.is_current
    })
    setShowEditModal(true)
  }

  const openDeleteModal = (term: Term) => {
    setSelectedTerm(term)
    setShowDeleteModal(true)
  }

  const resetForm = () => {
    setFormData({
      name: 'Term 1',
      academic_year: '',
      start_date: '',
      end_date: '',
      is_current: false
    })
    setSelectedTerm(null)
  }

  const groupedTerms = terms.reduce((acc, term) => {
    if (!acc[term.academic_year]) {
      acc[term.academic_year] = []
    }
    acc[term.academic_year].push(term)
    return acc
  }, {} as Record<string, Term[]>)

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow">
          <div className="container mx-auto px-4 md:px-6 py-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center space-x-4">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-8 w-48" />
                  <Skeleton className="h-4 w-64" />
                </div>
              </div>
              <Skeleton className="h-10 w-32" />
            </div>
          </div>
        </header>

        <main className="container mx-auto px-4 md:px-6 py-8">
          {[1, 2].map((i) => (
            <div key={i} className="mb-8">
              <Skeleton className="h-8 w-32 mb-4" />
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3].map((j) => (
                  <div key={j} className="bg-white rounded-lg shadow p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <Skeleton className="h-6 w-24 mb-2" />
                        <Skeleton className="h-4 w-32" />
                      </div>
                      <Skeleton className="h-6 w-16 rounded-full" />
                    </div>
                    <div className="space-y-2 mb-4">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-3/4" />
                    </div>
                    <div className="flex justify-end space-x-2 pt-4 border-t">
                      <Skeleton className="h-8 w-20" />
                      <Skeleton className="h-8 w-20" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="container mx-auto px-4 md:px-6 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center space-x-3 md:space-x-4">
              <BackButton href="/admin/dashboard" />
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-gray-800">Academic Terms</h1>
                <p className="text-xs md:text-sm text-gray-600">Manage academic terms and sessions</p>
              </div>
            </div>
            <button 
              onClick={() => {
                resetForm()
                setShowAddModal(true)
              }}
              className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 flex items-center space-x-2"
            >
              <Plus className="w-5 h-5" />
              <span>Add Term</span>
            </button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 md:px-6 py-6 md:py-8">
        {Object.keys(groupedTerms).length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 md:p-12 text-center">
            <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No academic terms found</h3>
            <p className="text-gray-600 mb-6">Get started by adding your first academic term</p>
            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
            >
              <Plus className="w-5 h-5 mr-2" />
              Add Term
            </button>
          </div>
        ) : (
          Object.entries(groupedTerms).map(([year, yearTerms]) => (
            <div key={year} className="mb-6 md:mb-8 bg-gray-50/50 rounded-xl p-4 border border-gray-100">
              <div className="flex items-center justify-between mb-4 bg-white p-3 rounded-lg shadow-sm">
                <div className="flex items-center space-x-3">
                  <div className="bg-purple-100 p-2 rounded-lg">
                    <Calendar className="w-5 h-5 text-purple-600" />
                  </div>
                  <h2 className="text-lg md:text-xl font-bold text-gray-800">{year} Academic Year</h2>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="text-sm text-gray-500 hidden md:block mr-2">
                    {yearTerms.length} Terms
                  </div>
                  <button
                    onClick={() => openDeleteYearModal(year)}
                    className="flex items-center space-x-2 px-3 py-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 hover:text-red-700 transition-colors text-sm font-medium border border-red-100"
                    title="Delete entire academic year and all associated data"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span className="hidden md:inline">Delete Year</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                {yearTerms.map((term) => (
                  <div key={term.id} className={`bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow ${
                    term.is_current ? 'ring-2 ring-green-500' : ''
                  }`}>
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <div className={`p-3 rounded-lg ${term.is_current ? 'bg-green-100' : 'bg-purple-100'}`}>
                          <Calendar className={`w-6 h-6 ${term.is_current ? 'text-green-600' : 'text-purple-600'}`} />
                        </div>
                        <div>
                          <h3 className="font-bold text-base md:text-lg text-gray-800">{term.name}</h3>
                          <p className="text-xs md:text-sm text-gray-500">{term.academic_year}</p>
                        </div>
                      </div>
                      {term.is_current && (
                        <span className="px-2 py-1 bg-green-100 text-green-800 text-[10px] md:text-xs font-semibold rounded-full">
                          Current
                        </span>
                      )}
                    </div>

                    <div className="space-y-2 text-xs md:text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Start Date:</span>
                        <span className="font-medium">{new Date(term.start_date).toLocaleDateString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">End Date:</span>
                        <span className="font-medium">{new Date(term.end_date).toLocaleDateString()}</span>
                      </div>
                    </div>

                    <div className="mt-4 pt-4 border-t flex justify-between items-center">
                      {!term.is_current ? (
                        <button 
                          onClick={() => handleSetCurrent(term)}
                          className="text-sm text-green-600 hover:text-green-700 font-medium"
                        >
                          Set as Current
                        </button>
                      ) : (
                        <span className="text-sm text-green-600">✓ Active Term</span>
                      )}
                      <div className="flex space-x-2">
                        <button 
                          onClick={() => openEditModal(term)}
                          className="p-2 hover:bg-gray-100 rounded text-blue-600"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => openDeleteModal(term)}
                          className="p-2 hover:bg-gray-100 rounded text-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </main>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Add New Term</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Term Name</label>
                <select
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                >
                  <option value="Term 1">Term 1</option>
                  <option value="Term 2">Term 2</option>
                  <option value="Term 3">Term 3</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Academic Year</label>
                <input
                  type="text"
                  placeholder="e.g., 2024/2025"
                  value={formData.academic_year}
                  onChange={(e) => setFormData({ ...formData, academic_year: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                <input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                <input
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="is_current"
                  checked={formData.is_current}
                  onChange={(e) => setFormData({ ...formData, is_current: e.target.checked })}
                  className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                />
                <label htmlFor="is_current" className="text-sm text-gray-700">Set as current term</label>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowAddModal(false)
                  resetForm()
                }}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAdd}
                disabled={saving}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
              >
                {saving ? 'Adding...' : 'Add Term'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Edit Term</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Term Name</label>
                <select
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                >
                  <option value="Term 1">Term 1</option>
                  <option value="Term 2">Term 2</option>
                  <option value="Term 3">Term 3</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Academic Year</label>
                <input
                  type="text"
                  value={formData.academic_year}
                  onChange={(e) => setFormData({ ...formData, academic_year: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                <input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                <input
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="edit_is_current"
                  checked={formData.is_current}
                  onChange={(e) => setFormData({ ...formData, is_current: e.target.checked })}
                  className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                />
                <label htmlFor="edit_is_current" className="text-sm text-gray-700">Set as current term</label>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowEditModal(false)
                  resetForm()
                }}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleEdit}
                disabled={saving}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {showDeleteModal && selectedTerm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Delete Term</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete <strong>{selectedTerm.name}</strong> ({selectedTerm.academic_year})? 
              This action cannot be undone and may affect related data.
            </p>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false)
                  setSelectedTerm(null)
                }}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={saving}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {saving ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Delete Year Modal */}
      {showDeleteYearModal && selectedYear && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-xl border border-red-100">
            <div className="flex items-center space-x-3 text-red-600 mb-4">
              <div className="bg-red-100 p-2 rounded-full">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-gray-800">Delete Academic Year?</h3>
            </div>
            
            <div className="bg-red-50 border border-red-100 rounded-lg p-4 mb-6">
              <p className="font-semibold text-red-800 mb-2">Warning: Destructive Action</p>
              <p className="text-sm text-red-700 mb-2">
                You are about to delete the entire <strong>{selectedYear}</strong> academic year.
              </p>
              <ul className="list-disc list-inside text-sm text-red-700 space-y-1 ml-2">
                <li>All Terms in this year</li>
                <li>All Student Scores & Grades</li>
                <li>All Assessments & Exam Records</li>
                <li>Promotion History & Status</li>
                <li>Teacher Class Assignments for this year</li>
              </ul>
            </div>
            
            <p className="text-gray-600 text-sm mb-6">
              This action cannot be undone. Please confirm you want to proceed.
            </p>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowDeleteYearModal(false)
                  setSelectedYear(null)
                }}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteYear}
                disabled={saving}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 font-medium flex items-center space-x-2"
              >
                {saving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Yes, Delete Everything</span>
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
