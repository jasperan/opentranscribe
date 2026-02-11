import { app, BrowserWindow, globalShortcut } from 'electron';
import path from 'path';
import { createWindow, getMainWindow } from './window';
import { BackendManager } from './backend-manager';
import { createTray, destroyTray } from './tray';
import { registerIpcHandlers } from './ipc-handlers';
import { registerShortcuts } from './shortcuts';
import { setupAutoUpdater } from './updater';

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  app.quit();
}

const backendManager = new BackendManager();

app.whenReady().then(async () => {
  // Register IPC handlers before creating window
  registerIpcHandlers(backendManager);

  // Create main window
  const mainWindow = await createWindow();

  // Create system tray
  createTray(mainWindow, backendManager);

  // Register global shortcuts
  registerShortcuts(mainWindow);

  // Setup auto-updater (production only)
  if (app.isPackaged) {
    setupAutoUpdater(mainWindow);
  }

  // Check and start backend
  const isRunning = await backendManager.checkHealth();
  if (!isRunning) {
    mainWindow.webContents.send('backend-status', { status: 'starting' });
    try {
      await backendManager.ensureRunning();
      mainWindow.webContents.send('backend-status', { status: 'running' });
    } catch (error) {
      console.error('Failed to start backend:', error);
      mainWindow.webContents.send('backend-status', { status: 'error' });
    }
  } else {
    mainWindow.webContents.send('backend-status', { status: 'running' });
  }

  app.on('activate', () => {
    // On macOS re-create window when dock icon is clicked
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

let isShuttingDown = false;

app.on('before-quit', (event) => {
  if (!isShuttingDown && backendManager.isManaged()) {
    isShuttingDown = true;
    event.preventDefault();
    // Unregister all shortcuts
    globalShortcut.unregisterAll();
    // Clean up tray
    destroyTray();
    // Gracefully shutdown backend, then quit
    backendManager.shutdown().finally(() => {
      app.quit();
    });
  } else {
    globalShortcut.unregisterAll();
  }
});
