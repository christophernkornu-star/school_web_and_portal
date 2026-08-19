'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Save, Archive } from 'lucide-react'
import { toast } from 'react-hot-toast'
import BackButton from '@/components/ui/back-button'
import { Skeleton } from '@/components/ui/skeleton'
import { getCurrentUser } from '@/lib/auth'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'

export default function HistoricalReportsSettings() {
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [settingsId, setSettingsId] = useState<string>('')
  const [retentionYears, setRetentionYears] = useState('5')
  const [enabled, setEnabled] = useState(true)
  const [studentPortalShowHistory, setStudentPortalShowHistory] = useState(false)
  const [activeCount, setActiveCount] = useState(0)
  const [graduatedCount, setGraduatedCount] = useState(0)

  useEffect(() => {
    async function load() {
      const user = await getCurrentUser()
      if (!user) {
        router.push('/login?portal=admin')
        return
      }

      const { data } = await supabase
        .from('historical_reports_settings')
        .select('*')
        .maybeSingle() as { data: any }

      if (data) {
        setSettingsId(data.id)
        setRetentionYears(String(data.retention_years ?? 5))
        setEnabled(data.enabled ?? true)
        setStudentPortalShowHistory(data.student_portal_show_history === true)
      }

      // Count graduated students (for info)
      const { count: grad } = await supabase
        .from('students')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'graduated')
      setGraduatedCount(grad || 0)

      const { count: act } = await supabase
        .from('students')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'active')
      setActiveCount(act || 0)

      setLoading(false)
    }
    load()
  }, [router, supabase])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const user = await getCurrentUser()
      const retention = parseInt(retentionYears)

      if (settingsId) {
        const { error } = await supabase
          .from('historical_reports_settings')
          .update({
            retention_years: retention,
            enabled,
            student_portal_show_history: studentPortalShowHistory,
            updated_at: new Date().toISOString(),
            updated_by: user?.id,
          })
          .eq('id', settingsId)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('historical_reports_settings')
          .insert({
            retention_years: retention,
            enabled,
            student_portal_show_history: studentPortalShowHistory,
            updated_by: user?.id,
          })
        if (error) throw error
      }

      toast.success('Historical reports settings saved')
      router.push('/admin/settings')
    } catch (error: any) {
      console.error(error)
      toast.error('Failed to save: ' + (error?.message || 'unknown error'))
    } finally {
      setSaving(false)
    }
  }

  const handlePurge = async () => {
    if (!confirm(`This will PERMANENTLY delete historical data for graduated students whose graduation date is older than the retention window (${retentionYears} years). This cannot be undone. Continue?`)) {
      return
    }
    try {
      const { data, error } = await supabase.rpc('purge_graduated_history')
      if (error) throw error
      toast.success(`Purged: ${data?.students_purged ?? 0} students (${data?.scores_purged ?? 0} scores, ${data?.remarks_purged ?? 0} remarks)`)
      location.reload()
    } catch (error: any) {
      console.error(error)
      toast.error('Purge failed: ' + (error?.message || 'unknown error'))
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow">
          <div className="container mx-auto px-6 py-4">
            <div className="flex items-center space-x-4">
              <Skeleton className="h-6 w-6 rounded-full" />
              <div className="flex items-center space-x-3">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div>
                  <Skeleton className="h-6 w-48 mb-1" />
                  <Skeleton className="h-4 w-64" />
                </div>
              </div>
            </div>
          </div>
        </header>
        <main className="container mx-auto px-6 py-8">
          <Skeleton className="h-40 w-full max-w-4xl mx-auto" />
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center space-x-4">
            <BackButton href="/admin/settings" />
            <div className="flex items-center space-x-3">
              <Archive className="w-8 h-8 text-purple-600" />
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-gray-800">Historical Reports & Retention</h1>
                <p className="text-xs md:text-sm text-gray-600">Configure retention and purging of graduated students&apos; historical data</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        <form onSubmit={handleSave} className="max-w-4xl mx-auto space-y-6">
          {/* Retention window */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-base md:text-lg font-bold text-gray-800 mb-1">Retention Window</h2>
            <p className="text-xs md:text-sm text-gray-500 mb-4">
              Applies only to <strong>graduated</strong> students. Active students&apos; history is never purged.
              After this many years since graduation, the graduated student&apos;s historical data is permanently deleted.
            </p>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs md:text-sm font-medium text-gray-700 mb-2">Retention Period (years)</label>
                <input
                  type="number"
                  value={retentionYears}
                  onChange={(e) => setRetentionYears(e.target.value)}
                  min={1}
                  max={50}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-600"
                />
                <p className="text-xs text-gray-500 mt-1">Default: 5 years</p>
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 w-full">
                  <div>
                    <p className="font-medium text-gray-800 text-sm">Enable Historical Reports</p>
                    <p className="text-xs text-gray-600">Allow access to archived reports for retained years</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={enabled}
                    onChange={(e) => setEnabled(e.target.checked)}
                    className="w-5 h-5 text-purple-600 rounded focus:ring-2 focus:ring-purple-600 ml-auto"
                  />
                </label>
              </div>
            </div>

            <div className="mt-5 border-t border-gray-100 pt-5">
              <label className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
                <div className="flex-1">
                  <p className="font-medium text-gray-800 text-sm">Student Portal: Show Past Academic Years</p>
                  <p className="text-xs text-gray-600">
                    By default, students only see the <strong>current academic year</strong> in their report-card
                    portal. Enable this to let students view report cards from past academic years too.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={studentPortalShowHistory}
                  onChange={(e) => setStudentPortalShowHistory(e.target.checked)}
                  className="w-5 h-5 text-purple-600 rounded focus:ring-2 focus:ring-purple-600 ml-auto"
                />
              </label>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-bold text-gray-800 mb-4">Current Enrolment Overview</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 text-center">
                <div className="text-3xl font-black text-blue-700">{activeCount}</div>
                <div className="text-sm text-blue-600 font-medium mt-1">Active Students</div>
                <div className="text-xs text-blue-500 mt-1">History retained indefinitely</div>
              </div>
              <div className="bg-purple-50 border border-purple-100 rounded-lg p-4 text-center">
                <div className="text-3xl font-black text-purple-700">{graduatedCount}</div>
                <div className="text-sm text-purple-600 font-medium mt-1">Graduated Students</div>
                <div className="text-xs text-purple-500 mt-1">History retained up to {retentionYears} years</div>
              </div>
            </div>

            <div className="mt-5 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm text-yellow-800">
                <strong>⚠️ Important:</strong> The retention window applies <strong>only</strong> to graduated
                students. Active students&apos; historical records remain accessible by admins and teachers for
                as long as the student is enrolled. Graduated students&apos; history is automatically purged once
                it exceeds the retention window.
              </p>
            </div>
          </div>

          {/* Purge */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-bold text-gray-800 mb-2">Purge Expired Graduated History</h2>
            <p className="text-sm text-gray-600 mb-4">
              Permanently delete historical records for graduated students whose graduation date is older than
              the retention window (<strong>{retentionYears} years</strong>). This is destructive and cannot be undone.
            </p>
            <button
              type="button"
              onClick={handlePurge}
              className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Run Purge Now
            </button>
          </div>

          <div className="flex items-center justify-end space-x-4">
            <Link href="/admin/settings" className="px-6 py-2 border rounded-lg text-gray-700 hover:bg-gray-50">
              Cancel
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center space-x-2 disabled:opacity-50"
            >
              <Save className="w-5 h-5" />
              <span>{saving ? 'Saving...' : 'Save Changes'}</span>
            </button>
          </div>
        </form>
      </main>
    </div>
  )
}
