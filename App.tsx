
import React, { useState, useEffect } from 'react';
import { Mic, Headphones, History as HistoryIcon, X, Loader2, AlertCircle, Globe } from 'lucide-react';
import { AppStatus, TranscriptionHistoryItem } from './types';
import { whisperService } from './services/whisperService';
import AudioUploader from './components/AudioUploader';
import TranscriptionResult from './components/TranscriptionResult';

const App: React.FC = () => {
  const [status, setStatus] = useState<AppStatus>(AppStatus.IDLE);
  const [progressLabel, setProgressLabel] = useState<string>('Uploading...');
  const [error, setError] = useState<string | null>(null);
  const [currentTranscription, setCurrentTranscription] = useState<string>('');
  const [currentFile, setCurrentFile] = useState<File | null>(null);
  const [history, setHistory] = useState<TranscriptionHistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [isModelLoading, setIsModelLoading] = useState<boolean>(false);
  const [selectedLanguage, setSelectedLanguage] = useState<string>('auto');

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
    setIsModelLoading(false);

    try {
      // Small artificial delay to show 'Uploading' state for UX
      await new Promise(resolve => setTimeout(resolve, 300));

      setProgressLabel('Transcribing...');
      setIsModelLoading(false);

      const base64Data = await fileToBase64(file);
      const text = await whisperService.transcribeAudio(base64Data, file.type, selectedLanguage);

      setCurrentTranscription(text);
      setStatus(AppStatus.SUCCESS);

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
      setIsModelLoading(false);
    }
  };

  const resetTranscription = () => {
    setStatus(AppStatus.IDLE);
    setCurrentTranscription('');
    setCurrentFile(null);
    setError(null);
  };

  const deleteHistoryItem = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
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
    <div className="min-h-screen flex flex-col items-center p-4 md:p-8">
      {/* Header */}
      <header className="w-full max-w-4xl flex items-center justify-between mb-12">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Mic className="text-white" size={24} />
          </div>
          <h1 className="text-2xl font-bold tracking-tight gradient-text">OpenTranscribe</h1>
        </div>
        
        <button 
          onClick={() => setShowHistory(true)}
          className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors border border-slate-700"
        >
          <HistoryIcon size={18} />
          <span className="hidden sm:inline font-medium">History</span>
        </button>
      </header>

      {/* Main Content Area */}
      <main className="w-full max-w-2xl glass-panel rounded-3xl p-6 md:p-10 shadow-2xl relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

        {status === AppStatus.IDLE && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold mb-3 text-white">Convert MP3 to Text</h2>
              <p className="text-slate-400">High-accuracy transcription optimized for MP3 audio files.</p>
            </div>
            
            {/* Language Selector */}
            <div className="mb-6">
              <label className="flex items-center gap-2 text-sm font-medium text-slate-300 mb-2">
                <Globe size={16} />
                Language
              </label>
              <select
                value={selectedLanguage}
                onChange={(e) => setSelectedLanguage(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              >
                <option value="auto">Auto-detect</option>
                <option value="en">English</option>
                <option value="es">Spanish (Español)</option>
              </select>
            </div>
            
            <AudioUploader 
              onFileSelect={handleFileSelect} 
              disabled={false}
              onError={handleManualError}
            />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-6 border-t border-slate-800">
              <div className="flex flex-col items-center text-center p-2">
                <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400 mb-2">
                  <Headphones size={20} />
                </div>
                <span className="text-xs font-semibold text-slate-300">Fast Upload</span>
                <p className="text-[10px] text-slate-500">Optimized for lightweight MP3 formats.</p>
              </div>
              <div className="flex flex-col items-center text-center p-2">
                <div className="p-2 bg-purple-500/10 rounded-lg text-purple-400 mb-2">
                  <Mic size={20} />
                </div>
                <span className="text-xs font-semibold text-slate-300">Clean Output</span>
                <p className="text-[10px] text-slate-500">Professional verbatim transcription.</p>
              </div>
              <div className="flex flex-col items-center text-center p-2">
                <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400 mb-2">
                  <HistoryIcon size={20} />
                </div>
                <span className="text-xs font-semibold text-slate-300">History</span>
                <p className="text-[10px] text-slate-500">Access your past work anytime.</p>
              </div>
            </div>
          </div>
        )}

        {status === AppStatus.TRANSCRIBING && (
          <div className="flex flex-col items-center justify-center py-20 space-y-6">
            <div className="relative">
               <Loader2 className="w-16 h-16 text-blue-500 animate-spin" />
               <div className="absolute inset-0 flex items-center justify-center">
                 <Mic size={24} className="text-blue-500/50" />
               </div>
            </div>
            <div className="text-center">
              <h3 className="text-2xl font-bold mb-2 text-white">{progressLabel}</h3>
              <p className="text-slate-400 animate-pulse italic">
                {currentFile?.name || 'Processing...'}
              </p>
            </div>
            {/* Visual Progress Indicator */}
            <div className="w-full max-w-sm bg-slate-800 h-2 rounded-full overflow-hidden border border-slate-700">
              <div className="h-full bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.5)] animate-[loading_1.5s_infinite_ease-in-out]" style={{ width: '40%' }}></div>
            </div>
            <p className="text-sm text-slate-400">
              {isModelLoading
                ? "Processing audio file..."
                : "This usually takes a few seconds depending on file size."
              }
            </p>
          </div>
        )}

        {status === AppStatus.SUCCESS && (
          <div className="animate-in zoom-in-95 duration-300">
            <TranscriptionResult 
              text={currentTranscription} 
              fileName={currentFile?.name || 'unknown'} 
              onReset={resetTranscription}
            />
          </div>
        )}

        {status === AppStatus.ERROR && (
          <div className="flex flex-col items-center justify-center py-10 space-y-4 text-center">
            <div className="p-4 bg-red-500/10 rounded-full text-red-500">
              <AlertCircle size={48} />
            </div>
            <h3 className="text-xl font-bold">Error</h3>
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 w-full">
              <p className="text-red-400 font-medium">{error || "Something went wrong while processing your audio."}</p>
            </div>
            <button 
              onClick={resetTranscription}
              className="mt-4 px-6 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors font-medium text-white border border-slate-600"
            >
              Try Again
            </button>
          </div>
        )}
      </main>

      {/* History Sidebar */}
      {showHistory && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={() => setShowHistory(false)} />
          <div className="relative w-full max-w-md bg-slate-900 h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300 border-l border-slate-800">
            <div className="p-6 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <HistoryIcon size={20} className="text-blue-400" />
                <h2 className="text-xl font-bold">History</h2>
              </div>
              <button onClick={() => setShowHistory(false)} className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {history.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-500 text-center px-6">
                  <div className="p-4 bg-slate-800/50 rounded-full mb-4">
                    <HistoryIcon size={32} />
                  </div>
                  <p>No history found.</p>
                </div>
              ) : (
                history.map((item) => (
                  <div 
                    key={item.id}
                    onClick={() => loadFromHistory(item)}
                    className="group p-4 bg-slate-800/40 hover:bg-slate-800 border border-slate-700/50 rounded-xl cursor-pointer transition-all duration-200"
                  >
                    <div className="flex justify-between items-start mb-1">
                      <h4 className="font-semibold text-slate-200 truncate pr-4">{item.fileName}</h4>
                      <button 
                        onClick={(e) => deleteHistoryItem(item.id, e)}
                        className="p-1 opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400 transition-all"
                      >
                        <X size={14} />
                      </button>
                    </div>
                    <p className="text-xs text-slate-500 mb-2">
                      {new Date(item.timestamp).toLocaleString()}
                    </p>
                    <p className="text-sm text-slate-400 line-clamp-2">
                      {item.text}
                    </p>
                  </div>
                ))
              )}
            </div>
            
            {history.length > 0 && (
              <div className="p-4 border-t border-slate-800">
                <button 
                  onClick={() => {
                    if (confirm("Clear all history?")) setHistory([]);
                  }}
                  className="w-full py-2 text-sm text-slate-500 hover:text-red-400 transition-colors"
                >
                  Clear All History
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Footer Info */}
      <footer className="mt-auto py-8 text-slate-500 text-sm flex flex-col items-center gap-2">
        <p className="font-medium">Created by <span className="text-blue-400">jasperan</span></p>
        <p>© 2024 OpenTranscribe • Powered by AI</p>
        <div className="flex gap-4 mt-2">
          <a href="#" className="hover:text-blue-400 transition-colors">Terms</a>
          <a href="#" className="hover:text-blue-400 transition-colors">Privacy</a>
          <a href="#" className="hover:text-blue-400 transition-colors">GitHub</a>
        </div>
      </footer>

      <style>{`
        @keyframes loading {
          0% { transform: translateX(-100%); }
          50% { transform: translateX(50%); }
          100% { transform: translateX(300%); }
        }
      `}</style>
    </div>
  );
};

export default App;
