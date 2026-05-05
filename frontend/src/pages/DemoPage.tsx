import React, { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  Play,
  Pause,
  CheckCircle2,
  XCircle,
  FolderTree,
  FileText,
  GitBranch,
  GraduationCap,
  ShieldCheck,
  Search,
  Upload,
  Download,
  Eye,
  Lock,
  Users,
  Zap,
  Clock,
  TrendingUp,
  Award,
  Server,
  Database,
  Cloud,
  Cpu,
  Star,
  ChevronDown,
  Sparkles,
  Activity,
  BarChart3,
  Folder,
  FileCheck2,
  Bell,
  MessageSquare,
  CircleDot,
  Filter,
} from 'lucide-react'
import { useTheme } from '../hooks/useTheme'
import LandingHeader from '../components/Landing/LandingHeader'
import Footer from '../components/Landing/Footer'

type DemoModule = 'documents' | 'procedures' | 'workflows' | 'training' | 'compliance'

interface ModuleDef {
  id: DemoModule
  label: string
  icon: React.ReactNode
  tagline: string
  accent: string
  features: string[]
}

const MODULES: ModuleDef[] = [
  {
    id: 'documents',
    label: 'Document Management',
    icon: <FolderTree className="w-5 h-5" />,
    tagline: 'Organize, secure, and search every document with bank-grade controls.',
    accent: 'from-blue-500 to-cyan-500',
    features: [
      'Unlimited nested folders with drag-and-drop',
      'AES-256 encryption at rest, TLS 1.3 in transit',
      'Full-text search across PDF, Word, Excel & scans (OCR)',
      'Versioning with restore + side-by-side compare',
      'Confidentiality labels: Public / Internal / Confidential / Highly Confidential',
    ],
  },
  {
    id: 'procedures',
    label: 'Procedure Authoring',
    icon: <FileText className="w-5 h-5" />,
    tagline: 'Author rich, multi-step operating procedures with branching logic and quizzes.',
    accent: 'from-indigo-500 to-purple-500',
    features: [
      'Drag-and-drop step builder (text, video, document)',
      'Step-level and end-of-procedure quizzes',
      'Multi-version control with diff viewer',
      'Mandatory vs optional steps with time estimates',
      'Reviewer routing & published-version locking',
    ],
  },
  {
    id: 'workflows',
    label: 'Approval Workflows',
    icon: <GitBranch className="w-5 h-5" />,
    tagline: 'Design parallel and sequential approvals with SLA tracking and escalation.',
    accent: 'from-violet-500 to-fuchsia-500',
    features: [
      'Visual workflow designer (drag & drop)',
      'Parallel + sequential reviewer paths',
      'SLA timers with auto-escalation',
      'Conditional routing by metadata or department',
      'Real-time status dashboard for managers',
    ],
  },
  {
    id: 'training',
    label: 'Training & Quizzes',
    icon: <GraduationCap className="w-5 h-5" />,
    tagline: 'Turn published procedures into auditable training with auto-graded quizzes.',
    accent: 'from-emerald-500 to-teal-500',
    features: [
      'One-click assign by user, department, or role',
      'Step-by-step training player with progress save',
      'Auto-graded MCQ, true/false, ordering & short-answer',
      'Pass-rate thresholds & retry limits',
      'Exportable compliance evidence (CSV/PDF)',
    ],
  },
  {
    id: 'compliance',
    label: 'Audit & Compliance',
    icon: <ShieldCheck className="w-5 h-5" />,
    tagline: 'Immutable audit trail, retention enforcement, and regulator-ready reports.',
    accent: 'from-amber-500 to-orange-500',
    features: [
      'Append-only audit log (who / what / when / from where)',
      'Automated retention policies & legal hold',
      'GDPR / KYC / AML / SOX-ready report templates',
      'MFA, SSO/SAML, and role-based access control',
      'Anomaly detection on access patterns',
    ],
  },
]

const DemoPage: React.FC = () => {
  const navigate = useNavigate()
  const { theme, setTheme } = useTheme()
  const [activeModule, setActiveModule] = useState<DemoModule>('documents')
  const [isAutoPlaying, setIsAutoPlaying] = useState(true)
  const [openFaq, setOpenFaq] = useState<number | null>(0)

  const cycleTheme = () => {
    if (theme === 'light') setTheme('dark')
    else if (theme === 'dark') setTheme('system')
    else setTheme('light')
  }

  // Auto-cycle the active module every 7s
  useEffect(() => {
    if (!isAutoPlaying) return
    const id = window.setInterval(() => {
      setActiveModule((current) => {
        const idx = MODULES.findIndex((m) => m.id === current)
        return MODULES[(idx + 1) % MODULES.length].id
      })
    }, 7000)
    return () => window.clearInterval(id)
  }, [isAutoPlaying])

  const activeDef = MODULES.find((m) => m.id === activeModule)!

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-950 transition-colors duration-300">
      <LandingHeader theme={theme} onToggleTheme={cycleTheme} onNavigate={navigate} />

      <main>
        <DemoHero onNavigate={navigate} />

        <ProductTour
          modules={MODULES}
          activeModule={activeModule}
          activeDef={activeDef}
          onSelect={(id) => {
            setActiveModule(id)
            setIsAutoPlaying(false)
          }}
          isAutoPlaying={isAutoPlaying}
          onToggleAutoPlay={() => setIsAutoPlaying((p) => !p)}
        />

        <KPIShowcase />

        <ArchitectureSection />

        <ComparisonTable />

        <CustomerLogos />

        <Testimonials />

        <FAQSection openFaq={openFaq} setOpenFaq={setOpenFaq} />

        <FinalCTA onNavigate={navigate} />
      </main>

      <Footer onNavigate={navigate} />
    </div>
  )
}

/* ============================================================
 *  HERO
 * ============================================================ */
const DemoHero: React.FC<{ onNavigate: (path: string) => void }> = ({ onNavigate }) => {
  return (
    <section className="relative pt-32 sm:pt-40 pb-16 sm:pb-24 overflow-hidden">
      {/* Animated gradient blob backdrop */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-20 left-1/4 w-96 h-96 bg-blue-400/20 dark:bg-blue-500/15 rounded-full blur-3xl animate-pulse" />
        <div
          className="absolute top-40 right-1/4 w-96 h-96 bg-purple-400/20 dark:bg-purple-500/15 rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: '1s' }}
        />
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-purple-600 px-4 py-2 rounded-full mb-6 shadow-lg">
            <Sparkles className="w-4 h-4 text-white" />
            <span className="text-sm font-semibold text-white tracking-wide">
              LIVE INTERACTIVE DEMO
            </span>
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-gray-900 dark:text-white mb-6 leading-tight">
            See the platform
            <br />
            <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 dark:from-blue-400 dark:via-purple-400 dark:to-pink-400 bg-clip-text text-transparent">
              in action — no signup required
            </span>
          </h1>

          <p className="text-lg sm:text-xl text-gray-600 dark:text-gray-300 mb-10 max-w-2xl mx-auto leading-relaxed">
            Explore every module of the Digital Filing Cabinet — documents, procedures, workflows,
            training, and compliance — with realistic data and interactive mock UIs.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={() => onNavigate('/register')}
              className="group w-full sm:w-auto px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-0.5 flex items-center justify-center space-x-2"
            >
              <span>Start 14-Day Free Trial</span>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
            <a
              href="#tour"
              className="w-full sm:w-auto px-8 py-4 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-900 dark:text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 border-2 border-gray-200 dark:border-gray-700 flex items-center justify-center space-x-2"
            >
              <Play className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <span>Take the Tour</span>
            </a>
          </div>

          {/* Quick stats strip */}
          <div className="mt-14 grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-3xl mx-auto">
            <StatPill icon={<Users className="w-4 h-4" />} value="500+" label="Institutions" />
            <StatPill icon={<FileText className="w-4 h-4" />} value="12M+" label="Documents" />
            <StatPill icon={<Clock className="w-4 h-4" />} value="<1s" label="Search latency" />
            <StatPill icon={<TrendingUp className="w-4 h-4" />} value="99.99%" label="Uptime SLA" />
          </div>
        </div>
      </div>
    </section>
  )
}

const StatPill: React.FC<{ icon: React.ReactNode; value: string; label: string }> = ({
  icon,
  value,
  label,
}) => (
  <div className="bg-white/70 dark:bg-gray-800/60 backdrop-blur-sm border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 flex items-center justify-center gap-3 shadow-sm">
    <span className="text-blue-600 dark:text-blue-400">{icon}</span>
    <div className="text-left">
      <div className="text-lg font-bold text-gray-900 dark:text-white leading-none">{value}</div>
      <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{label}</div>
    </div>
  </div>
)

/* ============================================================
 *  PRODUCT TOUR (TABBED MOCK UIs)
 * ============================================================ */
const ProductTour: React.FC<{
  modules: ModuleDef[]
  activeModule: DemoModule
  activeDef: ModuleDef
  onSelect: (id: DemoModule) => void
  isAutoPlaying: boolean
  onToggleAutoPlay: () => void
}> = ({ modules, activeModule, activeDef, onSelect, isAutoPlaying, onToggleAutoPlay }) => {
  return (
    <section id="tour" className="py-20 sm:py-28 bg-gray-50 dark:bg-gray-900/50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center mb-12">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
            One platform.{' '}
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Five powerful modules.
            </span>
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-300">
            Click any module below to explore a live, interactive preview of the workspace.
          </p>
        </div>

        {/* Module tab strip */}
        <div className="max-w-6xl mx-auto mb-8">
          <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
            {modules.map((m) => {
              const isActive = m.id === activeModule
              return (
                <button
                  key={m.id}
                  onClick={() => onSelect(m.id)}
                  className={`flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-full text-sm font-semibold transition-all duration-200 border ${
                    isActive
                      ? `text-white shadow-lg bg-gradient-to-r ${m.accent} border-transparent`
                      : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-500'
                  }`}
                >
                  {m.icon}
                  <span className="hidden sm:inline">{m.label}</span>
                  <span className="sm:hidden">{m.label.split(' ')[0]}</span>
                </button>
              )
            })}
            <button
              onClick={onToggleAutoPlay}
              className="ml-2 flex items-center gap-1.5 px-3 py-2.5 rounded-full text-xs font-medium bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
              aria-label={isAutoPlaying ? 'Pause auto tour' : 'Play auto tour'}
            >
              {isAutoPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              {isAutoPlaying ? 'Auto' : 'Paused'}
            </button>
          </div>
        </div>

        {/* Active module showcase */}
        <div className="max-w-7xl mx-auto grid lg:grid-cols-12 gap-8 items-start">
          {/* Left side: copy + features */}
          <div className="lg:col-span-4">
            <div
              className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold text-white bg-gradient-to-r ${activeDef.accent} mb-4`}
            >
              {activeDef.icon}
              <span>{activeDef.label}</span>
            </div>
            <h3 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-4">
              {activeDef.tagline}
            </h3>
            <ul className="space-y-3">
              {activeDef.features.map((f) => (
                <li key={f} className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed">
                    {f}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Right side: interactive preview */}
          <div className="lg:col-span-8">
            <BrowserChrome accent={activeDef.accent}>
              {activeModule === 'documents' && <DocumentsPreview />}
              {activeModule === 'procedures' && <ProceduresPreview />}
              {activeModule === 'workflows' && <WorkflowsPreview />}
              {activeModule === 'training' && <TrainingPreview />}
              {activeModule === 'compliance' && <CompliancePreview />}
            </BrowserChrome>
          </div>
        </div>
      </div>
    </section>
  )
}

const BrowserChrome: React.FC<{ children: React.ReactNode; accent: string }> = ({
  children,
  accent,
}) => (
  <div className="rounded-2xl overflow-hidden shadow-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
    {/* Top chrome */}
    <div className="flex items-center gap-2 px-4 py-3 bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
      <div className="flex gap-1.5">
        <div className="w-3 h-3 rounded-full bg-red-400" />
        <div className="w-3 h-3 rounded-full bg-yellow-400" />
        <div className="w-3 h-3 rounded-full bg-green-400" />
      </div>
      <div
        className={`flex-1 mx-4 px-3 py-1 rounded-md bg-white dark:bg-gray-900 text-xs text-gray-500 dark:text-gray-400 truncate flex items-center gap-2 border border-gray-200 dark:border-gray-700`}
      >
        <Lock className="w-3 h-3 text-green-500" />
        <span>app.dabitech.com/dashboard</span>
      </div>
      <div className={`w-2 h-2 rounded-full bg-gradient-to-r ${accent}`} />
    </div>
    {children}
  </div>
)

/* ---- Module 1: Documents ---- */
const DocumentsPreview: React.FC = () => {
  const folders = [
    { name: 'Customer Records', count: 1248, expanded: true },
    { name: 'Loans & Credit', count: 524, expanded: false },
    { name: 'Compliance', count: 312, expanded: false },
    { name: 'Internal Audit', count: 89, expanded: false },
  ]
  const docs = [
    {
      name: '2025-04-18_KYC_Passport_V2.pdf',
      type: 'PDF',
      size: '1.2 MB',
      conf: 'Highly Confidential',
      color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
      modified: '2h ago',
    },
    {
      name: '2025-Q1_Compliance_Report.docx',
      type: 'DOCX',
      size: '842 KB',
      conf: 'Confidential',
      color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
      modified: '5h ago',
    },
    {
      name: 'Loan_Agreement_LN-44219.pdf',
      type: 'PDF',
      size: '3.4 MB',
      conf: 'Internal',
      color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
      modified: '1d ago',
    },
    {
      name: 'Branch_Risk_Memo.xlsx',
      type: 'XLSX',
      size: '210 KB',
      conf: 'Public',
      color: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
      modified: '2d ago',
    },
  ]

  return (
    <div className="grid grid-cols-12 h-[420px] sm:h-[460px] text-sm">
      {/* Folder tree */}
      <aside className="col-span-4 sm:col-span-3 bg-gray-50 dark:bg-gray-950/50 border-r border-gray-200 dark:border-gray-800 p-3 overflow-y-auto">
        <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2 px-1">
          Departments
        </div>
        {folders.map((f, i) => (
          <div
            key={f.name}
            className={`flex items-center justify-between px-2 py-2 rounded-lg cursor-pointer ${
              i === 0
                ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
            }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              <Folder className="w-4 h-4 flex-shrink-0" />
              <span className="truncate">{f.name}</span>
            </div>
            <span className="text-[10px] text-gray-500 dark:text-gray-400 ml-2">{f.count}</span>
          </div>
        ))}
      </aside>

      {/* Center content */}
      <main className="col-span-8 sm:col-span-9 flex flex-col">
        {/* Toolbar */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-200 dark:border-gray-800">
          <div className="flex-1 relative">
            <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              readOnly
              value="passport KYC 2025"
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-md bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 focus:outline-none"
            />
          </div>
          <button className="px-2 py-1.5 rounded-md bg-blue-600 text-white text-xs font-medium flex items-center gap-1">
            <Upload className="w-3.5 h-3.5" /> Upload
          </button>
          <button className="px-2 py-1.5 rounded-md border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-xs font-medium flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Doc list */}
        <div className="flex-1 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-800">
          {docs.map((d) => (
            <div
              key={d.name}
              className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-md bg-gradient-to-br from-blue-500 to-cyan-500 text-white flex items-center justify-center text-[10px] font-bold flex-shrink-0">
                  {d.type}
                </div>
                <div className="min-w-0">
                  <div className="text-gray-900 dark:text-white font-medium truncate text-xs sm:text-sm">
                    {d.name}
                  </div>
                  <div className="text-[10px] text-gray-500 dark:text-gray-400">
                    {d.size} · Modified {d.modified}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${d.color}`}>
                  {d.conf}
                </span>
                <button className="hidden sm:flex p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700">
                  <Eye className="w-3.5 h-3.5 text-gray-500" />
                </button>
                <button className="hidden sm:flex p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700">
                  <Download className="w-3.5 h-3.5 text-gray-500" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Footer status */}
        <div className="border-t border-gray-200 dark:border-gray-800 px-4 py-2 text-[10px] text-gray-500 dark:text-gray-400 flex justify-between">
          <span>4 of 1,248 results</span>
          <span className="flex items-center gap-1">
            <CircleDot className="w-2.5 h-2.5 text-green-500" /> Live · Indexed
          </span>
        </div>
      </main>
    </div>
  )
}

/* ---- Module 2: Procedures ---- */
const ProceduresPreview: React.FC = () => {
  const steps = [
    { n: 1, title: 'Verify customer identity (KYC)', type: 'Document', mins: 5, done: true },
    { n: 2, title: 'Watch onboarding video', type: 'Video', mins: 8, done: true },
    {
      n: 3,
      title: 'Capture signed consent form',
      type: 'Document',
      mins: 3,
      done: false,
      current: true,
    },
    { n: 4, title: 'Quiz: AML compliance basics', type: 'Quiz', mins: 10, done: false },
    { n: 5, title: 'Manager final approval', type: 'Approval', mins: 2, done: false },
  ]
  return (
    <div className="grid grid-cols-12 h-[420px] sm:h-[460px] text-sm">
      <aside className="col-span-5 sm:col-span-4 bg-gray-50 dark:bg-gray-950/50 border-r border-gray-200 dark:border-gray-800 p-4 overflow-y-auto">
        <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
          Procedure Steps
        </div>
        <div className="space-y-2">
          {steps.map((s) => (
            <div
              key={s.n}
              className={`p-2.5 rounded-lg border transition ${
                s.current
                  ? 'bg-indigo-50 dark:bg-indigo-900/30 border-indigo-300 dark:border-indigo-700'
                  : s.done
                    ? 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800'
                    : 'bg-white/50 dark:bg-gray-900/50 border-gray-200 dark:border-gray-800'
              }`}
            >
              <div className="flex items-start gap-2">
                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5 ${
                    s.done
                      ? 'bg-green-500 text-white'
                      : s.current
                        ? 'bg-indigo-500 text-white'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                  }`}
                >
                  {s.done ? '✓' : s.n}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-medium text-gray-900 dark:text-white leading-tight">
                    {s.title}
                  </div>
                  <div className="text-[10px] text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-1.5">
                    <span>{s.type}</span>
                    <span>·</span>
                    <Clock className="w-2.5 h-2.5" />
                    <span>{s.mins}m</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </aside>

      <main className="col-span-7 sm:col-span-8 flex flex-col bg-white dark:bg-gray-900">
        <div className="px-5 py-3 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
          <div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Step 3 of 5</div>
            <div className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white">
              Capture signed consent form
            </div>
          </div>
          <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 text-[10px] font-semibold">
            MANDATORY
          </span>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <p className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
              Upload the customer's signed consent form. Ensure both pages are scanned, the
              signature is visible, and the date matches today's onboarding session.
            </p>
          </div>

          {/* Upload zone */}
          <div className="mt-4 border-2 border-dashed border-indigo-300 dark:border-indigo-700 rounded-xl p-6 text-center bg-indigo-50/50 dark:bg-indigo-900/10">
            <Upload className="w-8 h-8 text-indigo-500 mx-auto mb-2" />
            <div className="text-xs font-medium text-gray-900 dark:text-white">
              Drop file here or click to upload
            </div>
            <div className="text-[10px] text-gray-500 dark:text-gray-400 mt-1">
              PDF, JPG, PNG · Max 25 MB
            </div>
          </div>

          {/* Captured */}
          <div className="mt-3 flex items-center gap-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
            <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
            <div className="text-xs text-green-700 dark:text-green-300 flex-1">
              consent_form_J.Smith.pdf · 1.4 MB
            </div>
            <button className="text-[10px] text-green-700 dark:text-green-300 font-medium">
              Replace
            </button>
          </div>
        </div>

        <div className="border-t border-gray-200 dark:border-gray-800 px-5 py-3 flex justify-between items-center">
          <button className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300">
            ← Back
          </button>
          <button className="px-4 py-1.5 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold flex items-center gap-1.5">
            Continue <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </main>
    </div>
  )
}

/* ---- Module 3: Workflows ---- */
const WorkflowsPreview: React.FC = () => {
  return (
    <div className="h-[420px] sm:h-[460px] bg-gradient-to-br from-violet-50 to-fuchsia-50 dark:from-gray-950 dark:to-gray-900 p-6 overflow-hidden">
      <div className="flex items-center justify-between mb-5">
        <div>
          <div className="text-xs text-gray-500 dark:text-gray-400">Workflow</div>
          <div className="text-base font-semibold text-gray-900 dark:text-white">
            Loan Approval · LN-44219
          </div>
        </div>
        <span className="px-2.5 py-1 rounded-full bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300 text-[10px] font-semibold flex items-center gap-1">
          <Activity className="w-3 h-3" /> IN PROGRESS
        </span>
      </div>

      {/* Flow diagram */}
      <div className="relative">
        <div className="grid grid-cols-5 gap-2 sm:gap-3">
          <FlowNode
            label="Submitted"
            sub="Jane S."
            status="done"
            icon={<Upload className="w-4 h-4" />}
          />
          <FlowConnector status="done" />
          <FlowNode
            label="Compliance"
            sub="Mark T."
            status="done"
            icon={<ShieldCheck className="w-4 h-4" />}
          />
          <FlowConnector status="active" />
          <FlowNode
            label="Risk Review"
            sub="2 reviewers"
            status="active"
            icon={<BarChart3 className="w-4 h-4" />}
          />
        </div>
        <div className="grid grid-cols-5 gap-2 sm:gap-3 mt-6">
          <div className="col-span-3" />
          <FlowConnector status="pending" />
          <FlowNode
            label="Director"
            sub="Pending"
            status="pending"
            icon={<Award className="w-4 h-4" />}
          />
        </div>
      </div>

      {/* Sidebar/details */}
      <div className="grid grid-cols-2 gap-3 mt-8">
        <div className="bg-white dark:bg-gray-900 rounded-xl p-4 border border-gray-200 dark:border-gray-800">
          <div className="text-[10px] uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2 font-semibold">
            SLA
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-bold text-gray-900 dark:text-white">14h</span>
            <span className="text-xs text-gray-500 dark:text-gray-400">/ 48h remaining</span>
          </div>
          <div className="h-1.5 bg-gray-200 dark:bg-gray-800 rounded-full mt-2 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-green-500 to-emerald-500"
              style={{ width: '70%' }}
            />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl p-4 border border-gray-200 dark:border-gray-800">
          <div className="text-[10px] uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2 font-semibold">
            Recent activity
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-xs text-gray-700 dark:text-gray-300">
              <CheckCircle2 className="w-3 h-3 text-green-500" /> Compliance approved · 2h ago
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-700 dark:text-gray-300">
              <Bell className="w-3 h-3 text-blue-500" /> Risk team notified · 3h ago
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

const FlowNode: React.FC<{
  label: string
  sub: string
  status: 'done' | 'active' | 'pending'
  icon: React.ReactNode
}> = ({ label, sub, status, icon }) => {
  const styles = {
    done: 'bg-green-500 text-white border-green-600',
    active:
      'bg-violet-500 text-white border-violet-600 ring-4 ring-violet-200 dark:ring-violet-900/40 animate-pulse',
    pending: 'bg-white dark:bg-gray-900 text-gray-400 border-gray-300 dark:border-gray-700',
  }[status]
  return (
    <div className="flex flex-col items-center text-center">
      <div
        className={`w-12 h-12 rounded-xl border-2 flex items-center justify-center shadow-sm ${styles}`}
      >
        {icon}
      </div>
      <div className="mt-2 text-[11px] font-semibold text-gray-900 dark:text-white">{label}</div>
      <div className="text-[10px] text-gray-500 dark:text-gray-400">{sub}</div>
    </div>
  )
}

const FlowConnector: React.FC<{ status: 'done' | 'active' | 'pending' }> = ({ status }) => {
  const color =
    status === 'done'
      ? 'bg-green-500'
      : status === 'active'
        ? 'bg-violet-500'
        : 'bg-gray-300 dark:bg-gray-700'
  return (
    <div className="flex items-center justify-center pt-6">
      <div className={`h-0.5 w-full ${color}`} />
    </div>
  )
}

/* ---- Module 4: Training ---- */
const TrainingPreview: React.FC = () => {
  const options = [
    {
      letter: 'A',
      text: 'Notify the customer immediately by phone',
      correct: false,
      selected: false,
    },
    {
      letter: 'B',
      text: 'File a Suspicious Activity Report (SAR) with FIU within 24h',
      correct: true,
      selected: true,
    },
    {
      letter: 'C',
      text: 'Process the transaction and review next month',
      correct: false,
      selected: false,
    },
    { letter: 'D', text: 'Forward the email to the IT helpdesk', correct: false, selected: false },
  ]
  return (
    <div className="h-[420px] sm:h-[460px] flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-5 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white">
        <div className="flex items-center gap-2">
          <GraduationCap className="w-4 h-4" />
          <div>
            <div className="text-xs font-semibold">AML Compliance Quiz</div>
            <div className="text-[10px] opacity-90">Question 3 of 5</div>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <Clock className="w-3.5 h-3.5" /> 04:32
        </div>
      </div>
      {/* Progress */}
      <div className="h-1 bg-white/30">
        <div className="h-full bg-white" style={{ width: '60%' }} />
      </div>

      <div className="flex-1 p-5 sm:p-6 overflow-y-auto bg-white dark:bg-gray-900">
        <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">
          Multiple choice · 1 correct
        </div>
        <h4 className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white mb-4 leading-relaxed">
          A high-net-worth client requests an unusual cross-border wire transfer with no business
          justification. What is the correct first action?
        </h4>
        <div className="space-y-2">
          {options.map((o) => (
            <div
              key={o.letter}
              className={`flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition ${
                o.selected
                  ? o.correct
                    ? 'bg-green-50 dark:bg-green-900/20 border-green-400 dark:border-green-600'
                    : 'bg-red-50 dark:bg-red-900/20 border-red-400 dark:border-red-600'
                  : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 hover:border-emerald-400'
              }`}
            >
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${
                  o.selected
                    ? o.correct
                      ? 'bg-green-500 text-white'
                      : 'bg-red-500 text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                }`}
              >
                {o.letter}
              </div>
              <div className="text-xs text-gray-900 dark:text-white flex-1 leading-relaxed">
                {o.text}
              </div>
              {o.selected &&
                (o.correct ? (
                  <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                ))}
            </div>
          ))}
        </div>

        <div className="mt-4 p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-emerald-200 dark:border-emerald-800">
          <div className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 mb-1">
            Why this is correct
          </div>
          <div className="text-[11px] text-emerald-700 dark:text-emerald-300/90 leading-relaxed">
            Filing a SAR within the regulator-mandated 24h window is required by AML/CFT
            regulations. Notifying the customer is "tipping off" — a criminal offence in most
            jurisdictions.
          </div>
        </div>
      </div>

      <div className="border-t border-gray-200 dark:border-gray-800 px-5 py-3 flex justify-between items-center bg-white dark:bg-gray-900">
        <div className="text-[11px] text-gray-500 dark:text-gray-400">
          Pass score: 80% · 2 attempts remaining
        </div>
        <button className="px-4 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1.5">
          Next question <ArrowRight className="w-3 h-3" />
        </button>
      </div>
    </div>
  )
}

/* ---- Module 5: Compliance / Audit ---- */
const CompliancePreview: React.FC = () => {
  const events = [
    {
      time: '14:32:18',
      user: 'jane.smith',
      action: 'DOWNLOADED',
      target: 'KYC_Passport_V2.pdf',
      ip: '10.42.1.18',
      ok: true,
    },
    {
      time: '14:30:02',
      user: 'mark.tobias',
      action: 'APPROVED',
      target: 'Loan LN-44219',
      ip: '10.42.1.5',
      ok: true,
    },
    {
      time: '14:28:51',
      user: 'unknown',
      action: 'LOGIN_FAILED',
      target: '4 attempts',
      ip: '203.0.113.42',
      ok: false,
    },
    {
      time: '14:25:14',
      user: 'admin',
      action: 'PERMISSION_CHANGED',
      target: 'Compliance/* — granted to Risk',
      ip: '10.42.1.1',
      ok: true,
    },
    {
      time: '14:22:09',
      user: 'sara.k',
      action: 'UPLOADED',
      target: '2025-Q1_Compliance_Report.docx',
      ip: '10.42.1.31',
      ok: true,
    },
  ]
  return (
    <div className="h-[420px] sm:h-[460px] flex flex-col bg-white dark:bg-gray-900">
      {/* KPI strip */}
      <div className="grid grid-cols-4 gap-px bg-gray-200 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-800">
        <CompKPI label="Events today" value="14,832" tone="text-gray-900 dark:text-white" />
        <CompKPI label="Failed logins" value="7" tone="text-amber-600 dark:text-amber-400" />
        <CompKPI label="Anomalies" value="2" tone="text-red-600 dark:text-red-400" />
        <CompKPI
          label="Retention compliant"
          value="100%"
          tone="text-green-600 dark:text-green-400"
        />
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-gray-200 dark:border-gray-800 text-[11px]">
        <span className="text-gray-500 dark:text-gray-400">Filters:</span>
        <span className="px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
          Last 24h
        </span>
        <span className="px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300">
          High severity
        </span>
        <span className="px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
          + Add filter
        </span>
      </div>

      {/* Audit log table */}
      <div className="flex-1 overflow-y-auto">
        <table className="w-full text-[11px] sm:text-xs">
          <thead className="sticky top-0 bg-gray-50 dark:bg-gray-950 text-gray-500 dark:text-gray-400 uppercase">
            <tr>
              <th className="text-left px-4 py-2 font-semibold">Time</th>
              <th className="text-left px-4 py-2 font-semibold">User</th>
              <th className="text-left px-4 py-2 font-semibold">Action</th>
              <th className="text-left px-4 py-2 font-semibold hidden sm:table-cell">Resource</th>
              <th className="text-left px-4 py-2 font-semibold hidden md:table-cell">IP</th>
              <th className="text-right px-4 py-2 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {events.map((e, i) => (
              <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                <td className="px-4 py-2 font-mono text-gray-500 dark:text-gray-400">{e.time}</td>
                <td className="px-4 py-2 text-gray-900 dark:text-white font-medium">{e.user}</td>
                <td className="px-4 py-2">
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                      e.ok
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                        : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                    }`}
                  >
                    {e.action}
                  </span>
                </td>
                <td className="px-4 py-2 text-gray-700 dark:text-gray-300 hidden sm:table-cell truncate max-w-[180px]">
                  {e.target}
                </td>
                <td className="px-4 py-2 text-gray-500 dark:text-gray-400 font-mono hidden md:table-cell">
                  {e.ip}
                </td>
                <td className="px-4 py-2 text-right">
                  {e.ok ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-500 inline" />
                  ) : (
                    <XCircle className="w-3.5 h-3.5 text-red-500 inline" />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="border-t border-gray-200 dark:border-gray-800 px-4 py-2 text-[10px] text-gray-500 dark:text-gray-400 flex justify-between">
        <span>Append-only · Tamper-evident · Exportable to SIEM</span>
        <span>Showing 5 of 14,832</span>
      </div>
    </div>
  )
}

const CompKPI: React.FC<{ label: string; value: string; tone: string }> = ({
  label,
  value,
  tone,
}) => (
  <div className="bg-white dark:bg-gray-900 px-3 py-3">
    <div className="text-[10px] uppercase tracking-wide text-gray-500 dark:text-gray-400 font-semibold">
      {label}
    </div>
    <div className={`text-base sm:text-lg font-bold mt-0.5 ${tone}`}>{value}</div>
  </div>
)

/* ============================================================
 *  ANIMATED KPI ROW
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

const AnimatedKPI: React.FC<{
  target: number
  suffix?: string
  prefix?: string
  label: string
  description: string
  icon: React.ReactNode
  accent: string
}> = ({ target, suffix = '', prefix = '', label, description, icon, accent }) => {
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

const KPIShowcase: React.FC = () => (
  <section className="py-20 sm:py-28">
    <div className="container mx-auto px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto text-center mb-16">
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
          Built for{' '}
          <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            enterprise scale
          </span>
        </h2>
        <p className="text-lg text-gray-600 dark:text-gray-300">
          Battle-tested across financial institutions managing millions of regulated documents.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
        <AnimatedKPI
          target={12000000}
          suffix="+"
          label="Documents managed"
          description="Across all customer tenants"
          icon={<FileCheck2 className="w-5 h-5" />}
          accent="from-blue-500 to-cyan-500"
        />
        <AnimatedKPI
          target={500}
          suffix="+"
          label="Institutions"
          description="Banks, NBFIs, insurers, audit firms"
          icon={<Users className="w-5 h-5" />}
          accent="from-violet-500 to-fuchsia-500"
        />
        <AnimatedKPI
          target={99}
          suffix=".99%"
          label="Uptime SLA"
          description="Multi-region high-availability"
          icon={<Activity className="w-5 h-5" />}
          accent="from-emerald-500 to-teal-500"
        />
        <AnimatedKPI
          target={70}
          suffix="%"
          label="Retrieval time saved"
          description="vs. legacy file shares & email"
          icon={<Zap className="w-5 h-5" />}
          accent="from-amber-500 to-orange-500"
        />
      </div>
    </div>
  </section>
)

/* ============================================================
 *  ARCHITECTURE
 * ============================================================ */
const ArchitectureSection: React.FC = () => {
  const layers = [
    {
      name: 'Presentation',
      sub: 'React + TypeScript · WCAG 2.1 AA',
      icon: <Cpu className="w-5 h-5" />,
      color: 'from-blue-500 to-cyan-500',
    },
    {
      name: 'API Gateway',
      sub: 'Django REST · JWT · Rate-limited',
      icon: <Server className="w-5 h-5" />,
      color: 'from-indigo-500 to-purple-500',
    },
    {
      name: 'Async Workers',
      sub: 'Celery · OCR · Indexing · Retention',
      icon: <Activity className="w-5 h-5" />,
      color: 'from-violet-500 to-fuchsia-500',
    },
    {
      name: 'Search Engine',
      sub: 'Elasticsearch · <1s queries',
      icon: <Search className="w-5 h-5" />,
      color: 'from-emerald-500 to-teal-500',
    },
    {
      name: 'PostgreSQL',
      sub: 'Metadata · audit log · permissions',
      icon: <Database className="w-5 h-5" />,
      color: 'from-amber-500 to-orange-500',
    },
    {
      name: 'MinIO Object Store',
      sub: 'AES-256 at rest · versioned · resilient',
      icon: <Cloud className="w-5 h-5" />,
      color: 'from-pink-500 to-rose-500',
    },
  ]

  return (
    <section className="py-20 sm:py-28 bg-gradient-to-b from-gray-50 to-white dark:from-gray-900/50 dark:to-gray-950">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center mb-14">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
            A modern, defensible{' '}
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              architecture
            </span>
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-300">
            Each layer is independently scalable, monitored, and isolated by design — running on
            your private cloud, on-prem, or fully managed by us.
          </p>
        </div>

        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {layers.map((l) => (
            <div
              key={l.name}
              className="group relative bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5 hover:shadow-xl transition-all duration-300"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-11 h-11 rounded-lg bg-gradient-to-br ${l.color} text-white flex items-center justify-center shadow-md group-hover:scale-110 transition-transform`}
                >
                  {l.icon}
                </div>
                <div>
                  <div className="font-semibold text-gray-900 dark:text-white">{l.name}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">{l.sub}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="max-w-6xl mx-auto mt-8 grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
          {['Docker', 'Kubernetes', 'Prometheus', 'Grafana'].map((t) => (
            <div
              key={t}
              className="px-4 py-3 rounded-lg bg-gray-100 dark:bg-gray-800/50 text-sm font-medium text-gray-600 dark:text-gray-300"
            >
              {t}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ============================================================
 *  COMPARISON TABLE
 * ============================================================ */
const ComparisonTable: React.FC = () => {
  type Cell = boolean | 'partial'
  const rows: { feature: string; us: Cell; sharepoint: Cell; box: Cell }[] = [
    {
      feature: 'Procedure authoring + training in one platform',
      us: true,
      sharepoint: false,
      box: false,
    },
    {
      feature: 'Full-text search with OCR for scanned docs',
      us: true,
      sharepoint: 'partial',
      box: 'partial',
    },
    {
      feature: 'Visual workflow designer with parallel reviewers',
      us: true,
      sharepoint: 'partial',
      box: false,
    },
    {
      feature: 'Auto-graded quizzes with retry & pass thresholds',
      us: true,
      sharepoint: false,
      box: false,
    },
    {
      feature: 'Append-only tamper-evident audit log',
      us: true,
      sharepoint: false,
      box: 'partial',
    },
    {
      feature: 'Self-hosted option (your VPC or on-prem)',
      us: true,
      sharepoint: false,
      box: false,
    },
    {
      feature: 'Per-document confidentiality labels (4 tiers)',
      us: true,
      sharepoint: 'partial',
      box: false,
    },
    {
      feature: 'Legal hold + automated retention enforcement',
      us: true,
      sharepoint: 'partial',
      box: 'partial',
    },
  ]

  const cell = (val: boolean | 'partial') => {
    if (val === true)
      return (
        <span className="inline-flex w-7 h-7 rounded-full bg-green-100 dark:bg-green-900/30 items-center justify-center">
          <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
        </span>
      )
    if (val === 'partial')
      return (
        <span className="inline-flex w-7 h-7 rounded-full bg-amber-100 dark:bg-amber-900/30 items-center justify-center">
          <span className="w-3 h-0.5 rounded bg-amber-600 dark:bg-amber-400" />
        </span>
      )
    return (
      <span className="inline-flex w-7 h-7 rounded-full bg-gray-100 dark:bg-gray-800 items-center justify-center">
        <XCircle className="w-4 h-4 text-gray-400 dark:text-gray-600" />
      </span>
    )
  }

  return (
    <section className="py-20 sm:py-28">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center mb-12">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
            How we compare
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-300">
            DFC delivers what siloed tools require multiple subscriptions to provide.
          </p>
        </div>

        <div className="max-w-5xl mx-auto bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-800/50 text-left">
                  <th className="px-6 py-4 font-semibold text-gray-700 dark:text-gray-300">
                    Capability
                  </th>
                  <th className="px-6 py-4 text-center font-bold text-blue-600 dark:text-blue-400">
                    DFC
                  </th>
                  <th className="px-6 py-4 text-center font-semibold text-gray-500 dark:text-gray-400">
                    SharePoint
                  </th>
                  <th className="px-6 py-4 text-center font-semibold text-gray-500 dark:text-gray-400">
                    Box / Dropbox
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {rows.map((r, i) => (
                  <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                    <td className="px-6 py-3.5 text-gray-800 dark:text-gray-200">{r.feature}</td>
                    <td className="px-6 py-3.5 text-center">{cell(r.us)}</td>
                    <td className="px-6 py-3.5 text-center">{cell(r.sharepoint)}</td>
                    <td className="px-6 py-3.5 text-center">{cell(r.box)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ============================================================
 *  CUSTOMER LOGOS (placeholder bands)
 * ============================================================ */
const CustomerLogos: React.FC = () => {
  const logos = [
    'Atlas Bank',
    'Meridian Trust',
    'Cedar Capital',
    'Northstar NBFI',
    'Vanguard Audit',
    'PrimePay',
  ]
  return (
    <section className="py-12 sm:py-16 bg-gray-50 dark:bg-gray-900/50 border-y border-gray-200 dark:border-gray-800">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <p className="text-center text-xs uppercase tracking-widest text-gray-500 dark:text-gray-400 font-semibold mb-8">
          Trusted by regulated institutions worldwide
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-6 items-center max-w-5xl mx-auto">
          {logos.map((name) => (
            <div
              key={name}
              className="text-center text-gray-400 dark:text-gray-500 font-bold text-base sm:text-lg tracking-tight grayscale hover:grayscale-0 hover:text-gray-700 dark:hover:text-gray-300 transition-all"
            >
              {name}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ============================================================
 *  TESTIMONIALS
 * ============================================================ */
const Testimonials: React.FC = () => {
  const quotes = [
    {
      quote:
        'Onboarding 200 branch staff onto AML procedures used to take a quarter. With DFC, we did it in three weeks — every step tracked, every quiz scored, and a clean audit trail for the regulator.',
      author: 'Adaeze Okafor',
      role: 'Head of Compliance, Meridian Trust',
      rating: 5,
    },
    {
      quote:
        'Our 18-step loan approval used to live across email, Excel, and three SharePoint sites. The visual workflow designer collapsed it into a single, observable process.',
      author: 'Daniel Park',
      role: 'COO, Northstar NBFI',
      rating: 5,
    },
    {
      quote:
        'We trialed three competitors. DFC was the only one that let us self-host inside our intranet AND covered procedure authoring without a separate LMS.',
      author: 'Ines Bello',
      role: 'CIO, Atlas Bank',
      rating: 5,
    },
  ]
  return (
    <section className="py-20 sm:py-28">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center mb-14">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
            What teams are saying
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-300">
            Real outcomes from compliance, operations, and IT leaders.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {quotes.map((q) => (
            <div
              key={q.author}
              className="bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-200 dark:border-gray-800 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col"
            >
              <div className="flex gap-0.5 mb-4">
                {Array.from({ length: q.rating }).map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                ))}
              </div>
              <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed flex-1">
                "{q.quote}"
              </p>
              <div className="mt-5 pt-5 border-t border-gray-100 dark:border-gray-800 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 text-white flex items-center justify-center font-bold text-sm">
                  {q.author
                    .split(' ')
                    .map((n) => n[0])
                    .join('')}
                </div>
                <div>
                  <div className="text-sm font-semibold text-gray-900 dark:text-white">
                    {q.author}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">{q.role}</div>
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
 *  FAQ
 * ============================================================ */
const FAQSection: React.FC<{
  openFaq: number | null
  setOpenFaq: (i: number | null) => void
}> = ({ openFaq, setOpenFaq }) => {
  const faqs = [
    {
      q: 'Can DFC be hosted inside our private cloud or intranet?',
      a: 'Yes. DFC ships as a containerized stack (Docker / Kubernetes) and runs in your VPC, on-prem, or as a fully managed SaaS. MinIO object storage is intranet-friendly by design.',
    },
    {
      q: 'How does DFC support regulatory compliance (KYC, AML, GDPR, SOX)?',
      a: 'Every action is captured in an append-only audit log. Documents support 4-tier confidentiality, retention policies, legal hold, and field-level encryption. Pre-built report templates are aligned with each regulation.',
    },
    {
      q: 'Do you replace our LMS for compliance training?',
      a: 'For procedure-driven compliance training — yes. Quizzes are auto-graded, attempts and scores are stored as audit-grade evidence, and you can export PDF/CSV transcripts per user, department, or regulation.',
    },
    {
      q: 'How long does implementation take?',
      a: 'A standard rollout (auth integration, departments, initial folder hierarchy, 3-5 procedures) typically completes in 2–4 weeks. White-glove implementation is included in Enterprise plans.',
    },
    {
      q: 'How does pricing work?',
      a: 'Per-user monthly or annual, with volume discounts above 100 seats. Self-hosted Enterprise is a flat annual license. All plans include the entire platform — no module unlocks or training add-ons.',
    },
  ]
  return (
    <section className="py-20 sm:py-28 bg-gray-50 dark:bg-gray-900/50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center mb-12">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
            Frequently asked questions
          </h2>
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
const FinalCTA: React.FC<{ onNavigate: (path: string) => void }> = ({ onNavigate }) => (
  <section className="py-20 sm:py-28">
    <div className="container mx-auto px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto bg-gradient-to-br from-blue-600 via-blue-700 to-purple-700 rounded-3xl p-10 sm:p-14 text-center shadow-2xl relative overflow-hidden">
        {/* Decorative blobs */}
        <div className="absolute top-0 left-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />

        <div className="relative">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4">
            Ready to put it to work?
          </h2>
          <p className="text-blue-100 text-lg max-w-2xl mx-auto mb-8">
            Spin up a free 14-day trial — full platform, no credit card. Or talk to us about a
            custom pilot in your environment.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={() => onNavigate('/register')}
              className="group w-full sm:w-auto px-8 py-4 bg-white hover:bg-gray-50 text-blue-700 font-semibold rounded-lg shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-0.5 flex items-center justify-center gap-2"
            >
              <span>Start Free Trial</span>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
            <button
              onClick={() => onNavigate('/contact')}
              className="w-full sm:w-auto px-8 py-4 bg-blue-800/40 hover:bg-blue-800/60 text-white font-semibold rounded-lg border-2 border-white/20 hover:border-white/40 transition-all duration-300 flex items-center justify-center gap-2"
            >
              <MessageSquare className="w-5 h-5" />
              <span>Book a Live Demo</span>
            </button>
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-blue-100">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" /> No credit card required
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" /> Cancel anytime
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" /> SOC 2 ready
            </span>
          </div>
        </div>
      </div>
    </div>
  </section>
)

export default DemoPage
