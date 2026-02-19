'use client'

import { cn } from '@/lib/utils'

export function PortalFooter({ className }: { className?: string }) {
  return (
    <footer className={cn("py-3 px-6 border-t border-gray-200 dark:border-gray-800 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm transition-colors z-50", className)}>
      <div className="flex flex-col md:flex-row justify-between items-center text-[10px] md:text-xs text-gray-500 dark:text-gray-400 gap-1">
        <p>
          &copy; 2026 Biriwa SMS. All rights reserved.
        </p>
        <p className="font-medium text-blue-600 dark:text-blue-400">
          Developed by Fortune Nkornu.
        </p>
      </div>
    </footer>
  )
}
