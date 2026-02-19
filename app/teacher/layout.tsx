'use client'

import { TeacherProvider } from '@/components/providers/TeacherContext'
import { TeacherStatusBanner } from './components/TeacherStatusBanner'
import { TeacherLayoutShell } from '@/components/teacher/TeacherLayoutShell'

export default function TeacherLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <TeacherProvider>
      <TeacherLayoutShell>
        <TeacherStatusBanner />
        {children}
      </TeacherLayoutShell>
    </TeacherProvider>
  )
}
