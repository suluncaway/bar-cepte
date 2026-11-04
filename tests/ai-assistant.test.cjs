const test = require('node:test');
const assert = require('node:assert/strict');
const { createAIAssistant, validateInput, extractOutputText } = require('../scripts/ai-assistant');

test('AI request validation trims and bounds user input', () => {
    const input = validateInput({ message: '  Cinli, ekşi bir tarif öner  ', ingredients: ['Gin', 'Lime Juice'], history: [{role:'user',content:'Önceki istek'}], language:'tr', unit:'cl' });
    assert.equal(input.message, 'Cinli, ekşi bir tarif öner');
    assert.deepEqual(input.ingredients, ['Gin', 'Lime Juice']);
    assert.equal(input.history.length, 1);
    assert.equal(input.unit, 'cl');
});

test('AI request validation rejects oversized and empty messages', () => {
    assert.throws(() => validateInput({ message: ' ' }), { status: 400 });
    assert.throws(() => validateInput({ message: 'x'.repeat(1001) }), { status: 400 });
    assert.throws(() => validateInput({ message: 'ok', ingredients: Array(61).fill('Gin') }), { status: 400 });
});

test('response text extraction supports Responses API output shape', () => {
    assert.equal(extractOutputText({ output: [{ type:'message', content:[{type:'output_text',text:'{"message":"Tamam","recipes":[]}'}] }] }), '{"message":"Tamam","recipes":[]}');
});

test('assistant keeps the API key server-side and sends structured output request', async () => {
    let captured;
    const assistant = createAIAssistant({
        apiKey: 'test-secret',
        model: 'test-model',
        fetchImpl: async (url, options) => {
            captured = { url, options };
            return { ok:true, json:async()=>({ output_text: JSON.stringify({ message:'Cin ve misket limonuyla ferah bir tarif deneyebilirsin.', recipes:[] }) }) };
        }
    });
    const result = await assistant.respond({ message:'Bir tarif öner', ingredients:['Gin','Lime Juice'] });
    assert.equal(result.message, 'Cin ve misket limonuyla ferah bir tarif deneyebilirsin.');
    assert.equal(captured.url, 'https://api.openai.com/v1/responses');
    assert.equal(captured.options.headers.Authorization, 'Bearer test-secret');
    assert.equal(JSON.parse(captured.options.body).store, false);
});

test('assistant reports missing server key without making a network request', async () => {
    const assistant = createAIAssistant({ apiKey: '', fetchImpl: async () => { throw new Error('should not fetch'); } });
    await assert.rejects(() => assistant.respond({ message:'Selam' }), { status:503 });
});
