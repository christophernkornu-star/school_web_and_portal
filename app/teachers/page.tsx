'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { GraduationCap, ArrowLeft, Mail, Phone, Award } from 'lucide-react'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'

export default function TeachersPage() {
  const [teachers, setTeachers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = getSupabaseBrowserClient()

  useEffect(() => {
    async function loadTeachers() {
      const { data, error } = await supabase
        .from('teachers')
        .select('*')
        .order('first_name', { ascending: true })

      if (error) {
        console.error('Error loading teachers:', error)
      }

      if (data) {
        setTeachers(data)
      }
      setLoading(false)
    }

    loadTeachers()
  }, [])

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="ghana-flag-border bg-white shadow-md">
        <nav className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center space-x-3">
              <GraduationCap className="w-10 h-10 text-methodist-blue" />
              <div>
                <h1 className="text-2xl font-bold text-methodist-blue">
                  Biriwa Methodist 'C' Basic School
                </h1>
                <p className="text-sm text-gray-600">Our Teaching Staff</p>
              </div>
            </Link>
            <Link href="/" className="flex items-center space-x-2 text-gray-700 hover:text-methodist-blue">
              <ArrowLeft className="w-5 h-5" />
              <span>Back Home</span>
            </Link>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="methodist-gradient text-white py-16">
        <div className="container mx-auto px-6 text-center">
          <GraduationCap className="w-16 h-16 mx-auto mb-4" />
          <h2 className="text-4xl font-bold mb-4">Our Teachers</h2>
          <p className="text-xl text-gray-200">
            Meet our dedicated team of educators committed to excellence
          </p>
        </div>
      </section>

      {/* Teachers Grid */}
      <section className="py-12">
        <div className="container mx-auto px-6">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-methodist-blue mx-auto"></div>
            </div>
          ) : teachers.length === 0 ? (
            <div className="bg-white rounded-lg shadow-lg p-12 text-center">
              <GraduationCap className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No teachers found.</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-6">
              {teachers.map((teacher) => (
                <div
                  key={teacher.id}
                  className="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow"
                >
                  {/* Teacher Avatar */}
                  <div className="bg-gradient-to-br from-methodist-blue to-blue-700 h-32 flex items-center justify-center">
                    <div className="bg-white rounded-full p-4">
                      <GraduationCap className="w-12 h-12 text-methodist-blue" />
                    </div>
                  </div>

                  {/* Teacher Info */}
                  <div className="p-6">
                    <h3 className="text-xl font-bold text-gray-800 mb-1">
                      {teacher.first_name} {teacher.last_name}
                    </h3>
                    
                    {teacher.specialization && (
                      <div className="flex items-center text-sm text-gray-600 mb-3">
                        <Award className="w-4 h-4 mr-2 text-ghana-green" />
                        <span>{teacher.specialization}</span>
                      </div>
                    )}

                    {teacher.qualification && (
                      <p className="text-sm text-gray-600 mb-3">
                        {teacher.qualification}
                      </p>
                    )}

                    <div className="space-y-2 pt-3 border-t">
                      {teacher.email && (
                        <div className="flex items-center text-sm text-gray-600">
                          <Mail className="w-4 h-4 mr-2 text-methodist-blue flex-shrink-0" />
                          <span className="truncate">{teacher.email}</span>
                        </div>
                      )}
                      {teacher.phone && (
                        <div className="flex items-center text-sm text-gray-600">
                          <Phone className="w-4 h-4 mr-2 text-ghana-green flex-shrink-0" />
                          <span>{teacher.phone}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
