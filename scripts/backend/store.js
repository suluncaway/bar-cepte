'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const PLANS = { monthly: 30, annual: 365, lifetime: 0 };
// Same 130-bit format as the live delivery path, so every issued key passes the client format check.
function generateKey(plan = 'lifetime') {
    if (!Object.hasOwn(PLANS, plan)) throw new Error('Invalid plan');
    return require('../generate-keys').generateKey(plan);
}
function readJson(file, missing) {
    try { return JSON.parse(fs.readFileSync(file, 'utf8')); }
    catch (error) { if (error.code === 'ENOENT') return missing; throw error; }
}
function atomicWrite(file, data) {
    const temporary = `${file}.${crypto.randomUUID()}.tmp`;
    let fd;
    try {
        fd = fs.openSync(temporary, 'wx', 0o600);
        fs.writeFileSync(fd, JSON.stringify(data, null, 2));
        fs.fsyncSync(fd);
        fs.closeSync(fd); fd = undefined;
        fs.renameSync(temporary, file);
        // POSIX directory sync makes the rename durable; Windows does not support it.
        if (process.platform !== 'win32') {
            const directory = fs.openSync(path.dirname(file), 'r');
            try { fs.fsyncSync(directory); } finally { fs.closeSync(directory); }
        }
    } finally {
        if (fd !== undefined) fs.closeSync(fd);
        if (fs.existsSync(temporary)) fs.unlinkSync(temporary);
    }
}
function validate(state) {
    if (!state || state.version !== 1 || !Array.isArray(state.inventory) ||
        !state.claims || typeof state.claims !== 'object' || Array.isArray(state.claims)) throw new Error('Invalid license database');
    const seen = new Set();
    for (const record of state.inventory) {
        if (!record || typeof record.licenseKey !== 'string' || !Object.hasOwn(PLANS, record.planType) || seen.has(record.licenseKey)) throw new Error('Invalid inventory');
        seen.add(record.licenseKey);
    }
    for (const claim of Object.values(state.claims)) {
        if (!claim || !Object.hasOwn(PLANS, claim.plan) || !Number.isFinite(claim.expiresAt) || claim.expiresAt < 0) throw new Error('Invalid claim');
    }
    return state;
}
function createStore(directory) {
    const file = path.join(directory, 'license-state.json');
    const lock = path.join(directory, '.license-state.lock');
    function transaction(change) {
        fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
        const fd = fs.openSync(lock, 'wx', 0o600); // shared by CLI and server; fail closed if busy
        try {
            const state = readJson(file, null);
            if (!state) throw new Error('License database missing; initialize explicitly');
            validate(state);
            const result = change(state);
            validate(state);
            atomicWrite(file, state);
            return result;
        } finally { fs.closeSync(fd); fs.unlinkSync(lock); }
    }
    function initialize() {
        fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
        const fd = fs.openSync(lock, 'wx', 0o600);
        try {
            if (fs.existsSync(file)) return validate(readJson(file));
            const inventory = readJson(path.join(directory, 'sold_licenses.json'), []);
            const claims = readJson(path.join(directory, 'claimed_licenses.json'), {});
            const state = validate({ version: 1, inventory, claims });
            atomicWrite(file, state);
            return state;
        } finally { fs.closeSync(fd); fs.unlinkSync(lock); }
    }
    return {
        initialize, transaction,
        read: () => validate(readJson(file)),
        issue(plan, count) {
            if (!Object.hasOwn(PLANS, plan) || !Number.isInteger(count) || count < 1 || count > 10000) throw new Error('Invalid plan/count');
            return transaction(state => {
                const keys = Array.from({ length: count }, () => generateKey(plan));
                state.inventory.push(...keys.map(licenseKey => ({ licenseKey, planType: plan, createdAt: new Date().toISOString() })));
                return keys;
            });
        }
    };
}
// Only an independently authenticated, normalized paid-order source may call this.
// There is intentionally no public HTTP route or unverified callback adapter.
function fulfillPaidOrder(store, order, products) {
    if (order.paymentStatus !== 'paid' || typeof order.id !== 'string' || !order.id || !Array.isArray(order.items) || !order.items.length) throw new Error('Invalid paid order');
    const units = [];
    const ids = new Set();
    for (const item of order.items) {
        const plan = products[item.productId];
        if (typeof item.id !== 'string' || !item.id || ids.has(item.id) || !Object.hasOwn(PLANS, plan) || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 100) throw new Error('Invalid order item');
        ids.add(item.id);
        for (let unit = 0; unit < item.quantity; unit++) units.push({ itemId: item.id, unit, plan });
    }
    if (units.length > 1000) throw new Error('Order too large');
    return store.transaction(state => {
        const existing = state.inventory.filter(record => record.orderId === order.id);
        // Legacy sales have no item IDs: never silently re-issue the entire order.
        if (existing.some(record => !record.itemId)) throw new Error('Legacy order needs manual reconciliation');
        if (existing.length) {
            if (existing.length !== units.length || units.some(unit => !existing.some(record => record.itemId === unit.itemId && record.unit === unit.unit && record.planType === unit.plan))) throw new Error('Order changed; manual reconciliation required');
            return existing;
        }
        const records = units.map(unit => ({ orderId: order.id, itemId: unit.itemId, unit: unit.unit, planType: unit.plan, licenseKey: generateKey(unit.plan), email: order.email || '', createdAt: new Date().toISOString(), emailSent: false }));
        state.inventory.push(...records);
        return records;
    });
}
module.exports = { createStore, generateKey, fulfillPaidOrder, PLANS };
