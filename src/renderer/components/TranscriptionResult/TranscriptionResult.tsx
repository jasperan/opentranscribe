import React, { useState } from 'react';
import { Copy, Download, Check, RefreshCw, Folder } from 'lucide-react';
import { motion } from 'framer-motion';

interface TranscriptionResultProps {
  text: string;
  fileName: string;
  onReset: () => void;
}

export const TranscriptionResult: React.FC<TranscriptionResultProps> = ({ text, fileName, onReset }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);

    // Show notification in Electron
    if (window.electronAPI) {
      window.electronAPI.showNotification('Copied!', 'Transcription copied to clipboard');
    }

    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${fileName.split('.')[0]}_transcript.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <motion.div
      className="w-full space-y-4"
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      data-testid="transcription-result"
    >
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-lg font-semibold text-[var(--text-primary)]">Transcription Result</h2>
        <div className="flex gap-1.5">
          <motion.button
            onClick={handleCopy}
            className="p-2 rounded-lg bg-[var(--bg-secondary)] hover:bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors border border-[var(--border)]"
            title="Copy to clipboard"
            whileTap={{ scale: 0.95 }}
          >
            {copied ? <Check size={18} className="text-green-500" /> : <Copy size={18} />}
          </motion.button>
          <motion.button
            onClick={handleDownload}
            className="p-2 rounded-lg bg-[var(--bg-secondary)] hover:bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors border border-[var(--border)]"
            title="Download as .txt"
            whileTap={{ scale: 0.95 }}
          >
            <Download size={18} />
          </motion.button>
          <motion.button
            onClick={onReset}
            className="p-2 rounded-lg bg-[var(--bg-secondary)] hover:bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors border border-[var(--border)]"
            title="New transcription"
            whileTap={{ scale: 0.95 }}
          >
            <RefreshCw size={18} />
          </motion.button>
        </div>
      </div>

      <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl p-6 min-h-[200px] max-h-[400px] overflow-y-auto shadow-[var(--shadow-sm)]">
        <p className="text-[var(--text-primary)] leading-relaxed whitespace-pre-wrap font-normal" data-testid="transcription-text">
          {text || "No text could be extracted."}
        </p>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-xs text-[var(--text-muted)] italic">
          File: {fileName}
        </p>
        <p className="text-xs text-[var(--text-muted)]">
          {text.split(/\s+/).filter(Boolean).length} words
        </p>
      </div>
    </motion.div>
  );
};

export default TranscriptionResult;
