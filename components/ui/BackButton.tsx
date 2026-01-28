'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'

interface BackButtonProps {
  label?: string
  className?: string
  fallbackPath?: string
  icon?: boolean
  href?: string
}

export default function BackButton({ 
  label, 
  className = "", 
  fallbackPath, 
  icon = true,
  href
}: BackButtonProps) {
  const router = useRouter()
  
  const handleBack = () => {
    if (href) {
      router.push(href)
      return
    }
    
    // If available, we might want to check history length
    // But since we can't reliably know if back() exits the app in all envs without tracking,
    // we assume calling back() is the intent.
    // If we wanted to be smarter, we'd need a global history tracker.
    
    // For now, simpler is better: align with "History Back".
    router.back()
  }

  return (
    <button 
      onClick={handleBack} 
      className={`flex items-center transition-colors cursor-pointer ${className}`}
      type="button"
      aria-label={label || "Go back"}
    >
      {icon && <ArrowLeft className={`w-5 h-5 ${label ? 'mr-1' : ''}`} />}
      {label && <span>{label}</span>}
    </button>
  )
}
