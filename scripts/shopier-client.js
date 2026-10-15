'use strict';
const https = require('node:https');
function requestJson(url, headers = {}, method = 'GET', body) {
    return new Promise((resolve, reject) => {
        const request = https.request(url, {method, headers}, response => {
            const chunks = []; let size = 0;
            response.on('data', chunk => {
                size += chunk.length;
                if (size > 8 * 1024 * 1024) response.destroy(new Error('Provider response too large'));
                else chunks.push(chunk);
            });
            response.on('error', reject);
            response.on('end', () => {
                if (response.statusCode < 200 || response.statusCode >= 300) return reject(new Error('Provider HTTP ' + response.statusCode));
                try {resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));}
                catch {reject(new Error('Invalid provider JSON'));}
            });
        });
        request.setTimeout(15000, () => request.destroy(new Error('Provider timeout')));
        request.on('error', reject);
        request.end(body);
    });
}
function createShopierClient({token, transport = requestJson}) {
    const state = {status: token ? 'not_checked' : 'not_configured', lastSuccess: null};
    async function get(path) {
        if (!token) throw new Error('Shopier not configured');
        try {
            const data = await transport('https://api.shopier.com/v1' + path, {Authorization:'Bearer ' + token, Accept:'application/json'});
            state.status = 'ok'; state.lastSuccess = Date.now();
            return data;
        } catch(error) {state.status = 'unavailable'; throw error;}
    }
    return {
        state,
        async listOrders() {
            const result = await get('/orders');
            const rows = Array.isArray(result) ? result : result.data || result.items;
            if (!Array.isArray(rows)) {state.status='invalid_response'; throw new Error('Invalid order list');}
            return rows;
        },
        async getOrder(id) {
            if (!/^[a-zA-Z0-9_-]{1,100}$/.test(String(id))) throw new Error('Invalid order ID');
            const result = await get('/orders/' + encodeURIComponent(id));
            const order = result.data || result;
            if (String(order.id || order.order_id) !== String(id)) throw new Error('Order ID mismatch');
            return order;
        }
    };
}
module.exports = {createShopierClient, requestJson};
