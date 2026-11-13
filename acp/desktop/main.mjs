import { app, BrowserWindow, ipcMain } from 'electron';
import { join } from 'node:path';
import { createDesktopHandlers } from './handler.mjs';

let window;
const handlers = createDesktopHandlers({
  isTrusted: event => Boolean(window) && event.sender === window.webContents && event.senderFrame === window.webContents.mainFrame,
});

app.whenReady().then(() => {
  window = new BrowserWindow({
    width: 900, height: 720,
    webPreferences: { preload: join(import.meta.dirname, 'preload.cjs'), contextIsolation: true, sandbox: true, nodeIntegration: false },
  });
  // The window only ever shows the bundled local page: no new windows, navigation, webviews or device/permission prompts.
  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  window.webContents.on('will-navigate', event => event.preventDefault());
  window.webContents.on('will-attach-webview', event => event.preventDefault());
  window.webContents.session.setPermissionRequestHandler((_contents, _permission, callback) => callback(false));
  window.webContents.session.setPermissionCheckHandler(() => false);
  window.loadFile(join(import.meta.dirname, 'index.html'));
});

ipcMain.handle('prompt', handlers.prompt);
ipcMain.handle('cancel', handlers.cancel);
app.on('window-all-closed', () => { handlers.shutdown(); app.quit(); });
