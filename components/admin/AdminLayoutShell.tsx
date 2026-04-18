'use client'

import { useState } from 'react'
import { AdminHeader } from './AdminHeader'
import { AdminSidebar } from './AdminSidebar'
import { CommandPalette } from '@/components/CommandPalette'
import { PortalFooter } from '@/components/PortalFooter'

export function AdminLayoutShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="h-screen bg-gray-50 dark:bg-gray-900 flex overflow-hidden">
      <CommandPalette />
      <AdminSidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
      
      <div className="flex-1 min-w-0 lg:pl-64 flex flex-col h-full transition-all duration-300">
        <AdminHeader setIsOpen={setSidebarOpen} />
        
        <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-x-hidden overflow-y-auto">
          {children}
        </main>
        <PortalFooter />
      </div>
    </div>
  )
}
