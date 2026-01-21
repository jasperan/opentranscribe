import React from 'react';
import { Circle, Loader2, Sun, Moon, Monitor, Keyboard } from 'lucide-react';
import { useTheme } from '../../hooks/useTheme';
import { useBackendStatus } from '../../hooks/useBackendStatus';
import { motion, AnimatePresence } from 'framer-motion';

export const StatusBar: React.FC = () => {
  const { theme, setTheme } = useTheme();
  const { status } = useBackendStatus();

  const getStatusColor = () => {
    switch (status) {
      case 'running':
        return 'text-green-500';
      case 'starting':
      case 'checking':
        return 'text-yellow-500';
      case 'stopped':
      case 'error':
        return 'text-red-500';
      default:
        return 'text-[var(--text-muted)]';
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'running':
        return 'Backend: Running';
      case 'starting':
        return 'Backend: Starting...';
      case 'checking':
        return 'Backend: Checking...';
      case 'stopped':
        return 'Backend: Stopped';
      case 'error':
        return 'Backend: Error';
      default:
        return 'Backend: Unknown';
    }
  };

  const isElectron = !!window.electronAPI;

  return (
    <div className="h-7 flex items-center justify-between px-3 bg-[var(--bg-secondary)] border-t border-[var(--border)] text-xs">
      {/* Left side - Backend status */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5">
          <AnimatePresence mode="wait">
            {status === 'starting' || status === 'checking' ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
              >
                <Loader2 size={10} className={`${getStatusColor()} animate-spin`} />
              </motion.div>
            ) : (
              <motion.div
                key="circle"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
              >
                <Circle size={8} className={`${getStatusColor()} fill-current`} />
              </motion.div>
            )}
          </AnimatePresence>
          <span className="text-[var(--text-secondary)]">{getStatusText()}</span>
        </div>
      </div>

      {/* Right side - Theme toggle & shortcuts hint */}
      <div className="flex items-center gap-3">
        {/* Shortcut hint */}
        {isElectron && (
          <div className="flex items-center gap-1 text-[var(--text-muted)]">
            <Keyboard size={10} />
            <span>Ctrl+Shift+T: Quick Transcribe</span>
          </div>
        )}

        {/* Theme toggle */}
        <div className="flex items-center gap-0.5 bg-[var(--bg-primary)] rounded-md p-0.5 border border-[var(--border)]">
          <button
            onClick={() => setTheme('light')}
            className={`p-1 rounded transition-colors ${
              theme === 'light'
                ? 'bg-[var(--accent)] text-white'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
            title="Light theme"
          >
            <Sun size={12} />
          </button>
          <button
            onClick={() => setTheme('dark')}
            className={`p-1 rounded transition-colors ${
              theme === 'dark'
                ? 'bg-[var(--accent)] text-white'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
            title="Dark theme"
          >
            <Moon size={12} />
          </button>
          <button
            onClick={() => setTheme('system')}
            className={`p-1 rounded transition-colors ${
              theme === 'system'
                ? 'bg-[var(--accent)] text-white'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
            title="System theme"
          >
            <Monitor size={12} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default StatusBar;
