// Bar Cepte — Electron masaüstü sarmalayıcısı
// Web sürümünü birebir çalıştırmak için yerel bir HTTP sunucusu üzerinden
// (http://127.0.0.1) servis eder. Böylece localStorage, IndexedDB, Service Worker,
// fetch ve diğer tüm web API'leri tarayıcıdakiyle aynı şekilde çalışır.

const { app, BrowserWindow, Menu, shell } = require('electron');
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webmanifest': 'application/manifest+json'
};

let server = null;
let mainWindow = null;

function createLocalServer() {
  return http.createServer((req, res) => {
    let pathname;
    try {
      pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    } catch (e) {
      res.writeHead(400);
      res.end('Bad Request');
      return;
    }

    if (pathname === '/' || pathname === '') pathname = '/index.html';

    // Dizin dışına çıkma (path traversal) koruması
    const filePath = path.normalize(path.join(ROOT, pathname));
    if (!filePath.startsWith(ROOT)) {
      res.writeHead(403);
      res.end('Forbidden');
      return;
    }

    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.writeHead(404);
        res.end('Not found');
        return;
      }
      const ext = path.extname(filePath).toLowerCase();
      res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
      res.end(data);
    });
  });
}

function createWindow() {
  const port = server.address().port;

  mainWindow = new BrowserWindow({
    width: 460,
    height: 900,
    minWidth: 360,
    minHeight: 640,
    backgroundColor: '#07090e',
    icon: path.join(ROOT, 'build', 'icon.png'),
    autoHideMenuBar: true,
    title: 'Bar Cepte',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  // Harici bağlantıları (http/https) varsayılan tarayıcıda aç
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url)) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'deny' };
  });

  mainWindow.webContents.on('will-navigate', (e, url) => {
    if (!url.startsWith(`http://127.0.0.1:${port}`)) {
      e.preventDefault();
      if (/^https?:\/\//i.test(url)) shell.openExternal(url);
    }
  });

  mainWindow.loadURL(`http://127.0.0.1:${port}/index.html`);
}

app.whenReady().then(() => {
  Menu.setApplicationMenu(null);

  server = createLocalServer();
  server.listen(0, '127.0.0.1', () => {
    createWindow();
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// Temizlik: uygulama kapanırken sunucuyu kapat
app.on('quit', () => {
  if (server) {
    try { server.close(); } catch (e) { /* ignored */ }
  }
});
