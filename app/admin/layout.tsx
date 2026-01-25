'use client'

import { AdminProvider } from '@/components/providers/AdminContext'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AdminProvider>
      {children}
    </AdminProvider>
  )
}
