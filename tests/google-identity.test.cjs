const test=require('node:test');const assert=require('node:assert/strict');
const {generateKeyPairSync,sign}=require('node:crypto');
const {createGoogleVerifier}=require('../scripts/google-identity');
const pair=generateKeyPairSync('rsa',{modulusLength:2048});
const jwk={...pair.publicKey.export({format:'jwk'}),kid:'qa',alg:'RS256'};
const now=1792022400000;const seconds=now/1000;
function token(changes={},header={alg:'RS256',kid:'qa'},key=pair.privateKey) {
 const body={iss:'https://accounts.google.com',aud:'test-client',sub:'alice',email:'alice@example.invalid',email_verified:true,iat:seconds-20,exp:seconds+3600,...changes};
 const input=Buffer.from(JSON.stringify(header)).toString('base64url')+'.'+Buffer.from(JSON.stringify(body)).toString('base64url');
 return input+'.'+sign('RSA-SHA256',Buffer.from(input),key).toString('base64url');
}
test('Google server verification accepts a genuine signature and binds the configured audience',async()=>{
 const verify=createGoogleVerifier({clientId:'test-client',fetchKeys:async()=>({keys:[jwk]}),clock:()=>now});
 assert.equal((await verify(token())).uid,'google_alice');
 for(const change of [{aud:'attacker-client'},{iss:'attacker'},{exp:seconds-1},{iat:seconds+120},{email_verified:false},{sub:''}])await assert.rejects(verify(token(change)));
 await assert.rejects(verify(token({},{alg:'none',kid:'qa'})));
 const other=generateKeyPairSync('rsa',{modulusLength:2048});
 await assert.rejects(verify(token({},undefined,other.privateKey)));
});
module.exports={token,jwk,now};
