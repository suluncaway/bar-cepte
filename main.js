// Bar Cepte — Electron masaüstü sarmalayıcısı
// Web sürümünü birebir çalıştırmak için yerel bir HTTP sunucusu üzerinden
// (http://127.0.0.1) servis eder. Böylece localStorage, IndexedDB, Service Worker,
// fetch ve diğer tüm web API'leri tarayıcıdakiyle aynı şekilde çalışır.
//
// Sunucu tek bir sabit portta dinler (desktop-server.js). Port her açılışta
// değişirse origin de değişir ve tarayıcı depolaması (localStorage/IndexedDB)
// yeni açılışta boş görünür; sabit port bu yüzden önemlidir.

const { app, BrowserWindow, Menu, shell, dialog } = require('electron');
const path = require('path');
const { createAppServer, listenOnFixedPort, DESKTOP_PORT } = require('./desktop-server');

const ROOT = __dirname;
const PUBLIC_FILES = new Set([
  ...require('./web-assets.json').map(file => '/' + file),
  '/build/icon.png'
]);

let server = null;
let mainWindow = null;

// Aynı anda tek örnek: ikinci açılış aynı sabit portu paylaşamaz, bu yüzden
// ikinci örnek doğrudan kapanır ve mevcut pencere odaklanır.
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  function createWindow(port) {
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
      if (new URL(url).origin !== `http://127.0.0.1:${port}`) {
        e.preventDefault();
        if (/^https?:\/\//i.test(url)) shell.openExternal(url);
      }
    });

    mainWindow.on('closed', () => { mainWindow = null; });

    mainWindow.loadURL(`http://127.0.0.1:${port}/index.html`);
  }

  app.whenReady().then(() => {
    Menu.setApplicationMenu(null);

    server = createAppServer(ROOT, PUBLIC_FILES);
    listenOnFixedPort(server, DESKTOP_PORT).then(port => {
      createWindow(port);
    }).catch(error => {
      dialog.showErrorBox(
        'Bar Cepte başlatılamadı',
        'Yerel sunucu ' + DESKTOP_PORT + ' portunda başlatılamadı (' + error.code + '). ' +
        'Bu port başka bir uygulama tarafından kullanılıyor olabilir. ' +
        'Verileriniz bu porta bağlı olduğu için Bar Cepte başka bir portta açılmaz; ' +
        'ilgili uygulamayı kapatıp Bar Cepte\u0027yi yeniden başlatın.'
      );
      app.quit();
    });

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0 && server && server.listening) {
        createWindow(server.address().port);
      }
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
}
