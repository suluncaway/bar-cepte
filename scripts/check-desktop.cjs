'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const asar = require('@electron/asar');
const root = path.resolve(__dirname, '..');
const pkg = require('../package.json');

function checkDesktop(archive) {
    const entries = asar.listPackage(archive).map(name => name.replace(/\\/g, '/').replace(/^\//, ''));
    const allowed = new Set([...pkg.build.files, 'package.json']);
    for (const name of allowed) {
        for (let parent = path.posix.dirname(name); parent !== '.'; parent = path.posix.dirname(parent)) allowed.add(parent);
    }
    for (const name of entries) assert.ok(allowed.has(name), `Unexpected packaged path: ${name}`);
    for (const name of pkg.build.files) {
        assert.ok(entries.includes(name), `Missing packaged file: ${name}`);
        assert.ok(asar.extractFile(archive, name).equals(fs.readFileSync(path.join(root, name))), `Stale packaged file: ${name}`);
    }
    const metadata = JSON.parse(asar.extractFile(archive, 'package.json'));
    assert.equal(metadata.main, pkg.main);
    assert.equal(metadata.version, pkg.version);
    console.log(`OK: ${pkg.build.files.length} canonical desktop files match; no unexpected paths.`);
}
if (require.main === module) {
    try {
        assert.equal(process.argv.length, 3, 'Usage: node scripts/check-desktop.cjs path/to/app.asar');
        checkDesktop(path.resolve(process.argv[2]));
    } catch (error) { console.error(error.message); process.exitCode = 1; }
}
module.exports = { checkDesktop };
