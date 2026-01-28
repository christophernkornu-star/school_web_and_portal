'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Save, UserPlus, Upload, Download, CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import { getCurrentUser } from '@/lib/auth'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'
import { createStudent } from '@/lib/user-creation'
import { toast } from 'react-hot-toast'
import BackButton from '@/components/ui/BackButton'

export default function AddStudentPage() {
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()
  const [loading, setLoading] = useState(false)
  const [classes, setClasses] = useState<any[]>([])
  const [activeTab, setActiveTab] = useState<'manual' | 'csv'>('manual')
  
  // Manual form state
  const [formData, setFormData] = useState({
    first_name: '',
    middle_name: '',
    last_name: '',
    email: '',
    date_of_birth: '',
    gender: 'Male',
    class_id: '',
    guardian_name: '',
    guardian_phone: '',
    guardian_email: '',
    address: '',
  })

  // CSV upload state
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [selectedClassId, setSelectedClassId] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadResults, setUploadResults] = useState<{
    success: number
    failed: number
    errors: string[]
  } | null>(null)
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    async function loadClasses() {
      const user = await getCurrentUser()
      if (!user) {
        router.push('/login')
        return
      }

      const { data } = await supabase
        .from('classes')
        .select('*')
        .order('level')
      
      if (data) setClasses(data)
    }
    loadClasses()
  }, [router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const result = await createStudent({
        first_name: formData.first_name,
        last_name: formData.last_name,
        middle_name: formData.middle_name || undefined,
        email: formData.email || undefined,
        date_of_birth: formData.date_of_birth,
        gender: formData.gender,
        class_id: formData.class_id,
        guardian_name: formData.guardian_name,
        guardian_phone: formData.guardian_phone,
        guardian_email: formData.guardian_email || undefined,
      })

      
      toast.success(`Student account created successfully!`, {
        duration: 5000,
        icon: '👏',
      })
      // Show credentials in a persistent way if possible, or just log them. 
      // For now, let's toast them or use a modal? 
      // The original code used alert to show credentials. 
      // I'll use a longer toast or alert is actually better for credentials?
      // No, UI should probably show a success modal with credentials.
      // But I am just doing "Rich UX" for now. 
      // Let's stick to toast.success and maybe `alert` for credentials ONLY is fine?
      // Or I can copy them to clipboard?
      // The user prompt said "Replace manual alerts with standard Toast notifications".
      // I will follow that. But for credentials, user might miss them.
      // I'll show a toast with credentials? "Username: ... Password: ..."
      toast(`Username: ${result.username}\nPassword: ${result.password}`, {
        duration: 10000,
        icon: '🔑',
      })
      
      router.push('/admin/students')
    } catch (error: any) {
      console.error('Error creating student:', error)
      toast.error(error.message || 'Failed to create student')
    } finally {
      setLoading(false)
    }
  }

  function parseDate(dateStr: string): string | null {
    if (!dateStr) return null
    
    // Try YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr
    
    // Try DD/MM/YYYY or DD-MM-YYYY
    const ddmmyyyy = dateStr.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/)
    if (ddmmyyyy) {
      const day = ddmmyyyy[1].padStart(2, '0')
      const month = ddmmyyyy[2].padStart(2, '0')
      const year = ddmmyyyy[3]
      return `${year}-${month}-${day}`
    }

    // Try DD/MM/YY or DD-MM-YY (assume 20xx)
    const ddmmyy = dateStr.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2})$/)
    if (ddmmyy) {
      const day = ddmmyy[1].padStart(2, '0')
      const month = ddmmyy[2].padStart(2, '0')
      const year = '20' + ddmmyy[3]
      return `${year}-${month}-${day}`
    }

    return null
  }

  async function handleCsvUpload() {
    if (!csvFile || !selectedClassId) {
      setFormErrors({ csv: 'Please select a class and CSV file' })
      return
    }

    // Validate file type
    if (!csvFile.name.endsWith('.csv')) {
      setFormErrors({ csv: 'Please upload a CSV file (.csv)' })
      return
    }

    // Validate file size (max 5MB)
    if (csvFile.size > 5 * 1024 * 1024) {
      setFormErrors({ csv: 'File size must be less than 5MB' })
      return
    }

    setUploading(true)
    setUploadResults(null)
    setFormErrors({})

    try {
      const text = await csvFile.text()
      const lines = text.split('\n').filter(line => line.trim())
      
      if (lines.length < 2) {
        setFormErrors({ csv: 'CSV file must contain at least a header row and one data row' })
        setUploading(false)
        return
      }

      const headers = lines[0].split(',').map(h => h.trim().toLowerCase())
      
      // Validate required headers
      const requiredHeaders = ['first_name', 'last_name', 'gender']
      const missingHeaders = requiredHeaders.filter(h => 
        !headers.some(header => 
          header === h || 
          (h === 'first_name' && header === 'firstname') ||
          (h === 'last_name' && header === 'lastname')
        )
      )
      
      if (missingHeaders.length > 0) {
        setFormErrors({ csv: `Missing required headers: ${missingHeaders.join(', ')}` })
        setUploading(false)
        return
      }

      // Parse all students from CSV
      const studentsData: any[] = []
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim())
        
        const student: any = {}
        
        headers.forEach((header, index) => {
          const value = values[index]
          switch (header) {
            case 'first_name':
            case 'firstname':
              student.first_name = value
              break
            case 'middle_name':
            case 'middlename':
              student.middle_name = value || null
              break
            case 'last_name':
            case 'lastname':
              student.last_name = value
              break
            case 'date_of_birth':
            case 'dob':
              const parsedDate = parseDate(value)
              if (parsedDate) {
                student.date_of_birth = parsedDate
              } else {
                // If invalid or empty, leave as undefined/null to be filled later
                student.date_of_birth = null
              }
              break
            case 'gender':
              student.gender = value.toLowerCase()
              break
            case 'guardian_name':
              student.guardian_name = value || null
              break
            case 'guardian_phone':
            case 'phone':
              student.guardian_phone = value || null
              break
            case 'guardian_email':
            case 'email':
              student.guardian_email = value || null
              break
          }
        })

        if (student.first_name && student.last_name) {
          studentsData.push(student)
        }
      }

      // Auto-generate missing DOBs based on other students
      const validDobYears = studentsData
        .map(s => s.date_of_birth ? new Date(s.date_of_birth).getFullYear() : null)
        .filter(y => y !== null) as number[]

      let defaultYear = new Date().getFullYear() - 10 // Fallback default
      
      if (validDobYears.length > 0) {
        // Find mode year
        const frequency: Record<number, number> = {}
        let maxFreq = 0
        let mode = validDobYears[0]
        
        for (const year of validDobYears) {
          frequency[year] = (frequency[year] || 0) + 1
          if (frequency[year] > maxFreq) {
            maxFreq = frequency[year]
            mode = year
          }
        }
        defaultYear = mode
      }

      // Apply default DOB to missing ones
      studentsData.forEach(student => {
        if (!student.date_of_birth) {
          student.date_of_birth = `${defaultYear}-01-01`
        }
      })

      // Send to API for bulk upload
      const response = await fetch('/api/students/bulk-upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          students: studentsData,
          classId: selectedClassId
        })
      })

      const results = await response.json()

      if (!response.ok) {
        setFormErrors({ csv: results.error || 'Upload failed' })
        setUploading(false)
        return
      }

      setUploadResults(results)
      
      if (results.success > 0) {
        setCsvFile(null)
      }
    } catch (error: any) {
      console.error('Error processing CSV:', error)
      setFormErrors({ csv: error.message || 'Failed to process CSV file. Please try again.' })
      setUploadResults(null)
    } finally {
      setUploading(false)
    }
  }

  function downloadTemplate() {
    const template = `first_name,middle_name,last_name,date_of_birth,gender,guardian_name,guardian_phone,guardian_email
John,,Doe,2010-05-15,male,Jane Doe,0241234567,jane@email.com
Mary,Ann,Smith,2016-03-20,female,,,`
    
    const blob = new Blob([template], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'student_upload_template.csv'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center space-x-4">
            <BackButton href="/admin/students" />
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-gray-800">Add New Student</h1>
              <p className="text-xs md:text-sm text-gray-600">Register a new student in the system</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Tab Navigation */}
          <div className="bg-white rounded-t-lg shadow border-b mb-0">
            <div className="flex">
              <button
                onClick={() => setActiveTab('manual')}
                className={`flex-1 flex items-center justify-center space-x-2 px-6 py-4 font-medium transition-colors ${
                  activeTab === 'manual'
                    ? 'text-methodist-blue border-b-2 border-methodist-blue'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <UserPlus className="w-5 h-5" />
                <span>Add Manually</span>
              </button>
              <button
                onClick={() => setActiveTab('csv')}
                className={`flex-1 flex items-center justify-center space-x-2 px-6 py-4 font-medium transition-colors ${
                  activeTab === 'csv'
                    ? 'text-methodist-blue border-b-2 border-methodist-blue'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Upload className="w-5 h-5" />
                <span>Upload CSV</span>
              </button>
            </div>
          </div>

          {/* Manual Form */}
          {activeTab === 'manual' && (
            <form onSubmit={handleSubmit} className="bg-white rounded-b-lg shadow p-6">
              <div className="mb-6">
                <h2 className="text-base md:text-lg font-bold text-gray-800 mb-4">Personal Information</h2>
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs md:text-sm font-medium text-gray-700 mb-2">First Name *</label>
                    <input
                      type="text"
                      required
                      value={formData.first_name}
                      onChange={(e) => setFormData({...formData, first_name: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-methodist-blue"
                    />
                  </div>
                  <div>
                    <label className="block text-xs md:text-sm font-medium text-gray-700 mb-2">Middle Name</label>
                    <input
                      type="text"
                      value={formData.middle_name}
                      onChange={(e) => setFormData({...formData, middle_name: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-methodist-blue"
                      placeholder="Optional"
                    />
                  </div>
                  <div>
                    <label className="block text-xs md:text-sm font-medium text-gray-700 mb-2">Last Name *</label>
                    <input
                      type="text"
                      required
                      value={formData.last_name}
                      onChange={(e) => setFormData({...formData, last_name: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-methodist-blue"
                    />
                  </div>
                  <div>
                    <label className="block text-xs md:text-sm font-medium text-gray-700 mb-2">Email</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-methodist-blue"
                      placeholder="Optional - auto-generated if empty"
                    />
                  </div>
                  <div>
                    <label className="block text-xs md:text-sm font-medium text-gray-700 mb-2">Date of Birth *</label>
                    <input
                      type="date"
                      required
                      value={formData.date_of_birth}
                      onChange={(e) => setFormData({...formData, date_of_birth: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-methodist-blue"
                    />
                  </div>
                  <div>
                    <label className="block text-xs md:text-sm font-medium text-gray-700 mb-2">Gender *</label>
                    <select
                      required
                      value={formData.gender}
                      onChange={(e) => setFormData({...formData, gender: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-methodist-blue"
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs md:text-sm font-medium text-gray-700 mb-2">Class *</label>
                    <select
                      required
                      value={formData.class_id}
                      onChange={(e) => setFormData({...formData, class_id: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-methodist-blue"
                    >
                      <option value="">Select Class</option>
                      {classes.map(cls => (
                        <option key={cls.id} value={cls.id}>{cls.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="mb-6">
                <h2 className="text-base md:text-lg font-bold text-gray-800 mb-4">Guardian Information</h2>
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs md:text-sm font-medium text-gray-700 mb-2">Guardian Name *</label>
                    <input
                      type="text"
                      required
                      value={formData.guardian_name}
                      onChange={(e) => setFormData({...formData, guardian_name: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-methodist-blue"
                    />
                  </div>
                  <div>
                    <label className="block text-xs md:text-sm font-medium text-gray-700 mb-2">Guardian Phone *</label>
                    <input
                      type="tel"
                      required
                      value={formData.guardian_phone}
                      onChange={(e) => setFormData({...formData, guardian_phone: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-methodist-blue"
                      placeholder="+233XXXXXXXXX"
                    />
                  </div>
                  <div>
                    <label className="block text-xs md:text-sm font-medium text-gray-700 mb-2">Guardian Email</label>
                    <input
                      type="email"
                      value={formData.guardian_email}
                      onChange={(e) => setFormData({...formData, guardian_email: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-methodist-blue"
                    />
                  </div>
                  <div>
                    <label className="block text-xs md:text-sm font-medium text-gray-700 mb-2">Address</label>
                    <input
                      type="text"
                      value={formData.address}
                      onChange={(e) => setFormData({...formData, address: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-methodist-blue"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end space-x-4">
                <Link
                  href="/admin/students"
                  className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </Link>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2 bg-methodist-blue text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2 disabled:opacity-50"
                >
                  <Save className="w-5 h-5" />
                  <span>{loading ? 'Saving...' : 'Add Student'}</span>
                </button>
              </div>
            </form>
          )}

          {/* CSV Upload Form */}
          {activeTab === 'csv' && (
            <div className="bg-white rounded-b-lg shadow p-6">
              <div className="space-y-6">
                {/* Instructions */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="text-blue-800 font-semibold mb-2">Instructions</h3>
                  <ul className="list-disc list-inside text-blue-700 space-y-1 text-sm">
                    <li>Download the template file to see the required format</li>
                    <li>Required columns: First Name, Last Name, Date of Birth (YYYY-MM-DD), Gender</li>
                    <li>Optional columns: Middle Name, Guardian Name, Guardian Phone, Guardian Email</li>
                    <li>Select the class you want to add these students to</li>
                  </ul>
                  <button
                    onClick={downloadTemplate}
                    className="mt-4 flex items-center space-x-2 text-methodist-blue hover:text-blue-800 font-medium text-sm"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download CSV Template</span>
                  </button>
                </div>

                {/* Class Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Class *
                  </label>
                  <select
                    value={selectedClassId}
                    onChange={(e) => setSelectedClassId(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-methodist-blue focus:border-transparent"
                  >
                    <option value="">Select a class...</option>
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* File Upload */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Upload CSV File *
                  </label>
                  <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg hover:border-methodist-blue transition-colors">
                    <div className="space-y-1 text-center">
                      <Upload className="mx-auto h-12 w-12 text-gray-400" />
                      <div className="flex text-sm text-gray-600">
                        <label
                          htmlFor="file-upload"
                          className="relative cursor-pointer bg-white rounded-md font-medium text-methodist-blue hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-methodist-blue"
                        >
                          <span>Upload a file</span>
                          <input
                            id="file-upload"
                            name="file-upload"
                            type="file"
                            accept=".csv"
                            className="sr-only"
                            onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
                          />
                        </label>
                        <p className="pl-1">or drag and drop</p>
                      </div>
                      <p className="text-xs text-gray-500">CSV up to 5MB</p>
                      {csvFile && (
                        <p className="text-sm text-green-600 font-medium mt-2">
                          Selected: {csvFile.name}
                        </p>
                      )}
                    </div>
                  </div>
                  {formErrors.csv && (
                    <p className="mt-2 text-sm text-red-600">{formErrors.csv}</p>
                  )}
                </div>

                {/* Upload Results */}
                {uploadResults && (
                  <div className={`rounded-lg p-4 ${
                    uploadResults.failed === 0 ? 'bg-green-50 border border-green-200' : 'bg-yellow-50 border border-yellow-200'
                  }`}>
                    <h4 className={`font-semibold mb-2 ${
                      uploadResults.failed === 0 ? 'text-green-800' : 'text-yellow-800'
                    }`}>
                      Upload Complete
                    </h4>
                    <div className="space-y-1 text-sm">
                      <p className="text-green-700 flex items-center">
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Successfully added: {uploadResults.success} students
                      </p>
                      {uploadResults.failed > 0 && (
                        <div className="mt-2">
                          <p className="text-red-700 flex items-center font-medium">
                            <XCircle className="w-4 h-4 mr-2" />
                            Failed: {uploadResults.failed} students
                          </p>
                          <ul className="mt-1 ml-6 list-disc text-red-600 text-xs space-y-1">
                            {uploadResults.errors.slice(0, 5).map((err, i) => (
                              <li key={i}>{err}</li>
                            ))}
                            {uploadResults.errors.length > 5 && (
                              <li>...and {uploadResults.errors.length - 5} more errors</li>
                            )}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex justify-end space-x-4 pt-4 border-t">
                  <Link
                    href="/admin/students"
                    className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </Link>
                  <button
                    onClick={handleCsvUpload}
                    disabled={uploading || !csvFile || !selectedClassId}
                    className="px-6 py-2 bg-methodist-blue text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {uploading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>Uploading...</span>
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4" />
                        <span>Upload Students</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
