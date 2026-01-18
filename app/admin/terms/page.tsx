'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Calendar, Plus, Edit, Trash2, Check, X, AlertCircle } from 'lucide-react'
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
  const [selectedTerm, setSelectedTerm] = useState<Term | null>(null)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })

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
    setMessage({ type: '', text: '' })

    if (!formData.name || !formData.academic_year || !formData.start_date || !formData.end_date) {
      setMessage({ type: 'error', text: 'Please fill in all required fields' })
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
      setMessage({ type: 'error', text: error.message })
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

      setMessage({ type: 'success', text: 'Term added successfully!' })
      setShowAddModal(false)
      resetForm()
      loadTerms()
    }
    setSaving(false)
  }

  const handleEdit = async () => {
    if (!selectedTerm) return
    setSaving(true)
    setMessage({ type: '', text: '' })

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
      setMessage({ type: 'error', text: error.message })
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

      setMessage({ type: 'success', text: 'Term updated successfully!' })
      setShowEditModal(false)
      resetForm()
      loadTerms()
    }
    setSaving(false)
  }

  const handleDelete = async () => {
    if (!selectedTerm) return
    setSaving(true)

    const { error } = await supabase
      .from('academic_terms')
      .delete()
      .eq('id', selectedTerm.id)

    if (error) {
      setMessage({ type: 'error', text: error.message })
    } else {
      setMessage({ type: 'success', text: 'Term deleted successfully!' })
      setShowDeleteModal(false)
      loadTerms()
    }
    setSaving(false)
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
    setMessage({ type: 'success', text: `${term.name} set as current term` })
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-methodist-blue"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="container mx-auto px-4 md:px-6 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center space-x-3 md:space-x-4">
              <Link href="/admin/dashboard" className="text-purple-600 hover:text-purple-700">
                <ArrowLeft className="w-6 h-6" />
              </Link>
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
        {message.text && (
          <div className={`mb-6 p-4 rounded-lg flex items-center space-x-2 ${
            message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
          }`}>
            {message.type === 'success' ? <Check className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
            <span>{message.text}</span>
            <button onClick={() => setMessage({ type: '', text: '' })} className="ml-auto">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

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
            <div key={year} className="mb-6 md:mb-8">
              <h2 className="text-lg md:text-xl font-bold text-gray-800 mb-4">{year} Academic Year</h2>
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

            {message.text && message.type === 'error' && (
              <div className="mt-4 p-3 bg-red-50 text-red-800 rounded-lg text-sm">
                {message.text}
              </div>
            )}

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
    </div>
  )
}
