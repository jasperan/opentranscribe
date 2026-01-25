'use client';

import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mic,
  ArrowLeft,
  Code,
  FileAudio,
  Languages,
  Users,
  Download,
  Zap,
  Shield,
  Key,
  Copy,
  Check,
  ChevronRight,
  Book,
  Terminal,
  Gauge,
  ExternalLink,
  Sparkles,
} from 'lucide-react';
import { useState, useEffect } from 'react';

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className="absolute top-3 right-3 p-2 text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-white/10"
      title="Copy to clipboard"
    >
      {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
    </button>
  );
}

function CodeBlock({ code, language = 'bash' }: { code: string; language?: string }) {
  return (
    <div className="relative bg-[#1a1a2e] rounded-xl overflow-hidden border border-border/50">
      <div className="absolute top-0 left-0 right-0 h-8 bg-[#252540] flex items-center px-3 gap-1.5">
        <div className="w-3 h-3 rounded-full bg-red-500/60" />
        <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
        <div className="w-3 h-3 rounded-full bg-green-500/60" />
        <span className="ml-3 text-xs text-muted-foreground font-mono">{language}</span>
      </div>
      <CopyButton text={code} />
      <pre className="p-4 pt-10 overflow-x-auto text-sm">
        <code className="text-gray-300">{code}</code>
      </pre>
    </div>
  );
}

const tableOfContents = [
  { id: 'quick-start', label: 'Quick Start', icon: Zap },
  { id: 'authentication', label: 'Authentication', icon: Key },
  { id: 'endpoints', label: 'API Endpoints', icon: Terminal },
  { id: 'formats', label: 'Supported Formats', icon: FileAudio },
  { id: 'models', label: 'STT Models', icon: Gauge },
  { id: 'languages', label: 'Languages', icon: Languages },
  { id: 'diarization', label: 'Speaker Diarization', icon: Users },
];

const endpoints = [
  {
    method: 'POST',
    path: '/api/transcribe',
    description: 'Transcribe an audio file to text',
    auth: true,
    params: [
      { name: 'file', type: 'File', required: true, description: 'Audio file (MP3, WAV, FLAC, OGG, M4A)' },
      { name: 'diarization', type: 'boolean', required: false, description: 'Enable speaker identification (uses 2x minutes)' },
    ],
    response: `{
  "id": "txn_abc123",
  "text": "Hello, this is the transcribed text...",
  "segments": [
    { "start": 0.0, "end": 2.5, "text": "Hello," },
    { "start": 2.5, "end": 5.0, "text": "this is the transcribed text..." }
  ],
  "language": "en",
  "model": "faster-whisper",
  "duration": 30.5,
  "minutesCharged": 1
}`,
  },
  {
    method: 'POST',
    path: '/api/export',
    description: 'Export a transcription to various formats',
    auth: true,
    params: [
      { name: 'transcriptionId', type: 'string', required: true, description: 'ID of the transcription to export' },
      { name: 'format', type: 'string', required: true, description: 'Export format: txt, srt, vtt, docx, json, md' },
    ],
    response: 'Binary file download',
  },
  {
    method: 'GET',
    path: '/api/user/usage',
    description: 'Get current usage statistics',
    auth: true,
    params: [],
    response: `{
  "used": 150,
  "limit": 500,
  "remaining": 350,
  "percentage": 30,
  "tier": "free"
}`,
  },
  {
    method: 'GET',
    path: '/api/user/history',
    description: 'Get transcription history',
    auth: true,
    params: [
      { name: 'page', type: 'number', required: false, description: 'Page number (default: 1)' },
      { name: 'limit', type: 'number', required: false, description: 'Items per page (default: 20)' },
    ],
    response: `{
  "transcriptions": [
    {
      "id": "txn_abc123",
      "filename": "interview.mp3",
      "duration": 300,
      "createdAt": "2024-01-15T10:30:00Z",
      "language": "en"
    }
  ],
  "total": 42,
  "page": 1,
  "pages": 3
}`,
  },
];

const models = [
  {
    id: 'faster-whisper',
    name: 'Faster Whisper',
    description: '4x faster than OpenAI Whisper with same accuracy. Default model.',
    speed: 'Fast',
    accuracy: 'High',
    badge: 'Recommended',
    badgeColor: 'bg-green-500/10 text-green-400 border-green-500/20',
  },
  {
    id: 'openai-whisper',
    name: 'OpenAI Whisper',
    description: 'Original reference implementation. Most tested and documented.',
    speed: 'Medium',
    accuracy: 'High',
    badge: null,
    badgeColor: '',
  },
  {
    id: 'vosk',
    name: 'Vosk',
    description: 'Lightweight model, great for streaming. Lower resource usage.',
    speed: 'Very Fast',
    accuracy: 'Medium',
    badge: 'Lightweight',
    badgeColor: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  },
  {
    id: 'whisper-cpp',
    name: 'whisper.cpp',
    description: 'CPU-optimized C++ implementation. Good for systems without GPU.',
    speed: 'Fast',
    accuracy: 'High',
    badge: null,
    badgeColor: '',
  },
  {
    id: 'wav2vec2',
    name: 'Wav2Vec2',
    description: 'HuggingFace Transformers model. Good multilingual support.',
    speed: 'Medium',
    accuracy: 'High',
    badge: null,
    badgeColor: '',
  },
];

export default function DocsPage() {
  const [activeSection, setActiveSection] = useState('quick-start');

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
                            layoutId="active-indicator"
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

              {/* Quick Links */}
              <div className="pt-6 border-t border-border">
                <h3 className="text-sm font-semibold text-muted-foreground mb-3">Quick Links</h3>
                <div className="space-y-2">
                  <Link
                    href="/app/api-keys"
                    className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Key className="w-4 h-4" />
                    Get API Key
                    <ExternalLink className="w-3 h-3" />
                  </Link>
                  <Link
                    href="/pricing"
                    className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Sparkles className="w-4 h-4" />
                    View Pricing
                    <ExternalLink className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            </div>
          </motion.aside>

          {/* Main Content */}
          <main className="flex-1 min-w-0">
            {/* Hero */}
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-12"
            >
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm mb-4">
                <Book className="w-4 h-4" />
                API Documentation
              </div>
              <h1 className="text-4xl md:text-5xl font-bold mb-4">
                Developer Documentation
              </h1>
              <p className="text-xl text-muted-foreground max-w-2xl">
                Integrate Verbatim's powerful transcription capabilities into your applications
                with our simple REST API.
              </p>
            </motion.section>

            {/* Quick Start */}
            <section id="quick-start" className="mb-16 scroll-mt-24">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
              >
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                    <Zap className="w-5 h-5 text-primary" />
                  </div>
                  <h2 className="text-2xl font-bold">Quick Start</h2>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div className="card p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white font-bold">
                        1
                      </div>
                      <h3 className="text-lg font-semibold">Get your API key</h3>
                    </div>
                    <p className="text-muted-foreground mb-4">
                      Sign up for a free account and generate an API key from your dashboard.
                    </p>
                    <Link href="/login" className="text-primary hover:underline flex items-center gap-1">
                      Create account <ChevronRight className="w-4 h-4" />
                    </Link>
                  </div>

                  <div className="card p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white font-bold">
                        2
                      </div>
                      <h3 className="text-lg font-semibold">Make your first request</h3>
                    </div>
                    <CodeBlock
                      code={`curl -X POST https://verbatim.app/api/transcribe \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -F "file=@audio.mp3"`}
                    />
                  </div>
                </div>
              </motion.div>
            </section>

            {/* Authentication */}
            <section id="authentication" className="mb-16 scroll-mt-24">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
              >
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-yellow-500/10 rounded-xl flex items-center justify-center">
                    <Key className="w-5 h-5 text-yellow-500" />
                  </div>
                  <h2 className="text-2xl font-bold">Authentication</h2>
                </div>

                <div className="card p-6 mb-6">
                  <p className="text-muted-foreground mb-4">
                    All API requests require authentication using a Bearer token. Include your API key
                    in the Authorization header:
                  </p>
                  <CodeBlock
                    code={`Authorization: Bearer vbt_xxxxxxxxxxxxxxxxxxxx`}
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div className="card p-6">
                    <h3 className="font-semibold mb-4 flex items-center gap-2">
                      <div className="w-8 h-8 bg-green-500/10 rounded-lg flex items-center justify-center">
                        <Shield className="w-4 h-4 text-green-500" />
                      </div>
                      Security Best Practices
                    </h3>
                    <ul className="text-sm text-muted-foreground space-y-2">
                      <li className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                        Never expose API keys in client-side code
                      </li>
                      <li className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                        Use environment variables for key storage
                      </li>
                      <li className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                        Rotate keys periodically
                      </li>
                      <li className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                        Use separate keys for development/production
                      </li>
                    </ul>
                  </div>

                  <div className="card p-6">
                    <h3 className="font-semibold mb-4 flex items-center gap-2">
                      <div className="w-8 h-8 bg-purple-500/10 rounded-lg flex items-center justify-center">
                        <Gauge className="w-4 h-4 text-purple-500" />
                      </div>
                      Rate Limits
                    </h3>
                    <ul className="text-sm space-y-2">
                      <li className="flex justify-between">
                        <span className="text-muted-foreground">Free tier</span>
                        <span className="font-mono">10 req/min</span>
                      </li>
                      <li className="flex justify-between">
                        <span className="text-muted-foreground">Creator tier</span>
                        <span className="font-mono">30 req/min</span>
                      </li>
                      <li className="flex justify-between">
                        <span className="text-muted-foreground">Pro tier</span>
                        <span className="font-mono">60 req/min</span>
                      </li>
                      <li className="flex justify-between">
                        <span className="text-muted-foreground">Unlimited tier</span>
                        <span className="font-mono">120 req/min</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </motion.div>
            </section>

            {/* API Endpoints */}
            <section id="endpoints" className="mb-16 scroll-mt-24">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
              >
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center">
                    <Terminal className="w-5 h-5 text-blue-500" />
                  </div>
                  <h2 className="text-2xl font-bold">API Endpoints</h2>
                </div>

                <div className="space-y-6">
                  {endpoints.map((endpoint, index) => (
                    <motion.div
                      key={endpoint.path}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: index * 0.1 }}
                      className="card overflow-hidden"
                    >
                      <div className="p-6 border-b border-border">
                        <div className="flex items-center gap-3 mb-2">
                          <span
                            className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold ${
                              endpoint.method === 'GET'
                                ? 'bg-green-500/20 text-green-400'
                                : 'bg-blue-500/20 text-blue-400'
                            }`}
                          >
                            {endpoint.method}
                          </span>
                          <code className="text-lg font-mono">{endpoint.path}</code>
                          {endpoint.auth && (
                            <span className="px-2 py-1 rounded-lg text-xs bg-yellow-500/20 text-yellow-400 border border-yellow-500/20">
                              Auth Required
                            </span>
                          )}
                        </div>
                        <p className="text-muted-foreground">{endpoint.description}</p>
                      </div>

                      {endpoint.params.length > 0 && (
                        <div className="p-6 border-b border-border bg-secondary/30">
                          <h4 className="font-semibold mb-3 text-sm text-muted-foreground uppercase tracking-wide">Parameters</h4>
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="text-left text-muted-foreground border-b border-border">
                                  <th className="pb-3 pr-4 font-medium">Name</th>
                                  <th className="pb-3 pr-4 font-medium">Type</th>
                                  <th className="pb-3 pr-4 font-medium">Required</th>
                                  <th className="pb-3 font-medium">Description</th>
                                </tr>
                              </thead>
                              <tbody>
                                {endpoint.params.map((param) => (
                                  <tr key={param.name} className="border-b border-border/50 last:border-0">
                                    <td className="py-3 pr-4 font-mono text-primary">{param.name}</td>
                                    <td className="py-3 pr-4 text-muted-foreground font-mono text-xs">{param.type}</td>
                                    <td className="py-3 pr-4">
                                      {param.required ? (
                                        <span className="px-2 py-0.5 rounded-full text-xs bg-red-500/10 text-red-400">Yes</span>
                                      ) : (
                                        <span className="px-2 py-0.5 rounded-full text-xs bg-muted text-muted-foreground">No</span>
                                      )}
                                    </td>
                                    <td className="py-3 text-muted-foreground">{param.description}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                      <div className="p-6">
                        <h4 className="font-semibold mb-3 text-sm text-muted-foreground uppercase tracking-wide">Response</h4>
                        <CodeBlock code={endpoint.response} language="json" />
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            </section>

            {/* Supported Formats */}
            <section id="formats" className="mb-16 scroll-mt-24">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
              >
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-orange-500/10 rounded-xl flex items-center justify-center">
                    <FileAudio className="w-5 h-5 text-orange-500" />
                  </div>
                  <h2 className="text-2xl font-bold">Supported Formats</h2>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div className="card p-6">
                    <h3 className="font-semibold mb-4">Audio Input Formats</h3>
                    <div className="flex flex-wrap gap-2">
                      {['MP3', 'WAV', 'FLAC', 'OGG', 'M4A', 'AAC'].map((format) => (
                        <span
                          key={format}
                          className="px-3 py-1.5 bg-primary/10 text-primary rounded-full text-sm font-medium border border-primary/20"
                        >
                          {format}
                        </span>
                      ))}
                    </div>
                    <p className="text-sm text-muted-foreground mt-4">
                      Maximum file size: 500MB. Audio files are processed securely and deleted after transcription.
                    </p>
                  </div>

                  <div className="card p-6">
                    <h3 className="font-semibold mb-4 flex items-center gap-2">
                      <Download className="w-5 h-5" />
                      Export Formats
                    </h3>
                    <div className="space-y-2 text-sm">
                      {[
                        { code: 'txt', desc: 'Plain text' },
                        { code: 'srt', desc: 'SubRip subtitles' },
                        { code: 'vtt', desc: 'WebVTT subtitles' },
                        { code: 'docx', desc: 'Word document' },
                        { code: 'json', desc: 'Structured JSON' },
                        { code: 'md', desc: 'Markdown' },
                      ].map((format) => (
                        <div key={format.code} className="flex justify-between py-1.5 border-b border-border/50 last:border-0">
                          <span className="font-mono text-primary">{format.code}</span>
                          <span className="text-muted-foreground">{format.desc}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            </section>

            {/* STT Models */}
            <section id="models" className="mb-16 scroll-mt-24">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
              >
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-purple-500/10 rounded-xl flex items-center justify-center">
                    <Gauge className="w-5 h-5 text-purple-500" />
                  </div>
                  <h2 className="text-2xl font-bold">STT Models</h2>
                </div>

                <p className="text-muted-foreground mb-6">
                  Verbatim supports 5 open-source speech-to-text engines. Each model has different
                  trade-offs between speed and accuracy.
                </p>

                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {models.map((model, index) => (
                    <motion.div
                      key={model.id}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: index * 0.1 }}
                      className="card p-5"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-semibold">{model.name}</h3>
                        {model.badge && (
                          <span className={`text-xs px-2 py-0.5 rounded-full border ${model.badgeColor}`}>
                            {model.badge}
                          </span>
                        )}
                      </div>
                      <code className="text-xs text-muted-foreground bg-secondary px-2 py-1 rounded inline-block mb-3">
                        {model.id}
                      </code>
                      <p className="text-sm text-muted-foreground mb-4">{model.description}</p>
                      <div className="flex gap-4 text-xs">
                        <div className="flex items-center gap-1.5">
                          <Zap className="w-3.5 h-3.5 text-muted-foreground" />
                          <span className="text-muted-foreground">Speed:</span>
                          <span className="text-primary font-medium">{model.speed}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Gauge className="w-3.5 h-3.5 text-muted-foreground" />
                          <span className="text-muted-foreground">Accuracy:</span>
                          <span className="text-primary font-medium">{model.accuracy}</span>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            </section>

            {/* Languages */}
            <section id="languages" className="mb-16 scroll-mt-24">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
              >
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-cyan-500/10 rounded-xl flex items-center justify-center">
                    <Languages className="w-5 h-5 text-cyan-500" />
                  </div>
                  <h2 className="text-2xl font-bold">Language Support</h2>
                </div>

                <div className="card p-6">
                  <p className="text-muted-foreground mb-4">
                    Verbatim supports automatic language detection and 99+ languages through Whisper-based models.
                    For best results, specify the language if known.
                  </p>

                  <h3 className="font-semibold mb-3">Popular Languages</h3>
                  <div className="flex flex-wrap gap-2 mb-6">
                    {['English', 'Spanish', 'French', 'German', 'Chinese', 'Japanese', 'Korean', 'Portuguese', 'Russian', 'Arabic'].map((lang) => (
                      <span key={lang} className="px-3 py-1.5 bg-secondary rounded-full text-sm border border-border">
                        {lang}
                      </span>
                    ))}
                    <span className="px-3 py-1.5 bg-secondary/50 rounded-full text-sm text-muted-foreground border border-border/50">
                      +89 more
                    </span>
                  </div>

                  <CodeBlock
                    code={`// Specify language for better accuracy
curl -X POST https://verbatim.app/api/transcribe \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -F "file=@audio.mp3" \\
  -F "language=es"`}
                  />
                </div>
              </motion.div>
            </section>

            {/* Speaker Diarization */}
            <section id="diarization" className="mb-16 scroll-mt-24">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
              >
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-pink-500/10 rounded-xl flex items-center justify-center">
                    <Users className="w-5 h-5 text-pink-500" />
                  </div>
                  <h2 className="text-2xl font-bold">Speaker Diarization</h2>
                </div>

                <div className="card p-6">
                  <p className="text-muted-foreground mb-4">
                    Enable speaker diarization to identify who said what in multi-speaker audio.
                    This feature uses 2x your minute quota due to additional processing.
                  </p>

                  <CodeBlock
                    code={`curl -X POST https://verbatim.app/api/transcribe \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -F "file=@interview.mp3" \\
  -F "diarization=true"`}
                  />

                  <h3 className="font-semibold mt-6 mb-3">Response with Speakers</h3>
                  <CodeBlock
                    code={`{
  "id": "txn_abc123",
  "text": "Hello, I'm the interviewer. Nice to meet you...",
  "segments": [
    { "start": 0.0, "end": 2.5, "text": "Hello, I'm the interviewer.", "speaker": "Speaker 1" },
    { "start": 2.5, "end": 5.0, "text": "Nice to meet you.", "speaker": "Speaker 2" }
  ]
}`}
                    language="json"
                  />
                </div>
              </motion.div>
            </section>

            {/* Footer */}
            <motion.footer
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              className="py-12 text-center border-t border-border"
            >
              <p className="text-muted-foreground">
                Need help? Contact us at{' '}
                <a href="mailto:support@verbatim.app" className="text-primary hover:underline">
                  support@verbatim.app
                </a>
              </p>
            </motion.footer>
          </main>
        </div>
      </div>
    </div>
  );
}
