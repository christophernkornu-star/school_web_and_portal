import { Skeleton } from '@/components/ui/skeleton'

export default function AboutLoading() {
  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-900 font-sans flex flex-col transition-colors">
      
      {/* Top Header Placeholder */}
      <div className="border-b border-slate-200/80 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Skeleton className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl" />
            <div className="space-y-1.5">
              <Skeleton className="h-4 sm:h-5 w-36 sm:w-52 rounded-md" />
              <Skeleton className="h-3 w-24 sm:w-32 rounded-md" />
            </div>
          </div>
          <Skeleton className="h-9 w-24 sm:w-32 rounded-xl" />
        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-8 sm:space-y-12">
        
        {/* About Hero Banner Skeleton */}
        <div className="rounded-2xl sm:rounded-3xl bg-slate-200/70 dark:bg-slate-800/80 p-6 sm:p-10 md:p-12 space-y-4">
          <div className="space-y-2.5 max-w-2xl">
            <Skeleton className="h-5 w-28 rounded-full" />
            <Skeleton className="h-8 sm:h-12 w-3/4 rounded-xl" />
            <Skeleton className="h-4 sm:h-5 w-full rounded-lg" />
            <Skeleton className="h-4 sm:h-5 w-5/6 rounded-lg" />
          </div>
          <div className="pt-2 flex flex-wrap gap-3">
            <Skeleton className="h-10 w-36 rounded-xl" />
            <Skeleton className="h-10 w-36 rounded-xl" />
          </div>
        </div>

        {/* Mission & Vision Grid Skeleton */}
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-28 rounded-md" />
            <Skeleton className="h-7 w-64 rounded-lg" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
            {[1, 2, 3].map((i) => (
              <div 
                key={i} 
                className="bg-white dark:bg-slate-800/90 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-700/80 p-5 sm:p-6 space-y-3 shadow-xs"
              >
                <Skeleton className="w-10 h-10 rounded-xl" />
                <Skeleton className="h-5 w-1/2 rounded-md" />
                <div className="space-y-2 pt-1">
                  <Skeleton className="h-3.5 w-full rounded-md" />
                  <Skeleton className="h-3.5 w-5/6 rounded-md" />
                  <Skeleton className="h-3.5 w-4/6 rounded-md" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Headteacher & Leadership Section Skeleton */}
        <div className="bg-white dark:bg-slate-800/90 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-700/80 p-6 sm:p-8 md:p-10 shadow-xs">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-center">
            <div className="lg:col-span-4 flex justify-center">
              <Skeleton className="w-48 h-48 sm:w-56 sm:h-56 rounded-2xl sm:rounded-3xl" />
            </div>
            <div className="lg:col-span-8 space-y-3">
              <Skeleton className="h-4 w-32 rounded-md" />
              <Skeleton className="h-7 sm:h-8 w-2/3 rounded-lg" />
              <div className="space-y-2 pt-2">
                <Skeleton className="h-3.5 w-full rounded-md" />
                <Skeleton className="h-3.5 w-full rounded-md" />
                <Skeleton className="h-3.5 w-4/5 rounded-md" />
              </div>
              <div className="pt-2 space-y-1">
                <Skeleton className="h-4 w-40 rounded-md" />
                <Skeleton className="h-3 w-28 rounded-md" />
              </div>
            </div>
          </div>
        </div>

      </main>
    </div>
  )
}