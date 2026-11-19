'use strict';
// Public client allowlist only: never expose .env, keys, backend or repository metadata.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { readAssetNames } = require('./check-assets.cjs');
const root = path.resolve(__dirname, '..');
const names = new Set(readAssetNames(root));
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.png': 'image/png',
    '.webp': 'image/webp', '.mp4': 'video/mp4',
    '.svg': 'image/svg+xml', '.txt': 'text/plain; charset=utf-8' };
function createPreviewServer() {
    return http.createServer((req, res) => {
        let name;
        try { name = decodeURIComponent(new URL(req.url, 'http://localhost').pathname).slice(1) || 'index.html'; }
        catch { res.writeHead(400); return res.end('Bad request'); }
        if (!['GET', 'HEAD'].includes(req.method) || !names.has(name)) {
            res.writeHead(404); return res.end('Not found');
        }
        fs.readFile(path.join(root, name), (error, data) => {
            res.writeHead(error ? 404 : 200, {
                'Content-Type': types[path.extname(name)] || 'application/octet-stream',
                'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'no-cache'
            });
            res.end(req.method === 'HEAD' ? undefined : error ? 'Not found' : data);
        });
    });
}
if (require.main === module) {
    const port = Number(process.env.PORT || 47832);
    const server = createPreviewServer();
    server.on('error', error => { console.error(error.message); process.exitCode = 1; });
    server.listen(port, '127.0.0.1', () => console.log(`Preview: http://127.0.0.1:${port}/`));
}
module.exports = { createPreviewServer };
