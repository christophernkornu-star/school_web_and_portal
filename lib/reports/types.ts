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
}
