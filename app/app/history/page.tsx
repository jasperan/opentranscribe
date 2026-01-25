'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import {
  Clock,
  FileAudio,
  Download,
  Trash2,
  Search,
  Filter,
  Loader2,
  Play,
  CheckCircle,
  AlertCircle,
  MoreHorizontal,
  Eye,
  Copy,
  Share2,
  Calendar,
  ChevronDown,
  X,
} from 'lucide-react';

interface Transcription {
  id: string;
  filename: string;
  model: string;
  language: string;
  duration: number;
  minutesCharged: number;
  createdAt: string;
  status: 'completed' | 'processing' | 'failed';
  text?: string;
}

type FilterStatus = 'all' | 'completed' | 'processing' | 'failed';
type SortBy = 'date' | 'duration' | 'name';

export default function HistoryPage() {
  const [transcriptions, setTranscriptions] = useState<Transcription[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [sortBy, setSortBy] = useState<SortBy>('date');
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showActionMenu, setShowActionMenu] = useState<string | null>(null);

  useEffect(() => {
    // Fetch transcription history
    const fetchHistory = async () => {
      try {
        const response = await fetch('/api/transcriptions');
        if (response.ok) {
          const data = await response.json();
          setTranscriptions(data.transcriptions || []);
        }
      } catch (error) {
        console.error('Failed to fetch history:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchHistory();
  }, []);

  // Close menus when clicking outside
  useEffect(() => {
    const handleClick = () => {
      setShowFilterMenu(false);
      setShowActionMenu(null);
    };
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  const filteredTranscriptions = transcriptions
    .filter((t) => {
      const matchesSearch = t.filename.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = filterStatus === 'all' || t.status === filterStatus;
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'date':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'duration':
          return b.duration - a.duration;
        case 'name':
          return a.filename.localeCompare(b.filename);
        default:
          return 0;
      }
    });

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins >= 60) {
      const hours = Math.floor(mins / 60);
      const remainingMins = mins % 60;
      return `${hours}h ${remainingMins}m`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return `Today at ${date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
    } else if (diffDays === 1) {
      return `Yesterday at ${date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
    } else if (diffDays < 7) {
      return date.toLocaleDateString('en-US', { weekday: 'long', hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusInfo = (status: Transcription['status']) => {
    switch (status) {
      case 'completed':
        return { icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-500/10', label: 'Completed' };
      case 'processing':
        return { icon: Loader2, color: 'text-blue-500', bg: 'bg-blue-500/10', label: 'Processing', animate: true };
      case 'failed':
        return { icon: AlertCircle, color: 'text-red-500', bg: 'bg-red-500/10', label: 'Failed' };
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this transcription?')) return;

    try {
      const response = await fetch(`/api/transcriptions/${id}`, { method: 'DELETE' });
      if (response.ok) {
        setTranscriptions(prev => prev.filter(t => t.id !== id));
      }
    } catch (error) {
      console.error('Failed to delete:', error);
    }
  };

  const handleCopyText = async (text?: string) => {
    if (!text) return;
    await navigator.clipboard.writeText(text);
  };

  const stats = {
    total: transcriptions.length,
    completed: transcriptions.filter(t => t.status === 'completed').length,
    totalMinutes: transcriptions.reduce((acc, t) => acc + Math.ceil(t.duration / 60), 0),
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Transcription History</h1>
        <p className="text-muted-foreground">
          View and manage your past transcriptions.
        </p>
      </div>

      {/* Stats Cards */}
      {!isLoading && transcriptions.length > 0 && (
        <div className="grid grid-cols-3 gap-4 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="card p-4"
          >
            <p className="text-sm text-muted-foreground mb-1">Total Transcriptions</p>
            <p className="text-2xl font-bold">{stats.total}</p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="card p-4"
          >
            <p className="text-sm text-muted-foreground mb-1">Completed</p>
            <p className="text-2xl font-bold text-green-500">{stats.completed}</p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="card p-4"
          >
            <p className="text-sm text-muted-foreground mb-1">Total Audio</p>
            <p className="text-2xl font-bold">{stats.totalMinutes} min</p>
          </motion.div>
        </div>
      )}

      {/* Search and Filter */}
      <div className="flex flex-wrap gap-4 mb-6">
        <div className="flex-1 min-w-[200px] relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search transcriptions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input pl-10 pr-10"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filter dropdown */}
        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowFilterMenu(!showFilterMenu);
            }}
            className="btn-secondary flex items-center gap-2"
          >
            <Filter className="w-4 h-4" />
            {filterStatus === 'all' ? 'All Status' : filterStatus.charAt(0).toUpperCase() + filterStatus.slice(1)}
            <ChevronDown className="w-4 h-4" />
          </button>

          <AnimatePresence>
            {showFilterMenu && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 5 }}
                className="absolute top-full mt-2 right-0 bg-card border border-border rounded-lg shadow-lg py-1 min-w-[150px] z-10"
                onClick={(e) => e.stopPropagation()}
              >
                {(['all', 'completed', 'processing', 'failed'] as FilterStatus[]).map((status) => (
                  <button
                    key={status}
                    onClick={() => {
                      setFilterStatus(status);
                      setShowFilterMenu(false);
                    }}
                    className={`w-full px-4 py-2 text-sm text-left hover:bg-accent transition-colors ${
                      filterStatus === status ? 'text-primary font-medium' : 'text-muted-foreground'
                    }`}
                  >
                    {status === 'all' ? 'All Status' : status.charAt(0).toUpperCase() + status.slice(1)}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Sort dropdown */}
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as SortBy)}
          className="btn-secondary appearance-none cursor-pointer pr-8"
          style={{ backgroundImage: 'none' }}
        >
          <option value="date">Sort by Date</option>
          <option value="duration">Sort by Duration</option>
          <option value="name">Sort by Name</option>
        </select>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      ) : filteredTranscriptions.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="card p-12 text-center"
        >
          <div className="w-16 h-16 bg-muted rounded-2xl flex items-center justify-center mx-auto mb-4">
            {searchQuery || filterStatus !== 'all' ? (
              <Search className="w-8 h-8 text-muted-foreground" />
            ) : (
              <Clock className="w-8 h-8 text-muted-foreground" />
            )}
          </div>
          <h2 className="text-xl font-semibold mb-2">
            {searchQuery || filterStatus !== 'all' ? 'No results found' : 'No transcriptions yet'}
          </h2>
          <p className="text-muted-foreground mb-6">
            {searchQuery
              ? 'Try adjusting your search or filters.'
              : filterStatus !== 'all'
                ? `No ${filterStatus} transcriptions found.`
                : 'Your transcription history will appear here.'}
          </p>
          {!searchQuery && filterStatus === 'all' && (
            <Link href="/app" className="btn-primary inline-block">
              Create your first transcription
            </Link>
          )}
        </motion.div>
      ) : (
        <div className="space-y-3">
          {filteredTranscriptions.map((transcription, index) => {
            const statusInfo = getStatusInfo(transcription.status);
            const StatusIcon = statusInfo.icon;

            return (
              <motion.div
                key={transcription.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
                className={`card p-4 transition-all hover:border-primary/30 ${
                  selectedId === transcription.id ? 'border-primary' : ''
                }`}
              >
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div className={`w-12 h-12 ${statusInfo.bg} rounded-xl flex items-center justify-center flex-shrink-0`}>
                    <StatusIcon className={`w-6 h-6 ${statusInfo.color} ${statusInfo.animate ? 'animate-spin' : ''}`} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <h3 className="font-medium truncate">{transcription.filename}</h3>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-sm text-muted-foreground">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${statusInfo.bg} ${statusInfo.color}`}>
                            {statusInfo.label}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            {formatDuration(transcription.duration)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" />
                            {formatDate(transcription.createdAt)}
                          </span>
                          <span className="px-2 py-0.5 bg-secondary rounded text-xs">
                            {transcription.model}
                          </span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {transcription.status === 'completed' && (
                          <>
                            <Link
                              href={`/app/history?id=${transcription.id}`}
                              className="btn-ghost p-2"
                              title="View transcription"
                            >
                              <Eye className="w-4 h-4" />
                            </Link>
                            <button
                              className="btn-ghost p-2"
                              title="Download"
                            >
                              <Download className="w-4 h-4" />
                            </button>
                          </>
                        )}

                        {/* More actions menu */}
                        <div className="relative">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowActionMenu(showActionMenu === transcription.id ? null : transcription.id);
                            }}
                            className="btn-ghost p-2"
                          >
                            <MoreHorizontal className="w-4 h-4" />
                          </button>

                          <AnimatePresence>
                            {showActionMenu === transcription.id && (
                              <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="absolute top-full mt-1 right-0 bg-card border border-border rounded-lg shadow-lg py-1 min-w-[140px] z-10"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {transcription.status === 'completed' && (
                                  <>
                                    <button
                                      onClick={() => handleCopyText(transcription.text)}
                                      className="w-full px-3 py-2 text-sm text-left hover:bg-accent transition-colors flex items-center gap-2"
                                    >
                                      <Copy className="w-4 h-4" />
                                      Copy text
                                    </button>
                                    <button
                                      className="w-full px-3 py-2 text-sm text-left hover:bg-accent transition-colors flex items-center gap-2"
                                    >
                                      <Share2 className="w-4 h-4" />
                                      Share
                                    </button>
                                  </>
                                )}
                                <button
                                  onClick={() => {
                                    handleDelete(transcription.id);
                                    setShowActionMenu(null);
                                  }}
                                  className="w-full px-3 py-2 text-sm text-left hover:bg-accent transition-colors flex items-center gap-2 text-destructive"
                                >
                                  <Trash2 className="w-4 h-4" />
                                  Delete
                                </button>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>
                    </div>

                    {/* Preview text for completed transcriptions */}
                    {transcription.status === 'completed' && transcription.text && (
                      <p className="mt-3 text-sm text-muted-foreground line-clamp-2">
                        {transcription.text}
                      </p>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Results count */}
      {!isLoading && filteredTranscriptions.length > 0 && (
        <div className="mt-6 text-center text-sm text-muted-foreground">
          Showing {filteredTranscriptions.length} of {transcriptions.length} transcriptions
        </div>
      )}
    </div>
  );
}
