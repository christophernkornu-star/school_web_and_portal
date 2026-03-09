
/**
 * Standardized Grading Utilities
 * Used across Mock Exams, Report Cards, and Student Portals
 */

// Grading Scale (Standard WAEC/GES Style)
// 80-100: 1 (Excellent)
// 70-79: 2 (Very Good)
// 65-69: 3 (Good)
// 60-64: 4 (Credit)
// 55-59: 5 (Credit)
// 50-54: 6 (Credit)
// 45-49: 7 (Pass)
// 40-44: 8 (Pass)
// 0-39: 9 (Fail)

export function getGradeValue(score: number): number {
  if (score >= 80) return 1
  if (score >= 70) return 2
  if (score >= 65) return 3
  if (score >= 60) return 4
  if (score >= 55) return 5
  if (score >= 50) return 6
  if (score >= 45) return 7
  if (score >= 40) return 8
  return 9
}

export function getGradeLabel(grade: number): string {
    if (grade === 1) return 'A1';
    if (grade === 2) return 'B2';
    if (grade === 3) return 'B3';
    if (grade === 4) return 'C4';
    if (grade === 5) return 'C5';
    if (grade === 6) return 'C6';
    if (grade === 7) return 'D7';
    if (grade === 8) return 'E8';
    return 'F9';
}

export function getRemark(grade: number): string {
    if (grade === 1) return 'Excellent';
    if (grade === 2) return 'Very Good';
    if (grade === 3) return 'Good';
    if (grade === 4) return 'Credit';
    if (grade === 5) return 'Credit';
    if (grade === 6) return 'Credit';
    if (grade === 7) return 'Pass';
    if (grade === 8) return 'Pass';
    return 'Fail';
}

// Helper to determine subject category
function getSubjectCategory(subjectName: string): 'english' | 'math' | 'science' | 'social' | 'other' {
    const n = (subjectName || '').toLowerCase()
    if (n.includes('english')) return 'english'
    if (n.includes('mathematics') || n.includes('maths') || n.includes('math')) return 'math'
    if (n.includes('integrated science') || n === 'science' || n === 'general science') return 'science'
    if (n.includes('social studies') || n.includes('social')) return 'social'
    return 'other'
}

interface ScoreInput {
    subjectName: string
    score: number
}

/**
 * Calculates the aggregate based on Core Subjects + Best 2 Others
 * Default behavior: Missing core subject = 9
 */
export function calculateAggregate(scores: ScoreInput[]): { total: number, subjectsUsed: string[] } {
    // Buckets for core subjects
    let english: number | null = null
    let math: number | null = null
    let science: number | null = null
    let social: number | null = null
    
    // Store others with their values
    const others: { val: number, name: string }[] = []
    
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
            others.push({ val: gradeVal, name: s.subjectName })
        }
    })

    const safeVal = (v: number | null) => v === null ? 9 : v

    let total = 0
    total += safeVal(english)
    total += safeVal(math)
    total += safeVal(science)
    total += safeVal(social)
    
    // Track subjects used for debugging/display if needed
    // Note: core subjects are always "used" in the calculation logic (even if 9)
    // but we won't list them in "subjectsUsed" return unless specifically requested, 
    // for now let's just return the best 2 electives names? 
    
    // Sort others (ascending, lower is better)
    others.sort((a, b) => a.val - b.val)
    
    // Take best 2
    const bestOthers = others.slice(0, 2)
    
    // If less than 2, fill with 9s
    if (bestOthers.length < 2) {
        const missing = 2 - bestOthers.length
        total += missing * 9
    }
    
    bestOthers.forEach(o => total += o.val)
    
    return {
        total,
        subjectsUsed: bestOthers.map(o => o.name)
    }
}

/**
 * Returns ordinal suffix for a number (st, nd, rd, th)
 */
export function getOrdinalSuffix(num: number): string {
    const j = num % 10
    const k = num % 100
    if (j === 1 && k !== 11) return 'st'
    if (j === 2 && k !== 12) return 'nd'
    if (j === 3 && k !== 13) return 'rd'
    return 'th'
}

/**
 * Checks if a term string represents a promotion term (Third/Final Term)
 */
export function isPromotionTerm(termName: string): boolean {
    if (!termName) return false;
    const t = termName.toLowerCase();
    return t.includes('third') || t.includes('term 3') || t.includes('3rd') || t.includes('final');
}

/**
 * Standardizes student name display format (Last, Middle First)
 */
export function formatStudentName(student: { first_name?: string | null, middle_name?: string | null, last_name?: string | null }): string {
    if (!student) return '';
    const last = student.last_name || '';
    const mid = student.middle_name ? student.middle_name + ' ' : '';
    const first = student.first_name || '';
    return `${last}, ${mid}${first}`.trim().replace(/^, /, '').replace(/, $/, '');
}
