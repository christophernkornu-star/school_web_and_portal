'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { 
  Send, 
  CheckCircle2, 
  User, 
  Building2, 
  Phone, 
  Mail, 
  MapPin, 
  GraduationCap, 
  FileText, 
  ShieldCheck, 
  ArrowRight, 
  Loader2, 
  ChevronDown,
  Clock
} from 'lucide-react'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'
import SiteHeader from '@/components/SiteHeader'
import { PortalFooter } from '@/components/PortalFooter'
import { toast } from 'react-hot-toast'

interface SchoolClass {
  id: string
  name: string
}

export default function AdmissionPage() {
  const supabase = getSupabaseBrowserClient()
  const [classes, setClasses] = useState<SchoolClass[]>([])
  const [classesLoading, setClassesLoading] = useState(true)
  const [formData, setFormData] = useState({
    applicant_name: '',
    date_of_birth: '',
    gender: '',
    parent_name: '',
    parent_phone: '',
    parent_email: '',
    address: '',
    previous_school: '',
    class_applying_for: '',
  })
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    async function loadClasses() {
      try {
        const { data } = await supabase
          .from('classes')
          .select('id, name')
          .order('name')
        
        if (data) {
          const sorted = [...data].sort((a: any, b: any) => {
            const aNum = parseInt(a.name.replace(/\D/g, '')) || 0
            const bNum = parseInt(b.name.replace(/\D/g, '')) || 0
            if (aNum !== bNum) return aNum - bNum
            return a.name.localeCompare(b.name)
          })
          setClasses(sorted)
        }
      } catch (err) {
        console.error('Failed to fetch class cohorts:', err)
      } finally {
        setClassesLoading(false)
      }
    }
    loadClasses()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.applicant_name.trim() || !formData.date_of_birth || !formData.gender || !formData.class_applying_for) {
      toast.error('Please complete all mandatory learner fields')
      return
    }

    if (!formData.parent_name.trim() || !formData.parent_phone.trim() || !formData.address.trim()) {
      toast.error('Please complete all mandatory parent/guardian fields')
      return
    }

    setLoading(true)

    try {
      const { error } = await supabase
        .from('admission_applications')
        .insert([{
          applicant_name: formData.applicant_name.trim(),
          date_of_birth: formData.date_of_birth,
          gender: formData.gender,
          parent_name: formData.parent_name.trim(),
          parent_phone: formData.parent_phone.trim(),
          parent_email: formData.parent_email.trim() || null,
          address: formData.address.trim(),
          previous_school: formData.previous_school.trim() || null,
          class_applying_for: formData.class_applying_for,
          status: 'pending'
        }])

      if (error) {
        if (error.message.includes('does not exist') || error.code === '42P01') {
          toast.error('Online portal admissions are undergoing maintenance. Please visit the school directly.')
        } else {
          toast.error(error.message || 'Error submitting application')
        }
      } else {
        setSubmitted(true)
        toast.success('Application submitted successfully!')
      }
    } catch (err) {
      console.error('Submission error:', err)
      toast.error('Connection timeout. Please verify your internet and retry.')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const selectedClassName = classes.find(c => c.id === formData.class_applying_for)?.name || 'Specified Class'

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-900 font-sans text-slate-900 dark:text-slate-100 flex flex-col transition-colors selection:bg-[#003B5C] selection:text-white">
      <SiteHeader />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden bg-gradient-to-r from-[#003B5C] via-[#002a42] to-slate-900 text-white py-12 sm:py-16 md:py-20 border-b border-white/10">
          <div className="absolute top-0 right-0 -mt-16 -mr-16 h-72 w-72 sm:h-96 sm:w-96 rounded-full bg-blue-500/20 blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 -mb-16 -ml-16 h-72 w-72 sm:h-96 sm:w-96 rounded-full bg-amber-500/20 blur-3xl pointer-events-none" />

          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10 space-y-3 sm:space-y-4">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-amber-300 text-xs sm:text-sm font-black uppercase tracking-widest shadow-inner">
              <GraduationCap className="w-3.5 h-3.5 text-amber-400" />
              <span>Enrolment &amp; Admissions</span>
            </div>

            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight leading-tight text-white">
              Apply for Admission
            </h1>

            <p className="text-sm sm:text-base md:text-lg text-blue-100/90 max-w-2xl mx-auto font-medium leading-relaxed">
              Begin your child&apos;s educational journey at Biriwa Methodist &apos;C&apos; Basic School. We nurture academic rigor, moral integrity, and lifelong discipline.
            </p>
          </div>
        </section>

        {/* Form & Guidance Container */}
        <section className="max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 py-8 sm:py-12 md:py-16">
          {submitted ? (
            <div className="max-w-2xl mx-auto bg-white dark:bg-slate-800/95 rounded-3xl shadow-xl border border-slate-200/80 dark:border-slate-700/80 p-6 sm:p-10 text-center space-y-6 animate-in zoom-in-95 duration-200">
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 rounded-3xl flex items-center justify-center mx-auto shadow-inner ring-8 ring-emerald-500/10">
                <CheckCircle2 className="w-8 h-8 sm:w-10 sm:h-10" />
              </div>

              <div className="space-y-2">
                <span className="text-[11px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400 font-mono">
                  Application Received
                </span>
                <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                  Submission Successful!
                </h2>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 max-w-md mx-auto leading-relaxed">
                  Thank you for applying for <strong>{formData.applicant_name}</strong> into <strong>{selectedClassName}</strong> at Biriwa Methodist &apos;C&apos; Basic School.
                </p>
              </div>

              <div className="bg-slate-50 dark:bg-slate-900/60 rounded-2xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-750 text-left space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-amber-500" /> Next Enrolment Steps
                </h3>
                <div className="space-y-2.5 text-xs text-slate-600 dark:text-slate-300 font-medium">
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-[#003B5C] text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">1</span>
                    <span>Administrative review of student details and cohort capacity.</span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-[#003B5C] text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">2</span>
                    <span>An SMS notification or direct call will be placed to <strong>{formData.parent_phone}</strong> within 3 business days.</span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-[#003B5C] text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">3</span>
                    <span>In-person verification of birth certificates, health records, and former school terminal reports.</span>
                  </div>
                </div>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                <Link
                  href="/"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-[#003B5C] hover:bg-[#002a42] text-white font-bold text-xs sm:text-sm px-6 py-3.5 rounded-xl shadow-md transition active:scale-95"
                >
                  <span>Return to Homepage</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    setSubmitted(false)
                    setFormData({
                      applicant_name: '',
                      date_of_birth: '',
                      gender: '',
                      parent_name: '',
                      parent_phone: '',
                      parent_email: '',
                      address: '',
                      previous_school: '',
                      class_applying_for: '',
                    })
                  }}
                  className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-3.5 text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 rounded-xl transition"
                >
                  Submit Another Application
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Form Column */}
              <div className="lg:col-span-8 bg-white dark:bg-slate-800/95 rounded-2xl sm:rounded-3xl shadow-sm border border-slate-200/80 dark:border-slate-700/80 p-5 sm:p-8 md:p-10 space-y-6 sm:space-y-8">
                <div className="border-b border-slate-100 dark:border-slate-750 pb-4">
                  <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                    Official Enrolment Application
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                    Fill in the prospective learner and guardian details accurately. Fields marked with (<span className="text-rose-500">*</span>) are mandatory.
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-8">
                  {/* Section 1: Learner Details */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 pb-1 border-b border-slate-100 dark:border-slate-800">
                      <GraduationCap className="w-4 h-4 text-[#003B5C] dark:text-blue-400" />
                      <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                        Learner Information
                      </h3>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
                      <div className="sm:col-span-2 space-y-1.5">
                        <label htmlFor="applicant_name" className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                          Full Legal Name <span className="text-rose-500">*</span>
                        </label>
                        <div className="relative">
                          <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                          <input
                            id="applicant_name"
                            name="applicant_name"
                            type="text"
                            required
                            placeholder="e.g. Kwesi Mensah Osei"
                            value={formData.applicant_name}
                            onChange={handleChange}
                            className="w-full pl-10 pr-4 py-2.5 sm:py-3 text-base sm:text-sm font-medium border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50/50 dark:bg-slate-900/50 text-slate-900 dark:text-white placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-[#003B5C] dark:focus:ring-blue-500 transition-all"
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label htmlFor="date_of_birth" className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                          Date of Birth <span className="text-rose-500">*</span>
                        </label>
                        <input
                          id="date_of_birth"
                          name="date_of_birth"
                          type="date"
                          required
                          value={formData.date_of_birth}
                          onChange={handleChange}
                          className="w-full px-3.5 py-2.5 sm:py-3 text-base sm:text-sm font-medium border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50/50 dark:bg-slate-900/50 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-[#003B5C] dark:focus:ring-blue-500 transition-all"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label htmlFor="gender" className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                          Gender <span className="text-rose-500">*</span>
                        </label>
                        <div className="relative">
                          <select
                            id="gender"
                            name="gender"
                            required
                            value={formData.gender}
                            onChange={handleChange}
                            className="w-full pl-3.5 pr-9 py-2.5 sm:py-3 text-base sm:text-sm font-medium border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50/50 dark:bg-slate-900/50 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-[#003B5C] dark:focus:ring-blue-500 appearance-none cursor-pointer"
                          >
                            <option value="">Select gender</option>
                            <option value="Male">Male</option>
                            <option value="Female">Female</option>
                          </select>
                          <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label htmlFor="class_applying_for" className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                          Class Applying For <span className="text-rose-500">*</span>
                        </label>
                        <div className="relative">
                          <select
                            id="class_applying_for"
                            name="class_applying_for"
                            required
                            disabled={classesLoading}
                            value={formData.class_applying_for}
                            onChange={handleChange}
                            className="w-full pl-3.5 pr-9 py-2.5 sm:py-3 text-base sm:text-sm font-medium border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50/50 dark:bg-slate-900/50 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-[#003B5C] dark:focus:ring-blue-500 appearance-none cursor-pointer disabled:opacity-50"
                          >
                            <option value="">{classesLoading ? 'Loading classes...' : 'Select entry class'}</option>
                            {classes.map((cls) => (
                              <option key={cls.id} value={cls.id}>
                                {cls.name}
                              </option>
                            ))}
                          </select>
                          <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label htmlFor="previous_school" className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                          Previous School <span className="text-slate-400 font-normal">(Optional)</span>
                        </label>
                        <div className="relative">
                          <Building2 className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                          <input
                            id="previous_school"
                            name="previous_school"
                            type="text"
                            placeholder="Name of last school attended"
                            value={formData.previous_school}
                            onChange={handleChange}
                            className="w-full pl-10 pr-4 py-2.5 sm:py-3 text-base sm:text-sm font-medium border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50/50 dark:bg-slate-900/50 text-slate-900 dark:text-white placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-[#003B5C] dark:focus:ring-blue-500 transition-all"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Section 2: Guardian Details */}
                  <div className="space-y-4 pt-2">
                    <div className="flex items-center gap-2 pb-1 border-b border-slate-100 dark:border-slate-800">
                      <ShieldCheck className="w-4 h-4 text-[#003B5C] dark:text-blue-400" />
                      <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                        Parent / Legal Guardian
                      </h3>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
                      <div className="sm:col-span-2 space-y-1.5">
                        <label htmlFor="parent_name" className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                          Guardian Full Name <span className="text-rose-500">*</span>
                        </label>
                        <div className="relative">
                          <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                          <input
                            id="parent_name"
                            name="parent_name"
                            type="text"
                            required
                            placeholder="e.g. Mr. Emmanuel Osei"
                            value={formData.parent_name}
                            onChange={handleChange}
                            className="w-full pl-10 pr-4 py-2.5 sm:py-3 text-base sm:text-sm font-medium border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50/50 dark:bg-slate-900/50 text-slate-900 dark:text-white placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-[#003B5C] dark:focus:ring-blue-500 transition-all"
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label htmlFor="parent_phone" className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                          Active Mobile Phone <span className="text-rose-500">*</span>
                        </label>
                        <div className="relative">
                          <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                          <input
                            id="parent_phone"
                            name="parent_phone"
                            type="tel"
                            required
                            placeholder="e.g. 024 393 0752"
                            value={formData.parent_phone}
                            onChange={handleChange}
                            className="w-full pl-10 pr-4 py-2.5 sm:py-3 text-base sm:text-sm font-medium font-mono border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50/50 dark:bg-slate-900/50 text-slate-900 dark:text-white placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-[#003B5C] dark:focus:ring-blue-500 transition-all"
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label htmlFor="parent_email" className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                          Email Address <span className="text-slate-400 font-normal">(Optional)</span>
                        </label>
                        <div className="relative">
                          <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                          <input
                            id="parent_email"
                            name="parent_email"
                            type="email"
                            placeholder="parent@example.com"
                            value={formData.parent_email}
                            onChange={handleChange}
                            className="w-full pl-10 pr-4 py-2.5 sm:py-3 text-base sm:text-sm font-medium border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50/50 dark:bg-slate-900/50 text-slate-900 dark:text-white placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-[#003B5C] dark:focus:ring-blue-500 transition-all"
                          />
                        </div>
                      </div>

                      <div className="sm:col-span-2 space-y-1.5">
                        <label htmlFor="address" className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                          Residential Address / Town <span className="text-rose-500">*</span>
                        </label>
                        <div className="relative">
                          <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
                          <textarea
                            id="address"
                            name="address"
                            required
                            rows={3}
                            placeholder="e.g. Near Methodist Church, Biriwa, Central Region"
                            value={formData.address}
                            onChange={handleChange}
                            className="w-full pl-10 pr-4 py-2.5 sm:py-3 text-base sm:text-sm font-medium border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50/50 dark:bg-slate-900/50 text-slate-900 dark:text-white placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-[#003B5C] dark:focus:ring-blue-500 resize-none transition-all"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Submission Row */}
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-750 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <p className="text-[11px] text-slate-400 text-center sm:text-left">
                      By submitting, you confirm that all information provided is accurate according to GES standards.
                    </p>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-[#003B5C] hover:bg-[#002a42] text-white font-bold text-xs sm:text-sm px-8 py-3.5 rounded-xl shadow-md hover:shadow-lg transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Submitting...</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          <span>Submit Application</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>

              {/* Right Column: Policies & Requirements */}
              <div className="lg:col-span-4 space-y-5">
                <div className="bg-white dark:bg-slate-800/90 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-700/80 p-5 sm:p-6 shadow-xs space-y-4">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-amber-500" />
                    <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                      Required Documents
                    </h3>
                  </div>

                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    Please prepare the following hardcopy documents for verification when invited for physical registration:
                  </p>

                  <div className="space-y-2.5 divide-y divide-slate-100 dark:divide-slate-750 text-xs">
                    <div className="pt-2 first:pt-0 flex items-start gap-2 text-slate-700 dark:text-slate-300">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0 mt-1.5" />
                      <span>Original &amp; photocopy of Birth Certificate or Weighing Card</span>
                    </div>
                    <div className="pt-2 flex items-start gap-2 text-slate-700 dark:text-slate-300">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0 mt-1.5" />
                      <span>Two (2) recent passport-sized photographs of the learner</span>
                    </div>
                    <div className="pt-2 flex items-start gap-2 text-slate-700 dark:text-slate-300">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0 mt-1.5" />
                      <span>Cumulative record card / terminal report from previous school (if transferring)</span>
                    </div>
                    <div className="pt-2 flex items-start gap-2 text-slate-700 dark:text-slate-300">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0 mt-1.5" />
                      <span>Valid national photo ID of parent or legal guardian</span>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-[#003B5C] to-slate-900 text-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-md border border-white/10 space-y-4">
                  <div className="space-y-1">
                    <span className="text-[10px] font-black uppercase tracking-widest text-amber-300">
                      Need Assistance?
                    </span>
                    <h3 className="text-base font-bold text-white tracking-tight">
                      Admissions Desk
                    </h3>
                  </div>

                  <p className="text-xs text-blue-100/90 leading-relaxed">
                    If you prefer physical registration or have inquiries regarding class openings:
                  </p>

                  <div className="space-y-2 text-xs text-blue-100 font-medium">
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span>+233 24 393 0752</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span>admissions@biriwamethodist.edu.gh</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span>Biriwa, Central Region, Ghana</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>
      </main>

      <PortalFooter />
    </div>
  )
}