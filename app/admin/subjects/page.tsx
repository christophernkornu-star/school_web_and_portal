'use client'

import { Skeleton } from '@/components/ui/skeleton'
import BackButton from '@/components/ui/back-button'
import { toast } from 'react-hot-toast'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, BookOpen, Plus, Edit, Trash2, Check, X, AlertCircle, Search } from 'lucide-react'
import { getCurrentUser, getUserProfile } from '@/lib/auth'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'

interface Subject {
  id: string
  name: string
  code: string
  description: string
  level?: string
  created_at: string
}

export default function SubjectsPage() {
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null)
  const [saving, setSaving] = useState(false)

  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    level: ''
  })

  useEffect(() => {
    loadSubjects()
  }, [router])

  async function loadSubjects() {
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
      .order('name') as { data: Subject[] | null, error: any }

    if (data) setSubjects(data)
    setLoading(false)
  }

  const handleAdd = async () => {
    setSaving(true)

    if (!formData.name || !formData.code) {
      toast.error('Please fill in name and code')
      setSaving(false)
      return
    }

    const { error } = await supabase
      .from('subjects')
      .insert({
        name: formData.name,
        code: formData.code.toUpperCase(),
        description: formData.description,
        level: formData.level || null
      })

    if (error) {
      if (error.message.includes('duplicate')) {
         toast.error('A subject with this code already exists')
      } else {
         toast.error(error.message)
      }
    } else {
       toast.success('Subject added successfully!')
      setShowAddModal(false)
      resetForm()
      loadSubjects()
    }
    setSaving(false)
  }

  const handleEditSubmit = async () => {
    if (!selectedSubject) return
    setSaving(true)

    const { error } = await supabase
      .from('subjects')
      .update({
        name: formData.name,
        code: formData.code.toUpperCase(),
        description: formData.description,
        level: formData.level || null
      })
      .eq('id', selectedSubject.id)

    if (error) {
      if (error.message.includes('duplicate')) {
         toast.error('A subject with this code already exists')
      } else {
         toast.error(error.message)
      }
    } else {
       toast.success('Subject updated successfully!')
      setShowEditModal(false)
      resetForm()
      loadSubjects()
    }
    setSaving(false)
  }

  const handleDelete = async () => {
    if (!selectedSubject) return
    setSaving(true)

    const { error } = await supabase
      .from('subjects')
      .delete()
      .eq('id', selectedSubject.id)

    if (error) {
       toast.error('Cannot delete subject. It may be assigned to classes.')
    } else {
       toast.success('Subject deleted successfully!')
      setShowDeleteModal(false)
      loadSubjects()
    }
    setSaving(false)
  }

  const openEditModal = (subject: Subject) => {
    setSelectedSubject(subject)
    setFormData({
      name: subject.name,
      code: subject.code,
      description: subject.description || '',
      level: subject.level || ''
    })
    setShowEditModal(true)
  }

  const openDeleteModal = (subject: Subject) => {
    setSelectedSubject(subject)
    setShowDeleteModal(true)
  }

  const resetForm = () => {
    setFormData({
      name: '',
      code: '',
      description: '',
      level: ''
    })
    setSelectedSubject(null)
  }

  const filteredSubjects = subjects.filter(subject =>
    subject.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    subject.code.toLowerCase().includes(searchTerm.toLowerCase())
  )

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
               {/* Search Skeleton */}
               <div className="mb-6">
                   <Skeleton className="w-full h-10 rounded-lg" />
               </div>

               {/* Subjects Grid Skeleton */}
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                   {[1, 2, 3, 4, 5, 6].map((i) => (
                       <div key={i} className="bg-white rounded-lg shadow-md p-6 h-40 flex flex-col justify-between">
                           <div>
                               <div className="flex justify-between items-start mb-2">
                                   <Skeleton className="w-32 h-6" />
                                   <Skeleton className="w-16 h-6 rounded-full" />
                               </div>
                               <Skeleton className="w-full h-4" />
                               <Skeleton className="w-2/3 h-4 mt-1" />
                           </div>
                           <div className="flex justify-end gap-2 mt-4 border-t pt-3">
                               <Skeleton className="w-8 h-8 rounded" />
                               <Skeleton className="w-8 h-8 rounded" />
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
                <h1 className="text-xl md:text-2xl font-bold text-gray-800">Manage Subjects</h1>
                <p className="text-xs md:text-sm text-gray-600">View and manage school subjects</p>
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
              <span>Add Subject</span>
            </button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 md:px-6 py-6 md:py-8">
        {/* Search */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search subjects..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
            />
          </div>
        </div>

        {filteredSubjects.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <BookOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchTerm ? 'No subjects found' : 'No subjects yet'}
            </h3>
            <p className="text-gray-600 mb-6">
              {searchTerm ? 'Try a different search term' : 'Get started by adding your first subject'}
            </p>
            {!searchTerm && (
              <button
                onClick={() => setShowAddModal(true)}
                className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
              >
                <Plus className="w-5 h-5 mr-2" />
                Add Subject
              </button>
            )}
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredSubjects.map((subject) => (
              <div key={subject.id} className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div className="bg-purple-100 p-3 rounded-lg">
                      <BookOpen className="w-6 h-6 text-purple-600" />
                    </div>
                    <div>
                      <h3 className="font-bold text-base md:text-lg text-gray-800">{subject.name}</h3>
                      <span className="px-2 py-1 bg-purple-100 text-purple-600 text-[10px] md:text-xs font-semibold rounded">
                        {subject.code}
                      </span>
                    </div>
                  </div>
                </div>
                
                <p className="text-xs md:text-sm text-gray-600 mb-4 line-clamp-2">
                  {subject.description || 'No description provided'}
                </p>

                <div className="flex justify-end space-x-2 pt-3 border-t">
                  <button 
                    onClick={() => openEditModal(subject)}
                    className="p-2 hover:bg-gray-100 rounded text-blue-600"
                    title="Edit"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => openDeleteModal(subject)}
                    className="p-2 hover:bg-gray-100 rounded text-red-600"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Add New Subject</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Subject Name *</label>
                <input
                  type="text"
                  placeholder="e.g., Mathematics"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Subject Code *</label>
                <input
                  type="text"
                  placeholder="e.g., MATH"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Level</label>
                <select
                  value={formData.level}
                  onChange={(e) => setFormData({ ...formData, level: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                >
                  <option value="">-- Select Level --</option>
                  <option value="kindergarten">Kindergarten (KG 1 - 2)</option>
                  <option value="lower_primary">Lower Primary (Basic 1-3)</option>
                  <option value="upper_primary">Upper Primary (Basic 4-6)</option>
                  <option value="jhs">Junior High School (JHS 1-3)</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">Used for filtering subjects in teacher portal</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  placeholder="Brief description of the subject..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
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
                {saving ? 'Adding...' : 'Add Subject'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Edit Subject</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Subject Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Subject Code *</label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Level</label>
                <select
                  value={formData.level}
                  onChange={(e) => setFormData({ ...formData, level: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                >
                  <option value="">-- Select Level --</option>
                  <option value="kindergarten">Kindergarten (KG 1 - 2)</option>
                  <option value="lower_primary">Lower Primary (Basic 1-3)</option>
                  <option value="upper_primary">Upper Primary (Basic 4-6)</option>
                  <option value="jhs">Junior High School (JHS 1-3)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
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
                onClick={handleEditSubmit}
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
      {showDeleteModal && selectedSubject && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Delete Subject</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete <strong>{selectedSubject.name}</strong> ({selectedSubject.code})? 
              This action cannot be undone.
            </p>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false)
                  setSelectedSubject(null)
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
