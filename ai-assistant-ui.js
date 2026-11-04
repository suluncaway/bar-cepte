(() => {
    'use strict';
    const API_URL = 'https://bar-cepte-webhook.onrender.com/api/ai-assistant';
    const $ = id => document.getElementById(id);
    const messages = [];
    let busy = false;

    function addMessage(role, text, typing = false) {
        const host = $('ai-chat-messages');
        if (!host) return null;
        const row = document.createElement('div');
        row.className = 'ai-message ' + (role === 'user' ? 'ai-message-user' : 'ai-message-assistant');
        const avatar = document.createElement('span');
        avatar.className = 'ai-message-avatar';
        avatar.textContent = role === 'user' ? '●' : '✦';
        const bubble = document.createElement('div');
        bubble.className = 'ai-message-bubble' + (typing ? ' ai-typing' : '');
        bubble.textContent = text;
        row.append(avatar, bubble);
        host.appendChild(row);
        host.scrollTop = host.scrollHeight;
        return row;
    }

    function addRecipeCards(recipes) {
        const host = $('ai-recipe-results');
        if (!host) return;
        host.replaceChildren();
        (recipes || []).forEach(recipe => {
            const card = document.createElement('article');
            card.className = 'ai-recipe-card';
            const title = document.createElement('h3');
            title.textContent = recipe.name;
            const desc = document.createElement('p');
            desc.textContent = recipe.description || '';
            const meta = document.createElement('p');
            meta.textContent = [recipe.alcoholic ? 'Alkollü' : 'Alkolsüz', recipe.glass, recipe.taste].join(' · ');
            const ingredientTitle = document.createElement('p');
            ingredientTitle.textContent = 'Malzemeler';
            ingredientTitle.style.color = '#e4c78e';
            const ingredients = document.createElement('ul');
            const missing = [];
            (recipe.ingredients || []).forEach(item => {
                const li = document.createElement('li');
                li.textContent = (item.amount ? item.amount + ' ' : '') + item.name + (item.available ? ' ✓' : ' · Eksik');
                if (!item.available) {
                    li.className = 'ai-missing';
                    missing.push(item.name);
                }
                ingredients.appendChild(li);
            });
            const stepsTitle = document.createElement('p');
            stepsTitle.textContent = 'Hazırlanışı';
            stepsTitle.style.color = '#e4c78e';
            const steps = document.createElement('ol');
            (recipe.instructions || []).forEach(step => {
                const li = document.createElement('li');
                li.textContent = step;
                steps.appendChild(li);
            });
            const actions = document.createElement('div');
            actions.className = 'ai-recipe-actions';
            const save = document.createElement('button');
            save.type = 'button';
            save.textContent = '＋ Tariflerime kaydet';
            save.addEventListener('click', () => {
                const ok = window.BarAIAddRecipe?.(recipe);
                save.textContent = ok ? '✓ Tariflerime eklendi' : 'Kaydedilemedi';
                save.disabled = true;
            });
            actions.appendChild(save);
            if (missing.length) {
                const shop = document.createElement('button');
                shop.type = 'button';
                shop.textContent = 'Eksikleri alışverişe ekle';
                shop.addEventListener('click', () => {
                    const ok = window.BarAIAddMissingToShopping?.(missing);
                    shop.textContent = ok ? '✓ Listeye eklendi' : 'Eklenemedi';
                    shop.disabled = true;
                });
                actions.appendChild(shop);
            }
            card.append(title, desc, meta, ingredientTitle, ingredients, stepsTitle, steps, actions);
            host.appendChild(card);
        });
    }

    function updateInventoryCount() {
        const context = window.BarAIContext?.() || { inventory: [] };
        const count = $('ai-inventory-count');
        if (count) count.textContent = String(context.inventory.length);
    }

    async function sendMessage(text) {
        const message = String(text || '').trim();
        if (!message || busy) return;
        const input = $('ai-chat-input');
        if (input) input.value = '';
        addMessage('user', message);
        const context = window.BarAIContext?.() || { inventory: [], recipes: [], language: 'tr', unit: 'cl' };
        const typing = addMessage('assistant', 'Barını ve tarif arşivini inceliyorum…', true);
        const send = $('ai-chat-send');
        busy = true;
        if (send) send.disabled = true;
        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message,
                    ingredients: context.inventory,
                    recipes: context.recipes,
                    history: messages.slice(-8),
                    language: context.language,
                    unit: context.unit,
                    preferences: ''
                })
            });
            const result = await response.json().catch(() => ({}));
            if (!response.ok || !result.success) throw new Error(result.reason || 'Asistana şu anda ulaşılamıyor.');
            typing?.remove();
            addMessage('assistant', result.message || 'Yanıt oluşturulamadı.');
            messages.push({ role: 'user', content: message }, { role: 'assistant', content: result.message || '' });
            while (messages.length > 8) messages.shift();
            addRecipeCards(result.recipes || []);
        } catch (error) {
            typing?.remove();
            addMessage('assistant', error instanceof Error ? error.message : 'Bir bağlantı hatası oluştu.');
        } finally {
            busy = false;
            if (send) send.disabled = false;
            input?.focus();
        }
    }

    function init() {
        const tab = $('tab-ai');
        tab?.addEventListener('click', () => window.switchTab ? window.switchTab('ai') : document.getElementById('ai-assistant-panel')?.classList.remove('hidden'));
        $('ai-chat-form')?.addEventListener('submit', event => {
            event.preventDefault();
            sendMessage($('ai-chat-input')?.value);
        });
        document.querySelectorAll('[data-ai-prompt]').forEach(button => {
            button.addEventListener('click', () => sendMessage(button.getAttribute('data-ai-prompt')));
        });
        $('ai-chat-input')?.addEventListener('keydown', event => {
            if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                $('ai-chat-form')?.requestSubmit();
            }
        });
        updateInventoryCount();
    }

    window.BarAI = { onOpen: updateInventoryCount, sendMessage };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
    else init();
})();
