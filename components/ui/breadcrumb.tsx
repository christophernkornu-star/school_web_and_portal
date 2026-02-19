'use client'

import * as React from "react"
import Link from "next/link"
import { ChevronRight } from "lucide-react"

import { cn } from "@/lib/utils"

export interface BreadcrumbProps extends React.ComponentPropsWithoutRef<"nav"> {
  separator?: React.ReactNode
  items: {
    label: string
    href?: string
    active?: boolean
  }[]
}

export function Breadcrumb({ className, separator, items, ...props }: BreadcrumbProps) {
  return (
    <nav
      aria-label="breadcrumb"
      className={cn("flex flex-wrap items-center text-sm text-gray-500 dark:text-gray-400", className)}
      {...props}
    >
      <ol className="flex flex-wrap items-center">
        {items.map((item, index) => {
          const isLast = index === items.length - 1
          const isFirst = index === 0

          return (
            <li key={item.label} className="inline-flex items-center">
              {!isFirst && (
                <span className="mx-2 text-gray-400 dark:text-gray-500" aria-hidden="true">
                  {separator || <ChevronRight className="h-4 w-4" />}
                </span>
              )}
              {item.href && !item.active ? (
                <Link
                  href={item.href}
                  className="hover:text-gray-900 hover:underline dark:hover:text-gray-50 transition-colors"
                >
                  {item.label}
                </Link>
              ) : (
                <span
                  className={cn(
                    "font-medium",
                    item.active && "text-gray-900 dark:text-gray-50"
                  )}
                  aria-current={item.active ? "page" : undefined}
                >
                  {item.label}
                </span>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
