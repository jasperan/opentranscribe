import React, { useState, useEffect } from 'react';
import { Minus, Square, X, Maximize2, Mic } from 'lucide-react';

interface TitleBarProps {
  title?: string;
}

export const TitleBar: React.FC<TitleBarProps> = ({ title = 'OpenTranscribe' }) => {
  const [isMaximized, setIsMaximized] = useState(false);
  const isElectron = !!window.electronAPI;

  useEffect(() => {
    if (!isElectron) return;

    // Get initial maximized state
    window.electronAPI.isMaximized().then(setIsMaximized);

    // Listen for changes
    const unsubscribe = window.electronAPI.onMaximizeChange(setIsMaximized);

    return () => {
      unsubscribe();
    };
  }, [isElectron]);

  const handleMinimize = () => {
    window.electronAPI?.minimize();
  };

  const handleMaximize = () => {
    window.electronAPI?.maximize();
  };

  const handleClose = () => {
    window.electronAPI?.close();
  };

  // Don't render custom title bar in web mode
  if (!isElectron) {
    return null;
  }

  return (
    <div className="h-9 flex items-center justify-between bg-[var(--bg-secondary)] border-b border-[var(--border)] select-none">
      {/* App icon and title - draggable */}
      <div className="flex items-center gap-2 px-3 titlebar-drag flex-1 h-full">
        <div className="w-5 h-5 bg-[var(--accent)] rounded-md flex items-center justify-center titlebar-no-drag">
          <Mic className="text-white" size={12} />
        </div>
        <span className="text-sm font-medium text-[var(--text-secondary)]">{title}</span>
      </div>

      {/* Window controls - not draggable */}
      <div className="flex items-center h-full titlebar-no-drag">
        <button
          onClick={handleMinimize}
          className="h-full px-4 hover:bg-[var(--bg-elevated)] transition-colors flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          aria-label="Minimize"
        >
          <Minus size={14} />
        </button>
        <button
          onClick={handleMaximize}
          className="h-full px-4 hover:bg-[var(--bg-elevated)] transition-colors flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          aria-label={isMaximized ? 'Restore' : 'Maximize'}
        >
          {isMaximized ? <Square size={12} /> : <Maximize2 size={14} />}
        </button>
        <button
          onClick={handleClose}
          className="h-full px-4 hover:bg-red-500 hover:text-white transition-colors flex items-center justify-center text-[var(--text-secondary)]"
          aria-label="Close"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
};

export default TitleBar;
