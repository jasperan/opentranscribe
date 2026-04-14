'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Mic,
  Shield,
  LockKeyhole,
  AudioWaveform,
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
    icon: LockKeyhole,
    title: 'Privacy-first',
    description:
      'Your audio never leaves our servers. No third-party APIs, no data sharing.',
  },
  {
    icon: AudioWaveform,
    title: '5 STT engines',
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
    title: 'Export anywhere',
    description:
      'Export to TXT, SRT, VTT, DOCX, JSON, or Markdown with one click.',
  },
];

const stats = [
  { label: 'Active users', value: '12,847', icon: Users },
  { label: 'Minutes transcribed', value: '4.7M', icon: Clock },
  { label: 'Files processed', value: '247,319', icon: FileAudio },
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

// Audio waveform bars for the hero decoration
function WaveformDecoration() {
  const bars = Array.from({ length: 80 }, (_, i) => ({
    height: 20 + Math.sin(i * 0.3) * 55 + Math.cos(i * 0.7) * 25,
    delay: i * 0.04,
    duration: 1.2 + Math.sin(i * 0.5) * 0.6,
  }));

  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden" aria-hidden="true">
      <div className="flex items-end gap-[2px] h-48">
        {bars.map((bar, i) => (
          <div
            key={i}
            className="w-[2.5px] bg-primary rounded-full origin-bottom animate-waveform-bar opacity-[0.04]"
            style={{
              height: `${bar.height}px`,
              animationDelay: `${bar.delay}s`,
              animationDuration: `${bar.duration}s`,
            }}
          />
        ))}
      </div>
    </div>
  );
}

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
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shadow-sm">
                <Mic className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold tracking-tight">Verbatim</span>
            </div>

            <div className="hidden md:flex items-center gap-8">
              <Link
                href="#features"
                className="text-muted-foreground hover:text-foreground transition-colors text-sm font-medium"
              >
                Features
              </Link>
              <Link
                href="#pricing"
                className="text-muted-foreground hover:text-foreground transition-colors text-sm font-medium"
              >
                Pricing
              </Link>
              <Link
                href="/docs"
                className="text-muted-foreground hover:text-foreground transition-colors text-sm font-medium"
              >
                Docs
              </Link>
            </div>

            <div className="flex items-center gap-4">
              <Link
                href="/login"
                className="text-muted-foreground hover:text-foreground transition-colors text-sm font-medium"
              >
                Sign in
              </Link>
              <Link href="/login" className="btn-primary text-sm">
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-36 pb-12 px-4 overflow-hidden">
        {/* Background atmosphere */}
        <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
          <div className="absolute top-[15%] left-1/2 -translate-x-1/2 w-[900px] h-[500px] rounded-full bg-primary/[0.06] blur-[150px]" />
          <div className="absolute top-[55%] right-[20%] w-[300px] h-[300px] rounded-full bg-orange-500/[0.03] blur-[100px]" />
        </div>

        {/* Noise texture */}
        <div className="absolute inset-0 noise-bg opacity-[0.012] mix-blend-overlay pointer-events-none" aria-hidden="true" />

        {/* Audio waveform decoration */}
        <WaveformDecoration />

        <div className="relative max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium mb-8">
              <Shield className="w-4 h-4" />
              Privacy-first transcription
            </div>

            <h1 className="text-5xl sm:text-6xl md:text-7xl font-extrabold tracking-tight mb-8 text-balance leading-[0.95]">
              Transcribe audio with
              <span className="gradient-text"> complete privacy</span>
            </h1>

            <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto text-balance leading-relaxed">
              High-accuracy transcription powered by 5 open-source STT engines.
              Your data never leaves our servers. No third-party APIs.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/login"
                className="btn-primary inline-flex items-center gap-2 text-lg px-8 py-3.5 rounded-xl"
              >
                Start for free
                <ArrowRight className="w-5 h-5" />
              </Link>
              <Link
                href="/docs"
                className="btn-secondary inline-flex items-center gap-2 text-lg px-8 py-3.5 rounded-xl"
              >
                <Code className="w-5 h-5" />
                View API Docs
              </Link>
            </div>

            <p className="text-sm text-muted-foreground mt-6">
              500 free minutes/month. No credit card required.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Stats Section — Glass panel floating between sections */}
      <section className="relative z-10 -mt-2 px-4 pb-12">
        <div className="max-w-4xl mx-auto">
          <div className="glass-panel rounded-2xl p-8 md:p-10">
            <div className="grid md:grid-cols-3 gap-8 md:gap-12">
              {stats.map((stat, index) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  viewport={{ once: true }}
                  className="text-center"
                >
                  <div className="inline-flex items-center justify-center w-12 h-12 bg-primary/10 rounded-xl mb-3">
                    <stat.icon className="w-6 h-6 text-primary" />
                  </div>
                  <div className="text-3xl md:text-4xl font-bold tracking-tight mb-1 font-mono">{stat.value}</div>
                  <div className="text-sm text-muted-foreground">{stat.label}</div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 tracking-tight">
              Everything you need for transcription
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto text-balance">
              Built for content creators, professionals, and developers who need
              accurate, private transcription.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-5">
            {features.map((feature, index) => {
              const isWide = index === 0 || index === 3;
              return (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  viewport={{ once: true }}
                  className={`group card p-6 hover:border-primary/30 ${
                    isWide ? 'md:col-span-2' : ''
                  }`}
                >
                  <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-4 group-hover:bg-primary/15 transition-colors">
                    <feature.icon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed max-w-md">
                    {feature.description}
                  </p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 px-4 border-t border-border/50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 tracking-tight">
              Loved by creators and developers
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Join thousands of users who trust Verbatim for their transcription needs.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-5">
            {/* Featured testimonial */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true }}
              className="card p-8 md:row-span-2 flex flex-col justify-between hover:border-primary/20"
            >
              <div>
                <Quote className="w-10 h-10 text-primary/20 mb-6" />
                <p className="text-lg leading-relaxed mb-8 text-balance">
                  &ldquo;{testimonials[0].quote}&rdquo;
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 bg-primary/10 rounded-[10px] flex items-center justify-center text-sm font-semibold text-primary">
                  {testimonials[0].avatar}
                </div>
                <div>
                  <div className="font-semibold">{testimonials[0].author}</div>
                  <div className="text-sm text-muted-foreground">{testimonials[0].role}</div>
                </div>
              </div>
            </motion.div>

            {/* Secondary testimonials */}
            {testimonials.slice(1).map((testimonial, index) => (
              <motion.div
                key={testimonial.author}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 + index * 0.1 }}
                viewport={{ once: true }}
                className="card p-6 hover:border-primary/20"
              >
                <Quote className="w-8 h-8 text-primary/30 mb-4" />
                <p className="text-muted-foreground mb-6 leading-relaxed">
                  &ldquo;{testimonial.quote}&rdquo;
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-[10px] flex items-center justify-center text-sm font-semibold text-primary">
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
      <section id="pricing" className="py-20 px-4 border-t border-border/50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 tracking-tight">
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
                className={`card p-6 flex flex-col ${
                  tier.highlighted
                    ? 'border-primary ring-1 ring-primary/50 glow-sm'
                    : ''
                }`}
              >
                {tier.highlighted && (
                  <div className="text-xs font-semibold text-primary mb-2 tracking-wide">
                    Most popular
                  </div>
                )}
                <h3 className="text-xl font-bold">{tier.name}</h3>
                <div className="mt-4 mb-6">
                  <span className="text-4xl font-bold tracking-tight font-mono">{tier.price}</span>
                  <span className="text-muted-foreground">{tier.period}</span>
                </div>
                <div className="text-sm font-semibold text-primary mb-6">
                  {tier.minutes}
                </div>
                <ul className="space-y-3 mb-6 flex-1">
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
                  className={`block text-center py-2.5 rounded-lg font-semibold transition-all duration-200 ${
                    tier.highlighted
                      ? 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm'
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
      <section className="relative py-24 px-4 overflow-hidden">
        {/* Atmospheric background */}
        <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] rounded-full bg-primary/[0.04] blur-[120px]" />
        </div>

        <div className="relative max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4 tracking-tight">
            Ready to get started?
          </h2>
          <p className="text-muted-foreground text-lg mb-8">
            Start transcribing with 500 free minutes. No credit card required.
          </p>
          <Link
            href="/login"
            className="btn-primary inline-flex items-center gap-2 text-lg px-8 py-3.5 rounded-xl"
          >
            Create free account
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 border-t border-border/50">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shadow-sm">
                <Mic className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold tracking-tight">Verbatim</span>
            </div>

            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
              <Link href="/docs" className="hover:text-foreground transition-colors">
                Documentation
              </Link>
              <Link href="/pricing" className="hover:text-foreground transition-colors">
                Pricing
              </Link>
              <Link href="/blog" className="hover:text-foreground transition-colors">
                Blog
              </Link>
              <Link href="/privacy" className="hover:text-foreground transition-colors">
                Privacy
              </Link>
              <Link href="/terms" className="hover:text-foreground transition-colors">
                Terms
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
