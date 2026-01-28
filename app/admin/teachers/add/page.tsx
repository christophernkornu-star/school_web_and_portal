'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Save } from 'lucide-react'
import { toast } from 'react-hot-toast'
import BackButton from '@/components/ui/BackButton'
import { getCurrentUser } from '@/lib/auth'
import { createTeacher } from '@/lib/user-creation'

export default function AddTeacherPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    staff_id: '',
    first_name: '',
    middle_name: '',
    last_name: '',
    email: '',
    phone: '',
    specialization: '',
    qualification: '',
    hire_date: '',
  })

  useEffect(() => {
    async function checkAuth() {
      const user = await getCurrentUser()
      if (!user) router.push('/login')
    }
    checkAuth()
  }, [router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const result = await createTeacher({
        first_name: formData.first_name,
        middle_name: formData.middle_name || undefined,
        last_name: formData.last_name,
        email: formData.email || undefined,
        phone: formData.phone || undefined,
        specialization: formData.specialization || undefined,
        qualification: formData.qualification || undefined,
        hire_date: formData.hire_date,
        staff_id: formData.staff_id || undefined,
      })

      toast.success(`Teacher account created successfully!\nUsername: ${result.username}\nPassword: ${result.password}`)
      router.push('/admin/teachers')
    } catch (error: any) {
      console.error('Error creating teacher:', error)
      toast.error('Failed to create teacher: ' + (error.message || 'Please try again'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center space-x-4">
            <BackButton href="/admin/teachers" />
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-gray-800">Add New Teacher</h1>
              <p className="text-xs md:text-sm text-gray-600">Register a new teacher in the system</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        <form onSubmit={handleSubmit} className="max-w-2xl mx-auto">
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-base md:text-lg font-bold text-gray-800 mb-4">Teacher Information</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs md:text-sm font-medium text-gray-700 mb-2">Staff ID</label>
                <input type="text" value={formData.staff_id}
                  onChange={(e) => setFormData({...formData, staff_id: e.target.value})}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-ghana-green"
                  placeholder="e.g., TCH0001 (auto-generated if empty)" />
                <p className="text-[10px] md:text-xs text-gray-500 mt-1">Format: TCH0001, TCH0002, etc.</p>
              </div>
              <div>
                <label className="block text-xs md:text-sm font-medium text-gray-700 mb-2">First Name *</label>
                <input type="text" required value={formData.first_name}
                  onChange={(e) => setFormData({...formData, first_name: e.target.value})}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-ghana-green" />
              </div>
              <div>
                <label className="block text-xs md:text-sm font-medium text-gray-700 mb-2">Middle Name</label>
                <input type="text" value={formData.middle_name}
                  onChange={(e) => setFormData({...formData, middle_name: e.target.value})}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-ghana-green"
                  placeholder="Optional" />
              </div>
              <div>
                <label className="block text-xs md:text-sm font-medium text-gray-700 mb-2">Last Name *</label>
                <input type="text" required value={formData.last_name}
                  onChange={(e) => setFormData({...formData, last_name: e.target.value})}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-ghana-green" />
              </div>
              <div>
                <label className="block text-xs md:text-sm font-medium text-gray-700 mb-2">Email</label>
                <input type="email" value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-ghana-green"
                  placeholder="Optional - auto-generated if empty" />
              </div>
              <div>
                <label className="block text-xs md:text-sm font-medium text-gray-700 mb-2">Phone</label>
                <input type="tel" value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-ghana-green"
                  placeholder="+233XXXXXXXXX" />
              </div>
              <div>
                <label className="block text-xs md:text-sm font-medium text-gray-700 mb-2">Hire Date *</label>
                <input type="date" required value={formData.hire_date}
                  onChange={(e) => setFormData({...formData, hire_date: e.target.value})}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-ghana-green" />
              </div>
              <div>
                <label className="block text-xs md:text-sm font-medium text-gray-700 mb-2">Specialization</label>
                <input type="text" value={formData.specialization}
                  onChange={(e) => setFormData({...formData, specialization: e.target.value})}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-ghana-green"
                  placeholder="e.g., Mathematics & Science" />
              </div>
              <div>
                <label className="block text-xs md:text-sm font-medium text-gray-700 mb-2">Qualification</label>
                <input type="text" value={formData.qualification}
                  onChange={(e) => setFormData({...formData, qualification: e.target.value})}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-ghana-green"
                  placeholder="e.g., B.Ed Mathematics" />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end space-x-4">
            <Link href="/admin/teachers" className="px-6 py-2 border rounded-lg text-gray-700 hover:bg-gray-50">
              Cancel
            </Link>
            <button type="submit" disabled={loading}
              className="px-6 py-2 bg-ghana-green text-white rounded-lg hover:bg-green-700 flex items-center space-x-2 disabled:opacity-50">
              <Save className="w-5 h-5" />
              <span>{loading ? 'Saving...' : 'Add Teacher'}</span>
            </button>
          </div>
        </form>
      </main>
    </div>
  )
}
