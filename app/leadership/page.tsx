'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { 
  GraduationCap, 
  Award, 
  Users, 
  User, 
  ArrowLeft,
  Building2,
  PhoneCall,
  CheckCircle2,
  Crown
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'
import { Skeleton } from '@/components/ui/skeleton'
import SiteHeader from '@/components/SiteHeader'
import { PortalFooter } from '@/components/PortalFooter'

export default function LeadershipPage() {
  const router = useRouter()
  const [teachers, setTeachers] = useState<any[]>([])
  const [prefects, setPrefects] = useState<any[]>([])
  const [ptaMembers, setPtaMembers] = useState<any[]>([])
  const [smcMembers, setSmcMembers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = getSupabaseBrowserClient()

  useEffect(() => {
    async function loadData() {
      // 1. Fetch Prefects
      const { data: prefectData } = await supabase
        .from('prefects')
        .select('*')
        .eq('active', true)
        .order('rank', { ascending: true })

      if (prefectData) setPrefects(prefectData)

      // 2. Fetch Pta
      const { data: ptaData } = await supabase
        .from('pta_members')
        .select('*')
        .eq('active', true)
        .order('rank', { ascending: true })

      if (ptaData) setPtaMembers(ptaData)
      
      // 3. Fetch SMC
      const { data: smcData } = await supabase
        .from('smc_members')
        .select('*')
        .eq('active', true)
        .order('rank', { ascending: true })

      if (smcData) setSmcMembers(smcData)

      // 4. Fetch Teachers
      const { data: teacherData } = await supabase
        .from('teachers')
        .select('*')
        .eq('status', 'active')
        .order('display_rank', { ascending: true })
        .order('last_name', { ascending: true })

      if (teacherData) {
        setTeachers(teacherData)
      }
      
      setLoading(false)
    }

    loadData()
  }, [])

  const adminStaff = teachers.filter(t => {
      const pos = (t.position || '').toLowerCase();
      return pos.includes('head') || pos.includes('principal') || pos.includes('assistant');
  });

  const teachingStaff = teachers.filter(t => !adminStaff.includes(t));

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 font-sans text-slate-900 dark:text-slate-100 flex flex-col transition-colors selection:bg-[#003B5C] selection:text-white">
      <SiteHeader />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden bg-gradient-to-r from-[#003B5C] via-[#002a42] to-slate-900 text-white py-12 sm:py-16 md:py-20 border-b border-white/10">
          <div className="absolute top-0 right-0 -mt-16 -mr-16 h-72 w-72 sm:h-96 sm:w-96 rounded-full bg-blue-500/20 blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 -mb-16 -ml-16 h-72 w-72 sm:h-96 sm:w-96 rounded-full bg-amber-500/20 blur-3xl pointer-events-none" />

          {/* Floating Back Button */}
          <div className="absolute top-4 left-4 sm:top-6 sm:left-6 lg:left-8 z-20">
            <button 
              onClick={() => router.back()} 
              className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-bold bg-white/10 hover:bg-white/20 border border-white/10 rounded-full backdrop-blur-md transition-all active:scale-95"
            >
              <ArrowLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span>Back</span>
            </button>
          </div>

          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10 space-y-3 sm:space-y-4 pt-10 sm:pt-4">
            <div className="inline-flex items-center px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-amber-300 text-xs sm:text-sm font-black uppercase tracking-widest shadow-inner">
              <span>Institutional Leadership</span>
            </div>

            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight leading-tight text-white">
              Meet Our Leadership
            </h1>

            <p className="text-sm sm:text-base md:text-lg text-blue-100/90 max-w-2xl mx-auto font-medium leading-relaxed">
              The dedicated administration, educators, and community representatives steering Biriwa Methodist &apos;C&apos; Basic School toward academic excellence.
            </p>
          </div>
        </section>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 space-y-16 sm:space-y-24">

          {/* 1. School Administration Section */}
          <section className="space-y-8 sm:space-y-10">
            <div className="text-center space-y-2 max-w-2xl mx-auto">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/50 text-[#003B5C] dark:text-blue-300 text-[10px] sm:text-xs font-black uppercase tracking-wider border border-blue-200/50 dark:border-blue-900/40">
                <Building2 className="w-3.5 h-3.5" />
                <span>Executive Headship</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                School Administration
              </h2>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 justify-center max-w-5xl mx-auto">
                {[1, 2, 3].map(i => <Skeleton key={i} className="aspect-[4/5] w-full rounded-3xl" />)}
              </div>
            ) : adminStaff.length === 0 ? (
              <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-3xl border border-dashed border-slate-300 dark:border-slate-700">
                <User className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                <p className="text-sm text-slate-500">Administration details to be updated.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 justify-center max-w-5xl mx-auto">
                {adminStaff.map((teacher) => (
                  <Card key={teacher.id} className="overflow-hidden rounded-3xl border border-slate-200/80 dark:border-slate-700/80 shadow-xs hover:shadow-lg transition-all duration-300 group">
                    <div className="aspect-[4/5] relative bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      {teacher.image_url ? (
                        <Image 
                          src={teacher.image_url} 
                          alt={`${teacher.first_name} ${teacher.last_name}`}
                          fill
                          sizes="(max-width: 768px) 100vw, 33vw"
                          className="object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <User className="w-24 h-24 text-slate-300 dark:text-slate-600" />
                        </div>
                      )}

                      {/* Info Overlay Panel */}
                      <div className="absolute inset-x-0 bottom-0 p-3 sm:p-4">
                        <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md p-4 rounded-2xl shadow-lg border border-slate-100 dark:border-slate-700">
                          <p className="text-[#003B5C] dark:text-blue-400 font-black uppercase tracking-wider text-[10px] sm:text-xs mb-1">
                            {teacher.position || 'Administrator'}
                          </p>
                          <h3 className="font-black text-lg sm:text-xl text-slate-900 dark:text-white leading-tight">
                            {teacher.title ? `${teacher.title} ` : ''}{teacher.first_name} {teacher.last_name}
                          </h3>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </section>

          {/* 2. Teaching Body Section */}
          <section className="space-y-8 sm:space-y-10 pt-10 sm:pt-16 border-t border-slate-200/80 dark:border-slate-800">
            <div className="text-center space-y-2 max-w-2xl mx-auto">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 text-[10px] sm:text-xs font-black uppercase tracking-wider border border-emerald-200/50 dark:border-emerald-900/40">
                <GraduationCap className="w-3.5 h-3.5" />
                <span>Academic Staff</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                Teaching Faculty
              </h2>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                {[1, 2, 3, 4].map(i => <Skeleton key={i} className="aspect-square w-full rounded-3xl" />)}
              </div>
            ) : teachingStaff.length === 0 ? (
              <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-3xl border border-dashed border-slate-300 dark:border-slate-700">
                <p className="text-sm text-slate-500">Teaching staff list to be updated.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                {teachingStaff.map((teacher) => (
                  <Card key={teacher.id} className="overflow-hidden rounded-3xl border border-slate-200/80 dark:border-slate-700/80 shadow-xs hover:shadow-md transition-all duration-300 group">
                    <div className="aspect-square relative bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      {teacher.image_url ? (
                        <Image 
                          src={teacher.image_url} 
                          alt={`${teacher.first_name} ${teacher.last_name}`}
                          fill
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                          className="object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <GraduationCap className="w-16 h-16 text-slate-300 dark:text-slate-600" />
                        </div>
                      )}
                      
                      {/* Top Right Position Badge */}
                      {teacher.position && (
                        <div className="absolute top-3 right-3">
                          <Badge className="bg-white/95 dark:bg-slate-900/95 text-slate-800 dark:text-slate-200 border-none shadow-sm backdrop-blur-md text-[10px] font-bold px-2 py-1 uppercase tracking-wider">
                            {teacher.position}
                          </Badge>
                        </div>
                      )}
                    </div>
                    <CardContent className="p-4 sm:p-5 text-center bg-white dark:bg-slate-800 relative">
                      <div className="absolute -top-5 left-1/2 -translate-x-1/2">
                        <div className="w-10 h-10 bg-[#003B5C] text-amber-400 rounded-xl shadow-sm border-[3px] border-white dark:border-slate-800 flex items-center justify-center">
                          <CheckCircle2 className="w-4 h-4" />
                        </div>
                      </div>
                      <div className="pt-4 space-y-1">
                        <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white line-clamp-1">
                          {teacher.title ? `${teacher.title} ` : ''}{teacher.first_name} {teacher.last_name}
                        </h3>
                        <p className="text-xs font-semibold text-[#003B5C] dark:text-blue-400 truncate">
                          {teacher.specialization || 'Class Educator'}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </section>

          {/* 3. School Prefects Section */}
          <section className="space-y-8 sm:space-y-10 pt-10 sm:pt-16 border-t border-slate-200/80 dark:border-slate-800">
            <div className="text-center space-y-2 max-w-2xl mx-auto">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 text-[10px] sm:text-xs font-black uppercase tracking-wider border border-amber-200/50 dark:border-amber-900/40">
                <Crown className="w-3.5 h-3.5" />
                <span>Student Leadership</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                School Prefects
              </h2>
            </div>

            {loading ? (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                {[1, 2, 3, 4].map(i => <Skeleton key={i} className="aspect-[3/4] w-full rounded-3xl" />)}
              </div>
            ) : prefects.length === 0 ? (
              <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-3xl border border-dashed border-slate-300 dark:border-slate-700">
                <p className="text-sm text-slate-500">Student leadership list will be updated soon.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                {prefects.map((prefect) => (
                  <div key={prefect.id} className="group relative overflow-hidden rounded-2xl sm:rounded-3xl bg-slate-100 dark:bg-slate-800 shadow-xs border border-slate-200/80 dark:border-slate-700/80 aspect-[3/4]">
                    {prefect.image_url ? (
                      <Image 
                        src={prefect.image_url} 
                        alt={prefect.name}
                        fill
                        sizes="(max-width: 1024px) 50vw, 25vw"
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-slate-300 dark:text-slate-600">
                        <User className="w-12 h-12 mb-2" />
                      </div>
                    )}
                    
                    {/* Gradient Overlay & Text */}
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/20 to-transparent opacity-80" />
                    
                    <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-5 text-left transform translate-y-1 group-hover:translate-y-0 transition-transform">
                      <p className="text-[10px] sm:text-xs font-black text-amber-400 uppercase tracking-wider mb-1 drop-shadow-sm">
                        {prefect.position}
                      </p>
                      <h3 className="text-sm sm:text-base font-bold text-white leading-tight line-clamp-2">
                        {prefect.name}
                      </h3>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* 4. Community Leadership (PTA & SMC) */}
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-8 sm:gap-10 pt-10 sm:pt-16 border-t border-slate-200/80 dark:border-slate-800">
            
            {/* PTA Section */}
            <div className="space-y-6">
              <div className="flex items-center gap-3 pb-2 border-b border-slate-200/60 dark:border-slate-800">
                <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">PTA Executives</h2>
                  <p className="text-[11px] sm:text-xs font-bold text-slate-500 uppercase tracking-widest">Parent Teacher Association</p>
                </div>
              </div>

              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full rounded-2xl" />)}
                </div>
              ) : ptaMembers.length === 0 ? (
                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-6 text-center border border-dashed border-slate-200 dark:border-slate-700">
                  <p className="text-xs text-slate-500">PTA Executive list pending update.</p>
                </div>
              ) : (
                <div className="space-y-3 sm:space-y-4">
                  {ptaMembers.map((member) => (
                    <div key={member.id} className="flex items-center gap-3 sm:gap-4 bg-white dark:bg-slate-800/90 p-3 sm:p-4 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-700/80 shadow-xs">
                      <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-full overflow-hidden bg-slate-100 dark:bg-slate-800 shrink-0 relative border border-slate-200 dark:border-slate-700">
                        {member.image_url ? (
                          <Image src={member.image_url} alt={member.name} fill className="object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-300 dark:text-slate-600">
                            <User className="w-5 h-5 sm:w-6 sm:h-6" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white truncate">{member.name}</h3>
                        <p className="text-xs font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider mt-0.5 truncate">{member.role}</p>
                        {member.contact && (
                          <div className="flex items-center gap-1.5 mt-1.5 text-[11px] text-slate-500 font-mono">
                            <PhoneCall className="w-3 h-3 text-slate-400" />
                            {member.contact}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* SMC Section */}
            <div className="space-y-6">
              <div className="flex items-center gap-3 pb-2 border-b border-slate-200/60 dark:border-slate-800">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">SMC Members</h2>
                  <p className="text-[11px] sm:text-xs font-bold text-slate-500 uppercase tracking-widest">School Management Committee</p>
                </div>
              </div>

              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full rounded-2xl" />)}
                </div>
              ) : smcMembers.length === 0 ? (
                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-6 text-center border border-dashed border-slate-200 dark:border-slate-700">
                  <p className="text-xs text-slate-500">SMC list pending update.</p>
                </div>
              ) : (
                <div className="space-y-3 sm:space-y-4">
                  {smcMembers.map((member) => (
                    <div key={member.id} className="flex items-center gap-3 sm:gap-4 bg-white dark:bg-slate-800/90 p-3 sm:p-4 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-700/80 shadow-xs">
                      <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-full overflow-hidden bg-slate-100 dark:bg-slate-800 shrink-0 relative border border-slate-200 dark:border-slate-700">
                        {member.image_url ? (
                          <Image src={member.image_url} alt={member.name} fill className="object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-300 dark:text-slate-600">
                            <User className="w-5 h-5 sm:w-6 sm:h-6" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white truncate">{member.name}</h3>
                        <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mt-0.5 truncate">{member.role}</p>
                        {member.contact && (
                          <div className="flex items-center gap-1.5 mt-1.5 text-[11px] text-slate-500 font-mono">
                            <PhoneCall className="w-3 h-3 text-slate-400" />
                            {member.contact}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </section>

        </div>
      </main>

      <PortalFooter />
    </div>
  )
}