const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  platform: process.platform,
  load: () => ipcRenderer.invoke('data:load'),
  save: (data) => ipcRenderer.invoke('data:save', data),
  dataLocation: () => ipcRenderer.invoke('data:location'),
  exportBackup: (data) => ipcRenderer.invoke('backup:export', data),
  importBackup: () => ipcRenderer.invoke('backup:import'),
  setSmtpPassword: (value) => ipcRenderer.invoke('secret:set', value),
  hasSmtpPassword: () => ipcRenderer.invoke('secret:has'),
  sendEmail: (smtp, message) => ipcRenderer.invoke('email:send', { smtp, message }),
  openMailto: (url) => ipcRenderer.invoke('open:mailto', url)
});
