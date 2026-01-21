import { useEffect, useCallback } from 'react';

interface UseGlobalShortcutsOptions {
  onTriggerTranscription?: () => void;
}

export function useGlobalShortcuts({ onTriggerTranscription }: UseGlobalShortcutsOptions) {
  const handleTriggerTranscription = useCallback(() => {
    onTriggerTranscription?.();
  }, [onTriggerTranscription]);

  useEffect(() => {
    if (!window.electronAPI) return;

    const unsubscribe = window.electronAPI.onTriggerTranscription(handleTriggerTranscription);

    return () => {
      unsubscribe();
    };
  }, [handleTriggerTranscription]);

  // Also handle keyboard shortcuts in renderer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + O to open file
      if ((e.ctrlKey || e.metaKey) && e.key === 'o') {
        e.preventDefault();
        onTriggerTranscription?.();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onTriggerTranscription]);
}
