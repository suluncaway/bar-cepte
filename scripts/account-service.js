'use strict';
const {randomBytes,createHash}=require('node:crypto');
const security=require('../security');
const hash=token=>createHash('sha256').update(token).digest('hex');
const SESSION_MS=30*86400000;
function createAccountService({store,verifyGoogle,clock=Date.now}) {
    async function authenticate(req) {
        const header=req.headers.authorization||'';
        if(!/^Bearer [a-f0-9]{64}$/.test(header)) return null;
        const session=await store.getSession(hash(header.slice(7)));
        return session && session.expiresAt>clock()?session.user:null;
    }
    async function subscription(user) {return user?store.getSubscription(user.uid,clock()):null;}
    function json(res,status,value) {res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(value));}
    async function handle(req,res,path,readBody) {
        if(!['/api/auth/google','/api/auth/logout','/api/account','/api/account/backup'].includes(path))return false;
        try {
            if(path==='/api/auth/google' && req.method==='POST') {
                const body=await readBody(req);
                let user;
                try {user=await verifyGoogle(body.credential);}catch{return json(res,401,{success:false,reason:'Google kimliği doğrulanamadı.'}),true;}
                const token=randomBytes(32).toString('hex');
                await store.putSession(hash(token),{user,expiresAt:clock()+SESSION_MS});
                json(res,200,{success:true,token,user,subscription:await subscription(user)});return true;
            }
            const user=await authenticate(req);
            if(!user){json(res,401,{success:false,reason:'Google ile tekrar giriş yapınız.'});return true;}
            if(path==='/api/auth/logout' && req.method==='POST') {
                await store.revokeSession(hash(req.headers.authorization.slice(7)));
                json(res,200,{success:true});return true;
            }
            if(path==='/api/account' && req.method==='GET') {
                json(res,200,{success:true,user,subscription:await subscription(user)});return true;
            }
            if(path==='/api/account/backup' && req.method==='GET') {
                const backup=await store.getBackup(user.uid);
                json(res,200,{success:true,backup,subscription:await subscription(user)});return true;
            }
            if(path==='/api/account/backup' && req.method==='PUT') {
                const body=await readBody(req,security.MAX_BACKUP_LENGTH);
                if(!Number.isSafeInteger(body.revision) || body.revision<0) {json(res,400,{success:false,reason:'Geçersiz yedek sürümü.'});return true;}
                let data;try {data=security.backup(body.data);}catch {json(res,400,{success:false,reason:'Geçersiz yedek verisi.'});return true;}
                const backup=await store.saveBackup(user.uid,data,body.revision,clock());
                if(!backup){json(res,409,{success:false,reason:'Başka cihazda daha yeni yedek var. Önce buluttan geri yükleyiniz.'});return true;}
                json(res,200,{success:true,revision:backup.revision,updatedAt:backup.updatedAt});return true;
            }
            json(res,405,{success:false,reason:'Method not allowed'});return true;
        } catch(error) {
            const status=/Payload Too Large/.test(error.message)?413:/Invalid JSON/.test(error.message)?400:503;
            json(res,status,{success:false,reason:status===503?'Hesap servisine ulaşılamıyor.': 'Geçersiz istek.'});return true;
        }
    }
    return {authenticate,subscription,handle};
}
module.exports={createAccountService};
