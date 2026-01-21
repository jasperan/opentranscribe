import { useState, useEffect, useCallback } from 'react';

type BackendStatus = 'unknown' | 'checking' | 'running' | 'starting' | 'stopped' | 'error';

interface UseBackendStatusResult {
  status: BackendStatus;
  checkHealth: () => Promise<boolean>;
  ensureRunning: () => Promise<void>;
  shutdown: () => Promise<void>;
}

export function useBackendStatus(): UseBackendStatusResult {
  const [status, setStatus] = useState<BackendStatus>('unknown');

  const checkHealth = useCallback(async (): Promise<boolean> => {
    setStatus('checking');
    try {
      // Use Electron API if available, otherwise direct fetch
      if (window.electronAPI) {
        const isHealthy = await window.electronAPI.checkBackendHealth();
        setStatus(isHealthy ? 'running' : 'stopped');
        return isHealthy;
      } else {
        // Web fallback
        const response = await fetch('http://localhost:8000/models', {
          signal: AbortSignal.timeout(2000),
        });
        const isHealthy = response.ok;
        setStatus(isHealthy ? 'running' : 'stopped');
        return isHealthy;
      }
    } catch {
      setStatus('stopped');
      return false;
    }
  }, []);

  const ensureRunning = useCallback(async (): Promise<void> => {
    if (!window.electronAPI) {
      // In web mode, just check health
      await checkHealth();
      return;
    }

    setStatus('starting');
    try {
      await window.electronAPI.ensureBackendRunning();
      setStatus('running');
    } catch (error) {
      console.error('Failed to start backend:', error);
      setStatus('error');
    }
  }, [checkHealth]);

  const shutdown = useCallback(async (): Promise<void> => {
    if (!window.electronAPI) return;

    try {
      await window.electronAPI.shutdownBackend();
      setStatus('stopped');
    } catch (error) {
      console.error('Failed to shutdown backend:', error);
    }
  }, []);

  // Listen for backend status events from main process
  useEffect(() => {
    if (!window.electronAPI) {
      // In web mode, check health on mount
      checkHealth();
      return;
    }

    const unsubscribe = window.electronAPI.onBackendStatus(({ status: newStatus }) => {
      setStatus(newStatus as BackendStatus);
    });

    // Initial health check
    checkHealth();

    return () => {
      unsubscribe();
    };
  }, [checkHealth]);

  // Periodic health check
  useEffect(() => {
    const interval = setInterval(() => {
      if (status !== 'starting') {
        checkHealth();
      }
    }, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, [status, checkHealth]);

  return {
    status,
    checkHealth,
    ensureRunning,
    shutdown,
  };
}
