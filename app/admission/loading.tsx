import { Skeleton } from '@/components/ui/skeleton'

export default function AdmissionLoading() {
  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-900 font-sans flex flex-col transition-colors">
      
      {/* Header Placeholder */}
      <div className="border-b border-slate-200/80 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Skeleton className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl" />
            <div className="space-y-1.5">
              <Skeleton className="h-4 sm:h-5 w-40 sm:w-56 rounded-md" />
              <Skeleton className="h-3 w-24 sm:w-32 rounded-md" />
            </div>
          </div>
          <Skeleton className="h-9 w-24 sm:w-28 rounded-xl" />
        </div>
      </div>

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-8">
        
        {/* Admission Header Banner */}
        <div className="bg-slate-200/70 dark:bg-slate-800/80 rounded-2xl sm:rounded-3xl p-6 sm:p-8 space-y-3 text-center sm:text-left">
          <Skeleton className="h-5 w-32 rounded-full mx-auto sm:mx-0" />
          <Skeleton className="h-8 sm:h-10 w-3/4 max-w-md rounded-xl mx-auto sm:mx-0" />
          <Skeleton className="h-4 w-full max-w-lg rounded-md mx-auto sm:mx-0" />
        </div>

        {/* Steps/Guidelines Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-4">
          {[1, 2, 3].map((i) => (
            <div 
              key={i} 
              className="bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 p-4 space-y-2 shadow-xs"
            >
              <div className="flex items-center gap-2">
                <Skeleton className="w-7 h-7 rounded-lg" />
                <Skeleton className="h-4 w-28 rounded-md" />
              </div>
              <Skeleton className="h-3 w-full rounded-md" />
            </div>
          ))}
        </div>

        {/* Admission Application Form Skeleton */}
        <div className="bg-white dark:bg-slate-800/90 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-700/80 p-5 sm:p-8 shadow-xs space-y-6">
          
          {/* Section 1: Learner Details */}
          <div className="space-y-4">
            <div className="space-y-1 border-b border-slate-100 dark:border-slate-800 pb-3">
              <Skeleton className="h-5 w-44 rounded-md" />
              <Skeleton className="h-3.5 w-64 rounded-md" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Skeleton className="h-3 w-28 rounded-md" />
                <Skeleton className="h-10 w-full rounded-xl" />
              </div>
              <div className="space-y-1.5">
                <Skeleton className="h-3 w-28 rounded-md" />
                <Skeleton className="h-10 w-full rounded-xl" />
              </div>
              <div className="space-y-1.5">
                <Skeleton className="h-3 w-24 rounded-md" />
                <Skeleton className="h-10 w-full rounded-xl" />
              </div>
              <div className="space-y-1.5">
                <Skeleton className="h-3 w-32 rounded-md" />
                <Skeleton className="h-10 w-full rounded-xl" />
              </div>
            </div>
          </div>

          {/* Section 2: Guardian Details */}
          <div className="space-y-4 pt-2">
            <div className="space-y-1 border-b border-slate-100 dark:border-slate-800 pb-3">
              <Skeleton className="h-5 w-52 rounded-md" />
              <Skeleton className="h-3.5 w-72 rounded-md" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Skeleton className="h-3 w-32 rounded-md" />
                <Skeleton className="h-10 w-full rounded-xl" />
              </div>
              <div className="space-y-1.5">
                <Skeleton className="h-3 w-32 rounded-md" />
                <Skeleton className="h-10 w-full rounded-xl" />
              </div>
              <div className="sm:col-span-2 space-y-1.5">
                <Skeleton className="h-3 w-28 rounded-md" />
                <Skeleton className="h-10 w-full rounded-xl" />
              </div>
            </div>
          </div>

          {/* Submit Action */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
            <Skeleton className="h-11 w-44 rounded-xl" />
          </div>

        </div>

      </main>
    </div>
  )
}