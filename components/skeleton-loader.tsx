'use client';

import { motion } from 'framer-motion';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular';
  width?: string | number;
  height?: string | number;
  lines?: number;
}

function SkeletonLine({
  className = '',
  width,
  height,
  delay = 0,
}: {
  className?: string;
  width?: string | number;
  height?: string | number;
  delay?: number;
}) {
  return (
    <div
      className={`relative overflow-hidden rounded bg-muted ${className}`}
      style={{ width, height }}
    >
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent"
        initial={{ x: '-100%' }}
        animate={{ x: '100%' }}
        transition={{
          repeat: Infinity,
          duration: 1.5,
          ease: 'linear',
          delay,
        }}
      />
    </div>
  );
}

export default function SkeletonLoader({
  className = '',
  variant = 'text',
  width,
  height,
  lines = 1,
}: SkeletonProps) {
  if (variant === 'circular') {
    return (
      <SkeletonLine
        className={`rounded-full ${className}`}
        width={width || 40}
        height={height || 40}
      />
    );
  }

  if (variant === 'rectangular') {
    return (
      <SkeletonLine
        className={className}
        width={width || '100%'}
        height={height || 120}
      />
    );
  }

  // Text variant with multiple lines
  return (
    <div className={`space-y-3 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <SkeletonLine
          key={i}
          className="h-4"
          width={i === lines - 1 && lines > 1 ? '70%' : '100%'}
          delay={i * 0.1}
        />
      ))}
    </div>
  );
}

// Pre-built skeleton patterns for common use cases
export function TranscriptionSkeleton() {
  return (
    <div className="space-y-6 p-6">
      {/* Header skeleton */}
      <div className="flex items-center gap-4">
        <SkeletonLine className="w-12 h-12 rounded-xl" />
        <div className="flex-1 space-y-2">
          <SkeletonLine className="h-5 w-48" />
          <SkeletonLine className="h-4 w-72" />
        </div>
      </div>

      {/* Audio player skeleton */}
      <div className="rounded-xl border border-border p-4 space-y-4">
        <SkeletonLine className="h-16 rounded-lg" delay={0.1} />
        <div className="flex items-center gap-4">
          <SkeletonLine className="w-10 h-10 rounded-full" delay={0.2} />
          <SkeletonLine className="flex-1 h-2 rounded-full" delay={0.3} />
          <SkeletonLine className="w-16 h-4" delay={0.4} />
        </div>
      </div>

      {/* Transcript lines skeleton */}
      <div className="space-y-3">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-start gap-3 px-3 py-2">
            <SkeletonLine className="w-14 h-4" delay={i * 0.05} />
            <SkeletonLine
              className="flex-1 h-4"
              width={`${85 - i * 10}%`}
              delay={i * 0.05 + 0.1}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

export function HistoryItemSkeleton() {
  return (
    <div className="card p-4">
      <div className="flex items-start gap-4">
        <SkeletonLine className="w-12 h-12 rounded-xl" />
        <div className="flex-1 space-y-2">
          <SkeletonLine className="h-5 w-56" />
          <div className="flex items-center gap-3">
            <SkeletonLine className="h-4 w-20" delay={0.1} />
            <SkeletonLine className="h-4 w-16" delay={0.15} />
            <SkeletonLine className="h-4 w-24" delay={0.2} />
          </div>
          <SkeletonLine className="h-4 w-full" delay={0.25} />
        </div>
      </div>
    </div>
  );
}

export function HistoryListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
        >
          <HistoryItemSkeleton />
        </motion.div>
      ))}
    </div>
  );
}
