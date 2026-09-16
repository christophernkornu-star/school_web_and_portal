'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'react-hot-toast'
import { 
  BookOpen, 
  Plus, 
  Edit3, 
  Trash2, 
  Search, 
  X, 
  AlertCircle, 
  GraduationCap, 
  Layers, 
  Loader2,
  CheckCircle2,
  FileText,
  Filter
} from 'lucide-react'
import { getCurrentUser, getUserProfile } from '@/lib/auth'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'
import { Skeleton } from '@/components/ui/skeleton'
import BackButton from '@/components/ui/back-button'

interface Subject {
  id: string
  name: string
  code: string
  description?: string
  level?: string
  created_at?: string
}

const LEVEL_CONFIG: Record<string, { label: string; badge: string; color: string }> = {
  kindergarten: {
    label: 'Kindergarten (KG 1 - 2)',
    badge: 'KG 1 - 2',
    color: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/50',
  },
  lower_primary: {
    label: 'Lower Primary (Basic 1 - 3)',
    badge: 'Basic 1 - 3',
    color: 'bg-blue-50 text-[#003B5C] border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900/50',
  },
  upper_primary: {
    label: 'Upper Primary (Basic 4 - 6)',
    badge: 'Basic 4 - 6',
    color: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-900/50',
  },
  jhs: {
    label: 'Junior High School (JHS 1 - 3)',
    badge: 'JHS 1 - 3',
    color: 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900/50',
  },
}

export default function SubjectsPage() {
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()

  const [subjects, setSubjects] = useState<Subject[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [activeLevel, setActiveLevel] = useState<string>('')
  
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null)
  const [saving, setSaving] = useState(false)

  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    level: '',
  })

  useEffect(() => {
    loadSubjects()
  }, [router])

  async function loadSubjects() {
    try {
      const user = await getCurrentUser()
      if (!user) {
        router.push('/login?portal=admin')
        return
      }

      const { data: profile } = await getUserProfile(user.id)
      if (profile?.role !== 'admin') {
        router.push('/login?portal=admin')
        return
      }

      const { data, error } = await supabase
        .from('subjects')
        .select('*')
        .order('name') as { data: Subject[] | null; error: any }

      if (error) {
        toast.error('Failed to load subjects')
      } else if (data) {
        setSubjects(data)
      }
    } catch (err) {
      console.error('Error fetching subjects:', err)
      toast.error('Connection error while fetching subjects')
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      code: '',
      description: '',
      level: '',
    })
    setSelectedSubject(null)
  }

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim() || !formData.code.trim()) {
      toast.error('Please provide a subject name and code')
      return
    }

    setSaving(true)
    try {
      const { error } = await supabase
        .from('subjects')
        .insert({
          name: formData.name.trim(),
          code: formData.code.trim().toUpperCase(),
          description: formData.description.trim() || null,
          level: formData.level || null,
        })

      if (error) {
        if (error.message.includes('duplicate') || error.code === '23505') {
          toast.error('A subject with this code already exists')
        } else {
          toast.error(error.message || 'Error adding subject')
        }
      } else {
        toast.success('Subject added successfully!')
        setShowAddModal(false)
        resetForm()
        loadSubjects()
      }
    } catch (err) {
      toast.error('An unexpected error occurred')
    } finally {
      setSaving(false)
    }
  }

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedSubject) return
    if (!formData.name.trim() || !formData.code.trim()) {
      toast.error('Please provide a subject name and code')
      return
    }

    setSaving(true)
    try {
      const { error } = await supabase
        .from('subjects')
        .update({
          name: formData.name.trim(),
          code: formData.code.trim().toUpperCase(),
          description: formData.description.trim() || null,
          level: formData.level || null,
        })
        .eq('id', selectedSubject.id)

      if (error) {
        if (error.message.includes('duplicate') || error.code === '23505') {
          toast.error('A subject with this code already exists')
        } else {
          toast.error(error.message || 'Error updating subject')
        }
      } else {
        toast.success('Subject updated successfully!')
        setShowEditModal(false)
        resetForm()
        loadSubjects()
      }
    } catch (err) {
      toast.error('An unexpected error occurred')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!selectedSubject) return
    setSaving(true)
    try {
      const { error } = await supabase
        .from('subjects')
        .delete()
        .eq('id', selectedSubject.id)

      if (error) {
        toast.error('Cannot delete subject. It may be assigned to class timetables or assessment records.')
      } else {
        toast.success('Subject deleted successfully!')
        setShowDeleteModal(false)
        resetForm()
        loadSubjects()
      }
    } catch (err) {
      toast.error('An unexpected error occurred')
    } finally {
      setSaving(false)
    }
  }

  const openEditModal = (subject: Subject) => {
    setSelectedSubject(subject)
    setFormData({
      name: subject.name,
      code: subject.code,
      description: subject.description || '',
      level: subject.level || '',
    })
    setShowEditModal(true)
  }

  const openDeleteModal = (subject: Subject) => {
    setSelectedSubject(subject)
    setShowDeleteModal(true)
  }

  const filteredSubjects = useMemo(() => {
    return subjects.filter((subject) => {
      const matchesLevel = activeLevel === '' || subject.level === activeLevel
      const matchesSearch =
        subject.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        subject.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (subject.description && subject.description.toLowerCase().includes(searchTerm.toLowerCase()))
      return matchesLevel && matchesSearch
    })
  }, [subjects, activeLevel, searchTerm])

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-900 font-sans text-slate-900 dark:text-slate-100 flex flex-col transition-colors selection:bg-[#003B5C] selection:text-white">
      
      {/* Top Header */}
      <header className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div className="max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 py-3.5 sm:py-4">
          <div className="flex items-center justify-between gap-3">
            
            <div className="flex items-center gap-3 sm:gap-4 min-w-0">
              <BackButton href="/admin/dashboard" />
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-4 bg-amber-400 rounded-full shrink-0" />
                  <h1 className="text-base sm:text-xl md:text-2xl font-black text-slate-900 dark:text-white tracking-tight truncate">
                    Curriculum &amp; Subjects
                  </h1>
                </div>
                <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium truncate mt-0.5">
                  Configure GES-approved courses, syllabi codes, and academic stage allocations
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                resetForm()
                setShowAddModal(true)
              }}
              className="inline-flex items-center justify-center gap-2 px-3.5 sm:px-4 py-2.5 bg-[#003B5C] hover:bg-[#002a42] text-white font-bold text-xs sm:text-sm rounded-xl shadow-xs hover:shadow transition active:scale-95 shrink-0"
            >
              <Plus className="w-4 h-4 text-amber-400 shrink-0" />
              <span className="hidden sm:inline">Add Subject</span>
              <span className="sm:hidden">Add</span>
            </button>

          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-3.5 sm:px-6 lg:px-8 py-5 sm:py-8 space-y-5 sm:space-y-6">
        
        {/* Search and Level Filter Strip */}
        <section className="bg-white dark:bg-slate-800/90 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-700/80 p-3.5 sm:p-5 shadow-xs space-y-3.5">
          
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Search by subject name or code (e.g. MATH, BDT, Science)..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-9 py-2.5 text-xs sm:text-sm font-medium border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50/50 dark:bg-slate-900/50 text-slate-900 dark:text-white placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-[#003B5C] transition-all"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Total Badge */}
            <div className="flex items-center justify-between sm:justify-end gap-2 text-xs font-mono font-bold text-slate-500 dark:text-slate-400 shrink-0">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/70 dark:border-slate-700">
                <BookOpen className="w-3.5 h-3.5 text-[#003B5C] dark:text-blue-400" />
                <span>{filteredSubjects.length} of {subjects.length} Subjects</span>
              </span>
            </div>
          </div>

          {/* Level Filter Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 no-scrollbar text-xs font-bold select-none">
            {[
              { value: '', label: 'All Levels' },
              { value: 'kindergarten', label: 'Kindergarten' },
              { value: 'lower_primary', label: 'Lower Primary' },
              { value: 'upper_primary', label: 'Upper Primary' },
              { value: 'jhs', label: 'Junior High (JHS)' },
            ].map((tab) => {
              const isActive = activeLevel === tab.value
              return (
                <button
                  key={tab.value}
                  type="button"
                  onClick={() => setActiveLevel(tab.value)}
                  className={`px-3 py-1.5 rounded-xl whitespace-nowrap transition-all duration-150 active:scale-95 ${
                    isActive
                      ? 'bg-[#003B5C] text-white shadow-xs dark:bg-blue-600'
                      : 'bg-slate-100/80 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-700/60'
                  }`}
                >
                  {tab.label}
                </button>
              )
            })}
          </div>
        </section>

        {/* Subjects Grid Area */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-5">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="bg-white dark:bg-slate-800/90 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-700/80 p-5 space-y-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <Skeleton className="h-10 w-10 rounded-2xl" />
                  <Skeleton className="h-5 w-20 rounded-md" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-5 w-3/4 rounded-md" />
                  <Skeleton className="h-4 w-full rounded-md" />
                </div>
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
                  <Skeleton className="h-8 w-16 rounded-lg" />
                  <Skeleton className="h-8 w-16 rounded-lg" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredSubjects.length === 0 ? (
          <div className="bg-white dark:bg-slate-800/90 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-700/80 p-10 sm:p-14 text-center space-y-3 shadow-xs">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
              <BookOpen className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                {searchTerm || activeLevel ? 'No matching subjects found' : 'No subjects enrolled yet'}
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                {searchTerm || activeLevel
                  ? 'Try modifying your search keywords or switching stage filter tabs.'
                  : 'Get started by creating official Ghana Education Service (GES) learning subjects.'}
              </p>
            </div>
            {searchTerm || activeLevel ? (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm('')
                  setActiveLevel('')
                }}
                className="text-xs font-bold text-[#003B5C] dark:text-blue-400 hover:underline pt-1"
              >
                Clear Filters
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  resetForm()
                  setShowAddModal(true)
                }}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#003B5C] hover:bg-[#002a42] text-white rounded-xl text-xs font-bold transition active:scale-95 shadow-sm"
              >
                <Plus className="w-4 h-4 text-amber-400" />
                <span>Add First Subject</span>
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-5">
            {filteredSubjects.map((subject) => {
              const levelMeta = subject.level ? LEVEL_CONFIG[subject.level] : null

              return (
                <div
                  key={subject.id}
                  className="group bg-white dark:bg-slate-800/90 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-700/80 p-4 sm:p-5 shadow-xs hover:shadow-md hover:border-[#003B5C]/30 dark:hover:border-blue-500/30 transition-all duration-200 flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    
                    {/* Top Row: Code Badge & Level Pill */}
                    <div className="flex items-center justify-between gap-2">
                      <span className="px-2.5 py-1 rounded-lg bg-[#003B5C] text-white font-mono font-black text-xs tracking-wider shadow-2xs">
                        {subject.code}
                      </span>

                      {levelMeta ? (
                        <span className={`px-2 py-0.5 rounded-lg border text-[10px] font-bold ${levelMeta.color}`}>
                          {levelMeta.badge}
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 text-[10px] font-medium border border-slate-200 dark:border-slate-700">
                          General
                        </span>
                      )}
                    </div>

                    {/* Title & Description */}
                    <div className="space-y-1">
                      <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight group-hover:text-[#003B5C] dark:group-hover:text-blue-400 transition-colors line-clamp-1">
                        {subject.name}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                        {subject.description || 'Standard Ghana Education Service basic school curriculum course.'}
                      </p>
                    </div>

                  </div>

                  {/* Actions Bottom Bar */}
                  <div className="pt-3.5 mt-3.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                    <span className="text-[10px] text-slate-400 font-mono">
                      ID: {subject.id.slice(0, 8)}
                    </span>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => openEditModal(subject)}
                        className="p-1.5 sm:px-2.5 sm:py-1 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-[#003B5C] transition text-xs font-semibold flex items-center gap-1"
                        title="Edit Subject"
                        aria-label="Edit Subject"
                      >
                        <Edit3 className="w-3.5 h-3.5 text-amber-500" />
                        <span className="hidden sm:inline">Edit</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => openDeleteModal(subject)}
                        className="p-1.5 sm:px-2.5 sm:py-1 rounded-lg text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition text-xs font-semibold flex items-center gap-1"
                        title="Delete Subject"
                        aria-label="Delete Subject"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Delete</span>
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

      </main>

      {/* Add Subject Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
          <div 
            className="bg-white dark:bg-slate-800 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-700 max-w-lg w-full max-h-[92vh] overflow-y-auto shadow-2xl p-5 sm:p-7 space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#003B5C]/10 text-[#003B5C] dark:text-blue-300 flex items-center justify-center">
                  <BookOpen className="w-4 h-4" />
                </div>
                <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight">
                  Add New Subject
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowAddModal(false)
                  resetForm()
                }}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAdd} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Subject Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Mathematics, Integrated Science, Fante"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-base sm:text-sm font-medium border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50/50 dark:bg-slate-900/50 text-slate-900 dark:text-white placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-[#003B5C] transition"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Subject Code <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. MATH, SCI, CAD"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    className="w-full px-3.5 py-2.5 text-base sm:text-sm font-mono font-bold uppercase border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50/50 dark:bg-slate-900/50 text-slate-900 dark:text-white placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-[#003B5C] transition"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Stage Allocation
                  </label>
                  <select
                    value={formData.level}
                    onChange={(e) => setFormData({ ...formData, level: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-base sm:text-sm font-medium border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50/50 dark:bg-slate-900/50 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-[#003B5C] transition cursor-pointer"
                  >
                    <option value="">-- All School Levels --</option>
                    <option value="kindergarten">Kindergarten (KG 1 - 2)</option>
                    <option value="lower_primary">Lower Primary (Basic 1 - 3)</option>
                    <option value="upper_primary">Upper Primary (Basic 4 - 6)</option>
                    <option value="jhs">Junior High School (JHS 1 - 3)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Curriculum Description
                </label>
                <textarea
                  rows={3}
                  placeholder="Outline syllabus content, core assessment objectives, or department notes..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-base sm:text-sm font-medium border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50/50 dark:bg-slate-900/50 text-slate-900 dark:text-white placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-[#003B5C] resize-none transition"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false)
                    resetForm()
                  }}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs sm:text-sm font-bold hover:bg-slate-50 dark:hover:bg-slate-700 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[#003B5C] hover:bg-[#002a42] text-white rounded-xl text-xs sm:text-sm font-bold shadow-sm transition active:scale-95 disabled:opacity-50"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>Add Subject</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Subject Modal */}
      {showEditModal && selectedSubject && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
          <div 
            className="bg-white dark:bg-slate-800 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-700 max-w-lg w-full max-h-[92vh] overflow-y-auto shadow-2xl p-5 sm:p-7 space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                  <Edit3 className="w-4 h-4" />
                </div>
                <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight">
                  Edit Subject: {selectedSubject.code}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowEditModal(false)
                  resetForm()
                }}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Subject Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-base sm:text-sm font-medium border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50/50 dark:bg-slate-900/50 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-[#003B5C] transition"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Subject Code <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    className="w-full px-3.5 py-2.5 text-base sm:text-sm font-mono font-bold uppercase border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50/50 dark:bg-slate-900/50 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-[#003B5C] transition"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Stage Allocation
                  </label>
                  <select
                    value={formData.level}
                    onChange={(e) => setFormData({ ...formData, level: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-base sm:text-sm font-medium border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50/50 dark:bg-slate-900/50 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-[#003B5C] transition cursor-pointer"
                  >
                    <option value="">-- All School Levels --</option>
                    <option value="kindergarten">Kindergarten (KG 1 - 2)</option>
                    <option value="lower_primary">Lower Primary (Basic 1 - 3)</option>
                    <option value="upper_primary">Upper Primary (Basic 4 - 6)</option>
                    <option value="jhs">Junior High School (JHS 1 - 3)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Curriculum Description
                </label>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-base sm:text-sm font-medium border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50/50 dark:bg-slate-900/50 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-[#003B5C] resize-none transition"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false)
                    resetForm()
                  }}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs sm:text-sm font-bold hover:bg-slate-50 dark:hover:bg-slate-700 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[#003B5C] hover:bg-[#002a42] text-white rounded-xl text-xs sm:text-sm font-bold shadow-sm transition active:scale-95 disabled:opacity-50"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Saving Changes...</span>
                    </>
                  ) : (
                    <span>Save Changes</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedSubject && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
          <div 
            className="bg-white dark:bg-slate-800 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-700 max-w-md w-full p-5 sm:p-7 space-y-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto shadow-inner ring-8 ring-rose-500/10">
              <AlertCircle className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1.5">
              <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight">
                Delete Curriculum Subject
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                Are you sure you want to remove <strong>{selectedSubject.name}</strong> (<span className="font-mono font-bold text-slate-700 dark:text-slate-200">{selectedSubject.code}</span>)? This will permanently delete course records if unattached to classes.
              </p>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteModal(false)
                  resetForm()
                }}
                className="w-full sm:w-1/2 py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs sm:text-sm font-bold hover:bg-slate-50 dark:hover:bg-slate-700 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={saving}
                className="w-full sm:w-1/2 inline-flex items-center justify-center gap-2 py-2.5 px-4 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-sm transition active:scale-95 disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <span>Confirm Delete</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}