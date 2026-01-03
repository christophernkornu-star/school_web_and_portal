'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { updateComplaintStatus } from '@/app/actions/complaints'
import { 
  Search, 
  Filter, 
  MessageSquare, 
  AlertCircle, 
  CheckCircle, 
  Clock, 
  ChevronRight,
  X
} from 'lucide-react'

type Complaint = {
  id: string
  type: 'complaint' | 'suggestion'
  subject: string
  message: string
  status: 'pending' | 'reviewed' | 'resolved'
  contact_name?: string
  contact_email?: string
  contact_phone?: string
  admin_response?: string
  created_at: string
}

export default function ComplaintsList({ initialComplaints }: { initialComplaints: Complaint[] }) {
  const [complaints, setComplaints] = useState(initialComplaints)
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null)
  const [response, setResponse] = useState('')
  const [isUpdating, setIsUpdating] = useState(false)

  const filteredComplaints = complaints.filter(c => {
    const matchesFilter = filter === 'all' || c.status === filter
    const matchesSearch = c.subject.toLowerCase().includes(search.toLowerCase()) || 
                          c.message.toLowerCase().includes(search.toLowerCase()) ||
                          (c.contact_name && c.contact_name.toLowerCase().includes(search.toLowerCase()))
    return matchesFilter && matchesSearch
  })

  const handleStatusUpdate = async (newStatus: string) => {
    if (!selectedComplaint) return

    setIsUpdating(true)
    try {
      const result = await updateComplaintStatus(selectedComplaint.id, newStatus, response)
      if (result.success) {
        // Update local state
        setComplaints(complaints.map(c => 
          c.id === selectedComplaint.id 
            ? { ...c, status: newStatus as any, admin_response: response || c.admin_response } 
            : c
        ))
        setSelectedComplaint(prev => prev ? { ...prev, status: newStatus as any, admin_response: response || prev.admin_response } : null)
        
        // Close modal if resolved
        if (newStatus === 'resolved') {
          // Optional: close modal
        }
      }
    } catch (error) {
      console.error('Failed to update status', error)
    } finally {
      setIsUpdating(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'reviewed': return 'bg-blue-100 text-blue-800'
      case 'resolved': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="w-4 h-4" />
      case 'reviewed': return <MessageSquare className="w-4 h-4" />
      case 'resolved': return <CheckCircle className="w-4 h-4" />
      default: return <AlertCircle className="w-4 h-4" />
    }
  }

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-200px)]">
      {/* List Section */}
      <div className={`flex-1 bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col ${selectedComplaint ? 'hidden lg:flex' : 'flex'}`}>
        {/* Filters */}
        <div className="p-4 border-b border-gray-200 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search complaints..."
              className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {['all', 'pending', 'reviewed', 'resolved'].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium capitalize whitespace-nowrap transition-colors ${
                  filter === f 
                    ? 'bg-purple-100 text-purple-700' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {filteredComplaints.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No complaints found matching your criteria.
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filteredComplaints.map((complaint) => (
                <div
                  key={complaint.id}
                  onClick={() => {
                    setSelectedComplaint(complaint)
                    setResponse(complaint.admin_response || '')
                  }}
                  className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors ${
                    selectedComplaint?.id === complaint.id ? 'bg-purple-50 border-l-4 border-purple-500' : 'border-l-4 border-transparent'
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${
                      complaint.type === 'complaint' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                    }`}>
                      {complaint.type}
                    </span>
                    <span className="text-xs text-gray-500">
                      {format(new Date(complaint.created_at), 'MMM d, yyyy')}
                    </span>
                  </div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-1 line-clamp-1">
                    {complaint.subject}
                  </h3>
                  <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                    {complaint.message}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(complaint.status)}`}>
                      {getStatusIcon(complaint.status)}
                      <span className="capitalize">{complaint.status}</span>
                    </span>
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Detail Section */}
      <div className={`flex-1 bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col ${selectedComplaint ? 'flex' : 'hidden lg:flex'}`}>
        {selectedComplaint ? (
          <>
            <div className="p-4 border-b border-gray-200 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setSelectedComplaint(null)}
                  className="lg:hidden p-1 hover:bg-gray-100 rounded"
                >
                  <ChevronRight className="w-5 h-5 rotate-180" />
                </button>
                <h2 className="font-semibold text-gray-900">Details</h2>
              </div>
              <div className="flex gap-2">
                {selectedComplaint.status !== 'resolved' && (
                  <button
                    onClick={() => handleStatusUpdate('resolved')}
                    disabled={isUpdating}
                    className="px-3 py-1.5 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                  >
                    Mark Resolved
                  </button>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <div className="mb-6">
                <div className="flex items-center gap-3 mb-4">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium capitalize ${
                    selectedComplaint.type === 'complaint' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                  }`}>
                    {selectedComplaint.type}
                  </span>
                  <span className="text-sm text-gray-500">
                    {format(new Date(selectedComplaint.created_at), 'PPP p')}
                  </span>
                </div>
                
                <h1 className="text-xl font-bold text-gray-900 mb-4">
                  {selectedComplaint.subject}
                </h1>
                
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-100 text-gray-800 whitespace-pre-wrap mb-6">
                  {selectedComplaint.message}
                </div>

                {/* Contact Info */}
                {(selectedComplaint.contact_name || selectedComplaint.contact_email || selectedComplaint.contact_phone) && (
                  <div className="mb-6 border-t border-gray-100 pt-4">
                    <h3 className="text-sm font-semibold text-gray-900 mb-3">Contact Information</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                      {selectedComplaint.contact_name && (
                        <div>
                          <span className="text-gray-500 block">Name</span>
                          <span className="font-medium">{selectedComplaint.contact_name}</span>
                        </div>
                      )}
                      {selectedComplaint.contact_email && (
                        <div>
                          <span className="text-gray-500 block">Email</span>
                          <a href={`mailto:${selectedComplaint.contact_email}`} className="text-purple-600 hover:underline">
                            {selectedComplaint.contact_email}
                          </a>
                        </div>
                      )}
                      {selectedComplaint.contact_phone && (
                        <div>
                          <span className="text-gray-500 block">Phone</span>
                          <a href={`tel:${selectedComplaint.contact_phone}`} className="text-purple-600 hover:underline">
                            {selectedComplaint.contact_phone}
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Admin Response */}
                <div className="border-t border-gray-100 pt-6">
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Admin Response / Notes</h3>
                  <textarea
                    value={response}
                    onChange={(e) => setResponse(e.target.value)}
                    placeholder="Add internal notes or response details here..."
                    className="w-full p-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none min-h-[100px]"
                  />
                  <div className="mt-3 flex justify-end gap-2">
                    <button
                      onClick={() => handleStatusUpdate('reviewed')}
                      disabled={isUpdating || selectedComplaint.status === 'reviewed'}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
                    >
                      Mark as Reviewed
                    </button>
                    <button
                      onClick={() => handleStatusUpdate(selectedComplaint.status)} // Just save notes
                      disabled={isUpdating}
                      className="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
                    >
                      Save Notes
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400 p-8">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <MessageSquare className="w-8 h-8 text-gray-300" />
            </div>
            <p className="text-lg font-medium text-gray-500">Select a complaint to view details</p>
          </div>
        )}
      </div>
    </div>
  )
}
