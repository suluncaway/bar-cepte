const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const gameJs = fs.readFileSync(path.resolve(__dirname, '../game.js'), 'utf8');
const source = /(const MIX_KINDS = \[[\s\S]*?)\nconst MIX_COPY/.exec(gameJs);
const mixPlan = new Function(`${source[1]}; return mixPlan;`)();
const cocktails = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../cocktails.json'), 'utf8'));
const list = Array.isArray(cocktails) ? cocktails : cocktails.drinks;
const recipe = name => list.find(d => d.strDrink === name);

test('Mix mode picks the method and barware from the recipe itself', () => {
    const cases = {'Mojito': 'build', 'Pina Colada': 'blend', 'Negroni': 'stir', 'French Martini': 'shake', 'B-52': 'layer'};
    for (const [name, method] of Object.entries(cases)) {
        assert.equal(mixPlan(recipe(name).strInstructionsTR, 'tr', recipe(name).strInstructions).method, method, name);
        assert.equal(mixPlan(recipe(name).strInstructions, 'en').method, method, `${name} (en)`);
    }
    // Turkish "karıştırın" also means "combine": Cuba Libre is built in the glass, not stirred, and gets no timer.
    const cuba = mixPlan(recipe('Cuba Libre').strInstructionsTR, 'tr', recipe('Cuba Libre').strInstructions);
    assert.equal(cuba.method, 'build');
    assert.ok(cuba.steps.every(s => !s.timerSeconds));
    // "blended whiskey" is a spirit, not a blender.
    assert.equal(mixPlan(recipe('Boston Sour').strInstructions, 'en').method, 'shake');
    assert.notEqual(mixPlan(recipe('Winter Paloma').strInstructions, 'en').method, 'blend', 'a spice blend is not a blender');
    assert.notEqual(mixPlan(recipe('Vampiro').strInstructions, 'en').method, 'layer', 'a layer of salt is not a layered drink');
    assert.equal(mixPlan(recipe('Mojito').strInstructionsTR, 'tr').muddle, true);
    assert.equal(mixPlan(recipe('Negroni').strInstructionsTR, 'tr').muddle, false);
});

test('Mix mode steps are the recipe sentences, at most three, with timers only where needed', () => {
    for (const drink of list) {
        const plan = mixPlan(drink.strInstructionsTR, 'tr', drink.strInstructions);
        assert.ok(plan.steps.length >= 1 && plan.steps.length <= 3, drink.strDrink);
        const joined = plan.steps.flatMap(s => s.sentences).join(' ');
        assert.equal(joined, drink.strInstructionsTR.replace(/\s+/g, ' ').trim(), `${drink.strDrink} keeps every sentence`);
    }
    const martini = mixPlan(recipe('French Martini').strInstructionsTR, 'tr', recipe('French Martini').strInstructions);
    assert.equal(martini.steps.filter(s => s.timerKind === 'shake' && s.timerSeconds === 15).length, 1, 'only the step that shakes is timed');
    const pina = mixPlan(recipe('Pina Colada').strInstructionsTR, 'tr', recipe('Pina Colada').strInstructions);
    assert.ok(pina.steps.every(s => !s.kinds.includes('stir')), 'blender "karıştırın" is not a stirring step');
    assert.ok(pina.steps.every(s => !s.kinds.includes('strain')), '"pürüzsüz" (smooth) is not "süz" (strain)');
    assert.equal(mixPlan(recipe('A1').strInstructions, 'en').method, 'shake', 'pouring into a shaker means a shaken drink');
    const mojito = mixPlan(recipe('Mojito').strInstructionsTR, 'tr', recipe('Mojito').strInstructions);
    assert.ok(mojito.steps.every(s => s.timerKind !== 'shake'), 'a built drink never asks you to shake');
    assert.ok(mojito.steps[0].kinds.includes('muddle'));
    assert.deepEqual(mixPlan('', 'tr').steps, []);
});
