import React from 'react'
import { BookOpen, Users, GraduationCap } from 'lucide-react'

interface TeachingModelBadgeProps {
  model: 'class_teacher' | 'subject_teacher'
  isClassTeacher?: boolean
  size?: 'sm' | 'md' | 'lg'
}

export function TeachingModelBadge({ model, isClassTeacher, size = 'md' }: TeachingModelBadgeProps) {
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-3 py-1',
    lg: 'text-base px-4 py-2',
  }
  
  if (isClassTeacher) {
    return (
      <span className={`${sizeClasses[size]} bg-blue-100 text-blue-700 rounded-full font-medium flex items-center space-x-1`}>
        <BookOpen className="w-3 h-3" />
        <span>Class Teacher</span>
      </span>
    )
  }
  
  return (
    <span className={`${sizeClasses[size]} bg-purple-100 text-purple-700 rounded-full font-medium flex items-center space-x-1`}>
      <GraduationCap className="w-3 h-3" />
      <span>Subject Teacher</span>
    </span>
  )
}

interface SubjectPermissionIndicatorProps {
  canEdit: boolean
  canView: boolean
}

export function SubjectPermissionIndicator({ canEdit, canView }: SubjectPermissionIndicatorProps) {
  if (!canView) {
    return (
      <span className="text-xs text-gray-400 italic">No access</span>
    )
  }
  
  if (canEdit) {
    return (
      <span className="text-xs text-green-600 font-medium flex items-center space-x-1">
        <span className="w-2 h-2 bg-green-500 rounded-full"></span>
        <span>Can edit</span>
      </span>
    )
  }
  
  return (
    <span className="text-xs text-blue-600 font-medium flex items-center space-x-1">
      <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
      <span>View only</span>
    </span>
  )
}

interface ClassPermissionCardProps {
  className: string
  teachingModel: 'class_teacher' | 'subject_teacher'
  isClassTeacher: boolean
  subjectCount: number
  canMarkAttendance: boolean
}

export function ClassPermissionCard({
  className,
  teachingModel,
  isClassTeacher,
  subjectCount,
  canMarkAttendance,
}: ClassPermissionCardProps) {
  return (
    <div className="bg-white border rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <h3 className="font-bold text-gray-800 text-lg">{className}</h3>
        <TeachingModelBadge model={teachingModel} isClassTeacher={isClassTeacher} size="sm" />
      </div>
      
      <div className="space-y-2 text-sm text-gray-600">
        <div className="flex items-center space-x-2">
          <BookOpen className="w-4 h-4 text-gray-400" />
          <span>
            {isClassTeacher 
              ? 'All subjects (full access)'
              : `${subjectCount} subject${subjectCount !== 1 ? 's' : ''} assigned`}
          </span>
        </div>
        
        {canMarkAttendance && (
          <div className="flex items-center space-x-2 text-green-600">
            <Users className="w-4 h-4" />
            <span className="font-medium">Can mark attendance</span>
          </div>
        )}
        
        {teachingModel === 'subject_teacher' && isClassTeacher && (
          <div className="text-xs bg-yellow-50 border border-yellow-200 rounded p-2 mt-2">
            <strong>Class Teacher:</strong> You can view all subjects but only edit your assigned ones.
          </div>
        )}
      </div>
    </div>
  )
}

interface PermissionAlertProps {
  type: 'info' | 'warning' | 'error'
  message: string
}

export function PermissionAlert({ type, message }: PermissionAlertProps) {
  const styles = {
    info: 'bg-blue-50 border-blue-200 text-blue-800',
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    error: 'bg-red-50 border-red-200 text-red-800',
  }
  
  return (
    <div className={`border rounded-lg p-4 ${styles[type]}`}>
      <p className="text-sm">{message}</p>
    </div>
  )
}
