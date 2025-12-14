'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Plus, FileText, Edit, Trash2, Eye } from 'lucide-react'

export default function AssessmentsPage() {
  const [assessments, setAssessments] = useState([
    {
      id: 1,
      title: 'Mathematics Mid-Term Exam',
      subject: 'Mathematics',
      class: 'Basic 5',
      type: 'Exam',
      date: '2024-02-15',
      totalMarks: 100,
      duration: '2 hours',
      status: 'Published'
    },
    {
      id: 2,
      title: 'English Comprehension Quiz',
      subject: 'English',
      class: 'Basic 5',
      type: 'Quiz',
      date: '2024-02-20',
      totalMarks: 20,
      duration: '30 minutes',
      status: 'Draft'
    },
    {
      id: 3,
      title: 'Science Project Assessment',
      subject: 'Science',
      class: 'Basic 5',
      type: 'Project',
      date: '2024-02-25',
      totalMarks: 50,
      duration: 'N/A',
      status: 'Published'
    }
  ])

  const [showCreateModal, setShowCreateModal] = useState(false)

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/teacher/dashboard" className="text-ghana-green hover:text-green-700">
                <ArrowLeft className="w-6 h-6" />
              </Link>
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-gray-800">Assessments</h1>
                <p className="text-xs md:text-sm text-gray-600">Create and manage tests, quizzes, and projects</p>
              </div>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-ghana-green text-white rounded-lg hover:bg-green-700 text-xs md:text-sm"
            >
              <Plus className="w-5 h-5" />
              <span>Create Assessment</span>
            </button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-gray-600 text-xs md:text-sm">Total Assessments</p>
            <p className="text-xl md:text-2xl font-bold text-gray-800">12</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-gray-600 text-xs md:text-sm">Published</p>
            <p className="text-xl md:text-2xl font-bold text-green-600">8</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-gray-600 text-xs md:text-sm">Drafts</p>
            <p className="text-xl md:text-2xl font-bold text-yellow-600">4</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-gray-600 text-xs md:text-sm">Upcoming</p>
            <p className="text-xl md:text-2xl font-bold text-blue-600">3</p>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="bg-white rounded-lg shadow mb-6 overflow-x-auto">
          <div className="flex border-b min-w-max">
            <button className="px-4 md:px-6 py-3 text-xs md:text-sm text-ghana-green border-b-2 border-ghana-green font-medium">
              All Assessments
            </button>
            <button className="px-4 md:px-6 py-3 text-xs md:text-sm text-gray-600 hover:text-ghana-green">
              Exams
            </button>
            <button className="px-4 md:px-6 py-3 text-xs md:text-sm text-gray-600 hover:text-ghana-green">
              Quizzes
            </button>
            <button className="px-4 md:px-6 py-3 text-xs md:text-sm text-gray-600 hover:text-ghana-green">
              Projects
            </button>
          </div>
        </div>

        {/* Assessments List */}
        <div className="space-y-4">
          {assessments.map((assessment) => (
            <div key={assessment.id} className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h3 className="text-base md:text-lg font-semibold text-gray-800">{assessment.title}</h3>
                    <span className={`px-2 py-1 text-[10px] md:text-xs font-semibold rounded-full ${
                      assessment.status === 'Published' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {assessment.status}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 md:gap-4 text-xs md:text-sm text-gray-600">
                    <div>
                      <span className="font-medium">Subject:</span> {assessment.subject}
                    </div>
                    <div>
                      <span className="font-medium">Class:</span> {assessment.class}
                    </div>
                    <div>
                      <span className="font-medium">Type:</span> {assessment.type}
                    </div>
                    <div>
                      <span className="font-medium">Date:</span> {assessment.date}
                    </div>
                    <div>
                      <span className="font-medium">Total Marks:</span> {assessment.totalMarks}
                    </div>
                    <div>
                      <span className="font-medium">Duration:</span> {assessment.duration}
                    </div>
                  </div>
                </div>
                <div className="flex space-x-2 ml-4">
                  <button className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg">
                    <Eye className="w-5 h-5" />
                  </button>
                  <button className="p-2 text-green-600 hover:bg-green-50 rounded-lg">
                    <Edit className="w-5 h-5" />
                  </button>
                  <button className="p-2 text-red-600 hover:bg-red-50 rounded-lg">
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Create Assessment Modal Placeholder */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-2xl w-full p-6">
              <h2 className="text-lg md:text-xl font-bold text-gray-800 mb-4">Create New Assessment</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1">Assessment Title</label>
                  <input
                    type="text"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ghana-green text-sm"
                    placeholder="Enter assessment title"
                  />
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1">Subject</label>
                    <select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ghana-green text-sm">
                      <option>Mathematics</option>
                      <option>English</option>
                      <option>Science</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1">Type</label>
                    <select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ghana-green text-sm">
                      <option>Exam</option>
                      <option>Quiz</option>
                      <option>Project</option>
                    </select>
                  </div>
                </div>
                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 text-xs md:text-sm text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                  <button className="px-4 py-2 text-xs md:text-sm bg-ghana-green text-white rounded-lg hover:bg-green-700">
                    Create Assessment
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
