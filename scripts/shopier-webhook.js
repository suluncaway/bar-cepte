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

const LOG_FILE = path.resolve(__dirname, '..', 'keys', 'sold_licenses.json');
const CLAIMED_FILE = path.resolve(__dirname, '..', 'keys', 'claimed_licenses.json');

// Sunucu yeniden başlatılsa bile kalıcı bilinen satış kayıtları (Ephemeral Storage Koruması)
const SEED_SOLD_LICENSES = [
    {
        orderId: "991899363",
        email: "sulunca@gmail.com",
        phone: "",
        name: "Alperen Sulunc",
        planType: "monthly",
        planTitle: "Aylık VIP (30 Gün)",
        currency: "TRY",
        licenseKey: "RESERVE-MTH1-FXSU-42E5",
        createdAt: "2026-10-11T21:36:53.000Z",
        emailSent: true,
        emailSentCount: 1,
        lastEmailSentAt: "2026-10-11T21:36:53.000Z"
    }
];

// Eşzamanlı isteklerde mükerrer üretimi önleyen kilit kümesi
const inFlightOrders = new Set();

function getSoldLicenses() {
    try {
        let fileList = [];
        if (fs.existsSync(LOG_FILE)) {
            fileList = JSON.parse(fs.readFileSync(LOG_FILE, 'utf8') || '[]');
        }
        const orderMap = new Map();
        for (const s of SEED_SOLD_LICENSES) {
            orderMap.set(String(s.orderId).trim(), s);
        }
        for (const f of fileList) {
            orderMap.set(String(f.orderId).trim(), f);
        }
        return Array.from(orderMap.values());
    } catch {
        return [...SEED_SOLD_LICENSES];
    }
}

function saveSoldLicense(record) {
    try {
        const dir = path.dirname(LOG_FILE);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        const list = getSoldLicenses();
        const recOrderId = String(record.orderId).trim();
        const index = list.findIndex(s => String(s.orderId).trim() === recOrderId);
        if (index >= 0) {
            list[index] = { ...list[index], ...record };
        } else {
            list.push(record);
        }
        fs.writeFileSync(LOG_FILE, JSON.stringify(list, null, 2), 'utf8');
    } catch (err) {
        console.error('Lisans kayıt hatası:', err);
    }
}

function isOrderProcessed(orderId) {
    if (!orderId) return false;
    const sId = String(orderId).trim();
    if (inFlightOrders.has(sId)) return true;
    const list = getSoldLicenses();
    return list.some(s => String(s.orderId).trim() === sId);
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

        for (const order of orders) {
            const orderId = String(order.id || order.order_id || '').trim();
            if (!orderId) continue;

            // Kesin Mükerrer Sipariş Kontrolü (Deduplication)
            if (isOrderProcessed(orderId)) continue;

            // Sadece ödenmiş (paid) siparişleri işle
            if (order.paymentStatus && order.paymentStatus !== 'paid') continue;

            inFlightOrders.add(orderId);
            try {
                // Siparişteki ürünleri incele
                const items = order.lineItems || order.items || order.products || [order];
                for (const item of items) {
                    const { plan: planType, currency } = detectPlanAndCurrency(item, order);
                    const licenseKey = generateKey(planType);
                    const isIntl = currency === 'USD' || currency === 'EUR';
                    const planTitle = isIntl
                        ? (planType === 'monthly' ? `Monthly VIP (30 Days - ${currency})` :
                           planType === 'annual' ? `Annual VIP (365 Days - ${currency})` : `Lifetime VIP (${currency})`)
                        : (planType === 'monthly' ? 'Aylık VIP (30 Gün)' :
                           planType === 'annual' ? 'Yıllık VIP (365 Gün)' : 'Ömür Boyu VIP');

                    const customerEmail = (order.shippingInfo && order.shippingInfo.email) || order.buyer_email || order.email || '';
                    const customerName = (order.shippingInfo && order.shippingInfo.firstName)
                        ? `${order.shippingInfo.firstName} ${order.shippingInfo.lastName || ''}`.trim()
                        : (order.buyer_name || order.customer_name || (isIntl ? 'Valued Customer' : 'Barmen Dostumuz'));
                    const customerPhone = (order.shippingInfo && order.shippingInfo.phone) || '';

                    const record = {
                        orderId,
                        email: customerEmail,
                        phone: customerPhone,
                        name: customerName,
                        planType,
                        planTitle,
                        currency,
                        licenseKey,
                        createdAt: new Date().toISOString(),
                        emailSent: false,
                        emailSentCount: 0,
                        lastEmailSentAt: null
                    };

                    console.log(`\n🎉 [YENİ SİPARİŞ - ${currency}] #${orderId} | ${customerName} (${customerEmail}) [${customerPhone}]`);
                    console.log(`🔑 [ÜRETİLEN KOD] [${planTitle}]: ${licenseKey}\n`);

                    if (customerEmail) {
                        const emailOk = await sendEmail(customerEmail, customerName, licenseKey, planTitle, currency);
                        if (emailOk) {
                            record.emailSent = true;
                            record.emailSentCount = 1;
                            record.lastEmailSentAt = new Date().toISOString();
                        }
                    }

                    saveSoldLicense(record);
                }
            } finally {
                inFlightOrders.delete(orderId);
            }
        }
    } catch (err) {
        console.error('Otomatik sipariş kontrol hatası:', err);
    }
}

// Her 30 saniyede bir Shopier'ı otomatik kontrol et (doğrudan çalıştırıldığında)
if (require.main === module) {
    setInterval(processNewOrders, 30000);
    setTimeout(processNewOrders, 2000);
}

async function sendEmail(toEmail, customerName, licenseKey, planName, currency = 'TRY') {
    if (!RESEND_API_KEY) {
        console.log(`⚠️ [E-posta Gönderilemedi] Render'da RESEND_API_KEY tanımlanmamış! Kod konsola kaydedildi: ${licenseKey} -> Alıcı: ${toEmail}`);
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

    // Tek Bir Siparişe Manuel Olarak Tekrar E-posta Gönderme Endpoint'i (Admin Onaylı)
    if (req.method === 'POST' && req.url === '/api/resend-license') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', async () => {
            try {
                const params = JSON.parse(body || '{}');
                const orderId = String(params.orderId || '').trim();
                if (!orderId) {
                    res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
                    return res.end(JSON.stringify({ success: false, reason: 'orderId parametresi zorunludur.' }));
                }

                const sold = getSoldLicenses();
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
                    saveSoldLicense(record);
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
        });
        return;
    }

    // Geçmiş Siparişe Tekrar E-posta Gönderme (GET /resend?orderId=XXX)
    if (req.method === 'GET' && req.url.startsWith('/resend')) {
        const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
        const orderId = parsedUrl.searchParams.get('orderId');
        if (!orderId) {
            res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
            return res.end(`
                <body style="background:#101b19; color:#fff; font-family:sans-serif; text-align:center; padding:40px;">
                    <h2 style="color:#f87171;">⚠️ Toplu E-posta Gönderimi Devre Dışı Bırakıldı</h2>
                    <p style="color:#cbd5e1;">Müşterilere birden fazla mükerrer e-posta gitmesini önlemek amacıyla toplu gönderim kaldırılmıştır.</p>
                    <p style="color:#cbd5e1;">Tek bir siparişe tekrar kod göndermek için lütfen <a href="/licenses" style="color:#d5b47b; font-weight:bold;">Yönetim Paneli</a> üzerinden ilgili siparişin yanındaki <b>"✉️ Tekrar Gönder"</b> butonunu kullanın.</p>
                    <a href="/licenses" style="display:inline-block; margin-top:16px; background:#d5b47b; color:#101b19; padding:10px 20px; border-radius:8px; text-decoration:none; font-weight:bold;">Panele Dön ➔</a>
                </body>
            `);
        }

        (async () => {
            const sold = getSoldLicenses();
            const record = sold.find(s => String(s.orderId).trim() === String(orderId).trim());
            if (!record || !record.email || !record.licenseKey) {
                res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
                return res.end(`
                    <body style="background:#101b19; color:#fff; font-family:sans-serif; text-align:center; padding:40px;">
                        <h2 style="color:#f87171;">Sipariş Bulunamadı</h2>
                        <p>#${orderId} numaralı sipariş kayıtlarımızda yok.</p>
                        <a href="/licenses" style="color:#d5b47b;">Panele Dön ➔</a>
                    </body>
                `);
            }

            const ok = await sendEmail(record.email, record.name, record.licenseKey, record.planTitle || record.planType, record.currency || 'TRY');
            if (ok) {
                record.emailSent = true;
                record.emailSentCount = (record.emailSentCount || 1) + 1;
                record.lastEmailSentAt = new Date().toISOString();
                saveSoldLicense(record);
            }

            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end(`
                <body style="background:#101b19; color:#fff; font-family:sans-serif; text-align:center; padding:40px;">
                    <h2 style="color:#d5b47b;">✉️ Gönderim Tamamlandı!</h2>
                    <p>#${orderId} siparişi için <b>${record.email}</b> adresine aktivasyon kodu iletildi.</p>
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
                                    <td>#${s.orderId}</td>
                                    <td><strong>${s.name}</strong><br><small style="color:#64748b;">${s.email}</small></td>
                                    <td><span class="badge">${s.planTitle || s.planType}</span></td>
                                    <td><span class="badge" style="${currBadge}">${curr}</span></td>
                                    <td><code>${s.licenseKey}</code></td>
                                    <td>
                                        ${isClaimed 
                                            ? `<span class="badge-claimed">🔒 KULLANILDI (${new Date(claimInfo.claimedAt).toLocaleDateString('tr-TR')})</span>` 
                                            : `<span class="badge-available">✨ KULLANILMADI (BEKLİYOR)</span>`}
                                    </td>
                                    <td>${emailStatus}</td>
                                    <td style="color:#64748b; font-size:11px;">${new Date(s.createdAt).toLocaleString('tr-TR')}</td>
                                    <td>
                                        <button type="button" onclick="resendOne('${s.orderId}', '${s.email}')" style="background:#d5b47b; color:#101b19; border:none; padding:4px 10px; border-radius:6px; font-size:11px; font-weight:bold; cursor:pointer;">✉️ Tekrar Gönder</button>
                                    </td>
                                </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>

                    <script>
                        async function resendOne(orderId, email) {
                            if (!confirm('#' + orderId + ' siparişi için ' + email + ' adresine aktivasyon e-postasını tekrar göndermek istiyor musunuz?')) return;
                            try {
                                const res = await fetch('/api/resend-license', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ orderId })
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
                        }
                    </script>
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
                const orderId = String(params.platform_order_id || params.order_id || params.orderId || `ORD-${Date.now()}`).trim();
                const email = params.buyer_email || params.email || '';
                const name = params.buyer_name || params.name || '';

                const { plan: planType, currency } = detectPlanAndCurrency({ product_id: productId, title: params.product_name || params.title }, params);
                const isIntl = currency === 'USD' || currency === 'EUR';

                // 1. Zaten İşlenmiş Sipariş Kontrolü (Idempotency - Asla Tekrar E-posta Atma!)
                const existing = getSoldLicenses().find(s => String(s.orderId).trim() === orderId);
                if (existing) {
                    console.log(`ℹ️ [Webhook Mükerrer Koruma] Sipariş #${orderId} daha önce işlenmiş. Tekrar e-posta atılmadı, ekrana mevcut kod verildi.`);
                    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
                    return res.end(renderSuccessCard(existing.licenseKey, existing.email, isIntl));
                }

                if (inFlightOrders.has(orderId)) {
                    console.log(`⏳ [Webhook Kilit] Sipariş #${orderId} şu anda işleniyor.`);
                    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
                    return res.end('Siparişiniz işleniyor...');
                }

                inFlightOrders.add(orderId);
                let licenseKey = '';
                try {
                    licenseKey = generateKey(planType);
                    const customerName = name || (isIntl ? 'Valued Customer' : 'Barmen Dostumuz');
                    const planTitle = isIntl
                        ? (planType === 'monthly' ? `Monthly VIP (30 Days - ${currency})` :
                           planType === 'annual' ? `Annual VIP (365 Days - ${currency})` : `Lifetime VIP (${currency})`)
                        : (planType === 'monthly' ? 'Aylık VIP (30 Gün)' :
                           planType === 'annual' ? 'Yıllık VIP (365 Gün)' : 'Ömür Boyu VIP');

                    const record = {
                        orderId,
                        email,
                        name: customerName,
                        planType,
                        planTitle,
                        currency,
                        licenseKey,
                        createdAt: new Date().toISOString(),
                        emailSent: false,
                        emailSentCount: 0,
                        lastEmailSentAt: null
                    };

                    console.log(`✅ [Webhook - ${currency}] Sipariş #${orderId}: [${licenseKey}] -> ${email}`);

                    if (email) {
                        const emailOk = await sendEmail(email, customerName, licenseKey, planTitle, currency);
                        if (emailOk) {
                            record.emailSent = true;
                            record.emailSentCount = 1;
                            record.lastEmailSentAt = new Date().toISOString();
                        }
                    }

                    saveSoldLicense(record);

                    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
                    res.end(renderSuccessCard(licenseKey, email, isIntl));
                } finally {
                    inFlightOrders.delete(orderId);
                }
            } catch (err) {
                console.error('Webhook hatası:', err);
                res.writeHead(500);
                res.end('Hata');
            }
        });
        return;
    }

    function renderSuccessCard(licenseKey, email, isIntl) {
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
                    <div class="key-box">${licenseKey}</div>
                    <p style="font-size:11px; color:#94a3b8; margin:0 0 20px;">The key has also been emailed to <b>${email || 'your email'}</b>.</p>
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
                <div class="key-box">${licenseKey}</div>
                <p style="font-size:11px; color:#94a3b8; margin:0 0 20px;">Kod ayrıca <b>${email || 'e-posta adresinize'}</b> gönderilmiştir.</p>
                <a href="https://barcepte.com.tr" class="btn">Bar Cepte'ye Dön ve Aktive Et ➔</a>
            </div>
        </body>
        </html>
        `;
    }

    res.writeHead(404);
    res.end('Bulunamadı');
});

if (require.main === module) {
    server.listen(PORT, () => {
        console.log(`🍸 Bar Cepte Shopier API & Webhook Servisi Çalışıyor (Port: ${PORT})`);
        console.log(`🔄 Shopier API Polling: Aktif (Her 30 saniyede bir yeni siparişler taranıyor)`);
        console.log(`📊 Yönetim Paneli: http://localhost:${PORT}/licenses`);
    });
}

module.exports = {
    detectPlanAndCurrency,
    detectPlan,
    generateKey,
    verifyKeyChecksum
};
