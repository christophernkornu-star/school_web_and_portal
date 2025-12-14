'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, TrendingUp, AlertCircle, CheckCircle, Users } from 'lucide-react'
import { getCurrentUser } from '@/lib/auth'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'

export default function AcademicYearTransition() {
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()
  const [loading, setLoading] = useState(true)
  const [transitioning, setTransitioning] = useState(false)
  const [currentAcademicYear, setCurrentAcademicYear] = useState('')
  const [newAcademicYear, setNewAcademicYear] = useState('')
  const [passingAverage, setPassingAverage] = useState(30)
  const [transitionResult, setTransitionResult] = useState<any>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadSettings() {
      const user = await getCurrentUser()
      if (!user) {
        router.push('/login?portal=admin')
        return
      }

      // Load settings
      const { data: settingsData } = await supabase
        .from('system_settings')
        .select('setting_key, setting_value')
        .in('setting_key', ['current_academic_year', 'promotion_passing_average'])

      const settingsMap = new Map<string, string>(settingsData?.map((s: any) => [s.setting_key, s.setting_value]) || [])
      
      const currentYear = settingsMap.get('current_academic_year')
      if (currentYear) {
        setCurrentAcademicYear(currentYear)
        
        // Generate next year suggestion
        const [startYear] = currentYear.split('/')
        const nextStartYear = parseInt(startYear) + 1
        setNewAcademicYear(`${nextStartYear}/${nextStartYear + 1}`)
      }

      const savedAverage = settingsMap.get('promotion_passing_average')
      if (savedAverage) {
        setPassingAverage(parseFloat(savedAverage))
      }

      setLoading(false)
    }
    loadSettings()
  }, [router])

  const handleTransition = async () => {
    if (!newAcademicYear.match(/^\d{4}\/\d{4}$/)) {
      setError('Invalid academic year format. Use YYYY/YYYY format (e.g., 2025/2026)')
      return
    }

    setError('')
    setTransitioning(true)

    try {
      const user = await getCurrentUser()
      
      // Call the database function to execute academic year transition
      const { data, error: transitionError } = await supabase
        .rpc('execute_academic_year_transition', {
          p_old_academic_year: currentAcademicYear,
          p_new_academic_year: newAcademicYear,
          p_min_average: passingAverage
        })

      if (transitionError) throw transitionError

      // Update the current academic year in system_settings
      const { error: updateError } = await supabase
        .from('system_settings')
        .update({
          setting_value: newAcademicYear,
          updated_at: new Date().toISOString()
        })
        .eq('setting_key', 'current_academic_year')

      if (updateError) throw updateError

      // Update passing average setting
      await supabase
        .from('system_settings')
        .upsert({
          setting_key: 'promotion_passing_average',
          setting_value: passingAverage.toString(),
          description: 'Minimum average score required for automatic promotion',
          updated_at: new Date().toISOString()
        }, { onConflict: 'setting_key' })

      // Reset current term to First Term - get the UUID of First Term for the new academic year
      const { data: firstTerm } = await supabase
        .from('academic_terms')
        .select('id')
        .eq('academic_year', newAcademicYear)
        .eq('name', 'First Term')
        .single() as { data: any }

      if (firstTerm) {
        await supabase
          .from('system_settings')
          .update({
            setting_value: firstTerm.id,
            updated_at: new Date().toISOString()
          })
          .eq('setting_key', 'current_term')
      }

      setTransitionResult(data[0])
      setCurrentAcademicYear(newAcademicYear)
      
    } catch (err: any) {
      setError(err.message || 'Failed to transition academic year')
      console.error('Transition error:', err)
    } finally {
      setTransitioning(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-methodist-blue"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center space-x-4">
            <Link href="/admin/settings" className="text-gray-600 hover:text-gray-800">
              <ArrowLeft className="w-6 h-6" />
            </Link>
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-gray-800">Academic Year Transition</h1>
              <p className="text-xs md:text-sm text-gray-600">Promote students to next academic year</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8 max-w-4xl">
        {/* Current Year Info */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-base md:text-lg font-bold text-gray-800 mb-4">Current Academic Year</h2>
          <div className="flex items-center space-x-3">
            <div className="bg-blue-100 p-3 rounded-lg">
              <TrendingUp className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-xl md:text-2xl font-bold text-gray-800">{currentAcademicYear}</p>
              <p className="text-xs md:text-sm text-gray-600">Active academic year</p>
            </div>
          </div>
        </div>

        {/* How It Works */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
          <div className="flex items-start space-x-3">
            <AlertCircle className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
            <div>
              <h3 className="font-bold text-blue-900 mb-2">How Academic Year Transition Works</h3>
              <ul className="space-y-2 text-sm text-blue-800">
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span><strong>Students with {passingAverage}% or higher average</strong> (across all 3 terms) will be automatically promoted to the next class.</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span><strong>Students below {passingAverage}% average</strong> will require class teacher decision (promote or repeat).</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>Class teachers will be notified to review and decide on students requiring their decision.</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>This process cannot be undone. Ensure all third term scores are entered before proceeding.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Transition Form */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4">Execute Year Transition</h2>
          
          <div className="grid md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                New Academic Year
              </label>
              <input
                type="text"
                value={newAcademicYear}
                onChange={(e) => setNewAcademicYear(e.target.value)}
                placeholder="e.g., 2025/2026"
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-methodist-blue"
                disabled={transitioning}
              />
              <p className="mt-1 text-sm text-gray-500">
                Format: YYYY/YYYY (e.g., 2025/2026)
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Promotion Passing Average (%)
              </label>
              <input
                type="number"
                value={passingAverage}
                onChange={(e) => setPassingAverage(Number(e.target.value))}
                min="0"
                max="100"
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-methodist-blue"
                disabled={transitioning}
              />
              <p className="mt-1 text-sm text-gray-500">
                Minimum average score for automatic promotion
              </p>
            </div>
          </div>

          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <button
            onClick={handleTransition}
            disabled={transitioning || !newAcademicYear}
            className="w-full bg-methodist-blue text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
          >
            {transitioning ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                <span>Processing Transition...</span>
              </>
            ) : (
              <>
                <TrendingUp className="w-5 h-5" />
                <span>Execute Academic Year Transition</span>
              </>
            )}
          </button>
        </div>

        {/* Transition Results */}
        {transitionResult && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-6">
            <div className="flex items-start space-x-3 mb-4">
              <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0" />
              <div>
                <h3 className="font-bold text-green-900 mb-2">Transition Completed Successfully!</h3>
                <p className="text-sm text-green-800">
                  Academic year has been updated to <strong>{newAcademicYear}</strong>
                </p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-white rounded-lg p-4">
                <div className="flex items-center space-x-3">
                  <div className="bg-green-100 p-2 rounded">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-800">
                      {transitionResult.auto_promoted_count || 0}
                    </p>
                    <p className="text-sm text-gray-600">Auto-Promoted (≥{passingAverage}%)</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg p-4">
                <div className="flex items-center space-x-3">
                  <div className="bg-yellow-100 p-2 rounded">
                    <Users className="w-5 h-5 text-yellow-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-800">
                      {transitionResult.teacher_decision_required_count || 0}
                    </p>
                    <p className="text-sm text-gray-600">Awaiting Teacher Decision</p>
                  </div>
                </div>
              </div>
            </div>

            {transitionResult.errors && transitionResult.errors.length > 0 && (
              <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
                <h4 className="font-semibold text-red-900 mb-2">Errors Encountered:</h4>
                <ul className="space-y-1">
                  {transitionResult.errors.map((error: string, idx: number) => (
                    <li key={idx} className="text-sm text-red-800">• {error}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="mt-4 pt-4 border-t border-green-200">
              <p className="text-sm text-green-800">
                <strong>Next Steps:</strong> Class teachers can now review and decide on students requiring their decision in the Teacher Promotions page.
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
