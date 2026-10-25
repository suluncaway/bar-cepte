// Bar Cepte — masaüstü yerel sunucusu
// main.js'in kullandığı HTTP sunucusu ve sabit port seçimi.
//
// Neden tek ve sabit port: localStorage, IndexedDB ve Service Worker verileri
// origin'e (şema + host + port) bağlıdır. Port her açılışta değişirse (ör.
// rastgele port veya dolu porta yedekleme) origin de değişir ve kullanıcı
// verileri yeni açılışta boş görünür. Bu yüzden tek bir sabit port kullanılır;
// port meşgulse uygulama başka bir portta açılmaz, açık bir hata verir.

const http = require('http');
const fs = require('fs');
const path = require('path');

const DESKTOP_PORT = 41790;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webmanifest': 'application/manifest+json',
  '.mp4': 'video/mp4'
};

function createAppServer(root, publicFiles) {
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
    if (!['GET', 'HEAD'].includes(req.method) || !publicFiles.has(pathname)) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }

    // Dizin dışına çıkma (path traversal) koruması
    const filePath = path.normalize(path.join(root, pathname));
    if (!filePath.startsWith(root + path.sep)) {
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
      res.writeHead(200, {
        'Content-Type': MIME[ext] || 'application/octet-stream',
        'X-Content-Type-Options': 'nosniff',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        'Cache-Control': 'no-cache'
      });
      res.end(req.method === 'HEAD' ? undefined : data);
    });
  });
}

// Sunucuyu verilen sabit portta dinler. Port alınamazsa reddeder;
// asla başka bir porta geçilmez (origin değişimi veri kaybı demektir).
function listenOnFixedPort(server, port = DESKTOP_PORT) {
  return new Promise((resolve, reject) => {
    const onListening = () => {
      cleanup();
      resolve(port);
    };
    const onError = (error) => {
      cleanup();
      reject(error);
    };
    function cleanup() {
      server.removeListener('listening', onListening);
      server.removeListener('error', onError);
    }
    server.once('listening', onListening);
    server.once('error', onError);
    server.listen(port, '127.0.0.1');
  });
}

module.exports = { createAppServer, listenOnFixedPort, DESKTOP_PORT, MIME };
