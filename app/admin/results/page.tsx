'use client'

import Link from 'next/link'
import { 
  ShieldCheck, 
  FileSpreadsheet, 
  Printer, 
  BarChart3, 
  History, 
  ArrowRight,
  GraduationCap,
  Info
} from 'lucide-react'
import BackButton from '@/components/ui/back-button'

interface ResultModule {
  title: string
  description: string
  href: string
  icon: React.ElementType
  badge: string
  color: string
  bg: string
  border: string
}

const resultModules: ResultModule[] = [
  {
    title: 'Approval & Withholding',
    description: 'Review teacher score submissions, authorize publication to learner portals, or withhold results pending resolution.',
    href: '/admin/results/approval',
    icon: ShieldCheck,
    badge: 'Moderation Gate',
    color: 'text-[#003B5C] dark:text-blue-400',
    bg: 'bg-blue-50 dark:bg-blue-950/50',
    border: 'border-blue-200/70 dark:border-blue-900/50',
  },
  {
    title: 'Terminal Broadsheets',
    description: 'Inspect comprehensive master sheets displaying continuous assessments, exam marks, and rank positions across cohorts.',
    href: '/admin/results/broadsheets',
    icon: FileSpreadsheet,
    badge: 'Master Ledger',
    color: 'text-purple-600 dark:text-purple-400',
    bg: 'bg-purple-50 dark:bg-purple-950/50',
    border: 'border-purple-200/70 dark:border-purple-900/50',
  },
  {
    title: 'Print Terminal Reports',
    description: 'Generate, preview, and batch-print official terminal report cards featuring attendance tallies and headteacher remarks.',
    href: '/admin/results/reports',
    icon: Printer,
    badge: 'Batch Print',
    color: 'text-emerald-600 dark:text-emerald-400',
    bg: 'bg-emerald-50 dark:bg-emerald-950/50',
    border: 'border-emerald-200/70 dark:border-emerald-900/50',
  },
  {
    title: 'Performance Analytics',
    description: 'Evaluate pass rates, subject competencies, score percentiles, and cross-class comparative academic metrics.',
    href: '/admin/results/analysis',
    icon: BarChart3,
    badge: 'Insights',
    color: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-50 dark:bg-amber-950/50',
    border: 'border-amber-200/70 dark:border-amber-900/50',
  },
  {
    title: 'Historical Records',
    description: 'Retrieve archived term transcripts, past continuous assessment audits, and learner grading history across previous academic years.',
    href: '/admin/results/history',
    icon: History,
    badge: 'Archives',
    color: 'text-slate-700 dark:text-slate-300',
    bg: 'bg-slate-100 dark:bg-slate-800',
    border: 'border-slate-200 dark:border-slate-700',
  },
]

export default function ResultsDashboardPage() {
  return (
    <div className="min-h-full bg-slate-50/50 dark:bg-slate-900 font-sans text-slate-900 dark:text-slate-100 flex flex-col transition-colors selection:bg-[#003B5C] selection:text-white">
      
      {/* Top Sticky Header */}
      <header className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div className="max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 py-3.5 sm:py-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 sm:gap-4 min-w-0">
              <BackButton href="/admin/dashboard" />
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-4 bg-amber-400 rounded-full shrink-0" />
                  <h1 className="text-base sm:text-xl md:text-2xl font-black text-slate-900 dark:text-white tracking-tight truncate">
                    Results Management Hub
                  </h1>
                </div>
                <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium truncate mt-0.5">
                  Academic assessment oversight, broadsheet verification, and official report generation
                </p>
              </div>
            </div>

            <div className="hidden sm:inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/50 border border-blue-200/60 dark:border-blue-900/50 text-[#003B5C] dark:text-blue-300 text-xs font-bold shrink-0">
              <GraduationCap className="w-4 h-4 text-amber-500 shrink-0" />
              <span>GES / NaCCA Aligned</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Workspace */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-3.5 sm:px-6 lg:px-8 py-5 sm:py-8 space-y-5 sm:space-y-6">
        
        {/* Administrative Policy Note */}
        <div className="bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200/70 dark:border-blue-900/50 rounded-2xl p-4 sm:p-5 flex items-start gap-3 text-xs text-blue-900 dark:text-blue-200 shadow-2xs">
          <Info className="w-4 h-4 sm:w-5 sm:h-5 text-[#003B5C] dark:text-blue-400 shrink-0 mt-0.5" />
          <div className="space-y-1 leading-relaxed">
            <h2 className="font-bold text-xs sm:text-sm text-[#003B5C] dark:text-blue-300">
              Terminal Moderation &amp; Publishing Protocol
            </h2>
            <p className="text-[11px] sm:text-xs opacity-90">
              Score registers submitted by class and subject tutors must undergo administrative review under <strong>Approval &amp; Withholding</strong> before broadsheets become finalized or student report cards can be generated for distribution.
            </p>
          </div>
        </div>

        {/* Action Modules Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-5">
          {resultModules.map((item) => {
            const Icon = item.icon

            return (
              <Link
                key={item.href}
                href={item.href}
                className="group relative bg-white dark:bg-slate-800/90 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-700/80 p-5 sm:p-6 shadow-xs hover:shadow-md hover:border-[#003B5C]/30 dark:hover:border-blue-500/30 transition-all duration-200 flex flex-col justify-between active:scale-[0.98] overflow-hidden"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-2">
                    <div className={`w-12 h-12 rounded-2xl ${item.bg} ${item.color} border ${item.border} flex items-center justify-center shadow-inner group-hover:scale-105 transition-transform shrink-0`}>
                      <Icon className="w-6 h-6" />
                    </div>

                    <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-mono font-bold uppercase tracking-wider border border-slate-200/80 dark:border-slate-700">
                      {item.badge}
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight group-hover:text-[#003B5C] dark:group-hover:text-blue-400 transition-colors">
                      {item.title}
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-3">
                      {item.description}
                    </p>
                  </div>
                </div>

                <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-bold text-[#003B5C] dark:text-blue-400">
                  <span>Open Console</span>
                  <div className="w-6 h-6 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400 group-hover:text-[#003B5C] dark:group-hover:text-blue-400 group-hover:translate-x-1 transition-all">
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              </Link>
            )
          })}
        </div>

      </main>
    </div>
  )
}