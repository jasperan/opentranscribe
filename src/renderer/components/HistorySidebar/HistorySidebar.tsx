import React from 'react';
import { History as HistoryIcon, X, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { TranscriptionHistoryItem } from '../../types';

interface HistorySidebarProps {
  isOpen: boolean;
  onClose: () => void;
  history: TranscriptionHistoryItem[];
  onSelect: (item: TranscriptionHistoryItem) => void;
  onDelete: (id: string) => void;
  onClearAll: () => void;
}

export const HistorySidebar: React.FC<HistorySidebarProps> = ({
  isOpen,
  onClose,
  history,
  onSelect,
  onDelete,
  onClearAll,
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-40 bg-[var(--bg-overlay)]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Sidebar */}
          <motion.div
            className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-md bg-[var(--bg-primary)] shadow-[var(--shadow-lg)] flex flex-col border-l border-[var(--border)]"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          >
            {/* Header */}
            <div className="p-4 border-b border-[var(--border)] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <HistoryIcon size={20} className="text-[var(--accent)]" />
                <h2 className="text-lg font-semibold text-[var(--text-primary)]">History</h2>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-[var(--bg-secondary)] rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* History list */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {history.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-[var(--text-muted)] text-center px-6">
                  <div className="p-4 bg-[var(--bg-secondary)] rounded-full mb-4">
                    <HistoryIcon size={32} />
                  </div>
                  <p className="font-medium">No history yet</p>
                  <p className="text-sm mt-1">Your transcriptions will appear here</p>
                </div>
              ) : (
                history.map((item, index) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={() => onSelect(item)}
                    className="group p-4 bg-[var(--bg-secondary)] hover:bg-[var(--bg-elevated)] border border-[var(--border)] rounded-xl cursor-pointer transition-all duration-200"
                  >
                    <div className="flex justify-between items-start mb-1">
                      <h4 className="font-medium text-[var(--text-primary)] truncate pr-4 flex-1">
                        {item.fileName}
                      </h4>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDelete(item.id);
                        }}
                        className="p-1 opacity-0 group-hover:opacity-100 text-[var(--text-muted)] hover:text-red-500 transition-all"
                      >
                        <X size={14} />
                      </button>
                    </div>
                    <p className="text-xs text-[var(--text-muted)] mb-2">
                      {new Date(item.timestamp).toLocaleString()}
                    </p>
                    <p className="text-sm text-[var(--text-secondary)] line-clamp-2">
                      {item.text}
                    </p>
                  </motion.div>
                ))
              )}
            </div>

            {/* Footer */}
            {history.length > 0 && (
              <div className="p-4 border-t border-[var(--border)]">
                <button
                  onClick={() => {
                    if (confirm('Clear all history?')) {
                      onClearAll();
                    }
                  }}
                  className="w-full py-2 flex items-center justify-center gap-2 text-sm text-[var(--text-muted)] hover:text-red-500 transition-colors"
                >
                  <Trash2 size={14} />
                  Clear All History
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default HistorySidebar;
