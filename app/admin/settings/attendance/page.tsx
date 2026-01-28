'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Save, Calendar, Users, TrendingUp } from 'lucide-react'
import { toast } from 'react-hot-toast'
import BackButton from '@/components/ui/BackButton'
import { Skeleton } from '@/components/ui/skeleton'
import { getCurrentUser } from '@/lib/auth'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'

interface Term {
  id: string
  name: string
  academic_year: string
  start_date: string
  end_date: string
  total_days: number
  is_current: boolean
}

export default function AttendanceSettings() {
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [terms, setTerms] = useState<Term[]>([])
  const [editingTerms, setEditingTerms] = useState<{ [key: string]: number }>({})

  useEffect(() => {
    async function loadSettings() {
      const user = await getCurrentUser()
      if (!user) {
        router.push('/login?portal=admin')
        return
      }

      await loadTerms()
      setLoading(false)
    }
    loadSettings()
  }, [router])

  async function loadTerms() {
    const termsResult = await supabase
      .from('academic_terms')
      .select('*')
      .order('academic_year', { ascending: false })
      .order('name')
    const data = termsResult.data as any[] | null
    const error = termsResult.error

    if (error) {
      console.error('Error loading terms:', error)
      return
    }

    if (data) {
      setTerms(data)
      // Initialize editing state with current values
      const initial: { [key: string]: number } = {}
      data.forEach((term: any) => {
        initial[term.id] = term.total_days || 0
      })
      setEditingTerms(initial)
    }
  }

  const handleSave = async () => {
    setSaving(true)

    try {
      // Update each term's total_days
      const updates = Object.entries(editingTerms).map(([termId, totalDays]) =>
        supabase
          .from('academic_terms')
          .update({ total_days: totalDays })
          .eq('id', termId)
      )

      const results = await Promise.all(updates)
      const hasError = results.some(r => r.error)

      if (hasError) {
        toast.error('Error saving some term settings. Please try again.')
      } else {
        toast.success('Attendance settings saved successfully!')
        await loadTerms()
      }
    } catch (error) {
      console.error('Error saving settings:', error)
      toast.error('Failed to save settings. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const updateTermDays = (termId: string, days: number) => {
    setEditingTerms(prev => ({
      ...prev,
      [termId]: Math.max(0, days) // Ensure non-negative
    }))
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
         <div className="text-center w-full max-w-4xl px-4">
             <div className="space-y-4">
                <Skeleton className="h-8 w-64 mx-auto" />
                <Skeleton className="h-4 w-48 mx-auto" />
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-12">
                     <Skeleton className="h-32 rounded-lg" />
                     <Skeleton className="h-32 rounded-lg" />
                     <Skeleton className="h-32 rounded-lg" />
                </div>
             </div>
         </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <header className="bg-white shadow sticky top-0 z-30">
        <div className="container mx-auto px-4 md:px-6 py-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center space-x-4">
              <BackButton href="/admin/settings" />
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Attendance Settings</h1>
                <p className="mt-2 text-xs md:text-sm text-gray-600">
                  Set the total number of school days for each term. Teachers will record how many days each student was present.
                </p>
              </div>
            </div>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center space-x-2 px-4 py-2 bg-ghana-green text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition"
            >
              <Save className="w-5 h-5" />
              <span>{saving ? 'Saving...' : 'Save Changes'}</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
          <h3 className="font-semibold text-blue-900 mb-3">How It Works</h3>
          <div className="space-y-2 text-xs md:text-sm text-blue-800">
            <p><strong>1. Set Total Days:</strong> Enter the total number of school days for each term below</p>
            <p><strong>2. Teachers Record:</strong> Class teachers will enter the number of days each student was present</p>
            <p><strong>3. Automatic Calculation:</strong> The system calculates attendance as "Days Present / Total Days"</p>
            <p><strong>4. Statistics:</strong> View attendance rates by class, gender (boys/girls), and overall</p>
          </div>
        </div>

        {/* Terms Grid */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg md:text-xl font-semibold text-gray-800">Term Attendance Days</h2>
            <p className="text-xs md:text-sm text-gray-600 mt-1">Configure total school days for each academic term</p>
          </div>

          <div className="p-6">
            <div className="space-y-4">
              {terms.map(term => (
                <div
                  key={term.id}
                  className={`flex items-center justify-between p-4 border rounded-lg ${
                    term.is_current ? 'border-ghana-green bg-green-50' : 'border-gray-200'
                  }`}
                >
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <Calendar className="w-5 h-5 text-gray-400" />
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          {term.name} - {term.academic_year}
                          {term.is_current && (
                            <span className="ml-2 text-xs bg-ghana-green text-white px-2 py-1 rounded-full">
                              Current
                            </span>
                          )}
                        </h3>
                        <p className="text-sm text-gray-600">
                          {new Date(term.start_date).toLocaleDateString()} - {new Date(term.end_date).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Total School Days
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="366"
                        value={editingTerms[term.id] || 0}
                        onChange={(e) => updateTermDays(term.id, parseInt(e.target.value) || 0)}
                        className="w-24 px-3 py-2 border border-gray-300 rounded-lg text-center font-semibold focus:ring-2 focus:ring-ghana-green focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>
              ))}

              {terms.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <p>No academic terms found</p>
                  <p className="text-sm mt-1">Create terms in General Settings first</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Statistics Info */}
        <div className="mt-8 grid md:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center space-x-3 mb-3">
              <div className="bg-blue-100 p-3 rounded-lg">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="font-semibold text-gray-800">Overall Stats</h3>
            </div>
            <p className="text-sm text-gray-600">
              View class-wide attendance rates and trends across all students
            </p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center space-x-3 mb-3">
              <div className="bg-pink-100 p-3 rounded-lg">
                <TrendingUp className="w-6 h-6 text-pink-600" />
              </div>
              <h3 className="font-semibold text-gray-800">Gender Breakdown</h3>
            </div>
            <p className="text-sm text-gray-600">
              Compare attendance rates between boys and girls in each class
            </p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center space-x-3 mb-3">
              <div className="bg-green-100 p-3 rounded-lg">
                <Calendar className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="font-semibold text-gray-800">Individual Records</h3>
            </div>
            <p className="text-sm text-gray-600">
              Track each student's attendance: days present out of total days
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}
