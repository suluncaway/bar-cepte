'use strict';
const SOURCE_COMMIT = 'eb64139b54e24849cd283b300f785f15d8e53d45';

// Proof is imported privately by the administrator from the original claim registry.
// A verified purchase email may recover ownership, never a fresh subscription period.
function recoverLegacyClaim(existing, sale, user, now = Date.now()) {
    const proof = existing.recoveryProof;
    if (!existing.needsReview || !proof || proof.sourceCommit !== SOURCE_COMMIT ||
        !user.uid?.startsWith('google_') || typeof user.email !== 'string' ||
        typeof sale.email !== 'string' || sale.email.trim().toLowerCase() !== user.email.trim().toLowerCase() ||
        sale.licenseKey !== existing.key || proof.plan !== sale.planType ||
        !['monthly', 'annual', 'lifetime'].includes(proof.plan) ||
        !Number.isSafeInteger(proof.claimedAt) || proof.claimedAt <= 0 || proof.claimedAt > now ||
        !Number.isSafeInteger(proof.expiresAt) ||
        (proof.plan === 'lifetime' ? proof.expiresAt !== 0 : proof.expiresAt <= now || proof.expiresAt <= proof.claimedAt)) return null;
    return {...existing, uid: user.uid, email: user.email, deviceId: user.deviceId,
        plan: proof.plan, claimedAt: proof.claimedAt, expiresAt: proof.expiresAt,
        needsReview: false, recoveredAt: now};
}
module.exports = {recoverLegacyClaim};
