import { app, BrowserWindow, ipcMain } from 'electron';
import { join } from 'node:path';
import { runPrompt } from '../client.mjs';

let window;
let running = false;
let abort;

app.whenReady().then(() => {
  window = new BrowserWindow({
    width: 900, height: 720,
    webPreferences: { preload: join(import.meta.dirname, 'preload.cjs'), contextIsolation: true, sandbox: true, nodeIntegration: false },
  });
  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  window.webContents.on('will-navigate', event => event.preventDefault());
  window.loadFile(join(import.meta.dirname, 'index.html'));
});

ipcMain.handle('prompt', async (event, input) => {
  if (!window || event.sender !== window.webContents || event.senderFrame !== window.webContents.mainFrame) throw new Error('Invalid sender.');
  if (running) throw new Error('A request is already running.');
  running = true;
  abort = new AbortController();
  try {
    return await runPrompt({ prompt: input?.prompt, plugin: input?.plugin, signal: abort.signal });
  } finally {
    running = false;
    abort = undefined;
  }
});

app.on('window-all-closed', () => { abort?.abort(); app.quit(); });
