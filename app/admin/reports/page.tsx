'use client'

import Link from 'next/link'
import { 
  BarChart3, 
  Archive, 
  FileText, 
  CalendarCheck, 
  Printer, 
  LineChart, 
  ArrowRight, 
  ShieldCheck, 
  Info,
  ScrollText,
  FileSpreadsheet
} from 'lucide-react'
import BackButton from '@/components/ui/back-button'

interface ReportModule {
  name: string
  description: string
  href: string
  icon: React.ElementType
  badge: string
  actionLabel: string
}

const reportTypes: ReportModule[] = [
  { 
    name: 'Student Report Cards', 
    description: 'Compile, preview, and batch-print official terminal report cards with class positions, attendance, and headteacher remarks.', 
    href: '/admin/reports/student',
    icon: ScrollText,
    badge: 'Terminal Cards',
    actionLabel: 'Generate Report Cards'
  },
  { 
    name: 'Historical Archives', 
    description: 'Access archived term registers and past broadsheets for previously graduated learners and past academic sessions.', 
    href: '/admin/reports/historical',
    icon: Archive,
    badge: 'Archive Vault',
    actionLabel: 'Access Past Records'
  },
  { 
    name: 'Cumulative Records', 
    description: 'Inspect multi-year continuous academic performance, subject trends, and progression ledgers across primary and JHS.', 
    href: '/admin/reports/cumulative',
    icon: FileSpreadsheet,
    badge: 'Multi-Year Ledger',
    actionLabel: 'View Cumulative Sheet'
  },
  { 
    name: 'Attendance Reports', 
    description: 'Export aggregate class roll-calls, student present/absent percentages, and term attendance statistics partitioned by gender.', 
    href: '/admin/reports/attendance',
    icon: CalendarCheck,
    badge: 'Roll-Call Data',
    actionLabel: 'Export Attendance Data'
  },
  { 
    name: 'Financial Summaries', 
    description: 'Review fee payment reconciliations, outstanding debtor broadsheets, receipts, and cashflow audit ledgers.', 
    href: '/admin/reports/financial',
    icon: Printer,
    badge: 'Accounts Audit',
    actionLabel: 'View Revenue Ledger'
  },
  { 
    name: 'Academic Analytics', 
    description: 'Analyze subject score percentiles, class grade distributions, BECE trial averages, and departmental pass rates.', 
    href: '/admin/reports/academic',
    icon: LineChart,
    badge: 'Performance Insights',
    actionLabel: 'Analyze Performance'
  },
]

export default function ReportsPage() {
  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-900 font-sans text-slate-900 dark:text-slate-100 flex flex-col transition-colors selection:bg-[#003B5C] selection:text-white">
      
      {/* Sticky Header */}
      <header className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div className="max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 py-3.5 sm:py-4">
          <div className="flex items-center justify-between gap-3">
            
            <div className="flex items-center gap-3 sm:gap-4 min-w-0">
              <BackButton href="/admin/dashboard" />
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-4 bg-amber-400 rounded-full shrink-0" />
                  <h1 className="text-base sm:text-xl md:text-2xl font-black text-slate-900 dark:text-white tracking-tight truncate">
                    School Broadsheets &amp; Reports
                  </h1>
                </div>
                <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium truncate mt-0.5">
                  Generate official terminal cards, cumulative records, attendance tallies, and audits
                </p>
              </div>
            </div>

            <div className="hidden sm:inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#003B5C]/10 dark:bg-blue-950/50 border border-[#003B5C]/20 dark:border-blue-900/50 text-[#003B5C] dark:text-blue-300 text-xs font-bold shrink-0">
              <ShieldCheck className="w-4 h-4 text-amber-500 shrink-0" />
              <span>Official GES Reports</span>
            </div>

          </div>
        </div>
      </header>

      {/* Main Workspace */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-3.5 sm:px-6 lg:px-8 py-5 sm:py-8 space-y-5 sm:space-y-6">
        
        {/* Compliance Guidelines */}
        <div className="bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200/70 dark:border-blue-900/50 rounded-2xl p-4 sm:p-5 flex items-start gap-3 text-xs text-blue-900 dark:text-blue-200 shadow-2xs">
          <Info className="w-4 h-4 sm:w-5 sm:h-5 text-[#003B5C] dark:text-blue-400 shrink-0 mt-0.5" />
          <div className="space-y-1 leading-relaxed">
            <h2 className="font-bold text-xs sm:text-sm text-[#003B5C] dark:text-blue-300">
              Terminal Reporting &amp; Archival Protocol
            </h2>
            <p className="text-[11px] sm:text-xs opacity-90">
              Verify that subject teachers have finalized score entry and class attendance figures before compiling report cards. Historical exports remain accessible even after students progress or graduate.
            </p>
          </div>
        </div>

        {/* Report Modules Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-5 lg:gap-6">
          {reportTypes.map((report) => {
            const Icon = report.icon

            return (
              <Link 
                key={report.href} 
                href={report.href} 
                className="group bg-white dark:bg-slate-800/90 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-700/80 p-5 sm:p-6 lg:p-7 shadow-xs hover:shadow-md hover:border-[#003B5C]/30 dark:hover:border-blue-500/30 transition-all duration-200 flex flex-col justify-between active:scale-[0.98]"
              >
                <div className="space-y-4">
                  {/* Top Bar: Icon & Type Badge */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="w-12 h-12 rounded-2xl bg-[#003B5C]/10 dark:bg-blue-500/20 text-[#003B5C] dark:text-blue-300 border border-[#003B5C]/15 dark:border-blue-400/20 flex items-center justify-center shadow-2xs group-hover:scale-105 transition-transform shrink-0">
                      <Icon className="w-6 h-6" />
                    </div>

                    <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-mono font-bold uppercase tracking-wider border border-slate-200/80 dark:border-slate-700">
                      {report.badge}
                    </span>
                  </div>

                  {/* Title & Description */}
                  <div className="space-y-1.5">
                    <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight group-hover:text-[#003B5C] dark:group-hover:text-blue-400 transition-colors">
                      {report.name}
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-3 font-normal">
                      {report.description}
                    </p>
                  </div>
                </div>

                {/* Bottom Action Indicator */}
                <div className="pt-4 mt-5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-bold text-[#003B5C] dark:text-blue-400">
                  <span>{report.actionLabel}</span>
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