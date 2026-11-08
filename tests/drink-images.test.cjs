const { test } = require('node:test');
const assert = require('node:assert/strict');
const security = require('../security.js');

test('drink photos and ingredient icons are served from our own mirror', () => {
    const src = 'https://www.thecocktaildb.com/images/media/drink/5noda61589575158.jpg';
    assert.equal(security.displayImage(src), 'https://barcepte.com.tr/img/drinks/5noda61589575158.jpg');
    assert.equal(security.displayImage('https://attacker.invalid/x.jpg'), '');
    assert.equal(security.displayImage('https://www.thecocktaildb.com/images/ingredients/Gin.png'), 'https://www.thecocktaildb.com/images/ingredients/Gin.png');
    assert.equal(security.ingredientImage('Lime Juice'), 'https://barcepte.com.tr/img/ingredients/Lime%20Juice-Small.png');
});
