const { app, BrowserWindow, ipcMain, shell, dialog, safeStorage } = require('electron');
const path = require('path');
const fs = require('fs');
const nodemailer = require('nodemailer');
const { CometApi } = require('./comet-api');
const { WebsiteSync } = require('./website-sync');
const { Updater } = require('./updater');
const updater = new Updater();
const websiteSync = new WebsiteSync();

let mainWin = null;
let quitting = false;
const cometApi = new CometApi({ getWindow: () => (mainWin && !mainWin.isDestroyed() ? mainWin : null), version: app.getVersion() });

const userDir = () => app.getPath('userData');
const dataFile = () => path.join(userDir(), 'ordertrack-data.json');
const backupFile = () => path.join(userDir(), 'ordertrack-data.backup.json');
const secretFile = () => path.join(userDir(), 'smtp-secret.bin');

function createWindow() {
  const win = mainWin = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 380,
    minHeight: 560,
    title: 'OrderTrack',
    backgroundColor: '#FAF6EF',
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });
  win.loadFile(path.join(__dirname, 'src', 'index.html'));
  // On a Mac, closing the window hides it so OrderTrack keeps taking orders from Comet
  // until you quit the app (Cmd+Q).
  win.on('close', (e) => {
    if (process.platform === 'darwin' && !quitting) { e.preventDefault(); win.hide(); }
  });
  win.on('closed', () => { if (mainWin === win) mainWin = null; });
  // Open any external link in the default browser / mail app, never inside the app.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^(https?|mailto):/.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (e) => e.preventDefault());
}

// ---------- Data ----------
ipcMain.handle('data:load', () => {
  try {
    const data = JSON.parse(fs.readFileSync(dataFile(), 'utf8'));
    websiteSync.update(data);
    return data;
  } catch (err) {
    if (err.code === 'ENOENT') return null;
    // Main file unreadable: fall back to the last good copy.
    try { return JSON.parse(fs.readFileSync(backupFile(), 'utf8')); } catch { throw err; }
  }
});

ipcMain.handle('data:save', (_e, data) => {
  const file = dataFile();
  fs.mkdirSync(userDir(), { recursive: true });
  if (fs.existsSync(file)) fs.copyFileSync(file, backupFile());
  const tmp = file + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
  fs.renameSync(tmp, file);
  cometApi.update(data);
  websiteSync.update(data);
  return true;
});

// ---------- Updates from inside the app ----------
ipcMain.handle('update:check', () => updater.check());
ipcMain.handle('update:install', (e) => updater.install((pct) => { if (!e.sender.isDestroyed()) e.sender.send('update:progress', pct); }));

// ---------- Chameleon website (serials for the repair form) ----------
ipcMain.handle('website:status', () => websiteSync.state);
ipcMain.handle('website:sync', async (_e, data) => { if (data) websiteSync.data = data; return websiteSync.send(true); });

// ---------- Comet (iMessage orders) ----------
ipcMain.handle('api:respond', (_e, { reqId, result }) => { cometApi.respond(reqId, result); return true; });
ipcMain.handle('comet:status', () => ({ listening: !!cometApi.listening, port: cometApi.listening ? cometApi.listening.port : null }));

ipcMain.handle('data:location', () => dataFile());
ipcMain.handle('app:version', () => app.getVersion());

ipcMain.handle('backup:export', async (_e, data) => {
  const stamp = new Date().toISOString().slice(0, 10);
  const { canceled, filePath } = await dialog.showSaveDialog({
    title: 'Export OrderTrack backup',
    defaultPath: `ordertrack-backup-${stamp}.json`,
    filters: [{ name: 'JSON', extensions: ['json'] }]
  });
  if (canceled || !filePath) return false;
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  return true;
});

ipcMain.handle('backup:import', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    title: 'Import OrderTrack backup',
    properties: ['openFile'],
    filters: [{ name: 'JSON', extensions: ['json'] }]
  });
  if (canceled || !filePaths.length) return null;
  return JSON.parse(fs.readFileSync(filePaths[0], 'utf8'));
});

// ---------- SMTP password (kept out of the data file, encrypted with the macOS keychain) ----------
function readSecret() {
  try {
    const buf = fs.readFileSync(secretFile());
    return safeStorage.isEncryptionAvailable() ? safeStorage.decryptString(buf) : buf.toString('utf8');
  } catch { return ''; }
}

ipcMain.handle('secret:set', (_e, value) => {
  if (!value) { try { fs.unlinkSync(secretFile()); } catch {} return true; }
  const buf = safeStorage.isEncryptionAvailable() ? safeStorage.encryptString(value) : Buffer.from(value, 'utf8');
  fs.writeFileSync(secretFile(), buf);
  return true;
});

ipcMain.handle('secret:has', () => readSecret().length > 0);

// ---------- Email ----------
ipcMain.handle('email:send', async (_e, { smtp, message }) => {
  try {
    const transport = nodemailer.createTransport({
      host: smtp.host,
      port: Number(smtp.port) || 587,
      secure: Number(smtp.port) === 465,
      auth: { user: smtp.user, pass: readSecret() }
    });
    await transport.sendMail({
      from: smtp.fromName ? `"${smtp.fromName.replace(/"/g, '')}" <${smtp.fromEmail || smtp.user}>` : (smtp.fromEmail || smtp.user),
      replyTo: smtp.fromEmail || smtp.user,
      to: message.to,
      subject: message.subject,
      text: message.text,
      html: message.html,
      attachments: (message.attachments || []).map((a) => ({ filename: a.filename, content: Buffer.from(a.base64, 'base64'), contentType: a.contentType }))
    });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

// ---------- Invoices: render src/invoice.html with the given content to a PDF ----------
async function renderPdf(html) {
  const win = new BrowserWindow({ show: false, width: 800, height: 1130, webPreferences: { sandbox: true, contextIsolation: true } });
  try {
    await win.loadFile(path.join(__dirname, 'src', 'invoice.html'));
    await win.webContents.executeJavaScript(`document.body.innerHTML = ${JSON.stringify(html)}; document.fonts.ready.then(() => true)`);
    return await win.webContents.printToPDF({ pageSize: 'A4', printBackground: true, margins: { marginType: 'none' } });
  } finally {
    win.destroy();
  }
}

ipcMain.handle('invoice:pdf', async (_e, html) => (await renderPdf(html)).toString('base64'));

ipcMain.handle('invoice:save', async (_e, { html, filename }) => {
  const pdf = await renderPdf(html);
  const { canceled, filePath } = await dialog.showSaveDialog({
    title: 'Save invoice',
    defaultPath: path.join(app.getPath('documents'), filename),
    filters: [{ name: 'PDF', extensions: ['pdf'] }]
  });
  if (canceled || !filePath) return false;
  fs.writeFileSync(filePath, pdf);
  shell.openPath(filePath);
  return true;
});

ipcMain.handle('open:mailto', (_e, url) => {
  if (typeof url === 'string' && url.startsWith('mailto:')) shell.openExternal(url);
  return true;
});

app.on('before-quit', () => { quitting = true; cometApi.stop(); });

app.whenReady().then(() => {
  try { cometApi.update(JSON.parse(fs.readFileSync(dataFile(), 'utf8'))); } catch { /* no data yet */ }
  createWindow();
  app.on('activate', () => {
    if (mainWin && !mainWin.isDestroyed()) mainWin.show();
    else createWindow();
  });
});

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
