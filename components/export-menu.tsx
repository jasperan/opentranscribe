'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Download,
  ChevronDown,
  FileText,
  FileJson,
  FileType,
  Check,
  Loader2,
} from 'lucide-react';

interface ExportMenuProps {
  transcriptionId: string;
  filename?: string;
}

const exportFormats = [
  { id: 'txt', name: 'Plain Text', ext: '.txt', icon: FileText, description: 'Simple text file' },
  { id: 'srt', name: 'Subtitles (SRT)', ext: '.srt', icon: FileType, description: 'For video players' },
  { id: 'vtt', name: 'Subtitles (VTT)', ext: '.vtt', icon: FileType, description: 'Web subtitles' },
  { id: 'docx', name: 'Word Document', ext: '.docx', icon: FileText, description: 'Microsoft Word' },
  { id: 'json', name: 'JSON', ext: '.json', icon: FileJson, description: 'Structured data' },
  { id: 'md', name: 'Markdown', ext: '.md', icon: FileText, description: 'For documentation' },
];

export default function ExportMenu({ transcriptionId, filename }: ExportMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState<string | null>(null);
  const [exportSuccess, setExportSuccess] = useState<string | null>(null);

  const handleExport = async (format: string) => {
    setIsExporting(format);

    try {
      const response = await fetch('/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcriptionId,
          format,
        }),
      });

      if (!response.ok) {
        throw new Error('Export failed');
      }

      // Get the blob and download
      const blob = await response.blob();
      const formatInfo = exportFormats.find((f) => f.id === format);
      const baseName = filename?.replace(/\.[^/.]+$/, '') || 'transcription';
      const downloadName = `${baseName}${formatInfo?.ext || '.txt'}`;

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = downloadName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      // Show success feedback
      setExportSuccess(format);
      setTimeout(() => setExportSuccess(null), 1500);
    } catch (err) {
      console.error('Export failed:', err);
    } finally {
      setIsExporting(null);
    }
  };

  return (
    <div className="relative">
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className="btn-primary flex items-center gap-2"
        whileTap={{ scale: 0.98 }}
      >
        <Download className="w-4 h-4" />
        Export
        <motion.span
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown className="w-4 h-4" />
        </motion.span>
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-10"
              onClick={() => setIsOpen(false)}
            />

            {/* Dropdown menu */}
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
              className="absolute bottom-full left-0 mb-2 w-64 bg-card border border-border rounded-xl shadow-xl z-20 overflow-hidden"
            >
              {/* Header */}
              <div className="px-4 py-3 border-b border-border bg-secondary/30">
                <p className="text-sm font-medium">Export Transcript</p>
                <p className="text-xs text-muted-foreground">Choose a format</p>
              </div>

              {/* Format options */}
              <div className="p-1.5">
                {exportFormats.map((format, index) => (
                  <motion.button
                    key={format.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.03 }}
                    onClick={() => handleExport(format.id)}
                    disabled={isExporting !== null}
                    className="flex items-center gap-3 w-full px-3 py-2.5 text-left hover:bg-accent rounded-lg transition-colors disabled:opacity-50 group"
                  >
                    <div className="w-9 h-9 bg-secondary rounded-lg flex items-center justify-center flex-shrink-0 group-hover:bg-primary/10 transition-colors">
                      <format.icon className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{format.name}</span>
                        <span className="text-muted-foreground text-xs bg-secondary px-1.5 py-0.5 rounded">
                          {format.ext}
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {format.description}
                      </span>
                    </div>
                    <div className="w-5 h-5 flex items-center justify-center">
                      {isExporting === format.id ? (
                        <Loader2 className="w-4 h-4 text-primary animate-spin" />
                      ) : exportSuccess === format.id ? (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: 'spring', stiffness: 500 }}
                        >
                          <Check className="w-4 h-4 text-green-500" />
                        </motion.div>
                      ) : null}
                    </div>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
