'use client'

import { useState } from 'react'
import { TeacherHeader } from './TeacherHeader'
import { TeacherSidebar } from './TeacherSidebar'
import { CommandPalette } from '@/components/CommandPalette'
import { PortalFooter } from '@/components/PortalFooter'

export function TeacherLayoutShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="h-screen bg-gray-50 dark:bg-gray-900 flex overflow-hidden print:h-auto print:overflow-visible print:block">
      <div className="print:hidden">
        <CommandPalette />
      </div>

      
      <div className="print:hidden">
        <TeacherSidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
      </div>
      
      <div className="flex-1 lg:pl-64 flex flex-col h-full transition-all duration-300 print:pl-0 print:h-auto print:block">
        <div className="print:hidden">
            <TeacherHeader setIsOpen={setSidebarOpen} />
        </div>
        
        <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-y-auto print:p-0 print:overflow-visible print:h-auto print:block">
          {children}
        </main>
        
        <div className="print:hidden">
             <PortalFooter />
        </div>
      </div>
    </div>
  )
}
