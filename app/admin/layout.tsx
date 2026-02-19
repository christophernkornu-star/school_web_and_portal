'use client'

import { AdminProvider } from '@/components/providers/AdminContext'
import { AdminLayoutShell } from '@/components/admin/AdminLayoutShell'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AdminProvider>
      <AdminLayoutShell>
        {children}
      </AdminLayoutShell>
    </AdminProvider>
  )
}
