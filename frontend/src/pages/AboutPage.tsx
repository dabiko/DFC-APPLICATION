import React, { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  Sparkles,
  Target,
  Eye,
  Heart,
  ShieldCheck,
  Users,
  Globe,
  Award,
  Rocket,
  TrendingUp,
  Code2,
  Building2,
  Linkedin,
  Twitter,
  Github,
  CheckCircle2,
  Lightbulb,
  HandHeart,
  Lock,
  Zap,
  GraduationCap,
  MapPin,
  Briefcase,
  Quote,
  Star,
} from 'lucide-react'
import { useTheme } from '../hooks/useTheme'
import LandingHeader from '../components/Landing/LandingHeader'
import Footer from '../components/Landing/Footer'

const AboutPage: React.FC = () => {
  const navigate = useNavigate()
  const { theme, setTheme } = useTheme()

  const cycleTheme = () => {
    if (theme === 'light') setTheme('dark')
    else if (theme === 'dark') setTheme('system')
    else setTheme('light')
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-950 transition-colors duration-300">
      <LandingHeader theme={theme} onToggleTheme={cycleTheme} onNavigate={navigate} />

      <main>
        <Hero />
        <ImpactStats />
        <MissionVisionValues />
        <StorySection />
        <Timeline />
        <CultureValues />
        <LeadershipTeam />
        <InvestorsAndPartners />
        <Certifications />
        <PressMentions />
        <CareersCTA onNavigate={navigate} />
        <FinalCTA onNavigate={navigate} />
      </main>

      <Footer onNavigate={navigate} />
    </div>
  )
}

/* ============================================================
 *  HERO
 * ============================================================ */
const Hero: React.FC = () => (
  <section className="relative pt-32 sm:pt-40 pb-16 sm:pb-20 overflow-hidden">
    <div className="absolute inset-0 -z-10">
      <div className="absolute top-20 left-1/4 w-[28rem] h-[28rem] bg-blue-400/20 dark:bg-blue-500/15 rounded-full blur-3xl animate-pulse" />
      <div
        className="absolute top-40 right-1/4 w-[28rem] h-[28rem] bg-purple-400/20 dark:bg-purple-500/15 rounded-full blur-3xl animate-pulse"
        style={{ animationDelay: '1.4s' }}
      />
    </div>

    <div className="container mx-auto px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto text-center">
        <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-purple-600 px-4 py-2 rounded-full mb-6 shadow-lg">
          <Sparkles className="w-4 h-4 text-white" />
          <span className="text-sm font-semibold text-white tracking-wide">OUR STORY</span>
        </div>

        <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-gray-900 dark:text-white mb-6 leading-tight">
          Building the system of record for{' '}
          <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 dark:from-blue-400 dark:via-purple-400 dark:to-pink-400 bg-clip-text text-transparent">
            regulated institutions
          </span>
        </h1>

        <p className="text-lg sm:text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto leading-relaxed">
          We started DabiTech because the institutions the world depends on — banks, insurers,
          auditors, healthcare providers — were managing their most sensitive documents in tools
          designed for everything except compliance.
        </p>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-sm text-gray-600 dark:text-gray-400">
          <span className="flex items-center gap-1.5">
            <Building2 className="w-4 h-4 text-blue-500" /> Founded 2021 · Douala, Cameroon
          </span>
          <span className="flex items-center gap-1.5">
            <Users className="w-4 h-4 text-blue-500" /> 142 employees across 14 countries
          </span>
          <span className="flex items-center gap-1.5">
            <Globe className="w-4 h-4 text-blue-500" /> Customers in 38 countries
          </span>
        </div>
      </div>
    </div>
  </section>
)

/* ============================================================
 *  IMPACT STATS (animated counters)
 * ============================================================ */
const useCounter = (target: number, duration = 1500) => {
  const [value, setValue] = useState(0)
  const ref = useRef<HTMLDivElement>(null)
  const started = useRef(false)

  useEffect(() => {
    if (!ref.current) return
    const el = ref.current
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !started.current) {
            started.current = true
            const start = performance.now()
            const tick = (now: number) => {
              const t = Math.min(1, (now - start) / duration)
              const eased = 1 - Math.pow(1 - t, 3)
              setValue(Math.round(target * eased))
              if (t < 1) requestAnimationFrame(tick)
            }
            requestAnimationFrame(tick)
          }
        })
      },
      { threshold: 0.3 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [target, duration])

  return { value, ref }
}

const ImpactStat: React.FC<{
  target: number
  prefix?: string
  suffix?: string
  label: string
  description: string
  icon: React.ReactNode
  accent: string
}> = ({ target, prefix = '', suffix = '', label, description, icon, accent }) => {
  const { value, ref } = useCounter(target)
  return (
    <div
      ref={ref}
      className="relative bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-200 dark:border-gray-800 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
    >
      <div
        className={`absolute -top-4 left-6 w-12 h-12 rounded-xl bg-gradient-to-br ${accent} flex items-center justify-center text-white shadow-lg`}
      >
        {icon}
      </div>
      <div className="mt-6">
        <div className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white">
          {prefix}
          {value.toLocaleString()}
          {suffix}
        </div>
        <div className="text-sm font-semibold text-gray-700 dark:text-gray-300 mt-1">{label}</div>
        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{description}</div>
      </div>
    </div>
  )
}

const ImpactStats: React.FC = () => (
  <section className="py-16 sm:py-20">
    <div className="container mx-auto px-4 sm:px-6 lg:px-8">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
        <ImpactStat
          target={500}
          suffix="+"
          label="Customer institutions"
          description="Banks, NBFIs, insurers, auditors"
          icon={<Building2 className="w-5 h-5" />}
          accent="from-blue-500 to-cyan-500"
        />
        <ImpactStat
          target={12000000}
          suffix="+"
          label="Documents secured"
          description="Across all customer tenants"
          icon={<ShieldCheck className="w-5 h-5" />}
          accent="from-violet-500 to-fuchsia-500"
        />
        <ImpactStat
          target={38}
          label="Countries served"
          description="On 5 continents"
          icon={<Globe className="w-5 h-5" />}
          accent="from-emerald-500 to-teal-500"
        />
        <ImpactStat
          target={142}
          label="Team members"
          description="Across engineering, GTM and CX"
          icon={<Users className="w-5 h-5" />}
          accent="from-amber-500 to-orange-500"
        />
      </div>
    </div>
  </section>
)

/* ============================================================
 *  MISSION / VISION / VALUES
 * ============================================================ */
const MissionVisionValues: React.FC = () => {
  const items = [
    {
      icon: <Target className="w-6 h-6" />,
      title: 'Mission',
      body: 'Make compliance an outcome of how teams already work — not a separate burden bolted on after the fact.',
      accent: 'from-blue-500 to-cyan-500',
    },
    {
      icon: <Eye className="w-6 h-6" />,
      title: 'Vision',
      body: 'A world where every regulated institution can audit, prove, and improve any process in minutes — not weeks.',
      accent: 'from-violet-500 to-fuchsia-500',
    },
    {
      icon: <Heart className="w-6 h-6" />,
      title: 'Values',
      body: "Customer obsession, default-secure design, written-first culture, and the belief that 'enterprise software' shouldn't feel like punishment.",
      accent: 'from-pink-500 to-rose-500',
    },
  ]
  return (
    <section className="py-20 sm:py-24 bg-gray-50 dark:bg-gray-900/50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center mb-12">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
            Why we get up in the morning
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-300">
            Three sentences, three ideas, one reason we exist.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {items.map((it) => (
            <div
              key={it.title}
              className="group bg-white dark:bg-gray-900 rounded-2xl p-7 border border-gray-200 dark:border-gray-800 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
            >
              <div
                className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${it.accent} text-white flex items-center justify-center shadow-lg mb-5 group-hover:scale-110 transition-transform`}
              >
                {it.icon}
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{it.title}</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">{it.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ============================================================
 *  STORY (founder narrative)
 * ============================================================ */
const StorySection: React.FC = () => (
  <section className="py-20 sm:py-24">
    <div className="container mx-auto px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto grid lg:grid-cols-12 gap-10 items-center">
        <div className="lg:col-span-7">
          <p className="text-xs uppercase tracking-widest text-blue-600 dark:text-blue-400 font-semibold mb-3">
            The story
          </p>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-6 leading-tight">
            We saw the same broken loop in every institution we worked with.
          </h2>
          <div className="prose prose-lg dark:prose-invert max-w-none text-gray-600 dark:text-gray-300 space-y-4">
            <p>
              In 2021, our founders had spent years building software for African banks and
              insurers. The pattern never changed: critical KYC files lived in shared drives,
              procedures were authored in Word and lost in email, and "evidence for the regulator"
              meant a frantic week of screenshots and spreadsheet stitching.
            </p>
            <p>
              We believed institutions deserved a single platform that treated documents,
              procedures, workflows, and training as one connected system — and that worked equally
              well in a Lagos branch as in a London headquarters.
            </p>
            <p>
              Today, DabiTech serves more than 500 regulated institutions across 38 countries. Every
              engineer we hire, every feature we ship, and every customer we onboard is in service
              of that original belief.
            </p>
          </div>
        </div>

        <div className="lg:col-span-5">
          <div className="relative">
            <div className="absolute -inset-4 bg-gradient-to-br from-blue-500/20 via-purple-500/20 to-pink-500/20 rounded-3xl blur-2xl" />
            <blockquote className="relative bg-white dark:bg-gray-900 rounded-2xl p-8 border border-gray-200 dark:border-gray-800 shadow-xl">
              <Quote className="w-10 h-10 text-blue-500/30 mb-4" />
              <p className="text-base sm:text-lg text-gray-800 dark:text-gray-100 leading-relaxed font-medium">
                "We didn't want to build another document tool. We wanted to build the place where a
                regulated institution actually does its work."
              </p>
              <footer className="mt-5 pt-5 border-t border-gray-100 dark:border-gray-800 flex items-center gap-3">
                <div className="w-11 h-11 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 text-white flex items-center justify-center font-bold">
                  CM
                </div>
                <div>
                  <div className="text-sm font-semibold text-gray-900 dark:text-white">
                    Cedric Mbah
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    Co-founder &amp; CEO
                  </div>
                </div>
              </footer>
            </blockquote>
          </div>
        </div>
      </div>
    </div>
  </section>
)

/* ============================================================
 *  TIMELINE
 * ============================================================ */
const Timeline: React.FC = () => {
  const events = [
    {
      year: '2021',
      title: 'Founded in Douala',
      body: 'Cedric Mbah and Njeck Clinton incorporate DabiTech with a single contract: a regional bank that needed to digitise 12 years of KYC files.',
      icon: <Rocket className="w-4 h-4" />,
    },
    {
      year: '2022',
      title: 'First 50 customers',
      body: 'The Digital Filing Cabinet hits product-market fit across West African NBFIs. The team grows to 18 people across engineering, design, and customer success.',
      icon: <TrendingUp className="w-4 h-4" />,
    },
    {
      year: '2023',
      title: 'Procedures &amp; workflows',
      body: 'We extend beyond pure document storage with the Procedure Authoring and Approval Workflow modules — the most-requested feature from compliance teams.',
      icon: <Code2 className="w-4 h-4" />,
    },
    {
      year: '2024',
      title: 'SOC 2 Type II &amp; ISO 27001',
      body: "We complete two of the industry's most rigorous security audits, opening the door to multinationals and tier-1 banks.",
      icon: <ShieldCheck className="w-4 h-4" />,
    },
    {
      year: '2025',
      title: 'Series B · 5 continents',
      body: '$32M Series B led by Atlas Ventures. We open offices in London, Singapore, and San Francisco and surpass 500 customer institutions.',
      icon: <Globe className="w-4 h-4" />,
    },
    {
      year: '2026',
      title: 'Training &amp; the unified platform',
      body: 'The Training &amp; Quizzes module ships, completing the loop: documents → procedures → workflows → training → audit, all in one platform.',
      icon: <GraduationCap className="w-4 h-4" />,
    },
  ]
  return (
    <section className="py-20 sm:py-24 bg-gradient-to-b from-gray-50 to-white dark:from-gray-900/50 dark:to-gray-950">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center mb-14">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
            From a single contract to{' '}
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              500+ institutions
            </span>
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-300">
            Five years of building, listening, and shipping.
          </p>
        </div>

        <div className="max-w-4xl mx-auto relative">
          {/* Vertical line */}
          <div
            aria-hidden
            className="absolute left-4 sm:left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-blue-500/0 via-blue-500 to-blue-500/0 sm:-translate-x-1/2"
          />
          <ol className="space-y-10">
            {events.map((e, idx) => {
              const left = idx % 2 === 0
              return (
                <li key={e.year} className="relative">
                  <div
                    className={`sm:grid sm:grid-cols-2 sm:gap-10 items-start ${
                      left ? '' : 'sm:[&>*:first-child]:order-2'
                    }`}
                  >
                    {/* Card */}
                    <div
                      className={`pl-12 sm:pl-0 ${left ? 'sm:text-right sm:pr-10' : 'sm:pl-10'}`}
                    >
                      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5 shadow-sm hover:shadow-lg transition-all">
                        <div
                          className={`text-xs font-bold tracking-widest text-blue-600 dark:text-blue-400 ${left ? 'sm:text-right' : ''}`}
                        >
                          {e.year}
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mt-1">
                          {e.title.replace('&amp;', '&')}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-300 mt-2 leading-relaxed">
                          {e.body.replace(/&amp;/g, '&')}
                        </p>
                      </div>
                    </div>
                    {/* Spacer for the other side */}
                    <div className="hidden sm:block" />
                  </div>
                  {/* Center dot */}
                  <div
                    aria-hidden
                    className="absolute top-3 left-4 sm:left-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-white flex items-center justify-center shadow-md ring-4 ring-white dark:ring-gray-950"
                  >
                    {e.icon}
                  </div>
                </li>
              )
            })}
          </ol>
        </div>
      </div>
    </section>
  )
}

/* ============================================================
 *  CULTURE / OPERATING PRINCIPLES
 * ============================================================ */
const CultureValues: React.FC = () => {
  const items = [
    {
      icon: <Users className="w-5 h-5" />,
      title: 'Customer obsession',
      body: 'Every roadmap item starts with a real customer conversation. We measure ourselves on outcomes, not feature counts.',
      accent: 'from-blue-500 to-cyan-500',
    },
    {
      icon: <Lock className="w-5 h-5" />,
      title: 'Default-secure',
      body: 'Security is a posture, not a checklist. We assume the threat is already inside, and design every feature accordingly.',
      accent: 'from-emerald-500 to-teal-500',
    },
    {
      icon: <Lightbulb className="w-5 h-5" />,
      title: 'Written-first',
      body: 'We write before we meet. Decisions, designs, and post-mortems live in shared docs — readable to anyone joining tomorrow.',
      accent: 'from-amber-500 to-orange-500',
    },
    {
      icon: <HandHeart className="w-5 h-5" />,
      title: 'Earn the trust',
      body: 'Regulated institutions trust us with their most sensitive data. We treat that trust as the highest-value asset on our balance sheet.',
      accent: 'from-rose-500 to-pink-500',
    },
    {
      icon: <Zap className="w-5 h-5" />,
      title: 'Ship, then sharpen',
      body: 'A small thing in production beats a big thing in Figma. We ship behind feature flags and improve with real signal.',
      accent: 'from-violet-500 to-fuchsia-500',
    },
    {
      icon: <Globe className="w-5 h-5" />,
      title: 'Built where it matters',
      body: 'Engineering rooted in Africa, customers across 5 continents. We build for the institution down the street and the one across the ocean.',
      accent: 'from-indigo-500 to-purple-500',
    },
  ]
  return (
    <section className="py-20 sm:py-24">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center mb-12">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
            How we operate
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-300">
            Six principles that show up in every commit, every roadmap review, and every customer
            call.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 max-w-6xl mx-auto">
          {items.map((it) => (
            <div
              key={it.title}
              className="bg-white dark:bg-gray-900 rounded-xl p-6 border border-gray-200 dark:border-gray-800 hover:shadow-lg transition-all duration-300"
            >
              <div className="flex items-start gap-3">
                <div
                  className={`w-10 h-10 rounded-lg bg-gradient-to-br ${it.accent} text-white flex items-center justify-center shadow-md flex-shrink-0`}
                >
                  {it.icon}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">{it.title}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mt-1.5 leading-relaxed">
                    {it.body}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ============================================================
 *  LEADERSHIP TEAM
 * ============================================================ */
interface Leader {
  name: string
  role: string
  bio: string
  initials: string
  gradient: string
  links?: { linkedin?: string; twitter?: string; github?: string }
}

const LEADERS: Leader[] = [
  {
    name: 'Cedric Mbah',
    role: 'Co-founder & CEO',
    bio: 'Previously led platform engineering at a pan-African banking group. Computer Science, University of Buea.',
    initials: 'CM',
    gradient: 'from-blue-500 to-cyan-500',
    links: { linkedin: '#', twitter: '#' },
  },
  {
    name: 'Njeck Clinton',
    role: 'Co-founder & CTO',
    bio: 'Built risk-and-compliance systems for two tier-1 NBFIs. Speaks fluent Postgres and Elasticsearch.',
    initials: 'NC',
    gradient: 'from-violet-500 to-fuchsia-500',
    links: { linkedin: '#', github: '#' },
  },
  {
    name: 'Adaeze Okafor',
    role: 'Chief Compliance Officer',
    bio: '15 years in regulatory affairs across West Africa and the EU. Former CCO at Meridian Trust.',
    initials: 'AO',
    gradient: 'from-emerald-500 to-teal-500',
    links: { linkedin: '#' },
  },
  {
    name: 'Daniel Park',
    role: 'Chief Operating Officer',
    bio: 'Scaled operations from 30 to 800+ at a fintech unicorn. Wharton MBA. Believes in checklists.',
    initials: 'DP',
    gradient: 'from-amber-500 to-orange-500',
    links: { linkedin: '#', twitter: '#' },
  },
  {
    name: 'Ines Bello',
    role: 'VP of Engineering',
    bio: 'Distributed systems lead at two YC-backed startups. Maintains three popular open-source libraries.',
    initials: 'IB',
    gradient: 'from-rose-500 to-pink-500',
    links: { linkedin: '#', github: '#' },
  },
  {
    name: 'Marcus Hale',
    role: 'VP of Customer Success',
    bio: 'Onboarded 200+ enterprise accounts across two SaaS exits. Obsessed with first-week activation.',
    initials: 'MH',
    gradient: 'from-indigo-500 to-purple-500',
    links: { linkedin: '#' },
  },
]

const LeadershipTeam: React.FC = () => (
  <section className="py-20 sm:py-24 bg-gray-50 dark:bg-gray-900/50">
    <div className="container mx-auto px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto text-center mb-12">
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
          Meet the team behind the platform
        </h2>
        <p className="text-lg text-gray-600 dark:text-gray-300">
          Operators, engineers, and compliance veterans who've lived the problem we're solving.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
        {LEADERS.map((l) => (
          <article
            key={l.name}
            className="group bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-200 dark:border-gray-800 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
          >
            <div
              className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${l.gradient} text-white flex items-center justify-center text-2xl font-bold shadow-lg mb-4 group-hover:scale-105 transition-transform`}
            >
              {l.initials}
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">{l.name}</h3>
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-400 mt-0.5">
              {l.role}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-300 mt-3 leading-relaxed">{l.bio}</p>
            {l.links && (
              <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800 flex items-center gap-2">
                {l.links.linkedin && (
                  <a
                    href={l.links.linkedin}
                    aria-label={`${l.name} on LinkedIn`}
                    className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-blue-600 hover:text-white flex items-center justify-center transition text-gray-500 dark:text-gray-400"
                  >
                    <Linkedin className="w-4 h-4" />
                  </a>
                )}
                {l.links.twitter && (
                  <a
                    href={l.links.twitter}
                    aria-label={`${l.name} on X`}
                    className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-blue-600 hover:text-white flex items-center justify-center transition text-gray-500 dark:text-gray-400"
                  >
                    <Twitter className="w-4 h-4" />
                  </a>
                )}
                {l.links.github && (
                  <a
                    href={l.links.github}
                    aria-label={`${l.name} on GitHub`}
                    className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-blue-600 hover:text-white flex items-center justify-center transition text-gray-500 dark:text-gray-400"
                  >
                    <Github className="w-4 h-4" />
                  </a>
                )}
              </div>
            )}
          </article>
        ))}
      </div>

      <div className="mt-10 text-center">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          + 136 more across engineering, product, design, sales, customer success, and operations.
        </p>
      </div>
    </div>
  </section>
)

/* ============================================================
 *  INVESTORS & PARTNERS
 * ============================================================ */
const InvestorsAndPartners: React.FC = () => {
  const investors = [
    'Atlas Ventures',
    'Meridian Capital',
    'Cedar Partners',
    'Sahel Holdings',
    'Pacific Reach',
  ]
  const partners = ['AWS', 'Microsoft', 'Cloudflare', 'Auth0', 'Snowflake', 'PagerDuty']
  return (
    <section className="py-20 sm:py-24">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
        <div className="max-w-6xl mx-auto">
          <p className="text-center text-xs uppercase tracking-widest text-gray-500 dark:text-gray-400 font-semibold mb-8">
            Backed by investors who've built category leaders
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-6 items-center">
            {investors.map((name) => (
              <div
                key={name}
                className="text-center text-gray-400 dark:text-gray-500 font-bold text-sm sm:text-base tracking-tight grayscale hover:grayscale-0 hover:text-gray-700 dark:hover:text-gray-300 transition-all"
              >
                {name}
              </div>
            ))}
          </div>
        </div>

        <div className="max-w-6xl mx-auto">
          <p className="text-center text-xs uppercase tracking-widest text-gray-500 dark:text-gray-400 font-semibold mb-8">
            Technology partners
          </p>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-6 items-center">
            {partners.map((name) => (
              <div
                key={name}
                className="text-center text-gray-400 dark:text-gray-500 font-bold text-sm sm:text-base tracking-tight grayscale hover:grayscale-0 hover:text-gray-700 dark:hover:text-gray-300 transition-all"
              >
                {name}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

/* ============================================================
 *  CERTIFICATIONS / AWARDS
 * ============================================================ */
const Certifications: React.FC = () => {
  const certs = [
    {
      name: 'SOC 2 Type II',
      sub: 'Security, Availability, Confidentiality',
      icon: <ShieldCheck className="w-5 h-5" />,
    },
    {
      name: 'ISO 27001',
      sub: 'Information security management',
      icon: <Lock className="w-5 h-5" />,
    },
    {
      name: 'GDPR Ready',
      sub: 'EU data subject rights tooling',
      icon: <CheckCircle2 className="w-5 h-5" />,
    },
    {
      name: 'PCI-DSS Aware',
      sub: 'For payment-adjacent metadata',
      icon: <CheckCircle2 className="w-5 h-5" />,
    },
    {
      name: 'HIPAA Aligned',
      sub: 'BAA available for US healthcare',
      icon: <CheckCircle2 className="w-5 h-5" />,
    },
    {
      name: 'Africa Fintech Award 2024',
      sub: 'Best Compliance Platform',
      icon: <Award className="w-5 h-5" />,
    },
  ]
  return (
    <section className="py-20 sm:py-24 bg-gray-50 dark:bg-gray-900/50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center mb-12">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
            Audited, certified, recognised
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-300">
            We hold ourselves to the same evidence standard we ask of our customers.
          </p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 max-w-6xl mx-auto">
          {certs.map((c) => (
            <div
              key={c.name}
              className="bg-white dark:bg-gray-900 rounded-xl p-5 border border-gray-200 dark:border-gray-800 text-center hover:shadow-lg transition"
            >
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 text-white flex items-center justify-center mx-auto mb-3 shadow-md">
                {c.icon}
              </div>
              <div className="text-sm font-bold text-gray-900 dark:text-white leading-tight">
                {c.name}
              </div>
              <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-1 leading-snug">
                {c.sub}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ============================================================
 *  PRESS MENTIONS
 * ============================================================ */
const PressMentions: React.FC = () => {
  const items = [
    {
      outlet: 'TechCrunch',
      date: 'Mar 2025',
      headline: 'DabiTech raises $32M Series B to take its compliance platform global',
    },
    {
      outlet: 'Financial Times',
      date: 'Nov 2024',
      headline: 'How African fintech is rewriting the rules of regulatory tech',
    },
    {
      outlet: 'Forbes Africa',
      date: 'Sep 2024',
      headline: 'The Cameroonian startup quietly powering 500+ banks',
    },
  ]
  return (
    <section className="py-20 sm:py-24">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center mb-12">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
            In the news
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-300">
            What the press has been writing about us lately.
          </p>
        </div>

        <div className="max-w-4xl mx-auto space-y-3">
          {items.map((p) => (
            <a
              key={p.headline}
              href="#"
              className="group flex items-center justify-between gap-4 bg-white dark:bg-gray-900 rounded-xl p-5 border border-gray-200 dark:border-gray-800 hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-lg transition-all"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-3 mb-1.5">
                  <span className="text-xs font-bold uppercase tracking-widest text-blue-600 dark:text-blue-400">
                    {p.outlet}
                  </span>
                  <span className="text-xs text-gray-400 dark:text-gray-500">{p.date}</span>
                </div>
                <div className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors leading-snug">
                  {p.headline}
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-blue-500 group-hover:translate-x-1 transition-all flex-shrink-0" />
            </a>
          ))}
        </div>

        <div className="mt-8 text-center">
          <a
            href="/press"
            className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600 dark:text-blue-400 hover:underline"
          >
            Visit the press room <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </div>
    </section>
  )
}

/* ============================================================
 *  CAREERS CTA
 * ============================================================ */
const CareersCTA: React.FC<{ onNavigate: (path: string) => void }> = ({ onNavigate }) => {
  const roles = [
    { title: 'Senior Backend Engineer', team: 'Engineering', location: 'Douala / Remote' },
    { title: 'Compliance Solutions Architect', team: 'Customer Success', location: 'London' },
    { title: 'Product Designer · Workflows', team: 'Design', location: 'Remote (EMEA)' },
    { title: 'Site Reliability Engineer', team: 'Platform', location: 'Singapore / Remote' },
    { title: 'Enterprise Account Executive', team: 'Sales', location: 'San Francisco' },
  ]
  return (
    <section className="py-20 sm:py-24 bg-gray-50 dark:bg-gray-900/50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto grid lg:grid-cols-12 gap-10 items-start">
          <div className="lg:col-span-5">
            <p className="text-xs uppercase tracking-widest text-blue-600 dark:text-blue-400 font-semibold mb-3">
              Careers
            </p>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-5 leading-tight">
              We're hiring across every team.
            </h2>
            <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-6">
              Remote-first, distributed across 14 countries, and growing fast. We hire for slope,
              not y-intercept — what you can learn matters more than what you already know.
            </p>
            <div className="flex flex-wrap gap-3 mb-6">
              {[
                'Remote-first',
                'Equity for all',
                '4 weeks PTO',
                'Learning budget',
                'Family healthcare',
              ].map((perk) => (
                <span
                  key={perk}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white dark:bg-gray-900 text-xs text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700"
                >
                  <Star className="w-3 h-3 text-yellow-500" /> {perk}
                </span>
              ))}
            </div>
            <button
              onClick={() => onNavigate('/careers')}
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all duration-300"
            >
              See all open roles <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <div className="lg:col-span-7">
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  <Briefcase className="w-4 h-4" /> Open roles · 23
                </div>
                <span className="text-[10px] text-gray-400">Showing 5</span>
              </div>
              <ul className="divide-y divide-gray-100 dark:divide-gray-800">
                {roles.map((r) => (
                  <li key={r.title}>
                    <a
                      href="#"
                      className="group flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition"
                    >
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition truncate">
                          {r.title}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 flex items-center gap-3">
                          <span>{r.team}</span>
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" /> {r.location}
                          </span>
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-blue-500 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ============================================================
 *  FINAL CTA
 * ============================================================ */
const FinalCTA: React.FC<{ onNavigate: (path: string) => void }> = ({ onNavigate }) => (
  <section className="py-20 sm:py-24">
    <div className="container mx-auto px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto bg-gradient-to-br from-blue-600 via-blue-700 to-purple-700 rounded-3xl p-10 sm:p-14 text-center shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />
        <div className="relative">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4">
            Want to learn more?
          </h2>
          <p className="text-blue-100 text-lg max-w-2xl mx-auto mb-8">
            See the platform in action, or talk to our team about your specific compliance
            challenges.
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
              onClick={() => onNavigate('/contact')}
              className="w-full sm:w-auto px-8 py-4 bg-blue-800/40 hover:bg-blue-800/60 text-white font-semibold rounded-lg border-2 border-white/20 hover:border-white/40 transition-all duration-300"
            >
              Talk to our team
            </button>
          </div>
        </div>
      </div>
    </div>
  </section>
)

export default AboutPage
