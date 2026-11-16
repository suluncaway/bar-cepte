'use strict';
// In-memory request limits. Addresses live only in process memory; they are never written to
// storage or logs. Every limiter removes expired rows on a timer (and opportunistically while in
// use), keeps a fixed-size row per address and holds at most `maxKeys` addresses (oldest dropped).
const net = require('node:net');

const SWEEP_MS = 5 * 60 * 1000;
const DEFAULT_MAX_KEYS = 100000;

function nonNegativeInt(value, fallback) {
    if (value === undefined || value === null || String(value).trim() === '') return fallback;
    const n = Number(value);
    return Number.isSafeInteger(n) && n >= 0 ? n : fallback;
}

// Number of reverse proxies in front of the server that append to X-Forwarded-For.
// 1 (default): Render's edge appends the real client address as the last entry.
// 0: X-Forwarded-For is ignored and the TCP peer address is used.
function trustProxyHops(env = process.env) {
    return Math.min(nonNegativeInt(env.TRUST_PROXY_HOPS, 1), 10);
}

// Expands an IPv6 address (no zone id) to 8 hextets, or returns null.
function ipv6Hextets(address) {
    let text = address;
    let tail = [];
    const lastColon = text.lastIndexOf(':');
    const maybeV4 = text.slice(lastColon + 1);
    if (net.isIPv4(maybeV4)) {
        const o = maybeV4.split('.').map(Number);
        tail = [((o[0] << 8) | o[1]).toString(16), ((o[2] << 8) | o[3]).toString(16)];
        text = text.slice(0, lastColon + 1) + '0:0';
    }
    const halves = text.split('::');
    if (halves.length > 2) return null;
    const head = halves[0] ? halves[0].split(':') : [];
    const rest = halves.length === 2 && halves[1] ? halves[1].split(':') : [];
    const missing = 8 - head.length - rest.length;
    if (halves.length === 1 ? missing !== 0 : missing < 0) return null;
    const hextets = [...head, ...Array(halves.length === 2 ? missing : 0).fill('0'), ...rest].map(h => parseInt(h, 16));
    if (hextets.length !== 8 || hextets.some(h => !Number.isInteger(h) || h < 0 || h > 0xffff)) return null;
    if (tail.length) {hextets[6] = parseInt(tail[0], 16); hextets[7] = parseInt(tail[1], 16);}
    return hextets;
}

// Normalises an address to the rate-limit bucket: IPv4 as-is, IPv4-mapped IPv6 as IPv4,
// other IPv6 addresses by their /64 prefix (one subscriber usually owns a whole /64).
function addressBucket(raw) {
    const address = String(raw || '').trim().replace(/^\[|\]$/g, '').replace(/%.*$/, '');
    if (net.isIPv4(address)) return address;
    if (!net.isIPv6(address)) return null;
    const h = ipv6Hextets(address);
    if (!h) return null;
    if (h.slice(0, 5).every(x => x === 0) && h[5] === 0xffff) {
        return [h[6] >> 8, h[6] & 255, h[7] >> 8, h[7] & 255].join('.');
    }
    return h.slice(0, 4).map(x => x.toString(16)).join(':') + '::/64';
}

// Client address bucket. With `hops` trusted proxies, the client is the hops-th X-Forwarded-For
// entry from the right (each proxy appends the address it received the request from); entries
// further left are client-controlled and ignored.
function clientIp(req, hops = trustProxyHops()) {
    if (hops > 0) {
        const entries = String(req.headers['x-forwarded-for'] || '').split(',').map(s => s.trim()).filter(Boolean);
        if (entries.length) {
            const bucket = addressBucket(entries[Math.max(0, entries.length - hops)]);
            if (bucket) return bucket;
        }
    }
    return addressBucket(req.socket?.remoteAddress) || 'unknown';
}

// Shared housekeeping: a Map kept in "oldest first" order (rows are re-inserted when their
// timestamp moves forward), swept from the front until the first live row.
function createRowTable({maxKeys = DEFAULT_MAX_KEYS, sweepMs = SWEEP_MS, now, isExpired}) {
    const rows = new Map();
    let lastSweep = now();
    function sweep(time = now()) {
        lastSweep = time;
        for (const [key, row] of rows) {
            if (!isExpired(row, time)) break;
            rows.delete(key);
        }
    }
    const timer = setInterval(() => sweep(), sweepMs);
    if (typeof timer.unref === 'function') timer.unref();
    return {
        rows,
        get(key) {return rows.get(key);},
        // Moves the row to the newest end; drops the oldest rows beyond the hard cap.
        touch(key, row) {
            rows.delete(key); rows.set(key, row);
            while (rows.size > maxKeys) rows.delete(rows.keys().next().value);
        },
        delete(key) {rows.delete(key);},
        maybeSweep(time) {if (time - lastSweep >= sweepMs) sweep(time);},
        sweep,
        stop() {clearInterval(timer);},
        get size() {return rows.size;}
    };
}

// Fixed-window counter per key plus one shared (global) counter. Rows are deleted once their
// window has ended (within `sweepMs`).
function createWindowLimiter({windowMs, perKey, global = Infinity, now = Date.now, maxKeys, sweepMs}) {
    const table = createRowTable({maxKeys, sweepMs, now, isExpired: (row, time) => time - row.startedAt >= windowMs});
    let shared = {startedAt: now(), count: 0};
    return {
        // Returns {ok:true} or {ok:false, scope:'ip'|'global', retryAfter:seconds}.
        take(key) {
            const time = now();
            table.maybeSweep(time);
            if (time - shared.startedAt >= windowMs) shared = {startedAt: time, count: 0};
            let row = table.get(key);
            if (!row || time - row.startedAt >= windowMs) {row = {startedAt: time, count: 0}; table.touch(key, row);}
            if (row.count >= perKey) return {ok: false, scope: 'ip', retryAfter: Math.ceil((row.startedAt + windowMs - time) / 1000)};
            if (shared.count >= global) return {ok: false, scope: 'global', retryAfter: Math.ceil((shared.startedAt + windowMs - time) / 1000)};
            row.count++; shared.count++;
            return {ok: true};
        },
        sweep: time => table.sweep(time),
        stop: () => table.stop(),
        get size() {return table.size;}
    };
}

// Exponential lockout after repeated failed attempts (wrong/unknown keys) from one address:
// the first `free` failures in a `windowMs` budget window (default: the whole retention period) cost nothing, then each failure doubles
// the wait up to `maxMs`. A success never clears the lockout; it forgives at most one failure per
// budget window, so interleaving one's own valid key does not buy further guesses. Rows are deleted
// `forgetMs` after the last failure (default just under 24 h; see privacy.html).
function createFailureBackoff({free = 5, baseMs = 2000, maxMs = 15 * 60 * 1000, forgetMs = 23.5 * 60 * 60 * 1000,
    windowMs = forgetMs, now = Date.now, maxKeys, sweepMs}) {
    const table = createRowTable({maxKeys, sweepMs, now, isExpired: (row, time) => time - row.lastAt >= forgetMs});
    function live(key, time) {
        const row = table.get(key);
        if (!row) return null;
        if (time - row.lastAt >= forgetMs) {table.delete(key); return null;}
        return row;
    }
    return {
        check(key) {
            const time = now();
            table.maybeSweep(time);
            const row = live(key, time);
            if (!row) return {ok: true};
            return row.lockedUntil > time ? {ok: false, retryAfter: Math.ceil((row.lockedUntil - time) / 1000)} : {ok: true};
        },
        fail(key) {
            const time = now();
            table.maybeSweep(time);
            const row = live(key, time) || {count: 0, lockedUntil: 0, lastAt: time, windowStart: time, forgiven: false};
            if (time - row.windowStart >= windowMs && row.lockedUntil <= time) {
                row.windowStart = time; row.count = 0; row.forgiven = false;
            }
            row.count++; row.lastAt = time;
            if (row.count > free) row.lockedUntil = Math.max(row.lockedUntil, time + Math.min(maxMs, baseMs * 2 ** (row.count - free - 1)));
            table.touch(key, row);
        },
        succeed(key) {
            const row = live(key, now());
            if (row && row.count > 0 && !row.forgiven) {row.count--; row.forgiven = true;}
        },
        sweep: time => table.sweep(time),
        stop: () => table.stop(),
        get size() {return table.size;}
    };
}

// Daily cap on total requests (e.g. paid AI calls); resets at UTC midnight.
function createDailyCap({limit, now = Date.now}) {
    let day = '', count = 0;
    return {
        take() {
            const today = new Date(now()).toISOString().slice(0, 10);
            if (today !== day) {day = today; count = 0;}
            if (count >= limit) return false;
            count++; return true;
        }
    };
}

function positiveInt(value, fallback) {
    const n = Number(value);
    return Number.isSafeInteger(n) && n > 0 ? n : fallback;
}

module.exports = {clientIp, addressBucket, trustProxyHops, createWindowLimiter, createFailureBackoff, createDailyCap,
    positiveInt, nonNegativeInt, SWEEP_MS, DEFAULT_MAX_KEYS};
