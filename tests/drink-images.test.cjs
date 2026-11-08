const { test } = require('node:test');
const assert = require('node:assert/strict');
const security = require('../security.js');

test('mirrored drink photos are used only on the https website', () => {
    const src = 'https://www.thecocktaildb.com/images/media/drink/5noda61589575158.jpg';
    assert.equal(security.displayImage(src), src, 'no location: keep the original');
    globalThis.location = { protocol: 'https:' };
    try {
        assert.equal(security.displayImage(src), 'img/drinks/5noda61589575158.jpg');
        assert.equal(security.displayImage('https://attacker.invalid/x.jpg'), '');
        assert.equal(security.displayImage('https://www.thecocktaildb.com/images/ingredients/Gin.png'), 'https://www.thecocktaildb.com/images/ingredients/Gin.png');
    } finally { delete globalThis.location; }
});
