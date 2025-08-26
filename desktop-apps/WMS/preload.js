const { contextBridge } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
    // Add any electron-specific APIs here if needed
    platform: process.platform,
    version: process.versions.electron
});
