const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('__PSTREAM_SETUP__', {
  saveDomain: (domain) => ipcRenderer.invoke('save-domain', domain),
});
