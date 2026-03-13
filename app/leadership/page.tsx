'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { GraduationCap, Award, Users, Mail, User, ArrowLeft } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'
import { Skeleton } from '@/components/ui/skeleton'

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
      // Fetching all active teachers, sorting by display_rank primarily
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
      // Match head teachers, principals, and assistants
      return pos.includes('head') || pos.includes('principal') || pos.includes('assistant');
  });

  const teachingStaff = teachers.filter(t => !adminStaff.includes(t));

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        
       {/* Hero Section */}
       <div className="bg-gradient-to-r from-blue-900 to-blue-800 text-white py-16 relative">
          <div className="absolute top-4 left-4 md:top-8 md:left-8 z-10">
            <button 
              onClick={() => router.back()} 
              className="flex items-center gap-2 text-white/80 hover:text-white transition-colors bg-white/10 hover:bg-white/20 px-4 py-2 rounded-full backdrop-blur-sm"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="font-medium">Back</span>
            </button>
          </div>
          <div className="container mx-auto px-4 text-center space-y-4">
             <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-white mb-4">Our Leadership</h1>
             <p className="text-xl text-blue-100 max-w-2xl mx-auto">
                Meet the dedicated staff and student leaders guiding Biriwa Methodist 'C' Basic School towards excellence.
             </p>
          </div>
       </div>

      <div className="container mx-auto px-4 py-12 space-y-16">

        {/* 1. School Administration Section */}
        <section className="space-y-8">
            <div className="text-center space-y-4 max-w-2xl mx-auto">
                <Badge variant="secondary" className="px-4 py-1.5 text-sm uppercase tracking-widest bg-blue-900 text-white border-blue-800">
                    Administration
                </Badge>
                <h2 className="text-3xl font-bold text-gray-900 dark:text-white">School Administration</h2>
                <div className="h-1 w-20 bg-blue-600 mx-auto rounded-full"></div>
                <p className="text-gray-500 dark:text-gray-400">
                    Guiding our vision and ensuring academic excellence.
                </p>
            </div>

            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 justify-center">
                    {[1,2,3].map(i => <Skeleton key={i} className="h-96 w-full rounded-2xl" />)}
                </div>
            ) : adminStaff.length === 0 ? (
                <div className="text-center py-12">
                   <p className="text-gray-500">Administration details to be updated.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 justify-center max-w-5xl mx-auto">
                     {adminStaff.map((teacher) => (
                         <Card key={teacher.id} className="overflow-hidden border-none shadow-xl hover:shadow-2xl transition-all duration-300 bg-white dark:bg-gray-800 group transform hover:-translate-y-1">
                            <div className="aspect-[4/5] relative bg-blue-50 dark:bg-blue-900/20 overflow-hidden">
                                {teacher.image_url ? (
                                    <Image 
                                        src={teacher.image_url} 
                                        alt={`${teacher.first_name} ${teacher.last_name}`}
                                        fill
                                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-blue-200 dark:text-blue-800">
                                        <User className="w-32 h-32 opacity-20" />
                                    </div>
                                )}
                                {/* Rank/Position Badge Overlay */}
                                {teacher.position && (
                                    <div className="absolute bottom-4 left-4 right-4">
                                        <div className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm p-4 rounded-xl shadow-lg border-l-4 border-blue-600">
                                            <p className="text-blue-600 dark:text-blue-400 font-bold uppercase tracking-wide text-xs mb-1">
                                                {teacher.position}
                                            </p>
                                            <h3 className="font-bold text-lg text-gray-900 dark:text-white leading-tight">
                                                {teacher.title ? `${teacher.title} ` : ''}{teacher.first_name} {teacher.last_name}
                                            </h3>
                                        </div>
                                    </div>
                                )}
                            </div>
                         </Card>
                     ))}
                </div>
            )}
        </section>

        {/* 2. Teaching Body Section */}
        <section className="space-y-8 pt-8 border-t border-gray-200 dark:border-gray-800">
             <div className="text-center space-y-4 max-w-2xl mx-auto">
                <Badge variant="secondary" className="px-4 py-1.5 text-sm uppercase tracking-widest bg-blue-100 text-blue-800 border-blue-200">
                    Academic Staff
                </Badge>
                <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Teaching Body</h2>
                <div className="h-1 w-20 bg-blue-600 mx-auto rounded-full"></div>
                <p className="text-gray-500 dark:text-gray-400">
                    Our committed educators shaping the future of our students.
                </p>
            </div>

            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {[1,2,3,4].map(i => <Skeleton key={i} className="h-80 w-full rounded-2xl" />)}
                </div>
            ) : teachingStaff.length === 0 ? (
                <div className="text-center py-12">
                   <p className="text-gray-500">Teaching staff list to be updated.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
                     {teachingStaff.map((teacher) => (
                         <Card key={teacher.id} className="overflow-hidden border-none shadow-lg hover:shadow-xl transition-shadow bg-white dark:bg-gray-800 group">
                            <div className="aspect-square relative bg-blue-50 dark:bg-blue-900/20 overflow-hidden">
                                {teacher.image_url ? (
                                    <Image 
                                        src={teacher.image_url} 
                                        alt={`${teacher.first_name} ${teacher.last_name}`}
                                        fill
                                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-blue-200 dark:text-blue-800">
                                        <GraduationCap className="w-24 h-24 opacity-20" />
                                    </div>
                                )}
                                {teacher.position && (
                                    <div className="absolute top-0 right-0 p-3">
                                        <Badge className="bg-blue-900/90 hover:bg-blue-900 text-white border-none shadow-sm backdrop-blur-sm">
                                            {teacher.position}
                                        </Badge>
                                    </div>
                                )}
                            </div>
                            <CardContent className="p-6 text-center space-y-2 relative">
                                <div className="absolute -top-5 left-1/2 transform -translate-x-1/2">
                                     <div className="bg-blue-600 text-white p-2 rounded-full shadow-lg ring-4 ring-white dark:ring-gray-800">
                                        <Award className="w-5 h-5" />
                                     </div>
                                </div>
                                <div className="pt-3">
                                    <h3 className="font-bold text-lg text-gray-900 dark:text-white">
                                        {teacher.title ? `${teacher.title} ` : ''}{teacher.first_name} {teacher.last_name}
                                    </h3>
                                    <p className="text-blue-600 dark:text-blue-400 font-medium text-sm">
                                        {teacher.specialization || 'General Education'}
                                    </p>
                                </div>
                            </CardContent>
                         </Card>
                     ))}
                </div>
            )}
        </section>
        
        {/* 3. School Prefects Section */}
        <section className="space-y-8 pt-8 border-t border-gray-200 dark:border-gray-800">
            <div className="text-center space-y-4 max-w-2xl mx-auto">
                <Badge variant="secondary" className="px-4 py-1.5 text-sm uppercase tracking-widest bg-yellow-100 text-yellow-800 border-yellow-200">
                    Student Administration
                </Badge>
                <h2 className="text-3xl font-bold text-gray-900 dark:text-white">School Prefects</h2>
                <div className="h-1 w-20 bg-yellow-500 mx-auto rounded-full"></div>
                <p className="text-gray-500 dark:text-gray-400">
                    Exemplary students chosen to lead by example and maintain discipline.
                </p>
            </div>

            {loading ? (
                 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                     {[1,2,3,4].map(i => <Skeleton key={i} className="aspect-[3/4] w-full rounded-2xl" />)}
                 </div>
            ) : prefects.length === 0 ? (
                <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-dashed border-gray-200 dark:border-gray-700">
                    <User className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">Student leadership list will be updated soon.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                    {prefects.map((prefect) => (
                        <div key={prefect.id} className="group relative">
                            <div className="aspect-[3/4] overflow-hidden rounded-2xl bg-gray-200 dark:bg-gray-800 shadow-md border-[6px] border-white dark:border-gray-800 group-hover:border-yellow-500/20 transition-all duration-300 relative">
                                 {prefect.image_url ? (
                                    <Image 
                                        src={prefect.image_url} 
                                        alt={prefect.name}
                                        fill
                                        className="object-cover transition-transform duration-500 group-hover:scale-110"
                                    />
                                 ) : (
                                    <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 bg-gray-100 dark:bg-gray-800">
                                        <User className="w-20 h-20 mb-2 opacity-20" />
                                        <span className="text-xs font-semibold opacity-40">NO PHOTO</span>
                                    </div>
                                 )}
                                 
                                 {/* Overlay Gradient */}
                                 <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-60 group-hover:opacity-80 transition-opacity" />
                                 
                                 <div className="absolute bottom-0 left-0 right-0 p-6 text-white transform translate-y-2 group-hover:translate-y-0 transition-transform">
                                    <p className="text-xs font-bold text-yellow-400 uppercase tracking-wider mb-1">
                                        {prefect.position}
                                    </p>
                                    <h3 className="text-xl font-bold leading-tight">
                                        {prefect.name}
                                    </h3>
                                 </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </section>

        {/* Community Leadership (PTA & SMC) */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-8 border-t border-gray-200 dark:border-gray-800">
            {/* PTA Section */}
            <div className="space-y-6">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                        <Users className="w-6 h-6 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">PTA Executives</h2>
                        <p className="text-sm text-gray-500">Parent Teacher Association Leadership</p>
                    </div>
                </div>

                {loading ? (
                    <div className="space-y-4">
                        {[1,2,3].map(i => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
                    </div>
                ) : ptaMembers.length === 0 ? (
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-8 text-center border border-dashed border-gray-200 dark:border-gray-700">
                        <Users className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                        <p className="text-gray-500 text-sm">PTA Executive list pending update.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {ptaMembers.map((member) => (
                             <div key={member.id} className="flex items-center gap-4 bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-shadow">
                                <div className="h-16 w-16 rounded-full overflow-hidden bg-gray-100 flex-shrink-0 relative">
                                    {member.image_url ? (
                                        <Image src={member.image_url} alt={member.name} fill className="object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-gray-300">
                                            <User className="h-8 w-8" />
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-bold text-gray-900 dark:text-white truncate">{member.name}</h3>
                                    <p className="text-green-600 dark:text-green-400 text-sm font-medium">{member.role}</p>
                                    {member.contact && (
                                        <div className="flex items-center gap-1.5 mt-1 text-xs text-gray-500">
                                            <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
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
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                        <Users className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">SMC Members</h2>
                        <p className="text-sm text-gray-500">School Management Committee</p>
                    </div>
                </div>

                {loading ? (
                    <div className="space-y-4">
                        {[1,2,3].map(i => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
                    </div>
                ) : smcMembers.length === 0 ? (
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-8 text-center border border-dashed border-gray-200 dark:border-gray-700">
                        <Users className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                        <p className="text-gray-500 text-sm">SMC list pending update.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {smcMembers.map((member) => (
                             <div key={member.id} className="flex items-center gap-4 bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-shadow">
                                <div className="h-16 w-16 rounded-full overflow-hidden bg-gray-100 flex-shrink-0 relative">
                                    {member.image_url ? (
                                        <Image src={member.image_url} alt={member.name} fill className="object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-gray-300">
                                            <User className="h-8 w-8" />
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-bold text-gray-900 dark:text-white truncate">{member.name}</h3>
                                    <p className="text-purple-600 dark:text-purple-400 text-sm font-medium">{member.role}</p>
                                    {member.contact && (
                                        <div className="flex items-center gap-1.5 mt-1 text-xs text-gray-500">
                                            <div className="w-1.5 h-1.5 rounded-full bg-purple-500"></div>
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
    </div>
  )
}
