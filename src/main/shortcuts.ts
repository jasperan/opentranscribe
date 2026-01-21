import { globalShortcut, BrowserWindow, dialog, app } from 'electron';

export function registerShortcuts(mainWindow: BrowserWindow): void {
  // Global hotkey to show window and start transcription
  const registered = globalShortcut.register('CommandOrControl+Shift+T', () => {
    // Show and focus the window
    mainWindow.show();
    mainWindow.focus();

    // Send message to renderer to trigger file picker
    mainWindow.webContents.send('trigger-transcription');
  });

  if (!registered) {
    console.warn('Failed to register global shortcut Ctrl+Shift+T');
  }

  // Register additional shortcuts when window is focused
  mainWindow.on('focus', () => {
    // These only work when the app is focused
  });
}

export function registerWindowShortcuts(mainWindow: BrowserWindow): void {
  // Window-specific shortcuts are handled via IPC from renderer
  // since they need access to the React state
}

/**
 * Show native file open dialog
 */
export async function showOpenDialog(mainWindow: BrowserWindow): Promise<string | null> {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Select Audio File',
    filters: [
      { name: 'Audio Files', extensions: ['mp3', 'wav', 'ogg', 'm4a', 'flac', 'webm'] },
      { name: 'All Files', extensions: ['*'] },
    ],
    properties: ['openFile'],
  });

  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }

  return result.filePaths[0];
}

/**
 * Add file to recent documents
 */
export function addToRecentDocuments(filePath: string): void {
  app.addRecentDocument(filePath);
}
