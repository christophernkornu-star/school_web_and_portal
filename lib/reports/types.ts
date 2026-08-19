export interface ReportCardTheme {
  logoImage?: string
  methodistLogoImage?: string
  watermarkImage?: string
  signatureImage?: string
  primaryColor?: string
  secondaryColor?: string
}

export interface ReportRemarks {
  attitude: string
  interest: string
  conduct: string
  classTeacher: string
  headTeacher: string
}

export interface Grade {
  id?: string
  subject_name: string
  class_score: number | null
  exam_score: number | null
  total: number | null
  grade: string | null
  remarks: string | null
  term_id?: string
  rank?: number | null
  position?: number | null
}

export interface AttendanceStats {
  present: number
  total: number
}

export interface ReportCardData {
  termId: string
  termName: string
  year: string
  grades: Grade[]
  totalScore: number
  averageScore: number
  position?: number | null
  totalClassSize?: number | null
  attendance?: AttendanceStats
  aggregate?: number | null
  remarks?: Partial<ReportRemarks>
  daysPresent?: number // For backward compatibility if needed
  totalDays?: number   // For backward compatibility if needed
  promotionStatus?: string // Teacher remarks on promotion
  promotionDecision?: string // Actual decision (promoted, repeated, etc)
  promotionData?: any // Full promotion record if applicable
  vacationDate?: string // Dated string (e.g. 2025-12-20) for THIS term's vacation start
  reopeningDate?: string // Dated string for when this term reopens

  // Historical / cross-level report metadata (set by fetcher)
  termHasStarted?: boolean           // true if the student has scores for this term (i.e. the term was actually conducted for this class)
  termClassLevel?: number | string | null // the level of the class that produced the scores for this term
  termClassId?: string | null             // the class the scores were recorded under for this term
  termClassName?: string | null           // the NAME of the class that produced the scores for this term (for the label)

}

