'use client'

import * as React from "react"
import { usePathname } from "next/navigation"
import { Breadcrumb } from "./breadcrumb"
import { cn } from "@/lib/utils"

interface PageHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string
  description?: string
  children?: React.ReactNode // For action buttons
  breadcrumbs?: { label: string; href: string; active?: boolean }[]
}

export function PageHeader({ 
  className, 
  title, 
  description, 
  children,
  breadcrumbs,
  ...props 
}: PageHeaderProps) {
  const pathname = usePathname()
  
  // Auto-generate breadcrumbs if not provided
  const generatedBreadcrumbs = React.useMemo(() => {
    if (breadcrumbs) return breadcrumbs

    const paths = pathname.split('/').filter(Boolean)
    const items = paths.map((path, index) => {
        const href = `/${paths.slice(0, index + 1).join('/')}`
        const label = path.charAt(0).toUpperCase() + path.slice(1).replace(/-/g, ' ')
        const active = index === paths.length - 1
        return { label, href, active }
    })
    
    // Ensure dashboard is always home or root if possible (optional)
    return items
  }, [pathname, breadcrumbs])

  return (
    <div className={cn("space-y-4 pb-6 border-b border-gray-200 dark:border-gray-800 mb-6", className)} {...props}>
      <div className="flex flex-col gap-1">
        <Breadcrumb items={generatedBreadcrumbs} className="mb-2" />
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="space-y-1">
                <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
                    {title}
                </h1>
                {description && (
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        {description}
                    </p>
                )}
            </div>
            {children && (
                <div className="flex items-center gap-2">
                    {children}
                </div>
            )}
        </div>
      </div>
    </div>
  )
}
