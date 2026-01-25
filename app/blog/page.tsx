'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Mic,
  ArrowLeft,
  FileText,
  Calendar,
  ArrowRight,
  Tag,
  TrendingUp,
  Sparkles,
  BookOpen,
} from 'lucide-react';

const posts = [
  {
    title: 'Introducing Verbatim: Privacy-First Transcription',
    excerpt: 'We built Verbatim because we believe your audio data should stay private. Learn about our approach to secure, on-premise transcription.',
    date: '2024-01-15',
    readTime: '5 min read',
    slug: 'introducing-verbatim',
    tag: 'Announcement',
    tagColor: 'bg-blue-500/10 text-blue-400',
    featured: true,
  },
  {
    title: 'Comparing 5 Open-Source STT Engines',
    excerpt: 'A deep dive into the speech-to-text engines powering Verbatim: Faster Whisper, OpenAI Whisper, Vosk, whisper.cpp, and Wav2Vec2.',
    date: '2024-01-10',
    readTime: '8 min read',
    slug: 'comparing-stt-engines',
    tag: 'Technical',
    tagColor: 'bg-purple-500/10 text-purple-400',
    featured: false,
  },
  {
    title: 'Best Practices for Audio Transcription',
    excerpt: 'Tips and tricks for getting the best transcription results, including audio quality, format selection, and language settings.',
    date: '2024-01-05',
    readTime: '4 min read',
    slug: 'transcription-best-practices',
    tag: 'Tutorial',
    tagColor: 'bg-green-500/10 text-green-400',
    featured: false,
  },
  {
    title: 'Speaker Diarization: Who Said What?',
    excerpt: 'Understanding how speaker diarization works and when to use it for interviews, meetings, and multi-speaker recordings.',
    date: '2024-01-02',
    readTime: '6 min read',
    slug: 'speaker-diarization',
    tag: 'Feature',
    tagColor: 'bg-amber-500/10 text-amber-400',
    featured: false,
  },
];

const categories = [
  { name: 'All', count: posts.length },
  { name: 'Announcement', count: 1 },
  { name: 'Technical', count: 1 },
  { name: 'Tutorial', count: 1 },
  { name: 'Feature', count: 1 },
];

export default function BlogPage() {
  const featuredPost = posts.find(p => p.featured);
  const regularPosts = posts.filter(p => !p.featured);

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
      <section className="py-16 px-4 border-b border-border">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm mb-6">
              <BookOpen className="w-4 h-4" />
              Verbatim Blog
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              News, Updates & Insights
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Learn about transcription technology, privacy-first AI, and get the most out of Verbatim.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Featured Post */}
            {featuredPost && (
              <motion.article
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="card overflow-hidden group cursor-pointer"
              >
                <div className="relative h-48 bg-gradient-to-br from-primary/20 via-primary/10 to-background flex items-center justify-center">
                  <div className="absolute top-4 left-4">
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-primary text-white text-xs font-medium rounded-full">
                      <Sparkles className="w-3 h-3" />
                      Featured
                    </span>
                  </div>
                  <TrendingUp className="w-16 h-16 text-primary/30" />
                </div>
                <div className="p-6">
                  <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${featuredPost.tagColor}`}>
                      <Tag className="w-3 h-3" />
                      {featuredPost.tag}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {new Date(featuredPost.date).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </span>
                    <span className="flex items-center gap-1">
                      <FileText className="w-4 h-4" />
                      {featuredPost.readTime}
                    </span>
                  </div>
                  <h2 className="text-2xl font-bold mb-3 group-hover:text-primary transition-colors">
                    {featuredPost.title}
                  </h2>
                  <p className="text-muted-foreground mb-4">{featuredPost.excerpt}</p>
                  <span className="inline-flex items-center gap-2 text-primary font-medium group-hover:gap-3 transition-all">
                    Read more
                    <ArrowRight className="w-4 h-4" />
                  </span>
                </div>
              </motion.article>
            )}

            {/* Regular Posts */}
            <div className="space-y-6">
              {regularPosts.map((post, index) => (
                <motion.article
                  key={post.slug}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="card p-6 group cursor-pointer hover:border-primary/50 transition-all"
                >
                  <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${post.tagColor}`}>
                      <Tag className="w-3 h-3" />
                      {post.tag}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {new Date(post.date).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </span>
                    <span className="flex items-center gap-1">
                      <FileText className="w-4 h-4" />
                      {post.readTime}
                    </span>
                  </div>
                  <h2 className="text-xl font-semibold mb-2 group-hover:text-primary transition-colors">
                    {post.title}
                  </h2>
                  <p className="text-muted-foreground mb-4">{post.excerpt}</p>
                  <span className="inline-flex items-center gap-2 text-primary font-medium text-sm group-hover:gap-3 transition-all">
                    Read more
                    <ArrowRight className="w-4 h-4" />
                  </span>
                </motion.article>
              ))}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Categories */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="card p-6"
            >
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Tag className="w-5 h-5 text-primary" />
                Categories
              </h3>
              <div className="space-y-2">
                {categories.map((category) => (
                  <button
                    key={category.name}
                    className={`flex items-center justify-between w-full px-3 py-2 rounded-lg text-sm transition-colors ${
                      category.name === 'All'
                        ? 'bg-primary/10 text-primary'
                        : 'hover:bg-secondary text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <span>{category.name}</span>
                    <span className="text-xs bg-secondary px-2 py-0.5 rounded-full">
                      {category.count}
                    </span>
                  </button>
                ))}
              </div>
            </motion.div>

            {/* Newsletter */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="card p-6 bg-gradient-to-br from-primary/10 via-primary/5 to-background"
            >
              <h3 className="font-semibold mb-2">Stay Updated</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Get the latest articles and updates delivered to your inbox.
              </p>
              <div className="space-y-3">
                <input
                  type="email"
                  placeholder="you@example.com"
                  className="input text-sm"
                />
                <button className="btn-primary w-full text-sm">
                  Subscribe
                </button>
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                No spam, unsubscribe anytime.
              </p>
            </motion.div>

            {/* Quick Links */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="card p-6"
            >
              <h3 className="font-semibold mb-4">Quick Links</h3>
              <div className="space-y-3 text-sm">
                <Link
                  href="/docs"
                  className="flex items-center justify-between text-muted-foreground hover:text-foreground transition-colors"
                >
                  <span>API Documentation</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  href="/#pricing"
                  className="flex items-center justify-between text-muted-foreground hover:text-foreground transition-colors"
                >
                  <span>Pricing</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  href="/login"
                  className="flex items-center justify-between text-muted-foreground hover:text-foreground transition-colors"
                >
                  <span>Get Started</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-center mt-16 pt-8 border-t border-border"
        >
          <p className="text-muted-foreground">
            More articles coming soon. Follow us for updates.
          </p>
        </motion.div>
      </main>
    </div>
  );
}
