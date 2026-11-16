'use strict';
const productIdOf = item => String(item?.productId || item?.product_id || item?.product?.id || '');
const lineIdOf = item => String(item?.id || item?.lineItemId || item?.line_item_id || '');

// Does this refund/return entry cover the Reserve license line? 'yes' | 'no' | 'unknown'.
// Entries that name items (or products) count only when one of them is a license product or the
// license line itself. Entries without item details count when every line of the order is a
// license product (the refund can only be for the license); on a mixed order they are 'unknown'
// and left for manual review (/api/revoke-license).
function entryCoversLicense(entry, items, products) {
    const licenseLines = items.filter(item => products[productIdOf(item)]);
    const licenseLineIds = new Set(licenseLines.map(lineIdOf).filter(Boolean));
    const named = [];
    for (const list of [entry?.lineItems, entry?.items, entry?.line_items]) if (Array.isArray(list)) named.push(...list);
    const ids = [entry?.lineItemId, entry?.line_item_id, ...(Array.isArray(entry?.lineItemIds) ? entry.lineItemIds : [])]
        .filter(id => id !== undefined && id !== null && id !== '').map(String);
    const productIds = [entry?.productId, entry?.product_id].filter(Boolean).map(String);
    if (named.length || ids.length || productIds.length) {
        const covered = named.some(item => products[productIdOf(item)] || (lineIdOf(item) && licenseLineIds.has(lineIdOf(item)))) ||
            ids.some(id => licenseLineIds.has(id)) || productIds.some(id => products[id]);
        return covered ? 'yes' : 'no';
    }
    return items.length > 0 && licenseLines.length === items.length ? 'yes' : 'unknown';
}

// Returns null, or {reason, review} where review=true means a refund the code cannot attribute.
function refundSignal(order, products) {
    if (!order) return null;
    if (order.cancelled) return {reason: 'cancelled'};
    const items = order.lineItems || order.items || [];
    for (const [field, reason] of [['refunds', 'refund'], ['returns', 'return']]) {
        const entries = Array.isArray(order[field]) ? order[field] : [];
        if (!entries.length) continue;
        const verdicts = entries.map(entry => entryCoversLicense(entry, items, products));
        if (verdicts.includes('yes')) return {reason};
        if (verdicts.includes('unknown')) return {reason, review: true};
    }
    return null;
}

function createFulfillmentService({store, products, generateKey, sendEmail, now = Date.now}) {
    async function fulfill(order) {
        const payment = order && (order.paymentStatus || order.payment_status);
        // Same refund/cancel signals as the first delivery check; a later refund of the license line
        // revokes the issued key. A refund of another line of the same order does not.
        const refund = refundSignal(order, products);
        if (refund && !refund.review) {
            const orderId = String(order.id || order.order_id || '').trim();
            if (store.revokeOrder && /^[a-zA-Z0-9_-]{1,100}$/.test(orderId)) {
                const revoked = await store.revokeOrder(orderId, {at: now(), reason: refund.reason});
                if (revoked) return {status: revoked.changed ? 'revoked' : 'already_revoked'};
            }
            return {status:'not_paid'};
        }
        if (refund && refund.review) {
            // Refund without item details on a mixed order: never auto-revoke the license, and do not
            // issue a new one either; the administrator decides.
            return {status:'refund_needs_review'};
        }
        if (payment !== 'paid') return {status:'not_paid'};
        const orderId = String(order.id || order.order_id || '').trim();
        if (!/^[a-zA-Z0-9_-]{1,100}$/.test(orderId)) return {status:'invalid_order'};
        const items = order.lineItems || order.items || [];
        const matches = items.filter(item => products[productIdOf(item)]);
        // Current store sells one Reserve pass per order. Ambiguous/multiple passes require review.
        if (matches.length !== 1 || Number(matches[0].quantity ?? 1) !== 1) return {status:'unsupported_items'};
        const item = matches[0];
        const config = products[productIdOf(item)];
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
module.exports = {createFulfillmentService, refundSignal};
