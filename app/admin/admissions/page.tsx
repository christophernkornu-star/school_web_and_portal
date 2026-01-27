'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, User, Mail, Phone, Calendar, MapPin, FileText, CheckCircle, XCircle } from 'lucide-react'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'
import { createStudent } from '@/lib/user-creation'

export default function AdmissionsPage() {
  const supabase = getSupabaseBrowserClient()
  const [applications, setApplications] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedApp, setSelectedApp] = useState<any>(null)
  const [updating, setUpdating] = useState(false)

  useEffect(() => {
    fetchApplications()
  }, [])

  const fetchApplications = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('admission_applications')
        .select(`
          *,
          classes:class_applying_for (
            name
          )
        `)
        .order('created_at', { ascending: false })

      if (error) throw error
      setApplications(data || [])
    } catch (error) {
      console.error('Error fetching applications:', error)
    } finally {
      setLoading(false)
    }
  }

  const updateStatus = async (id: number, newStatus: string) => {
    try {
      setUpdating(true)

      // If approving, create student account first
      if (newStatus === 'approved') {
        const app = applications.find(a => a.id === id)
        if (!app) throw new Error('Application not found')

        // Split name into first and last name
        const nameParts = app.applicant_name.trim().split(' ')
        const firstName = nameParts[0]
        const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : 'Student'

        // Create student account and record
        await createStudent({
          first_name: firstName,
          last_name: lastName,
          date_of_birth: app.date_of_birth,
          gender: app.gender,
          class_id: app.class_applying_for,
          guardian_name: app.parent_name,
          guardian_phone: app.parent_phone,
          guardian_email: app.parent_email,
          admission_date: new Date().toISOString().split('T')[0]
        })
      }

      const { error } = await supabase
        .from('admission_applications')
        .update({ status: newStatus })
        .eq('id', id)

      if (error) throw error
      
      // Refresh list
      await fetchApplications()
      setSelectedApp(null)

      if (newStatus === 'approved') {
        alert('Application approved and student account created successfully!')
      }
    } catch (error: any) {
      console.error('Error updating status:', error)
      alert('Failed to update status: ' + (error.message || 'Unknown error'))
    } finally {
      setUpdating(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="container mx-auto px-4 md:px-6 py-4">
          <div className="flex items-center space-x-4">
            <Link href="/admin/dashboard" className="text-methodist-gold hover:text-yellow-600 shrink-0">
              <ArrowLeft className="w-6 h-6" />
            </Link>
            <div>
              <h1 className="text-lg md:text-2xl font-bold text-gray-800">Admission Applications</h1>
              <p className="text-xs md:text-sm text-gray-600">Review and process admission requests</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 md:px-6 py-6 md:py-8">
        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-6 md:mb-8">
          <div className="bg-white rounded-lg shadow p-4 md:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-xs md:text-sm">Total Applications</p>
                <p className="text-xl md:text-3xl font-bold text-gray-800 mt-1">{applications.length}</p>
              </div>
              <FileText className="w-8 h-8 md:w-12 md:h-12 text-methodist-blue opacity-20" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4 md:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-xs md:text-sm">Pending Review</p>
                <p className="text-xl md:text-3xl font-bold text-yellow-600 mt-1">
                  {applications.filter(a => a.status === 'pending').length}
                </p>
              </div>
              <FileText className="w-8 h-8 md:w-12 md:h-12 text-yellow-600 opacity-20" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4 md:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-xs md:text-sm">Approved</p>
                <p className="text-xl md:text-3xl font-bold text-green-600 mt-1">
                  {applications.filter(a => a.status === 'approved').length}
                </p>
              </div>
              <CheckCircle className="w-8 h-8 md:w-12 md:h-12 text-green-600 opacity-20" />
            </div>
          </div>
        </div>

        {/* Applications Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-methodist-blue"></div>
            </div>
          ) : applications.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No admission applications yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px]">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Applicant</th>
                    <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Class</th>
                    <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Parent Contact</th>
                    <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y">
                  {applications.map((app) => (
                    <tr key={app.id} className="hover:bg-gray-50">
                      <td className="px-4 md:px-6 py-4">
                        <div className="flex items-center">
                          <div className="bg-methodist-gold bg-opacity-10 p-2 rounded-full mr-3 shrink-0">
                            <User className="w-5 h-5 text-methodist-gold" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 text-sm md:text-base">{app.applicant_name}</p>
                            <p className="text-xs text-gray-500">{app.gender}, Born: {new Date(app.date_of_birth).toLocaleDateString()}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 md:px-6 py-4 text-gray-900 text-sm md:text-base">
                        {app.classes?.name || app.class_applying_for}
                      </td>
                      <td className="px-4 md:px-6 py-4">
                        <div className="text-sm">
                          <p className="font-medium text-gray-900">{app.parent_name}</p>
                          <div className="flex items-center text-gray-600 text-xs mt-1">
                            <Phone className="w-3 h-3 mr-1" />
                            {app.parent_phone}
                          </div>
                          {app.parent_email && (
                            <div className="flex items-center text-gray-600 text-xs mt-1">
                              <Mail className="w-3 h-3 mr-1" />
                              {app.parent_email}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 md:px-6 py-4 text-sm text-gray-900">
                        {new Date(app.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 md:px-6 py-4">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                          app.status === 'approved' 
                            ? 'bg-green-100 text-green-800' 
                            : app.status === 'rejected'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {app.status}
                        </span>
                      </td>
                      <td className="px-4 md:px-6 py-4">
                        <div className="flex flex-col md:flex-row gap-2">
                          <button 
                            onClick={() => setSelectedApp(app)}
                            className="px-3 py-1 bg-methodist-blue text-white text-xs md:text-sm rounded hover:bg-blue-800 text-center"
                          >
                            View
                          </button>
                          {app.status === 'pending' && (
                            <>
                              <button 
                                onClick={() => updateStatus(app.id, 'approved')}
                                disabled={updating}
                                className="px-3 py-1 bg-green-600 text-white text-xs md:text-sm rounded hover:bg-green-700 disabled:opacity-50 text-center"
                              >
                                Approve
                              </button>
                              <button 
                                onClick={() => updateStatus(app.id, 'rejected')}
                                disabled={updating}
                                className="px-3 py-1 bg-red-600 text-white text-xs md:text-sm rounded hover:bg-red-700 disabled:opacity-50 text-center"
                              >
                                Reject
                              </button>
                            </>
                          )}
                          {app.status === 'approved' && (
                            <span className="px-3 py-1 bg-gray-100 text-green-700 text-xs md:text-sm rounded border border-green-200 text-center font-medium cursor-default flex items-center justify-center">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Enrolled
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* Application Details Modal */}
      {selectedApp && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => setSelectedApp(null)}>
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 md:p-6 border-b">
              <div className="flex items-center justify-between">
                <h3 className="text-xl md:text-2xl font-bold text-gray-800">Application Details</h3>
                <button onClick={() => setSelectedApp(null)} className="text-gray-500 hover:text-gray-700 text-2xl">×</button>
              </div>
            </div>
            <div className="p-4 md:p-6 space-y-4 md:space-y-6">
              {/* Student Information */}
              <div>
                <h4 className="text-base md:text-lg font-semibold text-methodist-blue mb-2 md:mb-3">Student Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                  <div>
                    <label className="text-xs md:text-sm text-gray-600">Full Name</label>
                    <p className="font-medium text-gray-900 text-sm md:text-base">{selectedApp.applicant_name}</p>
                  </div>
                  <div>
                    <label className="text-xs md:text-sm text-gray-600">Date of Birth</label>
                    <p className="font-medium text-gray-900 text-sm md:text-base">{new Date(selectedApp.date_of_birth).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <label className="text-xs md:text-sm text-gray-600">Gender</label>
                    <p className="font-medium text-gray-900 text-sm md:text-base">{selectedApp.gender}</p>
                  </div>
                  <div>
                    <label className="text-xs md:text-sm text-gray-600">Class Applying For</label>
                    <p className="font-medium text-gray-900 text-sm md:text-base">{selectedApp.classes?.name || selectedApp.class_applying_for}</p>
                  </div>
                </div>
              </div>

              {/* Parent/Guardian Information */}
              <div>
                <h4 className="text-base md:text-lg font-semibold text-methodist-blue mb-2 md:mb-3">Parent/Guardian Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                  <div>
                    <label className="text-xs md:text-sm text-gray-600">Parent Name</label>
                    <p className="font-medium text-gray-900 text-sm md:text-base">{selectedApp.parent_name}</p>
                  </div>
                  <div>
                    <label className="text-xs md:text-sm text-gray-600">Phone</label>
                    <p className="font-medium text-gray-900 text-sm md:text-base">{selectedApp.parent_phone}</p>
                  </div>
                  {selectedApp.parent_email && (
                    <div>
                      <label className="text-xs md:text-sm text-gray-600">Email</label>
                      <p className="font-medium text-gray-900 text-sm md:text-base">{selectedApp.parent_email}</p>
                    </div>
                  )}
                  {selectedApp.address && (
                    <div className="md:col-span-2">
                      <label className="text-xs md:text-sm text-gray-600">Address</label>
                      <p className="font-medium text-gray-900 text-sm md:text-base">{selectedApp.address}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Previous School */}
              {selectedApp.previous_school && (
                <div>
                  <h4 className="text-base md:text-lg font-semibold text-methodist-blue mb-2 md:mb-3">Previous School</h4>
                  <p className="font-medium text-gray-900 text-sm md:text-base">{selectedApp.previous_school}</p>
                </div>
              )}

              {/* Application Status */}
              <div>
                <h4 className="text-base md:text-lg font-semibold text-methodist-blue mb-2 md:mb-3">Application Status</h4>
                <div className="flex flex-col md:flex-row md:items-center gap-2 md:space-x-4">
                  <span className={`px-3 py-1 text-xs md:text-sm font-semibold rounded-full w-fit ${
                    selectedApp.status === 'approved' 
                      ? 'bg-green-100 text-green-800' 
                      : selectedApp.status === 'rejected'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {selectedApp.status}
                  </span>
                  <span className="text-xs md:text-sm text-gray-600">
                    Submitted: {new Date(selectedApp.created_at).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col md:flex-row gap-3 pt-4 border-t">
                {selectedApp.status === 'pending' && (
                  <>
                    <button 
                      onClick={() => updateStatus(selectedApp.id, 'approved')}
                      disabled={updating}
                      className="flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium text-sm md:text-base flex items-center justify-center"
                    >
                      <CheckCircle className="w-5 h-5 inline mr-2" />
                      Approve Application
                    </button>
                    <button 
                      onClick={() => updateStatus(selectedApp.id, 'rejected')}
                      disabled={updating}
                      className="flex-1 bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 disabled:opacity-50 font-medium text-sm md:text-base flex items-center justify-center"
                    >
                      <XCircle className="w-5 h-5 inline mr-2" />
                      Reject Application
                    </button>
                  </>
                )}
                {selectedApp.status === 'approved' && (
                  <button 
                    onClick={() => updateStatus(selectedApp.id, 'approved')}
                    disabled={updating}
                    className="flex-1 bg-methodist-gold text-white py-2 rounded-lg hover:bg-yellow-600 disabled:opacity-50 font-medium text-sm md:text-base flex items-center justify-center"
                  >
                    <User className="w-5 h-5 inline mr-2" />
                    Create Student Account (Retry)
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
