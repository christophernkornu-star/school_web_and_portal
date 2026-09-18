'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  Bell, 
  Save, 
  Mail, 
  MessageSquare, 
  KeyRound, 
  Server, 
  ShieldCheck, 
  Eye, 
  EyeOff, 
  Loader2, 
  Info,
  CheckCircle2,
  Calendar,
  GraduationCap,
  DollarSign,
  Megaphone,
  Smartphone,
  Sliders
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import BackButton from '@/components/ui/back-button'
import { Skeleton } from '@/components/ui/skeleton'
import { getCurrentUser } from '@/lib/auth'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'
import { PortalFooter } from '@/components/PortalFooter'

export default function NotificationSettings() {
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [settingsId, setSettingsId] = useState<string>('')
  
  // Sensitive visibility states
  const [showEmailPassword, setShowEmailPassword] = useState(false)
  const [showSmsApiKey, setShowSmsApiKey] = useState(false)

  const [formData, setFormData] = useState({
    email_enabled: true,
    sms_enabled: false,
    email_host: '',
    email_port: '',
    email_username: '',
    email_password: '',
    sms_api_key: '',
    sms_sender_id: '',
    notify_attendance: true,
    notify_results: true,
    notify_fees: true,
    notify_announcements: true,
  })

  useEffect(() => {
    async function loadSettings() {
      const user = await getCurrentUser()
      if (!user) {
        router.push('/login?portal=admin')
        return
      }

      const { data, error } = await supabase
        .from('notification_settings')
        .select('*')
        .maybeSingle() as { data: any; error: any }

      if (data) {
        setSettingsId(data.id)
        setFormData({
          email_enabled: data.email_enabled ?? true,
          sms_enabled: data.sms_enabled ?? false,
          email_host: data.email_host || '',
          email_port: data.email_port?.toString() || '',
          email_username: data.email_username || '',
          email_password: data.email_password || '',
          sms_api_key: data.sms_api_key || '',
          sms_sender_id: data.sms_sender_id || '',
          notify_attendance: data.notify_attendance ?? true,
          notify_results: data.notify_results ?? true,
          notify_fees: data.notify_fees ?? true,
          notify_announcements: data.notify_announcements ?? true,
        })
      }

      setLoading(false)
    }
    loadSettings()
  }, [router, supabase])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      const user = await getCurrentUser()
      
      const payload = {
        ...formData,
        email_port: formData.email_port ? parseInt(formData.email_port) : null,
        updated_at: new Date().toISOString(),
        updated_by: user?.id,
      }

      let error

      if (settingsId) {
        const res = await supabase
          .from('notification_settings')
          .update(payload)
          .eq('id', settingsId)
        error = res.error
      } else {
        const res = await supabase
          .from('notification_settings')
          .insert(payload)
        error = res.error
      }

      if (error) {
        toast.error('Failed to update settings: ' + error.message)
      } else {
        toast.success('Notification channels updated successfully!')
        router.push('/admin/settings')
      }
    } catch (error: any) {
      console.error('Error updating settings:', error)
      toast.error('Failed to update notification settings. Please check your network.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <NotificationSkeleton />
  }

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-900 font-sans text-slate-900 dark:text-slate-100 flex flex-col transition-colors selection:bg-[#003B5C] selection:text-white">
      
      {/* Sticky Top Header */}
      <header className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div className="max-w-4xl mx-auto px-3.5 sm:px-6 lg:px-8 py-3 sm:py-3.5">
          <div className="flex items-center justify-between gap-3">
            
            <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
              <BackButton href="/admin/settings" />
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-4 bg-amber-400 rounded-full shrink-0" />
                  <h1 className="text-base sm:text-xl font-black text-slate-900 dark:text-white tracking-tight truncate">
                    Notification &amp; SMS Dispatch
                  </h1>
                </div>
                <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium truncate mt-0.5">
                  Configure SMTP server, bulk SMS telecommunication gateway, and automated alerts
                </p>
              </div>
            </div>

            {/* Desktop / Tablet Save Action */}
            <div className="hidden sm:flex items-center gap-2 shrink-0">
              <Link
                href="/admin/settings"
                className="px-3.5 py-2 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition"
              >
                Cancel
              </Link>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={saving}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-[#003B5C] hover:bg-[#002a42] text-white rounded-xl text-xs sm:text-sm font-bold shadow-xs hover:shadow transition active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                {saving ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
                ) : (
                  <Save className="w-3.5 h-3.5 text-amber-400" />
                )}
                <span>{saving ? 'Updating...' : 'Save Settings'}</span>
              </button>
            </div>

          </div>
        </div>
      </header>

      {/* Main Form Workspace */}
      <main className="flex-1 max-w-4xl mx-auto w-full px-3.5 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8 space-y-4 sm:space-y-6 pb-28 sm:pb-12">
        
        {/* Informational Guidance Callout */}
        <div className="bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200/70 dark:border-blue-900/50 rounded-2xl p-3.5 sm:p-4.5 flex items-start gap-3 text-xs text-blue-900 dark:text-blue-200 shadow-2xs">
          <ShieldCheck className="w-5 h-5 text-[#003B5C] dark:text-blue-400 shrink-0 mt-0.5" />
          <div className="space-y-1 leading-relaxed">
            <h2 className="font-bold text-xs sm:text-sm text-[#003B5C] dark:text-blue-300">
              Automated Dispatches &amp; Privacy Safeguards
            </h2>
            <p className="text-[11px] sm:text-xs opacity-90">
              Notification channels deliver real-time messages to guardians regarding student attendance logs, terminal report cards, and fee receipts. All credentials stored here are securely handled on the backend.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
          
          {/* Section 1: Email Configuration */}
          <section className="bg-white dark:bg-slate-800/90 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-700/80 p-4 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#003B5C]/10 dark:bg-blue-500/20 text-[#003B5C] dark:text-blue-300 flex items-center justify-center shrink-0">
                  <Mail className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white">
                    1. Email Gateway (SMTP Server)
                  </h3>
                  <p className="text-[11px] text-slate-400">Institutional email service parameters</p>
                </div>
              </div>

              {/* Master Email Toggle */}
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <span className="text-xs font-bold text-slate-600 dark:text-slate-300 hidden xs:inline">
                  {formData.email_enabled ? 'Enabled' : 'Disabled'}
                </span>
                <input
                  type="checkbox"
                  checked={formData.email_enabled}
                  onChange={(e) => setFormData({ ...formData, email_enabled: e.target.checked })}
                  className="w-4 h-4 rounded text-[#003B5C] focus:ring-[#003B5C] border-slate-300 dark:border-slate-700 cursor-pointer"
                />
              </label>
            </div>

            {formData.email_enabled ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4.5 pt-1">
                
                {/* SMTP Host */}
                <div className="space-y-1.5">
                  <label className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                    SMTP Host Server <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Server className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      required={formData.email_enabled}
                      value={formData.email_host}
                      onChange={(e) => setFormData({ ...formData, email_host: e.target.value })}
                      placeholder="e.g. smtp.gmail.com or mail.school.edu.gh"
                      className="w-full pl-10 pr-3.5 py-2.5 text-base sm:text-sm font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-[#003B5C] transition placeholder:text-slate-400"
                    />
                  </div>
                </div>

                {/* SMTP Port */}
                <div className="space-y-1.5">
                  <label className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                    Port Number <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    required={formData.email_enabled}
                    value={formData.email_port}
                    onChange={(e) => setFormData({ ...formData, email_port: e.target.value })}
                    placeholder="e.g. 587 or 465"
                    className="w-full px-3.5 py-2.5 text-base sm:text-sm font-semibold font-mono rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-[#003B5C] transition placeholder:font-sans placeholder:text-slate-400"
                  />
                </div>

                {/* Email Username / From Address */}
                <div className="space-y-1.5">
                  <label className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                    Account Username / Address <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="email"
                    required={formData.email_enabled}
                    value={formData.email_username}
                    onChange={(e) => setFormData({ ...formData, email_username: e.target.value })}
                    placeholder="noreply@biriwams.edu.gh"
                    className="w-full px-3.5 py-2.5 text-base sm:text-sm font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-[#003B5C] transition placeholder:text-slate-400"
                  />
                </div>

                {/* Email App Password */}
                <div className="space-y-1.5">
                  <label className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                    App Password / Secret <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <KeyRound className="w-4 h-4" />
                    </div>
                    <input
                      type={showEmailPassword ? 'text' : 'password'}
                      required={formData.email_enabled}
                      value={formData.email_password}
                      onChange={(e) => setFormData({ ...formData, email_password: e.target.value })}
                      placeholder="••••••••••••"
                      className="w-full pl-10 pr-10 py-2.5 text-base sm:text-sm font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-[#003B5C] transition placeholder:text-slate-400"
                    />
                    <button
                      type="button"
                      onClick={() => setShowEmailPassword(!showEmailPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5"
                      aria-label={showEmailPassword ? 'Hide password' : 'Show password'}
                    >
                      {showEmailPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

              </div>
            ) : (
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
                Email delivery is deactivated. Enable the channel switch above to activate SMTP dispatches.
              </div>
            )}
          </section>

          {/* Section 2: SMS Gateway Configuration */}
          <section className="bg-white dark:bg-slate-800/90 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-700/80 p-4 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                  <Smartphone className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white">
                    2. SMS Telecommunications Gateway
                  </h3>
                  <p className="text-[11px] text-slate-400">Bulk SMS integration for Ghanaian telco networks</p>
                </div>
              </div>

              {/* Master SMS Toggle */}
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <span className="text-xs font-bold text-slate-600 dark:text-slate-300 hidden xs:inline">
                  {formData.sms_enabled ? 'Enabled' : 'Disabled'}
                </span>
                <input
                  type="checkbox"
                  checked={formData.sms_enabled}
                  onChange={(e) => setFormData({ ...formData, sms_enabled: e.target.checked })}
                  className="w-4 h-4 rounded text-[#003B5C] focus:ring-[#003B5C] border-slate-300 dark:border-slate-700 cursor-pointer"
                />
              </label>
            </div>

            {formData.sms_enabled ? (
              <div className="space-y-3.5 pt-1">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4.5">
                  
                  {/* SMS API Key */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                      Gateway API Key <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <KeyRound className="w-4 h-4" />
                      </div>
                      <input
                        type={showSmsApiKey ? 'text' : 'password'}
                        required={formData.sms_enabled}
                        value={formData.sms_api_key}
                        onChange={(e) => setFormData({ ...formData, sms_api_key: e.target.value })}
                        placeholder="e.g. api_sec_xxxxxxxxxxxx"
                        className="w-full pl-10 pr-10 py-2.5 text-base sm:text-sm font-semibold font-mono rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-[#003B5C] transition placeholder:font-sans placeholder:text-slate-400"
                      />
                      <button
                        type="button"
                        onClick={() => setShowSmsApiKey(!showSmsApiKey)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5"
                        aria-label={showSmsApiKey ? 'Hide key' : 'Show key'}
                      >
                        {showSmsApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Sender ID */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                        Registered Sender ID <span className="text-rose-500">*</span>
                      </label>
                      <span className="text-[10px] text-slate-400 font-mono">Max 11 chars</span>
                    </div>
                    <input
                      type="text"
                      maxLength={11}
                      required={formData.sms_enabled}
                      value={formData.sms_sender_id}
                      onChange={(e) => setFormData({ ...formData, sms_sender_id: e.target.value.toUpperCase() })}
                      placeholder="e.g. BIRIWA-SCH"
                      className="w-full px-3.5 py-2.5 text-base sm:text-sm font-semibold font-mono uppercase rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-[#003B5C] transition placeholder:font-sans placeholder:text-slate-400"
                    />
                  </div>

                </div>

                <div className="p-3 bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/70 dark:border-amber-900/50 rounded-xl text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2">
                  <Info className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <p className="leading-relaxed text-[11px] sm:text-xs">
                    Sender IDs must not exceed 11 alphanumeric characters to comply with NCA regulations across MTN, Telecel, and AT Ghana networks.
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
                SMS dispatching is inactive. Enable the switch above to connect your bulk SMS provider.
              </div>
            )}
          </section>

          {/* Section 3: Notification Event Triggers */}
          <section className="bg-white dark:bg-slate-800/90 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-700/80 p-4 sm:p-6 shadow-xs space-y-4">
            <div className="border-b border-slate-100 dark:border-slate-800 pb-3 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <Sliders className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white">
                    3. Automated Trigger Events
                  </h3>
                  <p className="text-[11px] text-slate-400">Choose when the system dispatches messages</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              
              {/* Trigger 1: Attendance */}
              <label className="flex items-start justify-between p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 bg-slate-50/50 dark:bg-slate-900/40 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition cursor-pointer select-none gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-[#003B5C] dark:text-blue-400 shrink-0 mt-0.5">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white leading-tight">
                      Daily Attendance Roll
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                      Instant alerts when a student is recorded absent during morning roll call
                    </p>
                  </div>
                </div>

                <input
                  type="checkbox"
                  checked={formData.notify_attendance}
                  onChange={(e) => setFormData({ ...formData, notify_attendance: e.target.checked })}
                  className="w-4 h-4 rounded text-[#003B5C] focus:ring-[#003B5C] border-slate-300 dark:border-slate-700 cursor-pointer shrink-0 mt-1"
                />
              </label>

              {/* Trigger 2: Results */}
              <label className="flex items-start justify-between p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 bg-slate-50/50 dark:bg-slate-900/40 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition cursor-pointer select-none gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 shrink-0 mt-0.5">
                    <GraduationCap className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white leading-tight">
                      Terminal Results Broadsheet
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                      Notify parents once end-of-term continuous assessment scores are published
                    </p>
                  </div>
                </div>

                <input
                  type="checkbox"
                  checked={formData.notify_results}
                  onChange={(e) => setFormData({ ...formData, notify_results: e.target.checked })}
                  className="w-4 h-4 rounded text-[#003B5C] focus:ring-[#003B5C] border-slate-300 dark:border-slate-700 cursor-pointer shrink-0 mt-1"
                />
              </label>

              {/* Trigger 3: Fees */}
              <label className="flex items-start justify-between p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 bg-slate-50/50 dark:bg-slate-900/40 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition cursor-pointer select-none gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5">
                    <DollarSign className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white leading-tight">
                      Fee Invoices &amp; Receipts
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                      Send payment confirmations, outstanding arrears, and term billing notices
                    </p>
                  </div>
                </div>

                <input
                  type="checkbox"
                  checked={formData.notify_fees}
                  onChange={(e) => setFormData({ ...formData, notify_fees: e.target.checked })}
                  className="w-4 h-4 rounded text-[#003B5C] focus:ring-[#003B5C] border-slate-300 dark:border-slate-700 cursor-pointer shrink-0 mt-1"
                />
              </label>

              {/* Trigger 4: Announcements */}
              <label className="flex items-start justify-between p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 bg-slate-50/50 dark:bg-slate-900/40 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition cursor-pointer select-none gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5">
                    <Megaphone className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white leading-tight">
                      Broadcast Announcements
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                      Urgent school circulars, PTA meeting notices, and holiday alerts
                    </p>
                  </div>
                </div>

                <input
                  type="checkbox"
                  checked={formData.notify_announcements}
                  onChange={(e) => setFormData({ ...formData, notify_announcements: e.target.checked })}
                  className="w-4 h-4 rounded text-[#003B5C] focus:ring-[#003B5C] border-slate-300 dark:border-slate-700 cursor-pointer shrink-0 mt-1"
                />
              </label>

            </div>
          </section>

          {/* Action Row for Tablet/Desktop */}
          <div className="hidden sm:flex items-center justify-end gap-3 pt-2">
            <Link
              href="/admin/settings"
              className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs sm:text-sm font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition text-center"
            >
              Cancel
            </Link>

            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-[#003B5C] hover:bg-[#002a42] text-white rounded-xl text-xs sm:text-sm font-bold shadow-md hover:shadow-lg transition active:scale-[0.98] disabled:opacity-50 cursor-pointer"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                  <span>Saving Dispatch Settings...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 text-amber-400" />
                  <span>Save Configuration</span>
                </>
              )}
            </button>
          </div>

        </form>
      </main>

      {/* Floating Sticky Mobile Bottom Action Bar */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200/80 dark:border-slate-800 p-3 shadow-xl">
        <div className="flex items-center justify-between gap-3">
          <Link
            href="/admin/settings"
            className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold text-center"
          >
            Cancel
          </Link>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#003B5C] hover:bg-[#002a42] text-white rounded-xl text-xs font-bold shadow-xs active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
            ) : (
              <Save className="w-4 h-4 text-amber-400" />
            )}
            <span>{saving ? 'Saving...' : 'Save Settings'}</span>
          </button>
        </div>
      </div>

      <PortalFooter />
    </div>
  )
}

function NotificationSkeleton() {
  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-900 flex flex-col font-sans">
      <header className="sticky top-0 z-30 bg-white dark:bg-slate-900 border-b border-slate-200/80 dark:border-slate-800">
        <div className="max-w-4xl mx-auto px-3.5 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Skeleton className="w-8 h-8 rounded-xl" />
            <Skeleton className="h-6 w-48 rounded-md" />
          </div>
          <Skeleton className="h-9 w-28 rounded-xl hidden sm:block" />
        </div>
      </header>

      <main className="max-w-4xl mx-auto w-full px-3.5 sm:px-6 lg:px-8 py-6 space-y-5 flex-1">
        <Skeleton className="h-20 w-full rounded-2xl" />
        <Skeleton className="h-56 w-full rounded-2xl sm:rounded-3xl" />
        <Skeleton className="h-44 w-full rounded-2xl sm:rounded-3xl" />
        <Skeleton className="h-56 w-full rounded-2xl sm:rounded-3xl" />
      </main>

      <PortalFooter />
    </div>
  )
}