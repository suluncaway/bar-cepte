'use strict';
// In-memory request limits. Addresses live only in process memory and are pruned;
// they are never written to storage or logs.

// Render appends the real client address last; earlier X-Forwarded-For entries are client-controlled.
function clientIp(req) {
    const forwarded = String(req.headers['x-forwarded-for'] || '').split(',').pop().trim();
    return forwarded || req.socket?.remoteAddress || 'unknown';
}

// Fixed-window counter per key plus one shared (global) counter.
function createWindowLimiter({windowMs, perKey, global = Infinity, now = Date.now}) {
    const rows = new Map();
    let shared = {startedAt: now(), count: 0};
    function prune(time) {
        if (rows.size <= 5000) return;
        for (const [key, row] of rows) if (time - row.startedAt >= windowMs) rows.delete(key);
    }
    return {
        // Returns {ok:true} or {ok:false, scope:'ip'|'global', retryAfter:seconds}.
        take(key) {
            const time = now();
            if (time - shared.startedAt >= windowMs) shared = {startedAt: time, count: 0};
            const row = rows.get(key) || {startedAt: time, count: 0};
            if (time - row.startedAt >= windowMs) {row.startedAt = time; row.count = 0;}
            if (row.count >= perKey) return {ok: false, scope: 'ip', retryAfter: Math.ceil((row.startedAt + windowMs - time) / 1000)};
            if (shared.count >= global) return {ok: false, scope: 'global', retryAfter: Math.ceil((shared.startedAt + windowMs - time) / 1000)};
            row.count++; shared.count++;
            rows.set(key, row); prune(time);
            return {ok: true};
        }
    };
}

// Exponential lockout after repeated failed attempts (wrong/unknown keys) from one address:
// the first `free` failures cost nothing, then each failure doubles the wait up to `maxMs`.
function createFailureBackoff({free = 5, baseMs = 2000, maxMs = 15 * 60 * 1000, forgetMs = 24 * 60 * 60 * 1000, now = Date.now}) {
    const rows = new Map();
    return {
        check(key) {
            const row = rows.get(key);
            if (!row) return {ok: true};
            const time = now();
            if (time - row.lastAt >= forgetMs) {rows.delete(key); return {ok: true};}
            return row.lockedUntil > time ? {ok: false, retryAfter: Math.ceil((row.lockedUntil - time) / 1000)} : {ok: true};
        },
        fail(key) {
            const time = now();
            const row = rows.get(key) || {count: 0, lockedUntil: 0, lastAt: time};
            if (time - row.lastAt >= forgetMs) row.count = 0;
            row.count++; row.lastAt = time;
            if (row.count > free) row.lockedUntil = time + Math.min(maxMs, baseMs * 2 ** (row.count - free - 1));
            rows.set(key, row);
            if (rows.size > 5000) for (const [k, r] of rows) if (time - r.lastAt >= forgetMs) rows.delete(k);
        },
        succeed(key) {rows.delete(key);}
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

module.exports = {clientIp, createWindowLimiter, createFailureBackoff, createDailyCap, positiveInt};
