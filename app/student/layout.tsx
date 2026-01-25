'use client'

import { StudentProvider } from '@/components/providers/StudentContext'

export default function StudentLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <StudentProvider>
      {children}
    </StudentProvider>
  )
}
