'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart3,
  Clock,
  Zap,
  TrendingUp,
  Calendar,
  Loader2,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  CreditCard,
  CheckCircle,
} from 'lucide-react';
import Link from 'next/link';

interface UsageData {
  used: number;
  limit: number;
  tier: string;
  transcriptionCount?: number;
  apiCalls?: number;
  history: Array<{
    date: string;
    minutes: number;
  }>;
}

// Simple bar chart component
function UsageChart({ data }: { data: Array<{ date: string; minutes: number }> }) {
  const maxMinutes = Math.max(...data.map(d => d.minutes), 1);

  return (
    <div className="flex items-end gap-1 h-32">
      {data.map((day, index) => {
        const height = (day.minutes / maxMinutes) * 100;
        const date = new Date(day.date);
        const isToday = new Date().toDateString() === date.toDateString();

        return (
          <div
            key={day.date}
            className="flex-1 flex flex-col items-center gap-1 group"
          >
            <div className="relative w-full flex flex-col items-center">
              {/* Tooltip */}
              <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-foreground text-background text-xs px-2 py-1 rounded whitespace-nowrap z-10">
                {day.minutes}m on {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </div>

              {/* Bar */}
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: `${Math.max(height, 4)}%` }}
                transition={{ delay: index * 0.02, duration: 0.3 }}
                className={`w-full rounded-t transition-colors ${
                  isToday
                    ? 'bg-primary'
                    : day.minutes > 0
                      ? 'bg-primary/60 group-hover:bg-primary/80'
                      : 'bg-muted'
                }`}
                style={{ minHeight: '4px' }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function UsagePage() {
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchUsage = async () => {
      try {
        const response = await fetch('/api/user/usage');
        if (response.ok) {
          const data = await response.json();
          setUsage(data);
        }
      } catch (error) {
        console.error('Failed to fetch usage:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUsage();
  }, []);

  // Generate last 30 days of data (fill in with history or zeros)
  const chartData = useMemo(() => {
    const days: Array<{ date: string; minutes: number }> = [];
    const historyMap = new Map(
      (usage?.history || []).map(h => [h.date, h.minutes])
    );

    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      days.push({
        date: dateStr,
        minutes: historyMap.get(dateStr) || 0,
      });
    }

    return days;
  }, [usage?.history]);

  const formatMinutes = (minutes: number): string => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  const getUsagePercentage = (): number => {
    if (!usage || usage.limit === -1) return 0;
    return Math.min((usage.used / usage.limit) * 100, 100);
  };

  const tierConfig: Record<string, { name: string; color: string; bgColor: string; features: string[] }> = {
    free: {
      name: 'Free',
      color: 'text-muted-foreground',
      bgColor: 'bg-muted',
      features: ['500 minutes/month', 'Standard quality', 'Email support']
    },
    creator: {
      name: 'Creator',
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10',
      features: ['3,000 minutes/month', 'High quality', 'Priority support', 'API access']
    },
    pro: {
      name: 'Pro',
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/10',
      features: ['10,000 minutes/month', 'Highest quality', '24/7 support', 'Full API access', 'Custom models']
    },
    unlimited: {
      name: 'Unlimited',
      color: 'text-amber-400',
      bgColor: 'bg-amber-500/10',
      features: ['Unlimited minutes', 'Highest quality', 'Dedicated support', 'Full API access', 'Custom models', 'SLA']
    },
  };

  const currentTier = tierConfig[usage?.tier || 'free'];
  const percentage = getUsagePercentage();
  const isLowOnMinutes = percentage > 80 && usage?.limit !== -1;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Usage & Billing</h1>
        <p className="text-muted-foreground">
          Monitor your transcription usage and manage your plan.
        </p>
      </div>

      {/* Current Plan Card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="card p-6 mb-6"
      >
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-12 h-12 ${currentTier.bgColor} rounded-xl flex items-center justify-center`}>
                <Sparkles className={`w-6 h-6 ${currentTier.color}`} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Current Plan</p>
                <h2 className={`text-2xl font-bold ${currentTier.color}`}>
                  {currentTier.name}
                </h2>
              </div>
            </div>

            {/* Plan features */}
            <div className="grid grid-cols-2 gap-2 mb-4">
              {currentTier.features.slice(0, 4).map((feature) => (
                <div key={feature} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  {feature}
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Link href="/pricing" className="btn-primary flex items-center gap-2">
              <ArrowUpRight className="w-4 h-4" />
              Upgrade Plan
            </Link>
            <Link href="/app/settings" className="btn-secondary flex items-center gap-2">
              <CreditCard className="w-4 h-4" />
              Manage Billing
            </Link>
          </div>
        </div>

        {/* Usage Bar */}
        <div className="mt-6 pt-6 border-t border-border">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-muted-foreground">Minutes used this month</span>
            <span className="font-medium">
              {formatMinutes(usage?.used || 0)} / {usage?.limit === -1 ? 'Unlimited' : formatMinutes(usage?.limit || 500)}
            </span>
          </div>
          <div className="h-4 bg-muted rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${percentage}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className={`h-full rounded-full transition-colors ${
                isLowOnMinutes ? 'bg-amber-500' : 'bg-primary'
              }`}
            />
          </div>
          <div className="flex items-center justify-between mt-2">
            {usage?.limit !== -1 ? (
              <p className={`text-sm ${isLowOnMinutes ? 'text-amber-500' : 'text-muted-foreground'}`}>
                {isLowOnMinutes && '⚠️ '}{formatMinutes((usage?.limit || 500) - (usage?.used || 0))} remaining
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">Unlimited usage</p>
            )}
            <p className="text-sm text-muted-foreground">
              Resets on {new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid md:grid-cols-3 gap-4 mb-6">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="card p-5"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
              <Clock className="w-5 h-5 text-primary" />
            </div>
            <span className="flex items-center gap-1 text-xs text-green-500">
              <ArrowUpRight className="w-3 h-3" />
              This month
            </span>
          </div>
          <p className="text-sm text-muted-foreground mb-1">Total Minutes</p>
          <p className="text-3xl font-bold">{formatMinutes(usage?.used || 0)}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="card p-5"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-green-500/10 rounded-xl flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-green-500" />
            </div>
          </div>
          <p className="text-sm text-muted-foreground mb-1">Transcriptions</p>
          <p className="text-3xl font-bold">{usage?.transcriptionCount || 0}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="card p-5"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-purple-500/10 rounded-xl flex items-center justify-center">
              <Zap className="w-5 h-5 text-purple-500" />
            </div>
          </div>
          <p className="text-sm text-muted-foreground mb-1">API Calls</p>
          <p className="text-3xl font-bold">{usage?.apiCalls || 0}</p>
        </motion.div>
      </div>

      {/* Usage History Chart */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="card p-6"
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold">Usage History</h3>
            <p className="text-sm text-muted-foreground">Daily transcription minutes</p>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground bg-secondary px-3 py-1.5 rounded-lg">
            <Calendar className="w-4 h-4" />
            Last 30 days
          </div>
        </div>

        {chartData.some(d => d.minutes > 0) ? (
          <div>
            <UsageChart data={chartData} />
            <div className="flex justify-between mt-2 text-xs text-muted-foreground">
              <span>{new Date(chartData[0].date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
              <span>Today</span>
            </div>
          </div>
        ) : (
          <div className="h-32 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <TrendingUp className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>No usage data yet</p>
              <p className="text-sm">Start transcribing to see your usage history</p>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
