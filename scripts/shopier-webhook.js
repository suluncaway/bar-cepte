/**
 * scripts/shopier-webhook.js
 * 
 * Shopier Otomatik Lisans Teslimatı & API Servisi
 * Sıfır harici bağımlılık (Pure Node.js) ile çalışır.
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
const { generateKey, checksum } = require('./generate-keys');

const PORT = process.env.PORT || 3000;
const RESEND_API_KEY = process.env.RESEND_API_KEY || '';

// Master geliştirici anahtarları
const MASTER_KEYS = new Set(['RESERVE-SULUNCA-2026', 'BARCEPTE-RESERVE-VIP']);

// Shopier Kişisel Erişim Anahtarı (Personal Access Token - PAT)
const SHOPIER_API_TOKEN = process.env.SHOPIER_API_TOKEN ||
    'eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJhdWQiOiI4Y2M3YTM5OTdhNjU2MjI2NTA0Mzk2ZmQ2MjFjYTgwMyIsImp0aSI6ImEwOGViOTNjMWM0NzBkMmMzZDEwY2EyY2JkODE0MzEzYmRhODZjOWNkMGM2ZTU0YWM3YzVjMjdjMTcyN2E2YmE3NDI0NDg1ZjRiMjVlNzYxZDkxMTEzNWQ3M2FiYTk3NmJlNmRmZTExNDEyMTRhOTYxZjJiYTVmMzVmYTA5ZGI2ODczZDBmMTgwZDg0OWIwMDI5ODY3N2ZlODdmMWJjOGUiLCJpYXQiOjE3OTE3NTI1MDUsIm5iZiI6MTc5MTc1MjUwNSwiZXhwIjoxOTQ5NTM3MjY1LCJzdWIiOjE2NDg0Miwic2NvcGVzIjpbIm9yZGVyczpyZWFkIiwib3JkZXJzOndyaXRlIiwicHJvZHVjdHM6cmVhZCIsInByb2R1Y3RzOndyaXRlIiwic2hpcHBpbmdzOnJlYWQiLCJzaGlwcGluZ3M6d3JpdGUiLCJkaXNjb3VudHM6cmVhZCIsImRpc2NvdW50czp3cml0ZSIsInBheW91dHM6cmVhZCIsInJlZnVuZHM6cmVhZCIsInJlZnVuZHM6d3JpdGUiLCJzaG9wOnJlYWQiLCJzaG9wOndyaXRlIl19.U8SkJYgOFjjFRC2bDkcb0FNqCDL9LlqH80IXtea9dfl9CR_WatC3fVDyK8X0-SPpkMW1yVtckr3akMjDy55SCMe3vKEb3BVQxqEmf3RD4Yskos_ToS1fxeO_ABcJlbyDtrrV85AL0howwdDrsvwT2hXplkOPXi1yo2ZDJ0v7nRhJiR7znVR4fWmIcyaEt_rjLm7_uZ5UE0QX40HqGcrpzHrMONy_DCrrFCIt6xiqjd5NNFTVIWzTBdd8XBAW651-Wr8A2M0ElVb9j1-WaHSR_KC3_avfsHpFS3iMzpvbwex6p05V7W7kOoAFRt4VLM7Ot0HUZ8kgI8-ZDvsGieyaOg';

// Shopier Ürün ID - Plan Eşleştirmesi
const PRODUCT_PLANS = {
    '51736039': 'monthly', // Aylık Plan (30 Gün)
    '51735632': 'annual'   // Yıllık Plan (365 Gün)
};

const LOG_FILE = path.resolve(__dirname, '..', 'keys', 'sold_licenses.json');
const CLAIMED_FILE = path.resolve(__dirname, '..', 'keys', 'claimed_licenses.json');

function getSoldLicenses() {
    try {
        if (!fs.existsSync(LOG_FILE)) return [];
        return JSON.parse(fs.readFileSync(LOG_FILE, 'utf8') || '[]');
    } catch {
        return [];
    }
}

function saveSoldLicense(record) {
    try {
        const dir = path.dirname(LOG_FILE);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        const list = getSoldLicenses();
        list.push(record);
        fs.writeFileSync(LOG_FILE, JSON.stringify(list, null, 2), 'utf8');
    } catch (err) {
        console.error('Lisans kayıt hatası:', err);
    }
}

// Daha önceden kullanılmış / teslim edilmiş bilinen kodların merkezi veritabanı
const PRE_CLAIMED_KEYS = {
    'RESERVE-MTH1-FXSU-42E5': {
        key: 'RESERVE-MTH1-FXSU-42E5',
        plan: 'monthly',
        claimedAt: 1791754613000,
        expiresAt: 1794346613000,
        uid: 'claimed_shopier_order_991899363',
        email: 'sulunca@gmail.com',
        deviceId: 'dev_shopier_order_991899363'
    },
    'RESERVE-MTH1-432C-C25B': {
        key: 'RESERVE-MTH1-432C-C25B',
        plan: 'monthly',
        claimedAt: 1791700000000,
        expiresAt: 1794292000000,
        uid: 'claimed_sample_doc_mth',
        email: 'sample@barcepte.com.tr',
        deviceId: 'dev_sample_doc_mth'
    },
    'RESERVE-ANN1-6VLZ-0025': {
        key: 'RESERVE-ANN1-6VLZ-0025',
        plan: 'annual',
        claimedAt: 1791700000000,
        expiresAt: 1823236000000,
        uid: 'claimed_sample_doc_ann',
        email: 'sample@barcepte.com.tr',
        deviceId: 'dev_sample_doc_ann'
    }
};

function getClaimedLicenses() {
    try {
        let fileData = {};
        if (fs.existsSync(CLAIMED_FILE)) {
            fileData = JSON.parse(fs.readFileSync(CLAIMED_FILE, 'utf8') || '{}');
        }
        return { ...PRE_CLAIMED_KEYS, ...fileData };
    } catch {
        return { ...PRE_CLAIMED_KEYS };
    }
}

function saveClaimedLicense(key, claimData) {
    try {
        const dir = path.dirname(CLAIMED_FILE);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        const all = getClaimedLicenses();
        all[key] = claimData;
        fs.writeFileSync(CLAIMED_FILE, JSON.stringify(all, null, 2), 'utf8');
        return true;
    } catch (err) {
        console.error('Kullanılan lisans kayıt hatası:', err);
        return false;
    }
}

function verifyKeyChecksum(rawKey) {
    if (!rawKey || typeof rawKey !== 'string') return false;
    const cleanKey = rawKey.trim().toUpperCase();
    if (MASTER_KEYS.has(cleanKey)) return true;
    const parts = cleanKey.split('-');
    if (parts.length !== 4 || parts[0] !== 'RESERVE') return false;
    if (parts[1].length !== 4 || parts[2].length !== 4 || parts[3].length !== 4) return false;
    return checksum(parts[1] + parts[2]) === parts[3];
}

// Plan Türünü Tespiti (ID veya Başlıktan)
function detectPlan(orderItem) {
    const productId = String(orderItem.productId || orderItem.product_id || orderItem.id || '');
    if (PRODUCT_PLANS[productId]) return PRODUCT_PLANS[productId];

    const title = (orderItem.title || orderItem.name || '').toLowerCase();
    if (title.includes('aylık') || title.includes('monthly')) return 'monthly';
    if (title.includes('yıllık') || title.includes('annual')) return 'annual';
    if (title.includes('ömür') || title.includes('lifetime')) return 'lifetime';
    return 'annual'; // Varsayılan yıllık
}

// Shopier API Siparişlerini Çekme
function fetchShopierOrders() {
    return new Promise((resolve) => {
        if (!SHOPIER_API_TOKEN) return resolve([]);

        const req = https.request({
            hostname: 'api.shopier.com',
            port: 443,
            path: '/v1/orders',
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${SHOPIER_API_TOKEN}`,
                'Accept': 'application/json'
            }
        }, (res) => {
            let data = '';
            res.on('data', chunk => { data += chunk; });
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    try {
                        const parsed = JSON.parse(data);
                        resolve(Array.isArray(parsed) ? parsed : (parsed.data || []));
                    } catch {
                        resolve([]);
                    }
                } else {
                    resolve([]);
                }
            });
        });
        req.on('error', () => resolve([]));
        req.end();
    });
}

// Siparişleri Otomatik İşle
async function processNewOrders() {
    try {
        const orders = await fetchShopierOrders();
        if (!orders || !orders.length) return;

        const sold = getSoldLicenses();
        const processedOrderIds = new Set(sold.map(s => String(s.orderId)));

        for (const order of orders) {
            const orderId = String(order.id || order.order_id || '');
            if (!orderId || processedOrderIds.has(orderId)) continue;

            // Sadece ödenmiş (paid) siparişleri işle
            if (order.paymentStatus && order.paymentStatus !== 'paid') continue;

            // Siparişteki ürünleri incele
            const items = order.lineItems || order.items || order.products || [order];
            for (const item of items) {
                const planType = detectPlan(item);
                const licenseKey = generateKey(planType);
                const planTitle = planType === 'monthly' ? 'Aylık VIP (30 Gün)' :
                                 planType === 'annual' ? 'Yıllık VIP (365 Gün)' : 'Ömür Boyu VIP';

                const customerEmail = (order.shippingInfo && order.shippingInfo.email) || order.buyer_email || order.email || '';
                const customerName = (order.shippingInfo && order.shippingInfo.firstName)
                    ? `${order.shippingInfo.firstName} ${order.shippingInfo.lastName || ''}`.trim()
                    : (order.buyer_name || order.customer_name || 'Barmen Dostumuz');
                const customerPhone = (order.shippingInfo && order.shippingInfo.phone) || '';

                const record = {
                    orderId,
                    email: customerEmail,
                    phone: customerPhone,
                    name: customerName,
                    planType,
                    planTitle,
                    licenseKey,
                    createdAt: new Date().toISOString()
                };

                saveSoldLicense(record);
                processedOrderIds.add(orderId);

                console.log(`\n🎉 [YENİ SİPARİŞ] #${orderId} | ${customerName} (${customerEmail}) [${customerPhone}]`);
                console.log(`🔑 [ÜRETİLEN KOD] [${planTitle}]: ${licenseKey}\n`);

                if (customerEmail) {
                    await sendEmail(customerEmail, customerName, licenseKey, planTitle);
                }
            }
        }
    } catch (err) {
        console.error('Otomatik sipariş kontrol hatası:', err);
    }
}

// Her 30 saniyede bir Shopier'ı otomatik kontrol et
setInterval(processNewOrders, 30000);
// Başlangıçta hemen bir kez kontrol et
setTimeout(processNewOrders, 2000);

async function sendEmail(toEmail, customerName, licenseKey, planName) {
    if (!RESEND_API_KEY) {
        console.log(`⚠️ [E-posta Gönderilemedi] Render'da RESEND_API_KEY tanımlanmamış! Kod konsola kaydedildi: ${licenseKey} -> Alıcı: ${toEmail}`);
        return false;
    }

    const fromAddress = process.env.RESEND_FROM_EMAIL || 'Bar Cepte <lisans@barcepte.com.tr>';
    const payload = JSON.stringify({
        from: fromAddress,
        to: [toEmail],
        subject: '🍸 Bar Cepte VIP Aktivasyon Kodunuz Hazır!',
        html: `
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
        `
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
                'Content-Length': Buffer.byteLength(payload)
            }
        }, (res) => {
            let resBody = '';
            res.on('data', c => resBody += c);
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    console.log(`✉️ [E-posta Başarılı] ${toEmail} adresine aktivasyon kodu gönderildi!`);
                    resolve(true);
                } else {
                    console.error(`❌ [E-posta Hatası] Resend API Yanıtı (${res.statusCode}):`, resBody);
                    resolve(false);
                }
            });
        });
        req.on('error', (err) => {
            console.error('❌ [E-posta İstek Hatası]:', err);
            resolve(false);
        });
        req.write(payload);
        req.end();
    });
}

const server = http.createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    // Sağlık Kontrolü
    if (req.method === 'GET' && (req.url === '/' || req.url === '/health')) {
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({
            status: 'ok',
            service: 'Bar Cepte Shopier Otomatik Lisans Servisi',
            apiConnected: !!SHOPIER_API_TOKEN,
            sender: 'lisans@barcepte.com.tr',
            autoPolling: 'Her 30 saniyede bir aktif',
            timestamp: new Date().toISOString()
        }));
        return;
    }

    // Geçmiş Siparişlere Tekrar E-posta Gönderme Endpoint'i
    if (req.method === 'GET' && req.url.startsWith('/resend')) {
        (async () => {
            const sold = getSoldLicenses();
            let sentCount = 0;
            for (const s of sold) {
                if (s.email && s.licenseKey) {
                    const ok = await sendEmail(s.email, s.name, s.licenseKey, s.planTitle || s.planType);
                    if (ok) sentCount++;
                }
            }
            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end(`
                <body style="background:#101b19; color:#fff; font-family:sans-serif; text-align:center; padding:40px;">
                    <h2 style="color:#d5b47b;">✉️ Gönderim Tamamlandı!</h2>
                    <p>${sentCount} adet müşteriye lisans@barcepte.com.tr üzerinden e-posta gönderildi.</p>
                    <a href="/licenses" style="color:#d5b47b;">Panele Dön ➔</a>
                </body>
            `);
        })();
        return;
    }

    // Merkezi Lisans Kullanma / Mühürleme Endpoint'i (Single-Use Anti-Reuse Enforcement)
    if (req.method === 'POST' && req.url === '/api/claim-license') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', () => {
            try {
                const params = JSON.parse(body || '{}');
                const rawKey = params.key || '';
                const uid = params.uid || null;
                const email = params.email || '';
                const deviceId = params.deviceId || null;

                if (!rawKey || typeof rawKey !== 'string') {
                    res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
                    res.end(JSON.stringify({ success: false, reason: 'Lütfen bir aktivasyon kodu giriniz.' }));
                    return;
                }

                const cleanKey = rawKey.trim().toUpperCase();

                // 1. Master Key Kontrolü
                if (MASTER_KEYS.has(cleanKey)) {
                    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
                    res.end(JSON.stringify({
                        success: true,
                        plan: 'lifetime',
                        expiresAt: 0,
                        isMaster: true,
                        message: '👑 Master geliştirici anahtarı onaylandı.'
                    }));
                    return;
                }

                // 2. Format ve Checksum Kontrolü
                if (!verifyKeyChecksum(cleanKey)) {
                    res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
                    res.end(JSON.stringify({
                        success: false,
                        reason: '❌ Geçersiz aktivasyon kodu. Lütfen kontrol ediniz.'
                    }));
                    return;
                }

                const claimed = getClaimedLicenses();
                const existing = claimed[cleanKey];

                if (existing) {
                    const isOwner = (uid && existing.uid === uid) || (deviceId && existing.deviceId === deviceId);
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

                // 3. Yeni Lisans Kullanımı
                let plan = 'lifetime';
                if (cleanKey.includes('-MTH1-')) plan = 'monthly';
                else if (cleanKey.includes('-ANN1-') || cleanKey.includes('-YIL1-')) plan = 'annual';

                let duration = 0;
                if (plan === 'monthly') duration = 30 * 24 * 60 * 60 * 1000;
                else if (plan === 'annual') duration = 365 * 24 * 60 * 60 * 1000;
                const expiresAt = duration > 0 ? (Date.now() + duration) : 0;

                const claimRecord = {
                    key: cleanKey,
                    plan,
                    duration,
                    claimedAt: Date.now(),
                    expiresAt,
                    uid: uid || null,
                    email: email || '',
                    deviceId: deviceId || null
                };

                saveClaimedLicense(cleanKey, claimRecord);
                console.log(`🔒 [LİSANS MERKEZİNDE MÜHÜRLENDİ] ${cleanKey} [${plan}] -> ${email || uid || deviceId || 'Misafir'}`);

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
        });
        return;
    }

    // Merkezi Lisans Sorgulama Endpoint'i
    if (req.method === 'POST' && req.url === '/api/check-license') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', () => {
            try {
                const params = JSON.parse(body || '{}');
                const rawKey = params.key || '';
                const uid = params.uid || null;
                const deviceId = params.deviceId || null;
                const cleanKey = rawKey.trim().toUpperCase();

                const valid = verifyKeyChecksum(cleanKey);
                if (!valid) {
                    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
                    res.end(JSON.stringify({ valid: false, reason: 'Geçersiz kod' }));
                    return;
                }

                const claimed = getClaimedLicenses();
                const existing = claimed[cleanKey];
                if (!existing) {
                    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
                    res.end(JSON.stringify({ valid: true, claimed: false }));
                    return;
                }

                const isOwner = (uid && existing.uid === uid) || (deviceId && existing.deviceId === deviceId);
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
        });
        return;
    }

    // Üretilen Lisansları İzleme Tablosu (Dashboard)
    if (req.method === 'GET' && (req.url === '/licenses' || req.url === '/dashboard')) {
        const sold = getSoldLicenses();
        const claimed = getClaimedLicenses();
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

                    <a href="/resend" class="btn-action">✉️ Tüm Müşterilere Tekrar E-posta Gönder</a>
                    <table>
                        <thead>
                            <tr>
                                <th>Sipariş ID</th>
                                <th>Alıcı</th>
                                <th>Plan</th>
                                <th>Aktivasyon Kodu</th>
                                <th>Durum (Tek Kullanım)</th>
                                <th>Tarih</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${sold.length === 0 ? '<tr><td colspan="6" style="text-align:center; color:#64748b; padding:32px;">Henüz yeni sipariş yok. Shopier her 30 saniyede bir otomatik taranıyor.</td></tr>' : ''}
                            ${sold.slice().reverse().map(s => {
                                const isClaimed = !!claimed[s.licenseKey];
                                const claimInfo = claimed[s.licenseKey];
                                return `
                                <tr>
                                    <td>#${s.orderId}</td>
                                    <td><strong>${s.name}</strong><br><small style="color:#64748b;">${s.email}</small></td>
                                    <td><span class="badge">${s.planTitle || s.planType}</span></td>
                                    <td><code>${s.licenseKey}</code></td>
                                    <td>
                                        ${isClaimed 
                                            ? `<span class="badge-claimed">🔒 KULLANILDI (${new Date(claimInfo.claimedAt).toLocaleDateString('tr-TR')})</span>` 
                                            : `<span class="badge-available">✨ KULLANILMADI (BEKLİYOR)</span>`}
                                    </td>
                                    <td style="color:#64748b; font-size:11px;">${new Date(s.createdAt).toLocaleString('tr-TR')}</td>
                                </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
            </body>
            </html>
        `);
        return;
    }

    // Shopier Webhook / Callback Uç Noktası
    if (req.method === 'POST' && (req.url === '/webhook/shopier' || req.url === '/callback')) {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', async () => {
            try {
                let params = {};
                if (req.headers['content-type'] && req.headers['content-type'].includes('application/json')) {
                    params = JSON.parse(body || '{}');
                } else {
                    const parsed = new URLSearchParams(body);
                    for (const [key, value] of parsed.entries()) params[key] = value;
                }

                const productId = params.product_id || params.productId || '';
                const orderId = params.platform_order_id || params.order_id || params.orderId || `ORD-${Date.now()}`;
                const email = params.buyer_email || params.email || '';
                const name = params.buyer_name || params.name || 'Barmen Dostumuz';

                let planType = detectPlan({ product_id: productId, title: params.product_name || params.title });
                const licenseKey = generateKey(planType);
                const planTitle = planType === 'monthly' ? 'Aylık VIP (30 Gün)' : 'Yıllık VIP (365 Gün)';

                const record = {
                    orderId,
                    email,
                    name,
                    planType,
                    planTitle,
                    licenseKey,
                    createdAt: new Date().toISOString()
                };
                saveSoldLicense(record);

                console.log(`✅ [Webhook] Sipariş #${orderId}: [${licenseKey}] -> ${email}`);

                if (email) await sendEmail(email, name, licenseKey, planTitle);

                res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
                res.end(`
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
                            <div class="key-box">${licenseKey}</div>
                            <p style="font-size:11px; color:#94a3b8; margin:0 0 20px;">Kod ayrıca <b>${email || 'e-posta adresinize'}</b> gönderilmiştir.</p>
                            <a href="https://barcepte.com.tr" class="btn">Bar Cepte'ye Dön ve Aktive Et ➔</a>
                        </div>
                    </body>
                    </html>
                `);
            } catch (err) {
                console.error('Webhook hatası:', err);
                res.writeHead(500);
                res.end('Hata');
            }
        });
        return;
    }

    res.writeHead(404);
    res.end('Bulunamadı');
});

server.listen(PORT, () => {
    console.log(`🍸 Bar Cepte Shopier API & Webhook Servisi Çalışıyor (Port: ${PORT})`);
    console.log(`🔄 Shopier API Polling: Aktif (Her 30 saniyede bir yeni siparişler taranıyor)`);
    console.log(`📊 Yönetim Paneli: http://localhost:${PORT}/licenses`);
});
