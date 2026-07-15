/**
 * Promotion Criteria Types and Evaluation Logic
 * 
 * Admin can configure what determines whether a student passes or fails
 * for the academic year promotion.
 */

import { getGradeValue } from '@/lib/academic-utils'

// ─── Types ────────────────────────────────────────────────────────────

export interface PromotionCriteria {
  id?: string
  academic_year: string
  class_level?: string | null // null = applies to all
  
  // Overall performance
  overall_passing_average: number // Minimum overall average (default 30)
  overall_enabled: boolean
  
  // Core subject requirements
  core_subjects_enabled: boolean
  core_subjects: string[] // e.g. ['English', 'Mathematics', 'Integrated Science', 'Social Studies']
  core_subject_passing_score: number // Minimum score in each core subject (default 40)
  
  // Aggregate system (BECE style)
  aggregate_enabled: boolean
  max_aggregate: number // Maximum total aggregate to pass (default 30)
  
  // Attendance
  attendance_enabled: boolean
  minimum_attendance_percentage: number // Default 50
  
  // Decision logic
  require_all_criteria: boolean // true=ALL must pass, false=ANY one
  
  created_at?: string
  updated_at?: string
}

export interface CriteriaEvaluation {
  overall: { passed: boolean; value: number; required: number }
  coreSubjects: { passed: boolean; failed: string[]; passingScore: number }
  aggregate: { passed: boolean; value: number; max: number }
  attendance: { passed: boolean; percentage: number; required: number }
  overallDecision: 'pass' | 'fail'
  details: string[] // Human-readable reasons
}

export interface ScoreInput {
  subjectName: string
  score: number
}

// ─── Default Criteria ─────────────────────────────────────────────────

export const DEFAULT_PROMOTION_CRITERIA: Omit<PromotionCriteria, 'academic_year'> = {
  class_level: null,
  overall_passing_average: 30,
  overall_enabled: true,
  core_subjects_enabled: false,
  core_subjects: ['English', 'Mathematics', 'Integrated Science', 'Social Studies'],
  core_subject_passing_score: 40,
  aggregate_enabled: false,
  max_aggregate: 30,
  attendance_enabled: false,
  minimum_attendance_percentage: 50,
  require_all_criteria: true
}

// ─── Subject Helpers ──────────────────────────────────────────────────

function getSubjectCategory(subjectName: string): 'english' | 'math' | 'science' | 'social' | 'other' {
  const n = (subjectName || '').toLowerCase()
  if (n.includes('english')) return 'english'
  if (n.includes('mathematics') || n.includes('maths') || n.includes('math')) return 'math'
  if (n.includes('integrated science') || n === 'science' || n === 'general science') return 'science'
  if (n.includes('social studies') || n.includes('social')) return 'social'
  return 'other'
}

function matchesCoreSubject(subjectName: string, coreSubjects: string[]): boolean {
  const n = subjectName.toLowerCase()
  return coreSubjects.some(cs => {
    const c = cs.toLowerCase()
    return n.includes(c) || c.includes(n)
  })
}

/**
 * Calculate BECE-style aggregate (4 cores + best 2 others)
 */
export function calculateAggregate(scores: ScoreInput[]): number {
  let english: number | null = null
  let math: number | null = null
  let science: number | null = null
  let social: number | null = null
  const others: number[] = []

  scores.forEach(s => {
    const cat = getSubjectCategory(s.subjectName)
    const gradeVal = getGradeValue(s.score)

    if (cat === 'english') {
      english = english === null ? gradeVal : Math.min(english, gradeVal)
    } else if (cat === 'math') {
      math = math === null ? gradeVal : Math.min(math, gradeVal)
    } else if (cat === 'science') {
      science = science === null ? gradeVal : Math.min(science, gradeVal)
    } else if (cat === 'social') {
      social = social === null ? gradeVal : Math.min(social, gradeVal)
    } else {
      others.push(gradeVal)
    }
  })

  const safeVal = (v: number | null) => v === null ? 9 : v

  let total = safeVal(english) + safeVal(math) + safeVal(science) + safeVal(social)

  // Best 2 others
  others.sort((a, b) => a - b)
  const bestOthers = others.slice(0, 2)
  if (bestOthers.length < 2) {
    total += (2 - bestOthers.length) * 9
  }
  bestOthers.forEach(o => { total += o })

  return total
}

// ─── Evaluation Engine ────────────────────────────────────────────────

export interface EvaluationInput {
  averageScore: number
  subjectScores: ScoreInput[]
  attendancePercentage?: number
  criteria: PromotionCriteria
}

/**
 * Evaluate a student against all configured promotion criteria.
 * Returns detailed results for each criterion and an overall decision.
 */
export function evaluatePromotionCriteria(input: EvaluationInput): CriteriaEvaluation {
  const { averageScore, subjectScores, attendancePercentage, criteria } = input

  const details: string[] = []

  // 1. Overall average check
  let overallPassed = true
  if (criteria.overall_enabled) {
    overallPassed = averageScore >= criteria.overall_passing_average
    if (overallPassed) {
      details.push(`Overall average ${averageScore.toFixed(1)}% ≥ ${criteria.overall_passing_average}% ✅`)
    } else {
      details.push(`Overall average ${averageScore.toFixed(1)}% < ${criteria.overall_passing_average}% ❌`)
    }
  }

  // 2. Core subject check
  let corePassed = true
  const failedCoreSubjects: string[] = []
  if (criteria.core_subjects_enabled) {
    for (const coreSubject of criteria.core_subjects) {
      const matchingScore = subjectScores.find(s => matchesCoreSubject(s.subjectName, [coreSubject]))
      const score = matchingScore?.score ?? 0
      if (score < criteria.core_subject_passing_score) {
        corePassed = false
        failedCoreSubjects.push(coreSubject)
        details.push(`${coreSubject}: ${score.toFixed(1)}% < ${criteria.core_subject_passing_score}% ❌`)
      } else {
        details.push(`${coreSubject}: ${score.toFixed(1)}% ≥ ${criteria.core_subject_passing_score}% ✅`)
      }
    }
  }

  // 3. Aggregate check
  let aggregatePassed = true
  let aggregateValue = 0
  if (criteria.aggregate_enabled) {
    aggregateValue = calculateAggregate(subjectScores)
    aggregatePassed = aggregateValue <= criteria.max_aggregate
    if (aggregatePassed) {
      details.push(`Aggregate ${aggregateValue} ≤ ${criteria.max_aggregate} ✅`)
    } else {
      details.push(`Aggregate ${aggregateValue} > ${criteria.max_aggregate} ❌`)
    }
  }

  // 4. Attendance check
  let attendancePassed = true
  const attPercent = attendancePercentage ?? 100
  if (criteria.attendance_enabled) {
    attendancePassed = attPercent >= criteria.minimum_attendance_percentage
    if (attendancePassed) {
      details.push(`Attendance ${attPercent.toFixed(0)}% ≥ ${criteria.minimum_attendance_percentage}% ✅`)
    } else {
      details.push(`Attendance ${attPercent.toFixed(0)}% < ${criteria.minimum_attendance_percentage}% ❌`)
    }
  }

  // 5. Overall decision
  let overallDecision: 'pass' | 'fail'
  if (criteria.require_all_criteria) {
    overallDecision = (overallPassed && corePassed && aggregatePassed && attendancePassed) ? 'pass' : 'fail'
  } else {
    overallDecision = (overallPassed || corePassed || aggregatePassed || attendancePassed) ? 'pass' : 'fail'
  }

  if (overallDecision === 'pass') {
    details.push(`\nOverall: PASS 🎉`)
  } else {
    details.push(`\nOverall: FAIL`)
  }

  return {
    overall: { passed: overallPassed, value: averageScore, required: criteria.overall_passing_average },
    coreSubjects: { passed: corePassed, failed: failedCoreSubjects, passingScore: criteria.core_subject_passing_score },
    aggregate: { passed: aggregatePassed, value: aggregateValue, max: criteria.max_aggregate },
    attendance: { passed: attendancePassed, percentage: attPercent, required: criteria.minimum_attendance_percentage },
    overallDecision,
    details
  }
}

/**
 * Check if a student automatically passes based on criteria
 * (no teacher decision needed)
 */
export function meetsAutoPromotionCriteria(evaluation: CriteriaEvaluation): boolean {
  return evaluation.overallDecision === 'pass'
}

/**
 * Build a human-readable summary of the evaluation
 */
export function formatEvaluationSummary(evaluation: CriteriaEvaluation): string {
  const lines = evaluation.details.filter(d => !d.startsWith('\n'))
  return lines.join('\n')
}
