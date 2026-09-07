'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Palette, Plus, Edit3, Trash2, Users, Search,
  PlusCircle, AlertTriangle, X, Check, Shield,
  LayoutGrid, List, ChevronRight, ArrowLeft
} from 'lucide-react'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'
import { getCurrentUser } from '@/lib/auth'
import { SectionBadge } from '@/components/sections/SectionBadge'
import { Skeleton } from '@/components/ui/skeleton'
import BackButton from '@/components/ui/back-button'
import { toast } from 'react-hot-toast'

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

const DEFAULT_COLOURS = [
  '#003B5C', '#EF4444', '#F97316', '#EAB308',
  '#22C55E', '#3B82F6', '#EC4899', '#14B8A6'
]

export default function SectionsPage() {
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()
  const [sections, setSections] = useState<Section[]>([])
  const [loading, setLoading] = useState(true)

  // Modal state
  const [showModal, setShowModal] = useState(false)
  const [editingSection, setEditingSection] = useState<Section | null>(null)
  const [saving, setSaving] = useState(false)

  // Form state
  const [formName, setFormName] = useState('')
  const [formColour, setFormColour] = useState(DEFAULT_COLOURS[0])
  const [formEmblem, setFormEmblem] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formSortOrder, setFormSortOrder] = useState(0)

  // Delete modal
  const [deleteSection, setDeleteSection] = useState<Section | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Distribute state
  const [distributing, setDistributing] = useState(false)
  const [unassignedCount, setUnassignedCount] = useState<number | null>(null)

  async function loadSections() {
    setLoading(true)
    const { data } = await supabase
      .from('sections')
      .select('*')
      .order('sort_order')
      .order('name')

    if (data) {
      // Get student counts for each section (only active students)
      const sectionsWithCounts = await Promise.all(
        data.map(async (sec: Section) => {
          const { data: ssData } = await supabase
            .from('student_sections')
            .select('student_id')
            .eq('section_id', sec.id)

          let activeCount = 0
          if (ssData && ssData.length > 0) {
            const studentIds = ssData.map((s: { student_id: string }) => s.student_id)
            const { count } = await supabase
              .from('students')
              .select('id', { count: 'exact', head: true })
              .in('id', studentIds)
              .eq('status', 'active')
            activeCount = count || 0
          }
          return { ...sec, student_count: activeCount }
        })
      )
      setSections(sectionsWithCounts)

      // Calculate unassigned students count for Distribute button (only active students)
      const { data: assignedData } = await supabase
        .from('student_sections')
        .select('student_id')
      const allAssignedIds = (assignedData || []).map((s: { student_id: string }) => s.student_id)
      
      let activeAssignedCount = 0
      if (allAssignedIds.length > 0) {
        const { count: activeAssigned } = await supabase
          .from('students')
          .select('id', { count: 'exact', head: true })
          .in('id', allAssignedIds)
          .eq('status', 'active')
        activeAssignedCount = activeAssigned || 0
      }
      const { count: totalActive } = await supabase
        .from('students')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'active')
      setUnassignedCount(totalActive ? totalActive - activeAssignedCount : 0)
    }
    setLoading(false)
  }

  useEffect(() => {
    loadSections()
  }, [])

  function openAddModal() {
    setEditingSection(null)
    setFormName('')
    setFormColour(DEFAULT_COLOURS[0])
    setFormEmblem('')
    setFormDescription('')
    setFormSortOrder(sections.length)
    setShowModal(true)
  }

  function openEditModal(section: Section) {
    setEditingSection(section)
    setFormName(section.name)
    setFormColour(section.colour)
    setFormEmblem(section.emblem_url || '')
    setFormDescription(section.description || '')
    setFormSortOrder(section.sort_order)
    setShowModal(true)
  }

  async function handleSave() {
    if (!formName.trim()) {
      toast.error('Section name is required')
      return
    }

    setSaving(true)
    try {
      const payload = {
        name: formName.trim(),
        colour: formColour,
        emblem_url: formEmblem.trim() || null,
        description: formDescription.trim() || null,
        sort_order: formSortOrder
      }

      if (editingSection) {
        const { error } = await supabase
          .from('sections')
          .update(payload)
          .eq('id', editingSection.id)

        if (error) throw error
        toast.success('Section updated successfully')
      } else {
        const { error } = await supabase
          .from('sections')
          .insert([payload])

        if (error) {
          if (error.code === '23505') {
            toast.error('A section with this name already exists')
          } else {
            throw error
          }
          return
        }
        toast.success('Section added successfully')
      }

      setShowModal(false)
      loadSections()
    } catch (error: any) {
      toast.error(error.message || 'Failed to save section')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!deleteSection) return

    if (deleteSection.student_count && deleteSection.student_count > 0) {
      toast.error(
        `Cannot delete "${deleteSection.name}" — it has ${deleteSection.student_count} students assigned. Reassign them first.`
      )
      setDeleteSection(null)
      return
    }

    setDeleting(true)
    try {
      const { error } = await supabase
        .from('sections')
        .delete()
        .eq('id', deleteSection.id)

      if (error) throw error

      toast.success('Section deleted')
      setDeleteSection(null)
      loadSections()
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete section')
    } finally {
      setDeleting(false)
    }
  }

  async function toggleActive(section: Section) {
    const { error } = await supabase
      .from('sections')
      .update({ is_active: !section.is_active })
      .eq('id', section.id)

    if (error) {
      toast.error(error.message)
    } else {
      toast.success(`Section ${section.is_active ? 'deactivated' : 'activated'}`)
      loadSections()
    }
  }

  async function distributeRemaining() {
    const active = sections.filter(s => s.is_active)
    if (active.length === 0) {
      toast.error('No active sections to distribute students into')
      return
    }

    setDistributing(true)
    try {
      const { data: assignedData } = await supabase
        .from('student_sections')
        .select('student_id')

      const assignedIds = (assignedData || []).map((s: { student_id: string }) => s.student_id)

      let query = supabase.from('students').select('id').eq('status', 'active')

      if (assignedIds.length > 0) {
        query = query.not('id', 'in', `(${assignedIds.join(',')})`)
      }

      const { data: unassignedStudents } = await query

      if (!unassignedStudents || unassignedStudents.length === 0) {
        toast.success('All students are already assigned to sections!')
        setDistributing(false)
        return
      }

      const sectionCounts = await Promise.all(
        active.map(async (sec: Section) => {
          const { data: ssData } = await supabase
            .from('student_sections')
            .select('student_id')
            .eq('section_id', sec.id)

          let activeCount = 0
          if (ssData && ssData.length > 0) {
            const studentIds = ssData.map((s: { student_id: string }) => s.student_id)
            const { count } = await supabase
              .from('students')
              .select('id', { count: 'exact', head: true })
              .in('id', studentIds)
              .eq('status', 'active')
            activeCount = count || 0
          }
          return { id: sec.id, count: activeCount }
        })
      )

      const assignments = unassignedStudents.map((student: { id: string }) => {
        sectionCounts.sort((a, b) => a.count - b.count)
        const target = sectionCounts[0]
        target.count++
        return { student_id: student.id, section_id: target.id }
      })

      const { error } = await supabase
        .from('student_sections')
        .upsert(assignments, { onConflict: 'student_id' })

      if (error) throw error

      toast.success(`Successfully assigned ${assignments.length} students across ${active.length} sections!`)
      loadSections()
    } catch (error: any) {
      toast.error(error.message || 'Failed to distribute students')
    } finally {
      setDistributing(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 sm:p-6 lg:p-8 space-y-6">
        <Skeleton className="h-10 w-48 sm:w-64 mb-2" />
        <Skeleton className="h-5 w-72 sm:w-96 mb-6" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-48 rounded-2xl" />
          ))}
        </div>
      </div>
    )
  }

  const activeSections = sections.filter(s => s.is_active)
  const inactiveSections = sections.filter(s => !s.is_active)

  return (
    <div className="min-h-screen bg-gray-50/50 dark:bg-gray-900 pb-20">
      <div className="max-w-[1400px] mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-6 sm:space-y-8">
        
        {/* Header Banner */}
        <div className="bg-white dark:bg-gray-800 p-5 sm:p-7 md:p-8 rounded-2xl sm:rounded-3xl shadow-[0_2px_20px_-4px_rgba(0,0,0,0.05)] border border-gray-100 dark:border-gray-700 flex flex-col md:flex-row md:items-center justify-between gap-4 relative overflow-hidden">
          <div className="absolute right-0 top-0 w-64 h-full bg-gradient-to-l from-[#003B5C]/10 to-transparent pointer-events-none"></div>

          <div className="flex items-start sm:items-center gap-3.5 sm:gap-4 relative z-10">
            <BackButton href="/admin/dashboard" className="shrink-0 mt-0.5 sm:mt-0 shadow-sm" />
            <div>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-gray-900 dark:text-white tracking-tight flex items-center gap-2.5">
                <Palette className="w-6 h-6 sm:w-8 sm:h-8 text-[#003B5C] dark:text-blue-400 shrink-0" />
                <span>School Sections</span>
              </h1>
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 font-medium mt-0.5">
                Manage student houses/sections with colour-coded identification and balanced assignments
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 w-full md:w-auto relative z-10">
            <button
              onClick={distributeRemaining}
              disabled={distributing || activeSections.length === 0 || unassignedCount === 0}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white dark:bg-gray-700 
                         text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-600 
                         rounded-xl hover:bg-gray-50 dark:hover:bg-gray-600 
                         disabled:opacity-50 disabled:cursor-not-allowed
                         transition-all font-bold text-xs sm:text-sm shadow-sm active:scale-95"
            >
              {distributing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-[#003B5C] border-t-transparent"></div>
                  <span>Distributing...</span>
                </>
              ) : (
                <>
                  <Users className="w-4 h-4 text-[#003B5C] dark:text-blue-400 shrink-0" />
                  <span>Distribute Remaining</span>
                  {unassignedCount !== null && unassignedCount > 0 && (
                    <span className="ml-1 text-[10px] bg-[#003B5C]/10 dark:bg-[#003B5C]/30 text-[#003B5C] dark:text-blue-300 px-2 py-0.5 rounded-full font-black">
                      {unassignedCount}
                    </span>
                  )}
                </>
              )}
            </button>

            <button
              onClick={openAddModal}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[#003B5C] hover:bg-[#002a42] 
                         text-white rounded-xl shadow-md hover:shadow-lg hover:shadow-[#003B5C]/20
                         transition-all font-bold text-xs sm:text-sm active:scale-95 shrink-0"
            >
              <PlusCircle className="w-4 h-4 shrink-0" />
              <span>Add Section</span>
            </button>
          </div>
        </div>

        {/* Stats Grid: 2 columns on phone, 4 on tablet/desktop */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 sm:p-5 border border-gray-100 dark:border-gray-700 shadow-sm flex flex-col justify-between">
            <p className="text-[10px] sm:text-xs text-gray-400 uppercase tracking-widest font-black">Total Sections</p>
            <p className="text-xl sm:text-2xl lg:text-3xl font-black text-gray-900 dark:text-white mt-1.5">{sections.length}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 sm:p-5 border border-gray-100 dark:border-gray-700 shadow-sm flex flex-col justify-between">
            <p className="text-[10px] sm:text-xs text-gray-400 uppercase tracking-widest font-black">Active Sections</p>
            <p className="text-xl sm:text-2xl lg:text-3xl font-black text-emerald-600 dark:text-emerald-400 mt-1.5">{activeSections.length}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 sm:p-5 border border-gray-100 dark:border-gray-700 shadow-sm flex flex-col justify-between">
            <p className="text-[10px] sm:text-xs text-gray-400 uppercase tracking-widest font-black">Assigned Students</p>
            <p className="text-xl sm:text-2xl lg:text-3xl font-black text-gray-900 dark:text-white mt-1.5">
              {sections.reduce((sum, s) => sum + (s.student_count || 0), 0)}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 sm:p-5 border border-gray-100 dark:border-gray-700 shadow-sm flex flex-col justify-between">
            <p className="text-[10px] sm:text-xs text-gray-400 uppercase tracking-widest font-black">Avg Per Section</p>
            <p className="text-xl sm:text-2xl lg:text-3xl font-black text-[#003B5C] dark:text-blue-400 mt-1.5">
              {activeSections.length > 0
                ? Math.round(sections.reduce((sum, s) => sum + (s.student_count || 0), 0) / activeSections.length)
                : 0}
            </p>
          </div>
        </div>

        {/* Active Sections */}
        {activeSections.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-base sm:text-lg font-black text-gray-800 dark:text-gray-200 flex items-center gap-2">
              <Shield className="w-5 h-5 text-[#003B5C] dark:text-blue-400" />
              <span>Active Sections ({activeSections.length})</span>
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5 md:gap-6">
              {activeSections.map((section) => (
                <SectionCard
                  key={section.id}
                  section={section}
                  onViewStudents={() => router.push('/admin/sections/' + section.id)}
                  onEdit={() => openEditModal(section)}
                  onDelete={() => setDeleteSection(section)}
                  onToggleActive={() => toggleActive(section)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Inactive Sections */}
        {inactiveSections.length > 0 && (
          <div className="space-y-4 pt-2">
            <h2 className="text-sm sm:text-base font-black text-gray-400 dark:text-gray-500 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              <span>Inactive Sections ({inactiveSections.length})</span>
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5 md:gap-6 opacity-65">
              {inactiveSections.map((section) => (
                <SectionCard
                  key={section.id}
                  section={section}
                  onViewStudents={() => router.push('/admin/sections/' + section.id)}
                  onEdit={() => openEditModal(section)}
                  onDelete={() => setDeleteSection(section)}
                  onToggleActive={() => toggleActive(section)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {sections.length === 0 && (
          <div className="text-center py-16 sm:py-20">
            <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 sm:p-12 border border-dashed border-gray-200 dark:border-gray-700 max-w-lg mx-auto shadow-sm">
              <Palette className="w-14 h-14 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
              <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-gray-200 mb-1.5">No Sections Yet</h3>
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mb-6 leading-relaxed">
                Create sections (such as houses or teams) to enable balanced, automatic student distribution.
              </p>
              <button
                onClick={openAddModal}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#003B5C] hover:bg-[#002a42] text-white rounded-xl font-bold text-xs sm:text-sm transition-all shadow-md active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>Create First Section</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add / Edit Modal: Bottom Drawer on Phone, Centered on Tablet/Desktop */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-gray-800 rounded-t-3xl sm:rounded-2xl max-w-lg w-full shadow-2xl max-h-[92vh] sm:max-h-[90vh] flex flex-col overflow-hidden border-t sm:border border-gray-100 dark:border-gray-700">
            
            {/* Modal Header */}
            <div className="p-4 sm:p-6 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between shrink-0 bg-gray-50/70 dark:bg-gray-800/80">
              <h3 className="text-base sm:text-lg font-black text-gray-900 dark:text-white flex items-center gap-2">
                {editingSection ? (
                  <><Edit3 className="w-5 h-5 text-[#003B5C] dark:text-blue-400" /> Edit Section</>
                ) : (
                  <><PlusCircle className="w-5 h-5 text-[#003B5C] dark:text-blue-400" /> Add Section</>
                )}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl text-gray-400 hover:text-gray-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-6 space-y-4 sm:space-y-5 overflow-y-auto flex-1">
              
              {/* Preview Badge */}
              <div className="flex justify-center py-1">
                <div
                  className="inline-flex items-center gap-2.5 px-5 py-2.5 rounded-full text-sm sm:text-base font-black shadow-sm"
                  style={{
                    backgroundColor: formColour + '18',
                    color: formColour,
                    border: `2px solid ${formColour}40`
                  }}
                >
                  <span
                    className="w-3.5 h-3.5 rounded-full shadow-sm"
                    style={{ backgroundColor: formColour }}
                  />
                  <span>{formName || 'Section Name'}</span>
                </div>
              </div>

              {/* Name */}
              <div>
                <label className="block text-xs font-black uppercase text-gray-500 dark:text-gray-400 mb-1 tracking-wider">
                  Section Name *
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  placeholder="e.g. Red House, Gold Coast"
                  className="w-full px-3.5 py-2.5 text-sm border border-gray-200 dark:border-gray-600 rounded-xl 
                             bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                             focus:ring-2 focus:ring-[#003B5C]/20 focus:border-[#003B5C] outline-none"
                />
              </div>

              {/* Colour Picker */}
              <div>
                <label className="block text-xs font-black uppercase text-gray-500 dark:text-gray-400 mb-1.5 tracking-wider">
                  Section Colour
                </label>
                <div className="flex flex-wrap gap-2.5 mb-3">
                  {DEFAULT_COLOURS.map((colour) => (
                    <button
                      key={colour}
                      type="button"
                      onClick={() => setFormColour(colour)}
                      className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl transition-all ${
                        formColour === colour
                          ? 'ring-2 ring-offset-2 ring-[#003B5C] dark:ring-offset-gray-800 scale-110 shadow-md'
                          : 'hover:scale-105 shadow-sm'
                      }`}
                      style={{ backgroundColor: colour }}
                    />
                  ))}
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={formColour}
                    onChange={e => setFormColour(e.target.value)}
                    className="w-10 h-10 rounded-xl cursor-pointer border border-gray-200 dark:border-gray-600 bg-transparent"
                  />
                  <input
                    type="text"
                    value={formColour}
                    onChange={e => setFormColour(e.target.value)}
                    className="flex-1 px-3 py-2 text-xs sm:text-sm font-mono border border-gray-200 dark:border-gray-600 
                               rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                               focus:ring-2 focus:ring-[#003B5C]/20 focus:border-[#003B5C] outline-none"
                    placeholder="#HEX"
                  />
                </div>
              </div>

              {/* Emblem URL */}
              <div>
                <label className="block text-xs font-black uppercase text-gray-500 dark:text-gray-400 mb-1 tracking-wider">
                  Emblem URL (optional)
                </label>
                <input
                  type="text"
                  value={formEmblem}
                  onChange={e => setFormEmblem(e.target.value)}
                  placeholder="https://example.com/emblem.png"
                  className="w-full px-3.5 py-2.5 text-sm border border-gray-200 dark:border-gray-600 rounded-xl
                             bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                             focus:ring-2 focus:ring-[#003B5C]/20 focus:border-[#003B5C] outline-none"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-black uppercase text-gray-500 dark:text-gray-400 mb-1 tracking-wider">
                  Description (optional)
                </label>
                <textarea
                  value={formDescription}
                  onChange={e => setFormDescription(e.target.value)}
                  rows={2}
                  placeholder="e.g. Discipline with Integrity"
                  className="w-full px-3.5 py-2.5 text-sm border border-gray-200 dark:border-gray-600 rounded-xl
                             bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                             focus:ring-2 focus:ring-[#003B5C]/20 focus:border-[#003B5C] outline-none resize-none"
                />
              </div>

              {/* Sort Order */}
              <div>
                <label className="block text-xs font-black uppercase text-gray-500 dark:text-gray-400 mb-1 tracking-wider">
                  Sort Order
                </label>
                <input
                  type="number"
                  value={formSortOrder}
                  onChange={e => setFormSortOrder(parseInt(e.target.value) || 0)}
                  min={0}
                  className="w-28 px-3.5 py-2 border border-gray-200 dark:border-gray-600 rounded-xl
                             bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm font-semibold
                             focus:ring-2 focus:ring-[#003B5C]/20 focus:border-[#003B5C] outline-none"
                />
              </div>
            </div>

            {/* Modal Actions */}
            <div className="p-4 sm:p-6 border-t border-gray-100 dark:border-gray-700 flex flex-col-reverse sm:flex-row justify-end gap-2.5 bg-gray-50/70 dark:bg-gray-800/80 shrink-0">
              <button
                onClick={() => setShowModal(false)}
                className="w-full sm:w-auto px-4 py-2.5 text-xs sm:text-sm font-bold text-gray-700 dark:text-gray-300 
                           bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 
                           rounded-xl hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !formName.trim()}
                className="w-full sm:w-auto px-5 py-2.5 text-xs sm:text-sm font-bold text-white
                           bg-[#003B5C] hover:bg-[#002a42] rounded-xl shadow-md
                           disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95"
              >
                {saving ? 'Saving...' : editingSection ? 'Save Changes' : 'Add Section'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteSection && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-gray-800 rounded-t-3xl sm:rounded-2xl max-w-md w-full shadow-2xl p-5 sm:p-6">
            <div className="flex items-center gap-3 text-rose-600 mb-3.5">
              <div className="p-2 bg-rose-50 dark:bg-rose-900/30 rounded-xl shrink-0">
                <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">Delete Section?</h3>
            </div>

            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 mb-3">
              Are you sure you want to delete <strong className="text-gray-900 dark:text-white">{deleteSection.name}</strong>?
            </p>

            {deleteSection.student_count && deleteSection.student_count > 0 ? (
              <div className="bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-xl p-3 mb-4">
                <p className="text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2 leading-relaxed">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>
                    This section has <strong>{deleteSection.student_count}</strong> students assigned.
                    You must reassign them to another section first before deleting.
                  </span>
                </p>
              </div>
            ) : (
              <p className="text-xs text-gray-400 mb-4">This action cannot be undone.</p>
            )}

            <div className="flex flex-col-reverse sm:flex-row justify-end gap-2.5 pt-2">
              <button
                onClick={() => setDeleteSection(null)}
                className="w-full sm:w-auto px-4 py-2.5 text-xs font-bold text-gray-700 dark:text-gray-300 
                           bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 
                           rounded-xl transition-colors"
              >
                Cancel
              </button>
              {(!deleteSection.student_count || deleteSection.student_count === 0) && (
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="w-full sm:w-auto px-5 py-2.5 text-xs font-bold text-white bg-rose-600 
                             rounded-xl hover:bg-rose-700 disabled:opacity-50 transition-colors shadow-sm"
                >
                  {deleting ? 'Deleting...' : 'Confirm Delete'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ============================
// SECTION CARD COMPONENT
// ============================
function SectionCard({
  section,
  onViewStudents,
  onEdit,
  onDelete,
  onToggleActive
}: {
  section: Section
  onViewStudents: () => void
  onEdit: () => void
  onDelete: () => void
  onToggleActive: () => void
}) {
  return (
    <div
      className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 
                 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden group flex flex-col justify-between"
      onClick={onViewStudents}
    >
      <div>
        {/* Colour Accent Stripe */}
        <div className="h-2 w-full" style={{ backgroundColor: section.colour }} />

        <div className="p-4 sm:p-5">
          {/* Header Row */}
          <div className="flex items-center justify-between gap-2 mb-3">
            <SectionBadge
              section={section}
              size="lg"
              className="text-sm sm:text-base font-bold truncate"
            />
            {/* Action buttons visible on mobile, hover on desktop */}
            <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity shrink-0">
              <button
                onClick={(e) => { e.stopPropagation(); onEdit(); }}
                className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-500 hover:text-[#003B5C] dark:hover:text-blue-400 transition-colors"
                title="Edit"
              >
                <Edit3 className="w-4 h-4" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onDelete(); }}
                className="p-1.5 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg text-gray-500 hover:text-rose-600 transition-colors"
                title="Delete"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Description */}
          {section.description && (
            <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mb-3 leading-relaxed">
              {section.description}
            </p>
          )}
        </div>
      </div>

      {/* Card Footer */}
      <div className="px-4 sm:px-5 pb-4 pt-3 border-t border-gray-50 dark:border-gray-750 flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-300">
          <Users className="w-3.5 h-3.5 text-gray-400 shrink-0" />
          <span className="font-bold text-gray-900 dark:text-white">
            {section.student_count || 0}
          </span>
          <span className="text-gray-400">students</span>
        </div>

        <button
          onClick={(e) => { e.stopPropagation(); onToggleActive(); }}
          className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full transition-colors ${
            section.is_active
              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 hover:bg-emerald-100'
              : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200'
          }`}
        >
          {section.is_active ? 'Active' : 'Inactive'}
        </button>
      </div>
    </div>
  )
}