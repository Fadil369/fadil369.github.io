const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('clinicalAcp', {
  prompt: (prompt, plugin) => ipcRenderer.invoke('prompt', { prompt, plugin }),
});
