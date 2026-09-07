'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Skeleton } from '@/components/ui/skeleton'
import BackButton from '@/components/ui/back-button'
import { toast } from 'react-hot-toast'
import { ArrowLeft, Calendar, Plus, Edit, Trash2, AlertTriangle, X } from 'lucide-react'
import { getCurrentUser } from '@/lib/auth'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'

interface Term {
  id: string
  name: string
  academic_year: string
  start_date: string
  end_date: string
  vacation_date: string
  reopening_date: string
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
    vacation_date: '',
    reopening_date: '',
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
        vacation_date: formData.vacation_date || null,
        reopening_date: formData.reopening_date || null,
        is_current: formData.is_current
      })
      .select()
      .single()

    if (error) {
      toast.error(error.message)
    } else {
      if (formData.is_current && newTerm) {
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
        vacation_date: formData.vacation_date || null,
        reopening_date: formData.reopening_date || null,
        is_current: formData.is_current
      })
      .eq('id', selectedTerm.id)

    if (error) {
      toast.error(error.message)
    } else {
      if (formData.is_current) {
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
      vacation_date: term.vacation_date || '',
      reopening_date: term.reopening_date || '',
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
      vacation_date: '',
      reopening_date: '',
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
      <div className="min-h-screen bg-gray-50/50 pb-20">
        <header className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-gray-100 dark:border-gray-800 sticky top-0 z-20 shadow-sm">
          <div className="max-w-[1400px] mx-auto px-4 md:px-6 lg:px-8 py-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center space-x-4">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-7 w-40" />
                  <Skeleton className="h-4 w-56" />
                </div>
              </div>
              <Skeleton className="h-10 w-32 rounded-xl" />
            </div>
          </div>
        </header>

        <main className="max-w-[1400px] mx-auto px-4 md:px-6 lg:px-8 py-8">
          {[1, 2].map((i) => (
            <div key={i} className="mb-8">
              <Skeleton className="h-8 w-40 mb-4" />
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3].map((j) => (
                  <div key={j} className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100 space-y-4">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-3">
                        <Skeleton className="h-12 w-12 rounded-xl" />
                        <div>
                          <Skeleton className="h-5 w-24 mb-1" />
                          <Skeleton className="h-3.5 w-20" />
                        </div>
                      </div>
                      <Skeleton className="h-5 w-16 rounded-full" />
                    </div>
                    <div className="space-y-2 pt-2">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-5/6" />
                    </div>
                    <div className="flex justify-between items-center pt-4 border-t border-gray-50">
                      <Skeleton className="h-4 w-28" />
                      <div className="flex gap-2">
                        <Skeleton className="h-8 w-8 rounded-lg" />
                        <Skeleton className="h-8 w-8 rounded-lg" />
                      </div>
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
    <div className="min-h-screen bg-gray-50/50 dark:bg-gray-900 pb-24 font-sans text-gray-900">
      <header className="bg-white/90 dark:bg-gray-900/95 backdrop-blur-md border-b border-gray-200/80 dark:border-gray-800 sticky top-0 z-30 shadow-sm">
        <div className="max-w-[1400px] mx-auto px-4 md:px-6 lg:px-8 py-3.5 sm:py-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center space-x-3 sm:space-x-4">
              <BackButton href="/admin/dashboard" className="shrink-0 shadow-sm" />
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
                  <Calendar className="w-6 h-6 text-[#003B5C] shrink-0" />
                  <span>Academic Terms</span>
                </h1>
                <p className="text-xs sm:text-sm text-gray-500 font-medium">
                  Manage academic terms, sessions, and calendar timelines
                </p>
              </div>
            </div>
            <button 
              onClick={() => {
                resetForm()
                setShowAddModal(true)
              }}
              className="bg-[#003B5C] hover:bg-[#002a42] text-white px-4 sm:px-5 py-2.5 rounded-xl font-bold transition-all shadow-md active:scale-95 flex items-center justify-center space-x-2 text-xs sm:text-sm shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Add Term</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-[1400px] mx-auto px-4 md:px-6 lg:px-8 py-6 md:py-8 space-y-6">
        {Object.keys(groupedTerms).length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 p-12 text-center">
            <Calendar className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white mb-1">No academic terms found</h3>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mb-6">Get started by creating your first academic session and term.</p>
            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center px-5 py-2.5 bg-[#003B5C] hover:bg-[#002a42] text-white rounded-xl text-xs sm:text-sm font-bold shadow-md transition-all active:scale-95"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Term
            </button>
          </div>
        ) : (
          Object.entries(groupedTerms).map(([year, yearTerms]) => (
            <div key={year} className="mb-6 md:mb-8 bg-white dark:bg-gray-800 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-sm border border-gray-200/80 dark:border-gray-700 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 dark:border-gray-700 pb-4">
                <div className="flex items-center space-x-3">
                  <div className="bg-[#003B5C]/10 text-[#003B5C] dark:bg-[#003B5C]/30 dark:text-blue-300 p-2.5 rounded-xl shrink-0">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base sm:text-lg font-black text-gray-900 dark:text-white">{year} Academic Year</h2>
                    <p className="text-xs text-gray-400 font-medium">{yearTerms.length} Term{yearTerms.length !== 1 ? 's' : ''} registered</p>
                  </div>
                </div>
                <button
                  onClick={() => openDeleteYearModal(year)}
                  className="inline-flex items-center justify-center space-x-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-900/20 dark:text-rose-300 rounded-xl transition-colors text-xs font-bold border border-rose-200/60 shrink-0 self-start sm:self-auto"
                  title="Delete entire academic year and all associated data"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Year</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
                {yearTerms.map((term) => (
                  <div 
                    key={term.id} 
                    className={`bg-gray-50/60 dark:bg-gray-900/40 rounded-2xl p-4 sm:p-5 border transition-all flex flex-col justify-between ${
                      term.is_current 
                        ? 'border-emerald-500/80 ring-2 ring-emerald-500/20 bg-emerald-50/10' 
                        : 'border-gray-200/80 dark:border-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3 mb-3.5">
                        <div className="flex items-center space-x-3 min-w-0">
                          <div className={`p-2.5 rounded-xl shrink-0 ${term.is_current ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-50 text-[#003B5C] dark:bg-blue-900/30 dark:text-blue-300'}`}>
                            <Calendar className="w-5 h-5" />
                          </div>
                          <div className="min-w-0">
                            <h3 className="font-bold text-sm sm:text-base text-gray-900 dark:text-white truncate">{term.name}</h3>
                            <p className="text-xs text-gray-400 font-mono mt-0.5">{term.academic_year}</p>
                          </div>
                        </div>
                        {term.is_current && (
                          <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase tracking-wider rounded-full shrink-0 border border-emerald-200">
                            Current
                          </span>
                        )}
                      </div>

                      <div className="space-y-1.5 text-xs text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-800 p-3 rounded-xl border border-gray-100 dark:border-gray-700 mb-4">
                        <div className="flex justify-between">
                          <span className="text-gray-400 font-medium">Start Date:</span>
                          <span className="font-bold">{new Date(term.start_date).toLocaleDateString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400 font-medium">End Date:</span>
                          <span className="font-bold">{new Date(term.end_date).toLocaleDateString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400 font-medium">Vacation Date:</span>
                          <span className="font-bold">{term.vacation_date ? new Date(term.vacation_date).toLocaleDateString() : 'TBA'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400 font-medium">Reopening Date:</span>
                          <span className="font-bold">{term.reopening_date ? new Date(term.reopening_date).toLocaleDateString() : 'TBA'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-gray-200/60 dark:border-gray-700 flex justify-between items-center gap-2">
                      {!term.is_current ? (
                        <button 
                          onClick={() => handleSetCurrent(term)}
                          className="text-xs text-[#003B5C] dark:text-blue-400 hover:underline font-bold"
                        >
                          Set as Current
                        </button>
                      ) : (
                        <span className="text-xs text-emerald-600 font-bold flex items-center gap-1">
                          ✓ Active Session
                        </span>
                      )}
                      <div className="flex space-x-1">
                        <button 
                          onClick={() => openEditModal(term)}
                          className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg text-blue-600 transition-colors"
                          title="Edit Term"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => openDeleteModal(term)}
                          className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg text-rose-600 transition-colors"
                          title="Delete Term"
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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-gray-800 rounded-t-3xl sm:rounded-2xl max-w-md w-full shadow-2xl p-5 sm:p-6 max-h-[92vh] flex flex-col overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">Add New Term</h3>
              <button 
                onClick={() => { setShowAddModal(false); resetForm(); }}
                className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-400 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-3.5 text-xs sm:text-sm">
              <div>
                <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">Term Name</label>
                <select
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#003B5C] outline-none font-medium"
                >
                  <option value="Term 1">Term 1</option>
                  <option value="Term 2">Term 2</option>
                  <option value="Term 3">Term 3</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">Academic Year</label>
                <input
                  type="text"
                  placeholder="e.g., 2024/2025"
                  value={formData.academic_year}
                  onChange={(e) => setFormData({ ...formData, academic_year: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#003B5C] outline-none font-medium"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#003B5C] outline-none text-xs"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">End Date</label>
                  <input
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#003B5C] outline-none text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">Vacation Date</label>
                  <input
                    type="date"
                    value={formData.vacation_date}
                    onChange={(e) => setFormData({ ...formData, vacation_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#003B5C] outline-none text-xs"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">Reopening Date</label>
                  <input
                    type="date"
                    value={formData.reopening_date}
                    onChange={(e) => setFormData({ ...formData, reopening_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#003B5C] outline-none text-xs"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <input
                  type="checkbox"
                  id="is_current"
                  checked={formData.is_current}
                  onChange={(e) => setFormData({ ...formData, is_current: e.target.checked })}
                  className="w-4 h-4 text-[#003B5C] border-gray-300 rounded focus:ring-[#003B5C]"
                />
                <label htmlFor="is_current" className="font-bold text-gray-700 dark:text-gray-300">Set as active term</label>
              </div>
            </div>

            <div className="flex flex-col-reverse sm:flex-row justify-end gap-2.5 mt-6 pt-4 border-t border-gray-100 dark:border-gray-700">
              <button
                onClick={() => { setShowAddModal(false); resetForm(); }}
                className="w-full sm:w-auto px-4 py-2.5 text-xs font-bold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAdd}
                disabled={saving}
                className="w-full sm:w-auto px-5 py-2.5 bg-[#003B5C] hover:bg-[#002a42] text-white rounded-xl text-xs font-bold transition-all shadow-sm disabled:opacity-50"
              >
                {saving ? 'Adding...' : 'Add Term'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-gray-800 rounded-t-3xl sm:rounded-2xl max-w-md w-full shadow-2xl p-5 sm:p-6 max-h-[92vh] flex flex-col overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">Edit Term</h3>
              <button 
                onClick={() => { setShowEditModal(false); resetForm(); }}
                className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-400 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-3.5 text-xs sm:text-sm">
              <div>
                <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">Term Name</label>
                <select
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#003B5C] outline-none font-medium"
                >
                  <option value="Term 1">Term 1</option>
                  <option value="Term 2">Term 2</option>
                  <option value="Term 3">Term 3</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">Academic Year</label>
                <input
                  type="text"
                  value={formData.academic_year}
                  onChange={(e) => setFormData({ ...formData, academic_year: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#003B5C] outline-none font-medium"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#003B5C] outline-none text-xs"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">End Date</label>
                  <input
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#003B5C] outline-none text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">Vacation Date</label>
                  <input
                    type="date"
                    value={formData.vacation_date}
                    onChange={(e) => setFormData({ ...formData, vacation_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#003B5C] outline-none text-xs"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">Reopening Date</label>
                  <input
                    type="date"
                    value={formData.reopening_date}
                    onChange={(e) => setFormData({ ...formData, reopening_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#003B5C] outline-none text-xs"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <input
                  type="checkbox"
                  id="edit_is_current"
                  checked={formData.is_current}
                  onChange={(e) => setFormData({ ...formData, is_current: e.target.checked })}
                  className="w-4 h-4 text-[#003B5C] border-gray-300 rounded focus:ring-[#003B5C]"
                />
                <label htmlFor="edit_is_current" className="font-bold text-gray-700 dark:text-gray-300">Set as active term</label>
              </div>
            </div>

            <div className="flex flex-col-reverse sm:flex-row justify-end gap-2.5 mt-6 pt-4 border-t border-gray-100 dark:border-gray-700">
              <button
                onClick={() => { setShowEditModal(false); resetForm(); }}
                className="w-full sm:w-auto px-4 py-2.5 text-xs font-bold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleEdit}
                disabled={saving}
                className="w-full sm:w-auto px-5 py-2.5 bg-[#003B5C] hover:bg-[#002a42] text-white rounded-xl text-xs font-bold transition-all shadow-sm disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {showDeleteModal && selectedTerm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-gray-800 rounded-t-3xl sm:rounded-2xl max-w-md w-full shadow-2xl p-5 sm:p-6">
            <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white mb-2">Delete Term</h3>
            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 mb-6 leading-relaxed">
              Are you sure you want to delete <strong className="text-gray-900 dark:text-white">{selectedTerm.name}</strong> ({selectedTerm.academic_year})? 
              This action cannot be undone.
            </p>

            <div className="flex flex-col-reverse sm:flex-row justify-end gap-2.5 pt-2">
              <button
                onClick={() => { setShowDeleteModal(false); setSelectedTerm(null); }}
                className="w-full sm:w-auto px-4 py-2.5 text-xs font-bold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={saving}
                className="w-full sm:w-auto px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm disabled:opacity-50"
              >
                {saving ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Year Modal */}
      {showDeleteYearModal && selectedYear && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-gray-800 rounded-t-3xl sm:rounded-2xl max-w-md w-full shadow-2xl p-5 sm:p-6 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center space-x-3 text-rose-600 mb-3.5">
              <div className="bg-rose-50 dark:bg-rose-900/30 p-2.5 rounded-xl shrink-0">
                <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">Delete Academic Year?</h3>
            </div>
            
            <div className="bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-xl p-3 mb-4 space-y-1.5">
              <p className="font-bold text-xs text-rose-900 dark:text-rose-300 uppercase tracking-wider">Warning: Destructive Action</p>
              <p className="text-xs text-rose-800 dark:text-rose-400">
                You are about to permanently delete the entire <strong>{selectedYear}</strong> academic year session.
              </p>
              <ul className="list-disc list-inside text-[11px] text-rose-700 dark:text-rose-300 space-y-0.5 ml-1 pt-1">
                <li>All Terms under this year</li>
                <li>All Student Scores, Grades, and Exams</li>
                <li>Promotion History and Records</li>
                <li>Teacher Class Assignments</li>
              </ul>
            </div>
            
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-6 font-medium">
              This action cannot be undone. Please confirm you want to proceed.
            </p>

            <div className="flex flex-col-reverse sm:flex-row justify-end gap-2.5 pt-2 border-t border-gray-100 dark:border-gray-700">
              <button
                onClick={() => { setShowDeleteYearModal(false); setSelectedYear(null); }}
                className="w-full sm:w-auto px-4 py-2.5 text-xs font-bold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteYear}
                disabled={saving}
                className="w-full sm:w-auto px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm disabled:opacity-50 flex items-center justify-center space-x-2"
              >
                {saving ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
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