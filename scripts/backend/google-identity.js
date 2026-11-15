'use strict';
const crypto = require('node:crypto');
function createGoogleVerifier({ audience, fetchImpl = globalThis.fetch, now = Date.now } = {}) {
    let cached = null;
    let expires = 0;
    return async function verify(token) {
        if (!audience) throw new Error('Google identity not configured');
        if (typeof token !== 'string' || token.length > 12000) throw new Error('Invalid identity token');
        const parts = token.split('.');
        if (parts.length !== 3) throw new Error('Invalid identity token');
        const header = JSON.parse(Buffer.from(parts[0], 'base64url').toString());
        const claims = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
        if (header.alg !== 'RS256' || typeof header.kid !== 'string') throw new Error('Invalid identity algorithm');
        if (!cached || expires <= now()) {
            const response = await fetchImpl('https://www.googleapis.com/oauth2/v3/certs', { signal: AbortSignal.timeout(5000), redirect: 'error' });
            if (!response.ok) throw new Error('Google verification unavailable');
            const text = await response.text();
            if (text.length > 65536) throw new Error('Invalid Google certificates');
            cached = JSON.parse(text).keys;
            if (!Array.isArray(cached)) throw new Error('Invalid Google certificates');
            expires = now() + 300000;
        }
        const jwk = cached.find(key => key.kid === header.kid && key.kty === 'RSA');
        if (!jwk || !crypto.verify('RSA-SHA256', Buffer.from(`${parts[0]}.${parts[1]}`), crypto.createPublicKey({ key: jwk, format: 'jwk' }), Buffer.from(parts[2], 'base64url'))) throw new Error('Invalid identity signature');
        const seconds = now() / 1000;
        if (!['accounts.google.com', 'https://accounts.google.com'].includes(claims.iss) || claims.aud !== audience ||
            (claims.azp && claims.azp !== audience) || typeof claims.sub !== 'string' || !claims.sub || claims.sub.length > 255 ||
            !Number.isFinite(claims.exp) || claims.exp <= seconds || !Number.isFinite(claims.iat) || claims.iat > seconds + 60 ||
            (claims.nbf !== undefined && (!Number.isFinite(claims.nbf) || claims.nbf > seconds))) throw new Error('Invalid identity claims');
        return { uid: claims.sub, email: claims.email_verified === true && typeof claims.email === 'string' ? claims.email : '' };
    };
}
module.exports = { createGoogleVerifier };
