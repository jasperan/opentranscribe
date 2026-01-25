'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Mic,
  ArrowLeft,
  FileText,
  User,
  Shield,
  AlertTriangle,
  Lock,
  Database,
  Server,
  Scale,
  RefreshCw,
  Mail,
  ChevronRight,
} from 'lucide-react';
import { useState } from 'react';

const sections = [
  { id: 'acceptance', title: 'Acceptance of Terms', icon: FileText },
  { id: 'description', title: 'Description of Service', icon: Server },
  { id: 'accounts', title: 'User Accounts', icon: User },
  { id: 'acceptable-use', title: 'Acceptable Use', icon: AlertTriangle },
  { id: 'privacy', title: 'Privacy', icon: Lock },
  { id: 'data-handling', title: 'Data Handling', icon: Database },
  { id: 'availability', title: 'Service Availability', icon: RefreshCw },
  { id: 'liability', title: 'Limitation of Liability', icon: Scale },
  { id: 'changes', title: 'Changes to Terms', icon: RefreshCw },
  { id: 'contact', title: 'Contact', icon: Mail },
];

export default function TermsPage() {
  const [activeSection, setActiveSection] = useState<string | null>(null);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setActiveSection(id);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-background/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <Mic className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold">Verbatim</span>
            </Link>

            <div className="flex items-center gap-4">
              <Link
                href="/"
                className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Home
              </Link>
              <Link href="/login" className="btn-primary hidden sm:inline-flex">
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-12 px-4 border-b border-border">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-4"
          >
            <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center">
              <FileText className="w-7 h-7 text-primary" />
            </div>
            <div>
              <h1 className="text-4xl font-bold">Terms of Service</h1>
              <p className="text-muted-foreground mt-1">Last updated: January 2024</p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid lg:grid-cols-4 gap-8">
          {/* Table of Contents - Sidebar */}
          <motion.aside
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="hidden lg:block"
          >
            <div className="sticky top-24">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
                On this page
              </h2>
              <nav className="space-y-1">
                {sections.map((section, index) => (
                  <motion.button
                    key={section.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={() => scrollToSection(section.id)}
                    className={`flex items-center gap-2 w-full px-3 py-2 text-sm rounded-lg transition-colors text-left ${
                      activeSection === section.id
                        ? 'bg-primary/10 text-primary'
                        : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                    }`}
                  >
                    <section.icon className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate">{section.title}</span>
                  </motion.button>
                ))}
              </nav>

              {/* Quick Links */}
              <div className="mt-8 pt-8 border-t border-border">
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
                  Related
                </h2>
                <div className="space-y-2">
                  <Link
                    href="/privacy"
                    className="flex items-center justify-between text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <span>Privacy Policy</span>
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                  <Link
                    href="/docs"
                    className="flex items-center justify-between text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <span>API Documentation</span>
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            </div>
          </motion.aside>

          {/* Main Content */}
          <div className="lg:col-span-3 space-y-12">
            {/* Summary Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="card p-6 border-primary/20 bg-primary/5"
            >
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Shield className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold mb-2">Summary</h2>
                  <p className="text-muted-foreground text-sm">
                    By using Verbatim, you agree to these terms. We provide a privacy-focused transcription
                    service. Your audio is processed securely and deleted after transcription. You're responsible
                    for your account and must use the service legally and respectfully.
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Sections */}
            <motion.section
              id="acceptance"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="scroll-mt-24"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-secondary rounded-lg flex items-center justify-center">
                  <FileText className="w-5 h-5 text-primary" />
                </div>
                <h2 className="text-2xl font-semibold">1. Acceptance of Terms</h2>
              </div>
              <div className="pl-13">
                <p className="text-muted-foreground leading-relaxed">
                  By accessing or using Verbatim ("the Service"), you agree to be bound by these Terms of Service.
                  If you do not agree to these terms, please do not use the Service.
                </p>
              </div>
            </motion.section>

            <motion.section
              id="description"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="scroll-mt-24"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-secondary rounded-lg flex items-center justify-center">
                  <Server className="w-5 h-5 text-primary" />
                </div>
                <h2 className="text-2xl font-semibold">2. Description of Service</h2>
              </div>
              <div className="pl-13">
                <p className="text-muted-foreground leading-relaxed">
                  Verbatim provides audio transcription services using open-source speech-to-text technology.
                  The Service allows users to upload audio files and receive text transcriptions.
                </p>
              </div>
            </motion.section>

            <motion.section
              id="accounts"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="scroll-mt-24"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-secondary rounded-lg flex items-center justify-center">
                  <User className="w-5 h-5 text-primary" />
                </div>
                <h2 className="text-2xl font-semibold">3. User Accounts</h2>
              </div>
              <div className="pl-13">
                <p className="text-muted-foreground leading-relaxed">
                  To use certain features of the Service, you must create an account. You are responsible for
                  maintaining the confidentiality of your account credentials and for all activities under your account.
                </p>
              </div>
            </motion.section>

            <motion.section
              id="acceptable-use"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="scroll-mt-24"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-secondary rounded-lg flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-amber-500" />
                </div>
                <h2 className="text-2xl font-semibold">4. Acceptable Use</h2>
              </div>
              <div className="pl-13">
                <p className="text-muted-foreground leading-relaxed mb-4">You agree not to:</p>
                <ul className="space-y-3">
                  {[
                    'Upload content that infringes on intellectual property rights',
                    'Use the Service for any illegal purpose',
                    'Attempt to gain unauthorized access to the Service',
                    'Interfere with or disrupt the Service',
                    'Use the Service to harm or harass others',
                  ].map((item, index) => (
                    <li key={index} className="flex items-start gap-3 text-muted-foreground">
                      <span className="w-6 h-6 bg-destructive/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-destructive text-xs font-medium">{index + 1}</span>
                      </span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </motion.section>

            <motion.section
              id="privacy"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="scroll-mt-24"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-secondary rounded-lg flex items-center justify-center">
                  <Lock className="w-5 h-5 text-green-500" />
                </div>
                <h2 className="text-2xl font-semibold">5. Privacy</h2>
              </div>
              <div className="pl-13">
                <p className="text-muted-foreground leading-relaxed">
                  Your privacy is important to us. Please review our{' '}
                  <Link href="/privacy" className="text-primary hover:underline font-medium">
                    Privacy Policy
                  </Link>{' '}
                  to understand how we collect, use, and protect your information.
                </p>
              </div>
            </motion.section>

            <motion.section
              id="data-handling"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
              className="scroll-mt-24"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-secondary rounded-lg flex items-center justify-center">
                  <Database className="w-5 h-5 text-primary" />
                </div>
                <h2 className="text-2xl font-semibold">6. Data Handling</h2>
              </div>
              <div className="pl-13">
                <p className="text-muted-foreground leading-relaxed">
                  Audio files uploaded to Verbatim are processed on our servers and are automatically deleted
                  after transcription is complete. We do not share your audio data with third parties.
                </p>
              </div>
            </motion.section>

            <motion.section
              id="availability"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="scroll-mt-24"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-secondary rounded-lg flex items-center justify-center">
                  <RefreshCw className="w-5 h-5 text-primary" />
                </div>
                <h2 className="text-2xl font-semibold">7. Service Availability</h2>
              </div>
              <div className="pl-13">
                <p className="text-muted-foreground leading-relaxed">
                  We strive to maintain high availability but do not guarantee uninterrupted access to the Service.
                  We may modify or discontinue features at any time.
                </p>
              </div>
            </motion.section>

            <motion.section
              id="liability"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45 }}
              className="scroll-mt-24"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-secondary rounded-lg flex items-center justify-center">
                  <Scale className="w-5 h-5 text-primary" />
                </div>
                <h2 className="text-2xl font-semibold">8. Limitation of Liability</h2>
              </div>
              <div className="pl-13">
                <p className="text-muted-foreground leading-relaxed">
                  The Service is provided "as is" without warranties of any kind. We are not liable for any
                  indirect, incidental, or consequential damages arising from your use of the Service.
                </p>
              </div>
            </motion.section>

            <motion.section
              id="changes"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="scroll-mt-24"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-secondary rounded-lg flex items-center justify-center">
                  <RefreshCw className="w-5 h-5 text-primary" />
                </div>
                <h2 className="text-2xl font-semibold">9. Changes to Terms</h2>
              </div>
              <div className="pl-13">
                <p className="text-muted-foreground leading-relaxed">
                  We may update these Terms from time to time. We will notify you of significant changes by
                  posting a notice on our website or sending you an email.
                </p>
              </div>
            </motion.section>

            <motion.section
              id="contact"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.55 }}
              className="scroll-mt-24"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-secondary rounded-lg flex items-center justify-center">
                  <Mail className="w-5 h-5 text-primary" />
                </div>
                <h2 className="text-2xl font-semibold">10. Contact</h2>
              </div>
              <div className="pl-13">
                <p className="text-muted-foreground leading-relaxed mb-4">
                  If you have questions about these Terms, please contact us:
                </p>
                <a
                  href="mailto:legal@verbatim.app"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors"
                >
                  <Mail className="w-4 h-4" />
                  legal@verbatim.app
                </a>
              </div>
            </motion.section>

            {/* Footer */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="pt-8 border-t border-border"
            >
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <p className="text-sm text-muted-foreground">
                  These terms are effective as of January 2024.
                </p>
                <Link
                  href="/privacy"
                  className="text-sm text-primary hover:underline flex items-center gap-1"
                >
                  Read our Privacy Policy
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            </motion.div>
          </div>
        </div>
      </main>
    </div>
  );
}
