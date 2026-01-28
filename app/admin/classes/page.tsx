'use client'

import { Skeleton } from '@/components/ui/skeleton'
import BackButton from '@/components/ui/BackButton'
import { toast } from 'react-hot-toast'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Building2, Plus, Edit, Trash2, Check, X, AlertCircle, Users, Search } from 'lucide-react'
import { getCurrentUser } from '@/lib/auth'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'

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

    // Load classes
    const { data: classesData } = await supabase
      .from('classes')
      .select('*')
      .order('name') as { data: any[] | null }

    // Get student counts for each class
    const studentCounts = new Map<string, number>()
    if (classesData) {
      for (const cls of classesData) {
        const { count } = await supabase
          .from('students')
          .select('*', { count: 'exact', head: true })
          .eq('class_id', cls.id)
        studentCounts.set(cls.id, count || 0)
      }
    }

    // Load teachers for assignment
    const { data: teachersData } = await supabase
      .from('teachers')
      .select('id, teacher_id, first_name, last_name')
      .eq('status', 'active')
      .order('first_name') as { data: Teacher[] | null }

    // Load class teachers from teacher_class_assignments
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
        // Find active class teacher assignment
        const classTeacherAssignment = classTeachersData?.find((ct: any) => 
          ct.class_id === cls.id && 
          ct.teachers?.status === 'active'
        )
        
        // Note: teachersData only contains active teachers, so we can match by ID
        // But wait, teachersData uses 'id' (UUID) but classTeachersData uses 'teacher_id' (UUID)
        // Let's check if teachersData uses UUID 'id' or string 'teacher_id'.
        // The select was: .select('id, teacher_id, first_name, last_name')
        // teacher_class_assignments uses UUID teacher_id.
        
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
    setSaving(true)

    // Map category to level enum
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
        name: formData.name,
        level: dbLevel, // Use mapped level
        category: formData.category,
        description: formData.description,
        capacity: formData.capacity
      }])

    if (error) {
      if (error.code === '23505') {
        toast.error('A class with this name already exists')
      } else {
        toast.error(error.message)
      }
    } else {
      toast.success('Class added successfully!')
      setShowAddModal(false)
      resetForm()
      loadData()
    }
    setSaving(false)
  }

  const handleEdit = async () => {
    if (!selectedClass) return
    setSaving(true)

    // Map category to level enum
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
        name: formData.name,
        level: dbLevel, // Use mapped level
        category: formData.category,
        description: formData.description,
        capacity: formData.capacity
      })
      .eq('id', selectedClass.id)

    if (error) {
      toast.error(error.message)
    } else {
      toast.success('Class updated successfully!')
      setShowEditModal(false)
      resetForm()
      loadData()
    }
    setSaving(false)
  }

  const handleDelete = async () => {
    if (!selectedClass) return
    setSaving(true)

    // Check if class has students
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
       toast.error('Cannot delete class. It may have related data.')
    } else {
       toast.success('Class deleted successfully!')
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

  // Group classes by category
  const groupedClasses = filteredClasses.reduce((acc, cls) => {
    if (!acc[cls.category]) {
      acc[cls.category] = []
    }
    acc[cls.category].push(cls)
    return acc
  }, {} as Record<string, Class[]>)

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
          {/* Header Skeleton */}
          <div className="bg-white shadow sticky top-0 z-10">
              <div className="container mx-auto px-4 md:px-6 py-4">
                  <div className="flex justify-between items-center gap-4">
                      <div className="flex items-center gap-3">
                          <Skeleton className="w-8 h-8 rounded-full" />
                          <div>
                              <Skeleton className="w-48 h-6 mb-1" />
                              <Skeleton className="w-24 h-4" />
                          </div>
                      </div>
                      <Skeleton className="w-32 h-10 rounded-lg" />
                  </div>
              </div>
          </div>

          <div className="container mx-auto px-4 md:px-6 py-8">
               {/* Filter Skeleton */}
               <div className="flex gap-4 mb-8">
                   <Skeleton className="w-full md:w-64 h-10 rounded-lg" />
                   <Skeleton className="w-32 h-10 rounded-lg" />
               </div>

               {/* Classes Grid Skeleton */}
               <div className="space-y-8">
                   {[1, 2].map((group) => (
                       <div key={group}>
                           <Skeleton className="w-48 h-8 mb-4" />
                           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                               {[1, 2, 3].map((card) => (
                                   <div key={card} className="bg-white rounded-lg shadow-md p-6 h-48">
                                       <div className="flex justify-between items-start mb-4">
                                            <div>
                                                <Skeleton className="w-32 h-6 mb-2" />
                                                <Skeleton className="w-24 h-4" />
                                            </div>
                                            <Skeleton className="w-8 h-8 rounded-full" />
                                       </div>
                                       <Skeleton className="w-full h-2 rounded-full mt-8" />
                                       <div className="mt-4 flex justify-between">
                                            <Skeleton className="w-20 h-4" />
                                            <Skeleton className="w-20 h-4" />
                                       </div>
                                   </div>
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
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="container mx-auto px-4 md:px-6 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center space-x-3 md:space-x-4">
              <BackButton href="/admin/dashboard" />
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-gray-800">Manage Classes</h1>
                <p className="text-xs md:text-sm text-gray-600">View and manage school classes</p>
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
              <span>Add Class</span>
            </button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 md:px-6 py-6 md:py-8">

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="grid md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search classes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              >
                <option value="all">All Categories</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center justify-end">
              <span className="text-gray-600">
                <strong>{filteredClasses.length}</strong> classes
              </span>
            </div>
          </div>
        </div>

        {filteredClasses.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <Building2 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No classes found</h3>
            <p className="text-gray-600 mb-6">
              {searchTerm || categoryFilter !== 'all' ? 'Try adjusting your filters' : 'Get started by adding your first class'}
            </p>
          </div>
        ) : (
          Object.entries(groupedClasses).map(([category, categoryClasses]) => (
            <div key={category} className="mb-8">
              <h2 className="text-base md:text-lg font-bold text-gray-800 mb-4 flex items-center">
                <Building2 className="w-5 h-5 mr-2 text-purple-600" />
                {category}
                <span className="ml-2 text-xs md:text-sm font-normal text-gray-500">({categoryClasses.length} classes)</span>
              </h2>
              <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-4">
                {categoryClasses.map((cls) => (
                  <div key={cls.id} className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <div className="bg-purple-100 p-2 rounded-full">
                          <Building2 className="w-5 h-5 text-purple-600" />
                        </div>
                        <div>
                          <h3 className="font-bold text-gray-800 text-sm md:text-base">{cls.name}</h3>
                          <p className="text-[10px] md:text-xs text-gray-500">Level {cls.level}</p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2 text-xs md:text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600 flex items-center">
                          <Users className="w-4 h-4 mr-1" />
                          Students:
                        </span>
                        <span className="font-medium">
                          {cls.student_count || 0} / {cls.capacity}
                        </span>
                      </div>
                      
                      {cls.class_teacher && (
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600">Teacher:</span>
                          <span className="font-medium text-[10px] md:text-xs">
                            {cls.class_teacher.first_name} {cls.class_teacher.last_name}
                          </span>
                        </div>
                      )}

                      {/* Capacity Bar */}
                      <div className="pt-2">
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full ${
                              ((cls.student_count || 0) / cls.capacity) > 0.9 ? 'bg-red-500' :
                              ((cls.student_count || 0) / cls.capacity) > 0.7 ? 'bg-yellow-500' : 'bg-green-500'
                            }`}
                            style={{ width: `${Math.min(((cls.student_count || 0) / cls.capacity) * 100, 100)}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end space-x-2 mt-4 pt-3 border-t">
                      <button 
                        onClick={() => openEditModal(cls)}
                        className="p-2 hover:bg-gray-100 rounded text-blue-600"
                        title="Edit"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => openDeleteModal(cls)}
                        className="p-2 hover:bg-gray-100 rounded text-red-600"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
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
            <h3 className="text-xl font-bold text-gray-800 mb-4">Add New Class</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Class Name *</label>
                <input
                  type="text"
                  placeholder="e.g., Primary 1"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Capacity</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={formData.capacity}
                    onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  >
                    {categories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  placeholder="Brief description..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={2}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                />
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
                {saving ? 'Adding...' : 'Add Class'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Edit Class</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Class Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Capacity</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={formData.capacity}
                    onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  >
                    {categories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={2}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                />
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
      {showDeleteModal && selectedClass && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Delete Class</h3>
            <p className="text-gray-600 mb-2">
              Are you sure you want to delete <strong>{selectedClass.name}</strong>?
            </p>
            {selectedClass.student_count && selectedClass.student_count > 0 ? (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                <p className="text-red-800 text-sm">
                  ⚠️ This class has {selectedClass.student_count} enrolled students. 
                  Please transfer them to another class before deleting.
                </p>
              </div>
            ) : (
              <p className="text-gray-500 text-sm mb-4">This action cannot be undone.</p>
            )}

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false)
                  setSelectedClass(null)
                }}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={saving || Boolean(selectedClass.student_count && selectedClass.student_count > 0)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
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
