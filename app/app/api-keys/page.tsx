'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Key,
  Plus,
  Copy,
  Trash2,
  Check,
  Loader2,
  AlertCircle,
  Shield,
  Clock,
  Activity,
  ExternalLink,
  X,
  AlertTriangle,
} from 'lucide-react';

interface ApiKey {
  id: string;
  name: string;
  prefix: string;
  createdAt: string;
  lastUsed: string | null;
  usageCount?: number;
}

export default function ApiKeysPage() {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyValue, setNewKeyValue] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deleteModalKey, setDeleteModalKey] = useState<ApiKey | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchApiKeys();
  }, []);

  const fetchApiKeys = async () => {
    try {
      const response = await fetch('/api/user/api-keys');
      if (response.ok) {
        const data = await response.json();
        setApiKeys(data.keys || []);
      }
    } catch (error) {
      console.error('Failed to fetch API keys:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const createApiKey = async () => {
    if (!newKeyName.trim()) return;

    setIsCreating(true);
    try {
      const response = await fetch('/api/user/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newKeyName }),
      });

      if (response.ok) {
        const data = await response.json();
        setNewKeyValue(data.key);
        setApiKeys([data.keyInfo, ...apiKeys]);
        setNewKeyName('');
      }
    } catch (error) {
      console.error('Failed to create API key:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const deleteApiKey = async () => {
    if (!deleteModalKey) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/user/api-keys/${deleteModalKey.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setApiKeys(apiKeys.filter((k) => k.id !== deleteModalKey.id));
        setDeleteModalKey(null);
      }
    } catch (error) {
      console.error('Failed to delete API key:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const copyToClipboard = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatRelativeTime = (dateString: string | null): string => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return formatDate(dateString);
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">API Keys</h1>
        <p className="text-muted-foreground">
          Manage API keys for programmatic access to Verbatim.
        </p>
      </div>

      {/* Quick Stats */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6"
      >
        <div className="card p-4 flex items-center gap-4">
          <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
            <Key className="w-6 h-6 text-primary" />
          </div>
          <div>
            <p className="text-2xl font-bold">{apiKeys.length}</p>
            <p className="text-sm text-muted-foreground">Active Keys</p>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-4">
          <div className="w-12 h-12 bg-green-500/10 rounded-xl flex items-center justify-center">
            <Activity className="w-6 h-6 text-green-500" />
          </div>
          <div>
            <p className="text-2xl font-bold">
              {apiKeys.filter(k => k.lastUsed).length}
            </p>
            <p className="text-sm text-muted-foreground">Keys Used</p>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center">
            <Shield className="w-6 h-6 text-blue-500" />
          </div>
          <div>
            <p className="text-2xl font-bold">256-bit</p>
            <p className="text-sm text-muted-foreground">Encryption</p>
          </div>
        </div>
      </motion.div>

      {/* Create New Key */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="card p-6 mb-6"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
            <Plus className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold">Create New API Key</h3>
            <p className="text-sm text-muted-foreground">Generate a new key for API access</p>
          </div>
        </div>
        <div className="flex gap-4">
          <input
            type="text"
            placeholder="Key name (e.g., Production, Development)"
            value={newKeyName}
            onChange={(e) => setNewKeyName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && createApiKey()}
            className="input flex-1"
          />
          <button
            onClick={createApiKey}
            disabled={!newKeyName.trim() || isCreating}
            className="btn-primary flex items-center gap-2"
          >
            {isCreating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Plus className="w-4 h-4" />
            )}
            Create Key
          </button>
        </div>

        {/* New Key Display */}
        <AnimatePresence>
          {newKeyValue && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-4 p-4 bg-green-500/10 border border-green-500/20 rounded-lg overflow-hidden"
            >
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-green-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                  <AlertCircle className="w-4 h-4 text-green-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-green-500 mb-2">
                    Save this key now! It won&apos;t be shown again.
                  </p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 p-3 bg-background rounded-lg font-mono text-sm break-all border border-border">
                      {newKeyValue}
                    </code>
                    <button
                      onClick={() => copyToClipboard(newKeyValue, 'new')}
                      className="btn-secondary p-3 flex-shrink-0"
                    >
                      {copiedId === 'new' ? (
                        <Check className="w-4 h-4 text-green-500" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                  <button
                    onClick={() => setNewKeyValue(null)}
                    className="text-sm text-muted-foreground hover:text-foreground mt-2 flex items-center gap-1"
                  >
                    <X className="w-3 h-3" />
                    Dismiss
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* API Keys List */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="card p-6"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-secondary rounded-lg flex items-center justify-center">
              <Key className="w-5 h-5 text-muted-foreground" />
            </div>
            <div>
              <h3 className="font-semibold">Your API Keys</h3>
              <p className="text-sm text-muted-foreground">Manage existing keys</p>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
        ) : apiKeys.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-secondary rounded-full flex items-center justify-center mx-auto mb-4">
              <Key className="w-8 h-8 text-muted-foreground" />
            </div>
            <h4 className="font-medium mb-1">No API keys yet</h4>
            <p className="text-sm text-muted-foreground mb-4">Create your first API key above</p>
          </div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence>
              {apiKeys.map((key, index) => (
                <motion.div
                  key={key.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ delay: index * 0.05 }}
                  className="group flex items-center justify-between p-4 bg-secondary/50 hover:bg-secondary rounded-xl transition-colors"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Key className="w-6 h-6 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium truncate">{key.name}</p>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                        <code className="font-mono bg-background px-2 py-0.5 rounded">
                          {key.prefix}...
                        </code>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDate(key.createdAt)}
                        </span>
                        {key.lastUsed && (
                          <span className="flex items-center gap-1 text-green-500">
                            <Activity className="w-3 h-3" />
                            {formatRelativeTime(key.lastUsed)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => copyToClipboard(key.prefix, key.id)}
                      className="btn-ghost p-2"
                      title="Copy prefix"
                    >
                      {copiedId === key.id ? (
                        <Check className="w-4 h-4 text-green-500" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                    <button
                      onClick={() => setDeleteModalKey(key)}
                      className="btn-ghost p-2 text-destructive hover:bg-destructive/10"
                      title="Delete key"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </motion.div>

      {/* Documentation Link */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="mt-6"
      >
        <a
          href="/docs"
          className="card p-4 flex items-center justify-between hover:bg-secondary/50 transition-colors group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center">
              <ExternalLink className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <p className="font-medium group-hover:text-primary transition-colors">
                API Documentation
              </p>
              <p className="text-sm text-muted-foreground">
                Learn how to integrate Verbatim into your applications
              </p>
            </div>
          </div>
          <ExternalLink className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
        </a>
      </motion.div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteModalKey && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={() => !isDeleting && setDeleteModalKey(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="card p-6 max-w-md w-full"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-destructive/10 rounded-full flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-destructive" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Delete API Key?</h3>
                  <p className="text-sm text-muted-foreground">This action cannot be undone</p>
                </div>
              </div>

              <div className="p-3 bg-secondary rounded-lg mb-4">
                <p className="text-sm">
                  <span className="text-muted-foreground">Key name:</span>{' '}
                  <span className="font-medium">{deleteModalKey.name}</span>
                </p>
                <p className="text-sm">
                  <span className="text-muted-foreground">Prefix:</span>{' '}
                  <code className="font-mono">{deleteModalKey.prefix}...</code>
                </p>
              </div>

              <p className="text-sm text-muted-foreground mb-6">
                Any applications using this API key will immediately lose access to the Verbatim API.
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteModalKey(null)}
                  disabled={isDeleting}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button
                  onClick={deleteApiKey}
                  disabled={isDeleting}
                  className="btn-primary bg-destructive hover:bg-destructive/90 flex-1 flex items-center justify-center gap-2"
                >
                  {isDeleting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                  Delete Key
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
