import React, { useState, useEffect, useRef } from 'react';
import { Mic, Headphones, History as HistoryIcon, Loader2, AlertCircle, Globe } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { AppStatus, TranscriptionHistoryItem } from './types';
import { whisperService } from './services/whisperService';
import { TitleBar } from './components/TitleBar';
import { StatusBar } from './components/StatusBar';
import { AudioUploader } from './components/AudioUploader';
import { TranscriptionResult } from './components/TranscriptionResult';
import { HistorySidebar } from './components/HistorySidebar';
import { useGlobalShortcuts } from './hooks/useGlobalShortcuts';
import { useBackendStatus } from './hooks/useBackendStatus';

const App: React.FC = () => {
  const [status, setStatus] = useState<AppStatus>(AppStatus.IDLE);
  const [progressLabel, setProgressLabel] = useState<string>('Uploading...');
  const [error, setError] = useState<string | null>(null);
  const [currentTranscription, setCurrentTranscription] = useState<string>('');
  const [currentFile, setCurrentFile] = useState<File | null>(null);
  const [history, setHistory] = useState<TranscriptionHistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState<string>('auto');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const { status: backendStatus, ensureRunning } = useBackendStatus();

  // Load history from local storage on mount
  useEffect(() => {
    const savedHistory = localStorage.getItem('opentranscribe_history');
    if (savedHistory) {
      try {
        setHistory(JSON.parse(savedHistory));
      } catch (e) {
        console.error("Failed to parse history", e);
      }
    }
  }, []);

  // Save history to local storage when it changes
  useEffect(() => {
    localStorage.setItem('opentranscribe_history', JSON.stringify(history));
  }, [history]);

  // Handle global shortcuts
  const handleTriggerTranscription = () => {
    if (status === AppStatus.IDLE) {
      // Trigger file selection
      if (window.electronAPI) {
        window.electronAPI.showOpenDialog().then((filePath) => {
          if (filePath) {
            window.electronAPI.readFile(filePath).then((fileData) => {
              const byteCharacters = atob(fileData.base64);
              const byteNumbers = new Array(byteCharacters.length);
              for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
              }
              const byteArray = new Uint8Array(byteNumbers);
              const file = new File([byteArray], fileData.fileName, { type: fileData.mimeType });
              handleFileSelect(file);
            });
          }
        });
      } else {
        fileInputRef.current?.click();
      }
    }
  };

  useGlobalShortcuts({ onTriggerTranscription: handleTriggerTranscription });

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64String = (reader.result as string).split(',')[1];
        resolve(base64String);
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const handleFileSelect = async (file: File) => {
    setCurrentFile(file);
    setError(null);
    setStatus(AppStatus.TRANSCRIBING);
    setProgressLabel('Uploading...');

    try {
      // Ensure backend is running
      if (backendStatus !== 'running') {
        setProgressLabel('Starting backend...');
        await ensureRunning();
      }

      // Small artificial delay to show 'Uploading' state for UX
      await new Promise(resolve => setTimeout(resolve, 300));

      setProgressLabel('Transcribing...');

      const base64Data = await fileToBase64(file);
      const text = await whisperService.transcribeAudio(base64Data, file.type, selectedLanguage);

      setCurrentTranscription(text);
      setStatus(AppStatus.SUCCESS);

      // Show notification
      if (window.electronAPI) {
        window.electronAPI.showNotification(
          'Transcription Complete',
          `Successfully transcribed ${file.name}`
        );
      }

      // Add to history
      const newItem: TranscriptionHistoryItem = {
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        fileName: file.name,
        text: text,
      };
      setHistory(prev => [newItem, ...prev].slice(0, 50));
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "An unexpected error occurred.");
      setStatus(AppStatus.ERROR);
    }
  };

  const resetTranscription = () => {
    setStatus(AppStatus.IDLE);
    setCurrentTranscription('');
    setCurrentFile(null);
    setError(null);
  };

  const deleteHistoryItem = (id: string) => {
    setHistory(prev => prev.filter(item => item.id !== id));
  };

  const loadFromHistory = (item: TranscriptionHistoryItem) => {
    setCurrentTranscription(item.text);
    setCurrentFile({ name: item.fileName } as File);
    setStatus(AppStatus.SUCCESS);
    setShowHistory(false);
  };

  const handleManualError = (msg: string) => {
    setError(msg);
    setStatus(AppStatus.ERROR);
  };

  return (
    <div className="h-full flex flex-col bg-[var(--bg-primary)]">
      {/* Custom Title Bar */}
      <TitleBar />

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center overflow-auto p-4 md:p-8">
        {/* Header */}
        <header className="w-full max-w-4xl flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <motion.div
              className="w-10 h-10 bg-[var(--accent)] rounded-xl flex items-center justify-center shadow-lg"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Mic className="text-white" size={24} />
            </motion.div>
            <h1 className="text-2xl font-bold tracking-tight gradient-text">OpenTranscribe</h1>
          </div>

          <motion.button
            onClick={() => setShowHistory(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--bg-secondary)] hover:bg-[var(--bg-elevated)] rounded-lg transition-colors border border-[var(--border)]"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <HistoryIcon size={18} />
            <span className="hidden sm:inline font-medium">History</span>
            {history.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 text-xs bg-[var(--accent)] text-white rounded-full">
                {history.length}
              </span>
            )}
          </motion.button>
        </header>

        {/* Main Content Area */}
        <main className="w-full max-w-2xl glass-panel rounded-2xl p-6 md:p-8 shadow-[var(--shadow-lg)] relative overflow-hidden">
          {/* Decorative elements */}
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-[var(--accent)]/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

          <AnimatePresence mode="wait">
            {status === AppStatus.IDLE && (
              <motion.div
                key="idle"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                <div className="text-center mb-6">
                  <h2 className="text-2xl font-bold mb-2 text-[var(--text-primary)]">Convert Audio to Text</h2>
                  <p className="text-[var(--text-secondary)]">High-accuracy transcription powered by AI</p>
                </div>

                {/* Language Selector */}
                <div className="mb-4">
                  <label className="flex items-center gap-2 text-sm font-medium text-[var(--text-secondary)] mb-2">
                    <Globe size={16} />
                    Language
                  </label>
                  <select
                    value={selectedLanguage}
                    onChange={(e) => setSelectedLanguage(e.target.value)}
                    className="w-full px-4 py-2.5 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent transition-all"
                  >
                    <option value="auto">Auto-detect</option>
                    <option value="en">English</option>
                    <option value="es">Spanish (Español)</option>
                    <option value="fr">French (Français)</option>
                    <option value="de">German (Deutsch)</option>
                    <option value="it">Italian (Italiano)</option>
                    <option value="pt">Portuguese (Português)</option>
                    <option value="zh">Chinese (中文)</option>
                    <option value="ja">Japanese (日本語)</option>
                    <option value="ko">Korean (한국어)</option>
                  </select>
                </div>

                <AudioUploader
                  onFileSelect={handleFileSelect}
                  disabled={false}
                  onError={handleManualError}
                />

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-6 border-t border-[var(--border)]">
                  {[
                    { icon: Headphones, color: 'blue', title: 'Fast Upload', desc: 'Optimized processing' },
                    { icon: Mic, color: 'purple', title: 'Clean Output', desc: 'Professional transcription' },
                    { icon: HistoryIcon, color: 'emerald', title: 'History', desc: 'Access past work' },
                  ].map(({ icon: Icon, color, title, desc }) => (
                    <motion.div
                      key={title}
                      className="flex flex-col items-center text-center p-3"
                      whileHover={{ scale: 1.02 }}
                    >
                      <div className={`p-2 bg-${color}-500/10 rounded-lg text-${color}-500 mb-2`}>
                        <Icon size={20} />
                      </div>
                      <span className="text-xs font-semibold text-[var(--text-primary)]">{title}</span>
                      <p className="text-[10px] text-[var(--text-muted)]">{desc}</p>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}

            {status === AppStatus.TRANSCRIBING && (
              <motion.div
                key="transcribing"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="flex flex-col items-center justify-center py-16 space-y-6"
              >
                <div className="relative">
                  <Loader2 className="w-16 h-16 text-[var(--accent)] animate-spin" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Mic size={24} className="text-[var(--accent)]/50" />
                  </div>
                </div>
                <div className="text-center">
                  <h3 className="text-xl font-bold mb-2 text-[var(--text-primary)]">{progressLabel}</h3>
                  <p className="text-[var(--text-secondary)] animate-pulse">
                    {currentFile?.name || 'Processing...'}
                  </p>
                </div>
                {/* Progress bar */}
                <div className="w-full max-w-sm bg-[var(--bg-secondary)] h-1.5 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-[var(--accent)]"
                    initial={{ width: '0%' }}
                    animate={{ width: '100%' }}
                    transition={{ duration: 10, ease: 'linear' }}
                  />
                </div>
              </motion.div>
            )}

            {status === AppStatus.SUCCESS && (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
              >
                <TranscriptionResult
                  text={currentTranscription}
                  fileName={currentFile?.name || 'unknown'}
                  onReset={resetTranscription}
                />
              </motion.div>
            )}

            {status === AppStatus.ERROR && (
              <motion.div
                key="error"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="flex flex-col items-center justify-center py-10 space-y-4 text-center"
              >
                <div className="p-4 bg-[var(--error-muted)] rounded-full text-[var(--error)]">
                  <AlertCircle size={48} />
                </div>
                <h3 className="text-xl font-bold text-[var(--text-primary)]">Error</h3>
                <div className="bg-[var(--error-muted)] border border-[var(--error)]/20 rounded-xl p-4 w-full">
                  <p className="text-[var(--error)] font-medium">{error || "Something went wrong."}</p>
                </div>
                <motion.button
                  onClick={resetTranscription}
                  className="mt-4 px-6 py-2 bg-[var(--bg-secondary)] hover:bg-[var(--bg-elevated)] rounded-lg transition-colors font-medium text-[var(--text-primary)] border border-[var(--border)]"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Try Again
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>
        </main>

        {/* Footer */}
        <footer className="mt-auto pt-8 text-[var(--text-muted)] text-sm flex flex-col items-center gap-2">
          <p className="font-medium">Created by <span className="text-[var(--accent)]">jasperan</span></p>
          <p>© 2024 OpenTranscribe</p>
        </footer>
      </div>

      {/* Status Bar */}
      <StatusBar />

      {/* History Sidebar */}
      <HistorySidebar
        isOpen={showHistory}
        onClose={() => setShowHistory(false)}
        history={history}
        onSelect={loadFromHistory}
        onDelete={deleteHistoryItem}
        onClearAll={() => setHistory([])}
      />

      {/* Hidden file input for web mode */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFileSelect(file);
        }}
        accept="audio/*"
        className="hidden"
      />
    </div>
  );
};

export default App;
