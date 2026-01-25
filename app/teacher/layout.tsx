'use client'

import { TeacherProvider } from '@/components/providers/TeacherContext'

export default function TeacherLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <TeacherProvider>
      {children}
    </TeacherProvider>
  )
}
