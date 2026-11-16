/* Party planner (Reserve). Calculation lives in smart-bar.js (BarSmart.planParty); this file only
   draws the panel inside the shopping section and wires it to the existing recipe/cost helpers. */
(function () {
    'use strict';
    const en = () => typeof currentLang !== 'undefined' && currentLang === 'en';
    const t = (tr, eng) => (en() ? eng : tr);
    const esc = value => escapeHTML(String(value ?? ''));
    const reserveActive = () => Boolean(window.BarReserve && window.BarReserve.isReserveActive());
    const nameOf = name => (en() ? name : translateIngredientName(name));
    const number = (value, digits = 1) => Number(value).toLocaleString(en() ? 'en-GB' : 'tr-TR', { maximumFractionDigits: digits });
    const NB = '\u00a0';
    const amount = cl => (cl >= 100 ? `${number(cl)}${NB}cl (${number(cl / 100, 2)}${NB}L)` : `${number(cl)}${NB}cl`);
    let host = null, lastPlan = null, renderedKey = '', state = { guests: 20, perGuest: 2, recipes: ['', '', ''] };

    const owned = name => Array.isArray(selectedIngredients) && selectedIngredients.some(s => checkIngredientMatch(name, s));
    const perServingCost = drink => {
        try { const c = calculateRecipeCost(drink); return c && Number.isFinite(c.cost) ? c.cost : null; } catch { return null; }
    };
    function plan(guests, perGuest, recipes) {
        return window.BarSmart.planParty({ guests, drinksPerGuest: perGuest, recipes, measureToCl, owned, cost: perServingCost });
    }
    function findRecipe(name) {
        const key = String(name || '').trim().toLocaleLowerCase('tr-TR');
        if (!key) return null;
        return allCocktails.find(d => String(d.strDrink || '').toLocaleLowerCase('tr-TR') === key) || null;
    }

    function note() {
        return `<p class="party-note">${t('Sorumlu tüketim: Misafirlerine alkolsüz seçenek ve bol su sun; 18 yaş altındakilere ve araç kullanacaklara alkol ikram etme. Miktarlar tarif ölçülerine göre yaklaşık hesaplanır; buz ve süslemeyi ayrıca planla.',
            'Drink responsibly: offer alcohol-free options and plenty of water, and never serve alcohol to anyone under 18 or anyone who will drive. Amounts are estimates from recipe measures; plan ice and garnishes separately.')}</p>`;
    }

    function resultMarkup(result, preview) {
        const rows = preview ? result.ingredients.slice(0, 4) : result.ingredients;
        const recipes = result.recipes.map(r => `<li>${esc(r.name)}: ${t(`${r.servings} porsiyon`, `${r.servings} servings`)}</li>`).join('');
        const table = rows.length ? `<div class="party-table-wrap"><table class="party-table">
            <caption>${t('Toplam malzeme ve şişe sayısı', 'Total ingredients and bottles')}</caption>
            <thead><tr><th scope="col">${t('Malzeme', 'Ingredient')}</th><th scope="col">${t('Toplam', 'Total')}</th><th scope="col">${t('Şişe', 'Bottles')}</th>${preview ? '' : `<th scope="col">${t('Barında', 'In bar')}</th>`}</tr></thead>
            <tbody>${rows.map(row => `<tr><th scope="row">${esc(nameOf(row.name))}</th><td>${esc(amount(row.cl))}</td>
                <td>${row.bottles ? esc(`${row.bottles}${NB}×${NB}${row.bottleCl}${NB}cl`) : `<span aria-label="${t('şişe yok', 'not bottled')}">—</span>`}</td>
                ${preview ? '' : `<td>${row.owned ? t('Var', 'Yes') : `<span class="party-missing">${t('Eksik', 'Missing')}</span>`}</td>`}</tr>`).join('')}</tbody></table></div>` : '';
        if (preview) return `<ul class="party-recipes">${recipes}</ul>${table}`;
        const unmeasured = result.unmeasured.length ? `<h4>${t('Ölçüsü hesaplanamayanlar', 'Amounts not calculated')}</h4>
            <p>${t('Bu malzemelerin ölçüsü (ör. "fill", "to taste", dilim) cl\'ye çevrilemiyor; porsiyon sayısına göre elle hazırla.', 'These measures (e.g. "fill", "to taste", slices) cannot be converted to cl; prepare them by the number of servings.')}</p>
            <ul class="party-unmeasured">${result.unmeasured.map(row => `<li><strong>${esc(nameOf(row.name))}</strong>${row.owned ? '' : ` <span class="party-missing">(${t('eksik', 'missing')})</span>`}: ${row.uses.map(use =>
                esc(`${use.recipe} — ${use.measure ? translateMeasureText(use.measure) : t('ölçü belirtilmemiş', 'no measure given')} × ${use.servings}`)).join('; ')}</li>`).join('')}</ul>` : '';
        const cost = Number.isFinite(result.estimatedCost)
            ? `<p>${t('Tahmini malzeme maliyeti', 'Estimated ingredient cost')}: <strong>${esc(formatRecipeCost({ computedCost: { cost: result.estimatedCost } }))}</strong></p>` : '';
        const missing = result.missing.length
            ? `<button type="button" class="party-btn" data-party="shop">${t(`Eksik ${result.missing.length} malzemeyi alışveriş listesine ekle`, `Add ${result.missing.length} missing ingredients to the shopping list`)}</button>`
            : `<p>${t('Tüm malzemeler barında görünüyor; miktarları kontrol et.', 'Everything appears to be in your bar; check the quantities.')}</p>`;
        return `<h3>${t(`${result.guests} misafir × ${result.drinksPerGuest} içki = ${result.totalServings} porsiyon`, `${result.guests} guests × ${result.drinksPerGuest} drinks = ${result.totalServings} servings`)}</h3>
            <ul class="party-recipes">${recipes}</ul>${table}${unmeasured}${cost}${missing}<p class="party-status" role="status"></p>`;
    }

    function lockedMarkup() {
        const sample = ['11000', '11007'].map(id => allCocktails.find(d => d.idDrink === id)).filter(Boolean);
        const preview = sample.length ? `<div class="party-preview" aria-label="${t('Örnek hesap önizlemesi', 'Sample calculation preview')}">
            <p>${t('Örnek: 20 misafir, kişi başı 2 içki', 'Example: 20 guests, 2 drinks each')}</p>${resultMarkup(plan(20, 2, sample), true)}</div>` : '';
        return `<p>${t('Misafir sayısını, kişi başı içkiyi ve 1–3 tarifi seç; toplam malzemeyi cl ve şişe olarak hesaplayalım, eksikleri alışveriş listene ekleyelim.',
            'Choose the number of guests, drinks per guest and 1–3 recipes; we total the ingredients in cl and bottles and add what is missing to your shopping list.')}</p>
            ${preview}
            <button type="button" class="party-btn party-primary" data-party="unlock">${t('Reserve ile kilidi aç', 'Unlock with Reserve')}</button>${note()}`;
    }

    function formMarkup() {
        const options = [1, 2, 3, 4].map(n => `<option value="${n}" ${n === state.perGuest ? 'selected' : ''}>${n}</option>`).join('');
        const recipeInputs = [0, 1, 2].map(i => `<div class="party-field">
            <label for="party-recipe-${i + 1}">${i === 0 ? t('1. tarif', 'Recipe 1') : t(`${i + 1}. tarif (isteğe bağlı)`, `Recipe ${i + 1} (optional)`)}</label>
            <input id="party-recipe-${i + 1}" type="text" list="cocktail-suggestions" autocomplete="off" value="${esc(state.recipes[i])}" ${i === 0 ? 'required' : ''}></div>`).join('');
        return `<form id="party-form" class="party-form" novalidate>
            <div class="party-field"><label for="party-guests">${t('Misafir sayısı (10–50)', 'Guests (10–50)')}</label>
                <input id="party-guests" type="number" inputmode="numeric" min="10" max="50" step="1" value="${state.guests}" required></div>
            <div class="party-field"><label for="party-per-guest">${t('Kişi başı içki', 'Drinks per guest')}</label>
                <select id="party-per-guest">${options}</select></div>
            ${recipeInputs}
            <p id="party-error" class="party-error" role="alert"></p>
            <button type="submit" class="party-btn party-primary">${t('Hesapla', 'Calculate')}</button>
        </form>
        <div id="party-result" class="party-result" aria-live="polite">${lastPlan ? resultMarkup(lastPlan, false) : ''}</div>${note()}`;
    }

    function refresh() {
        host = host || document.getElementById('party-planner');
        if (!host || !window.BarSmart) return;
        const active = reserveActive();
        // Re-render only when something shown changes, so typing is never wiped by a Reserve refresh.
        const key = `${active}|${en()}|${allCocktails.length > 0}`;
        if (key === renderedKey && host.firstChild) return;
        renderedKey = key;
        const focused = host.contains(document.activeElement) ? document.activeElement.id : '';
        host.innerHTML = `<h2 id="party-title">${t('Parti planlayıcısı', 'Party planner')} <span class="party-badge">Reserve</span></h2>
            ${active ? formMarkup() : lockedMarkup()}`;
        if (focused) document.getElementById(focused)?.focus();
    }

    function submit(form) {
        const error = form.querySelector('#party-error');
        const guests = Number(form.querySelector('#party-guests').value);
        const perGuest = Number(form.querySelector('#party-per-guest').value);
        const names = [1, 2, 3].map(i => form.querySelector(`#party-recipe-${i}`).value.trim());
        state = { guests, perGuest, recipes: names };
        const problems = [];
        if (!Number.isInteger(guests) || guests < 10 || guests > 50) problems.push(t('Misafir sayısı 10 ile 50 arasında bir tam sayı olmalı.', 'Guests must be a whole number from 10 to 50.'));
        const recipes = [];
        names.forEach((name, i) => {
            if (!name) return;
            const drink = findRecipe(name);
            if (!drink) problems.push(t(`${i + 1}. tarif bulunamadı: listeden bir kokteyl seç.`, `Recipe ${i + 1} was not found: pick a cocktail from the list.`));
            else if (!recipes.includes(drink)) recipes.push(drink);
        });
        if (!names.some(Boolean)) problems.push(t('En az bir tarif seç.', 'Choose at least one recipe.'));
        if (problems.length) {
            error.textContent = problems.join(' ');
            const target = !Number.isInteger(guests) || guests < 10 || guests > 50 ? '#party-guests' : '#party-recipe-1';
            form.querySelector(target)?.focus();
            return;
        }
        error.textContent = '';
        lastPlan = plan(guests, perGuest, recipes);
        const result = document.getElementById('party-result');
        result.innerHTML = resultMarkup(lastPlan, false);
        result.querySelector('h3')?.setAttribute('tabindex', '-1');
        result.querySelector('h3')?.focus();
    }

    function addMissing(button) {
        if (!lastPlan || !reserveActive()) return;
        const status = host.querySelector('.party-status');
        const added = typeof window.BarAddToShopping === 'function' ? window.BarAddToShopping(lastPlan.missing) : -1;
        if (status) status.textContent = added < 0 ? t('Alışveriş listesi kaydedilemedi.', 'The shopping list could not be saved.')
            : added ? t(`${added} malzeme alışveriş listesine eklendi.`, `${added} ingredients added to your shopping list.`)
                : t('Eksik malzemeler zaten listede.', 'The missing ingredients are already listed.');
        button.disabled = added >= 0;
    }

    document.addEventListener('submit', event => {
        if (event.target && event.target.id === 'party-form') {
            event.preventDefault();
            if (reserveActive()) submit(event.target);
            else refresh();
        }
    });
    document.addEventListener('click', event => {
        const control = event.target.closest && event.target.closest('[data-party]');
        if (!control || !host || !host.contains(control)) return;
        if (control.dataset.party === 'unlock') document.getElementById('btn-open-reserve')?.click();
        else if (control.dataset.party === 'shop') addMissing(control);
    });

    window.BarPartyUI = { refresh };
})();
