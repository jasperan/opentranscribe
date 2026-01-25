'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { BarChart3, TrendingUp, AlertTriangle, Sparkles } from 'lucide-react';
import Link from 'next/link';

interface UsageData {
  used: number;
  limit: number;
  remaining: number;
  percentage: number;
  tier: string;
}

export default function UsageMeter() {
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUsage = async () => {
      try {
        const response = await fetch('/api/user/usage');
        if (response.ok) {
          const data = await response.json();
          setUsage(data);
        }
      } catch (err) {
        console.error('Failed to fetch usage:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchUsage();
  }, []);

  if (loading) {
    return (
      <div className="card p-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-4 h-4 bg-muted rounded animate-pulse" />
          <div className="h-4 bg-muted rounded w-24 animate-pulse" />
        </div>
        <div className="h-2 bg-muted rounded w-full animate-pulse mb-2" />
        <div className="flex justify-between">
          <div className="h-3 bg-muted rounded w-16 animate-pulse" />
          <div className="h-3 bg-muted rounded w-20 animate-pulse" />
        </div>
      </div>
    );
  }

  if (!usage) return null;

  const isUnlimited = usage.limit === -1;
  const isWarning = !isUnlimited && usage.percentage >= 80;
  const isCritical = !isUnlimited && usage.percentage >= 95;

  const formatMinutes = (mins: number): string => {
    if (mins === -1) return 'Unlimited';
    if (mins >= 60) {
      const hours = Math.floor(mins / 60);
      const remaining = mins % 60;
      return remaining > 0 ? `${hours}h ${remaining}m` : `${hours}h`;
    }
    return `${mins}m`;
  };

  const getProgressColor = () => {
    if (isCritical) return 'bg-destructive';
    if (isWarning) return 'bg-amber-500';
    return 'bg-primary';
  };

  const getStatusIcon = () => {
    if (isCritical) return <AlertTriangle className="w-4 h-4 text-destructive" />;
    if (isWarning) return <TrendingUp className="w-4 h-4 text-amber-500" />;
    return <BarChart3 className="w-4 h-4 text-muted-foreground" />;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="card p-4"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {getStatusIcon()}
          <span className="text-sm font-medium">Usage this month</span>
        </div>
        <Link
          href="/app/usage"
          className="text-xs text-primary hover:underline"
        >
          View details
        </Link>
      </div>

      {/* Progress bar */}
      <div className="h-2 bg-muted rounded-full overflow-hidden mb-2">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: isUnlimited ? '0%' : `${Math.min(usage.percentage, 100)}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className={`h-full rounded-full ${getProgressColor()}`}
        />
      </div>

      {/* Stats */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">
          {formatMinutes(usage.used)} used
        </span>
        <span className={`font-medium ${isCritical ? 'text-destructive' : ''}`}>
          {isUnlimited
            ? 'Unlimited'
            : `${formatMinutes(usage.remaining)} remaining`}
        </span>
      </div>

      {/* Warning message */}
      {isCritical && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="mt-3 pt-3 border-t border-border"
        >
          <div className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span className="text-xs font-medium">Running low on minutes</span>
          </div>
        </motion.div>
      )}

      {/* Upgrade prompt for free tier */}
      {usage.tier === 'free' && usage.percentage >= 50 && !isCritical && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="mt-3 pt-3 border-t border-border"
        >
          <Link
            href="/pricing"
            className="flex items-center gap-2 text-xs text-primary hover:underline group"
          >
            <Sparkles className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
            Upgrade for more minutes
          </Link>
        </motion.div>
      )}
    </motion.div>
  );
}
