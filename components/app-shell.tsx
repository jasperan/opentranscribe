'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import {
  Mic,
  Radio,
  History,
  BarChart3,
  Settings,
  Key,
  LogOut,
  Menu,
  X,
  FileAudio,
  Clock,
  Plus,
} from 'lucide-react';
import type { User } from '@/lib/db/users';

interface Transcription {
  id: string;
  title: string;
  createdAt: string;
  duration: number;
}

interface AppShellProps {
  user: User;
  children: React.ReactNode;
}

const navigation = [
  { name: 'Transcribe', href: '/app', icon: Mic },
  { name: 'Live', href: '/app/live', icon: Radio },
  { name: 'History', href: '/app/history', icon: History },
  { name: 'Usage', href: '/app/usage', icon: BarChart3 },
  { name: 'API Keys', href: '/app/api-keys', icon: Key },
  { name: 'Settings', href: '/app/settings', icon: Settings },
];

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

export default function AppShell({ user, children }: AppShellProps) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [recentTranscriptions, setRecentTranscriptions] = useState<Transcription[]>([]);
  const [loadingRecent, setLoadingRecent] = useState(true);

  // Fetch recent transcriptions
  useEffect(() => {
    async function fetchRecent() {
      try {
        const res = await fetch('/api/transcriptions?limit=5');
        if (res.ok) {
          const data = await res.json();
          setRecentTranscriptions(data.transcriptions || []);
        }
      } catch (error) {
        console.error('Failed to fetch recent transcriptions:', error);
      } finally {
        setLoadingRecent(false);
      }
    }
    fetchRecent();
  }, []);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/';
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-card border-r border-border transform transition-transform duration-200 lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between h-16 px-4 border-b border-border">
            <Link href="/app" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <Mic className="w-5 h-5 text-white" />
              </div>
              <span className="text-lg font-bold">Verbatim</span>
            </Link>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-2 hover:bg-accent rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="p-4 space-y-1">
            {navigation.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-primary text-white'
                      : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {/* Recent Transcriptions */}
          <div className="flex-1 px-4 pb-4 overflow-hidden flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Recent
              </h3>
              <Link
                href="/app"
                className="p-1 hover:bg-accent rounded-md transition-colors"
                title="New transcription"
              >
                <Plus className="w-4 h-4 text-muted-foreground" />
              </Link>
            </div>

            <div className="flex-1 overflow-y-auto scrollbar-dark space-y-1">
              {loadingRecent ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="animate-pulse">
                      <div className="h-12 bg-muted rounded-lg" />
                    </div>
                  ))}
                </div>
              ) : recentTranscriptions.length > 0 ? (
                recentTranscriptions.map((t) => (
                  <Link
                    key={t.id}
                    href={`/app/history?id=${t.id}`}
                    className="block p-2 rounded-lg hover:bg-accent transition-colors group"
                  >
                    <div className="flex items-start gap-2">
                      <FileAudio className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate group-hover:text-foreground">
                          {t.title || 'Untitled'}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatDuration(t.duration)}
                          </span>
                          <span>•</span>
                          <span>{formatRelativeTime(t.createdAt)}</span>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))
              ) : (
                <div className="text-center py-6">
                  <FileAudio className="w-8 h-8 text-muted-foreground/50 mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">No transcriptions yet</p>
                </div>
              )}
            </div>
          </div>

          {/* User section */}
          <div className="p-4 border-t border-border">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                <span className="text-primary font-medium">
                  {user.email[0].toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{user.email}</p>
                <p className="text-xs text-muted-foreground capitalize">
                  {user.tier} plan
                </p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 w-full px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Sign out
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Mobile header */}
        <header className="sticky top-0 z-30 flex items-center h-16 px-4 bg-background/80 backdrop-blur-xl border-b border-border lg:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 hover:bg-accent rounded-lg"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 ml-4">
            <div className="w-6 h-6 bg-primary rounded-md flex items-center justify-center">
              <Mic className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold">Verbatim</span>
          </div>
        </header>

        {/* Page content */}
        <main className="p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
