'use client';

import { useEffect } from 'react';
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
  Radio,
  Server,
  Activity,
  Play,
  TerminalSquare,
} from 'lucide-react';

const features = [
  {
    icon: LockKeyhole,
    title: 'Local-first privacy posture',
    description:
      'Keep files on infrastructure you control, with no third-party transcription API in the default path.',
  },
  {
    icon: AudioWaveform,
    title: 'Model choice without workflow drift',
    description:
      'Route each job through Faster Whisper, OpenAI Whisper, Vosk, whisper.cpp, or Wav2Vec2 from the same interface.',
  },
  {
    icon: Code,
    title: 'API-shaped for production teams',
    description:
      'Submit files, track status, and export transcripts through a REST API that mirrors the web workflow.',
  },
  {
    icon: Download,
    title: 'Formats for editing and archives',
    description:
      'Move from rough transcript to SRT, VTT, TXT, DOCX, JSON, or Markdown without extra conversion steps.',
  },
];

const stats = [
  { label: 'Active workspaces', value: '12,847', icon: Users },
  { label: 'Minutes processed', value: '4.7M', icon: Clock },
  { label: 'Audio files indexed', value: '247,319', icon: FileAudio },
];

const testimonials = [
  {
    quote:
      'The handoff from upload to review is calm enough for client interviews and fast enough for daily edit notes.',
    author: 'Mira Halvorsen',
    role: 'Documentary editor',
    avatar: 'MH',
  },
  {
    quote:
      'We replaced three small scripts with one API path and kept sensitive board recordings inside our own stack.',
    author: 'Anton Velez',
    role: 'Platform engineer',
    avatar: 'AV',
  },
  {
    quote:
      'The diarized export gives our research team a clean first pass before anyone opens the original audio.',
    author: 'Leonie Park',
    role: 'User research lead',
    avatar: 'LP',
  },
];

const pricingTiers = [
  {
    name: 'Free',
    price: '$0',
    period: 'forever',
    minutes: '500 min/month',
    features: ['All STT engines', 'Core exports', 'API access', 'Transcript history'],
    cta: 'Start free',
    highlighted: false,
  },
  {
    name: 'Creator',
    price: '$8',
    period: '/month',
    minutes: '3,000 min/month',
    features: ['Everything in Free', 'Priority queue', 'Email support', 'Long-form uploads'],
    cta: 'Start trial',
    highlighted: true,
  },
  {
    name: 'Pro',
    price: '$19',
    period: '/month',
    minutes: '10,000 min/month',
    features: ['Everything in Creator', 'Speaker diarization', 'Team-ready exports', 'Priority support'],
    cta: 'Start trial',
    highlighted: false,
  },
  {
    name: 'Unlimited',
    price: '$39',
    period: '/month',
    minutes: 'Unlimited',
    features: ['Everything in Pro', 'No minute ceiling', 'Fastest queue', 'Dedicated support'],
    cta: 'Start trial',
    highlighted: false,
  },
];

const consoleRows = [
  { label: 'voice-memo-0419.m4a', status: 'Transcribing', value: '72%' },
  { label: 'founder-interview.wav', status: 'Diarized', value: '8 speakers' },
  { label: 'product-sync.flac', status: 'Exported', value: 'SRT + DOCX' },
];

function LogoMark({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-primary/20 bg-primary text-primary-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]">
        <Mic className="h-5 w-5" />
      </div>
      {!compact && <span className="text-xl font-semibold tracking-tight">Verbatim</span>}
    </div>
  );
}

function WaveformDecoration() {
  const bars = Array.from({ length: 64 }, (_, i) => ({
    height: Math.max(12, 18 + Math.sin(i * 0.32) * 38 + Math.cos(i * 0.71) * 18).toFixed(2),
    delay: (i * 0.035).toFixed(2),
    duration: (1.15 + Math.sin(i * 0.45) * 0.35).toFixed(2),
  }));

  return (
    <div className="flex h-32 w-full min-w-0 items-end gap-1 overflow-hidden" aria-hidden="true">
      {bars.map((bar, index) => (
        <span
          key={index}
          className="block min-w-[2px] flex-1 rounded-full bg-primary/45 animate-waveform-bar"
          style={{
            height: `${bar.height}px`,
            animationDelay: `${bar.delay}s`,
            animationDuration: `${bar.duration}s`,
          }}
        />
      ))}
    </div>
  );
}

function HeroConsolePreview() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, delay: 0.12, ease: [0.16, 1, 0.3, 1] }}
      className="relative min-w-0"
    >
      <div className="absolute inset-x-10 top-8 h-px bg-primary/30" aria-hidden="true" />
      <div className="card overflow-hidden rounded-[1.75rem] border-primary/15 bg-card/95">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-primary" />
            <span className="text-sm font-semibold">Live transcript desk</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Radio className="h-3.5 w-3.5" />
            24 kHz stream
          </div>
        </div>

        <div className="grid min-w-0 gap-0 md:grid-cols-[1.08fr_0.92fr]">
          <div className="min-w-0 space-y-5 border-b border-border p-5 md:border-b-0 md:border-r">
            <div className="rounded-2xl border border-border bg-background/70 p-4">
              <div className="mb-4 flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Waveform
                </span>
                <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                  encrypted
                </span>
              </div>
              <WaveformDecoration />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {stats.map((stat) => (
                <div key={stat.label} className="rounded-xl border border-border bg-background/70 p-3">
                  <stat.icon className="mb-2 h-4 w-4 text-primary" />
                  <div className="font-mono text-lg font-semibold tracking-tight">{stat.value}</div>
                  <div className="mt-1 text-[11px] leading-tight text-muted-foreground">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="min-w-0 space-y-3 p-5">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Queue</span>
              <span>model: faster-whisper</span>
            </div>
            {consoleRows.map((row, index) => (
              <motion.div
                key={row.label}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.25 + index * 0.08, duration: 0.35 }}
                className="rounded-xl border border-border bg-background/70 p-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{row.label}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{row.status}</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-primary/10 px-2.5 py-1 font-mono text-xs text-primary">
                    {row.value}
                  </span>
                </div>
              </motion.div>
            ))}
            <div className="rounded-xl border border-dashed border-primary/30 bg-primary/5 p-3 text-sm leading-relaxed text-muted-foreground">
              <span className="font-medium text-foreground">00:14</span> We can publish the rough cut after captions are checked.
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default function LandingPage() {
  const router = useRouter();

  const devShortcutsEnabled =
    process.env.NODE_ENV === 'development' &&
    process.env.NEXT_PUBLIC_DISABLE_DEV_SHORTCUTS !== 'true';

  useEffect(() => {
    if (devShortcutsEnabled) {
      router.replace('/app');
    }
  }, [router, devShortcutsEnabled]);

  if (devShortcutsEnabled) {
    return null;
  }

  return (
    <div className="min-h-[100dvh] bg-background">
      <nav className="fixed inset-x-0 top-0 z-50 border-b border-border/70 bg-background/82 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" aria-label="Verbatim home">
            <LogoMark />
          </Link>

          <div className="hidden items-center gap-7 md:flex">
            <Link href="#features" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
              Features
            </Link>
            <Link href="#pricing" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
              Pricing
            </Link>
            <Link href="/docs" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
              Docs
            </Link>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <Link href="/login" className="btn-ghost hidden text-sm sm:inline-flex">
              Sign in
            </Link>
            <Link href="/login" className="btn-primary inline-flex items-center gap-2 text-sm">
              Start
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </nav>

      <main id="main-content">
        <section className="relative overflow-hidden border-b border-border/60 px-4 pb-16 pt-28 sm:px-6 lg:px-8 lg:pb-24 lg:pt-36">
          <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
            <div className="absolute inset-0 noise-bg opacity-[0.018]" />
            <div className="absolute inset-x-0 top-0 h-px bg-primary/25" />
            <div className="absolute left-0 top-24 h-full w-px bg-border/70 lg:left-[8vw]" />
            <div className="absolute right-0 top-24 h-full w-px bg-border/70 lg:right-[8vw]" />
          </div>

          <div className="relative mx-auto grid max-w-7xl gap-12 lg:grid-cols-[0.92fr_1.08fr] lg:items-center">
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
              className="min-w-0 max-w-2xl"
            >
              <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3.5 py-1.5 text-sm font-medium text-primary">
                <Shield className="h-4 w-4" />
                Private speech-to-text infrastructure
              </div>

              <h1 className="text-4xl font-semibold leading-none tracking-tight text-balance sm:text-5xl md:text-6xl">
                Transcription that stays inside your stack.
              </h1>

              <p className="mt-7 max-w-[62ch] text-base leading-relaxed text-muted-foreground sm:text-lg">
                Verbatim turns long audio into searchable transcripts, captions, and developer-ready exports while keeping sensitive files away from third-party STT APIs.
              </p>

              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <Link href="/login" className="btn-primary inline-flex items-center justify-center gap-2 px-6 py-3">
                  Start with 500 minutes
                  <ArrowRight className="h-5 w-5" />
                </Link>
                <Link href="/docs" className="btn-secondary inline-flex items-center justify-center gap-2 px-6 py-3">
                  <TerminalSquare className="h-5 w-5" />
                  Read API docs
                </Link>
              </div>

              <div className="mt-10 grid max-w-xl grid-cols-1 divide-y divide-border border-y border-border sm:grid-cols-3 sm:divide-x sm:divide-y-0">
                {stats.map((stat) => (
                  <div key={stat.label} className="px-0 py-4 sm:first:pr-4 sm:last:pl-4 sm:[&:not(:first-child):not(:last-child)]:px-4">
                    <div className="font-mono text-xl font-semibold tracking-tight sm:text-2xl">{stat.value}</div>
                    <div className="mt-1 text-xs leading-tight text-muted-foreground">{stat.label}</div>
                  </div>
                ))}
              </div>
            </motion.div>

            <HeroConsolePreview />
          </div>
        </section>

        <section id="features" className="px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="grid gap-10 lg:grid-cols-[0.72fr_1.28fr] lg:items-start">
              <div>
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10">
                  <Server className="h-5 w-5 text-primary" />
                </div>
                <h2 className="text-3xl font-semibold tracking-tight text-balance md:text-4xl">
                  Built for teams that treat audio as operational data.
                </h2>
                <p className="mt-5 max-w-[55ch] leading-relaxed text-muted-foreground">
                  Uploads, model routing, review, and export are kept in one steady workflow instead of scattered across scripts and vendor consoles.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-6">
                {features.map((feature, index) => {
                  const isWide = index === 0 || index === 3;
                  return (
                    <motion.div
                      key={feature.title}
                      initial={{ opacity: 0, y: 18 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.45, delay: index * 0.08 }}
                      viewport={{ once: true, margin: '-80px' }}
                      className={`card p-6 ${isWide ? 'md:col-span-4' : 'md:col-span-2'}`}
                    >
                      <feature.icon className="mb-8 h-6 w-6 text-primary" />
                      <h3 className="text-lg font-semibold">{feature.title}</h3>
                      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{feature.description}</p>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        <section className="border-y border-border/60 bg-card/35 px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
              <motion.div
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45 }}
                viewport={{ once: true }}
                className="card flex min-h-[320px] flex-col justify-between p-8"
              >
                <Quote className="h-10 w-10 text-primary/35" />
                <p className="mt-8 max-w-3xl text-2xl font-medium leading-tight text-balance md:text-3xl">
                  &ldquo;{testimonials[0].quote}&rdquo;
                </p>
                <div className="mt-10 flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-sm font-semibold text-primary">
                    {testimonials[0].avatar}
                  </div>
                  <div>
                    <div className="font-semibold">{testimonials[0].author}</div>
                    <div className="text-sm text-muted-foreground">{testimonials[0].role}</div>
                  </div>
                </div>
              </motion.div>

              <div className="grid gap-6">
                {testimonials.slice(1).map((testimonial, index) => (
                  <motion.div
                    key={testimonial.author}
                    initial={{ opacity: 0, y: 18 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.45, delay: index * 0.08 }}
                    viewport={{ once: true }}
                    className="card p-6"
                  >
                    <p className="leading-relaxed text-muted-foreground">&ldquo;{testimonial.quote}&rdquo;</p>
                    <div className="mt-6 flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-background text-sm font-semibold">
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
          </div>
        </section>

        <section id="pricing" className="px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="mb-12 grid gap-6 lg:grid-cols-[0.8fr_1.2fr] lg:items-end">
              <div>
                <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">Pricing that scales with minutes.</h2>
                <p className="mt-4 max-w-[58ch] leading-relaxed text-muted-foreground">
                  Every tier keeps the same core workflow. Upgrade when volume, speed, or support expectations increase.
                </p>
              </div>
              <div className="rounded-2xl border border-border bg-card p-4 text-sm text-muted-foreground">
                Speaker diarization is available on all tiers for 2x minute usage.
              </div>
            </div>

            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-[0.85fr_1.15fr_0.95fr_0.95fr]">
              {pricingTiers.map((tier, index) => (
                <motion.div
                  key={tier.name}
                  initial={{ opacity: 0, y: 18 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.45, delay: index * 0.06 }}
                  viewport={{ once: true }}
                  className={`card flex flex-col p-6 ${tier.highlighted ? 'border-primary/60 bg-primary/5' : ''}`}
                >
                  {tier.highlighted && (
                    <div className="mb-3 w-fit rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                      Most selected
                    </div>
                  )}
                  <h3 className="text-xl font-semibold">{tier.name}</h3>
                  <div className="mt-5">
                    <span className="font-mono text-4xl font-semibold tracking-tight">{tier.price}</span>
                    <span className="text-muted-foreground">{tier.period}</span>
                  </div>
                  <div className="mt-3 text-sm font-medium text-primary">{tier.minutes}</div>
                  <ul className="mt-7 flex-1 space-y-3">
                    {tier.features.map((feature) => (
                      <li key={feature} className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Check className="h-4 w-4 shrink-0 text-primary" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <Link
                    href="/login"
                    className={`mt-7 inline-flex items-center justify-center rounded-lg px-4 py-2.5 text-sm font-semibold transition-all active:scale-[0.98] ${
                      tier.highlighted
                        ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                        : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                    }`}
                  >
                    {tier.cta}
                  </Link>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        <section className="px-4 pb-20 sm:px-6 lg:px-8">
          <div className="mx-auto grid max-w-7xl gap-6 rounded-[2rem] border border-border bg-card p-6 md:grid-cols-[1fr_auto] md:items-center md:p-8">
            <div>
              <div className="mb-4 flex items-center gap-2 text-sm font-medium text-primary">
                <Activity className="h-4 w-4" />
                Ready for the next file
              </div>
              <h2 className="max-w-2xl text-3xl font-semibold tracking-tight text-balance">
                Turn raw audio into reviewable text without sending it around the internet.
              </h2>
            </div>
            <Link href="/login" className="btn-primary inline-flex items-center justify-center gap-2 px-6 py-3">
              <Play className="h-5 w-5" />
              Create account
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-border/60 px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <LogoMark />

          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
            <Link href="/docs" className="transition-colors hover:text-foreground">
              Documentation
            </Link>
            <Link href="/pricing" className="transition-colors hover:text-foreground">
              Pricing
            </Link>
            <Link href="/blog" className="transition-colors hover:text-foreground">
              Blog
            </Link>
            <Link href="/privacy" className="transition-colors hover:text-foreground">
              Privacy
            </Link>
            <Link href="/terms" className="transition-colors hover:text-foreground">
              Terms
            </Link>
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="transition-colors hover:text-foreground"
              aria-label="GitHub"
            >
              <Github className="h-5 w-5" />
            </a>
          </div>

          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} Verbatim.
          </p>
        </div>
      </footer>
    </div>
  );
}
