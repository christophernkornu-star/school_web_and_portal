import { useState, useEffect, useCallback } from 'react'
import { ReportCardData } from './types'
import { fetchReportCardData } from './fetcher'

// Transient network failures (e.g. ERR_CONNECTION_CLOSED / 'Failed to fetch' from
// Supabase) can drop the report-card fetch mid-flight. Retrying with a short backoff
// lets the page self-recover instead of showing an empty/error state on a flaky connection.
const MAX_ATTEMPTS = 3
const RETRY_BASE_DELAY_MS = 800

export function useReportCardData(
  studentId: string,
  termId?: string,
  options?: { restrictCurrentClassOnly?: boolean }
) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<any>(null)
  const [student, setStudent] = useState<any>(null)
  const [reportData, setReportData] = useState<ReportCardData | null>(null)
  const [academicSettings, setAcademicSettings] = useState<any>(null)
  const [scoreSettings, setScoreSettings] = useState({ classScorePercentage: 30, examScorePercentage: 70 })

  const loadData = useCallback(async () => {
    if (!studentId) return
    setLoading(true)
    setError(null)
    
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
      const { student: s, reportData: r, settings, scoreSettings: fetchedScoreSettings } = await fetchReportCardData(studentId, termId, options)

      setStudent(s)
      setReportData(r)
      if (settings) {
        setAcademicSettings(settings)
      }
      if (fetchedScoreSettings) {
        setScoreSettings(fetchedScoreSettings)
      }
        setLoading(false)
        return // success
    } catch (err) {
        console.error(`Fetch report card attempt ${attempt}/${MAX_ATTEMPTS} failed:`, err)
        // Give up after the final attempt.
        if (attempt === MAX_ATTEMPTS) {
          setError(err)
          setLoading(false)
        } else {
          // Short backoff between retries so transient network issues resolve.
          await new Promise(resolve => setTimeout(resolve, RETRY_BASE_DELAY_MS * attempt))
    }
      }
    }
  }, [studentId, termId, options?.restrictCurrentClassOnly])

  useEffect(() => {
    loadData()
  }, [loadData])

  return {
    loading,
    error,
    student,
    reportData,
    academicSettings,
    scoreSettings,
    refresh: loadData
  }
}

