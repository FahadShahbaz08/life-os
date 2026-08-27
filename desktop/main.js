const { app, BrowserWindow } = require('electron');
const fs = require('fs');
const path = require('path');

function startUrl() {
  if (process.env.LIFE_OS_URL) return process.env.LIFE_OS_URL;
  try {
    const raw = fs.readFileSync(path.join(__dirname, 'url.txt'), 'utf8').trim();
    if (raw) return raw;
  } catch {
    // no url.txt
  }
  return 'https://progress.fahadshahbaz.fun';
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    title: 'Life OS',
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      partition: 'persist:lifeos',
    },
  });

  const url = startUrl();
  let showingOffline = false;

  win.loadURL(url);

  win.webContents.on('did-fail-load', (_event, errorCode, _desc, _failedUrl, isMainFrame) => {
    if (!isMainFrame || errorCode === -3 || showingOffline) return;
    showingOffline = true;
    win.loadFile(path.join(__dirname, 'offline.html'));
    setTimeout(() => { showingOffline = false; }, 4000);
  });

  win.webContents.on('did-finish-load', () => {
    if (win.webContents.getURL().startsWith('http')) showingOffline = false;
  });
}

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    const win = BrowserWindow.getAllWindows()[0];
    if (win) {
      if (win.isMinimized()) win.restore();
      win.focus();
    }
  });
  app.whenReady().then(createWindow);
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
