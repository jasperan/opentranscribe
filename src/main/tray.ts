import { Tray, Menu, nativeImage, BrowserWindow, app } from 'electron';
import path from 'path';
import fs from 'fs';
import { BackendManager } from './backend-manager';

let tray: Tray | null = null;
let trayUpdateInterval: ReturnType<typeof setInterval> | null = null;

// Create a simple tray icon programmatically if file doesn't exist
function createTrayIcon(): Electron.NativeImage {
  // Try to load from file first
  const iconPaths = [
    path.join(__dirname, '../../assets/tray-icon.png'),
    path.join(process.resourcesPath || '', 'assets/tray-icon.png'),
    path.join(app.getAppPath(), 'assets/tray-icon.png'),
  ];

  for (const iconPath of iconPaths) {
    if (fs.existsSync(iconPath)) {
      return nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 });
    }
  }

  // Create a simple icon programmatically (blue circle)
  const size = 16;
  const canvas = Buffer.alloc(size * size * 4);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      const dx = x - size / 2;
      const dy = y - size / 2;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < size / 2 - 1) {
        // Blue color inside circle
        canvas[idx] = 59;     // R
        canvas[idx + 1] = 130; // G
        canvas[idx + 2] = 246; // B
        canvas[idx + 3] = 255; // A
      } else {
        // Transparent outside
        canvas[idx] = 0;
        canvas[idx + 1] = 0;
        canvas[idx + 2] = 0;
        canvas[idx + 3] = 0;
      }
    }
  }

  return nativeImage.createFromBuffer(canvas, { width: size, height: size });
}

export function createTray(
  mainWindow: BrowserWindow,
  backendManager: BackendManager
): Tray {
  const icon = createTrayIcon();
  tray = new Tray(icon);
  tray.setToolTip('OpenTranscribe');

  const updateContextMenu = async () => {
    const isRunning = await backendManager.checkHealth();

    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'Show OpenTranscribe',
        click: () => {
          mainWindow.show();
          mainWindow.focus();
        },
      },
      { type: 'separator' },
      {
        label: `Backend: ${isRunning ? 'Running' : 'Stopped'}`,
        enabled: false,
      },
      {
        label: isRunning ? 'Restart Backend' : 'Start Backend',
        click: async () => {
          if (isRunning) {
            await backendManager.shutdown();
          }
          await backendManager.ensureRunning();
          mainWindow.webContents.send('backend-status', { status: 'running' });
          updateContextMenu();
        },
      },
      {
        label: 'Stop Backend',
        enabled: isRunning && backendManager.isManaged(),
        click: async () => {
          await backendManager.shutdown();
          mainWindow.webContents.send('backend-status', { status: 'stopped' });
          updateContextMenu();
        },
      },
      { type: 'separator' },
      {
        label: 'Quit',
        click: () => {
          app.quit();
        },
      },
    ]);

    tray?.setContextMenu(contextMenu);
  };

  // Initial menu setup
  updateContextMenu();

  // Click to show/hide window
  tray.on('click', () => {
    if (mainWindow.isVisible()) {
      mainWindow.hide();
    } else {
      mainWindow.show();
      mainWindow.focus();
    }
  });

  // Update menu periodically (clear any previous interval)
  if (trayUpdateInterval) {
    clearInterval(trayUpdateInterval);
  }
  trayUpdateInterval = setInterval(updateContextMenu, 10000);

  return tray;
}

export function destroyTray(): void {
  if (trayUpdateInterval) {
    clearInterval(trayUpdateInterval);
    trayUpdateInterval = null;
  }
  if (tray) {
    tray.destroy();
    tray = null;
  }
}

export function getTray(): Tray | null {
  return tray;
}
