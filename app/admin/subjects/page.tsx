'use client'

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
  const [message, setMessage] = useState({ type: '', text: '' })

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
    setMessage({ type: '', text: '' })

    if (!formData.name || !formData.code) {
      setMessage({ type: 'error', text: 'Please fill in name and code' })
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
        setMessage({ type: 'error', text: 'A subject with this code already exists' })
      } else {
        setMessage({ type: 'error', text: error.message })
      }
    } else {
      setMessage({ type: 'success', text: 'Subject added successfully!' })
      setShowAddModal(false)
      resetForm()
      loadSubjects()
    }
    setSaving(false)
  }

  const handleEditSubmit = async () => {
    if (!selectedSubject) return
    setSaving(true)
    setMessage({ type: '', text: '' })

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
        setMessage({ type: 'error', text: 'A subject with this code already exists' })
      } else {
        setMessage({ type: 'error', text: error.message })
      }
    } else {
      setMessage({ type: 'success', text: 'Subject updated successfully!' })
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
      setMessage({ type: 'error', text: 'Cannot delete subject. It may be assigned to classes.' })
    } else {
      setMessage({ type: 'success', text: 'Subject deleted successfully!' })
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-methodist-blue"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/admin/dashboard" className="text-purple-600 hover:text-purple-700">
                <ArrowLeft className="w-6 h-6" />
              </Link>
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

      <main className="container mx-auto px-6 py-8">
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
                  setMessage({ type: '', text: '' })
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
