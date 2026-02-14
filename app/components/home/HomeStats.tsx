import { supabaseAdmin } from '@/lib/supabase-admin'

export default async function HomeStats() {
  // Fetch stats settings
  const { data: settings } = await supabaseAdmin
    .from('system_settings')
    .select('setting_key, setting_value')
    .in('setting_key', ['stats_title', 'stats_subtitle', 'founding_year', 'teacher_student_ratio', 'bece_participation', 'bece_pass_rate', 'grade_levels'])

  const settingsObj: any = {}
  if (settings) {
    settings.forEach((s: any) => {
      settingsObj[s.setting_key] = s.setting_value
    })
  }

  const foundingYear = parseInt(settingsObj.founding_year || '1960')
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
    subtitle: settingsObj.stats_subtitle || 'Building excellence in education for over six decades',
    yearsOfOperation: currentYear - foundingYear,
    teacherStudentRatio: settingsObj.teacher_student_ratio || '1:15',
    beceParticipation: settingsObj.bece_participation || '100%',
    becePassRate: settingsObj.bece_pass_rate || '85',
    gradeLevels: settingsObj.grade_levels || '9',
    passRate: parseInt(settingsObj.bece_pass_rate || '85'),
    studentCount: studentRes.count || 0,
    teacherCount: teacherRes.count || 0
  }

  return (
    <section className="py-12 md:py-16 bg-white border-t-4 border-methodist-gold">
      <div className="container mx-auto px-4 md:px-6">
        <div className="text-center mb-8 md:mb-12">
          <h3 className="text-2xl md:text-4xl font-bold text-methodist-blue mb-2 md:mb-3">
            {stats.title}
          </h3>
          <p className="text-sm md:text-base text-gray-600 max-w-2xl mx-auto">
            {stats.subtitle}
          </p>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 max-w-5xl mx-auto">
          <div className="bg-gradient-to-br from-methodist-blue to-blue-800 rounded-xl p-4 md:p-6 shadow-lg text-white text-center transform hover:scale-105 transition-transform flex flex-col justify-center h-full">
            <div className="text-3xl md:text-5xl font-extrabold mb-1 md:mb-2">{stats.yearsOfOperation}+</div>
            <div className="text-xs md:text-sm uppercase tracking-wider opacity-90">Years of Excellence</div>
          </div>

          <div className="bg-gradient-to-br from-ghana-green to-green-700 rounded-xl p-4 md:p-6 shadow-lg text-white text-center transform hover:scale-105 transition-transform flex flex-col justify-center h-full">
            <div className="text-3xl md:text-5xl font-extrabold mb-1 md:mb-2">{stats.studentCount}</div>
            <div className="text-xs md:text-sm uppercase tracking-wider opacity-90">Active Students</div>
          </div>

          <div className="bg-gradient-to-br from-methodist-gold to-yellow-600 rounded-xl p-4 md:p-6 shadow-lg text-white text-center transform hover:scale-105 transition-transform flex flex-col justify-center h-full">
            <div className="text-3xl md:text-5xl font-extrabold mb-1 md:mb-2">{stats.teacherCount}</div>
            <div className="text-xs md:text-sm uppercase tracking-wider opacity-90">Qualified Teachers</div>
          </div>

          <div className="bg-gradient-to-br from-ghana-red to-red-700 rounded-xl p-4 md:p-6 shadow-lg text-white text-center transform hover:scale-105 transition-transform flex flex-col justify-center h-full">
            <div className="text-3xl md:text-5xl font-extrabold mb-1 md:mb-2">{stats.passRate}%</div>
            <div className="text-xs md:text-sm uppercase tracking-wider opacity-90">Pass Rate</div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 max-w-4xl mx-auto mt-6 md:mt-8">
          <div className="bg-gray-50 rounded-lg p-4 md:p-6 text-center border-2 border-gray-200 hover:border-methodist-blue transition-colors flex flex-col justify-center h-full">
            <div className="text-2xl md:text-3xl font-bold text-methodist-blue mb-1">{stats.teacherStudentRatio}</div>
            <div className="text-xs md:text-sm text-gray-600">Teacher-Student Ratio</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-4 md:p-6 text-center border-2 border-gray-200 hover:border-methodist-blue transition-colors flex flex-col justify-center h-full">
            <div className="text-2xl md:text-3xl font-bold text-methodist-blue mb-1">{stats.beceParticipation}</div>
            <div className="text-xs md:text-sm text-gray-600">BECE Participation</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-4 md:p-6 text-center border-2 border-gray-200 hover:border-methodist-blue transition-colors flex flex-col justify-center h-full sm:col-span-2 lg:col-span-1">
            <div className="text-2xl md:text-3xl font-bold text-methodist-blue mb-1">{stats.gradeLevels}</div>
            <div className="text-xs md:text-sm text-gray-600">Grade Levels (KG - Basic 9)</div>
          </div>
        </div>
      </div>
    </section>
  )
}
