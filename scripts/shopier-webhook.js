/**
 * scripts/shopier-webhook.js
 * 
 * Shopier Otomatik Lisans Teslimatı Webhook Servisi
 * Sıfır harici bağımlılık (Pure Node.js) ile çalışır.
 * 
 * Akış:
 * 1. Müşteri Shopier'dan satın alır (Aylık 51736039 veya Yıllık 51735632).
 * 2. Shopier bu webhook adresine POST bildirimi gönderir.
 * 3. Sistem anında geçerli, tek kullanımlık RESERVE-XXXX-XXXX-XXXX anahtarı üretir.
 * 4. Müşterinin ekranına ve e-posta adresine anında teslim edilir.
 * 5. Üretilen anahtar keys/sold_licenses.json dosyasına kaydedilir.
 */

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const { generateKey } = require('./generate-keys');

const PORT = process.env.PORT || 3000;
// E-posta gönderimi için Resend API anahtarı (İsteğe bağlı: https://resend.com adresinden ücretsiz alınabilir)
const RESEND_API_KEY = process.env.RESEND_API_KEY || '';

// Shopier Ürün ID - Plan Eşleştirmesi
const PRODUCT_PLANS = {
    '51736039': 'monthly', // Aylık Plan
    '51735632': 'annual'   // Yıllık Plan
};

const LOG_FILE = path.resolve(__dirname, '..', 'keys', 'sold_licenses.json');

function saveSoldLicense(record) {
    try {
        const dir = path.dirname(LOG_FILE);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        let list = [];
        if (fs.existsSync(LOG_FILE)) {
            list = JSON.parse(fs.readFileSync(LOG_FILE, 'utf8') || '[]');
        }
        list.push(record);
        fs.writeFileSync(LOG_FILE, JSON.stringify(list, null, 2), 'utf8');
    } catch (err) {
        console.error('Lisans kayıt hatası:', err);
    }
}

async function sendEmail(toEmail, customerName, licenseKey, planName) {
    if (!RESEND_API_KEY) {
        console.log(`[E-posta Bildirimi] Resend API Key tanımlı değil. Kod: ${licenseKey} -> Alıcı: ${toEmail}`);
        return false;
    }

    const payload = JSON.stringify({
        from: 'Bar Cepte <lisans@barcepte.com.tr>',
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
            resolve(res.statusCode >= 200 && res.statusCode < 300);
        });
        req.on('error', () => resolve(false));
        req.write(payload);
        req.end();
    });
}

const server = http.createServer((req, res) => {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    // Sağlık kontrolü
    if (req.method === 'GET' && (req.url === '/' || req.url === '/health')) {
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ status: 'ok', service: 'Bar Cepte Shopier Webhook', timestamp: new Date().toISOString() }));
        return;
    }

    // Shopier Callback / Webhook Endpoint
    if (req.method === 'POST' && (req.url === '/webhook/shopier' || req.url === '/callback')) {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', async () => {
            try {
                // Shopier verileri URL-encoded form veya JSON olarak gönderebilir
                let params = {};
                if (req.headers['content-type'] && req.headers['content-type'].includes('application/json')) {
                    params = JSON.parse(body || '{}');
                } else {
                    const parsed = new URLSearchParams(body);
                    for (const [key, value] of parsed.entries()) {
                        params[key] = value;
                    }
                }

                console.log('📦 Shopier Sipariş Bildirimi Geldi:', params);

                // Shopier parametrelerinden ürün ve alıcı tespiti
                const productId = params.product_id || params.productId || '';
                const orderId = params.platform_order_id || params.order_id || params.orderId || `ORD-${Date.now()}`;
                const email = params.buyer_email || params.email || '';
                const name = params.buyer_name || params.name || 'Barmen Dostumuz';

                // Plan belirleme
                let planType = PRODUCT_PLANS[productId] || 'annual';
                // Eğer ürün ID uyuşmazsa ürün adından kontrol et
                const productName = (params.product_name || params.title || '').toLowerCase();
                if (productName.includes('aylık') || productName.includes('monthly')) planType = 'monthly';
                if (productName.includes('yıllık') || productName.includes('annual')) planType = 'annual';

                // 1. Yeni ve geçerli tek kullanımlık lisans üret
                const licenseKey = generateKey(planType);
                const planTitle = planType === 'monthly' ? 'Aylık VIP' : 'Yıllık VIP (Reserve)';

                // 2. Diske kaydet
                const record = {
                    orderId,
                    email,
                    name,
                    planType,
                    licenseKey,
                    createdAt: new Date().toISOString()
                };
                saveSoldLicense(record);

                console.log(`✅ Lisans Başarıyla Üretildi: [${licenseKey}] -> ${email} (${planTitle})`);

                // 3. E-posta ile alıcıya gönder
                if (email) {
                    await sendEmail(email, name, licenseKey, planTitle);
                }

                // 4. Müşteriye şık bir onay ve lisans teslimat sayfası göster
                res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
                res.end(`
                    <!DOCTYPE html>
                    <html lang="tr">
                    <head>
                        <meta charset="UTF-8">
                        <meta name="viewport" content="width=device-width, initial-scale=1.0">
                        <title>Tebrikler! Bar Cepte Lisansınız Hazır</title>
                        <style>
                            body { background:#101b19; color:#fff; font-family:-apple-system,sans-serif; display:flex; align-items:center; justify-content:center; min-height:100vh; margin:0; padding:16px; box-sizing:border-box; }
                            .card { background:#172922; border:1px solid rgba(213,180,123,0.3); border-radius:24px; padding:32px 24px; max-width:440px; width:100%; text-align:center; box-shadow:0 20px 40px rgba(0,0,0,0.5); }
                            .key-box { background:#0a1311; border:1px dashed #d5b47b; border-radius:12px; padding:16px; font-family:monospace; font-size:18px; font-weight:bold; color:#d5b47b; letter-spacing:1.5px; margin:20px 0; word-break:break-all; user-select:all; }
                            .btn { display:inline-block; background:#d5b47b; color:#101b19; padding:12px 24px; border-radius:12px; text-decoration:none; font-weight:bold; font-size:13px; margin-top:12px; transition:all 0.2s; }
                            .btn:hover { background:#e2c899; }
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
                console.error('Webhook işleme hatası:', err);
                res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
                res.end('Hata oluştu');
            }
        });
        return;
    }

    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Bulunamadı');
});

server.listen(PORT, () => {
    console.log(`🍸 Bar Cepte Shopier Webhook Servisi çalışıyor: http://localhost:${PORT}`);
    console.log(`👉 Webhook URL'niz: http://sunucunuz/webhook/shopier`);
});
