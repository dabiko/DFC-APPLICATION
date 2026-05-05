import React, { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  Sparkles,
  Search,
  MapPin,
  Briefcase,
  Globe,
  Users,
  Heart,
  Coffee,
  GraduationCap,
  Plane,
  Home,
  HeartPulse,
  PiggyBank,
  Smile,
  Code2,
  Palette,
  Headphones,
  TrendingUp,
  ShieldCheck,
  Building2,
  ChevronDown,
  CheckCircle2,
  Send,
  FileText,
  PhoneCall,
  UserCheck,
  Award,
  Linkedin,
  Twitter,
  Github,
  Quote,
  Loader2,
  AlertCircle,
  X,
  Filter,
  Clock,
} from 'lucide-react'
import { useTheme } from '../hooks/useTheme'
import LandingHeader from '../components/Landing/LandingHeader'
import Footer from '../components/Landing/Footer'

/* ============================================================
 *  DATA
 * ============================================================ */
type Department =
  | 'Engineering'
  | 'Product'
  | 'Design'
  | 'Customer Success'
  | 'Sales'
  | 'Marketing'
  | 'Operations'
  | 'People'

type LocationKey =
  | 'Douala'
  | 'Lagos'
  | 'Nairobi'
  | 'London'
  | 'Singapore'
  | 'San Francisco'
  | 'Remote'

type EmploymentType = 'Full-time' | 'Contract' | 'Internship'

interface Role {
  id: string
  title: string
  department: Department
  location: LocationKey
  type: EmploymentType
  experience: string
  posted: string
  remote: boolean
  highlights: string[]
}

const ROLES: Role[] = [
  {
    id: 'eng-1',
    title: 'Senior Backend Engineer · Documents Platform',
    department: 'Engineering',
    location: 'Douala',
    type: 'Full-time',
    experience: '5+ years',
    posted: '2 days ago',
    remote: true,
    highlights: [
      'Django · Postgres · Elasticsearch',
      'Storage & search infra',
      'Mentor 2-3 engineers',
    ],
  },
  {
    id: 'eng-2',
    title: 'Staff Frontend Engineer · Workflows',
    department: 'Engineering',
    location: 'Remote',
    type: 'Full-time',
    experience: '7+ years',
    posted: '5 days ago',
    remote: true,
    highlights: [
      'React · TypeScript · Redux Toolkit',
      'Owns the workflow designer',
      'Performance + a11y focus',
    ],
  },
  {
    id: 'eng-3',
    title: 'Site Reliability Engineer',
    department: 'Engineering',
    location: 'Singapore',
    type: 'Full-time',
    experience: '4+ years',
    posted: '1 week ago',
    remote: true,
    highlights: [
      'Kubernetes · Prometheus · Grafana',
      'Multi-region high availability',
      'On-call rotation',
    ],
  },
  {
    id: 'eng-4',
    title: 'Security Engineer',
    department: 'Engineering',
    location: 'London',
    type: 'Full-time',
    experience: '5+ years',
    posted: '3 days ago',
    remote: false,
    highlights: ['Threat modeling', 'Pen-test programme', 'SOC2 / ISO27001 evidence'],
  },
  {
    id: 'prd-1',
    title: 'Senior Product Manager · Compliance',
    department: 'Product',
    location: 'London',
    type: 'Full-time',
    experience: '6+ years',
    posted: '1 week ago',
    remote: true,
    highlights: [
      'Audit log + retention surfaces',
      'Regulator-facing roadmap',
      'Works with CCO Adaeze',
    ],
  },
  {
    id: 'prd-2',
    title: 'Product Manager · Training',
    department: 'Product',
    location: 'Remote',
    type: 'Full-time',
    experience: '4+ years',
    posted: '4 days ago',
    remote: true,
    highlights: ['Quizzes & certification', 'Cross-team alignment', 'Heavy customer research'],
  },
  {
    id: 'des-1',
    title: 'Senior Product Designer · Workflows',
    department: 'Design',
    location: 'Remote',
    type: 'Full-time',
    experience: '5+ years',
    posted: '6 days ago',
    remote: true,
    highlights: ['Figma + design systems', 'Designs the workflow canvas', 'Partners with Frontend'],
  },
  {
    id: 'des-2',
    title: 'Brand Designer',
    department: 'Design',
    location: 'Douala',
    type: 'Full-time',
    experience: '3+ years',
    posted: '2 weeks ago',
    remote: true,
    highlights: ['Marketing site + collateral', 'Owns brand system', 'Reports to Head of Design'],
  },
  {
    id: 'cs-1',
    title: 'Compliance Solutions Architect',
    department: 'Customer Success',
    location: 'London',
    type: 'Full-time',
    experience: '7+ years',
    posted: '1 day ago',
    remote: false,
    highlights: ['Banking / NBFI background', 'Implementation lead', 'Travel ~25%'],
  },
  {
    id: 'cs-2',
    title: 'Customer Success Manager · APAC',
    department: 'Customer Success',
    location: 'Singapore',
    type: 'Full-time',
    experience: '4+ years',
    posted: '2 weeks ago',
    remote: false,
    highlights: [
      'Owns ~20 strategic accounts',
      'Renewals + expansion',
      'Quarterly business reviews',
    ],
  },
  {
    id: 'sal-1',
    title: 'Enterprise Account Executive',
    department: 'Sales',
    location: 'San Francisco',
    type: 'Full-time',
    experience: '6+ years',
    posted: '3 days ago',
    remote: false,
    highlights: ['$1M+ ACV deals', 'Banking / fintech network', 'OTE $260K + equity'],
  },
  {
    id: 'sal-2',
    title: 'Sales Development Representative',
    department: 'Sales',
    location: 'Lagos',
    type: 'Full-time',
    experience: '1-3 years',
    posted: '5 days ago',
    remote: false,
    highlights: ['Outbound + inbound', 'Path to AE in 18 months', 'Strong coaching culture'],
  },
  {
    id: 'mkt-1',
    title: 'Content Marketing Lead',
    department: 'Marketing',
    location: 'Remote',
    type: 'Full-time',
    experience: '5+ years',
    posted: '1 week ago',
    remote: true,
    highlights: ['Owns blog + thought leadership', 'B2B SaaS background', 'Manages 2 writers'],
  },
  {
    id: 'ops-1',
    title: 'Revenue Operations Analyst',
    department: 'Operations',
    location: 'Remote',
    type: 'Full-time',
    experience: '3+ years',
    posted: '4 days ago',
    remote: true,
    highlights: ['Salesforce + dbt', 'Forecasting models', 'Reports to COO Daniel'],
  },
  {
    id: 'ppl-1',
    title: 'Senior Recruiter · Engineering',
    department: 'People',
    location: 'Douala',
    type: 'Full-time',
    experience: '4+ years',
    posted: '6 days ago',
    remote: true,
    highlights: ['Pan-Africa engineering hiring', 'Owns full lifecycle', 'Quarterly hiring goals'],
  },
  {
    id: 'eng-5',
    title: 'Software Engineering Intern',
    department: 'Engineering',
    location: 'Douala',
    type: 'Internship',
    experience: 'Student / new grad',
    posted: '1 week ago',
    remote: false,
    highlights: ['12-week paid programme', 'Real production tickets', 'Conversion to full-time'],
  },
  {
    id: 'des-3',
    title: 'UX Research Contractor',
    department: 'Design',
    location: 'Remote',
    type: 'Contract',
    experience: '5+ years',
    posted: '3 days ago',
    remote: true,
    highlights: ['6-month engagement', 'Compliance officer interviews', '20-30 hrs/week'],
  },
]

const DEPARTMENTS: Department[] = [
  'Engineering',
  'Product',
  'Design',
  'Customer Success',
  'Sales',
  'Marketing',
  'Operations',
  'People',
]
const LOCATIONS: LocationKey[] = [
  'Douala',
  'Lagos',
  'Nairobi',
  'London',
  'Singapore',
  'San Francisco',
  'Remote',
]
const EMPLOYMENT_TYPES: EmploymentType[] = ['Full-time', 'Contract', 'Internship']

const DEPT_ACCENTS: Record<Department, string> = {
  Engineering: 'from-blue-500 to-cyan-500',
  Product: 'from-violet-500 to-purple-500',
  Design: 'from-pink-500 to-rose-500',
  'Customer Success': 'from-emerald-500 to-teal-500',
  Sales: 'from-amber-500 to-orange-500',
  Marketing: 'from-fuchsia-500 to-pink-500',
  Operations: 'from-indigo-500 to-blue-500',
  People: 'from-rose-500 to-red-500',
}

const DEPT_ICONS: Record<Department, React.ReactNode> = {
  Engineering: <Code2 className="w-4 h-4" />,
  Product: <Briefcase className="w-4 h-4" />,
  Design: <Palette className="w-4 h-4" />,
  'Customer Success': <Headphones className="w-4 h-4" />,
  Sales: <TrendingUp className="w-4 h-4" />,
  Marketing: <Sparkles className="w-4 h-4" />,
  Operations: <Building2 className="w-4 h-4" />,
  People: <Users className="w-4 h-4" />,
}

/* ============================================================
 *  PAGE
 * ============================================================ */
const CareersPage: React.FC = () => {
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
        <QuickStats />
        <WhyWorkHere />
        <BenefitsSection />
        <JobBoard />
        <HiringProcess />
        <LifeAtSection />
        <DiversityCommitment />
        <FAQSection />
        <TalentNetworkCTA />
      </main>
      <Footer onNavigate={navigate} />
    </div>
  )
}

/* ============================================================
 *  HERO
 * ============================================================ */
const Hero: React.FC = () => (
  <section className="relative pt-32 sm:pt-40 pb-12 sm:pb-16 overflow-hidden">
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
          <span className="text-sm font-semibold text-white tracking-wide">
            JOIN US · 23 OPEN ROLES
          </span>
        </div>
        <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-gray-900 dark:text-white mb-6 leading-tight">
          Build software that{' '}
          <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 dark:from-blue-400 dark:via-purple-400 dark:to-pink-400 bg-clip-text text-transparent">
            keeps trust alive
          </span>
        </h1>
        <p className="text-lg sm:text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto leading-relaxed">
          We're 142 people across 14 countries, building the platform that keeps 500+ regulated
          institutions honest. Remote-first, equity for every employee, and a hiring bar that
          rewards curiosity over credentials.
        </p>
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <a
            href="#open-roles"
            className="group w-full sm:w-auto px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-0.5 flex items-center justify-center gap-2"
          >
            <Search className="w-5 h-5" />
            <span>Browse Open Roles</span>
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </a>
          <a
            href="#why-here"
            className="w-full sm:w-auto px-8 py-4 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-900 dark:text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 border-2 border-gray-200 dark:border-gray-700"
          >
            Why Work Here
          </a>
        </div>
      </div>
    </div>
  </section>
)

/* ============================================================
 *  QUICK STATS
 * ============================================================ */
const QuickStats: React.FC = () => {
  const stats = [
    {
      value: '142',
      label: 'Team members',
      icon: <Users className="w-5 h-5" />,
      accent: 'from-blue-500 to-cyan-500',
    },
    {
      value: '14',
      label: 'Countries',
      icon: <Globe className="w-5 h-5" />,
      accent: 'from-violet-500 to-fuchsia-500',
    },
    {
      value: '4.8/5',
      label: 'Glassdoor',
      icon: <Award className="w-5 h-5" />,
      accent: 'from-emerald-500 to-teal-500',
    },
    {
      value: '94%',
      label: 'Retention',
      icon: <Heart className="w-5 h-5" />,
      accent: 'from-rose-500 to-pink-500',
    },
  ]
  return (
    <section className="py-12">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-4">
          {stats.map((s) => (
            <div
              key={s.label}
              className="bg-white dark:bg-gray-900 rounded-2xl p-5 border border-gray-200 dark:border-gray-800 shadow-sm flex items-center gap-4"
            >
              <div
                className={`w-11 h-11 rounded-xl bg-gradient-to-br ${s.accent} text-white flex items-center justify-center shadow-md flex-shrink-0`}
              >
                {s.icon}
              </div>
              <div className="min-w-0">
                <div className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white leading-none">
                  {s.value}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{s.label}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ============================================================
 *  WHY WORK HERE
 * ============================================================ */
const WhyWorkHere: React.FC = () => {
  const reasons = [
    {
      icon: <TrendingUp className="w-6 h-6" />,
      title: 'Real impact, fast',
      body: "Your code ships behind feature flags within days, not quarters. Customer-impacting decisions go to whoever has the most context — title doesn't matter.",
      accent: 'from-blue-500 to-cyan-500',
    },
    {
      icon: <Globe className="w-6 h-6" />,
      title: 'Truly remote-first',
      body: 'No mandatory office days, no surveillance, no "remote-tolerant." Six hubs across three continents and 60% of the team is fully distributed.',
      accent: 'from-violet-500 to-fuchsia-500',
    },
    {
      icon: <PiggyBank className="w-6 h-6" />,
      title: 'Equity for everyone',
      body: 'Every full-time hire gets meaningful equity with a four-year vest. We publish our compensation bands internally so there are no negotiation games.',
      accent: 'from-emerald-500 to-teal-500',
    },
    {
      icon: <GraduationCap className="w-6 h-6" />,
      title: 'Senior people, real growth',
      body: 'Half our engineers are senior or staff level. Annual learning budget, conference travel, and a peer-mentorship programme that actually gets used.',
      accent: 'from-amber-500 to-orange-500',
    },
    {
      icon: <ShieldCheck className="w-6 h-6" />,
      title: 'Mission you can defend',
      body: 'We help banks block financial crime, auditors prove compliance, and clinics protect patient records. Easy to be proud of in a Sunday-night dinner.',
      accent: 'from-indigo-500 to-purple-500',
    },
    {
      icon: <Smile className="w-6 h-6" />,
      title: 'Sane operating hours',
      body: 'No-meeting Wednesdays, async by default, and a hard "no Slack after 19:00 local" norm. We measure outcomes, not green dots.',
      accent: 'from-pink-500 to-rose-500',
    },
  ]
  return (
    <section id="why-here" className="py-20 sm:py-24 bg-gray-50 dark:bg-gray-900/50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center mb-12">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
            Why people stay
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-300">
            The reasons our team gives in exit-ish interviews — except they're still here.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 max-w-6xl mx-auto">
          {reasons.map((r) => (
            <article
              key={r.title}
              className="group bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-200 dark:border-gray-800 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
            >
              <div
                className={`w-12 h-12 rounded-xl bg-gradient-to-br ${r.accent} text-white flex items-center justify-center shadow-md mb-4 group-hover:scale-110 transition-transform`}
              >
                {r.icon}
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">{r.title}</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">{r.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ============================================================
 *  BENEFITS
 * ============================================================ */
const BenefitsSection: React.FC = () => {
  const groups: {
    title: string
    items: { icon: React.ReactNode; label: string; sub: string }[]
  }[] = [
    {
      title: 'Health & wellbeing',
      items: [
        {
          icon: <HeartPulse className="w-5 h-5" />,
          label: 'Premium health insurance',
          sub: 'You + dependents, 100% covered',
        },
        {
          icon: <Heart className="w-5 h-5" />,
          label: 'Mental health stipend',
          sub: '$150/mo for therapy or coaching',
        },
        {
          icon: <Coffee className="w-5 h-5" />,
          label: 'Wellness budget',
          sub: '$80/mo for gym, yoga, or hobbies',
        },
      ],
    },
    {
      title: 'Time & flexibility',
      items: [
        {
          icon: <Plane className="w-5 h-5" />,
          label: '4 weeks PTO + holidays',
          sub: 'Plus 2 weeks of company-wide shutdown',
        },
        {
          icon: <Home className="w-5 h-5" />,
          label: 'Remote-first',
          sub: 'Work from anywhere in your timezone',
        },
        {
          icon: <Clock className="w-5 h-5" />,
          label: 'Flexible hours',
          sub: 'Async-first, ~4h overlap suggested',
        },
      ],
    },
    {
      title: 'Growth & ownership',
      items: [
        {
          icon: <PiggyBank className="w-5 h-5" />,
          label: 'Equity for all',
          sub: '4-year vest, 1-year cliff',
        },
        {
          icon: <GraduationCap className="w-5 h-5" />,
          label: 'Learning budget',
          sub: '$1,500/yr for courses, books, conferences',
        },
        {
          icon: <Users className="w-5 h-5" />,
          label: 'Twice-yearly offsites',
          sub: 'All-hands gatherings on rotating continents',
        },
      ],
    },
  ]
  return (
    <section className="py-20 sm:py-24">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center mb-12">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
            Benefits that actually{' '}
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              get used
            </span>
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-300">
            We track utilisation. If a benefit doesn't get used, we replace it with one that does.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {groups.map((g) => (
            <div
              key={g.title}
              className="bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-200 dark:border-gray-800 shadow-sm"
            >
              <h3 className="text-sm font-bold uppercase tracking-widest text-blue-600 dark:text-blue-400 mb-5">
                {g.title}
              </h3>
              <ul className="space-y-4">
                {g.items.map((it) => (
                  <li key={it.label} className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center flex-shrink-0">
                      {it.icon}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-gray-900 dark:text-white">
                        {it.label}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {it.sub}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ============================================================
 *  JOB BOARD
 * ============================================================ */
const JobBoard: React.FC = () => {
  const [query, setQuery] = useState('')
  const [dept, setDept] = useState<Department | 'All'>('All')
  const [loc, setLoc] = useState<LocationKey | 'All'>('All')
  const [type, setType] = useState<EmploymentType | 'All'>('All')
  const [remoteOnly, setRemoteOnly] = useState(false)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return ROLES.filter((r) => {
      if (dept !== 'All' && r.department !== dept) return false
      if (loc !== 'All' && r.location !== loc) return false
      if (type !== 'All' && r.type !== type) return false
      if (remoteOnly && !r.remote) return false
      if (q) {
        const hay = `${r.title} ${r.department} ${r.highlights.join(' ')}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
  }, [query, dept, loc, type, remoteOnly])

  const grouped = useMemo(() => {
    const map = new Map<Department, Role[]>()
    filtered.forEach((r) => {
      if (!map.has(r.department)) map.set(r.department, [])
      map.get(r.department)!.push(r)
    })
    return Array.from(map.entries())
  }, [filtered])

  const clearFilters = () => {
    setQuery('')
    setDept('All')
    setLoc('All')
    setType('All')
    setRemoteOnly(false)
  }

  const hasActiveFilters =
    !!query || dept !== 'All' || loc !== 'All' || type !== 'All' || remoteOnly

  return (
    <section id="open-roles" className="py-20 sm:py-24 bg-gray-50 dark:bg-gray-900/50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center mb-10">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
            Open roles
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-300">
            {ROLES.length} positions across {DEPARTMENTS.length} teams. Filter to find yours.
          </p>
        </div>

        {/* Filters */}
        <div className="max-w-6xl mx-auto bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm p-4 sm:p-5 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
            <div className="md:col-span-4 relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by title, team, or skill…"
                className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <FilterSelect
              className="md:col-span-3"
              value={dept}
              onChange={(v) => setDept(v as Department | 'All')}
              options={['All', ...DEPARTMENTS]}
              placeholder="All departments"
            />
            <FilterSelect
              className="md:col-span-2"
              value={loc}
              onChange={(v) => setLoc(v as LocationKey | 'All')}
              options={['All', ...LOCATIONS]}
              placeholder="All locations"
            />
            <FilterSelect
              className="md:col-span-2"
              value={type}
              onChange={(v) => setType(v as EmploymentType | 'All')}
              options={['All', ...EMPLOYMENT_TYPES]}
              placeholder="All types"
            />
            <label className="md:col-span-1 inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 cursor-pointer hover:border-blue-400 dark:hover:border-blue-500 transition">
              <input
                type="checkbox"
                checked={remoteOnly}
                onChange={(e) => setRemoteOnly(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Remote</span>
            </label>
          </div>

          {hasActiveFilters && (
            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                <Filter className="w-3.5 h-3.5" />
                <span>
                  {filtered.length} of {ROLES.length} role{filtered.length === 1 ? '' : 's'}
                </span>
              </div>
              <button
                onClick={clearFilters}
                className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline"
              >
                <X className="w-3 h-3" /> Clear filters
              </button>
            </div>
          )}
        </div>

        {/* Results */}
        <div className="max-w-6xl mx-auto">
          {filtered.length === 0 ? (
            <EmptyState onClear={clearFilters} />
          ) : (
            <div className="space-y-8">
              {grouped.map(([department, roles]) => (
                <div key={department}>
                  <div className="flex items-center gap-3 mb-3 px-1">
                    <div
                      className={`w-8 h-8 rounded-lg bg-gradient-to-br ${DEPT_ACCENTS[department]} text-white flex items-center justify-center shadow-md`}
                    >
                      {DEPT_ICONS[department]}
                    </div>
                    <h3 className="text-base font-bold text-gray-900 dark:text-white">
                      {department}
                    </h3>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {roles.length} role{roles.length === 1 ? '' : 's'}
                    </span>
                  </div>
                  <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
                    <ul className="divide-y divide-gray-100 dark:divide-gray-800">
                      {roles.map((r) => (
                        <RoleRow key={r.id} role={r} />
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

const FilterSelect: React.FC<{
  value: string
  onChange: (v: string) => void
  options: string[]
  placeholder: string
  className?: string
}> = ({ value, onChange, options, placeholder, className }) => (
  <div className={`relative ${className ?? ''}`}>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full appearance-none px-3 py-2.5 pr-9 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      aria-label={placeholder}
    >
      {options.map((o) => (
        <option key={o} value={o}>
          {o === 'All' ? placeholder : o}
        </option>
      ))}
    </select>
    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
  </div>
)

const RoleRow: React.FC<{ role: Role }> = ({ role }) => (
  <li>
    <a
      href={`#apply-${role.id}`}
      className="group block p-5 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h4 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition truncate">
            {role.title}
          </h4>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
            <span className="flex items-center gap-1">
              <MapPin className="w-3 h-3" /> {role.location}
              {role.remote && (
                <span className="ml-1 px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 text-[10px] font-semibold uppercase">
                  Remote
                </span>
              )}
            </span>
            <span className="flex items-center gap-1">
              <Briefcase className="w-3 h-3" /> {role.type}
            </span>
            <span className="flex items-center gap-1">
              <UserCheck className="w-3 h-3" /> {role.experience}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" /> Posted {role.posted}
            </span>
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {role.highlights.map((h) => (
              <span
                key={h}
                className="px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-[11px] text-gray-700 dark:text-gray-300"
              >
                {h}
              </span>
            ))}
          </div>
        </div>
        <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-blue-500 group-hover:translate-x-0.5 transition-all flex-shrink-0 mt-1" />
      </div>
    </a>
  </li>
)

const EmptyState: React.FC<{ onClear: () => void }> = ({ onClear }) => (
  <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-12 text-center">
    <div className="w-14 h-14 rounded-2xl bg-gray-100 dark:bg-gray-800 mx-auto mb-4 flex items-center justify-center">
      <Search className="w-6 h-6 text-gray-400" />
    </div>
    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
      No roles match your filters
    </h3>
    <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md mx-auto mb-5">
      We hire continuously — if your specialty isn't listed today, join the talent network and we'll
      reach out when something opens up.
    </p>
    <div className="flex flex-col sm:flex-row gap-3 items-center justify-center">
      <button
        onClick={onClear}
        className="px-5 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
      >
        Clear all filters
      </button>
      <a
        href="#talent-network"
        className="px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium inline-flex items-center gap-2"
      >
        Join talent network <ArrowRight className="w-4 h-4" />
      </a>
    </div>
  </div>
)

/* ============================================================
 *  HIRING PROCESS
 * ============================================================ */
const HiringProcess: React.FC = () => {
  const steps = [
    {
      icon: <Send className="w-4 h-4" />,
      title: 'Apply',
      duration: '15 min',
      body: 'Submit a CV and a short answer about why this role. No cover letter required.',
    },
    {
      icon: <FileText className="w-4 h-4" />,
      title: 'Recruiter screen',
      duration: '30 min',
      body: 'A grounded conversation about your experience, the role, and what you want next.',
    },
    {
      icon: <PhoneCall className="w-4 h-4" />,
      title: 'Hiring-manager interview',
      duration: '45 min',
      body: 'Deep dive into your past work. We ask for specifics, not theory.',
    },
    {
      icon: <Code2 className="w-4 h-4" />,
      title: 'Practical exercise',
      duration: '~2 hrs (your time)',
      body: 'A take-home or a live working session — your choice. Compensated for your time.',
    },
    {
      icon: <Users className="w-4 h-4" />,
      title: 'Team interviews',
      duration: '2 × 45 min',
      body: 'Meet 2-3 future teammates. We dig into collaboration, decision-making, and values.',
    },
    {
      icon: <Award className="w-4 h-4" />,
      title: 'Offer',
      duration: 'Within 48 hrs',
      body: 'Compensation, equity, start date. Transparent, with internal bands shared upfront.',
    },
  ]
  return (
    <section className="py-20 sm:py-24">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center mb-14">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
            How we hire
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-300">
            Six steps. Two to four weeks. No surprises, no take-homes that take a weekend.
          </p>
        </div>
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {steps.map((s, i) => (
            <div
              key={s.title}
              className="relative bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-200 dark:border-gray-800 shadow-sm hover:shadow-lg transition"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 text-white flex items-center justify-center shadow-md">
                  {s.icon}
                </div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-blue-600 dark:text-blue-400">
                  Step {i + 1}
                </span>
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">{s.title}</h3>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 mb-2.5 flex items-center gap-1">
                <Clock className="w-3 h-3" /> {s.duration}
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">{s.body}</p>
            </div>
          ))}
        </div>
        <div className="max-w-3xl mx-auto mt-10 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400 inline-flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-green-500" /> If at any point we're not the right
            fit, we'll tell you within 3 business days. No ghosting — ever.
          </p>
        </div>
      </div>
    </section>
  )
}

/* ============================================================
 *  LIFE AT
 * ============================================================ */
const LifeAtSection: React.FC = () => {
  const stories = [
    {
      quote:
        'I joined as the second engineer. Three years in, I lead the Workflows team and have shipped infrastructure used by every customer. The growth ceiling is wherever you stop pushing.',
      name: 'Aisha Bello',
      role: 'Engineering Lead · Workflows',
      tenure: 'Joined 2023',
      gradient: 'from-blue-500 to-cyan-500',
    },
    {
      quote:
        "What surprised me most was how seriously they take async work. I'm in São Paulo, my manager is in London, my team is everywhere — and I've never felt out of the loop.",
      name: 'Lucas Vieira',
      role: 'Senior Product Designer',
      tenure: 'Joined 2024',
      gradient: 'from-violet-500 to-fuchsia-500',
    },
    {
      quote:
        'Coming from a big bank, the difference was immediate: every feature I propose gets a real conversation, not a six-month committee. Customers feel that pace too.',
      name: 'Priya Raman',
      role: 'Compliance Solutions Architect',
      tenure: 'Joined 2024',
      gradient: 'from-emerald-500 to-teal-500',
    },
  ]
  return (
    <section className="py-20 sm:py-24 bg-gradient-to-b from-gray-50 to-white dark:from-gray-900/50 dark:to-gray-950">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center mb-12">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
            Life at DabiTech
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-300">
            Three teammates, three timezones, three honest takes.
          </p>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {stories.map((s) => (
            <article
              key={s.name}
              className="bg-white dark:bg-gray-900 rounded-2xl p-7 border border-gray-200 dark:border-gray-800 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col"
            >
              <Quote className="w-8 h-8 text-blue-500/30 mb-3" />
              <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed flex-1">
                "{s.quote}"
              </p>
              <div className="mt-6 pt-5 border-t border-gray-100 dark:border-gray-800 flex items-center gap-3">
                <div
                  className={`w-11 h-11 rounded-full bg-gradient-to-br ${s.gradient} text-white flex items-center justify-center font-bold text-sm`}
                >
                  {s.name
                    .split(' ')
                    .map((n) => n[0])
                    .join('')}
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                    {s.name}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{s.role}</div>
                  <div className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">
                    {s.tenure}
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>

        {/* Photo strip placeholder */}
        <div className="max-w-6xl mx-auto mt-12 grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            'Lisbon offsite · 2024',
            'Lagos hub · daily lunch',
            'London engineering jam',
            'Singapore launch party',
          ].map((caption, i) => (
            <div
              key={caption}
              className="group relative aspect-[4/3] rounded-xl overflow-hidden border border-gray-200 dark:border-gray-800"
            >
              <div
                className={`absolute inset-0 bg-gradient-to-br ${
                  [
                    'from-blue-500 to-purple-600',
                    'from-amber-500 to-rose-500',
                    'from-emerald-500 to-cyan-500',
                    'from-fuchsia-500 to-pink-500',
                  ][i]
                } opacity-90`}
              />
              <div className="absolute inset-0 flex items-end p-3">
                <span className="text-[11px] font-medium text-white drop-shadow">{caption}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ============================================================
 *  DIVERSITY & INCLUSION
 * ============================================================ */
const DiversityCommitment: React.FC = () => {
  const stats = [
    { value: '47%', label: 'Women in engineering' },
    { value: '14', label: 'Nationalities' },
    { value: '35%', label: 'First-generation hires' },
    { value: '100%', label: 'Pay parity audited annually' },
  ]
  return (
    <section className="py-20 sm:py-24">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto bg-white dark:bg-gray-900 rounded-3xl p-8 sm:p-12 border border-gray-200 dark:border-gray-800 shadow-sm grid lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-7">
            <p className="text-xs uppercase tracking-widest text-blue-600 dark:text-blue-400 font-semibold mb-3">
              Belonging
            </p>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4 leading-tight">
              We hire the person, not the pedigree.
            </h2>
            <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
              Our customers serve every kind of community — our team should reflect that.
              Compensation bands are public internally, hiring panels are intentionally diverse, and
              we audit pay parity by gender, geography, and tenure twice a year.
            </p>
            <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
              If you need an accommodation at any stage of the process, just tell your recruiter.
              We'll figure it out.
            </p>
          </div>
          <div className="lg:col-span-5">
            <div className="grid grid-cols-2 gap-3">
              {stats.map((s) => (
                <div
                  key={s.label}
                  className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border border-blue-100 dark:border-blue-900/40 rounded-xl p-5 text-center"
                >
                  <div className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    {s.value}
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400 mt-1.5 leading-snug">
                    {s.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ============================================================
 *  FAQ
 * ============================================================ */
const FAQSection: React.FC = () => {
  const [open, setOpen] = useState<number | null>(0)
  const faqs = [
    {
      q: 'Do you sponsor visas or relocations?',
      a: "Yes, for senior roles. We've sponsored UK, Singapore, and US work visas, and we cover relocation costs (flights, shipping, 60 days of corporate housing). For most roles, remote is a faster path.",
    },
    {
      q: 'What does compensation look like?',
      a: 'Base + equity + benefits. Base bands are benchmarked against Levels.fyi for our hub cities and adjusted by geography. Equity is meaningful — every full-time hire vests over 4 years with a 1-year cliff.',
    },
    {
      q: "I don't match every requirement on the job description. Should I still apply?",
      a: 'Yes. Our hiring managers explicitly look for slope over y-intercept. If 60-70% of the role excites you and the rest is learnable, apply.',
    },
    {
      q: 'Do you take referrals?',
      a: 'Always. If a current teammate refers you, we commit to a recruiter response within 5 business days, and we pay a referral bonus on successful hires.',
    },
    {
      q: 'How long does the process take end-to-end?',
      a: 'Two to four weeks for most roles, depending on calendar availability. We move as fast as you can — including weekend interviews if it helps.',
    },
    {
      q: "What if my role isn't listed?",
      a: 'Join the talent network below. We hire continuously across all teams, and recruiters proactively reach out when a matching role opens.',
    },
  ]
  return (
    <section className="py-20 sm:py-24 bg-gray-50 dark:bg-gray-900/50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center mb-12">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
            Candidate FAQ
          </h2>
        </div>
        <div className="max-w-3xl mx-auto space-y-3">
          {faqs.map((f, i) => {
            const isOpen = open === i
            return (
              <div
                key={i}
                className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden"
              >
                <button
                  onClick={() => setOpen(isOpen ? null : i)}
                  className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-50 dark:hover:bg-gray-800/50"
                  aria-expanded={isOpen}
                >
                  <span className="font-semibold text-gray-900 dark:text-white text-sm sm:text-base">
                    {f.q}
                  </span>
                  <ChevronDown
                    className={`w-5 h-5 text-gray-500 transition-transform flex-shrink-0 ml-4 ${isOpen ? 'rotate-180' : ''}`}
                  />
                </button>
                {isOpen && (
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
 *  TALENT NETWORK CTA
 * ============================================================ */
const TalentNetworkCTA: React.FC = () => {
  const [email, setEmail] = useState('')
  const [interest, setInterest] = useState<Department | ''>('')
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)

  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault()
    setError(null)
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please enter a valid email address.')
      return
    }
    setStatus('submitting')
    try {
      await new Promise((r) => setTimeout(r, 900))
      setStatus('success')
    } catch {
      setStatus('error')
    }
  }

  return (
    <section id="talent-network" className="py-20 sm:py-24">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto bg-gradient-to-br from-blue-600 via-blue-700 to-purple-700 rounded-3xl p-10 sm:p-14 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />

          <div className="relative grid lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-6 text-white">
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4 leading-tight">
                Don't see the right role?
              </h2>
              <p className="text-blue-100 text-lg leading-relaxed mb-6">
                Join the talent network. We'll email you only when a matching role opens — no spam,
                no marketing, no "are you still interested?" pings.
              </p>
              <ul className="space-y-2 text-sm text-blue-50">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-blue-200" /> Notified before public posting
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-blue-200" /> Direct line to a recruiter
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-blue-200" /> Unsubscribe in one click
                </li>
              </ul>
              <div className="flex items-center gap-3 mt-6">
                <a
                  href="#"
                  aria-label="LinkedIn"
                  className="w-9 h-9 rounded-lg bg-white/15 hover:bg-white/25 flex items-center justify-center text-white transition"
                >
                  <Linkedin className="w-4 h-4" />
                </a>
                <a
                  href="#"
                  aria-label="X / Twitter"
                  className="w-9 h-9 rounded-lg bg-white/15 hover:bg-white/25 flex items-center justify-center text-white transition"
                >
                  <Twitter className="w-4 h-4" />
                </a>
                <a
                  href="#"
                  aria-label="GitHub"
                  className="w-9 h-9 rounded-lg bg-white/15 hover:bg-white/25 flex items-center justify-center text-white transition"
                >
                  <Github className="w-4 h-4" />
                </a>
              </div>
            </div>

            <div className="lg:col-span-6">
              {status === 'success' ? (
                <div className="bg-white/95 dark:bg-gray-900/95 rounded-2xl p-8 text-center backdrop-blur-sm">
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 text-white flex items-center justify-center mx-auto mb-4 shadow-lg">
                    <CheckCircle2 className="w-7 h-7" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                    You're on the list
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    We'll be in touch the moment something matches. In the meantime, follow us on
                    LinkedIn for behind-the-scenes posts.
                  </p>
                </div>
              ) : (
                <form
                  onSubmit={submit}
                  className="bg-white dark:bg-gray-900 rounded-2xl p-6 sm:p-7 shadow-xl"
                  noValidate
                >
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
                    Join the talent network
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-5">
                    Two fields. Thirty seconds.
                  </p>
                  <div className="space-y-3">
                    <div>
                      <label
                        htmlFor="tn-email"
                        className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-1.5"
                      >
                        Work email
                      </label>
                      <input
                        id="tn-email"
                        type="email"
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value)
                          setError(null)
                        }}
                        placeholder="you@company.com"
                        autoComplete="email"
                        className={`w-full px-3.5 py-2.5 rounded-lg border bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition ${
                          error
                            ? 'border-red-400 dark:border-red-500'
                            : 'border-gray-300 dark:border-gray-700 focus:border-blue-500'
                        }`}
                      />
                      {error && (
                        <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" /> {error}
                        </p>
                      )}
                    </div>
                    <div>
                      <label
                        htmlFor="tn-dept"
                        className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-1.5"
                      >
                        Area of interest
                      </label>
                      <div className="relative">
                        <select
                          id="tn-dept"
                          value={interest}
                          onChange={(e) => setInterest(e.target.value as Department | '')}
                          className="w-full appearance-none px-3.5 py-2.5 pr-9 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="">Choose a team…</option>
                          {DEPARTMENTS.map((d) => (
                            <option key={d} value={d}>
                              {d}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                      </div>
                    </div>
                    <button
                      type="submit"
                      disabled={status === 'submitting'}
                      className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all"
                    >
                      {status === 'submitting' ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" /> Subscribing…
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4" /> Notify me
                        </>
                      )}
                    </button>
                    <p className="text-[11px] text-gray-400 dark:text-gray-500 text-center">
                      We never share your details. Unsubscribe anytime.
                    </p>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default CareersPage
