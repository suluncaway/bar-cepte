const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

test('anonymous usage counters accept only allow-listed events and are readable by the admin', async t => {
    const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bar-metrics-'));
    const previous = { dir: process.env.LICENSE_DATA_DIR, admin: process.env.ADMIN_TOKEN };
    process.env.LICENSE_DATA_DIR = dataDir;
    process.env.ADMIN_TOKEN = 'metrics-admin';
    const { server } = require('../scripts/shopier-webhook');
    t.after(async () => {
        await new Promise(resolve => server.close(resolve));
        fs.rmSync(dataDir, { recursive: true, force: true });
        if (previous.dir === undefined) delete process.env.LICENSE_DATA_DIR; else process.env.LICENSE_DATA_DIR = previous.dir;
        if (previous.admin === undefined) delete process.env.ADMIN_TOKEN; else process.env.ADMIN_TOKEN = previous.admin;
    });
    await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
    const base = `http://127.0.0.1:${server.address().port}`;
    const send = events => fetch(base + '/api/metrics', { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify({ events }) }).then(r => r.status);

    assert.equal(await send({ 'tab:alkol': 2, 'recipe:11007': 1, 'email:someone@example.com': 5, 'tab:<script>': 1, 'action:share_link': 999 }), 204);
    assert.equal(await send({ 'tab:alkol': 1 }), 204);
    assert.equal((await fetch(base + '/api/metrics/summary')).status, 401, 'summary is admin-only');

    const auth = 'Basic ' + Buffer.from('admin:metrics-admin').toString('base64');
    const summary = await (await fetch(base + '/api/metrics/summary', { headers: { Authorization: auth } })).json();
    assert.deepEqual(summary.totals, { 'action:share_link': 50, 'tab:alkol': 3, 'recipe:11007': 1 });
    assert.ok(!JSON.stringify(summary).includes('someone'), 'unknown event names are dropped');
});
