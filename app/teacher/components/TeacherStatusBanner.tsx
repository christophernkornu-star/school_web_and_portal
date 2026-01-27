'use client'

import { AlertCircle } from 'lucide-react'
import { useTeacher } from '@/components/providers/TeacherContext'

export function TeacherStatusBanner() {
  const { teacher, loading } = useTeacher()

  if (loading || !teacher) return null

  const isReadOnly = teacher.status === 'on_leave' || teacher.status === 'on leave'

  if (!isReadOnly) return null

  return (
    <div className="bg-amber-500 text-white px-4 py-3 shadow-md relative z-50">
      <div className="container mx-auto flex items-center space-x-3">
        <AlertCircle className="w-6 h-6 flex-shrink-0 text-white" />
        <div>
          <h3 className="font-bold text-sm md:text-base">Read-Only Access</h3>
          <p className="text-xs md:text-sm text-white/90">
            You are currently marked as "On Leave". You can view information but cannot make any changes.
          </p>
        </div>
      </div>
    </div>
  )
}
