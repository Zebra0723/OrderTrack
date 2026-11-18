const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  platform: process.platform,
  load: () => ipcRenderer.invoke('data:load'),
  save: (data) => ipcRenderer.invoke('data:save', data),
  dataLocation: () => ipcRenderer.invoke('data:location'),
  version: () => ipcRenderer.invoke('app:version'),
  exportBackup: (data) => ipcRenderer.invoke('backup:export', data),
  importBackup: () => ipcRenderer.invoke('backup:import'),
  setSmtpPassword: (value) => ipcRenderer.invoke('secret:set', value),
  hasSmtpPassword: () => ipcRenderer.invoke('secret:has'),
  sendEmail: (smtp, message) => ipcRenderer.invoke('email:send', { smtp, message }),
  openMailto: (url) => ipcRenderer.invoke('open:mailto', url),
  invoicePdf: (html) => ipcRenderer.invoke('invoice:pdf', html),
  saveInvoice: (html, filename) => ipcRenderer.invoke('invoice:save', { html, filename }),
  onApiCreateOrder: (fn) => ipcRenderer.on('api:createOrder', (_e, msg) => fn(msg)),
  onApiOutreachUpdate: (fn) => ipcRenderer.on('api:outreachUpdate', (_e, msg) => fn(msg)),
  apiRespond: (reqId, result) => ipcRenderer.invoke('api:respond', { reqId, result }),
  cometStatus: () => ipcRenderer.invoke('comet:status'),
  websiteStatus: () => ipcRenderer.invoke('website:status'),
  websiteSync: (data) => ipcRenderer.invoke('website:sync', data)
});
