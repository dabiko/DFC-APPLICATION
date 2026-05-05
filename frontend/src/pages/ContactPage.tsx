import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Mail,
  Phone,
  MapPin,
  MessageSquare,
  Clock,
  Send,
  CheckCircle2,
  Building2,
  Headphones,
  Briefcase,
  Newspaper,
  Handshake,
  ShieldCheck,
  Globe,
  ArrowRight,
  ChevronDown,
  Loader2,
  AlertCircle,
  Sparkles,
  Linkedin,
  Twitter,
  Github,
  Calendar,
  Users,
} from 'lucide-react'
import { useTheme } from '../hooks/useTheme'
import LandingHeader from '../components/Landing/LandingHeader'
import Footer from '../components/Landing/Footer'

type Inquiry = 'sales' | 'support' | 'demo' | 'partnership' | 'press' | 'security'

interface InquiryOption {
  id: Inquiry
  label: string
  description: string
  icon: React.ReactNode
  accent: string
  email: string
  sla: string
}

const INQUIRY_OPTIONS: InquiryOption[] = [
  {
    id: 'sales',
    label: 'Sales & Pricing',
    description: 'Custom quotes, volume discounts, procurement.',
    icon: <Briefcase className="w-5 h-5" />,
    accent: 'from-blue-500 to-cyan-500',
    email: 'sales@dabitech.com',
    sla: '< 4 business hours',
  },
  {
    id: 'support',
    label: 'Customer Support',
    description: 'Bugs, account help, billing issues.',
    icon: <Headphones className="w-5 h-5" />,
    accent: 'from-emerald-500 to-teal-500',
    email: 'support@dabitech.com',
    sla: '< 1 hour (P1) · < 24h standard',
  },
  {
    id: 'demo',
    label: 'Book a Live Demo',
    description: '30-min walkthrough tailored to your industry.',
    icon: <Calendar className="w-5 h-5" />,
    accent: 'from-violet-500 to-fuchsia-500',
    email: 'demo@dabitech.com',
    sla: 'Same-day scheduling',
  },
  {
    id: 'partnership',
    label: 'Partnerships',
    description: 'Resellers, system integrators, technology alliances.',
    icon: <Handshake className="w-5 h-5" />,
    accent: 'from-indigo-500 to-purple-500',
    email: 'partners@dabitech.com',
    sla: '< 3 business days',
  },
  {
    id: 'press',
    label: 'Press & Media',
    description: 'Press kit, interviews, analyst briefings.',
    icon: <Newspaper className="w-5 h-5" />,
    accent: 'from-amber-500 to-orange-500',
    email: 'press@dabitech.com',
    sla: '< 2 business days',
  },
  {
    id: 'security',
    label: 'Security & Compliance',
    description: 'Vulnerability disclosure, SOC2, audit reports.',
    icon: <ShieldCheck className="w-5 h-5" />,
    accent: 'from-red-500 to-rose-500',
    email: 'security@dabitech.com',
    sla: '< 24h (acknowledgement)',
  },
]

const COMPANY_SIZES = [
  '1–10 employees',
  '11–50 employees',
  '51–200 employees',
  '201–1,000 employees',
  '1,001–5,000 employees',
  '5,000+ employees',
]

interface FormState {
  inquiry: Inquiry
  firstName: string
  lastName: string
  email: string
  company: string
  jobTitle: string
  phone: string
  companySize: string
  country: string
  message: string
  agreedToPolicy: boolean
  subscribed: boolean
}

const INITIAL_FORM: FormState = {
  inquiry: 'sales',
  firstName: '',
  lastName: '',
  email: '',
  company: '',
  jobTitle: '',
  phone: '',
  companySize: '',
  country: '',
  message: '',
  agreedToPolicy: false,
  subscribed: true,
}

const ContactPage: React.FC = () => {
  const navigate = useNavigate()
  const { theme, setTheme } = useTheme()
  const [form, setForm] = useState<FormState>(INITIAL_FORM)
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({})
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle')
  const [openFaq, setOpenFaq] = useState<number | null>(0)

  const cycleTheme = () => {
    if (theme === 'light') setTheme('dark')
    else if (theme === 'dark') setTheme('system')
    else setTheme('light')
  }

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((f) => ({ ...f, [key]: value }))
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }))
  }

  const validate = (): boolean => {
    const e: Partial<Record<keyof FormState, string>> = {}
    if (!form.firstName.trim()) e.firstName = 'Required'
    if (!form.lastName.trim()) e.lastName = 'Required'
    if (!form.email.trim()) e.email = 'Required'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Enter a valid email'
    if (!form.company.trim()) e.company = 'Required'
    if (!form.message.trim()) e.message = 'Tell us a bit about what you need'
    else if (form.message.trim().length < 20)
      e.message = 'A few more details help us route you (20+ chars)'
    if (!form.agreedToPolicy) e.agreedToPolicy = 'You must accept the privacy policy to continue'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault()
    if (!validate()) return
    setStatus('submitting')
    try {
      // Simulated submission. Wire to a real endpoint when the backend route exists.
      await new Promise((resolve) => setTimeout(resolve, 1100))
      setStatus('success')
    } catch {
      setStatus('error')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-950 transition-colors duration-300">
      <LandingHeader theme={theme} onToggleTheme={cycleTheme} onNavigate={navigate} />

      <main>
        <ContactHero />

        <InquiryGrid selected={form.inquiry} onSelect={(id) => update('inquiry', id)} />

        <section className="py-16 sm:py-24 bg-gray-50 dark:bg-gray-900/50">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto grid lg:grid-cols-12 gap-10">
              <div className="lg:col-span-7">
                {status === 'success' ? (
                  <SuccessCard
                    onAnother={() => {
                      setForm(INITIAL_FORM)
                      setStatus('idle')
                    }}
                  />
                ) : (
                  <ContactForm
                    form={form}
                    errors={errors}
                    status={status}
                    onUpdate={update}
                    onSubmit={handleSubmit}
                  />
                )}
              </div>
              <div className="lg:col-span-5 space-y-6">
                <DirectChannelsCard selected={form.inquiry} />
                <ResponseSLACard />
                <SocialCard />
              </div>
            </div>
          </div>
        </section>

        <OfficesSection />

        <FAQSection openFaq={openFaq} setOpenFaq={setOpenFaq} />

        <CTABanner onNavigate={navigate} />
      </main>

      <Footer onNavigate={navigate} />
    </div>
  )
}

/* ============================================================
 *  HERO
 * ============================================================ */
const ContactHero: React.FC = () => (
  <section className="relative pt-32 sm:pt-40 pb-12 sm:pb-16 overflow-hidden">
    <div className="absolute inset-0 -z-10">
      <div className="absolute top-20 left-1/3 w-96 h-96 bg-blue-400/20 dark:bg-blue-500/15 rounded-full blur-3xl animate-pulse" />
      <div
        className="absolute top-32 right-1/3 w-96 h-96 bg-purple-400/20 dark:bg-purple-500/15 rounded-full blur-3xl animate-pulse"
        style={{ animationDelay: '1.2s' }}
      />
    </div>

    <div className="container mx-auto px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto text-center">
        <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-purple-600 px-4 py-2 rounded-full mb-6 shadow-lg">
          <Sparkles className="w-4 h-4 text-white" />
          <span className="text-sm font-semibold text-white tracking-wide">
            WE'D LOVE TO HEAR FROM YOU
          </span>
        </div>

        <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-gray-900 dark:text-white mb-6 leading-tight">
          Talk to a{' '}
          <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 dark:from-blue-400 dark:via-purple-400 dark:to-pink-400 bg-clip-text text-transparent">
            real human
          </span>
        </h1>

        <p className="text-lg sm:text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto leading-relaxed">
          Whether you're scoping a rollout, pricing a custom plan, or reporting an incident — pick a
          lane below and we'll route you to the right person within hours, not days.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-gray-600 dark:text-gray-400">
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-green-500" /> Avg. first reply: 2h 14m
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-green-500" /> 24/7 P1 incident line
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-green-500" /> 6 offices · 12 languages
          </span>
        </div>
      </div>
    </div>
  </section>
)

/* ============================================================
 *  INQUIRY GRID
 * ============================================================ */
const InquiryGrid: React.FC<{ selected: Inquiry; onSelect: (id: Inquiry) => void }> = ({
  selected,
  onSelect,
}) => (
  <section className="py-12 sm:py-16">
    <div className="container mx-auto px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <p className="text-center text-xs uppercase tracking-widest text-gray-500 dark:text-gray-400 font-semibold mb-6">
          What can we help with?
        </p>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {INQUIRY_OPTIONS.map((opt) => {
            const isActive = selected === opt.id
            return (
              <button
                key={opt.id}
                onClick={() => onSelect(opt.id)}
                className={`group text-left p-4 sm:p-5 rounded-xl border-2 transition-all duration-200 ${
                  isActive
                    ? 'border-blue-500 dark:border-blue-400 bg-white dark:bg-gray-900 shadow-xl -translate-y-0.5'
                    : 'border-gray-200 dark:border-gray-800 bg-white/60 dark:bg-gray-900/40 hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-lg'
                }`}
                aria-pressed={isActive}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-lg bg-gradient-to-br ${opt.accent} text-white flex items-center justify-center shadow-md flex-shrink-0`}
                  >
                    {opt.icon}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-gray-900 dark:text-white text-sm sm:text-base truncate">
                      {opt.label}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 hidden sm:block truncate">
                      {opt.description}
                    </div>
                  </div>
                  {isActive && (
                    <CheckCircle2 className="w-5 h-5 text-blue-500 flex-shrink-0" aria-hidden />
                  )}
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  </section>
)

/* ============================================================
 *  CONTACT FORM
 * ============================================================ */
const ContactForm: React.FC<{
  form: FormState
  errors: Partial<Record<keyof FormState, string>>
  status: 'idle' | 'submitting' | 'success' | 'error'
  onUpdate: <K extends keyof FormState>(key: K, value: FormState[K]) => void
  onSubmit: (ev: React.FormEvent) => void
}> = ({ form, errors, status, onUpdate, onSubmit }) => {
  const activeOption = INQUIRY_OPTIONS.find((o) => o.id === form.inquiry)!
  return (
    <form
      onSubmit={onSubmit}
      noValidate
      className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800 p-6 sm:p-8"
    >
      <div className="flex items-start gap-3 mb-6 pb-6 border-b border-gray-100 dark:border-gray-800">
        <div
          className={`w-12 h-12 rounded-xl bg-gradient-to-br ${activeOption.accent} text-white flex items-center justify-center shadow-md`}
        >
          {activeOption.icon}
        </div>
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
            Send us a message
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Routed to{' '}
            <span className="font-medium text-gray-700 dark:text-gray-300">
              {activeOption.label}
            </span>
            {' · '}reply within {activeOption.sla.toLowerCase()}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field
          label="First name"
          required
          value={form.firstName}
          onChange={(v) => onUpdate('firstName', v)}
          error={errors.firstName}
          autoComplete="given-name"
        />
        <Field
          label="Last name"
          required
          value={form.lastName}
          onChange={(v) => onUpdate('lastName', v)}
          error={errors.lastName}
          autoComplete="family-name"
        />
        <Field
          label="Work email"
          required
          type="email"
          value={form.email}
          onChange={(v) => onUpdate('email', v)}
          error={errors.email}
          autoComplete="email"
          placeholder="you@company.com"
        />
        <Field
          label="Phone (optional)"
          type="tel"
          value={form.phone}
          onChange={(v) => onUpdate('phone', v)}
          autoComplete="tel"
          placeholder="+1 555 010 1234"
        />
        <Field
          label="Company"
          required
          value={form.company}
          onChange={(v) => onUpdate('company', v)}
          error={errors.company}
          autoComplete="organization"
        />
        <Field
          label="Job title"
          value={form.jobTitle}
          onChange={(v) => onUpdate('jobTitle', v)}
          autoComplete="organization-title"
        />
        <SelectField
          label="Company size"
          value={form.companySize}
          onChange={(v) => onUpdate('companySize', v)}
          options={COMPANY_SIZES}
          placeholder="Select an option"
        />
        <Field
          label="Country"
          value={form.country}
          onChange={(v) => onUpdate('country', v)}
          autoComplete="country-name"
          placeholder="e.g. Cameroon"
        />
      </div>

      <div className="mt-4">
        <Label htmlFor="message">
          How can we help? <span className="text-red-500">*</span>
        </Label>
        <textarea
          id="message"
          rows={5}
          value={form.message}
          onChange={(e) => onUpdate('message', e.target.value)}
          placeholder="Briefly describe your use case, team size, and any timelines or compliance constraints…"
          className={`mt-1.5 w-full px-3.5 py-2.5 rounded-lg border bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition resize-y ${
            errors.message
              ? 'border-red-400 dark:border-red-500'
              : 'border-gray-300 dark:border-gray-700 focus:border-blue-500'
          }`}
          aria-invalid={!!errors.message}
          aria-describedby={errors.message ? 'message-err' : undefined}
        />
        <div className="flex items-center justify-between mt-1">
          {errors.message ? (
            <span id="message-err" className="text-xs text-red-500 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" /> {errors.message}
            </span>
          ) : (
            <span className="text-xs text-gray-400">
              Min. 20 characters · Markdown not supported
            </span>
          )}
          <span className="text-xs text-gray-400">{form.message.length} chars</span>
        </div>
      </div>

      <div className="mt-6 space-y-3">
        <label className="flex items-start gap-3 cursor-pointer group">
          <input
            type="checkbox"
            checked={form.agreedToPolicy}
            onChange={(e) => onUpdate('agreedToPolicy', e.target.checked)}
            className="mt-1 w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
            I have read and accept the{' '}
            <a href="/privacy" className="text-blue-600 dark:text-blue-400 underline">
              Privacy Policy
            </a>{' '}
            and consent to DabiTech storing and processing my information to respond to my inquiry.{' '}
            <span className="text-red-500">*</span>
          </span>
        </label>
        {errors.agreedToPolicy && (
          <p className="text-xs text-red-500 ml-7 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" /> {errors.agreedToPolicy}
          </p>
        )}

        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={form.subscribed}
            onChange={(e) => onUpdate('subscribed', e.target.checked)}
            className="mt-1 w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
            Send me product updates and relevant compliance content (about once a month). You can
            unsubscribe at any time.
          </span>
        </label>
      </div>

      {status === 'error' && (
        <div className="mt-5 flex items-start gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
          <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-red-700 dark:text-red-300">
            We couldn't send your message. Please try again, or email{' '}
            <a href={`mailto:${activeOption.email}`} className="underline font-medium">
              {activeOption.email}
            </a>{' '}
            directly.
          </div>
        </div>
      )}

      <div className="mt-7 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          We never share your details. Read our{' '}
          <a href="/privacy" className="underline">
            privacy commitments
          </a>
          .
        </p>
        <button
          type="submit"
          disabled={status === 'submitting'}
          className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all duration-300"
        >
          {status === 'submitting' ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Sending…
            </>
          ) : (
            <>
              <Send className="w-4 h-4" />
              Send message
            </>
          )}
        </button>
      </div>
    </form>
  )
}

/* ============================================================
 *  FORM PRIMITIVES
 * ============================================================ */
const Label: React.FC<{ htmlFor?: string; children: React.ReactNode }> = ({
  htmlFor,
  children,
}) => (
  <label
    htmlFor={htmlFor}
    className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide"
  >
    {children}
  </label>
)

const Field: React.FC<{
  label: string
  value: string
  onChange: (v: string) => void
  type?: string
  required?: boolean
  error?: string
  placeholder?: string
  autoComplete?: string
}> = ({ label, value, onChange, type = 'text', required, error, placeholder, autoComplete }) => {
  const id = label.replace(/\s+/g, '-').toLowerCase()
  return (
    <div>
      <Label htmlFor={id}>
        {label} {required && <span className="text-red-500">*</span>}
      </Label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-err` : undefined}
        className={`mt-1.5 w-full px-3.5 py-2.5 rounded-lg border bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition ${
          error
            ? 'border-red-400 dark:border-red-500'
            : 'border-gray-300 dark:border-gray-700 focus:border-blue-500'
        }`}
      />
      {error && (
        <p id={`${id}-err`} className="mt-1 text-xs text-red-500 flex items-center gap-1">
          <AlertCircle className="w-3 h-3" /> {error}
        </p>
      )}
    </div>
  )
}

const SelectField: React.FC<{
  label: string
  value: string
  onChange: (v: string) => void
  options: string[]
  placeholder?: string
}> = ({ label, value, onChange, options, placeholder }) => {
  const id = label.replace(/\s+/g, '-').toLowerCase()
  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <div className="relative mt-1.5">
        <select
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full appearance-none px-3.5 py-2.5 pr-9 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
        >
          <option value="" disabled>
            {placeholder ?? 'Select…'}
          </option>
          {options.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
      </div>
    </div>
  )
}

/* ============================================================
 *  SUCCESS CARD
 * ============================================================ */
const SuccessCard: React.FC<{ onAnother: () => void }> = ({ onAnother }) => (
  <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800 p-8 sm:p-12 text-center">
    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 text-white flex items-center justify-center mx-auto mb-5 shadow-lg">
      <CheckCircle2 className="w-8 h-8" />
    </div>
    <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-3">
      Message received — thank you!
    </h2>
    <p className="text-gray-600 dark:text-gray-300 max-w-md mx-auto mb-6">
      A specialist from the right team is reviewing your inquiry. You'll get a personal reply at the
      email address you provided, usually within a few hours during business days.
    </p>
    <div className="grid sm:grid-cols-3 gap-3 max-w-lg mx-auto mb-7 text-left">
      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
        <div className="text-[10px] uppercase tracking-wide text-gray-500 dark:text-gray-400 font-semibold">
          Reference
        </div>
        <div className="text-sm font-mono text-gray-900 dark:text-white mt-0.5">
          #DT-{Math.floor(100000 + Math.random() * 900000)}
        </div>
      </div>
      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
        <div className="text-[10px] uppercase tracking-wide text-gray-500 dark:text-gray-400 font-semibold">
          Status
        </div>
        <div className="text-sm font-medium text-green-600 dark:text-green-400 mt-0.5">Routed</div>
      </div>
      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
        <div className="text-[10px] uppercase tracking-wide text-gray-500 dark:text-gray-400 font-semibold">
          Next step
        </div>
        <div className="text-sm text-gray-900 dark:text-white mt-0.5">Personal reply</div>
      </div>
    </div>
    <button
      onClick={onAnother}
      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border-2 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 font-medium text-sm transition"
    >
      Send another message
    </button>
  </div>
)

/* ============================================================
 *  RIGHT-COLUMN CARDS
 * ============================================================ */
const DirectChannelsCard: React.FC<{ selected: Inquiry }> = ({ selected }) => {
  const opt = INQUIRY_OPTIONS.find((o) => o.id === selected)!
  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 p-6">
      <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
        <MessageSquare className="w-5 h-5 text-blue-500" />
        Skip the form
      </h3>
      <div className="space-y-3">
        <ChannelRow
          icon={<Mail className="w-4 h-4" />}
          label={opt.label}
          value={opt.email}
          href={`mailto:${opt.email}`}
        />
        <ChannelRow
          icon={<Phone className="w-4 h-4" />}
          label="Sales line (US/EU)"
          value="+1 (415) 555-0119"
          href="tel:+14155550119"
        />
        <ChannelRow
          icon={<Phone className="w-4 h-4" />}
          label="P1 incident line · 24/7"
          value="+1 (415) 555-0911"
          href="tel:+14155550911"
        />
        <ChannelRow
          icon={<MessageSquare className="w-4 h-4" />}
          label="Live chat"
          value="Mon–Fri · 06:00–22:00 UTC"
        />
      </div>
    </div>
  )
}

const ChannelRow: React.FC<{
  icon: React.ReactNode
  label: string
  value: string
  href?: string
}> = ({ icon, label, value, href }) => {
  const content = (
    <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/60 transition group">
      <div className="w-9 h-9 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center flex-shrink-0">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-xs text-gray-500 dark:text-gray-400">{label}</div>
        <div className="text-sm font-semibold text-gray-900 dark:text-white truncate">{value}</div>
      </div>
      {href && (
        <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-blue-500 group-hover:translate-x-0.5 transition flex-shrink-0" />
      )}
    </div>
  )
  return href ? (
    <a href={href} className="block">
      {content}
    </a>
  ) : (
    content
  )
}

const ResponseSLACard: React.FC = () => (
  <div className="bg-gradient-to-br from-blue-600 to-purple-700 text-white rounded-2xl shadow-xl p-6">
    <div className="flex items-center gap-2 text-blue-100 text-xs uppercase tracking-widest font-semibold mb-3">
      <Clock className="w-4 h-4" /> Response SLAs
    </div>
    <ul className="space-y-3">
      {INQUIRY_OPTIONS.map((o) => (
        <li key={o.id} className="flex items-center justify-between text-sm">
          <span className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full bg-gradient-to-r ${o.accent}`} />
            <span className="text-blue-50">{o.label}</span>
          </span>
          <span className="text-white font-medium text-xs">{o.sla}</span>
        </li>
      ))}
    </ul>
    <div className="mt-5 pt-4 border-t border-white/20 text-xs text-blue-100">
      Real numbers from the last 90 days. We measure first human response, not auto-acks.
    </div>
  </div>
)

const SocialCard: React.FC = () => (
  <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 p-6">
    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Find us elsewhere</h3>
    <div className="grid grid-cols-3 gap-3">
      <SocialButton icon={<Linkedin className="w-5 h-5" />} label="LinkedIn" href="#" />
      <SocialButton icon={<Twitter className="w-5 h-5" />} label="X / Twitter" href="#" />
      <SocialButton icon={<Github className="w-5 h-5" />} label="GitHub" href="#" />
    </div>
  </div>
)

const SocialButton: React.FC<{ icon: React.ReactNode; label: string; href: string }> = ({
  icon,
  label,
  href,
}) => (
  <a
    href={href}
    className="flex flex-col items-center gap-2 p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-gray-50 dark:hover:bg-gray-800/60 transition text-gray-700 dark:text-gray-300"
  >
    {icon}
    <span className="text-xs font-medium">{label}</span>
  </a>
)

/* ============================================================
 *  OFFICES
 * ============================================================ */
interface Office {
  city: string
  region: string
  address: string[]
  phone: string
  hours: string
  flag: string
  isHQ?: boolean
}

const OFFICES: Office[] = [
  {
    city: 'Douala',
    region: 'Africa HQ',
    address: ['Rue Joffre, Akwa', 'Douala, Cameroon'],
    phone: '+237 233 50 10 10',
    hours: 'Mon–Fri · 08:00–18:00 WAT',
    flag: '🇨🇲',
    isHQ: true,
  },
  {
    city: 'San Francisco',
    region: 'Americas',
    address: ['548 Market St #38211', 'San Francisco, CA 94104'],
    phone: '+1 (415) 555-0119',
    hours: 'Mon–Fri · 09:00–18:00 PT',
    flag: '🇺🇸',
  },
  {
    city: 'London',
    region: 'EMEA',
    address: ['1 Finsbury Avenue', 'London EC2M 2PF, UK'],
    phone: '+44 20 4538 1100',
    hours: 'Mon–Fri · 09:00–18:00 GMT',
    flag: '🇬🇧',
  },
  {
    city: 'Singapore',
    region: 'APAC',
    address: ['9 Battery Road', '#15-01 MYP Centre, 049910'],
    phone: '+65 6818 9300',
    hours: 'Mon–Fri · 09:00–18:00 SGT',
    flag: '🇸🇬',
  },
  {
    city: 'Lagos',
    region: 'West Africa',
    address: ['10 Ozumba Mbadiwe Ave', 'Victoria Island, Lagos'],
    phone: '+234 1 700 4400',
    hours: 'Mon–Fri · 08:00–18:00 WAT',
    flag: '🇳🇬',
  },
  {
    city: 'Nairobi',
    region: 'East Africa',
    address: ['Britam Tower, Hospital Rd', 'Upper Hill, Nairobi'],
    phone: '+254 20 525 0500',
    hours: 'Mon–Fri · 08:00–18:00 EAT',
    flag: '🇰🇪',
  },
]

const OfficesSection: React.FC = () => (
  <section className="py-20 sm:py-24">
    <div className="container mx-auto px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto text-center mb-12">
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
          Offices around{' '}
          <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            the world
          </span>
        </h2>
        <p className="text-lg text-gray-600 dark:text-gray-300">
          Local teams in your timezone, language, and regulatory environment.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 max-w-6xl mx-auto">
        {OFFICES.map((o) => (
          <article
            key={o.city}
            className="group relative bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300"
          >
            {o.isHQ && (
              <span className="absolute top-4 right-4 px-2 py-0.5 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 text-white text-[10px] font-semibold tracking-wider">
                HQ
              </span>
            )}
            <div className="flex items-center gap-3 mb-3">
              <span className="text-3xl" aria-hidden>
                {o.flag}
              </span>
              <div>
                <div className="text-xl font-bold text-gray-900 dark:text-white">{o.city}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">{o.region}</div>
              </div>
            </div>
            <div className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                <div>
                  {o.address.map((line) => (
                    <div key={line}>{line}</div>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <a href={`tel:${o.phone.replace(/\s/g, '')}`} className="hover:text-blue-600">
                  {o.phone}
                </a>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <span>{o.hours}</span>
              </div>
            </div>
            <a
              href="#"
              className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-blue-600 dark:text-blue-400 group-hover:gap-2 transition-all"
            >
              <Globe className="w-3.5 h-3.5" /> Open in maps
              <ArrowRight className="w-3 h-3" />
            </a>
          </article>
        ))}
      </div>

      <div className="mt-10 max-w-3xl mx-auto text-center">
        <p className="text-sm text-gray-500 dark:text-gray-400 inline-flex items-center gap-2">
          <Building2 className="w-4 h-4" /> Need on-site delivery? Our professional services team
          travels to client sites worldwide.
        </p>
      </div>
    </div>
  </section>
)

/* ============================================================
 *  FAQ
 * ============================================================ */
const FAQSection: React.FC<{ openFaq: number | null; setOpenFaq: (i: number | null) => void }> = ({
  openFaq,
  setOpenFaq,
}) => {
  const faqs = [
    {
      q: 'What is your typical response time?',
      a: 'Sales inquiries are answered within 4 business hours. Production-impacting (P1) support tickets are acknowledged within 1 hour, 24/7. Other inquiries get a personal reply within 1–3 business days.',
    },
    {
      q: 'Do you offer custom enterprise pricing?',
      a: 'Yes. Volume discounts kick in at 100 seats. Self-hosted Enterprise licenses are flat annual contracts that include implementation, training, and a named customer success manager.',
    },
    {
      q: 'Can I get a Master Service Agreement, DPA, or BAA?',
      a: 'Absolutely. Our legal team can sign your standard MSA/DPA, or you can use our prebuilt templates. Reach out via the Sales lane and reference "legal pack" in your message.',
    },
    {
      q: 'How do I report a security vulnerability?',
      a: 'Please use the Security lane above or email security@dabitech.com directly. Critical issues are acknowledged within 24 hours. We run a coordinated disclosure programme with bug-bounty payouts.',
    },
    {
      q: 'Can a partner contact me to resell DFC?',
      a: 'Yes — our partner programme is open to system integrators, MSPs, and consultancies. Choose "Partnerships" above and a partner manager will be in touch within 3 business days.',
    },
  ]
  return (
    <section className="py-20 sm:py-24 bg-gray-50 dark:bg-gray-900/50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center mb-12">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
            Common questions
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-300">
            Quick answers before you reach out.
          </p>
        </div>
        <div className="max-w-3xl mx-auto space-y-3">
          {faqs.map((f, i) => {
            const open = openFaq === i
            return (
              <div
                key={i}
                className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden"
              >
                <button
                  onClick={() => setOpenFaq(open ? null : i)}
                  className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-50 dark:hover:bg-gray-800/50"
                  aria-expanded={open}
                >
                  <span className="font-semibold text-gray-900 dark:text-white text-sm sm:text-base">
                    {f.q}
                  </span>
                  <ChevronDown
                    className={`w-5 h-5 text-gray-500 transition-transform flex-shrink-0 ml-4 ${open ? 'rotate-180' : ''}`}
                  />
                </button>
                {open && (
                  <div className="px-5 pb-4 text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                    {f.a}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

/* ============================================================
 *  FINAL CTA
 * ============================================================ */
const CTABanner: React.FC<{ onNavigate: (path: string) => void }> = ({ onNavigate }) => (
  <section className="py-20 sm:py-24">
    <div className="container mx-auto px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto bg-gradient-to-br from-blue-600 via-blue-700 to-purple-700 rounded-3xl p-10 sm:p-14 text-center shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />
        <div className="relative">
          <Users className="w-12 h-12 text-white mx-auto mb-4" />
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4">
            Prefer to explore on your own?
          </h2>
          <p className="text-blue-100 text-lg max-w-2xl mx-auto mb-8">
            Take an interactive tour of every module — no signup, no credit card.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={() => onNavigate('/demo')}
              className="group w-full sm:w-auto px-8 py-4 bg-white hover:bg-gray-50 text-blue-700 font-semibold rounded-lg shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-0.5 flex items-center justify-center gap-2"
            >
              <span>Take the Interactive Tour</span>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
            <button
              onClick={() => onNavigate('/register')}
              className="w-full sm:w-auto px-8 py-4 bg-blue-800/40 hover:bg-blue-800/60 text-white font-semibold rounded-lg border-2 border-white/20 hover:border-white/40 transition-all duration-300"
            >
              Start Free Trial
            </button>
          </div>
        </div>
      </div>
    </div>
  </section>
)

export default ContactPage
