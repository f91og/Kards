import { contextBridge } from 'electron';

// expose APIs the renderer can safely consume
contextBridge.exposeInMainWorld('electronAPI', {
  // Add your IPC methods here
});

contextBridge.exposeInMainWorld('env', {
  versions: process.versions,
});
