// Preload script with context isolation
const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Add your IPC methods here
});
