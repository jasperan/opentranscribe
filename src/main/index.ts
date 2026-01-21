import { app, BrowserWindow, globalShortcut } from 'electron';
import path from 'path';
import { createWindow, getMainWindow } from './window';
import { BackendManager } from './backend-manager';
import { createTray } from './tray';
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
    await backendManager.ensureRunning();
  }
  mainWindow.webContents.send('backend-status', { status: 'running' });

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

app.on('will-quit', async () => {
  // Unregister all shortcuts
  globalShortcut.unregisterAll();

  // Gracefully shutdown backend
  await backendManager.shutdown();
});
