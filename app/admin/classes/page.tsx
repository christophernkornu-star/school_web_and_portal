'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  Building2, 
  Plus, 
  Edit2, 
  Trash2, 
  Users, 
  Search, 
  GraduationCap, 
  ChevronDown, 
  X, 
  Loader2, 
  AlertTriangle,
  Layers,
  Sparkles,
  CheckCircle2
} from 'lucide-react'
import { getCurrentUser } from '@/lib/auth'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'
import { Skeleton } from '@/components/ui/skeleton'
import BackButton from '@/components/ui/back-button'
import { toast } from 'react-hot-toast'

interface Class {
  id: string
  name: string
  level: string
  category: string
  description: string
  capacity: number
  created_at: string
  student_count?: number
  class_teacher?: {
    teacher_id: string
    first_name: string
    last_name: string
  }
}

interface Teacher {
  id: string
  teacher_id: string
  first_name: string
  last_name: string
}

export default function ClassesPage() {
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()
  const [classes, setClasses] = useState<Class[]>([])
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [selectedClass, setSelectedClass] = useState<Class | null>(null)
  const [saving, setSaving] = useState(false)

  const [formData, setFormData] = useState({
    name: '',
    level: 'Basic 1',
    category: 'Lower Primary',
    description: '',
    capacity: 40
  })

  const categories = ['Kindergarten', 'Lower Primary', 'Upper Primary', 'Junior High']

  useEffect(() => {
    loadData()
  }, [router])

  async function loadData() {
    const user = await getCurrentUser()
    if (!user) {
      router.push('/login?portal=admin')
      return
    }

    const { data: classesData } = await supabase
      .from('classes')
      .select('*')
      .order('name') as { data: any[] | null }

    const studentCounts = new Map<string, number>()
    if (classesData) {
      for (const cls of classesData) {
        const { count } = await supabase
          .from('students')
          .select('*', { count: 'exact', head: true })
          .eq('class_id', cls.id)
          .eq('status', 'active')
        studentCounts.set(cls.id, count || 0)
      }
    }

    const { data: teachersData } = await supabase
      .from('teachers')
      .select('id, teacher_id, first_name, last_name')
      .eq('status', 'active')
      .order('first_name') as { data: Teacher[] | null }

    const { data: classTeachersData } = await supabase
      .from('teacher_class_assignments')
      .select(`
        class_id, 
        teacher_id,
        teachers!inner (
          status
        )
      `)
      .eq('is_class_teacher', true) as { data: any[] | null }

    if (classesData) {
      const classesWithInfo = classesData.map((cls: any) => {
        const classTeacherAssignment = classTeachersData?.find((ct: any) => 
          ct.class_id === cls.id && 
          ct.teachers?.status === 'active'
        )
        
        const classTeacher = classTeacherAssignment 
          ? teachersData?.find((t: any) => t.id === classTeacherAssignment.teacher_id)
          : null
          
        return {
          ...cls,
          student_count: studentCounts.get(cls.id) || 0,
          class_teacher: classTeacher || null
        }
      })
      setClasses(classesWithInfo)
    }
    
    if (teachersData) setTeachers(teachersData)
    setLoading(false)
  }

  const handleAdd = async () => {
    if (!formData.name.trim()) {
      toast.error('Please enter a class name')
      return
    }

    setSaving(true)

    const categoryToLevel: Record<string, string> = {
      'Kindergarten': 'kindergarten',
      'Lower Primary': 'lower_primary',
      'Upper Primary': 'upper_primary',
      'Junior High': 'jhs'
    }

    const dbLevel = categoryToLevel[formData.category] || 'lower_primary'

    const { error } = await supabase
      .from('classes')
      .insert([{
        name: formData.name.trim(),
        level: dbLevel,
        category: formData.category,
        description: formData.description.trim(),
        capacity: formData.capacity || 40
      }])

    if (error) {
      if (error.code === '23505') {
        toast.error('A class with this name already exists')
      } else {
        toast.error(error.message)
      }
    } else {
      toast.success('Class cohort created successfully!')
      setShowAddModal(false)
      resetForm()
      loadData()
    }
    setSaving(false)
  }

  const handleEdit = async () => {
    if (!selectedClass) return
    if (!formData.name.trim()) {
      toast.error('Please enter a class name')
      return
    }

    setSaving(true)

    const categoryToLevel: Record<string, string> = {
      'Kindergarten': 'kindergarten',
      'Lower Primary': 'lower_primary',
      'Upper Primary': 'upper_primary',
      'Junior High': 'jhs'
    }

    const dbLevel = categoryToLevel[formData.category] || 'lower_primary'

    const { error } = await supabase
      .from('classes')
      .update({
        name: formData.name.trim(),
        level: dbLevel,
        category: formData.category,
        description: formData.description.trim(),
        capacity: formData.capacity || 40
      })
      .eq('id', selectedClass.id)

    if (error) {
      toast.error(error.message)
    } else {
      toast.success('Class details updated!')
      setShowEditModal(false)
      resetForm()
      loadData()
    }
    setSaving(false)
  }

  const handleDelete = async () => {
    if (!selectedClass) return
    setSaving(true)

    if (selectedClass.student_count && selectedClass.student_count > 0) {
      toast.error('Cannot delete class with enrolled students. Please transfer students first.')
      setSaving(false)
      setShowDeleteModal(false)
      return
    }

    const { error } = await supabase
      .from('classes')
      .delete()
      .eq('id', selectedClass.id)

    if (error) {
      toast.error('Cannot delete class. It may have existing score or attendance records.')
    } else {
      toast.success('Class deleted successfully')
      setShowDeleteModal(false)
      loadData()
    }
    setSaving(false)
  }

  const openEditModal = (cls: Class) => {
    setSelectedClass(cls)
    setFormData({
      name: cls.name,
      level: cls.level,
      category: cls.category,
      description: cls.description || '',
      capacity: cls.capacity
    })
    setShowEditModal(true)
  }

  const openDeleteModal = (cls: Class) => {
    setSelectedClass(cls)
    setShowDeleteModal(true)
  }

  const resetForm = () => {
    setFormData({
      name: '',
      level: 'Basic 1',
      category: 'Lower Primary',
      description: '',
      capacity: 40
    })
    setSelectedClass(null)
  }

  const filteredClasses = classes.filter(cls => {
    const matchesSearch = cls.name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = categoryFilter === 'all' || cls.category === categoryFilter
    return matchesSearch && matchesCategory
  })

  const groupedClasses = filteredClasses.reduce((acc, cls) => {
    if (!acc[cls.category]) {
      acc[cls.category] = []
    }
    acc[cls.category].push(cls)
    return acc
  }, {} as Record<string, Class[]>)

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50/50 dark:bg-slate-900 pb-20 p-4 sm:p-6 lg:p-8 space-y-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <Skeleton className="h-16 w-full rounded-2xl" />
          <Skeleton className="h-20 w-full rounded-2xl" />
          <div className="space-y-6">
            {[1, 2].map((g) => (
              <div key={g} className="space-y-4">
                <Skeleton className="h-6 w-48 rounded-xl" />
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {[1, 2, 3, 4].map((c) => (
                    <Skeleton key={c} className="h-44 rounded-2xl" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-900 pb-24 font-sans text-slate-900 dark:text-slate-100 transition-colors">
      
      {/* Sticky Header Banner */}
      <header className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 sm:py-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5">
            <div className="flex items-start sm:items-center space-x-3 sm:space-x-4 min-w-0">
              <BackButton href="/admin/dashboard" className="shrink-0 mt-0.5 sm:mt-0 shadow-xs" />
              <div className="min-w-0">
                <h1 className="text-xl sm:text-2xl md:text-3xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2 truncate">
                  <Building2 className="w-5 h-5 sm:w-6 sm:h-6 text-[#003B5C] dark:text-blue-400 shrink-0" />
                  <span>Academic Classes</span>
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium truncate mt-0.5">
                  Configure classroom cohorts, enrolment limits, and designated form teachers
                </p>
              </div>
            </div>

            <button 
              onClick={() => {
                resetForm()
                setShowAddModal(true)
              }}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#003B5C] hover:bg-[#002a42] text-white rounded-xl text-xs sm:text-sm font-bold shadow-sm transition active:scale-95 shrink-0 self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>Add Class</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 py-4 sm:py-7 space-y-6 sm:space-y-8">

        {/* Filter & Search Bar */}
        <div className="bg-white dark:bg-slate-800/80 rounded-2xl sm:rounded-3xl shadow-xs border border-slate-200/80 dark:border-slate-700/80 p-3.5 sm:p-4 md:p-5">
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search classes by name or level..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm font-medium border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50/50 dark:bg-slate-900/50 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-[#003B5C]"
              />
            </div>

            <div className="flex items-center gap-2.5 w-full md:w-auto">
              <div className="relative flex-1 md:w-56">
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="w-full pl-3.5 pr-9 py-2.5 text-xs sm:text-sm font-bold border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50/50 dark:bg-slate-900/50 text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-[#003B5C] appearance-none cursor-pointer"
                >
                  <option value="all">All Departments ({classes.length})</option>
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>

              <span className="text-xs font-bold text-slate-400 dark:text-slate-500 font-mono shrink-0 px-1 hidden sm:inline">
                {filteredClasses.length} shown
              </span>
            </div>
          </div>
        </div>

        {/* Classes Content */}
        {filteredClasses.length === 0 ? (
          <div className="bg-white dark:bg-slate-800/80 rounded-2xl sm:rounded-3xl border border-dashed border-slate-200 dark:border-slate-700 p-10 sm:p-16 text-center space-y-3 shadow-xs">
            <Building2 className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto" />
            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
                No classes match your query
              </h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                {searchTerm || categoryFilter !== 'all' 
                  ? 'Try clearing your search term or adjusting the department filter.' 
                  : 'Get started by creating your first academic class.'}
              </p>
            </div>
            {(searchTerm || categoryFilter !== 'all') && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm('')
                  setCategoryFilter('all')
                }}
                className="text-xs font-bold text-[#003B5C] dark:text-blue-400 hover:underline pt-1"
              >
                Reset Filters
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-8">
            {Object.entries(groupedClasses).map(([category, categoryClasses]) => (
              <section key={category} className="space-y-3.5">
                {/* Department Section Header */}
                <div className="flex items-center justify-between pb-1 border-b border-slate-200/60 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-4 bg-amber-400 rounded-full shrink-0" />
                    <h2 className="text-sm sm:text-base font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                      {category}
                    </h2>
                    <span className="text-xs font-bold text-slate-400 font-mono">
                      ({categoryClasses.length})
                    </span>
                  </div>
                </div>

                {/* Cards Grid: 1 col on mobile, 2 on tablet, up to 4 on wide desktop */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5 sm:gap-4">
                  {categoryClasses.map((cls) => {
                    const studentCount = cls.student_count || 0
                    const capacityRatio = studentCount / (cls.capacity || 40)
                    const percent = Math.min(Math.round(capacityRatio * 100), 100)

                    return (
                      <div 
                        key={cls.id} 
                        className="bg-white dark:bg-slate-800/90 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-700/80 shadow-xs hover:shadow-md hover:border-[#003B5C]/30 dark:hover:border-blue-500/30 transition-all duration-200 p-4 sm:p-5 flex flex-col justify-between group"
                      >
                        <div className="space-y-3">
                          {/* Card Top: Class Name & Level Badge */}
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <h3 className="text-base font-bold text-slate-900 dark:text-white truncate group-hover:text-[#003B5C] dark:group-hover:text-blue-400 transition-colors">
                                {cls.name}
                              </h3>
                              <p className="text-[11px] text-slate-400 font-medium capitalize mt-0.5">
                                {cls.level?.replace('_', ' ')}
                              </p>
                            </div>

                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-600 dark:bg-slate-700/50 dark:text-slate-300 border border-slate-200/60 dark:border-slate-600 shrink-0">
                              {cls.category.split(' ')[0]}
                            </span>
                          </div>

                          {/* Class Teacher Field */}
                          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50/70 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-750">
                            <GraduationCap className="w-4 h-4 text-[#003B5C] dark:text-blue-400 shrink-0" />
                            <div className="min-w-0 text-xs">
                              <span className="text-[10px] uppercase font-bold text-slate-400 block leading-tight">Form Master</span>
                              <p className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                                {cls.class_teacher 
                                  ? `${cls.class_teacher.first_name} ${cls.class_teacher.last_name}` 
                                  : <span className="text-slate-400 italic font-normal">Unassigned</span>}
                              </p>
                            </div>
                          </div>

                          {/* Capacity Progress Bar */}
                          <div className="space-y-1.5 pt-1">
                            <div className="flex justify-between items-center text-xs">
                              <span className="text-slate-400 font-medium flex items-center gap-1">
                                <Users className="w-3.5 h-3.5" /> Enrolment
                              </span>
                              <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                                {studentCount} <span className="text-slate-400 text-[11px] font-normal">/ {cls.capacity}</span>
                              </span>
                            </div>

                            <div className="w-full bg-slate-100 dark:bg-slate-700/60 rounded-full h-2 overflow-hidden">
                              <div 
                                className={`h-full rounded-full transition-all duration-500 ${
                                  capacityRatio >= 0.95 
                                    ? 'bg-rose-500' 
                                    : capacityRatio >= 0.75 
                                    ? 'bg-amber-500' 
                                    : 'bg-emerald-500'
                                }`}
                                style={{ width: `${percent}%` }}
                              />
                            </div>
                          </div>
                        </div>

                        {/* Bottom Actions Bar */}
                        <div className="flex items-center justify-between pt-3.5 mt-4 border-t border-slate-100 dark:border-slate-750">
                          <span className="text-[11px] font-mono text-slate-400">
                            {cls.capacity - studentCount > 0 ? `${cls.capacity - studentCount} seats left` : 'Full'}
                          </span>

                          <div className="flex items-center gap-1">
                            <button 
                              type="button"
                              onClick={() => openEditModal(cls)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-[#003B5C] hover:bg-slate-100 dark:hover:bg-slate-700 dark:hover:text-blue-300 transition-colors"
                              title="Edit Class"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button 
                              type="button"
                              onClick={() => openDeleteModal(cls)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                              title="Delete Class"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </section>
            ))}
          </div>
        )}
      </main>

      {/* Add Class Modal (Responsive Bottom Sheet on Mobile, Centered on Tablet/Desktop) */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-800 rounded-t-3xl sm:rounded-3xl max-w-md w-full shadow-2xl p-5 sm:p-6 space-y-4 border-t sm:border border-slate-100 dark:border-slate-700">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-750 pb-3">
              <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                Add New Class Cohort
              </h3>
              <button
                type="button"
                onClick={() => {
                  setShowAddModal(false)
                  resetForm()
                }}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 uppercase tracking-wider">
                  Class Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g., Basic 1, KG 1, JHS 2"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-xs sm:text-sm font-bold border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50/50 dark:bg-slate-900/50 text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-[#003B5C]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 uppercase tracking-wider">
                    Department
                  </label>
                  <div className="relative">
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="w-full pl-3 pr-8 py-2.5 text-xs font-bold border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50/50 dark:bg-slate-900/50 text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-[#003B5C] appearance-none cursor-pointer"
                    >
                      {categories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 uppercase tracking-wider">
                    Max Capacity
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={formData.capacity}
                    onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2.5 text-xs font-mono font-bold border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50/50 dark:bg-slate-900/50 text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-[#003B5C]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 uppercase tracking-wider">
                  Description / Note
                </label>
                <textarea
                  placeholder="Optional notes regarding classroom block or location..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={2}
                  className="w-full px-3.5 py-2 text-xs sm:text-sm border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50/50 dark:bg-slate-900/50 text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-[#003B5C] resize-none"
                />
              </div>
            </div>

            <div className="flex flex-col-reverse sm:flex-row justify-end gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-750">
              <button
                type="button"
                onClick={() => {
                  setShowAddModal(false)
                  resetForm()
                }}
                className="w-full sm:w-auto px-4 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAdd}
                disabled={saving}
                className="w-full sm:w-auto px-5 py-2.5 bg-[#003B5C] hover:bg-[#002a42] text-white rounded-xl text-xs font-bold shadow-sm transition active:scale-95 disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Save Cohort</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Class Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-800 rounded-t-3xl sm:rounded-3xl max-w-md w-full shadow-2xl p-5 sm:p-6 space-y-4 border-t sm:border border-slate-100 dark:border-slate-700">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-750 pb-3">
              <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                Edit Class Cohort
              </h3>
              <button
                type="button"
                onClick={() => {
                  setShowEditModal(false)
                  resetForm()
                }}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 uppercase tracking-wider">
                  Class Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-xs sm:text-sm font-bold border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50/50 dark:bg-slate-900/50 text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-[#003B5C]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 uppercase tracking-wider">
                    Department
                  </label>
                  <div className="relative">
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="w-full pl-3 pr-8 py-2.5 text-xs font-bold border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50/50 dark:bg-slate-900/50 text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-[#003B5C] appearance-none cursor-pointer"
                    >
                      {categories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 uppercase tracking-wider">
                    Capacity
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={formData.capacity}
                    onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2.5 text-xs font-mono font-bold border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50/50 dark:bg-slate-900/50 text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-[#003B5C]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 uppercase tracking-wider">
                  Description / Note
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={2}
                  className="w-full px-3.5 py-2 text-xs sm:text-sm border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50/50 dark:bg-slate-900/50 text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-[#003B5C] resize-none"
                />
              </div>
            </div>

            <div className="flex flex-col-reverse sm:flex-row justify-end gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-750">
              <button
                type="button"
                onClick={() => {
                  setShowEditModal(false)
                  resetForm()
                }}
                className="w-full sm:w-auto px-4 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleEdit}
                disabled={saving}
                className="w-full sm:w-auto px-5 py-2.5 bg-[#003B5C] hover:bg-[#002a42] text-white rounded-xl text-xs font-bold shadow-sm transition active:scale-95 disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Update Cohort</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedClass && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-800 rounded-t-3xl sm:rounded-3xl max-w-md w-full shadow-2xl p-5 sm:p-6 space-y-4 border-t sm:border border-slate-100 dark:border-slate-700">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/40">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                Delete Class Cohort
              </h3>
            </div>
            
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              Are you sure you want to permanently remove <strong>{selectedClass.name}</strong>?
            </p>

            {selectedClass.student_count && selectedClass.student_count > 0 ? (
              <div className="bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 rounded-2xl p-3.5">
                <p className="text-xs text-rose-800 dark:text-rose-300 font-medium leading-relaxed">
                  ⚠️ This class contains <strong>{selectedClass.student_count} enrolled students</strong>. You must reassign or transfer these students before this class record can be removed.
                </p>
              </div>
            ) : (
              <p className="text-xs text-slate-400">
                This action cannot be undone and will erase all linked class metadata.
              </p>
            )}

            <div className="flex flex-col-reverse sm:flex-row justify-end gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-750">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteModal(false)
                  setSelectedClass(null)
                }}
                className="w-full sm:w-auto px-4 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={saving || Boolean(selectedClass.student_count && selectedClass.student_count > 0)}
                className="w-full sm:w-auto px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-sm transition active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
              >
                {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Confirm Delete</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}