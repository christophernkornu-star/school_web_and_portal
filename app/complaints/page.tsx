'use client'

import { useState } from 'react'
import Link from 'next/link'
import { submitComplaint } from '@/app/actions/complaints'
import SiteHeader from '@/components/SiteHeader'
import { PortalFooter } from '@/components/PortalFooter'
import { 
  AlertCircle, 
  CheckCircle2, 
  Send, 
  MessageSquare, 
  ShieldCheck, 
  Phone, 
  Mail, 
  MapPin, 
  User, 
  Tag, 
  ArrowRight, 
  Loader2, 
  Clock,
  HelpCircle,
  ChevronDown
} from 'lucide-react'

export default function ComplaintsPage() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(formData: FormData) {
    setIsSubmitting(true)
    setError('')
    
    try {
      const result = await submitComplaint(formData)
      if (result.success) {
        setSubmitted(true)
      } else {
        setError(result.error || 'Something went wrong. Please try again.')
      }
    } catch (e) {
      setError('An unexpected error occurred. Please check your connection and try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

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
              <MessageSquare className="w-3.5 h-3.5 text-amber-400" />
              <span>Feedback &amp; Public Relations</span>
            </div>

            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight leading-tight text-white">
              Complaints &amp; Suggestions
            </h1>

            <p className="text-sm sm:text-base md:text-lg text-blue-100/90 max-w-2xl mx-auto font-medium leading-relaxed">
              We value transparent communication with parents, students, and community partners to continually improve Biriwa Methodist &apos;C&apos; Basic School.
            </p>
          </div>
        </section>

        {/* Main Content Area */}
        <section className="max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 py-8 sm:py-12 md:py-16">
          {submitted ? (
            /* Success Feedback State */
            <div className="max-w-2xl mx-auto bg-white dark:bg-slate-800/95 rounded-3xl shadow-xl border border-slate-200/80 dark:border-slate-700/80 p-6 sm:p-10 text-center space-y-6 animate-in zoom-in-95 duration-200">
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 rounded-3xl flex items-center justify-center mx-auto shadow-inner ring-8 ring-emerald-500/10">
                <CheckCircle2 className="w-8 h-8 sm:w-10 sm:h-10" />
              </div>

              <div className="space-y-2">
                <span className="text-[11px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400 font-mono">
                  Submission Logged
                </span>
                <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                  Thank You for Your Feedback
                </h2>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 max-w-md mx-auto leading-relaxed">
                  Your entry has been securely delivered to the School Management Committee and Headteacher&apos;s administration desk for prompt review.
                </p>
              </div>

              {/* Action SLA Note */}
              <div className="bg-slate-50 dark:bg-slate-900/60 rounded-2xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-750 text-left space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-amber-500" /> Resolution Workflow
                </h3>
                <div className="space-y-2 text-xs text-slate-600 dark:text-slate-300 font-medium">
                  <p>• Entries are treated with confidentiality in accordance with institutional child protection and ethics guidelines.</p>
                  <p>• If contact credentials were provided, our administrative desk may reach out within 48 to 72 business hours for follow-up.</p>
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
                  onClick={() => setSubmitted(false)}
                  className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-3.5 text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 rounded-xl transition"
                >
                  Submit Another Feedback
                </button>
              </div>
            </div>
          ) : (
            /* Form and Context Grid */
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              
              {/* Form Column */}
              <div className="lg:col-span-8 bg-white dark:bg-slate-800/95 rounded-2xl sm:rounded-3xl shadow-sm border border-slate-200/80 dark:border-slate-700/80 p-5 sm:p-8 md:p-10 space-y-6 sm:space-y-8">
                
                <div className="border-b border-slate-100 dark:border-slate-750 pb-4">
                  <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                    Submit Your Feedback
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                    Provide detailed feedback to help us address matters effectively. Contact information is entirely optional if you prefer anonymity.
                  </p>
                </div>

                {error && (
                  <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200/80 dark:border-rose-900/60 rounded-2xl p-3.5 flex items-start gap-2.5 text-rose-700 dark:text-rose-300 text-xs sm:text-sm font-medium animate-in fade-in duration-150">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <p className="leading-snug">{error}</p>
                  </div>
                )}

                <form action={handleSubmit} className="space-y-6">
                  
                  {/* Feedback Primary Details */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
                    
                    {/* Feedback Type */}
                    <div className="space-y-1.5">
                      <label htmlFor="type" className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                        Feedback Type <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <select
                          name="type"
                          id="type"
                          required
                          defaultValue="complaint"
                          className="w-full pl-3.5 pr-9 py-2.5 sm:py-3 text-base sm:text-sm font-medium border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50/50 dark:bg-slate-900/50 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-[#003B5C] dark:focus:ring-blue-500 appearance-none cursor-pointer"
                        >
                          <option value="complaint">Complaint / Grievance</option>
                          <option value="suggestion">General Suggestion</option>
                          <option value="academic">Academic / Teaching Feedback</option>
                          <option value="facility">Infrastructure &amp; Welfare</option>
                        </select>
                        <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      </div>
                    </div>

                    {/* Subject */}
                    <div className="space-y-1.5">
                      <label htmlFor="subject" className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                        Subject Summary <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <Tag className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                          type="text"
                          name="subject"
                          id="subject"
                          required
                          placeholder="Brief headline of the issue"
                          className="w-full pl-10 pr-4 py-2.5 sm:py-3 text-base sm:text-sm font-medium border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50/50 dark:bg-slate-900/50 text-slate-900 dark:text-white placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-[#003B5C] dark:focus:ring-blue-500 transition-all"
                        />
                      </div>
                    </div>

                    {/* Message Body */}
                    <div className="sm:col-span-2 space-y-1.5">
                      <label htmlFor="message" className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                        Detailed Description <span className="text-rose-500">*</span>
                      </label>
                      <textarea
                        name="message"
                        id="message"
                        required
                        rows={5}
                        placeholder="Please describe the context, dates, individuals involved, or constructive suggestions in detail..."
                        className="w-full px-3.5 py-2.5 sm:py-3 text-base sm:text-sm font-medium border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50/50 dark:bg-slate-900/50 text-slate-900 dark:text-white placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-[#003B5C] dark:focus:ring-blue-500 transition-all resize-none"
                      />
                    </div>
                  </div>

                  {/* Optional Contact Information */}
                  <div className="space-y-4 pt-2 border-t border-slate-100 dark:border-slate-750">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-2">
                        <User className="w-4 h-4 text-[#003B5C] dark:text-blue-400" />
                        <span>Contact Information</span>
                      </h3>
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                        Optional
                      </span>
                    </div>

                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                      Leave blank if you prefer this submission to be anonymous. If you desire direct administrative follow-up, provide your credentials:
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
                      {/* Name */}
                      <div className="space-y-1.5">
                        <label htmlFor="contact_name" className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                          Full Name
                        </label>
                        <div className="relative">
                          <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                          <input
                            type="text"
                            name="contact_name"
                            id="contact_name"
                            placeholder="Your full name"
                            className="w-full pl-10 pr-4 py-2.5 sm:py-3 text-base sm:text-sm font-medium border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50/50 dark:bg-slate-900/50 text-slate-900 dark:text-white placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-[#003B5C] dark:focus:ring-blue-500 transition-all"
                          />
                        </div>
                      </div>

                      {/* Phone */}
                      <div className="space-y-1.5">
                        <label htmlFor="contact_phone" className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                          Phone Number
                        </label>
                        <div className="relative">
                          <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                          <input
                            type="tel"
                            name="contact_phone"
                            id="contact_phone"
                            placeholder="024 393 0752"
                            className="w-full pl-10 pr-4 py-2.5 sm:py-3 text-base sm:text-sm font-medium font-mono border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50/50 dark:bg-slate-900/50 text-slate-900 dark:text-white placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-[#003B5C] dark:focus:ring-blue-500 transition-all"
                          />
                        </div>
                      </div>

                      {/* Email */}
                      <div className="sm:col-span-2 space-y-1.5">
                        <label htmlFor="contact_email" className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                          Email Address
                        </label>
                        <div className="relative">
                          <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                          <input
                            type="email"
                            name="contact_email"
                            id="contact_email"
                            placeholder="name@example.com"
                            className="w-full pl-10 pr-4 py-2.5 sm:py-3 text-base sm:text-sm font-medium border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50/50 dark:bg-slate-900/50 text-slate-900 dark:text-white placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-[#003B5C] dark:focus:ring-blue-500 transition-all"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Submission Row */}
                  <div className="pt-4 border-t border-slate-100 dark:border-slate-750 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <p className="text-[11px] text-slate-400 text-center sm:text-left">
                      Every submission is registered securely into the institutional feedback logs.
                    </p>

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-[#003B5C] hover:bg-[#002a42] text-white font-bold text-xs sm:text-sm px-8 py-3.5 rounded-xl shadow-md hover:shadow-lg transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Delivering Feedback...</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          <span>Submit Feedback</span>
                        </>
                      )}
                    </button>
                  </div>

                </form>
              </div>

              {/* Right Column: Policies & Contacts Sidebar */}
              <div className="lg:col-span-4 space-y-5">
                
                {/* Confidentiality Commitment */}
                <div className="bg-white dark:bg-slate-800/90 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-700/80 p-5 sm:p-6 shadow-xs space-y-3.5">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                      Confidentiality &amp; Protection
                    </h3>
                  </div>

                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    Biriwa Methodist &apos;C&apos; adheres strictly to Ghana Education Service guidelines on student welfare and whistleblower protection:
                  </p>

                  <div className="space-y-2 text-xs text-slate-700 dark:text-slate-300">
                    <div className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0 mt-1.5" />
                      <span>Anonymous submissions receive the same scrutiny and consideration as identified entries.</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0 mt-1.5" />
                      <span>Protection from victimization for students or parents raising legitimate grievances.</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0 mt-1.5" />
                      <span>Periodic reviews presented during School Management Committee meetings.</span>
                    </div>
                  </div>
                </div>

                {/* Direct Enquiries Card */}
                <div className="bg-gradient-to-br from-[#003B5C] to-slate-900 text-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-md border border-white/10 space-y-4">
                  <div className="space-y-1">
                    <span className="text-[10px] font-black uppercase tracking-widest text-amber-300">
                      Urgent Matters
                    </span>
                    <h3 className="text-base font-bold text-white tracking-tight">
                      Headteacher&apos;s Desk
                    </h3>
                  </div>

                  <p className="text-xs text-blue-100/90 leading-relaxed">
                    For emergency welfare concerns, immediate safety matters, or in-person dialogue:
                  </p>

                  <div className="space-y-2 text-xs text-blue-100 font-medium">
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span>+233 24 393 0752</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span>complaints@biriwamethodist.edu.gh</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span>Main Administration Block, Biriwa</span>
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