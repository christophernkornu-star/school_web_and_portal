'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Save, Plus, Trash2, Info, AlertCircle, CheckCircle, XCircle, HelpCircle } from 'lucide-react'
import { toast } from 'react-hot-toast'
import BackButton from '@/components/ui/back-button'
import { Skeleton } from '@/components/ui/skeleton'
import { getCurrentUser } from '@/lib/auth'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'
import { PromotionCriteria, DEFAULT_PROMOTION_CRITERIA, evaluatePromotionCriteria, calculateAggregate, formatEvaluationSummary } from '@/lib/reports/promotion-criteria'
import { getGradeValue } from '@/lib/academic-utils'

export default function PromotionCriteriaSettings() {
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [academicYear, setAcademicYear] = useState('')
  const [criteria, setCriteria] = useState<PromotionCriteria>({
    academic_year: '',
    ...DEFAULT_PROMOTION_CRITERIA
  })
  const [savedCriteria, setSavedCriteria] = useState<PromotionCriteria | null>(null)
  const [previewStudentId, setPreviewStudentId] = useState('')
  const [previewResult, setPreviewResult] = useState<any>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [allSubjects, setAllSubjects] = useState<string[]>([])

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      const user = await getCurrentUser()
      if (!user) {
        router.push('/login?portal=admin')
        return
      }

      // Get current academic year
      const { data: settingsData } = await supabase
        .from('system_settings')
        .select('setting_value')
        .eq('setting_key', 'current_academic_year')
        .single()

      const year = settingsData?.setting_value || '2024/2025'
      setAcademicYear(year)

      // Load existing criteria
      const { data: existingCriteria } = await supabase
        .from('promotion_criteria')
        .select('*')
        .eq('academic_year', year)
        .maybeSingle()

      if (existingCriteria) {
        const parsed = {
          ...existingCriteria,
          core_subjects: existingCriteria.core_subjects || DEFAULT_PROMOTION_CRITERIA.core_subjects
        }
        setCriteria({ ...parsed, academic_year: year })
        setSavedCriteria({ ...parsed, academic_year: year })
      } else {
        setCriteria(prev => ({ ...prev, academic_year: year }))
      }

      // Load all subjects for reference
      const { data: subjects } = await supabase
        .from('subjects')
        .select('name')
        .order('name')

      if (subjects) {
        // Deduplicate subject names to avoid React key conflicts
        const uniqueSubjects = [...new Set<string>(subjects.map((s: any) => s.name))]
        setAllSubjects(uniqueSubjects)
      }

    } catch (error) {
      console.error('Error loading data:', error)
      toast.error('Failed to load settings')
    } finally {
      setLoading(false)
    }
  }

  async function handleSave() {
    setSaving(true)
    try {
      const criteriaToSave = {
        academic_year: academicYear,
        class_level: criteria.class_level || null,
        overall_passing_average: criteria.overall_passing_average,
        overall_enabled: criteria.overall_enabled,
        core_subjects_enabled: criteria.core_subjects_enabled,
        core_subjects: criteria.core_subjects,
        core_subject_passing_score: criteria.core_subject_passing_score,
        aggregate_enabled: criteria.aggregate_enabled,
        max_aggregate: criteria.max_aggregate,
        attendance_enabled: criteria.attendance_enabled,
        minimum_attendance_percentage: criteria.minimum_attendance_percentage,
        require_all_criteria: criteria.require_all_criteria
      }

      const { error } = await supabase
        .from('promotion_criteria')
        .upsert(criteriaToSave, { onConflict: 'academic_year' })

      if (error) throw error

      setSavedCriteria({ ...criteria })
      toast.success('Promotion criteria saved successfully!')
    } catch (error: any) {
      console.error('Error saving criteria:', error)
      toast.error(error.message || 'Failed to save criteria')
    } finally {
      setSaving(false)
    }
  }

  function hasChanges(): boolean {
    if (!savedCriteria) return true
    return JSON.stringify({
      overall_enabled: criteria.overall_enabled,
      overall_passing_average: criteria.overall_passing_average,
      core_subjects_enabled: criteria.core_subjects_enabled,
      core_subjects: criteria.core_subjects,
      core_subject_passing_score: criteria.core_subject_passing_score,
      aggregate_enabled: criteria.aggregate_enabled,
      max_aggregate: criteria.max_aggregate,
      attendance_enabled: criteria.attendance_enabled,
      minimum_attendance_percentage: criteria.minimum_attendance_percentage,
      require_all_criteria: criteria.require_all_criteria
    }) !== JSON.stringify({
      overall_enabled: savedCriteria.overall_enabled,
      overall_passing_average: savedCriteria.overall_passing_average,
      core_subjects_enabled: savedCriteria.core_subjects_enabled,
      core_subjects: savedCriteria.core_subjects,
      core_subject_passing_score: savedCriteria.core_subject_passing_score,
      aggregate_enabled: savedCriteria.aggregate_enabled,
      max_aggregate: savedCriteria.max_aggregate,
      attendance_enabled: savedCriteria.attendance_enabled,
      minimum_attendance_percentage: savedCriteria.minimum_attendance_percentage,
      require_all_criteria: savedCriteria.require_all_criteria
    })
  }

  function toggleCoreSubject(subject: string) {
    setCriteria(prev => ({
      ...prev,
      core_subjects: prev.core_subjects.includes(subject)
        ? prev.core_subjects.filter(s => s !== subject)
        : [...prev.core_subjects, subject]
    }))
  }

  async function runPreview() {
    if (!previewStudentId) {
      toast.error('Please enter a student ID')
      return
    }

    setPreviewLoading(true)
    setPreviewResult(null)

    try {
      // Find student
      const { data: student } = await supabase
        .from('students')
        .select('id, first_name, last_name, class_id')
        .eq('student_id', previewStudentId)
        .maybeSingle()

      if (!student) {
        toast.error('No student found with that ID')
        setPreviewLoading(false)
        return
      }

      // Get term IDs for academic year
      const { data: terms } = await supabase
        .from('academic_terms')
        .select('id')
        .eq('academic_year', academicYear)

      if (!terms || terms.length === 0) {
        toast.error('No terms found for this academic year')
        setPreviewLoading(false)
        return
      }

      const termIds = terms.map((t: any) => t.id)

      // Get scores
      const { data: scores } = await supabase
        .from('scores')
        .select('total, subjects(name)')
        .eq('student_id', student.id)
        .in('term_id', termIds)
        .not('total', 'is', null)

      // Get attendance
      const { data: attendanceData } = await supabase
        .from('student_attendance')
        .select('days_present')
        .eq('student_id', student.id)
        .in('term_id', termIds)

      const totalPresent = (attendanceData as any[])?.reduce((sum: number, a: any) => sum + (a.days_present || 0), 0) || 0

      const { data: termMeta } = await supabase
        .from('academic_terms')
        .select('total_days')
        .in('id', termIds)

      const totalDays = (termMeta as any[])?.reduce((sum: number, t: any) => sum + (t.total_days || 0), 0) || 1

      // Build subject scores
      const subjectMap = new Map<string, number[]>()
      scores?.forEach((s: any) => {
        const name = s.subjects?.name || 'Unknown'
        if (!subjectMap.has(name)) subjectMap.set(name, [])
        subjectMap.get(name)!.push(s.total)
      })

      const subjectScores: { subjectName: string; score: number }[] = []
      subjectMap.forEach((scores, name) => {
        const avg = scores.reduce((a, b) => a + b, 0) / scores.length
        subjectScores.push({ subjectName: name, score: avg })
      })

      const overallAvg = subjectScores.length > 0
        ? subjectScores.reduce((sum, s) => sum + s.score, 0) / subjectScores.length
        : 0

      const attendancePercent = (totalPresent / totalDays) * 100

      const evaluation = evaluatePromotionCriteria({
        averageScore: overallAvg,
        subjectScores,
        attendancePercentage: attendancePercent,
        criteria
      })

      setPreviewResult({
        student: `${student.first_name} ${student.last_name}`,
        overallAvg,
        attendancePercent,
        subjectScores,
        evaluation
      })

    } catch (error: any) {
      console.error('Preview error:', error)
      toast.error(error.message || 'Failed to run preview')
    } finally {
      setPreviewLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow">
          <div className="container mx-auto px-4 md:px-6 py-4">
            <div className="flex items-center gap-4">
              <Skeleton className="w-10 h-10 rounded-full" />
              <div className="space-y-1">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-4 w-32" />
              </div>
            </div>
          </div>
        </header>
        <main className="container mx-auto px-4 md:px-6 py-6 md:py-8 max-w-4xl">
          <Skeleton className="h-96 w-full rounded-lg" />
        </main>
      </div>
    )
  }

  const enabledCount = [
    criteria.overall_enabled,
    criteria.core_subjects_enabled,
    criteria.aggregate_enabled,
    criteria.attendance_enabled
  ].filter(Boolean).length

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="container mx-auto px-4 md:px-6 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center space-x-4">
              <BackButton href="/admin/settings" />
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-gray-800">Promotion Criteria</h1>
                <p className="text-xs md:text-sm text-gray-600">
                  Set the criteria determining student promotion for {academicYear}
                </p>
              </div>
            </div>
            <button
              onClick={handleSave}
              disabled={saving || !hasChanges()}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center justify-center space-x-2 disabled:opacity-50 w-full sm:w-auto transition-all"
            >
              {saving ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              ) : (
                <Save className="w-5 h-5" />
              )}
              <span>{saving ? 'Saving...' : 'Save Changes'}</span>
            </button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 md:px-6 py-6 md:py-8 max-w-4xl">
        {/* How It Works */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 md:p-6 mb-6">
          <div className="flex items-start space-x-3">
            <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-blue-900 mb-2">How Promotion Criteria Work</h3>
              <ul className="space-y-1.5 text-sm text-blue-800">
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>Configure one or more criteria for promotion. Only enabled criteria are evaluated.</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>With <strong>"Must meet ALL criteria"</strong>, students must pass every enabled check to be promoted.</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>With <strong>"Must meet ANY criterion"</strong>, students pass if they succeed in at least one enabled check.</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>Currently <strong>{enabledCount}</strong> of 4 criteria types are enabled.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Criteria Form */}
        <div className="bg-white rounded-lg shadow overflow-hidden mb-6">
          <div className="p-6 space-y-8">
            {/* 1. Overall Performance */}
            <div className="border border-gray-200 rounded-lg p-4 md:p-5">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start space-x-3">
                  <input
                    type="checkbox"
                    checked={criteria.overall_enabled}
                    onChange={(e) => setCriteria(prev => ({ ...prev, overall_enabled: e.target.checked }))}
                    className="mt-1 w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <div>
                    <h3 className="font-semibold text-gray-900">Overall Performance</h3>
                    <p className="text-sm text-gray-500">
                      Check the student&apos;s average score across all subjects for the entire academic year
                    </p>
                  </div>
                </div>
                <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${
                  criteria.overall_enabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                }`}>
                  {criteria.overall_enabled ? 'Enabled' : 'Disabled'}
                </span>
              </div>
              {criteria.overall_enabled && (
                <div className="ml-8 mt-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Minimum Passing Average (%)
                  </label>
                  <div className="flex items-center space-x-3">
                    <input
                      type="number"
                      value={criteria.overall_passing_average}
                      onChange={(e) => setCriteria(prev => ({ ...prev, overall_passing_average: Number(e.target.value) }))}
                      min="0"
                      max="100"
                      className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-center"
                    />
                    <span className="text-sm text-gray-500">
                      Student passes if average <strong>≥ {criteria.overall_passing_average}%</strong>
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* 2. Core Subjects */}
            <div className="border border-gray-200 rounded-lg p-4 md:p-5">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start space-x-3">
                  <input
                    type="checkbox"
                    checked={criteria.core_subjects_enabled}
                    onChange={(e) => setCriteria(prev => ({ ...prev, core_subjects_enabled: e.target.checked }))}
                    className="mt-1 w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <div>
                    <h3 className="font-semibold text-gray-900">Core Subject Requirements</h3>
                    <p className="text-sm text-gray-500">
                      Require minimum scores in specific core subjects. Student must pass ALL selected core subjects.
                    </p>
                  </div>
                </div>
                <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${
                  criteria.core_subjects_enabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                }`}>
                  {criteria.core_subjects_enabled ? 'Enabled' : 'Disabled'}
                </span>
              </div>
              {criteria.core_subjects_enabled && (
                <div className="ml-8 mt-3 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Minimum Score per Core Subject (%)
                    </label>
                    <div className="flex items-center space-x-3">
                      <input
                        type="number"
                        value={criteria.core_subject_passing_score}
                        onChange={(e) => setCriteria(prev => ({ ...prev, core_subject_passing_score: Number(e.target.value) }))}
                        min="0"
                        max="100"
                        className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-center"
                      />
                      <span className="text-sm text-gray-500">
                        Student fails any core subject scoring <strong>&lt; {criteria.core_subject_passing_score}%</strong>
                      </span>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select Core Subjects ({criteria.core_subjects.length} selected)
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {allSubjects.map((subject, idx) => {
                        const isSelected = criteria.core_subjects.includes(subject)
                        return (
                          <button
                            key={`subject-${idx}`}
                            onClick={() => toggleCoreSubject(subject)}
                            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                              isSelected
                                ? 'bg-blue-100 border-blue-300 text-blue-700'
                                : 'bg-gray-50 border-gray-200 text-gray-600 hover:border-gray-300'
                            }`}
                          >
                            {subject}
                          </button>
                        )
                      })}
                      {allSubjects.length === 0 && (
                        <p className="text-sm text-gray-400 italic">No subjects found in the system</p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 3. Aggregate System */}
            <div className="border border-gray-200 rounded-lg p-4 md:p-5">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start space-x-3">
                  <input
                    type="checkbox"
                    checked={criteria.aggregate_enabled}
                    onChange={(e) => setCriteria(prev => ({ ...prev, aggregate_enabled: e.target.checked }))}
                    className="mt-1 w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <div>
                    <h3 className="font-semibold text-gray-900">BECE Aggregate System</h3>
                    <p className="text-sm text-gray-500">
                      Use the BECE-style aggregate calculation: English + Mathematics + Science + Social Studies + Best 2 Others
                    </p>
                  </div>
                </div>
                <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${
                  criteria.aggregate_enabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                }`}>
                  {criteria.aggregate_enabled ? 'Enabled' : 'Disabled'}
                </span>
              </div>
              {criteria.aggregate_enabled && (
                <div className="ml-8 mt-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Maximum Aggregate for Promotion
                  </label>
                  <div className="flex items-center space-x-3">
                    <input
                      type="number"
                      value={criteria.max_aggregate}
                      onChange={(e) => setCriteria(prev => ({ ...prev, max_aggregate: Number(e.target.value) }))}
                      min="6"
                      max="54"
                      className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-center"
                    />
                    <span className="text-sm text-gray-500">
                      Student passes if aggregate <strong>≤ {criteria.max_aggregate}</strong> (lower is better)
                    </span>
                  </div>
                  <div className="mt-2 bg-gray-50 rounded-lg p-3 text-xs text-gray-600">
                    <strong>Subject categories used:</strong> English, Mathematics, Integrated Science, Social Studies (core 4)
                    + best 2 elective subjects. Missing subjects default to grade 9.
                  </div>
                </div>
              )}
            </div>

            {/* 4. Attendance */}
            <div className="border border-gray-200 rounded-lg p-4 md:p-5">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start space-x-3">
                  <input
                    type="checkbox"
                    checked={criteria.attendance_enabled}
                    onChange={(e) => setCriteria(prev => ({ ...prev, attendance_enabled: e.target.checked }))}
                    className="mt-1 w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <div>
                    <h3 className="font-semibold text-gray-900">Attendance Requirement</h3>
                    <p className="text-sm text-gray-500">
                      Require minimum attendance percentage for the academic year
                    </p>
                  </div>
                </div>
                <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${
                  criteria.attendance_enabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                }`}>
                  {criteria.attendance_enabled ? 'Enabled' : 'Disabled'}
                </span>
              </div>
              {criteria.attendance_enabled && (
                <div className="ml-8 mt-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Minimum Attendance (%)
                  </label>
                  <div className="flex items-center space-x-3">
                    <input
                      type="number"
                      value={criteria.minimum_attendance_percentage}
                      onChange={(e) => setCriteria(prev => ({ ...prev, minimum_attendance_percentage: Number(e.target.value) }))}
                      min="0"
                      max="100"
                      className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-center"
                    />
                    <span className="text-sm text-gray-500">
                      Student passes if attendance <strong>≥ {criteria.minimum_attendance_percentage}%</strong>
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* 5. Decision Logic */}
            <div className="border border-gray-200 rounded-lg p-4 md:p-5">
              <div className="flex items-start space-x-3 mb-4">
                <HelpCircle className="w-5 h-5 text-gray-400 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-gray-900">Decision Logic</h3>
                  <p className="text-sm text-gray-500">
                    How should the enabled criteria be combined to make the final promotion decision?
                  </p>
                </div>
              </div>
              <div className="ml-8 space-y-3">
                <label className="flex items-start space-x-3 p-3 rounded-lg border cursor-pointer transition-all hover:bg-blue-50 ${
                  criteria.require_all_criteria ? 'border-blue-300 bg-blue-50' : 'border-gray-200'
                }">
                  <input
                    type="radio"
                    checked={criteria.require_all_criteria}
                    onChange={() => setCriteria(prev => ({ ...prev, require_all_criteria: true }))}
                    className="mt-0.5 w-4 h-4 text-blue-600 focus:ring-blue-500"
                  />
                  <div>
                    <span className="font-medium text-gray-900">Student must meet ALL enabled criteria</span>
                    <p className="text-sm text-gray-500">
                      Strict mode. Students must pass every enabled check. Use this for high standards.
                    </p>
                  </div>
                </label>
                <label className="flex items-start space-x-3 p-3 rounded-lg border cursor-pointer transition-all hover:bg-blue-50 ${
                  !criteria.require_all_criteria ? 'border-blue-300 bg-blue-50' : 'border-gray-200'
                }">
                  <input
                    type="radio"
                    checked={!criteria.require_all_criteria}
                    onChange={() => setCriteria(prev => ({ ...prev, require_all_criteria: false }))}
                    className="mt-0.5 w-4 h-4 text-blue-600 focus:ring-blue-500"
                  />
                  <div>
                    <span className="font-medium text-gray-900">Student must meet ANY enabled criterion</span>
                    <p className="text-sm text-gray-500">
                      Flexible mode. Students pass if they meet at least one criterion. Use this for leniency.
                    </p>
                  </div>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Preview Section */}
        <div className="bg-white rounded-lg shadow overflow-hidden mb-6">
          <div className="border-b border-gray-200 px-6 py-4 bg-gray-50">
            <h3 className="font-semibold text-gray-900">Preview & Test</h3>
            <p className="text-sm text-gray-500">
              Test the criteria against a real student to see if they would pass or fail
            </p>
          </div>
          <div className="p-6">
            <div className="flex items-end gap-4 mb-6">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Student ID (e.g., STD001)
                </label>
                <input
                  type="text"
                  value={previewStudentId}
                  onChange={(e) => setPreviewStudentId(e.target.value)}
                  placeholder="Enter student ID to preview"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <button
                onClick={runPreview}
                disabled={previewLoading || !previewStudentId}
                className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 disabled:opacity-50 transition-all"
              >
                {previewLoading ? 'Loading...' : 'Test'}
              </button>
            </div>

            {previewResult && (
              <div className={`border rounded-lg p-4 ${
                previewResult.evaluation.overallDecision === 'pass'
                  ? 'bg-green-50 border-green-200'
                  : 'bg-red-50 border-red-200'
              }`}>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h4 className="font-semibold text-gray-900">{previewResult.student}</h4>
                    <p className="text-sm text-gray-500">
                      Overall Avg: {previewResult.overallAvg.toFixed(1)}% | 
                      Attendance: {previewResult.attendancePercent.toFixed(0)}% | 
                      Subjects: {previewResult.subjectScores.length}
                    </p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                    previewResult.evaluation.overallDecision === 'pass'
                      ? 'bg-green-200 text-green-800'
                      : 'bg-red-200 text-red-800'
                  }`}>
                    {previewResult.evaluation.overallDecision === 'pass' ? 'PASS' : 'FAIL'}
                  </span>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                  <div className="bg-white rounded p-2 text-center">
                    <div className="text-xs text-gray-500">Overall</div>
                    <div className={`font-bold ${previewResult.evaluation.overall.passed ? 'text-green-600' : 'text-red-600'}`}>
                      {previewResult.evaluation.overall.passed ? '✓' : '✗'}
                    </div>
                  </div>
                  <div className="bg-white rounded p-2 text-center">
                    <div className="text-xs text-gray-500">Core Subjects</div>
                    <div className={`font-bold ${previewResult.evaluation.coreSubjects.passed ? 'text-green-600' : 'text-red-600'}`}>
                      {previewResult.evaluation.coreSubjects.passed ? '✓' : '✗'}
                    </div>
                  </div>
                  <div className="bg-white rounded p-2 text-center">
                    <div className="text-xs text-gray-500">Aggregate</div>
                    <div className={`font-bold ${previewResult.evaluation.aggregate.passed ? 'text-green-600' : 'text-red-600'}`}>
                      {previewResult.evaluation.aggregate.passed ? '✓' : '✗'}
                    </div>
                  </div>
                  <div className="bg-white rounded p-2 text-center">
                    <div className="text-xs text-gray-500">Attendance</div>
                    <div className={`font-bold ${previewResult.evaluation.attendance.passed ? 'text-green-600' : 'text-red-600'}`}>
                      {previewResult.evaluation.attendance.passed ? '✓' : '✗'}
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg p-3 text-xs text-gray-700 space-y-1 font-mono">
                  {previewResult.evaluation.details.map((detail: string, i: number) => (
                    <div key={`detail-${i}`}>{detail}</div>
                  ))}
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {previewResult.subjectScores.map((s: any, idx: number) => (
                    <span key={`ps-${idx}`} className="px-2 py-0.5 bg-white rounded text-xs border border-gray-200">
                      {s.subjectName}: {s.score.toFixed(1)}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Save Button (Bottom) */}
        <div className="sticky bottom-4">
          <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-4 flex justify-between items-center">
            <div className="text-sm text-gray-600 hidden sm:block">
              {hasChanges() ? (
                <span className="text-yellow-600">⚠ You have unsaved changes</span>
              ) : (
                <span className="text-green-600">✓ All changes saved</span>
              )}
            </div>
            <button
              onClick={handleSave}
              disabled={saving || !hasChanges()}
              className="w-full sm:w-auto bg-blue-600 text-white px-6 py-2.5 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 transition-all shadow-sm"
            >
              {saving ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              ) : (
                <Save className="w-5 h-5" />
              )}
              <span>{saving ? 'Saving...' : 'Save Changes'}</span>
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}
