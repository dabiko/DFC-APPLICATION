import React from 'react'
import { Mail, Phone, MapPin, Github, Linkedin, Twitter } from 'lucide-react'

interface FooterProps {
  onNavigate: (path: string) => void
}

/**
 * Footer - Links, legal, contact information
 * Professional footer with company info and links
 */
const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  const currentYear = new Date().getFullYear()

  const footerSections = [
    {
      title: 'Product',
      links: [
        { label: 'Features', href: '#features' },
        { label: 'Security', href: '#security' },
        { label: 'Pricing', href: '#pricing' },
        { label: 'Integrations', href: '/integrations' },
        { label: 'API Documentation', href: '/docs' },
      ],
    },
    {
      title: 'Company',
      links: [
        { label: 'About Us', href: '/about' },
        { label: 'Careers', href: '/careers' },
        { label: 'Blog', href: '/blog' },
        { label: 'Press Kit', href: '/press' },
        { label: 'Contact', href: '/contact' },
      ],
    },
    {
      title: 'Resources',
      links: [
        { label: 'Help Center', href: '/help' },
        { label: 'Documentation', href: '/docs' },
        { label: 'Status Page', href: '/status' },
        { label: 'Community', href: '/community' },
        { label: 'Partner Program', href: '/partners' },
      ],
    },
    {
      title: 'Legal',
      links: [
        { label: 'Privacy Policy', href: '/privacy' },
        { label: 'Terms of Service', href: '/terms' },
        { label: 'Cookie Policy', href: '/cookies' },
        { label: 'Security', href: '/security' },
        { label: 'Compliance', href: '/compliance' },
      ],
    },
  ]

  const socialLinks = [
    { icon: <Twitter className="w-5 h-5" />, href: '#', label: 'Twitter' },
    { icon: <Linkedin className="w-5 h-5" />, href: '#', label: 'LinkedIn' },
    { icon: <Github className="w-5 h-5" />, href: '#', label: 'GitHub' },
  ]

  const scrollToSection = (href: string) => {
    if (href.startsWith('#')) {
      const element = document.querySelector(href)
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' })
      }
    } else {
      onNavigate(href)
    }
  }

  return (
    <footer className="bg-gray-900 dark:bg-gray-950 text-gray-300 dark:text-gray-400 pt-16 pb-8">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-8 mb-12">
          {/* Company Info */}
          <div className="lg:col-span-2">
            {/* Logo */}
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-lg">DT</span>
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">DabiTech Inc</h3>
                <p className="text-sm text-gray-400 dark:text-gray-500">Digital Filing Cabinet</p>
              </div>
            </div>

            <p className="text-sm text-gray-400 dark:text-gray-500 mb-6 leading-relaxed">
              Enterprise-grade document management system with military-level security. Trusted by
              financial institutions worldwide.
            </p>

            {/* Contact Info */}
            <div className="space-y-2 text-sm">
              <div className="flex items-center space-x-2">
                <Mail className="w-4 h-4 text-blue-400 dark:text-blue-500" />
                <a
                  href="mailto:hello@dabitech.com"
                  className="hover:text-white dark:hover:text-gray-200 transition-colors"
                >
                  hello@dabitech.com
                </a>
              </div>
              <div className="flex items-center space-x-2">
                <Phone className="w-4 h-4 text-blue-400 dark:text-blue-500" />
                <a
                  href="tel:+1234567890"
                  className="hover:text-white dark:hover:text-gray-200 transition-colors"
                >
                  +1 (234) 567-890
                </a>
              </div>
              <div className="flex items-center space-x-2">
                <MapPin className="w-4 h-4 text-blue-400 dark:text-blue-500" />
                <span>San Francisco, CA 94103</span>
              </div>
            </div>
          </div>

          {/* Footer Links Sections */}
          {footerSections.map((section, index) => (
            <div key={index}>
              <h4 className="text-white font-semibold mb-4">{section.title}</h4>
              <ul className="space-y-2">
                {section.links.map((link, linkIndex) => (
                  <li key={linkIndex}>
                    <button
                      onClick={() => scrollToSection(link.href)}
                      className="text-sm hover:text-white dark:hover:text-gray-200 transition-colors duration-200 text-left"
                    >
                      {link.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Newsletter Subscription */}
        <div className="border-t border-gray-800 dark:border-gray-900 pt-8 mb-8">
          <div className="max-w-md mx-auto text-center">
            <h4 className="text-white font-semibold mb-2">Stay Updated</h4>
            <p className="text-sm text-gray-400 dark:text-gray-500 mb-4">
              Get the latest updates on new features and security improvements
            </p>
            <div className="flex space-x-2">
              <input
                type="email"
                placeholder="Enter your email"
                className="flex-1 px-4 py-2 bg-gray-800 dark:bg-gray-900 border border-gray-700 dark:border-gray-800 rounded-lg focus:outline-none focus:border-blue-500 dark:focus:border-blue-600 text-white placeholder-gray-500 dark:placeholder-gray-600"
              />
              <button className="px-6 py-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 text-white font-medium rounded-lg transition-colors duration-200">
                Subscribe
              </button>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-gray-800 dark:border-gray-900 pt-8">
          <div className="flex flex-col md:flex-row items-center justify-between space-y-4 md:space-y-0">
            {/* Copyright */}
            <div className="text-sm text-gray-400 dark:text-gray-500">
              © {currentYear} DabiTech Inc. All rights reserved.
            </div>

            {/* Social Links */}
            <div className="flex items-center space-x-4">
              {socialLinks.map((social, index) => (
                <a
                  key={index}
                  href={social.href}
                  className="w-10 h-10 bg-gray-800 hover:bg-gray-700 dark:bg-gray-900 dark:hover:bg-gray-800 rounded-lg flex items-center justify-center transition-colors duration-200"
                  aria-label={social.label}
                >
                  {social.icon}
                </a>
              ))}
            </div>

            {/* Certifications */}
            <div className="flex items-center space-x-4 text-xs text-gray-500 dark:text-gray-600">
              <span>SOC 2 Type II</span>
              <span>•</span>
              <span>ISO 27001</span>
              <span>•</span>
              <span>GDPR Compliant</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default Footer
