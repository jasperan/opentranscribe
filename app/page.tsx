'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Mic,
  Shield,
  Zap,
  Code,
  Download,
  Check,
  ArrowRight,
  Github,
  Quote,
  Users,
  Clock,
  FileAudio,
} from 'lucide-react';

const features = [
  {
    icon: Shield,
    title: 'Privacy-First',
    description:
      'Your audio never leaves our servers. No third-party APIs, no data sharing.',
  },
  {
    icon: Zap,
    title: '5 STT Engines',
    description:
      'Choose from Faster Whisper, OpenAI Whisper, Vosk, whisper.cpp, and Wav2Vec2.',
  },
  {
    icon: Code,
    title: 'Developer API',
    description:
      'Full REST API with SDKs. Integrate transcription into your workflow.',
  },
  {
    icon: Download,
    title: 'Export Anywhere',
    description:
      'Export to TXT, SRT, VTT, DOCX, JSON, or Markdown with one click.',
  },
];

const stats = [
  { label: 'Active Users', value: '10,000+', icon: Users },
  { label: 'Minutes Transcribed', value: '5M+', icon: Clock },
  { label: 'Files Processed', value: '250K+', icon: FileAudio },
];

const testimonials = [
  {
    quote: "Verbatim has completely transformed how I handle podcast transcriptions. The accuracy is incredible and I love that my data stays private.",
    author: "Sarah Chen",
    role: "Podcast Producer",
    avatar: "SC",
  },
  {
    quote: "As a developer, the API is a dream to work with. Clean documentation, reliable service, and the pricing is unbeatable.",
    author: "Marcus Johnson",
    role: "Full-Stack Developer",
    avatar: "MJ",
  },
  {
    quote: "We switched from a major competitor and cut our transcription costs by 80%. The speaker diarization feature is perfect for our interview recordings.",
    author: "Emily Rodriguez",
    role: "Content Manager",
    avatar: "ER",
  },
];

const pricingTiers = [
  {
    name: 'Free',
    price: '$0',
    period: 'forever',
    minutes: '500 min/month',
    features: [
      'All 5 STT engines',
      'All export formats',
      'API access',
      'Transcription history',
    ],
    cta: 'Get Started',
    highlighted: false,
  },
  {
    name: 'Creator',
    price: '$8',
    period: '/month',
    minutes: '3,000 min/month',
    features: [
      'Everything in Free',
      '6x more minutes',
      'Priority processing',
      'Email support',
    ],
    cta: 'Start Free Trial',
    highlighted: true,
  },
  {
    name: 'Pro',
    price: '$19',
    period: '/month',
    minutes: '10,000 min/month',
    features: [
      'Everything in Creator',
      '20x more minutes',
      'Speaker diarization',
      'Priority support',
    ],
    cta: 'Start Free Trial',
    highlighted: false,
  },
  {
    name: 'Unlimited',
    price: '$39',
    period: '/month',
    minutes: 'Unlimited',
    features: [
      'Everything in Pro',
      'No minute limits',
      'Highest priority',
      'Dedicated support',
    ],
    cta: 'Start Free Trial',
    highlighted: false,
  },
];

export default function LandingPage() {
  const [email, setEmail] = useState('');
  const router = useRouter();

  // In development mode, skip landing page and go straight to the app
  // (disabled during E2E testing via NEXT_PUBLIC_DISABLE_DEV_SHORTCUTS)
  const devShortcutsEnabled =
    process.env.NODE_ENV === 'development' &&
    process.env.NEXT_PUBLIC_DISABLE_DEV_SHORTCUTS !== 'true';

  useEffect(() => {
    if (devShortcutsEnabled) {
      router.replace('/app');
    }
  }, [router, devShortcutsEnabled]);

  // Show nothing while redirecting in dev mode
  if (devShortcutsEnabled) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <Mic className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold">Verbatim</span>
            </div>

            <div className="hidden md:flex items-center gap-8">
              <Link
                href="#features"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                Features
              </Link>
              <Link
                href="#pricing"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                Pricing
              </Link>
              <Link
                href="/docs"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                Docs
              </Link>
            </div>

            <div className="flex items-center gap-4">
              <Link
                href="/login"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                Sign in
              </Link>
              <Link href="/login" className="btn-primary">
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm mb-6">
              <Shield className="w-4 h-4" />
              Privacy-first transcription
            </div>

            <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-6 text-balance">
              Transcribe audio with
              <span className="gradient-text"> complete privacy</span>
            </h1>

            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto text-balance">
              High-accuracy transcription powered by 5 open-source STT engines.
              Your data never leaves our servers. No third-party APIs.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/login"
                className="btn-primary inline-flex items-center gap-2 text-lg px-8 py-3"
              >
                Start for free
                <ArrowRight className="w-5 h-5" />
              </Link>
              <Link
                href="/docs"
                className="btn-secondary inline-flex items-center gap-2 text-lg px-8 py-3"
              >
                <Code className="w-5 h-5" />
                View API Docs
              </Link>
            </div>

            <p className="text-sm text-muted-foreground mt-4">
              500 free minutes/month. No credit card required.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4 border-t border-border">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Everything you need for transcription
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Built for content creators, professionals, and developers who need
              accurate, private transcription.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="card p-6"
              >
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-4">
                  <feature.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground text-sm">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 px-4 border-t border-border bg-secondary/30">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8">
            {stats.map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="text-center"
              >
                <div className="inline-flex items-center justify-center w-14 h-14 bg-primary/10 rounded-2xl mb-4">
                  <stat.icon className="w-7 h-7 text-primary" />
                </div>
                <div className="text-4xl font-bold mb-1">{stat.value}</div>
                <div className="text-muted-foreground">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 px-4 border-t border-border">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Loved by creators and developers
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Join thousands of users who trust Verbatim for their transcription needs.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((testimonial, index) => (
              <motion.div
                key={testimonial.author}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="card p-6"
              >
                <Quote className="w-8 h-8 text-primary/30 mb-4" />
                <p className="text-muted-foreground mb-6 leading-relaxed">
                  &ldquo;{testimonial.quote}&rdquo;
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center text-sm font-medium text-primary">
                    {testimonial.avatar}
                  </div>
                  <div>
                    <div className="font-medium">{testimonial.author}</div>
                    <div className="text-sm text-muted-foreground">{testimonial.role}</div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 px-4 border-t border-border">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Simple, transparent pricing
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              10x more generous than competitors. All features included at every
              tier.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {pricingTiers.map((tier, index) => (
              <motion.div
                key={tier.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                className={`card p-6 ${
                  tier.highlighted
                    ? 'border-primary ring-1 ring-primary'
                    : ''
                }`}
              >
                {tier.highlighted && (
                  <div className="text-xs font-medium text-primary mb-2">
                    Most Popular
                  </div>
                )}
                <h3 className="text-xl font-bold">{tier.name}</h3>
                <div className="mt-4 mb-6">
                  <span className="text-4xl font-bold">{tier.price}</span>
                  <span className="text-muted-foreground">{tier.period}</span>
                </div>
                <div className="text-sm font-medium text-primary mb-6">
                  {tier.minutes}
                </div>
                <ul className="space-y-3 mb-6">
                  {tier.features.map((feature) => (
                    <li
                      key={feature}
                      className="flex items-center gap-2 text-sm text-muted-foreground"
                    >
                      <Check className="w-4 h-4 text-primary flex-shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/login"
                  className={`block text-center py-2 rounded-lg font-medium transition-colors ${
                    tier.highlighted
                      ? 'bg-primary text-white hover:bg-primary/90'
                      : 'bg-secondary hover:bg-secondary/80'
                  }`}
                >
                  {tier.cta}
                </Link>
              </motion.div>
            ))}
          </div>

          <p className="text-center text-muted-foreground text-sm mt-8">
            Speaker diarization available on all tiers for 2x minute usage.
          </p>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 border-t border-border">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Ready to get started?
          </h2>
          <p className="text-muted-foreground text-lg mb-8">
            Start transcribing with 500 free minutes. No credit card required.
          </p>
          <Link
            href="/login"
            className="btn-primary inline-flex items-center gap-2 text-lg px-8 py-3"
          >
            Create free account
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 border-t border-border">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <Mic className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold">Verbatim</span>
            </div>

            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <Link href="/docs" className="hover:text-foreground transition-colors">
                Documentation
              </Link>
              <Link href="/pricing" className="hover:text-foreground transition-colors">
                Pricing
              </Link>
              <Link href="/blog" className="hover:text-foreground transition-colors">
                Blog
              </Link>
              <a
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-foreground transition-colors"
              >
                <Github className="w-5 h-5" />
              </a>
            </div>

            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} Verbatim. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
