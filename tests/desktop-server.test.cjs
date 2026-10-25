'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('http');
const path = require('path');
const { createAppServer, listenOnFixedPort, DESKTOP_PORT } = require('../desktop-server.js');

const ROOT = path.join(__dirname, '..');
const FILES = new Set(['/index.html', '/privacy.html', '/build/icon.png']);

function freePort() {
  return new Promise((resolve, reject) => {
    const probe = http.createServer();
    probe.listen(0, '127.0.0.1', () => {
      const port = probe.address().port;
      probe.close(() => resolve(port));
    });
    probe.on('error', reject);
  });
}

test('local server serves known files and rejects unknown or traversal paths', async () => {
  const port = await freePort();
  const server = createAppServer(ROOT, FILES);
  try {
    await listenOnFixedPort(server, port);
    const base = `http://127.0.0.1:${port}`;
    const html = await fetch(base + '/index.html');
    assert.equal(html.status, 200);
    assert.match(html.headers.get('content-type'), /text\/html/);
    assert.ok((await html.text()).includes('<!DOCTYPE html>'));

    const missing = await fetch(base + '/game.js');
    assert.equal(missing.status, 404);

    const traversal = await fetch(base + '/..%2f..%2fpackage.json');
    assert.ok([400, 403, 404].includes(traversal.status));
    assert.notEqual(traversal.status, 200);

    const post = await fetch(base + '/index.html', { method: 'POST' });
    assert.equal(post.status, 404);
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});

test('the desktop port is a single fixed value so the origin never changes', () => {
  // Rastgele port (listen(0)) veya port yedeklemesi her açılışta origin
  // değiştirir ve localStorage/IndexedDB verilerini erişilmez bırakır.
  assert.equal(typeof DESKTOP_PORT, 'number');
  assert.ok(Number.isInteger(DESKTOP_PORT) && DESKTOP_PORT > 0 && DESKTOP_PORT < 65536);
  const source = require('fs').readFileSync(path.join(ROOT, 'desktop-server.js'), 'utf8');
  assert.ok(!/listen\(0/.test(source), 'random port must never be used');
  assert.equal(source.match(/DESKTOP_PORT = /g).length, 1, 'exactly one fixed port constant');
});

test('restart reuses the same fixed port, keeping the storage origin stable', async () => {
  const port = await freePort();
  // İlk "açılış"
  const first = createAppServer(ROOT, FILES);
  assert.equal(await listenOnFixedPort(first, port), port);
  await new Promise(resolve => first.close(resolve));
  // Yeniden başlatma: aynı sabit port tekrar alınabilir olur.
  const second = createAppServer(ROOT, FILES);
  try {
    assert.equal(await listenOnFixedPort(second, port), port);
    assert.equal(second.address().port, port);
  } finally {
    await new Promise(resolve => second.close(resolve));
  }
});

test('a busy fixed port is rejected instead of switching to another origin', async () => {
  const blocker = http.createServer();
  const busy = await new Promise((resolve, reject) => {
    blocker.listen(0, '127.0.0.1', () => resolve(blocker.address().port));
    blocker.on('error', reject);
  });
  const server = createAppServer(ROOT, FILES);
  try {
    await assert.rejects(
      listenOnFixedPort(server, busy),
      error => error.code === 'EADDRINUSE'
    );
    assert.equal(server.listening, false, 'no fallback port may be opened');
  } finally {
    await new Promise(resolve => blocker.close(resolve));
  }
});
