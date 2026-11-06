const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

test('AI rate limit cannot be bypassed by spoofing the first X-Forwarded-For entry', async t => {
    const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bar-cepte-ai-'));
    const previous = { dir: process.env.LICENSE_DATA_DIR, key: process.env.OPENAI_API_KEY };
    process.env.LICENSE_DATA_DIR = dataDir;
    delete process.env.OPENAI_API_KEY; // requests fail fast with 503 instead of calling OpenAI
    const { server } = require('../scripts/shopier-webhook');
    t.after(async () => {
        await new Promise(resolve => server.close(resolve));
        fs.rmSync(dataDir, { recursive: true, force: true });
        if (previous.dir === undefined) delete process.env.LICENSE_DATA_DIR; else process.env.LICENSE_DATA_DIR = previous.dir;
        if (previous.key !== undefined) process.env.OPENAI_API_KEY = previous.key;
    });
    await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
    const url = `http://127.0.0.1:${server.address().port}/api/ai-assistant`;
    // Render appends the real client address as the last entry; the first entry is attacker-controlled.
    const ask = spoofed => fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': `${spoofed}, 203.0.113.7` }, body: '{}' }).then(r => r.status);
    const statuses = [];
    for (let i = 0; i < 13; i++) statuses.push(await ask(`10.0.0.${i}`));
    assert.ok(statuses.slice(0, 12).every(s => s !== 429), `first 12 requests allowed: ${statuses}`);
    assert.equal(statuses[12], 429, 'the 13th request from the same real client is limited');
    assert.notEqual(await fetch(url, { method: 'POST', headers: { 'X-Forwarded-For': '198.51.100.9' }, body: '{}' }).then(r => r.status), 429, 'other clients are not affected');
});
