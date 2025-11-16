import {
  DocumentTextIcon,
  FolderIcon,
  ShieldCheckIcon,
  MagnifyingGlassIcon,
  LockClosedIcon,
  UserGroupIcon,
  ChartBarIcon,
  CloudArrowUpIcon,
  ClockIcon,
} from '@heroicons/react/24/outline'
import { Button } from '@components/Button'

export function LandingPage() {
  const scrollToSection = (id: string) => {
    const element = document.getElementById(id)
    element?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <div className="min-h-screen bg-white text-gray-900 transition-colors duration-300">
      {/* Animated Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none opacity-10 ">
        {/* Top row */}
        <div className="absolute top-10 left-10 animate-float">
          <FolderIcon className="w-16 h-16 text-[#304C8D]" />
        </div>
        <div className="absolute top-20 left-1/4 animate-float-delayed">
          <DocumentTextIcon className="w-14 h-14 text-[#304C8D]" />
        </div>
        <div className="absolute top-16 left-1/2 animate-float">
          <FolderIcon className="w-18 h-18 text-[#304C8D]" />
        </div>
        <div className="absolute top-40 right-20 animate-float-delayed">
          <DocumentTextIcon className="w-20 h-20 text-[#304C8D]" />
        </div>
        <div className="absolute top-32 right-1/4 animate-float">
          <FolderIcon className="w-12 h-12 text-[#304C8D]" />
        </div>

        {/* Middle row */}
        <div className="absolute top-1/3 left-16 animate-float-delayed">
          <DocumentTextIcon className="w-16 h-16 text-[#304C8D]" />
        </div>
        <div className="absolute top-1/2 left-1/3 animate-float">
          <FolderIcon className="w-14 h-14 text-[#304C8D]" />
        </div>
        <div className="absolute top-1/2 right-10 animate-float-delayed">
          <DocumentTextIcon className="w-16 h-16 text-[#304C8D]" />
        </div>
        <div className="absolute top-1/3 right-1/3 animate-float">
          <FolderIcon className="w-18 h-18 text-[#304C8D]" />
        </div>

        {/* Bottom row */}
        <div className="absolute bottom-20 left-1/4 animate-float">
          <FolderIcon className="w-12 h-12 text-[#304C8D]" />
        </div>
        <div className="absolute bottom-32 left-1/2 animate-float-delayed">
          <DocumentTextIcon className="w-14 h-14 text-[#304C8D]" />
        </div>
        <div className="absolute bottom-40 right-1/3 animate-float">
          <FolderIcon className="w-14 h-14 text-[#304C8D]" />
        </div>
        <div className="absolute bottom-24 right-16 animate-float-delayed">
          <DocumentTextIcon className="w-16 h-16 text-[#304C8D]" />
        </div>
        <div className="absolute bottom-16 left-1/3 animate-float">
          <FolderIcon className="w-20 h-20 text-[#304C8D]" />
        </div>
        <div className="absolute bottom-48 right-1/4 animate-float-delayed">
          <DocumentTextIcon className="w-12 h-12 text-[#304C8D]" />
        </div>
      </div>

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-lg border-b border-gray-200 ">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#304C8D] flex items-center justify-center">
                <FolderIcon className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-[#304C8D]">CCC PLC</h1>
                <p className="text-xs text-gray-600 ">Digital Filing Cabinet</p>
              </div>
            </div>

            {/* Navigation */}
            <nav className="hidden md:flex items-center gap-8">
              <button
                onClick={() => scrollToSection('features')}
                className="text-sm font-medium text-gray-700 hover:text-[#304C8D] :text-[#304C8D] transition-colors"
              >
                Features
              </button>
              <button
                onClick={() => scrollToSection('security')}
                className="text-sm font-medium text-gray-700 hover:text-[#304C8D] :text-[#304C8D] transition-colors"
              >
                Security
              </button>
              <button
                onClick={() => scrollToSection('departments')}
                className="text-sm font-medium text-gray-700 hover:text-[#304C8D] :text-[#304C8D] transition-colors"
              >
                Departments
              </button>
              <button
                onClick={() => scrollToSection('benefits')}
                className="text-sm font-medium text-gray-700 hover:text-[#304C8D] :text-[#304C8D] transition-colors"
              >
                Benefits
              </button>
            </nav>

            {/* Actions */}
            <div className="flex items-center gap-4">
              <Button variant="primary" size="sm">
                Login
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-6 overflow-hidden">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center">
            <h1 className="text-5xl md:text-7xl font-bold mb-6">
              <span className="text-[#304C8D]">Digital Filing Cabinet</span>
              <br />
              <span className="text-gray-900 ">for Modern Banking</span>
            </h1>
            <p className="text-xl md:text-2xl text-gray-600 mb-8 max-w-3xl mx-auto">
              Securely store, manage, and retrieve sensitive financial documents with
              enterprise-grade encryption, compliance, and intelligent search.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button variant="primary" size="lg">
                Get Started
              </Button>
              <Button variant="outline" size="lg">
                Watch Demo
              </Button>
            </div>

            {/* Hero Illustration */}
            <div className="mt-16 relative">
              <div className="bg-gradient-to-br from-[#304C8D]/10 to-[#304C8D]/5 rounded-2xl p-8 border border-[#304C8D]/20">
                <div className="grid grid-cols-3 gap-4">
                  {[...Array(9)].map((_, i) => (
                    <div
                      key={i}
                      className="bg-white rounded-lg p-4 shadow-md hover:shadow-lg transition-shadow animate-fade-in"
                      style={{ animationDelay: `${i * 0.1}s` }}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        {i % 2 === 0 ? (
                          <DocumentTextIcon className="w-6 h-6 text-[#304C8D]" />
                        ) : (
                          <FolderIcon className="w-6 h-6 text-[#304C8D]" />
                        )}
                        <div className="h-3 bg-gray-200 rounded flex-1"></div>
                      </div>
                      <div className="space-y-2">
                        <div className="h-2 bg-gray-100 rounded"></div>
                        <div className="h-2 bg-gray-100 rounded w-2/3"></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Statistics Section */}
      <section className="py-16 px-6 bg-[#304C8D] text-white">
        <div className="container mx-auto max-w-6xl">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="text-4xl md:text-5xl font-bold mb-2">10,000+</div>
              <div className="text-white/80">Documents Secured</div>
            </div>
            <div className="text-center">
              <div className="text-4xl md:text-5xl font-bold mb-2">99.9%</div>
              <div className="text-white/80">Uptime SLA</div>
            </div>
            <div className="text-center">
              <div className="text-4xl md:text-5xl font-bold mb-2">&lt;1s</div>
              <div className="text-white/80">Search Response</div>
            </div>
            <div className="text-center">
              <div className="text-4xl md:text-5xl font-bold mb-2">256-bit</div>
              <div className="text-white/80">AES Encryption</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-6">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4 text-[#304C8D]">
              Powerful Features
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Everything you need to manage your financial documents securely and efficiently
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="p-6 rounded-xl border border-gray-200 hover:border-[#304C8D] hover:shadow-lg transition-all">
              <div className="w-12 h-12 rounded-lg bg-[#304C8D]/10 flex items-center justify-center mb-4">
                <CloudArrowUpIcon className="w-6 h-6 text-[#304C8D]" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Smart Upload</h3>
              <p className="text-gray-600 ">
                Drag-and-drop file upload with automatic metadata extraction and categorization
              </p>
            </div>

            {/* Feature 2 */}
            <div className="p-6 rounded-xl border border-gray-200 hover:border-[#304C8D] hover:shadow-lg transition-all">
              <div className="w-12 h-12 rounded-lg bg-[#304C8D]/10 flex items-center justify-center mb-4">
                <MagnifyingGlassIcon className="w-6 h-6 text-[#304C8D]" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Full-Text Search</h3>
              <p className="text-gray-600 ">
                Lightning-fast search with OCR support for scanned documents and advanced filters
              </p>
            </div>

            {/* Feature 3 */}
            <div className="p-6 rounded-xl border border-gray-200 hover:border-[#304C8D] hover:shadow-lg transition-all">
              <div className="w-12 h-12 rounded-lg bg-[#304C8D]/10 flex items-center justify-center mb-4">
                <ClockIcon className="w-6 h-6 text-[#304C8D]" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Version Control</h3>
              <p className="text-gray-600 ">
                Complete revision history with restore capability and audit trail
              </p>
            </div>

            {/* Feature 4 */}
            <div className="p-6 rounded-xl border border-gray-200 hover:border-[#304C8D] hover:shadow-lg transition-all">
              <div className="w-12 h-12 rounded-lg bg-[#304C8D]/10 flex items-center justify-center mb-4">
                <UserGroupIcon className="w-6 h-6 text-[#304C8D]" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Role-Based Access</h3>
              <p className="text-gray-600 ">
                Granular permissions with folder-level access control and inheritance
              </p>
            </div>

            {/* Feature 5 */}
            <div className="p-6 rounded-xl border border-gray-200 hover:border-[#304C8D] hover:shadow-lg transition-all">
              <div className="w-12 h-12 rounded-lg bg-[#304C8D]/10 flex items-center justify-center mb-4">
                <ShieldCheckIcon className="w-6 h-6 text-[#304C8D]" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Compliance Ready</h3>
              <p className="text-gray-600 ">
                Built-in support for KYC, AML, GDPR, and financial regulations
              </p>
            </div>

            {/* Feature 6 */}
            <div className="p-6 rounded-xl border border-gray-200 hover:border-[#304C8D] hover:shadow-lg transition-all">
              <div className="w-12 h-12 rounded-lg bg-[#304C8D]/10 flex items-center justify-center mb-4">
                <ChartBarIcon className="w-6 h-6 text-[#304C8D]" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Analytics Dashboard</h3>
              <p className="text-gray-600 ">
                Comprehensive insights on document usage, storage, and compliance metrics
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Security Section */}
      <section id="security" className="py-20 px-6 bg-gray-50 ">
        <div className="container mx-auto max-w-6xl">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-4xl md:text-5xl font-bold mb-6 text-[#304C8D]">
                Enterprise-Grade Security
              </h2>
              <p className="text-xl text-gray-600 mb-8">
                Your sensitive financial documents deserve the highest level of protection. Our
                multi-layered security approach ensures data safety at every step.
              </p>

              <div className="space-y-6">
                <div className="flex gap-4">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 rounded-lg bg-[#304C8D]/10 flex items-center justify-center">
                      <LockClosedIcon className="w-5 h-5 text-[#304C8D]" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold mb-1">AES-256 Encryption</h3>
                    <p className="text-gray-600 ">
                      Military-grade encryption at rest and TLS 1.3 in transit
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 rounded-lg bg-[#304C8D]/10 flex items-center justify-center">
                      <ShieldCheckIcon className="w-5 h-5 text-[#304C8D]" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold mb-1">Multi-Factor Authentication</h3>
                    <p className="text-gray-600 ">
                      TOTP-based MFA with backup codes for enhanced account security
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 rounded-lg bg-[#304C8D]/10 flex items-center justify-center">
                      <DocumentTextIcon className="w-5 h-5 text-[#304C8D]" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold mb-1">Immutable Audit Trail</h3>
                    <p className="text-gray-600 ">
                      Complete activity logging with tamper-proof audit records
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="bg-gradient-to-br from-[#304C8D] to-[#1e3a6d] rounded-2xl p-8 text-white">
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-4 bg-white/10 rounded-lg backdrop-blur">
                    <ShieldCheckIcon className="w-6 h-6" />
                    <div>
                      <div className="font-semibold">Security Certifications</div>
                      <div className="text-sm text-white/80">ISO 27001, SOC 2 Type II</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-4 bg-white/10 rounded-lg backdrop-blur">
                    <LockClosedIcon className="w-6 h-6" />
                    <div>
                      <div className="font-semibold">Data Protection</div>
                      <div className="text-sm text-white/80">GDPR & CCPA Compliant</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-4 bg-white/10 rounded-lg backdrop-blur">
                    <ClockIcon className="w-6 h-6" />
                    <div>
                      <div className="font-semibold">Backup & Recovery</div>
                      <div className="text-sm text-white/80">
                        Daily automated backups, 4-hour RTO
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Departments Section */}
      <section id="departments" className="py-20 px-6">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4 text-[#304C8D]">
              Built for Every Department
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Tailored workflows and access controls for all your banking departments
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { name: 'Engagements', color: 'bg-blue-500' },
              { name: 'Accounting', color: 'bg-green-500' },
              { name: 'IT', color: 'bg-purple-500' },
              { name: 'Compliance', color: 'bg-orange-500' },
              { name: 'Risk', color: 'bg-red-500' },
              { name: 'Audit', color: 'bg-indigo-500' },
            ].map((dept) => (
              <div
                key={dept.name}
                className="group p-6 rounded-xl border border-gray-200 hover:border-[#304C8D] hover:shadow-lg transition-all cursor-pointer"
              >
                <div
                  className={`w-12 h-12 rounded-lg ${dept.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}
                >
                  <UserGroupIcon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-semibold mb-2">{dept.name}</h3>
                <p className="text-gray-600 ">
                  Specialized document management for {dept.name.toLowerCase()} operations
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section id="benefits" className="py-20 px-6 bg-gray-50 ">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4 text-[#304C8D]">Why Choose DFC?</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Transform your document management with proven results
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <div className="p-8 bg-white rounded-xl shadow-md">
              <div className="text-5xl font-bold text-[#304C8D] mb-2">70%</div>
              <div className="text-xl font-semibold mb-2">Faster Document Retrieval</div>
              <p className="text-gray-600 ">
                Find any document in seconds with intelligent search and filters
              </p>
            </div>

            <div className="p-8 bg-white rounded-xl shadow-md">
              <div className="text-5xl font-bold text-[#304C8D] mb-2">100%</div>
              <div className="text-xl font-semibold mb-2">Compliance Coverage</div>
              <p className="text-gray-600 ">
                Meet all regulatory requirements with built-in compliance features
              </p>
            </div>

            <div className="p-8 bg-white rounded-xl shadow-md">
              <div className="text-5xl font-bold text-[#304C8D] mb-2">50%</div>
              <div className="text-xl font-semibold mb-2">Cost Reduction</div>
              <p className="text-gray-600 ">
                Eliminate physical storage and reduce operational overhead
              </p>
            </div>

            <div className="p-8 bg-white rounded-xl shadow-md">
              <div className="text-5xl font-bold text-[#304C8D] mb-2">24/7</div>
              <div className="text-xl font-semibold mb-2">Secure Access</div>
              <p className="text-gray-600 ">
                Access your documents anytime, anywhere with enterprise security
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6 bg-gradient-to-br from-[#304C8D] to-[#1e3a6d] text-white">
        <div className="container mx-auto max-w-4xl text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Ready to Transform Your Document Management?
          </h2>
          <p className="text-xl mb-8 text-white/90">
            Join leading financial institutions using DFC to secure and streamline their operations
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button variant="secondary" size="lg">
              Get Started Free
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="border-white text-white hover:bg-white/10"
            >
              Schedule Demo
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 bg-gray-900 text-gray-400">
        <div className="container mx-auto max-w-6xl">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-[#304C8D] flex items-center justify-center">
                  <FolderIcon className="w-5 h-5 text-white" />
                </div>
                <span className="font-bold text-white">CCC PLC</span>
              </div>
              <p className="text-sm">
                Enterprise document management for modern banking institutions.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-white mb-4">Product</h3>
              <ul className="space-y-2 text-sm">
                <li>
                  <button
                    onClick={() => scrollToSection('features')}
                    className="hover:text-white transition-colors"
                  >
                    Features
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => scrollToSection('security')}
                    className="hover:text-white transition-colors"
                  >
                    Security
                  </button>
                </li>
                <li>
                  <button className="hover:text-white transition-colors">Pricing</button>
                </li>
                <li>
                  <button className="hover:text-white transition-colors">Integrations</button>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-white mb-4">Company</h3>
              <ul className="space-y-2 text-sm">
                <li>
                  <button className="hover:text-white transition-colors">About Us</button>
                </li>
                <li>
                  <button className="hover:text-white transition-colors">Careers</button>
                </li>
                <li>
                  <button className="hover:text-white transition-colors">Contact</button>
                </li>
                <li>
                  <button className="hover:text-white transition-colors">Blog</button>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-white mb-4">Legal</h3>
              <ul className="space-y-2 text-sm">
                <li>
                  <button className="hover:text-white transition-colors">Privacy Policy</button>
                </li>
                <li>
                  <button className="hover:text-white transition-colors">Terms of Service</button>
                </li>
                <li>
                  <button className="hover:text-white transition-colors">Security</button>
                </li>
                <li>
                  <button className="hover:text-white transition-colors">Compliance</button>
                </li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-gray-800 text-center text-sm">
            <p>&copy; 2025 CCC PLC. All rights reserved. Digital Filing Cabinet System.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
