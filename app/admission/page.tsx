'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Send, CheckCircle } from 'lucide-react'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'
import SiteHeader from '@/components/SiteHeader'

export default function AdmissionPage() {
  const supabase = getSupabaseBrowserClient()
  const [formData, setFormData] = useState({
    applicant_name: '',
    date_of_birth: '',
    gender: '',
    parent_name: '',
    parent_phone: '',
    parent_email: '',
    address: '',
    previous_school: '',
    class_applying_for: '',
  })
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { error } = await supabase
        .from('admission_applications')
        .insert([formData])

      if (error) {
        if (error.message.includes('does not exist')) {
          alert('Online admissions are currently unavailable. Please contact the school directly.')
        } else {
          alert('Error submitting application: ' + error.message)
        }
      } else {
        setSubmitted(true)
      }
    } catch (err) {
      alert('Online admissions are currently unavailable. Please contact the school directly.')
    }

    setLoading(false)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <SiteHeader />

      {/* Hero Section */}
      <section className="methodist-gradient text-white py-12">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-4xl font-bold mb-4">Apply for Admission</h2>
          <p className="text-xl text-gray-200">
            Join our community of excellence in education
          </p>
        </div>
      </section>

      {/* Application Form */}
      <section className="py-12">
        <div className="container mx-auto px-6 max-w-3xl">
          {submitted ? (
            <div className="bg-white rounded-lg shadow-lg p-12 text-center">
              <CheckCircle className="w-20 h-20 text-ghana-green mx-auto mb-6" />
              <h3 className="text-3xl font-bold text-gray-800 mb-4">Application Submitted!</h3>
              <p className="text-gray-600 mb-6">
                Thank you for applying to Biriwa Methodist 'C' Basic School. 
                We will review your application and contact you soon.
              </p>
              <Link href="/" className="btn-primary inline-block">
                Return to Homepage
              </Link>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-lg p-8">
              <h3 className="text-2xl font-bold text-gray-800 mb-6">Admission Application Form</h3>
              
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Student Information */}
                <div>
                  <h4 className="text-lg font-semibold text-methodist-blue mb-4">Student Information</h4>
                  
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Full Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="applicant_name"
                        required
                        value={formData.applicant_name}
                        onChange={handleChange}
                        className="input-field"
                        placeholder="Student's full name"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Date of Birth <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="date"
                        name="date_of_birth"
                        required
                        value={formData.date_of_birth}
                        onChange={handleChange}
                        className="input-field"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Gender <span className="text-red-500">*</span>
                      </label>
                      <select
                        name="gender"
                        required
                        value={formData.gender}
                        onChange={handleChange}
                        className="input-field"
                      >
                        <option value="">Select Gender</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Class Applying For <span className="text-red-500">*</span>
                      </label>
                      <select
                        name="class_applying_for"
                        required
                        value={formData.class_applying_for}
                        onChange={handleChange}
                        className="input-field"
                      >
                        <option value="">Select Class</option>
                        <option value="Basic 1">Basic 1</option>
                        <option value="Basic 2">Basic 2</option>
                        <option value="Basic 3">Basic 3</option>
                        <option value="Basic 4">Basic 4</option>
                        <option value="Basic 5">Basic 5</option>
                        <option value="Basic 6">Basic 6</option>
                        <option value="Basic 7">Basic 7</option>
                        <option value="Basic 8">Basic 8</option>
                        <option value="Basic 9">Basic 9</option>
                      </select>
                    </div>
                  </div>

                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Previous School
                    </label>
                    <input
                      type="text"
                      name="previous_school"
                      value={formData.previous_school}
                      onChange={handleChange}
                      className="input-field"
                      placeholder="Name of previous school (if any)"
                    />
                  </div>
                </div>

                {/* Parent/Guardian Information */}
                <div>
                  <h4 className="text-lg font-semibold text-methodist-blue mb-4">Parent/Guardian Information</h4>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Parent/Guardian Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="parent_name"
                        required
                        value={formData.parent_name}
                        onChange={handleChange}
                        className="input-field"
                        placeholder="Full name"
                      />
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Phone Number <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="tel"
                          name="parent_phone"
                          required
                          value={formData.parent_phone}
                          onChange={handleChange}
                          className="input-field"
                          placeholder="+233 XX XXX XXXX"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Email Address
                        </label>
                        <input
                          type="email"
                          name="parent_email"
                          value={formData.parent_email}
                          onChange={handleChange}
                          className="input-field"
                          placeholder="email@example.com"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Residential Address <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        name="address"
                        required
                        value={formData.address}
                        onChange={handleChange}
                        rows={3}
                        className="input-field"
                        placeholder="Full residential address"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full btn-primary disabled:opacity-50 flex items-center justify-center space-x-2"
                  >
                    <Send className="w-5 h-5" />
                    <span>{loading ? 'Submitting...' : 'Submit Application'}</span>
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
