'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Mic, ArrowLeft, FileText } from 'lucide-react';

export default function BlogPostPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-background/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <Mic className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold">Verbatim</span>
            </Link>
            <Link
              href="/blog"
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Blog
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <FileText className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold mb-4">Coming Soon</h1>
          <p className="text-muted-foreground text-lg mb-8 max-w-md mx-auto">
            This blog post is being written and will be published shortly. Check back soon!
          </p>
          <Link
            href="/blog"
            className="btn-primary inline-flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Browse all articles
          </Link>
        </motion.div>
      </main>
    </div>
  );
}
