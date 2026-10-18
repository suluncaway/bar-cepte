/**
 * scripts/shopier-webhook.js
 * 
 * Shopier Otomatik Lisans Teslimatı & API Servisi
 * Node.js ve PostgreSQL üzerinde çalışır.
 * 
 * Özellikler:
 * 1. Otomatik API Polling: Her 30 saniyede bir api.shopier.com/v1/orders adresini kontrol eder.
 * 2. Gelen siparişteki ürün ID'sine göre:
 *    - Aylık (51736039) -> RESERVE-MTH1-XXXX-YYYY üretir (30 Günlük)
 *    - Yıllık (51735632) -> RESERVE-ANN1-XXXX-YYYY üretir (365 Günlük)
 * 3. Webhook / Callback desteği: POST /webhook/shopier ile de anında tetiklenebilir.
 * 4. Yönetim Paneli: GET /licenses adresinden üretilen tüm kodlar izlenebilir.
 */

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const { timingSafeEqual } = require('crypto');
const { generateKey, checksum } = require('./generate-keys');

const PORT = process.env.PORT || 3000;
const RESEND_API_KEY = process.env.RESEND_API_KEY || '';

// Master geliştirici anahtarları
const MASTER_KEYS = new Set(['RESERVE-SULUNCA-2026', 'BARCEPTE-RESERVE-VIP']);

// Shopier Kişisel Erişim Anahtarı (Personal Access Token - PAT)
const SHOPIER_API_TOKEN = process.env.SHOPIER_API_TOKEN || '';
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || '';
const WEBHOOK_TOKEN = process.env.WEBHOOK_TOKEN || '';

// Shopier Ürün ID - Plan ve Para Birimi Eşleştirmesi (TRY, USD, EUR)
const PRODUCT_PLANS = {
    // Standart TRY Ürünleri
    '51736039': { plan: 'monthly', currency: 'TRY' }, // Aylık Plan (30 Gün)
    '51735632': { plan: 'annual', currency: 'TRY' },   // Yıllık Plan (365 Gün)

    // USD Ürünleri (Ortam Değişkenleri üzerinden dinamik atanabilir)
    ...(process.env.SHOPIER_USD_MONTHLY_ID ? { [process.env.SHOPIER_USD_MONTHLY_ID]: { plan: 'monthly', currency: 'USD' } } : {}),
    ...(process.env.SHOPIER_USD_ANNUAL_ID ? { [process.env.SHOPIER_USD_ANNUAL_ID]: { plan: 'annual', currency: 'USD' } } : {}),
    ...(process.env.SHOPIER_USD_LIFETIME_ID ? { [process.env.SHOPIER_USD_LIFETIME_ID]: { plan: 'lifetime', currency: 'USD' } } : {}),

    // EUR Ürünleri (Ortam Değişkenleri üzerinden dinamik atanabilir)
    ...(process.env.SHOPIER_EUR_MONTHLY_ID ? { [process.env.SHOPIER_EUR_MONTHLY_ID]: { plan: 'monthly', currency: 'EUR' } } : {}),
    ...(process.env.SHOPIER_EUR_ANNUAL_ID ? { [process.env.SHOPIER_EUR_ANNUAL_ID]: { plan: 'annual', currency: 'EUR' } } : {}),
    ...(process.env.SHOPIER_EUR_LIFETIME_ID ? { [process.env.SHOPIER_EUR_LIFETIME_ID]: { plan: 'lifetime', currency: 'EUR' } } : {})
};

const {createLicenseStore} = require('./license-store');
const licenseStore = createLicenseStore();
const {createGoogleVerifier} = require('./google-identity');
const {createAccountService} = require('./account-service');
const googleClientId=process.env.GOOGLE_CLIENT_ID || require('../firebase-config').googleClientId;
const accounts=createAccountService({store:licenseStore,verifyGoogle:createGoogleVerifier({clientId:googleClientId})});
const businesses=require('./business-service').createBusinessService({store:licenseStore,authenticate:accounts.authenticate});
const inFlightOrders = new Set();
const getSoldLicenses = () => licenseStore.getSold();
const getClaimedLicenses = () => licenseStore.getClaimed();
const saveSoldLicense = record => licenseStore.saveSold(record);
async function isOrderProcessed(orderId) {
    if (!orderId) return false;
    const id = String(orderId).trim();
    return inFlightOrders.has(id) || (await getSoldLicenses()).some(row => String(row.orderId).trim() === id);
}

function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function readJsonBody(req, maxBytes = 64 * 1024) {
    return new Promise((resolve, reject) => {
        const chunks=[];
        let bytes = 0;
        let tooLarge = false;

        req.on('data', chunk => {
            if(tooLarge)return;
            bytes += chunk.length;
            if (bytes > maxBytes) {
                tooLarge = true;
                return reject(new Error('Payload Too Large'));
            }
            chunks.push(chunk);
        });

        req.on('end', () => {
            if (tooLarge) return;
            try {
                const parsed = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
                if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('Invalid JSON object');
                resolve(parsed);
            } catch {
                reject(new Error('Invalid JSON'));
            }
        });

        req.on('error', err => reject(err));
    });
}

function verifyKeyChecksum(rawKey) {
    if (!rawKey || typeof rawKey !== 'string') return false;
    const cleanKey = rawKey.trim().toUpperCase();
    if (MASTER_KEYS.has(cleanKey)) return false;
    const parts = cleanKey.split('-');
    if (parts.length !== 4 || parts[0] !== 'RESERVE') return false;
    if (parts[1].length !== 4 || parts[2].length !== 4 || parts[3].length !== 4) return false;
    return checksum(parts[1] + parts[2]) === parts[3];
}

// Plan Türü ve Para Birimi Tespiti (ID veya Başlıktan)
function detectPlanAndCurrency(orderItem, order = {}) {
    const productId = String(orderItem.productId || orderItem.product_id || orderItem.id || '');
    if (PRODUCT_PLANS[productId]) {
        const conf = PRODUCT_PLANS[productId];
        return typeof conf === 'object' ? conf : { plan: conf, currency: 'TRY' };
    }

    const title = (orderItem.title || orderItem.name || '').toLowerCase();
    let plan = 'annual';
    if (title.includes('aylık') || title.includes('monthly') || title.includes('month') || title.includes('30 day')) plan = 'monthly';
    else if (title.includes('yıllık') || title.includes('annual') || title.includes('yearly') || title.includes('365 day')) plan = 'annual';
    else if (title.includes('ömür') || title.includes('lifetime') || title.includes('forever')) plan = 'lifetime';

    let currency = (order.currency || order.payment_currency || orderItem.currency || '').toUpperCase();
    if (!currency || currency === 'TRY' || currency === 'TL') {
        if (title.includes('$') || title.includes('usd') || title.includes('dollar')) currency = 'USD';
        else if (title.includes('€') || title.includes('eur') || title.includes('euro')) currency = 'EUR';
        else currency = 'TRY';
    }

    return { plan, currency };
}

function detectPlan(orderItem) {
    return detectPlanAndCurrency(orderItem).plan;
}

const {createShopierClient} = require('./shopier-client');
const {createFulfillmentService} = require('./order-fulfillment');
const shopier = createShopierClient({token:SHOPIER_API_TOKEN});
const fulfillment = createFulfillmentService({store:licenseStore,products:PRODUCT_PLANS,generateKey,sendEmail});
let polling = false;
async function processNewOrders() {
    if (polling || !SHOPIER_API_TOKEN) return;
    polling = true;
    try {
        for (const order of await shopier.listOrders()) await fulfillment.fulfill(order);
    } catch {console.error('Shopier order verification or delivery failed; no unverified order issued.');}
    finally {polling = false;}
}

async function sendEmail(toEmail, customerName, licenseKey, planName, currency = 'TRY', options = {}) {
    if (!RESEND_API_KEY) {
        console.warn('RESEND_API_KEY is not configured; delivery remains pending.');
        return false;
    }

    const isIntl = currency === 'USD' || currency === 'EUR' || /pocket bar/i.test(planName);
    const fromAddress = isIntl 
        ? (process.env.RESEND_FROM_EMAIL || 'Pocket Bar <lisans@barcepte.com.tr>')
        : (process.env.RESEND_FROM_EMAIL || 'Bar Cepte <lisans@barcepte.com.tr>');

    const subject = isIntl
        ? '🍸 Pocket Bar VIP — Your Single-Use Activation Key is Ready!'
        : '🍸 Bar Cepte VIP Aktivasyon Kodunuz Hazır!';

    const html = isIntl ? `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; background: #101b19; color: #ffffff; padding: 32px 24px; border-radius: 16px;">
                <h1 style="color: #d5b47b; font-size: 22px; margin-top: 0;">👑 Welcome to Pocket Bar Reserve Club!</h1>
                <p style="color: #cbd5e1; font-size: 14px; line-height: 1.6;">Hello <strong>${customerName || 'Valued Customer'}</strong>,</p>
                <p style="color: #cbd5e1; font-size: 14px; line-height: 1.6;">Your single-use activation key for <strong>${planName}</strong> purchased via Shopier has been generated:</p>
                
                <div style="background: #172922; border: 1px solid rgba(213,180,123,0.4); border-radius: 12px; padding: 18px; text-align: center; margin: 24px 0;">
                    <span style="font-size: 12px; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px; display: block; margin-bottom: 6px;">Your Activation Key:</span>
                    <strong style="font-size: 20px; font-family: monospace; color: #d5b47b; letter-spacing: 2px;">${licenseKey}</strong>
                </div>

                <div style="background: rgba(255,255,255,0.05); border-radius: 10px; padding: 14px 16px; font-size: 12px; color: #94a3b8; line-height: 1.6;">
                    <strong>How to Activate:</strong><br>
                    1. Open <a href="https://barcepte.com.tr" style="color: #d5b47b; text-decoration: underline;">Pocket Bar</a> on your device.<br>
                    2. Tap the <b>Reserve 👑</b> button in the top bar.<br>
                    3. Paste your code above and tap <b>Activate</b>.
                </div>

                <p style="color: #64748b; font-size: 11px; margin-top: 24px; text-align: center;">This key is single-use and permanently bound to your account. Enjoy your cocktails! 🍸</p>
            </div>
    ` : `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; background: #101b19; color: #ffffff; padding: 32px 24px; border-radius: 16px;">
                <h1 style="color: #d5b47b; font-size: 22px; margin-top: 0;">👑 Bar Cepte Reserve Kulübüne Hoş Geldiniz!</h1>
                <p style="color: #cbd5e1; font-size: 14px; line-height: 1.6;">Merhaba <strong>${customerName || 'Değerli Müşterimiz'}</strong>,</p>
                <p style="color: #cbd5e1; font-size: 14px; line-height: 1.6;">Shopier üzerinden satın aldığınız <strong>${planName}</strong> üyeliğiniz için tek kullanımlık aktivasyon kodunuz üretildi:</p>
                
                <div style="background: #172922; border: 1px solid rgba(213,180,123,0.4); border-radius: 12px; padding: 18px; text-align: center; margin: 24px 0;">
                    <span style="font-size: 12px; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px; display: block; margin-bottom: 6px;">Aktivasyon Kodunuz:</span>
                    <strong style="font-size: 20px; font-family: monospace; color: #d5b47b; letter-spacing: 2px;">${licenseKey}</strong>
                </div>

                <div style="background: rgba(255,255,255,0.05); border-radius: 10px; padding: 14px 16px; font-size: 12px; color: #94a3b8; line-height: 1.6;">
                    <strong>Nasıl Kullanılır?</strong><br>
                    1. <a href="https://barcepte.com.tr" style="color: #d5b47b; text-decoration: underline;">barcepte.com.tr</a> adresini açın.<br>
                    2. Profil veya VIP simgesine tıklayın.<br>
                    3. Yukarıdaki kodu yapıştırıp <b>Aktive Et</b> butonuna basın.
                </div>

                <p style="color: #64748b; font-size: 11px; margin-top: 24px; text-align: center;">Bu kod hesabınıza özeldir ve tek kullanımlıktır. Keyifli akşamlar dileriz! 🍸</p>
            </div>
    `;

    const payload = JSON.stringify({
        from: fromAddress,
        to: [toEmail],
        subject,
        html
    });

    return new Promise((resolve) => {
        const req = https.request({
            hostname: 'api.resend.com',
            port: 443,
            path: '/emails',
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${RESEND_API_KEY}`,
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(payload),
                ...(options.idempotencyKey ? {'Idempotency-Key': options.idempotencyKey} : {})
            }
        }, (res) => {
            let resBody = '';
            res.on('data', c => resBody += c);
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    console.log('License email accepted by provider.');
                    resolve(true);
                } else {
                    console.error('Email provider rejected delivery. HTTP ' + res.statusCode);
                    resolve(false);
                }
            });
        });
        req.setTimeout(15000, () => req.destroy(new Error('Email timeout')));
        req.on('error', (err) => {
            console.error('❌ [E-posta İstek Hatası]:', err);
            resolve(false);
        });
        req.write(payload);
        req.end();
    });
}

function tokenMatches(actual, expected) {
    if (!expected || typeof actual !== 'string') return false;
    const a = Buffer.from(actual);
    const b = Buffer.from(expected);
    return a.length === b.length && timingSafeEqual(a, b);
}

function authorizeAdmin(req) {
    const auth = req.headers.authorization || '';
    if (!auth.startsWith('Basic ')) return false;
    const credentials = Buffer.from(auth.slice(6), 'base64').toString('utf8');
    const separator = credentials.indexOf(':');
    return separator >= 0 && tokenMatches(credentials.slice(separator + 1), ADMIN_TOKEN);
}

async function handleRequest(req, res) {
    const origin=req.headers.origin;
    const allowedOrigins=new Set(['https://barcepte.com.tr','https://www.barcepte.com.tr','https://suluncaway.github.io','https://appassets.androidplatform.net']);
    let localOrigin=false;
    try {const parsed=new URL(origin);localOrigin=parsed.protocol==='http:' && ['localhost','127.0.0.1'].includes(parsed.hostname);}catch {}
    if(origin && !allowedOrigins.has(origin) && !localOrigin) {res.writeHead(403);res.end('Origin denied');return;}
    if(origin) {res.setHeader('Access-Control-Allow-Origin',origin);res.setHeader('Vary','Origin');}
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Cache-Control', 'no-store');

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    const requestPath = new URL(req.url, 'http://localhost').pathname;
    if(await accounts.handle(req,res,requestPath,readJsonBody)) return;
    if(await businesses.handle(req,res,requestPath,readJsonBody)) return;
    const adminPaths = ['/licenses', '/dashboard', '/api/resend-license', '/resend', '/api/export-licenses'];
    if (adminPaths.includes(requestPath) && !authorizeAdmin(req)) {
        res.writeHead(401, { 'WWW-Authenticate': 'Basic realm="Bar Cepte Admin", charset="UTF-8"' });
        return res.end('Unauthorized');
    }
    // Legacy GET requests must never send mail.
    if (requestPath === '/resend') {
        res.writeHead(405, { Allow: 'POST' });
        return res.end('Use POST /api/resend-license');
    }
    if (['/webhook/shopier', '/callback'].includes(requestPath) &&
        !tokenMatches(req.headers.authorization, WEBHOOK_TOKEN ? 'Bearer ' + WEBHOOK_TOKEN : '')) {
        res.writeHead(401);
        return res.end('Unauthorized');
    }

    if (req.method === 'GET' && requestPath === '/api/export-licenses') {
        const backup = await licenseStore.exportBackup();
        res.writeHead(200, {'Content-Type': 'application/json',
            'Content-Disposition': 'attachment; filename=bar-cepte-licenses.json'});
        res.end(JSON.stringify(backup));
        return;
    }

    // Sağlık Kontrolü
    if (req.method === 'GET' && (requestPath === '/' || requestPath === '/health')) {
        await licenseStore.ping();
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({
            status: 'ok',
            inventoryDataVersion: 1,
            businessDataVersion: 1,
            service: 'Bar Cepte Shopier Otomatik Lisans Servisi',
            apiConnected: !!SHOPIER_API_TOKEN,
            shopierStatus: shopier.state.status,
            shopierLastSuccess: shopier.state.lastSuccess,
            storage: licenseStore.kind,
            migrationRequired: licenseStore.kind === 'postgres' && process.env.LICENSE_MIGRATION_COMPLETE !== 'true',
            sender: 'lisans@barcepte.com.tr',
            autoPolling: licenseStore.kind !== 'postgres' || process.env.LICENSE_MIGRATION_COMPLETE === 'true',
            timestamp: new Date().toISOString()
        }));
        return;
    }

    // Tek Bir Siparişe Manuel Olarak Tekrar E-posta Gönderme Endpoint'i (Admin Onaylı)
    if (req.method === 'POST' && req.url === '/api/resend-license') {
        (async () => {
            try {
                let params;
                try {
                    params = await readJsonBody(req);
                } catch (jsonErr) {
                    const status = jsonErr.message === 'Payload Too Large' ? 413 : 400;
                    res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
                    return res.end(JSON.stringify({ success: false, reason: jsonErr.message }));
                }

                const orderId = String(params.orderId || '').trim();
                if (!orderId) {
                    res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
                    return res.end(JSON.stringify({ success: false, reason: 'orderId parametresi zorunludur.' }));
                }

                const sold = await getSoldLicenses();
                const record = sold.find(s => String(s.orderId).trim() === orderId);
                if (!record || !record.email || !record.licenseKey) {
                    res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
                    return res.end(JSON.stringify({ success: false, reason: 'Belirtilen sipariş ID için lisans kaydı bulunamadı.' }));
                }

                console.log(`✉️ [Manuel İstek] Sipariş #${orderId} için ${record.email} adresine e-posta tekrar gönderiliyor...`);
                const ok = await sendEmail(record.email, record.name, record.licenseKey, record.planTitle || record.planType, record.currency || 'TRY');
                if (ok) {
                    record.emailSent = true;
                    record.emailSentCount = (record.emailSentCount || 1) + 1;
                    record.lastEmailSentAt = new Date().toISOString();
                    await saveSoldLicense(record);
                    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
                    res.end(JSON.stringify({ success: true, message: `Aktivasyon kodu ${record.email} adresine başarıyla tekrar gönderildi.`, record }));
                } else {
                    res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
                    res.end(JSON.stringify({ success: false, reason: 'E-posta gönderimi başarısız oldu. API anahtarını kontrol edin.' }));
                }
            } catch (err) {
                res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({ success: false, reason: 'Sunucu hatası' }));
            }
        })();
        return;
    }

    if (licenseStore.kind === 'postgres' && process.env.LICENSE_MIGRATION_COMPLETE !== 'true' &&
        ['/api/claim-license', '/api/check-license', '/webhook/shopier', '/callback'].includes(requestPath)) {
        res.writeHead(503, {'Content-Type': 'application/json'});
        return res.end(JSON.stringify({success: false, reason: 'Lisans verileri aktarılıyor. Lütfen daha sonra tekrar deneyiniz.'}));
    }

    // Merkezi Lisans Kullanma / Mühürleme Endpoint'i (Single-Use Anti-Reuse Enforcement)
    if (req.method === 'POST' && req.url === '/api/claim-license') {
        (async () => {
            try {
                let params;
                try {
                    params = await readJsonBody(req);
                } catch (jsonErr) {
                    const status = jsonErr.message === 'Payload Too Large' ? 413 : 400;
                    res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
                    return res.end(JSON.stringify({ success: false, reason: jsonErr.message }));
                }

                const rawKey = typeof params.key === 'string' ? params.key : '';
                const verifiedUser=await accounts.authenticate(req);
                if((params.uid || req.headers.authorization) && !verifiedUser) {
                    res.writeHead(401,{'Content-Type':'application/json'});
                    return res.end(JSON.stringify({success:false,reason:'Google ile tekrar giriş yapınız.'}));
                }
                const uid=verifiedUser?verifiedUser.uid:null;
                const email=verifiedUser?verifiedUser.email:'';
                const deviceId=typeof params.deviceId==='string' && /^[a-zA-Z0-9_-]{8,200}$/.test(params.deviceId) && params.deviceId!=='dev_unknown'?params.deviceId:null;

                if (!rawKey || typeof rawKey !== 'string') {
                    res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
                    res.end(JSON.stringify({ success: false, reason: 'Lütfen bir aktivasyon kodu giriniz.' }));
                    return;
                }

                const cleanKey = rawKey.trim().toUpperCase();

                // 2. Format ve Checksum Kontrolü
                if (!verifyKeyChecksum(cleanKey)) {
                    res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
                    res.end(JSON.stringify({
                        success: false,
                        reason: '❌ Geçersiz aktivasyon kodu. Lütfen kontrol ediniz.'
                    }));
                    return;
                }

                if ((!uid || typeof uid !== 'string') && (!deviceId || typeof deviceId !== 'string')) {
                    res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
                    return res.end(JSON.stringify({success: false, reason: 'Kullanıcı veya cihaz kimliği gerekli.'}));
                }
                const proposedPlan = cleanKey.includes('-MTH1-') ? 'monthly' :
                    /-(ANN1|YIL1)-/.test(cleanKey) ? 'annual' : 'lifetime';
                const proposedDuration = proposedPlan === 'monthly' ? 30 * 86400000 : proposedPlan === 'annual' ? 365 * 86400000 : 0;
                const proposed = {key: cleanKey, plan: proposedPlan, duration: proposedDuration,
                    claimedAt: Date.now(), expiresAt: proposedDuration ? Date.now() + proposedDuration : 0,
                    uid, email, deviceId};
                const result = await licenseStore.claim(cleanKey, proposed);
                if (!result.issued) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    return res.end(JSON.stringify({success: false, reason: 'Bu lisans sunucu tarafından verilmemiş.'}));
                }
                const existing = result.existing;
                if (existing) {
                    const isOwner = !existing.needsReview && (existing.uid ? uid===existing.uid : Boolean(deviceId && existing.deviceId===deviceId));
                    if (!isOwner) {
                        res.writeHead(409, { 'Content-Type': 'application/json; charset=utf-8' });
                        res.end(JSON.stringify({
                            success: false,
                            reason: '❌ Bu lisans anahtarı daha önce başka bir kullanıcı/cihaz tarafından kullanılmış! Lisanslar tek kullanımlıktır.'
                        }));
                        return;
                    }

                    // Aynı kullanıcı/cihaz: Süre kontrolü
                    if (existing.expiresAt > 0 && Date.now() > existing.expiresAt) {
                        res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
                        res.end(JSON.stringify({
                            success: false,
                            reason: '❌ Bu lisans anahtarının kullanım süresi dolmuştur! Lütfen yeni bir lisans temin ediniz.'
                        }));
                        return;
                    }

                    // Aynı kullanıcı, aktif:
                    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
                    res.end(JSON.stringify({
                        success: true,
                        plan: existing.plan,
                        expiresAt: existing.expiresAt,
                        restored: true,
                        message: 'Aboneliğiniz bu cihazda doğrulandı.'
                    }));
                    return;
                }

                const {plan, expiresAt} = result.record;
                res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({
                    success: true,
                    plan,
                    expiresAt,
                    message: '🎉 Lisans anahtarınız başarıyla aktif edildi ve tek kullanımlık olarak mühürlendi!'
                }));
            } catch (err) {
                res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({ success: false, reason: 'Sunucu hatası oluştu.' }));
            }
        })();
        return;
    }

    // Merkezi Lisans Sorgulama Endpoint'i
    if (req.method === 'POST' && req.url === '/api/check-license') {
        (async () => {
            try {
                let params;
                try {
                    params = await readJsonBody(req);
                } catch (jsonErr) {
                    const status = jsonErr.message === 'Payload Too Large' ? 413 : 400;
                    res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
                    return res.end(JSON.stringify({ valid: false, reason: jsonErr.message }));
                }

                const rawKey = typeof params.key === 'string' ? params.key : '';
                const verifiedUser=await accounts.authenticate(req);
                if((params.uid || req.headers.authorization) && !verifiedUser) {
                    res.writeHead(401,{'Content-Type':'application/json'});
                    return res.end(JSON.stringify({valid:false,reason:'Google ile tekrar giriş yapınız.'}));
                }
                const uid=verifiedUser?verifiedUser.uid:null;
                const deviceId=typeof params.deviceId==='string' && /^[a-zA-Z0-9_-]{8,200}$/.test(params.deviceId) && params.deviceId!=='dev_unknown'?params.deviceId:null;
                const cleanKey = rawKey.trim().toUpperCase();

                const valid = verifyKeyChecksum(cleanKey);
                if (!valid) {
                    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
                    res.end(JSON.stringify({ valid: false, reason: 'Geçersiz kod' }));
                    return;
                }

                // A checksum detects typos; only keys in the issued sales registry may activate.
                if (!(await getSoldLicenses()).some(record => record.licenseKey === cleanKey)) {
                    res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
                    return res.end(JSON.stringify({ success: false, valid: false, reason: 'Bu lisans sunucu tarafından verilmemiş.' }));
                }
                if ((!uid || typeof uid !== 'string') && (!deviceId || typeof deviceId !== 'string')) {
                    res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
                    return res.end(JSON.stringify({ success: false, valid: false, reason: 'Kullanıcı veya cihaz kimliği gerekli.' }));
                }
                const claimed = await getClaimedLicenses();
                const existing = claimed[cleanKey];
                if (!existing) {
                    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
                    res.end(JSON.stringify({ valid: true, claimed: false }));
                    return;
                }

                const isOwner = !existing.needsReview && (existing.uid ? uid===existing.uid : Boolean(deviceId && existing.deviceId===deviceId));
                const expired = existing.expiresAt > 0 && Date.now() > existing.expiresAt;

                res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({
                    valid: true,
                    claimed: true,
                    isOwner,
                    expired,
                    plan: existing.plan,
                    expiresAt: existing.expiresAt
                }));
            } catch {
                res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({ valid: false, error: 'Hata' }));
            }
        })();
        return;
    }

    // Üretilen Lisansları İzleme Tablosu (Dashboard)
    if (req.method === 'GET' && (req.url === '/licenses' || req.url === '/dashboard')) {
        const sold = await getSoldLicenses();
        const claimed = await getClaimedLicenses();
        const claimedCount = Object.keys(claimed).length;

        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(`
            <!DOCTYPE html>
            <html lang="tr">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Bar Cepte — Lisans Yönetim Paneli</title>
                <style>
                    body { background: #101b19; color: #fff; font-family: -apple-system, sans-serif; padding: 24px; margin: 0; }
                    .container { max-width: 960px; margin: 0 auto; }
                    h1 { color: #d5b47b; font-size: 24px; margin-bottom: 6px; }
                    .stats { display: flex; gap: 16px; margin: 16px 0; }
                    .stat-box { background: #172922; border: 1px solid rgba(213,180,123,0.3); border-radius: 12px; padding: 12px 18px; flex: 1; }
                    .stat-val { font-size: 22px; font-weight: bold; color: #d5b47b; }
                    .stat-lbl { font-size: 11px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px; }
                    table { width: 100%; border-collapse: collapse; margin-top: 16px; background: #172922; border-radius: 12px; overflow: hidden; }
                    th, td { padding: 12px 16px; text-align: left; border-bottom: 1px solid rgba(255,255,255,0.06); font-size: 13px; }
                    th { background: #0d1715; color: #d5b47b; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; }
                    code { background: rgba(0,0,0,0.4); padding: 4px 8px; border-radius: 6px; color: #f59e0b; font-weight: bold; font-family: monospace; }
                    .badge { padding: 3px 8px; border-radius: 99px; font-size: 10px; font-weight: bold; background: rgba(213,180,123,0.2); color: #d5b47b; }
                    .badge-claimed { background: rgba(239,68,68,0.2); color: #f87171; border: 1px solid rgba(239,68,68,0.4); padding: 3px 8px; border-radius: 99px; font-size: 10px; font-weight: bold; }
                    .badge-available { background: rgba(34,197,94,0.2); color: #4ade80; border: 1px solid rgba(34,197,94,0.4); padding: 3px 8px; border-radius: 99px; font-size: 10px; font-weight: bold; }
                    .btn-action { display:inline-block; background: #d5b47b; color: #101b19; padding: 8px 16px; border-radius: 8px; font-weight: bold; font-size: 12px; text-decoration: none; margin-bottom: 12px; }
                    .btn-action:hover { background: #e2c899; }
                </style>
            </head>
            <body>
                <div class="container">
                    <h1>🍸 Bar Cepte — Lisans Yönetim Paneli</h1>
                    <p style="color: #94a3b8; font-size: 13px; margin-top:0;">Shopier API'den otomatik çekilen ve tek kullanımlık olarak mühürlenen kodlar:</p>
                    
                    <div class="stats">
                        <div class="stat-box">
                            <div class="stat-val">${sold.length}</div>
                            <div class="stat-lbl">Satılan Kodlar</div>
                        </div>
                        <div class="stat-box">
                            <div class="stat-val" style="color: #f87171;">${claimedCount}</div>
                            <div class="stat-lbl">Kullanılmış / Mühürlü</div>
                        </div>
                        <div class="stat-box">
                            <div class="stat-val" style="color: #4ade80;">${Math.max(0, sold.length - claimedCount)}</div>
                            <div class="stat-lbl">Kullanıma Hazır</div>
                        </div>
                    </div>

                    <div style="background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 8px; padding: 10px 14px; font-size: 12px; color: #a7f3d0; margin-bottom: 16px;">
                        🛡️ <b>Mükerrer E-posta Koruması Aktif:</b> Her müşteriye otomatik olarak yalnızca <b>1 adet</b> aktivasyon e-postası gider. İhtiyaç halinde aşağıdaki tablodan istediğiniz müşteriye özel olarak <b>"✉️ Tekrar Gönder"</b> butonuna basabilirsiniz.
                    </div>

                    <table>
                        <thead>
                            <tr>
                                <th>Sipariş ID</th>
                                <th>Alıcı</th>
                                <th>Plan</th>
                                <th>Para Birimi</th>
                                <th>Aktivasyon Kodu</th>
                                <th>Durum (Tek Kullanım)</th>
                                <th>E-posta Durumu</th>
                                <th>Tarih</th>
                                <th>İşlem</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${sold.length === 0 ? '<tr><td colspan="9" style="text-align:center; color:#64748b; padding:32px;">Henüz yeni sipariş yok. Shopier her 30 saniyede bir otomatik taranıyor.</td></tr>' : ''}
                            ${sold.slice().reverse().map(s => {
                                const isClaimed = !!claimed[s.licenseKey];
                                const claimInfo = claimed[s.licenseKey];
                                const curr = s.currency || 'TRY';
                                const currBadge = curr === 'USD' ? 'background:rgba(59,130,246,0.2); color:#60a5fa;' :
                                                  curr === 'EUR' ? 'background:rgba(168,85,247,0.2); color:#c084fc;' :
                                                  'background:rgba(213,180,123,0.2); color:#d5b47b;';
                                const emailStatus = s.emailSent 
                                    ? `<span style="color:#4ade80; font-weight:bold;">✓ İletildi (${s.emailSentCount || 1}x)</span>`
                                    : `<span style="color:#f87171;">Bekliyor</span>`;
                                return `
                                <tr>
                                    <td>#${escapeHtml(s.orderId)}</td>
                                    <td><strong>${escapeHtml(s.name)}</strong><br><small style="color:#64748b;">${escapeHtml(s.email)}</small></td>
                                    <td><span class="badge">${escapeHtml(s.planTitle || s.planType)}</span></td>
                                    <td><span class="badge" style="${currBadge}">${escapeHtml(curr)}</span></td>
                                    <td><code>${escapeHtml(s.licenseKey)}</code></td>
                                    <td>
                                        ${isClaimed 
                                            ? `<span class="badge-claimed">🔒 KULLANILDI (${new Date(claimInfo.claimedAt).toLocaleDateString('tr-TR')})</span>` 
                                            : `<span class="badge-available">✨ KULLANILMADI (BEKLİYOR)</span>`}
                                    </td>
                                    <td>${emailStatus}</td>
                                    <td style="color:#64748b; font-size:11px;">${new Date(s.createdAt).toLocaleString('tr-TR')}</td>
                                    <td>
                                        <button type="button" class="btn-resend" data-order-id="${escapeHtml(s.orderId)}" data-email="${escapeHtml(s.email)}" style="background:#d5b47b; color:#101b19; border:none; padding:4px 10px; border-radius:6px; font-size:11px; font-weight:bold; cursor:pointer;">✉️ Tekrar Gönder</button>
                                    </td>
                                </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>

                    <script>
                        document.addEventListener('click', async function(e) {
                            const btn = e.target.closest('.btn-resend');
                            if (!btn) return;
                            const orderId = btn.getAttribute('data-order-id');
                            const email = btn.getAttribute('data-email');
                            if (!confirm('#' + orderId + ' siparişi için ' + email + ' adresine aktivasyon e-postasını tekrar göndermek istiyor musunuz?')) return;
                            try {
                                const res = await fetch('/api/resend-license', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ orderId: orderId })
                                });
                                const data = await res.json();
                                if (data.success) {
                                    alert('✓ E-posta başarıyla ' + email + ' adresine iletildi!');
                                    location.reload();
                                } else {
                                    alert('Hata: ' + (data.reason || 'Gönderilemedi'));
                                }
                            } catch (err) {
                                alert('Bağlantı hatası: ' + err.message);
                            }
                        });
                    </script>
                </div>
            </body>
            </html>
        `);
        return;
    }

    // A callback is only a hint: all payment/product/customer fields come from Shopier itself.
    if (req.method === 'POST' && ['/webhook/shopier','/callback'].includes(requestPath)) {
        try {
            const params = await readJsonBody(req);
            const orderId = params.orderId || params.order_id || params.platform_order_id || params.data?.id;
            if (!orderId || !/^[a-zA-Z0-9_-]{1,100}$/.test(String(orderId))) {
                res.writeHead(400, {'Content-Type':'application/json'});
                return res.end(JSON.stringify({success:false,reason:'Order ID required'}));
            }
            const result = await fulfillment.fulfill(await shopier.getOrder(String(orderId)));
            const ok = ['delivered','already_processed','delivery_pending'].includes(result.status);
            res.writeHead(ok?200:422, {'Content-Type':'application/json'});
            return res.end(JSON.stringify({success:ok,status:result.status}));
        } catch {
            res.writeHead(503, {'Content-Type':'application/json'});
            return res.end(JSON.stringify({success:false,reason:'Order verification unavailable'}));
        }
    }

    function renderSuccessCard(licenseKey, email, isIntl) {
        const safeKey = escapeHtml(licenseKey);
        const safeEmail = escapeHtml(email);
        if (isIntl) {
            return `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <title>Congratulations! Pocket Bar VIP Key Ready</title>
                <style>
                    body { background:#101b19; color:#fff; font-family:-apple-system,sans-serif; display:flex; align-items:center; justify-content:center; min-height:100vh; margin:0; padding:16px; }
                    .card { background:#172922; border:1px solid rgba(213,180,123,0.3); border-radius:24px; padding:32px 24px; max-width:440px; width:100%; text-align:center; }
                    .key-box { background:#0a1311; border:1px dashed #d5b47b; border-radius:12px; padding:16px; font-family:monospace; font-size:18px; font-weight:bold; color:#d5b47b; margin:20px 0; }
                    .btn { display:inline-block; background:#d5b47b; color:#101b19; padding:12px 24px; border-radius:12px; text-decoration:none; font-weight:bold; font-size:13px; margin-top:12px; }
                </style>
            </head>
            <body>
                <div class="card">
                    <div style="font-size:48px; margin-bottom:12px;">🍸👑</div>
                    <h2 style="color:#d5b47b; margin:0 0 8px;">Your VIP Key is Ready!</h2>
                    <p style="font-size:13px; color:#cbd5e1; margin:0 0 16px;">Order confirmed. You can activate your key below in Pocket Bar:</p>
                    <div class="key-box">${safeKey}</div>
                    <p style="font-size:11px; color:#94a3b8; margin:0 0 20px;">The key has also been emailed to <b>${safeEmail || 'your email'}</b>.</p>
                    <a href="https://barcepte.com.tr" class="btn">Return to Pocket Bar & Activate ➔</a>
                </div>
            </body>
            </html>
            `;
        }
        return `
        <!DOCTYPE html>
        <html lang="tr">
        <head>
            <meta charset="UTF-8">
            <title>Tebrikler! Bar Cepte Lisansınız Hazır</title>
            <style>
                body { background:#101b19; color:#fff; font-family:-apple-system,sans-serif; display:flex; align-items:center; justify-content:center; min-height:100vh; margin:0; padding:16px; }
                .card { background:#172922; border:1px solid rgba(213,180,123,0.3); border-radius:24px; padding:32px 24px; max-width:440px; width:100%; text-align:center; }
                .key-box { background:#0a1311; border:1px dashed #d5b47b; border-radius:12px; padding:16px; font-family:monospace; font-size:18px; font-weight:bold; color:#d5b47b; margin:20px 0; }
                .btn { display:inline-block; background:#d5b47b; color:#101b19; padding:12px 24px; border-radius:12px; text-decoration:none; font-weight:bold; font-size:13px; margin-top:12px; }
            </style>
        </head>
        <body>
            <div class="card">
                <div style="font-size:48px; margin-bottom:12px;">🍸👑</div>
                <h2 style="color:#d5b47b; margin:0 0 8px;">Aktivasyon Kodunuz Hazır!</h2>
                <p style="font-size:13px; color:#cbd5e1; margin:0 0 16px;">Siparişiniz onaylandı. Aşağıdaki kodu Bar Cepte uygulamasında aktive edebilirsiniz:</p>
                <div class="key-box">${safeKey}</div>
                <p style="font-size:11px; color:#94a3b8; margin:0 0 20px;">Kod ayrıca <b>${safeEmail || 'e-posta adresinize'}</b> gönderilmiştir.</p>
                <a href="https://barcepte.com.tr" class="btn">Bar Cepte'ye Dön ve Aktive Et ➔</a>
            </div>
        </body>
        </html>
        `;
    }

    res.writeHead(404);
    res.end('Bulunamadı');
}
const server = http.createServer((req, res) => {
    handleRequest(req, res).catch(() => {
        if (!res.headersSent) res.writeHead(503, {'Content-Type': 'application/json'});
        res.end(JSON.stringify({success: false, reason: 'Veritabanına ulaşılamıyor. Tekrar deneyiniz.'}));
    });
});


if (require.main === module) {
    licenseStore.ready().then(() => server.listen(PORT, () => {
        console.log(`🍸 Bar Cepte Shopier API & Webhook Servisi Çalışıyor (Port: ${PORT})`);
        console.log(licenseStore.kind === 'postgres' && process.env.LICENSE_MIGRATION_COMPLETE !== 'true'
            ? 'Migration confirmation required; polling and activation paused.'
            : 'Shopier polling enabled (30s).');
        console.log(`📊 Yönetim Paneli: http://localhost:${PORT}/licenses`);
        const {runEmailSmokeTest,getEmailSmokeStatus}=require('./email-smoke');
        runEmailSmokeTest().then(receipt=>{
            if(receipt.status!=='accepted')return;
            console.log('Email smoke test accepted: '+receipt.id);
            for(const delay of [30000,90000])setTimeout(()=>getEmailSmokeStatus(receipt.id)
                .then(status=>console.log('Email smoke delivery status: '+status))
                .catch(()=>console.error('Email smoke delivery status unavailable.')),delay);
        }).catch(()=>console.error('Email smoke test failed; check Resend configuration.'));
        if (licenseStore.kind !== 'postgres' || process.env.LICENSE_MIGRATION_COMPLETE === 'true') {
            setInterval(processNewOrders, 30000);
            setTimeout(processNewOrders, 2000);
        }
    })).catch(() => {console.error('Database initialization failed; service not started.'); process.exitCode = 1;});
}

module.exports = {
    server,
    licenseStore,
    detectPlanAndCurrency,
    detectPlan,
    generateKey,
    verifyKeyChecksum,
    escapeHtml,
    readJsonBody
};
