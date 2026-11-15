const { app, BrowserWindow, ipcMain, shell, dialog, safeStorage } = require('electron');
const path = require('path');
const fs = require('fs');
const nodemailer = require('nodemailer');

const userDir = () => app.getPath('userData');
const dataFile = () => path.join(userDir(), 'ordertrack-data.json');
const backupFile = () => path.join(userDir(), 'ordertrack-data.backup.json');
const secretFile = () => path.join(userDir(), 'smtp-secret.bin');

function createWindow() {
  const win = new BrowserWindow({
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
    return JSON.parse(fs.readFileSync(dataFile(), 'utf8'));
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
  return true;
});

ipcMain.handle('data:location', () => dataFile());

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
      html: message.html
    });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

ipcMain.handle('open:mailto', (_e, url) => {
  if (typeof url === 'string' && url.startsWith('mailto:')) shell.openExternal(url);
  return true;
});

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
