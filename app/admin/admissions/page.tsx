'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, User, Mail, Phone, Calendar, MapPin, FileText, CheckCircle, XCircle } from 'lucide-react'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'

export default function AdmissionsPage() {
  const supabase = getSupabaseBrowserClient()
  const [applications, setApplications] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedApp, setSelectedApp] = useState<any>(null)
  const [updating, setUpdating] = useState(false)

  useEffect(() => {
    // Skip fetching - table does not exist
    setLoading(false)
    setApplications([])
  }, [])

  const fetchApplications = async () => {
    // Table does not exist - feature not implemented
    setApplications([])
    setLoading(false)
  }

  const updateStatus = async (id: number, newStatus: string) => {
    alert('Admissions feature is not yet implemented')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center space-x-4">
            <Link href="/admin/dashboard" className="text-methodist-gold hover:text-yellow-600">
              <ArrowLeft className="w-6 h-6" />
            </Link>
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-gray-800">Admission Applications</h1>
              <p className="text-xs md:text-sm text-gray-600">Review and process admission requests</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        {/* Statistics Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-xs md:text-sm">Total Applications</p>
                <p className="text-2xl md:text-3xl font-bold text-gray-800 mt-1">{applications.length}</p>
              </div>
              <FileText className="w-12 h-12 text-methodist-blue opacity-20" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-xs md:text-sm">Pending Review</p>
                <p className="text-2xl md:text-3xl font-bold text-yellow-600 mt-1">
                  {applications.filter(a => a.status === 'pending').length}
                </p>
              </div>
              <FileText className="w-12 h-12 text-yellow-600 opacity-20" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-xs md:text-sm">Approved</p>
                <p className="text-2xl md:text-3xl font-bold text-green-600 mt-1">
                  {applications.filter(a => a.status === 'approved').length}
                </p>
              </div>
              <CheckCircle className="w-12 h-12 text-green-600 opacity-20" />
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
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Applicant</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Class</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Parent Contact</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y">
                  {applications.map((app) => (
                    <tr key={app.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <div className="bg-methodist-gold bg-opacity-10 p-2 rounded-full mr-3">
                            <User className="w-5 h-5 text-methodist-gold" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{app.applicant_name}</p>
                            <p className="text-xs text-gray-500">{app.gender}, Born: {new Date(app.date_of_birth).toLocaleDateString()}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-900">{app.class_applying_for}</td>
                      <td className="px-6 py-4">
                        <div className="text-sm">
                          <p className="font-medium text-gray-900">{app.parent_name}</p>
                          <div className="flex items-center text-gray-600 text-xs">
                            <Phone className="w-3 h-3 mr-1" />
                            {app.parent_phone}
                          </div>
                          {app.parent_email && (
                            <div className="flex items-center text-gray-600 text-xs">
                              <Mail className="w-3 h-3 mr-1" />
                              {app.parent_email}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {new Date(app.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4">
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
                      <td className="px-6 py-4">
                        <div className="flex space-x-2">
                          <button 
                            onClick={() => setSelectedApp(app)}
                            className="px-3 py-1 bg-methodist-blue text-white text-sm rounded hover:bg-blue-800"
                          >
                            View
                          </button>
                          {app.status === 'pending' && (
                            <>
                              <button 
                                onClick={() => updateStatus(app.id, 'approved')}
                                disabled={updating}
                                className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 disabled:opacity-50"
                              >
                                Approve
                              </button>
                              <button 
                                onClick={() => updateStatus(app.id, 'rejected')}
                                disabled={updating}
                                className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 disabled:opacity-50"
                              >
                                Reject
                              </button>
                            </>
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
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-bold text-gray-800">Application Details</h3>
                <button onClick={() => setSelectedApp(null)} className="text-gray-500 hover:text-gray-700 text-2xl">×</button>
              </div>
            </div>
            <div className="p-6 space-y-6">
              {/* Student Information */}
              <div>
                <h4 className="text-lg font-semibold text-methodist-blue mb-3">Student Information</h4>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-gray-600">Full Name</label>
                    <p className="font-medium text-gray-900">{selectedApp.applicant_name}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-600">Date of Birth</label>
                    <p className="font-medium text-gray-900">{new Date(selectedApp.date_of_birth).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-600">Gender</label>
                    <p className="font-medium text-gray-900">{selectedApp.gender}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-600">Class Applying For</label>
                    <p className="font-medium text-gray-900">{selectedApp.class_applying_for}</p>
                  </div>
                </div>
              </div>

              {/* Parent/Guardian Information */}
              <div>
                <h4 className="text-lg font-semibold text-methodist-blue mb-3">Parent/Guardian Information</h4>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-gray-600">Parent Name</label>
                    <p className="font-medium text-gray-900">{selectedApp.parent_name}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-600">Phone</label>
                    <p className="font-medium text-gray-900">{selectedApp.parent_phone}</p>
                  </div>
                  {selectedApp.parent_email && (
                    <div>
                      <label className="text-sm text-gray-600">Email</label>
                      <p className="font-medium text-gray-900">{selectedApp.parent_email}</p>
                    </div>
                  )}
                  {selectedApp.address && (
                    <div className="md:col-span-2">
                      <label className="text-sm text-gray-600">Address</label>
                      <p className="font-medium text-gray-900">{selectedApp.address}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Previous School */}
              {selectedApp.previous_school && (
                <div>
                  <h4 className="text-lg font-semibold text-methodist-blue mb-3">Previous School</h4>
                  <p className="font-medium text-gray-900">{selectedApp.previous_school}</p>
                </div>
              )}

              {/* Application Status */}
              <div>
                <h4 className="text-lg font-semibold text-methodist-blue mb-3">Application Status</h4>
                <div className="flex items-center space-x-4">
                  <span className={`px-3 py-1 text-sm font-semibold rounded-full ${
                    selectedApp.status === 'approved' 
                      ? 'bg-green-100 text-green-800' 
                      : selectedApp.status === 'rejected'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {selectedApp.status}
                  </span>
                  <span className="text-sm text-gray-600">
                    Submitted: {new Date(selectedApp.created_at).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              {selectedApp.status === 'pending' && (
                <div className="flex space-x-3 pt-4 border-t">
                  <button 
                    onClick={() => updateStatus(selectedApp.id, 'approved')}
                    disabled={updating}
                    className="flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium"
                  >
                    <CheckCircle className="w-5 h-5 inline mr-2" />
                    Approve Application
                  </button>
                  <button 
                    onClick={() => updateStatus(selectedApp.id, 'rejected')}
                    disabled={updating}
                    className="flex-1 bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 disabled:opacity-50 font-medium"
                  >
                    <XCircle className="w-5 h-5 inline mr-2" />
                    Reject Application
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
