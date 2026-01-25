'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Mic,
  ArrowLeft,
  Shield,
  User,
  FileAudio,
  BarChart3,
  Database,
  Share2,
  UserCheck,
  Cookie,
  Baby,
  RefreshCw,
  Mail,
  ChevronRight,
  Lock,
  Trash2,
  Server,
  ExternalLink,
  Check,
} from 'lucide-react';
import { useState, useEffect } from 'react';

const tableOfContents = [
  { id: 'info-collect', label: 'Information We Collect', icon: User },
  { id: 'how-use', label: 'How We Use Info', icon: BarChart3 },
  { id: 'storage', label: 'Data Storage & Security', icon: Database },
  { id: 'sharing', label: 'Data Sharing', icon: Share2 },
  { id: 'rights', label: 'Your Rights', icon: UserCheck },
  { id: 'cookies', label: 'Cookies', icon: Cookie },
  { id: 'children', label: "Children's Privacy", icon: Baby },
  { id: 'changes', label: 'Changes', icon: RefreshCw },
  { id: 'contact', label: 'Contact Us', icon: Mail },
];

export default function PrivacyPage() {
  const [activeSection, setActiveSection] = useState('info-collect');

  useEffect(() => {
    const handleScroll = () => {
      const sections = tableOfContents.map(item => document.getElementById(item.id));
      const scrollPosition = window.scrollY + 200;

      for (let i = sections.length - 1; i >= 0; i--) {
        const section = sections[i];
        if (section && section.offsetTop <= scrollPosition) {
          setActiveSection(tableOfContents[i].id);
          break;
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      const offset = 100;
      const elementPosition = element.getBoundingClientRect().top + window.scrollY;
      window.scrollTo({ top: elementPosition - offset, behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-background/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
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
              <Link href="/login" className="btn-primary hidden sm:flex">
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-8">
          {/* Sidebar - Table of Contents */}
          <motion.aside
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="hidden lg:block w-64 flex-shrink-0"
          >
            <div className="sticky top-24 space-y-6">
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground mb-3">On this page</h3>
                <nav className="space-y-1">
                  {tableOfContents.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeSection === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => scrollToSection(item.id)}
                        className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors text-left ${
                          isActive
                            ? 'bg-primary/10 text-primary'
                            : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        {item.label}
                        {isActive && (
                          <motion.div
                            layoutId="privacy-active-indicator"
                            className="ml-auto"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </motion.div>
                        )}
                      </button>
                    );
                  })}
                </nav>
              </div>

              {/* Related Links */}
              <div className="pt-6 border-t border-border">
                <h3 className="text-sm font-semibold text-muted-foreground mb-3">Related</h3>
                <div className="space-y-2">
                  <Link
                    href="/terms"
                    className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Shield className="w-4 h-4" />
                    Terms of Service
                    <ExternalLink className="w-3 h-3" />
                  </Link>
                  <Link
                    href="/docs"
                    className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Server className="w-4 h-4" />
                    API Documentation
                    <ExternalLink className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            </div>
          </motion.aside>

          {/* Main Content */}
          <main className="flex-1 min-w-0 max-w-3xl">
            {/* Hero */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-8"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                  <Shield className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h1 className="text-4xl font-bold">Privacy Policy</h1>
                  <p className="text-muted-foreground">Last updated: January 2024</p>
                </div>
              </div>
            </motion.div>

            {/* Privacy Promise Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="card p-6 mb-8 border-green-500/20 bg-green-500/5"
            >
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-green-500/10 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Lock className="w-5 h-5 text-green-500" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold mb-2">Our Privacy Promise</h2>
                  <p className="text-muted-foreground">
                    Verbatim is built with privacy at its core. Your audio files are processed locally on our servers,
                    never sent to third-party APIs, and automatically deleted after transcription. We don't sell your data.
                  </p>
                </div>
              </div>
            </motion.div>

            <div className="space-y-12">
              {/* Section 1: Information We Collect */}
              <section id="info-collect" className="scroll-mt-24">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                >
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center">
                      <User className="w-5 h-5 text-blue-500" />
                    </div>
                    <h2 className="text-2xl font-bold">1. Information We Collect</h2>
                  </div>

                  <div className="space-y-6">
                    <div className="card p-5">
                      <div className="flex items-center gap-3 mb-3">
                        <Mail className="w-5 h-5 text-primary" />
                        <h3 className="font-semibold">Account Information</h3>
                      </div>
                      <p className="text-muted-foreground">
                        When you create an account, we collect your email address for authentication purposes.
                        We use magic link authentication, so we never store passwords.
                      </p>
                    </div>

                    <div className="card p-5">
                      <div className="flex items-center gap-3 mb-3">
                        <FileAudio className="w-5 h-5 text-orange-500" />
                        <h3 className="font-semibold">Audio Files</h3>
                      </div>
                      <p className="text-muted-foreground">
                        Audio files you upload are temporarily stored for processing. Files are automatically
                        deleted immediately after transcription is complete.
                      </p>
                    </div>

                    <div className="card p-5">
                      <div className="flex items-center gap-3 mb-3">
                        <BarChart3 className="w-5 h-5 text-purple-500" />
                        <h3 className="font-semibold">Usage Data</h3>
                      </div>
                      <p className="text-muted-foreground">
                        We track transcription minutes used for billing purposes. We also collect basic analytics
                        to improve the service (page views, feature usage).
                      </p>
                    </div>
                  </div>
                </motion.div>
              </section>

              {/* Section 2: How We Use */}
              <section id="how-use" className="scroll-mt-24">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                >
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 bg-purple-500/10 rounded-xl flex items-center justify-center">
                      <BarChart3 className="w-5 h-5 text-purple-500" />
                    </div>
                    <h2 className="text-2xl font-bold">2. How We Use Your Information</h2>
                  </div>

                  <div className="card p-6">
                    <ul className="space-y-3">
                      {[
                        'To provide and maintain the transcription service',
                        'To authenticate your account via magic links',
                        'To track usage for billing and quota management',
                        'To improve our service and fix bugs',
                        'To communicate important updates about the service',
                      ].map((item, index) => (
                        <li key={index} className="flex items-start gap-3">
                          <Check className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                          <span className="text-muted-foreground">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </motion.div>
              </section>

              {/* Section 3: Storage & Security */}
              <section id="storage" className="scroll-mt-24">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                >
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 bg-green-500/10 rounded-xl flex items-center justify-center">
                      <Database className="w-5 h-5 text-green-500" />
                    </div>
                    <h2 className="text-2xl font-bold">3. Data Storage & Security</h2>
                  </div>

                  <p className="text-muted-foreground mb-6">
                    All data is encrypted in transit (TLS) and at rest. We use industry-standard security
                    practices to protect your information.
                  </p>

                  <div className="card p-6 bg-secondary/50">
                    <h3 className="font-semibold mb-4 flex items-center gap-2">
                      <Lock className="w-5 h-5 text-green-500" />
                      Key Security Features
                    </h3>
                    <div className="grid sm:grid-cols-2 gap-3">
                      {[
                        { icon: Trash2, text: 'Audio files deleted immediately after transcription' },
                        { icon: Server, text: 'No third-party API calls for transcription' },
                        { icon: Lock, text: 'All processing happens on our secure servers' },
                        { icon: Database, text: 'Encrypted database storage' },
                        { icon: Shield, text: 'Regular security audits' },
                      ].map((item, index) => {
                        const Icon = item.icon;
                        return (
                          <div key={index} className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Icon className="w-4 h-4 text-green-500 flex-shrink-0" />
                            {item.text}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </motion.div>
              </section>

              {/* Section 4: Data Sharing */}
              <section id="sharing" className="scroll-mt-24">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                >
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 bg-orange-500/10 rounded-xl flex items-center justify-center">
                      <Share2 className="w-5 h-5 text-orange-500" />
                    </div>
                    <h2 className="text-2xl font-bold">4. Data Sharing</h2>
                  </div>

                  <p className="text-muted-foreground mb-6">
                    We do not sell, trade, or rent your personal information to third parties.
                    We may share data only in these limited circumstances:
                  </p>

                  <div className="card p-6">
                    <ul className="space-y-3">
                      {[
                        'With your consent',
                        'To comply with legal obligations',
                        'To protect our rights or safety',
                        'With service providers who assist in operations (under strict confidentiality)',
                      ].map((item, index) => (
                        <li key={index} className="flex items-start gap-3">
                          <div className="w-6 h-6 bg-orange-500/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                            <span className="text-xs text-orange-500 font-medium">{index + 1}</span>
                          </div>
                          <span className="text-muted-foreground">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </motion.div>
              </section>

              {/* Section 5: Your Rights */}
              <section id="rights" className="scroll-mt-24">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                >
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 bg-cyan-500/10 rounded-xl flex items-center justify-center">
                      <UserCheck className="w-5 h-5 text-cyan-500" />
                    </div>
                    <h2 className="text-2xl font-bold">5. Your Rights</h2>
                  </div>

                  <p className="text-muted-foreground mb-6">You have the right to:</p>

                  <div className="grid sm:grid-cols-2 gap-4">
                    {[
                      { title: 'Access Data', desc: 'Request a copy of your personal data' },
                      { title: 'Delete Account', desc: 'Request deletion of your account and data' },
                      { title: 'Export History', desc: 'Download your transcription history' },
                      { title: 'Opt Out', desc: 'Unsubscribe from marketing communications' },
                      { title: 'Correct Data', desc: 'Request correction of inaccurate data' },
                    ].map((item, index) => (
                      <div key={index} className="card p-4">
                        <h4 className="font-medium mb-1">{item.title}</h4>
                        <p className="text-sm text-muted-foreground">{item.desc}</p>
                      </div>
                    ))}
                  </div>
                </motion.div>
              </section>

              {/* Section 6: Cookies */}
              <section id="cookies" className="scroll-mt-24">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                >
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 bg-amber-500/10 rounded-xl flex items-center justify-center">
                      <Cookie className="w-5 h-5 text-amber-500" />
                    </div>
                    <h2 className="text-2xl font-bold">6. Cookies</h2>
                  </div>

                  <div className="card p-6">
                    <p className="text-muted-foreground">
                      We use essential cookies for authentication and session management. We do not use
                      third-party tracking cookies or advertising cookies.
                    </p>
                  </div>
                </motion.div>
              </section>

              {/* Section 7: Children's Privacy */}
              <section id="children" className="scroll-mt-24">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                >
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 bg-pink-500/10 rounded-xl flex items-center justify-center">
                      <Baby className="w-5 h-5 text-pink-500" />
                    </div>
                    <h2 className="text-2xl font-bold">7. Children's Privacy</h2>
                  </div>

                  <div className="card p-6">
                    <p className="text-muted-foreground">
                      Verbatim is not intended for children under 13. We do not knowingly collect information
                      from children under 13.
                    </p>
                  </div>
                </motion.div>
              </section>

              {/* Section 8: Changes */}
              <section id="changes" className="scroll-mt-24">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                >
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 bg-indigo-500/10 rounded-xl flex items-center justify-center">
                      <RefreshCw className="w-5 h-5 text-indigo-500" />
                    </div>
                    <h2 className="text-2xl font-bold">8. Changes to This Policy</h2>
                  </div>

                  <div className="card p-6">
                    <p className="text-muted-foreground">
                      We may update this Privacy Policy from time to time. We will notify you of significant
                      changes by email or by posting a prominent notice on our website.
                    </p>
                  </div>
                </motion.div>
              </section>

              {/* Section 9: Contact */}
              <section id="contact" className="scroll-mt-24">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                >
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                      <Mail className="w-5 h-5 text-primary" />
                    </div>
                    <h2 className="text-2xl font-bold">9. Contact Us</h2>
                  </div>

                  <div className="card p-6">
                    <p className="text-muted-foreground mb-4">
                      If you have questions about this Privacy Policy, please contact us:
                    </p>
                    <a
                      href="mailto:privacy@verbatim.app"
                      className="btn-primary inline-flex items-center gap-2"
                    >
                      <Mail className="w-4 h-4" />
                      privacy@verbatim.app
                    </a>
                  </div>
                </motion.div>
              </section>
            </div>

            {/* Footer Link */}
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              className="mt-12 pt-8 border-t border-border text-center"
            >
              <p className="text-muted-foreground">
                Also read our{' '}
                <Link href="/terms" className="text-primary hover:underline">
                  Terms of Service
                </Link>
              </p>
            </motion.div>
          </main>
        </div>
      </div>
    </div>
  );
}
