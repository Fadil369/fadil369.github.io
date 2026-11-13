const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('clinicalAcp', {
  prompt: (prompt, plugin, synthetic) => ipcRenderer.invoke('prompt', { prompt, plugin, synthetic }),
  cancel: () => ipcRenderer.invoke('cancel'),
});
