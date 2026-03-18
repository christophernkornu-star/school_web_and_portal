import { useState, useEffect, useCallback } from 'react'
import { ReportCardData } from './types'
import { fetchReportCardData } from './fetcher'

export function useReportCardData(studentId: string, termId?: string) {
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
    
    try {
      const { student: s, reportData: r, settings, scoreSettings: fetchedScoreSettings } = await fetchReportCardData(studentId, termId)
      
      setStudent(s)
      setReportData(r)
      if (settings) {
        setAcademicSettings(settings)
      }
      if (fetchedScoreSettings) {
        setScoreSettings(fetchedScoreSettings)
      }
    } catch (err) {
      console.error(err)
      setError(err)
    } finally {
      setLoading(false)
    }
  }, [studentId, termId])

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
