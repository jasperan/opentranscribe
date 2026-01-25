'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User,
  Bell,
  Palette,
  Globe,
  Loader2,
  Check,
  LogOut,
  Download,
  Trash2,
  AlertTriangle,
  ChevronDown,
  HardDrive,
  Shield,
  Moon,
  Sun,
  Monitor,
} from 'lucide-react';

interface UserSettings {
  email: string;
  defaultModel: string;
  defaultLanguage: string;
  emailNotifications: boolean;
  theme: 'light' | 'dark' | 'system';
  createdAt: string;
}

// Toggle Switch component
function Toggle({
  enabled,
  onChange,
}: {
  enabled: boolean;
  onChange: () => void;
}) {
  return (
    <button
      onClick={onChange}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50 ${
        enabled ? 'bg-primary' : 'bg-muted'
      }`}
    >
      <motion.span
        animate={{ x: enabled ? 24 : 4 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        className="inline-block h-4 w-4 rounded-full bg-white shadow-sm"
      />
    </button>
  );
}

// Select dropdown component
function Select({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const selected = options.find((o) => o.value === value);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="input flex items-center justify-between gap-2 cursor-pointer"
      >
        <span>{selected?.label || value}</span>
        <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setIsOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-lg z-20 py-1 max-h-60 overflow-auto"
            >
              {options.map((option) => (
                <button
                  key={option.value}
                  onClick={() => {
                    onChange(option.value);
                    setIsOpen(false);
                  }}
                  className={`w-full px-3 py-2 text-left text-sm hover:bg-accent transition-colors ${
                    value === option.value
                      ? 'text-primary font-medium bg-primary/5'
                      : 'text-foreground'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await fetch('/api/user/settings');
        if (response.ok) {
          const data = await response.json();
          setSettings(data);
        }
      } catch (error) {
        console.error('Failed to fetch settings:', error);
        // Default settings
        setSettings({
          email: '',
          defaultModel: 'faster-whisper',
          defaultLanguage: 'auto',
          emailNotifications: true,
          theme: 'system',
          createdAt: new Date().toISOString(),
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchSettings();
  }, []);

  const saveSettings = async () => {
    setIsSaving(true);
    try {
      const response = await fetch('/api/user/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });

      if (response.ok) {
        setSavedMessage(true);
        setTimeout(() => setSavedMessage(false), 2000);
      }
    } catch (error) {
      console.error('Failed to save settings:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleExportData = async () => {
    setIsExporting(true);
    try {
      const response = await fetch('/api/user/export');
      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'verbatim-data-export.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Failed to export data:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const handleDeleteAccount = async () => {
    try {
      await fetch('/api/user', { method: 'DELETE' });
      window.location.href = '/';
    } catch (error) {
      console.error('Failed to delete account:', error);
    }
  };

  const handleSignOut = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      window.location.href = '/';
    } catch (error) {
      console.error('Failed to sign out:', error);
    }
  };

  const modelOptions = [
    { value: 'faster-whisper', label: 'Faster Whisper (Recommended)' },
    { value: 'openai-whisper', label: 'OpenAI Whisper' },
    { value: 'vosk', label: 'Vosk' },
    { value: 'whisper-cpp', label: 'whisper.cpp' },
    { value: 'wav2vec2', label: 'Wav2Vec2' },
  ];

  const languageOptions = [
    { value: 'auto', label: 'Auto-detect' },
    { value: 'en', label: 'English' },
    { value: 'es', label: 'Spanish' },
    { value: 'fr', label: 'French' },
    { value: 'de', label: 'German' },
    { value: 'it', label: 'Italian' },
    { value: 'pt', label: 'Portuguese' },
    { value: 'ja', label: 'Japanese' },
    { value: 'ko', label: 'Korean' },
    { value: 'zh', label: 'Chinese' },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Settings</h1>
        <p className="text-muted-foreground">
          Manage your account and preferences.
        </p>
      </div>

      {/* Account Section */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="card p-6 mb-6"
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
            <User className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Account</h2>
            <p className="text-sm text-muted-foreground">
              Your account information
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Email</label>
            <input
              type="email"
              value={settings?.email || ''}
              disabled
              className="input bg-secondary/50 cursor-not-allowed opacity-70"
            />
            <p className="text-xs text-muted-foreground mt-1.5">
              Email cannot be changed
            </p>
          </div>

          <div className="pt-2">
            <label className="block text-sm font-medium mb-1">
              Member since
            </label>
            <p className="text-muted-foreground">
              {settings?.createdAt
                ? new Date(settings.createdAt).toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  })
                : 'Unknown'}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Preferences Section */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="card p-6 mb-6"
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-purple-500/10 rounded-xl flex items-center justify-center">
            <Palette className="w-6 h-6 text-purple-500" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Preferences</h2>
            <p className="text-sm text-muted-foreground">
              Customize your experience
            </p>
          </div>
        </div>

        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium mb-2">
              Default STT Model
            </label>
            <Select
              value={settings?.defaultModel || 'faster-whisper'}
              onChange={(value) =>
                setSettings({ ...settings!, defaultModel: value })
              }
              options={modelOptions}
            />
            <p className="text-xs text-muted-foreground mt-1.5">
              Used when transcribing new audio files
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Default Language
            </label>
            <Select
              value={settings?.defaultLanguage || 'auto'}
              onChange={(value) =>
                setSettings({ ...settings!, defaultLanguage: value })
              }
              options={languageOptions}
            />
          </div>

          <div className="pt-2">
            <label className="block text-sm font-medium mb-3">Theme</label>
            <div className="flex gap-2">
              {[
                { value: 'light', icon: Sun, label: 'Light' },
                { value: 'dark', icon: Moon, label: 'Dark' },
                { value: 'system', icon: Monitor, label: 'System' },
              ].map(({ value, icon: Icon, label }) => (
                <button
                  key={value}
                  onClick={() =>
                    setSettings({ ...settings!, theme: value as 'light' | 'dark' | 'system' })
                  }
                  className={`flex-1 flex flex-col items-center gap-2 p-3 rounded-lg border transition-all ${
                    settings?.theme === value
                      ? 'border-primary bg-primary/5 text-primary'
                      : 'border-border hover:border-primary/50 text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-xs font-medium">{label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Notifications Section */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="card p-6 mb-6"
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-amber-500/10 rounded-xl flex items-center justify-center">
            <Bell className="w-6 h-6 text-amber-500" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Notifications</h2>
            <p className="text-sm text-muted-foreground">
              Manage email notifications
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between py-2">
          <div>
            <p className="font-medium">Email Notifications</p>
            <p className="text-sm text-muted-foreground">
              Receive emails about usage limits and updates
            </p>
          </div>
          <Toggle
            enabled={settings?.emailNotifications || false}
            onChange={() =>
              setSettings({
                ...settings!,
                emailNotifications: !settings?.emailNotifications,
              })
            }
          />
        </div>
      </motion.div>

      {/* Data & Privacy Section */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="card p-6 mb-6"
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-green-500/10 rounded-xl flex items-center justify-center">
            <Shield className="w-6 h-6 text-green-500" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Data & Privacy</h2>
            <p className="text-sm text-muted-foreground">
              Manage your data and privacy settings
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="font-medium">Export Data</p>
              <p className="text-sm text-muted-foreground">
                Download all your transcriptions and settings
              </p>
            </div>
            <button
              onClick={handleExportData}
              disabled={isExporting}
              className="btn-secondary flex items-center gap-2"
            >
              {isExporting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              Export
            </button>
          </div>

          <div className="flex items-center justify-between py-2 border-t border-border pt-4">
            <div className="flex items-center gap-3">
              <HardDrive className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="font-medium">Storage Used</p>
                <p className="text-sm text-muted-foreground">
                  Audio files and transcriptions
                </p>
              </div>
            </div>
            <span className="text-sm font-medium text-muted-foreground">
              --
            </span>
          </div>
        </div>
      </motion.div>

      {/* Save Button */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="flex items-center justify-between mb-8"
      >
        <button
          onClick={saveSettings}
          disabled={isSaving}
          className="btn-primary flex items-center gap-2"
        >
          {isSaving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : savedMessage ? (
            <Check className="w-4 h-4" />
          ) : null}
          {savedMessage ? 'Saved!' : 'Save Changes'}
        </button>

        <button
          onClick={handleSignOut}
          className="btn-ghost text-muted-foreground hover:text-foreground flex items-center gap-2"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </motion.div>

      {/* Danger Zone */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="card p-6 border-destructive/20"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-destructive/10 rounded-xl flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-destructive" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-destructive">Danger Zone</h2>
            <p className="text-sm text-muted-foreground">
              Irreversible actions
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between py-2">
          <div>
            <p className="font-medium">Delete Account</p>
            <p className="text-sm text-muted-foreground">
              Permanently delete your account and all data
            </p>
          </div>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="btn-ghost text-destructive hover:bg-destructive/10 flex items-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </button>
        </div>

        {/* Delete Confirmation Modal */}
        <AnimatePresence>
          {showDeleteConfirm && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
              onClick={() => setShowDeleteConfirm(false)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-card rounded-xl p-6 max-w-md w-full shadow-xl"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-destructive/10 rounded-xl flex items-center justify-center">
                    <AlertTriangle className="w-6 h-6 text-destructive" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">Delete Account?</h3>
                    <p className="text-sm text-muted-foreground">
                      This action cannot be undone
                    </p>
                  </div>
                </div>

                <p className="text-muted-foreground mb-6">
                  All your transcriptions, settings, and data will be permanently deleted.
                  This action is irreversible.
                </p>

                <div className="flex gap-3">
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="btn-secondary flex-1"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeleteAccount}
                    className="btn-primary bg-destructive hover:bg-destructive/90 flex-1 flex items-center justify-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete Account
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
