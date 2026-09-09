import { supabaseAdmin } from '@/lib/supabase-admin'
import Link from 'next/link'
import { 
  Users, 
  GraduationCap, 
  Target, 
  Award, 
  ArrowRight, 
  CheckCircle2 
} from 'lucide-react'

export default async function HomeAbout() {
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

  const studentCount = studentRes.count || 0
  const teacherCount = teacherRes.count || 0

  return (
    <section className="py-12 sm:py-16 md:py-20 bg-slate-50/50 dark:bg-slate-900 border-t border-slate-200/80 dark:border-slate-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-stretch">
          
          {/* Left Column: School Story & Live Stats */}
          <div className="lg:col-span-6 flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-4 bg-amber-400 rounded-full shrink-0" />
                  <span className="text-[11px] font-black uppercase tracking-widest text-[#003B5C] dark:text-blue-400">
                    About Our Institution
                  </span>
                </div>
                
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
                  Providing Quality Basic Education Since 2011
                </h2>
              </div>

              <div className="space-y-3 text-xs sm:text-sm md:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
                <p>
                  Biriwa Methodist &apos;C&apos; Basic School is a leading public basic educational institution located along the coastal stretch of Biriwa in the Central Region of Ghana. We provide comprehensive, accessible basic education spanning Kindergarten 1 through to Basic 9 (JHS 3).
                </p>
                <p>
                  Rooted in Christian Methodist heritage and guided by our motto{' '}
                  <span className="font-bold text-[#003B5C] dark:text-blue-400">
                    &ldquo;Discipline with Hardwork&rdquo;
                  </span>
                  , we combine high academic expectations with character education, equipping learners with the discipline, knowledge, and moral ethics needed to thrive as responsible leaders in Ghana.
                </p>
              </div>
            </div>

            {/* Metric Cards */}
            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                {/* Active Learners */}
                <div className="bg-white dark:bg-slate-800/90 rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-700/80 shadow-xs hover:shadow-md transition-all">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 truncate">
                      Enrolled Learners
                    </span>
                    <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-[#003B5C] dark:text-blue-400 shrink-0">
                      <Users className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-2xl sm:text-3xl lg:text-4xl font-black font-mono tracking-tight text-slate-900 dark:text-white">
                    {studentCount}
                  </div>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate mt-1">
                    Active on roll
                  </p>
                </div>

                {/* Qualified Educators */}
                <div className="bg-white dark:bg-slate-800/90 rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-700/80 shadow-xs hover:shadow-md transition-all">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 truncate">
                      Teaching Staff
                    </span>
                    <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 shrink-0">
                      <GraduationCap className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-2xl sm:text-3xl lg:text-4xl font-black font-mono tracking-tight text-slate-900 dark:text-white">
                    {teacherCount}
                  </div>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate mt-1">
                    Certified instructors
                  </p>
                </div>
              </div>

              {/* Read More Link */}
              <div>
                <Link
                  href="/about"
                  className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-[#003B5C] dark:text-blue-400 hover:text-amber-600 dark:hover:text-amber-400 transition-colors group"
                >
                  <span>Learn more about our school leadership and history</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </Link>
              </div>
            </div>
          </div>

          {/* Right Column: Mission & Vision Focus Card */}
          <div className="lg:col-span-6 bg-white dark:bg-slate-800/95 rounded-2xl sm:rounded-3xl p-5 sm:p-8 md:p-9 border border-slate-200/80 dark:border-slate-700/80 shadow-xs flex flex-col justify-between space-y-6">
            
            {/* Mission Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/40 text-[#003B5C] dark:text-blue-300 text-[10px] sm:text-xs font-bold uppercase tracking-wider border border-blue-200/50 dark:border-blue-900/40">
                  <Target className="w-3.5 h-3.5 text-[#003B5C] dark:text-blue-400 shrink-0" />
                  <span>Our Mission</span>
                </div>
              </div>

              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                Equitable Access to High-Standard Learning
              </h3>

              <p className="text-xs sm:text-sm md:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
                To provide relevant education and offer the highest quality learning environment in which students—irrespective of racial, ethnic, or religious background—are motivated and supported to achieve their full potential in academic disciplines and develop as productive, ethical citizens.
              </p>
            </div>

            {/* Subtle Divider */}
            <div className="h-px w-full bg-slate-100 dark:bg-slate-700/80" />

            {/* Vision Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-[10px] sm:text-xs font-bold uppercase tracking-wider border border-emerald-200/50 dark:border-emerald-900/40">
                  <Award className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>Our Vision</span>
                </div>
              </div>

              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                Developing Confident, Well-Rounded Leaders
              </h3>

              <p className="text-xs sm:text-sm md:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
                To nurture confident, responsible, and academically resilient individuals who aspire to reach their peak capabilities through a serene, safe, and supportive campus environment where every child&apos;s unique gift is cultivated.
              </p>
            </div>

            {/* Assurance Footer Note */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-700/80 flex items-center gap-2 text-[11px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>Registered with the Ghana Education Service &amp; Methodist Educational Unit</span>
            </div>

          </div>

        </div>
      </div>
    </section>
  )
}