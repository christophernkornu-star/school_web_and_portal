'use client'

import { useState, useEffect, useRef } from 'react'
import { ChevronDown, Check } from 'lucide-react'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'

interface Section {
  id: string
  name: string
  colour: string
  emblem_url: string | null
}

interface SectionSelectorProps {
  value?: string  // section_id
  onChange: (sectionId: string, section: Section) => void
  className?: string
  placeholder?: string
  disabled?: boolean
}

export function SectionSelector({
  value,
  onChange,
  className = '',
  placeholder = 'Select Section',
  disabled = false
}: SectionSelectorProps) {
  const [open, setOpen] = useState(false)
  const [sections, setSections] = useState<Section[]>([])
  const [loading, setLoading] = useState(true)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadSections()
  }, [])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  async function loadSections() {
    const supabase = getSupabaseBrowserClient()
    const { data } = await supabase
      .from('sections')
      .select('id, name, colour, emblem_url')
      .eq('is_active', true)
      .order('sort_order')
      .order('name')

    if (data) setSections(data)
    setLoading(false)
  }

  const selected = sections.find(s => s.id === value)

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => !disabled && setOpen(!open)}
        disabled={disabled}
        className={`
          w-full flex items-center justify-between gap-2 px-3 py-2 text-sm
          border border-gray-200 dark:border-gray-700
          rounded-lg bg-white dark:bg-gray-800
          hover:border-gray-300 dark:hover:border-gray-600
          focus:outline-none focus:ring-2 focus:ring-blue-500
          transition-colors
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          ${open ? 'ring-2 ring-blue-500 border-blue-500' : ''}
        `}
      >
        {selected ? (
          <span className="flex items-center gap-2 truncate">
            <span
              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: selected.colour }}
            />
            <span style={{ color: selected.colour }} className="font-medium">
              {selected.name}
            </span>
          </span>
        ) : (
          <span className="text-gray-400">{loading ? 'Loading...' : placeholder}</span>
        )}
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg overflow-hidden">
          <div className="max-h-56 overflow-y-auto p-1">
            {sections.length === 0 ? (
              <div className="px-3 py-6 text-center text-sm text-gray-400">
                No sections available
              </div>
            ) : (
              sections.map((section) => (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => {
                    onChange(section.id, section)
                    setOpen(false)
                  }}
                  className={`
                    w-full flex items-center gap-3 px-3 py-2.5 text-sm rounded-md
                    transition-colors text-left
                    ${value === section.id
                      ? 'bg-blue-50 dark:bg-blue-900/20'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                    }
                  `}
                >
                  <span
                    className="w-3 h-3 rounded-full flex-shrink-0 shadow-sm"
                    style={{ backgroundColor: section.colour }}
                  />
                  <div className="flex-1 min-w-0">
                    <span
                      className="font-medium"
                      style={{ color: section.colour }}
                    >
                      {section.name}
                    </span>
                  </div>
                  {value === section.id && (
                    <Check className="w-4 h-4 text-blue-600 flex-shrink-0" />
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
