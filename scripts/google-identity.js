'use strict';
const {createPublicKey, verify} = require('node:crypto');
const {requestJson} = require('./shopier-client');
function createGoogleVerifier({clientId, fetchKeys = () => requestJson('https://www.googleapis.com/oauth2/v3/certs'), clock = Date.now}) {
    let cached, expires=0, pending;
    async function keys() {
        if (cached && clock()<expires) return cached;
        if (!pending) pending=Promise.resolve().then(fetchKeys).then(result=>{
            if (!Array.isArray(result.keys)) throw new Error('Google signing keys unavailable');
            cached=result.keys; expires=clock()+3600000;return cached;
        }).finally(()=>{pending=null;});
        return pending;
    }
    return async token => {
        if (!clientId || typeof token!=='string' || token.length>16000) throw new Error('Invalid Google identity');
        const parts=token.split('.');
        if(parts.length!==3 || parts.some(p=>!p || !/^[a-zA-Z0-9_-]+$/.test(p))) throw new Error('Invalid Google identity');
        let header,payload;
        try {header=JSON.parse(Buffer.from(parts[0],'base64url'));payload=JSON.parse(Buffer.from(parts[1],'base64url'));}
        catch {throw new Error('Invalid Google identity');}
        const now=Math.floor(clock()/1000);
        if(header.alg!=='RS256' || typeof header.kid!=='string' ||
            !['accounts.google.com','https://accounts.google.com'].includes(payload.iss) || payload.aud!==clientId ||
            typeof payload.sub!=='string' || !payload.sub || payload.sub.length>128 ||
            !Number.isFinite(payload.exp) || payload.exp<=now || !Number.isFinite(payload.iat) || payload.iat>now+60 ||
            (payload.nbf!==undefined && (!Number.isFinite(payload.nbf) || payload.nbf>now+60)) ||
            (payload.azp!==undefined && payload.azp!==clientId) || payload.email_verified!==true ||
            typeof payload.email!=='string' || payload.email.length>254) throw new Error('Invalid Google identity');
        const jwk=(await keys()).find(k=>k.kid===header.kid && k.kty==='RSA' && (!k.alg || k.alg==='RS256'));
        if(!jwk) {expires=0;throw new Error('Unknown Google signing key');}
        const key=createPublicKey({key:jwk,format:'jwk'});
        if(!verify('RSA-SHA256',Buffer.from(parts[0]+'.'+parts[1]),key,Buffer.from(parts[2],'base64url'))) throw new Error('Invalid Google signature');
        return {uid:'google_'+payload.sub,email:payload.email,name:String(payload.name||payload.email).slice(0,100),
            picture:typeof payload.picture==='string'?payload.picture:'',provider:'google'};
    };
}
module.exports={createGoogleVerifier};
