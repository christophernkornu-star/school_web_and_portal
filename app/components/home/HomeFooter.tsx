import { supabaseAdmin } from '@/lib/supabase-admin'
import Link from 'next/link'
import Image from 'next/image'
import { 
  MapPin, 
  Phone, 
  Mail, 
  Clock, 
  GraduationCap, 
  ShieldCheck, 
  ChevronRight,
  ArrowUpRight
} from 'lucide-react'

export default async function HomeFooter() {
  const { data: schoolSettings } = await supabaseAdmin
    .from('school_settings')
    .select('school_hours')
    .single()
  
  const schoolHours = schoolSettings?.school_hours || 'Monday - Friday:\n7:30 AM - 3:00 PM'

  const quickLinks = [
    { href: '/', label: 'Home' },
    { href: '/about', label: 'About Us' },
    { href: '/leadership', label: 'Leadership' },
    { href: '/admission', label: 'Admissions' },
    { href: '/events', label: 'School Calendar' },
    { href: '/gallery', label: 'Photo Gallery' },
    { href: '/complaints', label: 'Helpdesk & Complaints' },
  ]

  const portals = [
    { href: '/login?portal=student', label: 'Student Portal', role: 'Learner Access' },
    { href: '/login?portal=teacher', label: 'Teacher Portal', role: 'Staff & Assessment' },
    { href: '/login?portal=admin', label: 'Administration', role: 'Management & Records' },
  ]

  return (
    <footer className="bg-gradient-to-b from-[#003B5C] via-[#002a42] to-slate-950 text-white border-t border-white/10 selection:bg-amber-400 selection:text-[#003B5C]">
      {/* Ghana Flag Decorative Stripe */}
      <div className="h-1 w-full bg-gradient-to-r from-red-600 via-amber-400 to-emerald-600" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-8 sm:pt-16 sm:pb-12 space-y-10 sm:space-y-14">
        
        {/* Main Footer Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-8 sm:gap-10 lg:gap-8">
          
          {/* Brand & Identity Column (12 on mobile, 6 on tablet, 4 on desktop) */}
          <div className="sm:col-span-2 lg:col-span-4 space-y-4 sm:space-y-5">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="w-11 h-11 sm:w-12 sm:h-12 bg-white rounded-2xl p-1.5 shadow-md flex items-center justify-center shrink-0 ring-2 ring-white/20 group-hover:ring-amber-400/50 transition-all">
                <Image
                  src="/school_crest.png"
                  alt="Biriwa Methodist 'C' Crest"
                  width={44}
                  height={44}
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm sm:text-base font-black text-white tracking-tight leading-snug">
                  Biriwa Methodist &apos;C&apos;
                </h3>
                <p className="text-[11px] font-bold text-amber-300 uppercase tracking-wider">
                  Basic School
                </p>
              </div>
            </Link>

            <p className="text-xs sm:text-sm text-blue-100/80 leading-relaxed max-w-sm">
              Carved out of the historic Biriwa Methodist educational cluster in 2011 to deliver accessible, high-standard primary and junior high basic education along the Central Coast of Ghana.
            </p>

            <div className="inline-block px-3 py-1.5 rounded-xl bg-white/10 border border-white/10 backdrop-blur-md">
              <p className="text-[11px] font-black text-amber-300 uppercase tracking-widest">
                &ldquo;Discipline with Hardwork&rdquo;
              </p>
            </div>
          </div>

          {/* Quick Navigation Links (6 on tablet, 2 on desktop) */}
          <div className="space-y-3 sm:space-y-4 lg:col-span-2">
            <h4 className="text-xs font-black uppercase tracking-widest text-amber-400">
              Quick Links
            </h4>
            <ul className="space-y-2">
              {quickLinks.map((link) => (
                <li key={link.href}>
                  <Link 
                    href={link.href}
                    className="text-xs sm:text-sm text-blue-100/80 hover:text-white flex items-center gap-1.5 transition-colors group"
                  >
                    <ChevronRight className="w-3.5 h-3.5 text-amber-400/70 group-hover:text-amber-400 group-hover:translate-x-0.5 transition-all" />
                    <span>{link.label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Institutional Portals Column (6 on tablet, 3 on desktop) */}
          <div className="space-y-3 sm:space-y-4 lg:col-span-3">
            <h4 className="text-xs font-black uppercase tracking-widest text-amber-400">
              Academic Portals
            </h4>
            <div className="space-y-2.5">
              {portals.map((portal) => (
                <Link
                  key={portal.href}
                  href={portal.href}
                  className="block p-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-amber-400/40 transition-all group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <GraduationCap className="w-4 h-4 text-amber-400" />
                      <span className="text-xs font-bold text-white group-hover:text-amber-300 transition-colors">
                        {portal.label}
                      </span>
                    </div>
                    <ArrowUpRight className="w-3.5 h-3.5 text-blue-200 group-hover:text-white group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
                  </div>
                  <p className="text-[10px] text-blue-200/70 pl-6 mt-0.5">
                    {portal.role}
                  </p>
                </Link>
              ))}
            </div>
          </div>

          {/* Contact & Hours Column (6 on tablet, 3 on desktop) */}
          <div className="space-y-4 lg:col-span-3">
            <h4 className="text-xs font-black uppercase tracking-widest text-amber-400">
              Campus &amp; Hours
            </h4>

            <div className="space-y-3 text-xs sm:text-sm text-blue-100/80">
              <div className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span>Biriwa (200m off Gulf of Guinea), Central Region, Ghana</span>
              </div>

              <div className="flex items-center gap-2.5">
                <Phone className="w-4 h-4 text-amber-400 shrink-0" />
                <a href="tel:+233243930752" className="hover:text-white transition-colors">
                  +233 24 393 0752
                </a>
              </div>

              <div className="flex items-center gap-2.5">
                <Mail className="w-4 h-4 text-amber-400 shrink-0" />
                <a href="mailto:info@biriwamethodist.edu.gh" className="hover:text-white transition-colors truncate">
                  info@biriwamethodist.edu.gh
                </a>
              </div>
            </div>

            {/* School Hours Box */}
            <div className="p-3 sm:p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-1.5">
              <div className="flex items-center gap-2 text-amber-300 text-xs font-bold">
                <Clock className="w-3.5 h-3.5" />
                <span>Instructional Hours</span>
              </div>
              <p className="text-[11px] text-blue-100/90 whitespace-pre-line leading-relaxed pl-5">
                {schoolHours}
              </p>
            </div>
          </div>

        </div>

        {/* Bottom Legal / Affiliation Bar */}
        <div className="pt-6 sm:pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left text-xs text-blue-200/70">
          <p>
            &copy; {new Date().getFullYear()} Biriwa Methodist &apos;C&apos; Basic School. All rights reserved.
          </p>

          <div className="flex items-center gap-2 text-[11px] text-blue-200/60 flex-wrap justify-center">
            <span>Accredited by Ghana Education Service</span>
            <span>&bull;</span>
            <span>Methodist Church Ghana Educational Unit</span>
          </div>
        </div>

      </div>
    </footer>
  )
}