'use client'

import { TeacherProvider } from '@/components/providers/TeacherContext'
import { TeacherStatusBanner } from './components/TeacherStatusBanner'

export default function TeacherLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <TeacherProvider>
      <TeacherStatusBanner />
      {children}
    </TeacherProvider>
  )
}
