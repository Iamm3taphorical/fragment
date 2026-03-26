const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('fragment', {
  loadSnippets: () => ipcRenderer.invoke('snippets:load'),
  saveSnippets: (snippets) => ipcRenderer.invoke('snippets:save', snippets),
  minimizeWindow: () => ipcRenderer.invoke('window:minimize'),
  maximizeWindow: () => ipcRenderer.invoke('window:maximize'),
  closeWindow: () => ipcRenderer.invoke('window:close'),
  exportSnippet: (content, name) => ipcRenderer.invoke('dialog:export', content, name),
});
