import { ipcMain, BrowserWindow, Notification, shell, app } from 'electron';
import { BackendManager } from './backend-manager';
import { showOpenDialog, addToRecentDocuments } from './shortcuts';
import fs from 'fs/promises';
import path from 'path';

export function registerIpcHandlers(backendManager: BackendManager): void {
  // Window controls
  ipcMain.on('window-minimize', (event) => {
    BrowserWindow.fromWebContents(event.sender)?.minimize();
  });

  ipcMain.on('window-maximize', (event) => {
    const window = BrowserWindow.fromWebContents(event.sender);
    if (window?.isMaximized()) {
      window.unmaximize();
    } else {
      window?.maximize();
    }
  });

  ipcMain.on('window-close', (event) => {
    BrowserWindow.fromWebContents(event.sender)?.close();
  });

  ipcMain.handle('window-is-maximized', (event) => {
    return BrowserWindow.fromWebContents(event.sender)?.isMaximized() ?? false;
  });

  // Backend status
  ipcMain.handle('backend-check-health', async () => {
    return backendManager.checkHealth();
  });

  ipcMain.handle('backend-ensure-running', async () => {
    await backendManager.ensureRunning();
    return true;
  });

  ipcMain.handle('backend-shutdown', async () => {
    await backendManager.shutdown();
    return true;
  });

  // File operations
  ipcMain.handle('show-open-dialog', async (event) => {
    const window = BrowserWindow.fromWebContents(event.sender);
    if (!window) return null;
    return showOpenDialog(window);
  });

  ipcMain.handle('read-file', async (_, filePath: string) => {
    try {
      const buffer = await fs.readFile(filePath);
      const base64 = buffer.toString('base64');
      const ext = path.extname(filePath).toLowerCase();
      const mimeType = getMimeType(ext);
      addToRecentDocuments(filePath);
      return { base64, mimeType, fileName: path.basename(filePath) };
    } catch (error) {
      throw new Error(`Failed to read file: ${error}`);
    }
  });

  ipcMain.handle('show-item-in-folder', async (_, filePath: string) => {
    shell.showItemInFolder(filePath);
  });

  // Notifications
  ipcMain.on('show-notification', (_, { title, body }: { title: string; body: string }) => {
    if (Notification.isSupported()) {
      new Notification({ title, body }).show();
    }
  });

  // Theme
  ipcMain.handle('get-system-theme', () => {
    const { nativeTheme } = require('electron');
    return nativeTheme.shouldUseDarkColors ? 'dark' : 'light';
  });

  // App info
  ipcMain.handle('get-app-version', () => {
    return app.getVersion();
  });

  // Auto-launch (using electron store for persistence)
  ipcMain.handle('get-auto-launch', async () => {
    // Will be implemented with auto-launch package
    return false;
  });

  ipcMain.handle('set-auto-launch', async (_, enabled: boolean) => {
    // Will be implemented with auto-launch package
    return enabled;
  });
}

function getMimeType(ext: string): string {
  const mimeTypes: Record<string, string> = {
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav',
    '.ogg': 'audio/ogg',
    '.m4a': 'audio/mp4',
    '.flac': 'audio/flac',
    '.webm': 'audio/webm',
  };
  return mimeTypes[ext] || 'audio/mpeg';
}
