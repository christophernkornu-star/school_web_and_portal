'use client'

import Link from 'next/link'
import SiteHeader from '@/components/SiteHeader'
import { PortalFooter } from '@/components/PortalFooter'
import { 
  Target, 
  Award, 
  Heart, 
  Users, 
  Scale, 
  MapPin, 
  Phone, 
  Mail, 
  ArrowRight, 
  ShieldCheck, 
  Building2, 
  BookOpen, 
  Laptop, 
  Trophy, 
  Compass, 
  CheckCircle2 
} from 'lucide-react'

export default function AboutPage() {
  const coreValues = [
    {
      title: 'Teamwork',
      desc: 'Collaborative spirit among educators, learners, and community.',
      icon: Users,
      color: 'text-[#003B5C] dark:text-blue-400',
      bg: 'bg-blue-50 dark:bg-blue-950/40',
      border: 'hover:border-[#003B5C]/40'
    },
    {
      title: 'Commitment',
      desc: 'Dedication to academic excellence and moral growth.',
      icon: Heart,
      color: 'text-rose-600 dark:text-rose-400',
      bg: 'bg-rose-50 dark:bg-rose-950/40',
      border: 'hover:border-rose-500/40'
    },
    {
      title: 'Discipline',
      desc: 'Upholding strict behavioral and ethical standards.',
      icon: Award,
      color: 'text-purple-600 dark:text-purple-400',
      bg: 'bg-purple-50 dark:bg-purple-950/40',
      border: 'hover:border-purple-500/40'
    },
    {
      title: 'Faithfulness',
      desc: 'Rooted in Christian principles and dependable stewardship.',
      icon: ShieldCheck,
      color: 'text-emerald-600 dark:text-emerald-400',
      bg: 'bg-emerald-50 dark:bg-emerald-950/40',
      border: 'hover:border-emerald-500/40'
    },
    {
      title: 'Integrity',
      desc: 'Honesty and accountability in every sphere of learning.',
      icon: Scale,
      color: 'text-amber-600 dark:text-amber-400',
      bg: 'bg-amber-50 dark:bg-amber-950/40',
      border: 'hover:border-amber-500/40'
    },
    {
      title: 'Accountability',
      desc: 'Responsibility for results, behavior, and mutual progress.',
      icon: Compass,
      color: 'text-[#003B5C] dark:text-blue-400',
      bg: 'bg-blue-50 dark:bg-blue-950/40',
      border: 'hover:border-[#003B5C]/40'
    }
  ]

  const facilities = [
    {
      title: 'Classrooms & Learning Blocks',
      description: 'Well-ventilated, well-equipped, and spacious classrooms designed for active learning from KG through JHS 3.',
      icon: Building2,
      badge: 'KG to Basic 9'
    },
    {
      title: 'School Resource Library',
      description: 'A curated repository of textbooks, readers, and teaching resources matching Ghana Education Service standards.',
      icon: BookOpen,
      badge: 'Core Subjects'
    },
    {
      title: 'Digital ICT Laboratory',
      description: 'A dedicated computing and digital literacy hub empowering learners with hands-on modern computing skills.',
      icon: Laptop,
      badge: 'Digital Literacy'
    },
    {
      title: 'Recreational & Sports Grounds',
      description: 'Spacious outdoor playing grounds and physical training spaces supporting physical education and wellness.',
      icon: Trophy,
      badge: 'Physical Health'
    }
  ]

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-900 font-sans text-slate-900 dark:text-slate-100 flex flex-col transition-colors selection:bg-[#003B5C] selection:text-white">
      <SiteHeader />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden bg-gradient-to-r from-[#003B5C] via-[#002a42] to-slate-900 text-white py-14 sm:py-20 md:py-24 border-b border-white/10">
          <div className="absolute top-0 right-0 -mt-16 -mr-16 h-72 w-72 sm:h-96 sm:w-96 rounded-full bg-blue-500/20 blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 -mb-16 -ml-16 h-72 w-72 sm:h-96 sm:w-96 rounded-full bg-amber-500/20 blur-3xl pointer-events-none" />

          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10 space-y-3 sm:space-y-5">
            <div className="inline-flex items-center px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-amber-300 text-xs sm:text-sm font-black uppercase tracking-widest shadow-inner">
              <span>About Our School</span>
            </div>

            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight leading-tight text-white">
              Biriwa Methodist &apos;C&apos; Basic School
            </h1>

            <p className="text-sm sm:text-base md:text-lg text-blue-100/90 max-w-2xl mx-auto font-medium leading-relaxed">
              Committed to holistic academic rigor, Christian character formation, and inclusive child development since our establishment.
            </p>
          </div>
        </section>

        {/* History & Heritage Section */}
        <section className="py-10 sm:py-16 md:py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* Left Column: Narrative */}
            <div className="lg:col-span-8 bg-white dark:bg-slate-800/90 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-700/80 p-5 sm:p-8 md:p-10 shadow-xs space-y-4 sm:space-y-6">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-4 bg-amber-400 rounded-full" />
                  <span className="text-xs font-black uppercase tracking-widest text-[#003B5C] dark:text-blue-400">
                    Our Heritage & Background
                  </span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                  A Coastal Centre of Educational Excellence
                </h2>
              </div>

              <div className="space-y-4 text-xs sm:text-sm md:text-base text-slate-600 dark:text-slate-300 leading-relaxed text-left">
                <p>
                  Biriwa Methodist &apos;C&apos; Basic School is a thriving educational community located in Biriwa within the Central Region of Ghana, positioned just 200 metres from the Gulf of Guinea. Established during the 2011/2012 academic year, the school was carved out of the original Biriwa Methodist A &amp; B Schools to expand access to high-standard basic education for the growing youth population.
                </p>
                <p>
                  Situated in an energetic coastal settlement where many families earn their livelihoods through fishing and related trade, the institution serves as an essential pillar of opportunity, stability, and future mobility for children from diverse socioeconomic backgrounds.
                </p>
                <p>
                  As an integral part of the Methodist Church Ghana Educational Unit, our institution delivers education grounded in Christian values. We instill moral discipline, academic diligence, leadership, and spiritual formation, offering a seamless pre-tertiary progression from Kindergarten 1 to Basic 9 (JHS 3).
                </p>
                <p>
                  Under the stewardship of headteacher <strong>Majesty Tettey</strong>, the school continues to undergo meaningful revitalization across academics, school infrastructure, and community participation. His leadership continues to strengthen strategic ties between teachers, the School Management Committee (SMC), the Parent-Teacher Association (PTA), and traditional leadership.
                </p>
              </div>
            </div>

            {/* Right Column: Institutional Snapshot */}
            <div className="lg:col-span-4 space-y-4 sm:space-y-6">
              <div className="bg-gradient-to-br from-[#003B5C] to-slate-900 text-white rounded-2xl sm:rounded-3xl p-5 sm:p-7 shadow-md border border-white/10 space-y-5">
                <h3 className="text-sm font-black uppercase tracking-widest text-amber-300">
                  Institutional Profile
                </h3>

                <div className="space-y-3.5 divide-y divide-white/10">
                  <div className="pt-2 first:pt-0">
                    <span className="text-[11px] font-bold text-blue-200 uppercase tracking-wider block">Established</span>
                    <span className="text-sm sm:text-base font-bold text-white">2011 / 2012 Academic Year</span>
                  </div>

                  <div className="pt-3">
                    <span className="text-[11px] font-bold text-blue-200 uppercase tracking-wider block">Location</span>
                    <span className="text-sm sm:text-base font-bold text-white">Biriwa, Central Region, Ghana</span>
                    <p className="text-[11px] text-blue-200/80 mt-0.5">200m from the Gulf of Guinea coastline</p>
                  </div>

                  <div className="pt-3">
                    <span className="text-[11px] font-bold text-blue-200 uppercase tracking-wider block">Academic Scope</span>
                    <span className="text-sm sm:text-base font-bold text-white">Kindergarten 1 to Basic 9 (JHS 3)</span>
                  </div>

                  <div className="pt-3">
                    <span className="text-[11px] font-bold text-blue-200 uppercase tracking-wider block">Religious Affiliation</span>
                    <span className="text-sm sm:text-base font-bold text-white">Methodist Church Ghana</span>
                  </div>

                  <div className="pt-3">
                    <span className="text-[11px] font-bold text-blue-200 uppercase tracking-wider block">Current Headship</span>
                    <span className="text-sm sm:text-base font-bold text-white">Majesty Tettey</span>
                  </div>
                </div>
              </div>

              {/* Motto Card */}
              <div className="bg-amber-400 text-[#003B5C] rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-xs border border-amber-500/20 text-center space-y-1">
                <span className="text-[10px] font-black uppercase tracking-widest text-[#003B5C]/70">Institutional Motto</span>
                <p className="text-xl sm:text-2xl font-black tracking-tight">
                  &ldquo;Discipline with Hardwork&rdquo;
                </p>
              </div>
            </div>

          </div>
        </section>

        {/* Mission & Vision Section */}
        <section className="py-10 sm:py-16 bg-white dark:bg-slate-800/60 border-y border-slate-200/80 dark:border-slate-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
            <div className="text-center space-y-1.5 max-w-2xl mx-auto">
              <span className="text-xs font-black uppercase tracking-widest text-amber-500">
                Core Purpose
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                Our Mission &amp; Vision
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-8 max-w-5xl mx-auto">
              {/* Mission Card */}
              <div className="bg-slate-50/70 dark:bg-slate-900/60 rounded-2xl sm:rounded-3xl p-6 sm:p-8 border border-slate-200/80 dark:border-slate-700/80 shadow-xs flex flex-col justify-between space-y-4">
                <div className="space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-[#003B5C] dark:text-blue-400 flex items-center justify-center shadow-xs">
                    <Target className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight">
                    Our Mission
                  </h3>
                  <p className="text-xs sm:text-sm md:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
                    To provide relevant education and offer an inspiring learning environment in which students—irrespective of social, ethnic, or religious background—are motivated and supported to achieve their full potential in academic disciplines and become productive, ethical members of society.
                  </p>
                </div>
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#003B5C] dark:text-blue-400 pt-2 border-t border-slate-200/60 dark:border-slate-800">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span>Equitable &amp; High-Standard Education</span>
                </div>
              </div>

              {/* Vision Card */}
              <div className="bg-slate-50/70 dark:bg-slate-900/60 rounded-2xl sm:rounded-3xl p-6 sm:p-8 border border-slate-200/80 dark:border-slate-700/80 shadow-xs flex flex-col justify-between space-y-4">
                <div className="space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-xs">
                    <Award className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight">
                    Our Vision
                  </h3>
                  <p className="text-xs sm:text-sm md:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
                    To develop well-rounded, confident, and responsible individuals who aspire to reach their peak capabilities by providing a serene, safe, and nurturing environment where every child&apos;s unique talents are celebrated and nurtured.
                  </p>
                </div>
                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 pt-2 border-t border-slate-200/60 dark:border-slate-800">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span>Holistic Child Formation</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Core Values Section */}
        <section className="py-10 sm:py-16 md:py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 sm:space-y-10">
          <div className="text-center space-y-1.5 max-w-2xl mx-auto">
            <span className="text-xs font-black uppercase tracking-widest text-[#003B5C] dark:text-blue-400">
              Guiding Principles
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              Our Core Institutional Values
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              These shared values define our daily campus culture, student conduct, and pedagogical approach.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
            {coreValues.map((val) => {
              const Icon = val.icon
              return (
                <div 
                  key={val.title}
                  className={`bg-white dark:bg-slate-800/90 rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-700/80 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between text-center space-y-3 ${val.border}`}
                >
                  <div className="space-y-2.5">
                    <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-2xl ${val.bg} ${val.color} flex items-center justify-center mx-auto shadow-2xs`}>
                      <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
                    </div>
                    <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                      {val.title}
                    </h3>
                  </div>
                  <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 leading-snug">
                    {val.desc}
                  </p>
                </div>
              )
            })}
          </div>
        </section>

        {/* Regulatory & Institutional Mandates */}
        <section className="py-10 sm:py-16 bg-white dark:bg-slate-800/50 border-t border-slate-200/80 dark:border-slate-800">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
            <div className="text-center space-y-1.5 max-w-2xl mx-auto">
              <span className="text-xs font-black uppercase tracking-widest text-amber-500">
                Statutory Compliance
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                Educational Mandates &amp; Directives
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              
              {/* Ministry of Education Mandate */}
              <div className="bg-slate-50/70 dark:bg-slate-900/60 rounded-2xl sm:rounded-3xl p-5 sm:p-7 border border-slate-200/80 dark:border-slate-700/80 space-y-2.5 shadow-xs">
                <span className="inline-block px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                  Ministry of Education
                </span>
                <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                  National Policy &amp; Human Capital Mandate
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  To ensure quality and accessible education for all Ghanaians, focusing on policy formulation, coordination, monitoring, and evaluation to support human capital development and national progress.
                </p>
              </div>

              {/* Ghana Education Service Mandate */}
              <div className="bg-slate-50/70 dark:bg-slate-900/60 rounded-2xl sm:rounded-3xl p-5 sm:p-7 border border-slate-200/80 dark:border-slate-700/80 space-y-2.5 shadow-xs">
                <span className="inline-block px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                  Ghana Education Service
                </span>
                <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                  Implementation &amp; Manpower Delivery Mandate
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  To ensure all Ghanaian children of school-going age receive inclusive, equitable, and quality formal education and training, effectively managing resources to meet the nation&apos;s manpower needs.
                </p>
              </div>

              {/* NaSIA Mandate */}
              <div className="bg-slate-50/70 dark:bg-slate-900/60 rounded-2xl sm:rounded-3xl p-5 sm:p-7 border border-slate-200/80 dark:border-slate-700/80 space-y-2.5 shadow-xs">
                <span className="inline-block px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-blue-100 text-[#003B5C] dark:bg-blue-950/60 dark:text-blue-300">
                  National Schools Inspectorate Authority (NaSIA)
                </span>
                <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                  Standards &amp; Quality Licensing Mandate
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  To develop, publish, promote, and license pre-tertiary schools, enforcing rigorous benchmarks for teaching quality, learner safety, and educational infrastructure across Ghana.
                </p>
              </div>

              {/* School Specific Mandate */}
              <div className="bg-[#003B5C] text-white rounded-2xl sm:rounded-3xl p-5 sm:p-7 border border-white/15 space-y-2.5 shadow-md">
                <span className="inline-block px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-amber-400 text-[#003B5C]">
                  Biriwa Methodist &apos;C&apos; Mandate
                </span>
                <h3 className="text-sm sm:text-base font-bold text-white">
                  Institutional Community Commitment
                </h3>
                <p className="text-xs sm:text-sm text-blue-100/90 leading-relaxed">
                  To provide high-quality education that serves the evolving needs of our learners and coastal community, delivering relevant and accessible basic schooling that fosters lifelong development and moral leadership.
                </p>
              </div>

            </div>
          </div>
        </section>

        {/* Facilities Section */}
        <section className="py-10 sm:py-16 md:py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="text-center space-y-1.5 max-w-2xl mx-auto">
            <span className="text-xs font-black uppercase tracking-widest text-[#003B5C] dark:text-blue-400">
              Campus Environment
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              School Learning Facilities
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Equipped spaces purposefully built to support teaching, reading, ICT literacy, and physical wellness.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
            {facilities.map((fac) => {
              const Icon = fac.icon
              return (
                <div 
                  key={fac.title}
                  className="bg-white dark:bg-slate-800/90 rounded-2xl sm:rounded-3xl p-5 sm:p-6 border border-slate-200/80 dark:border-slate-700/80 shadow-xs hover:shadow-md hover:border-[#003B5C]/30 transition-all flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="w-11 h-11 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-[#003B5C] dark:text-blue-400 flex items-center justify-center">
                        <Icon className="w-5 h-5" />
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 font-mono">
                        {fac.badge}
                      </span>
                    </div>

                    <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                      {fac.title}
                    </h3>

                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                      {fac.description}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        {/* Visit & Contact Call to Action */}
        <section className="pb-16 sm:pb-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-r from-[#003B5C] via-[#002a42] to-slate-900 text-white p-6 sm:p-10 md:p-12 border border-white/10 shadow-xl">
            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8 text-center md:text-left">
              
              <div className="space-y-4 max-w-xl">
                <div className="space-y-1">
                  <span className="text-xs font-black uppercase tracking-widest text-amber-300">
                    Get in Touch
                  </span>
                  <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                    Visit Our Coastal Campus
                  </h2>
                </div>

                <p className="text-xs sm:text-sm text-blue-100/90 leading-relaxed">
                  We welcome prospective parents, education partners, and alumni. Schedule a campus visit or contact our administration for enrollment procedures.
                </p>

                <div className="flex flex-col sm:flex-row flex-wrap gap-4 pt-1 text-xs text-blue-100 justify-center md:justify-start">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>Biriwa, Central Region, Ghana</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>+233 24 393 0752</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>info@biriwamethodist.edu.gh</span>
                  </div>
                </div>
              </div>

              <div className="shrink-0 flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                <Link 
                  href="/admission"
                  className="inline-flex items-center justify-center gap-2 bg-amber-400 hover:bg-amber-300 text-[#003B5C] font-black text-xs sm:text-sm px-6 py-3.5 rounded-xl shadow-lg transition-all active:scale-95"
                >
                  <span>Apply for Admission</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link 
                  href="/complaints"
                  className="inline-flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white font-bold text-xs sm:text-sm px-6 py-3.5 rounded-xl backdrop-blur-md border border-white/20 transition-all active:scale-95"
                >
                  <span>Contact Desk</span>
                </Link>
              </div>

            </div>
          </div>
        </section>
      </main>

      {/* Bottom Portal Footer */}
      <PortalFooter />
    </div>
  )
}