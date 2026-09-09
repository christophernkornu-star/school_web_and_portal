import { supabaseAdmin } from '@/lib/supabase-admin'
import { 
  Users, 
  GraduationCap, 
  Award, 
  Calendar, 
  TrendingUp, 
  CheckCircle2, 
  Layers 
} from 'lucide-react'

export default async function HomeStats() {
  // Fetch stats settings
  const { data: settings } = await supabaseAdmin
    .from('system_settings')
    .select('setting_key, setting_value')
    .in('setting_key', [
      'stats_title', 
      'stats_subtitle', 
      'founding_year', 
      'teacher_student_ratio', 
      'bece_participation', 
      'bece_pass_rate', 
      'grade_levels'
    ])

  const settingsObj: Record<string, string> = {}
  if (settings) {
    settings.forEach((s: any) => {
      settingsObj[s.setting_key] = s.setting_value
    })
  }

  const foundingYear = parseInt(settingsObj.founding_year || '2011', 10)
  const currentYear = new Date().getFullYear()

  // Fetch counts
  const [studentRes, teacherRes] = await Promise.all([
    supabaseAdmin
      .from('students')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active'),
    supabaseAdmin
      .from('teachers')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active')
  ])

  const stats = {
    title: settingsObj.stats_title || 'Our Impact in Numbers',
    subtitle: settingsObj.stats_subtitle || 'Dedicated to accessible basic education, academic discipline, and character formation.',
    yearsOfOperation: Math.max(currentYear - foundingYear, 1),
    teacherStudentRatio: settingsObj.teacher_student_ratio || '1:25',
    beceParticipation: settingsObj.bece_participation || '100%',
    gradeLevels: settingsObj.grade_levels || 'KG - Basic 9',
    passRate: parseInt(settingsObj.bece_pass_rate || '85', 10),
    studentCount: studentRes.count || 0,
    teacherCount: teacherRes.count || 0
  }

  const primaryCards = [
    {
      label: 'Years of Service',
      value: `${stats.yearsOfOperation}+`,
      subtext: 'Continuous instruction',
      icon: Calendar,
      color: 'text-[#003B5C] dark:text-blue-400',
      bg: 'bg-blue-50 dark:bg-blue-950/40',
      border: 'hover:border-[#003B5C]/30'
    },
    {
      label: 'Enrolled Learners',
      value: `${stats.studentCount}`,
      subtext: 'Active school register',
      icon: Users,
      color: 'text-emerald-600 dark:text-emerald-400',
      bg: 'bg-emerald-50 dark:bg-emerald-950/40',
      border: 'hover:border-emerald-500/30'
    },
    {
      label: 'Teaching Staff',
      value: `${stats.teacherCount}`,
      subtext: 'Certified educators',
      icon: GraduationCap,
      color: 'text-amber-600 dark:text-amber-400',
      bg: 'bg-amber-50 dark:bg-amber-950/40',
      border: 'hover:border-amber-500/30'
    },
    {
      label: 'BECE Pass Rate',
      value: `${stats.passRate}%`,
      subtext: 'Academic success target',
      icon: Award,
      color: 'text-purple-600 dark:text-purple-400',
      bg: 'bg-purple-50 dark:bg-purple-950/40',
      border: 'hover:border-purple-500/30'
    }
  ]

  const secondaryStats = [
    {
      label: 'Teacher-Student Ratio',
      value: stats.teacherStudentRatio,
      caption: 'Focused classroom attention',
      icon: Users
    },
    {
      label: 'BECE Examination',
      value: stats.beceParticipation,
      caption: 'Candidate participation rate',
      icon: CheckCircle2
    },
    {
      label: 'Classroom Levels',
      value: stats.gradeLevels,
      caption: 'Kindergarten 1 to JHS 3',
      icon: Layers
    }
  ]

  return (
    <section className="py-12 sm:py-16 md:py-20 bg-white dark:bg-slate-900 border-t border-slate-200/80 dark:border-slate-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 sm:space-y-12">
        
        {/* Section Header */}
        <div className="text-center space-y-2 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/50 text-[#003B5C] dark:text-blue-300 text-[10px] sm:text-xs font-black uppercase tracking-wider">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Academic &amp; Institutional Metrics</span>
          </div>

          <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
            {stats.title}
          </h2>

          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
            {stats.subtitle}
          </p>
        </div>

        {/* Primary KPI Grid (2 cols on mobile, 4 on desktop) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-5">
          {primaryCards.map((card) => {
            const Icon = card.icon
            return (
              <div
                key={card.label}
                className={`bg-slate-50/70 dark:bg-slate-800/80 rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-slate-200/80 dark:border-slate-700/80 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between ${card.border}`}
              >
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 truncate">
                    {card.label}
                  </span>
                  <div className={`p-2 sm:p-2.5 rounded-xl ${card.bg} ${card.color} shrink-0`}>
                    <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="text-2xl sm:text-3xl lg:text-4xl font-black font-mono tracking-tight text-slate-900 dark:text-white">
                    {card.value}
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                    {card.subtext}
                  </p>
                </div>
              </div>
            )
          })}
        </div>

        {/* Secondary Metric Strip (1 col on mobile, 3 cols on tablet/desktop) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 max-w-4xl mx-auto pt-2 sm:pt-4">
          {secondaryStats.map((item) => {
            const Icon = item.icon
            return (
              <div
                key={item.label}
                className="bg-slate-50/50 dark:bg-slate-800/40 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 p-4 flex items-center gap-3.5 shadow-2xs hover:bg-white dark:hover:bg-slate-800 transition-colors"
              >
                <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-750 text-[#003B5C] dark:text-blue-400 flex items-center justify-center shrink-0">
                  <Icon className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-base sm:text-lg font-black font-mono text-slate-900 dark:text-white truncate">
                      {item.value}
                    </span>
                  </div>
                  <p className="text-[11px] font-bold text-slate-700 dark:text-slate-300 truncate">
                    {item.label}
                  </p>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate">
                    {item.caption}
                  </p>
                </div>
              </div>
            )
          })}
        </div>

      </div>
    </section>
  )
}