'use client'

import { useEffect } from 'react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error(error)
  }, [error])

  const buttonBase = "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 h-10 px-4 py-2"
  const defaultVariant = "bg-slate-900 text-white hover:bg-slate-900/90"
  const outlineVariant = "border border-slate-200 bg-white hover:bg-slate-100 hover:text-slate-900"

  return (
    <div className="flex h-screen w-full flex-col items-center justify-center bg-gray-50 px-4 text-center">
      <div className="space-y-4">
        <h1 className="text-4xl font-bold text-red-600">Something went wrong!</h1>
        <p className="text-slate-500 max-w-[500px]">
          We apologize for the inconvenience. An unexpected error has occurred.
        </p>
        <div className="flex justify-center gap-4 pt-4">
          <button onClick={() => reset()} className={`${buttonBase} ${defaultVariant}`}>
            Try again
          </button>
          <button onClick={() => window.location.href = '/'} className={`${buttonBase} ${outlineVariant}`}>
            Go Home
          </button>
        </div>
      </div>
    </div>
  )
}
