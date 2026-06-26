'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Palette, Plus, Edit3, Trash2, Users, Search,
  PlusCircle, AlertTriangle, X, Check, Shield,
  LayoutGrid, List
} from 'lucide-react'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'
import { getCurrentUser } from '@/lib/auth'
import { SectionBadge } from '@/components/sections/SectionBadge'
import { Skeleton } from '@/components/ui/skeleton'
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
  '#EF4444', '#F97316', '#EAB308', '#22C55E',
  '#3B82F6', '#8B5CF6', '#EC4899', '#14B8A6'
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
            .from("student_sections")
            .select("student_id")
            .eq("section_id", sec.id)

          let activeCount = 0
          if (ssData && ssData.length > 0) {
            const studentIds = ssData.map((s: { student_id: string }) => s.student_id)
            const { count } = await supabase
              .from("students")
              .select("id", { count: "exact", head: true })
              .in("id", studentIds)
              .eq("status", "active")
            activeCount = count || 0
          }
          return { ...sec, student_count: activeCount }
        })
      )
      setSections(sectionsWithCounts)

            // Calculate unassigned students count for Distribute button (only active students)
      const { data: assignedData } = await supabase
        .from("student_sections")
        .select("student_id")
      const allAssignedIds = (assignedData || []).map((s: { student_id: string }) => s.student_id)
      // Only count assignments belonging to active students
      let activeAssignedCount = 0
      if (allAssignedIds.length > 0) {
        const { count: activeAssigned } = await supabase
          .from("students")
          .select("id", { count: "exact", head: true })
          .in("id", allAssignedIds)
          .eq("status", "active")
        activeAssignedCount = activeAssigned || 0
      }
      const { count: totalActive } = await supabase
        .from("students")
        .select("id", { count: "exact", head: true })
        .eq("status", "active")
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

    // Check if section has students
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
      // First get all student IDs that already have section assignments
      const { data: assignedData } = await supabase
        .from('student_sections')
        .select('student_id')

      const assignedIds = (assignedData || []).map((s: { student_id: string }) => s.student_id)

      // Then get students whose IDs are NOT in the assigned list
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

            // Get current counts for each active section (only active students)
      const sectionCounts = await Promise.all(
        active.map(async (sec: Section) => {
          const { data: ssData } = await supabase
            .from("student_sections")
            .select("student_id")
            .eq("section_id", sec.id)

          let activeCount = 0
          if (ssData && ssData.length > 0) {
            const studentIds = ssData.map((s: { student_id: string }) => s.student_id)
            const { count } = await supabase
              .from("students")
              .select("id", { count: "exact", head: true })
              .in("id", studentIds)
              .eq("status", "active")
            activeCount = count || 0
          }
          return { id: sec.id, count: activeCount }
        })
      )

      // Distribute students round-robin to the section with fewest students
      const assignments = unassignedStudents.map((student: { id: string }) => {
        sectionCounts.sort((a, b) => a.count - b.count)
        const target = sectionCounts[0]
        target.count++ // Increment for next assignment
        return { student_id: student.id, section_id: target.id }
      })

      // Bulk insert all assignments
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
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6 space-y-6">
        <Skeleton className="h-10 w-1/3 mb-2" />
        <Skeleton className="h-5 w-1/2 mb-6" />
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
              <Palette className="w-7 h-7 text-purple-600" />
              School Sections
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Manage student houses/sections with colour-coded identification and balanced assignment
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={distributeRemaining}
              disabled={distributing || activeSections.length === 0 || unassignedCount === 0}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-gray-800 
                         text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600 
                         rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 
                         disabled:opacity-50 disabled:cursor-not-allowed
                         transition-all font-medium text-sm shadow-sm"
            >
              {distributing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-600"></div>
                  Distributing...
                </>
              ) : (
                <>
                  <Users className="w-4 h-4 text-purple-500" />
                  Distribute Remaining
                  {unassignedCount !== null && unassignedCount > 0 && (
                    <span className="ml-1 text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 px-1.5 py-0.5 rounded-full font-bold">
                      {unassignedCount}
                    </span>
                  )}
                </>
              )}
            </button>
            <button
              onClick={openAddModal}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 
                         text-white rounded-xl hover:shadow-lg hover:shadow-purple-500/25 hover:-translate-y-0.5 
                         transition-all font-semibold text-sm shadow-md"
            >
              <PlusCircle className="w-4 h-4" />
              Add Section
            </button>
          </div>
        </div>

        {/* Stats Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700 shadow-sm">
            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider font-medium">Total Sections</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{sections.length}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700 shadow-sm">
            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider font-medium">Active</p>
            <p className="text-2xl font-bold text-green-600 mt-1">{activeSections.length}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700 shadow-sm">
            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider font-medium">Total Students</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
              {sections.reduce((sum, s) => sum + (s.student_count || 0), 0)}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700 shadow-sm">
            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider font-medium">Avg Per Section</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
              {activeSections.length > 0
                ? Math.round(sections.reduce((sum, s) => sum + (s.student_count || 0), 0) / activeSections.length)
                : 0}
            </p>
          </div>
        </div>

        {/* Sections Grid */}
        {activeSections.length > 0 && (
          <div>
            <h2 className="text-lg font-bold text-gray-800 dark:text-gray-200 mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5 text-purple-500" />
              Active Sections
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
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
          <div>
            <h2 className="text-lg font-bold text-gray-500 dark:text-gray-400 mb-4 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Inactive Sections ({inactiveSections.length})
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 opacity-60">
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

        {sections.length === 0 && (
          <div className="text-center py-20">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-12 border border-dashed border-gray-200 dark:border-gray-700 max-w-lg mx-auto">
              <Palette className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-200 mb-2">No Sections Yet</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                Create your first section — like a house or team — and students will be automatically assigned to balance the numbers.
              </p>
              <button
                onClick={openAddModal}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors font-medium"
              >
                <Plus className="w-4 h-4" />
                Create First Section
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-start sm:items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-lg w-full shadow-2xl my-8">
            <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                {editingSection ? (
                  <><Edit3 className="w-5 h-5 text-purple-500" /> Edit Section</>
                ) : (
                  <><PlusCircle className="w-5 h-5 text-purple-500" /> Add Section</>
                )}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="p-6 space-y-5 max-h-[60vh] overflow-y-auto">
              {/* Preview */}
              <div className="flex justify-center">
                <div
                  className="inline-flex items-center gap-3 px-6 py-3 rounded-full text-lg font-bold shadow-md"
                  style={{
                    backgroundColor: formColour + '20',
                    color: formColour,
                    border: `2px solid ${formColour}50`
                  }}
                >
                  <span
                    className="w-4 h-4 rounded-full shadow-sm"
                    style={{ backgroundColor: formColour }}
                  />
                  {formName || 'Section Name'}
                </div>
              </div>

              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Section Name *
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  placeholder="e.g. Red House, Phoenix Team"
                  className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl 
                           bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                           focus:ring-2 focus:ring-purple-500 focus:border-transparent
                           placeholder:text-gray-400 dark:placeholder:text-gray-500"
                />
              </div>

              {/* Colour Picker */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Section Colour
                </label>
                <div className="flex flex-wrap gap-2.5 mb-3">
                  {DEFAULT_COLOURS.map((colour) => (
                    <button
                      key={colour}
                      type="button"
                      onClick={() => setFormColour(colour)}
                      className={`w-9 h-9 rounded-xl transition-all ${
                        formColour === colour
                          ? 'ring-2 ring-offset-2 ring-purple-500 scale-110 shadow-md'
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
                    className="w-10 h-10 rounded-lg cursor-pointer border border-gray-200 dark:border-gray-600"
                  />
                  <input
                    type="text"
                    value={formColour}
                    onChange={e => setFormColour(e.target.value)}
                    className="flex-1 px-3 py-2 text-sm font-mono border border-gray-200 dark:border-gray-600 
                             rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                             focus:ring-2 focus:ring-purple-500"
                    placeholder="#HEX"
                  />
                </div>
              </div>

              {/* Emblem URL */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Emblem URL (optional)
                </label>
                <input
                  type="text"
                  value={formEmblem}
                  onChange={e => setFormEmblem(e.target.value)}
                  placeholder="https://example.com/emblem.png"
                  className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl
                           bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                           focus:ring-2 focus:ring-purple-500 focus:border-transparent
                           placeholder:text-gray-400 dark:placeholder:text-gray-500"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Description (optional)
                </label>
                <textarea
                  value={formDescription}
                  onChange={e => setFormDescription(e.target.value)}
                  rows={2}
                  placeholder="e.g. Courage and Leadership"
                  className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl
                           bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                           focus:ring-2 focus:ring-purple-500 focus:border-transparent
                           placeholder:text-gray-400 dark:placeholder:text-gray-500 resize-none"
                />
              </div>

              {/* Sort Order */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Sort Order
                </label>
                <input
                  type="number"
                  value={formSortOrder}
                  onChange={e => setFormSortOrder(parseInt(e.target.value) || 0)}
                  min={0}
                  className="w-24 px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-xl
                           bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                           focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>

            <div className="p-6 border-t border-gray-100 dark:border-gray-700 flex justify-end gap-3 bg-gray-50 dark:bg-gray-800/50">
              <button
                onClick={() => setShowModal(false)}
                className="px-5 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 
                         bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 
                         rounded-xl hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !formName.trim()}
                className="px-6 py-2.5 text-sm font-semibold text-white
                         bg-gradient-to-r from-purple-600 to-indigo-600
                         rounded-xl hover:shadow-lg hover:shadow-purple-500/25
                         disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {saving ? 'Saving...' : editingSection ? 'Save Changes' : 'Add Section'}
              </button>
            </div>
          </div>
        </div>
      )}


      {/* Delete Confirmation */}
      {deleteSection && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full shadow-2xl p-6">
            <div className="flex items-center gap-3 text-red-600 mb-4">
              <div className="p-2 bg-red-50 dark:bg-red-900/20 rounded-xl">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Delete Section?</h3>
            </div>

            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
              Are you sure you want to delete <strong className="text-gray-900 dark:text-white">{deleteSection.name}</strong>?
            </p>

            {deleteSection.student_count && deleteSection.student_count > 0 ? (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 mb-4">
                <p className="text-sm text-red-700 dark:text-red-400 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>
                    This section has <strong>{deleteSection.student_count}</strong> students assigned.
                    You must reassign them to another section first.
                  </span>
                </p>
              </div>
            ) : (
              <p className="text-xs text-gray-500 dark:text-gray-500 mb-4">This action cannot be undone.</p>
            )}

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteSection(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 
                         bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 
                         rounded-xl hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
              {(!deleteSection.student_count || deleteSection.student_count === 0) && (
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="px-5 py-2 text-sm font-semibold text-white bg-red-600 
                           rounded-xl hover:bg-red-700 disabled:opacity-50 transition-colors"
                >
                  {deleting ? 'Deleting...' : 'Delete'}
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
                 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 overflow-hidden group cursor-pointer"
      onClick={onViewStudents}
    >
      {/* Colour header */}
      <div className="h-2.5 w-full" style={{ backgroundColor: section.colour }} />

      <div className="p-5">
        {/* Section name + badge */}
        <div className="flex items-center justify-between mb-4">
          <SectionBadge
            section={section}
            size="lg"
            className="text-base font-bold"
          />
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={(e) => { e.stopPropagation(); onEdit(); }}
              className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              title="Edit"
            >
              <Edit3 className="w-4 h-4 text-gray-500 hover:text-purple-600" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              title="Delete"
            >
              <Trash2 className="w-4 h-4 text-gray-500 hover:text-red-600" />
            </button>
          </div>
        </div>

        {/* Description */}
        {section.description && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-4 line-clamp-2">
            {section.description}
          </p>
        )}

        {/* Stats */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-50 dark:border-gray-700/50">
          <div className="flex items-center gap-2 text-sm">
            <Users className="w-4 h-4 text-gray-400" />
            <span className="font-semibold text-gray-700 dark:text-gray-300">
              {section.student_count || 0}
            </span>
            <span className="text-gray-400">students</span>
          </div>

          <button
            onClick={onToggleActive}
            className={`text-xs font-medium px-2.5 py-1 rounded-full transition-colors ${
              section.is_active
                ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400 hover:bg-green-100'
                : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400 hover:bg-gray-200'
            }`}
          >
            {section.is_active ? 'Active' : 'Inactive'}
          </button>
        </div>
      </div>
    </div>
  )
}





