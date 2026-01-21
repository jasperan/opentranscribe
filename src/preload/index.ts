import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods that allow the renderer process to use
// ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Window controls
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close'),
  isMaximized: () => ipcRenderer.invoke('window-is-maximized'),

  // Window events
  onMaximizeChange: (callback: (isMaximized: boolean) => void) => {
    const handler = (_: Electron.IpcRendererEvent, isMaximized: boolean) => callback(isMaximized);
    ipcRenderer.on('window-maximized-change', handler);
    return () => ipcRenderer.removeListener('window-maximized-change', handler);
  },

  // Backend management
  checkBackendHealth: () => ipcRenderer.invoke('backend-check-health'),
  ensureBackendRunning: () => ipcRenderer.invoke('backend-ensure-running'),
  shutdownBackend: () => ipcRenderer.invoke('backend-shutdown'),

  // Backend status events
  onBackendStatus: (callback: (status: { status: string }) => void) => {
    const handler = (_: Electron.IpcRendererEvent, status: { status: string }) => callback(status);
    ipcRenderer.on('backend-status', handler);
    return () => ipcRenderer.removeListener('backend-status', handler);
  },

  // File operations
  showOpenDialog: () => ipcRenderer.invoke('show-open-dialog'),
  readFile: (filePath: string) => ipcRenderer.invoke('read-file', filePath),
  showItemInFolder: (filePath: string) => ipcRenderer.invoke('show-item-in-folder', filePath),

  // Trigger transcription event
  onTriggerTranscription: (callback: () => void) => {
    const handler = () => callback();
    ipcRenderer.on('trigger-transcription', handler);
    return () => ipcRenderer.removeListener('trigger-transcription', handler);
  },

  // Notifications
  showNotification: (title: string, body: string) => {
    ipcRenderer.send('show-notification', { title, body });
  },

  // Theme
  getSystemTheme: () => ipcRenderer.invoke('get-system-theme'),

  // App info
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),

  // Auto-launch
  getAutoLaunch: () => ipcRenderer.invoke('get-auto-launch'),
  setAutoLaunch: (enabled: boolean) => ipcRenderer.invoke('set-auto-launch', enabled),

  // Updater events
  onUpdaterStatus: (callback: (status: any) => void) => {
    const handler = (_: Electron.IpcRendererEvent, status: any) => callback(status);
    ipcRenderer.on('updater-status', handler);
    return () => ipcRenderer.removeListener('updater-status', handler);
  },

  // Platform info
  platform: process.platform,
});

// Type definitions for the exposed API
export interface ElectronAPI {
  minimize: () => void;
  maximize: () => void;
  close: () => void;
  isMaximized: () => Promise<boolean>;
  onMaximizeChange: (callback: (isMaximized: boolean) => void) => () => void;
  checkBackendHealth: () => Promise<boolean>;
  ensureBackendRunning: () => Promise<boolean>;
  shutdownBackend: () => Promise<boolean>;
  onBackendStatus: (callback: (status: { status: string }) => void) => () => void;
  showOpenDialog: () => Promise<string | null>;
  readFile: (filePath: string) => Promise<{ base64: string; mimeType: string; fileName: string }>;
  showItemInFolder: (filePath: string) => Promise<void>;
  onTriggerTranscription: (callback: () => void) => () => void;
  showNotification: (title: string, body: string) => void;
  getSystemTheme: () => Promise<'dark' | 'light'>;
  getAppVersion: () => Promise<string>;
  getAutoLaunch: () => Promise<boolean>;
  setAutoLaunch: (enabled: boolean) => Promise<boolean>;
  onUpdaterStatus: (callback: (status: any) => void) => () => void;
  platform: NodeJS.Platform;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
