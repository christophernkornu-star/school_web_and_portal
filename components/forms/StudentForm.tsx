'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Save, User, UserPlus, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'

export interface StudentFormData {
  first_name: string
  middle_name: string
  last_name: string
  date_of_birth: string
  gender: string
  class_id: string
  guardian_name: string
  guardian_phone: string
  guardian_email: string
  status?: string // Optional for teachers
}

interface StudentFormProps {
  initialData?: any // Student object if editing
  classes: any[] // List of available classes
  isAdmin?: boolean // Flag to show admin-only fields like Status
  onSubmit: (data: StudentFormData) => Promise<void>
  isSubmitting: boolean
  mode?: 'add' | 'edit'
}

export function StudentForm({
  initialData,
  classes,
  isAdmin = false,
  onSubmit,
  isSubmitting,
  mode = 'edit'
}: StudentFormProps) {
  const [formData, setFormData] = useState<StudentFormData>({
    first_name: '',
    middle_name: '',
    last_name: '',
    date_of_birth: '',
    gender: 'Male', // Default gender
    class_id: '',
    guardian_name: '',
    guardian_phone: '',
    guardian_email: '',
    status: 'active',
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  // Initialize form data when initialData is provided
  useEffect(() => {
    if (initialData) {
      setFormData({
        first_name: initialData.first_name || '',
        middle_name: initialData.middle_name || '',
        last_name: initialData.last_name || '',
        date_of_birth: initialData.date_of_birth 
            ? new Date(initialData.date_of_birth).toISOString().split('T')[0] 
            : '',
        gender: initialData.gender || 'Male',
        class_id: initialData.class_id || '',
        guardian_name: initialData.guardian_name || '',
        guardian_phone: initialData.guardian_phone || '',
        guardian_email: initialData.guardian_email || '',
        status: initialData.status || 'active',
      })
    }
  }, [initialData])

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.first_name.trim()) newErrors.first_name = 'First Name is required'
    if (!formData.last_name.trim()) newErrors.last_name = 'Last Name is required'
    if (!formData.date_of_birth) newErrors.date_of_birth = 'Date of Birth is required'
    if (!formData.gender) newErrors.gender = 'Gender is required'
    if (!formData.class_id) newErrors.class_id = 'Class is required'

    // Guardian Info is OPTIONAL
    // Only basic format validation if provided
    if (formData.guardian_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.guardian_email)) {
      newErrors.guardian_email = 'Invalid email format'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    await onSubmit(formData)
  }

  const handleChange = (field: keyof StudentFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear error when user types
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[field]
        return newErrors
      })
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8 max-w-4xl mx-auto bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700">
      {/* Personal Information */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
           <User className="w-5 h-5 text-blue-600" />
           Personal Information
        </h3>
        <div className="grid md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <Label htmlFor="first_name">First Name <span className="text-red-500">*</span></Label>
            <Input
              id="first_name"
              value={formData.first_name}
              onChange={(e) => handleChange('first_name', e.target.value)}
              placeholder="e.g. Kwame"
              className={errors.first_name ? 'border-red-500' : ''}
            />
            {errors.first_name && <p className="text-xs text-red-500">{errors.first_name}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="middle_name">Middle Name (Optional)</Label>
            <Input
              id="middle_name"
              value={formData.middle_name}
              onChange={(e) => handleChange('middle_name', e.target.value)}
              placeholder="e.g. Kofi"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="last_name">Last Name <span className="text-red-500">*</span></Label>
            <Input
              id="last_name"
              value={formData.last_name}
              onChange={(e) => handleChange('last_name', e.target.value)}
              placeholder="e.g. Mensah"
              className={errors.last_name ? 'border-red-500' : ''}
            />
            {errors.last_name && <p className="text-xs text-red-500">{errors.last_name}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="date_of_birth">Date of Birth <span className="text-red-500">*</span></Label>
            <Input
              id="date_of_birth"
              type="date"
              value={formData.date_of_birth}
              onChange={(e) => handleChange('date_of_birth', e.target.value)}
              className={errors.date_of_birth ? 'border-red-500' : ''}
            />
            {errors.date_of_birth && <p className="text-xs text-red-500">{errors.date_of_birth}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="gender">Gender <span className="text-red-500">*</span></Label>
            <Select 
              value={formData.gender} 
              onValueChange={(value) => handleChange('gender', value)}
            >
              <SelectTrigger className={errors.gender ? 'border-red-500' : ''}>
                <SelectValue placeholder="Select Gender" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Male">Male</SelectItem>
                <SelectItem value="Female">Female</SelectItem>
              </SelectContent>
            </Select>
            {errors.gender && <p className="text-xs text-red-500">{errors.gender}</p>}
          </div>
        </div>
      </div>

      {/* Academic Information */}
      <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Academic Information</h3>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="class_id">Assigned Class <span className="text-red-500">*</span></Label>
            <Select 
              value={formData.class_id} 
              onValueChange={(value) => handleChange('class_id', value)}
            >
              <SelectTrigger className={errors.class_id ? 'border-red-500' : ''}>
                <SelectValue placeholder="Select Class">
                  {classes.find((c: any) => (c.id || c.class_id) === formData.class_id)?.name || 
                   classes.find((c: any) => (c.id || c.class_id) === formData.class_id)?.class_name}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {classes.map((cls) => (
                  <SelectItem key={cls.id || cls.class_id} value={cls.id || cls.class_id}>
                    {cls.name || cls.class_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.class_id && <p className="text-xs text-red-500">{errors.class_id}</p>}
          </div>

          {isAdmin && (
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select 
                value={formData.status} 
                onValueChange={(value) => handleChange('status', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Status">
                    {formData.status ? (formData.status.charAt(0).toUpperCase() + formData.status.slice(1)) : undefined}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="graduated">Graduated</SelectItem>
                  <SelectItem value="transferred">Transferred</SelectItem>
                  <SelectItem value="expelled">Expelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </div>

      {/* Guardian Information (Optional) */}
      <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Guardian Information (Optional)</h3>
        <div className="grid md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <Label htmlFor="guardian_name">Guardian Name</Label>
            <Input
              id="guardian_name"
              value={formData.guardian_name}
              onChange={(e) => handleChange('guardian_name', e.target.value)}
              placeholder="Parent/Guardian Full Name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="guardian_phone">Phone Number</Label>
            <Input
              id="guardian_phone"
              value={formData.guardian_phone}
              onChange={(e) => handleChange('guardian_phone', e.target.value)}
              placeholder="e.g. 054xxxxxxx"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="guardian_email">Email Address</Label>
            <Input
              id="guardian_email"
              type="email"
              value={formData.guardian_email}
              onChange={(e) => handleChange('guardian_email', e.target.value)}
              placeholder="guardian@example.com"
              className={errors.guardian_email ? 'border-red-500' : ''}
            />
             {errors.guardian_email && <p className="text-xs text-red-500">{errors.guardian_email}</p>}
          </div>
        </div>
      </div>

      {/* Submit Buttons */}
      <div className="pt-6 flex justify-end gap-3">
        <Button 
            type="button" 
            variant="outline" 
            onClick={() => window.history.back()}
            disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button 
            type="submit" 
            className="bg-blue-600 hover:bg-blue-700 text-white min-w-[120px]"
            disabled={isSubmitting}
        >
          {isSubmitting ? (
              <span className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  Saving...
              </span>
          ) : (
             <span className="flex items-center gap-2">
                 <Save className="w-4 h-4" />
                 {mode === 'add' ? 'Add Student' : 'Save Changes'}
             </span>
          )}
        </Button>
      </div>
    </form>
  )
}
