'use client'

import { useState } from 'react'
import { TeacherHeader } from './TeacherHeader'
import { TeacherSidebar } from './TeacherSidebar'
import { CommandPalette } from '@/components/CommandPalette'
import { PortalFooter } from '@/components/PortalFooter'

export function TeacherLayoutShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="h-screen bg-gray-50 dark:bg-gray-900 flex overflow-hidden">
      <CommandPalette />
      <TeacherSidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
      
      <div className="flex-1 lg:pl-64 flex flex-col h-full transition-all duration-300">
        <TeacherHeader setIsOpen={setSidebarOpen} />
        
        <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-y-auto">
          {children}
        </main>
        <PortalFooter />
      </div>
    </div>
  )
}
