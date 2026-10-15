'use strict';
function createFulfillmentService({store, products, generateKey, sendEmail, now = Date.now}) {
    async function fulfill(order) {
        const payment = order && (order.paymentStatus || order.payment_status);
        if (payment !== 'paid' || order.cancelled || order.refunds?.length || order.returns?.length) return {status:'not_paid'};
        const orderId = String(order.id || order.order_id || '').trim();
        if (!/^[a-zA-Z0-9_-]{1,100}$/.test(orderId)) return {status:'invalid_order'};
        const items = order.lineItems || order.items || [];
        const matches = items.filter(item => products[String(item.productId || item.product_id || item.product?.id || '')]);
        // Current store sells one Reserve pass per order. Ambiguous/multiple passes require review.
        if (matches.length !== 1 || Number(matches[0].quantity ?? 1) !== 1) return {status:'unsupported_items'};
        const item = matches[0];
        const config = products[String(item.productId || item.product_id || item.product?.id)];
        if (order.currency && order.currency !== config.currency) return {status:'currency_mismatch'};
        const email = order.shippingInfo?.email || order.billingInfo?.email || order.buyer_email || order.email || '';
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return {status:'missing_email'};
        const name = order.shippingInfo?.firstName ? [order.shippingInfo.firstName,order.shippingInfo.lastName].filter(Boolean).join(' ') : order.buyer_name || 'Bar Cepte';
        const candidate = {orderId, email, name, planType:config.plan, planTitle:config.plan,
            currency:config.currency, licenseKey:generateKey(config.plan), createdAt:new Date(now()).toISOString(),
            emailSent:false,emailSentCount:0,lastEmailSentAt:null};
        const sale = await store.createSale(candidate);
        const record = await store.acquireDelivery(orderId, now());
        if (!record) return {status:'already_processed',record:sale};
        let sent = false;
        try {
            sent = await sendEmail(record.email,record.name,record.licenseKey,record.planTitle,record.currency,
                {idempotencyKey:'license-delivery-' + orderId});
            if (sent) await store.saveSold({...record,emailSent:true,emailSentCount:(record.emailSentCount||0)+1,
                lastEmailSentAt:new Date(now()).toISOString(),deliveryLeaseUntil:0});
        } finally {
            if (!sent) await store.saveSold({...record,deliveryLeaseUntil:0});
        }
        return {status:sent?'delivered':'delivery_pending',record};
    }
    return {fulfill};
}
module.exports = {createFulfillmentService};
