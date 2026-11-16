/* Pure rules for substitutes, today's cocktail, AI preference context and the party planner.
   Shared by the browser (window.BarSmart) and the regression tests. No DOM, no storage. */
(function (root) {
    'use strict';

    // Machine-readable, high-confidence 1:1 substitutes. `missing` lists recipe ingredient names the
    // rule covers; `use` lists bar ingredients that can replace them without changing the drink much.
    // `key` links to the free-text advice in game.js INGREDIENT_SUBSTITUTES. Lower-confidence swaps
    // (wine for vermouth, vodka for rum, Aperol for Campari...) are deliberately left out.
    const SUBSTITUTE_RULES = [
        { key: 'lime juice', missing: ['Lime juice'], use: ['Lemon juice'], tr: 'Limon suyu, misket limonu suyunun yerine 1:1 kullanılır.', en: 'Lemon juice replaces lime juice 1:1.' },
        { key: 'lemon juice', missing: ['Lemon juice'], use: ['Lime juice'], tr: 'Misket limonu suyu, limon suyunun yerine 1:1 kullanılır.', en: 'Lime juice replaces lemon juice 1:1.' },
        { key: 'triple sec', missing: ['Triple sec'], use: ['Cointreau', 'Grand Marnier'], tr: 'Aynı portakal likörü ailesinden; 1:1.', en: 'Same orange-liqueur family; 1:1.' },
        { key: 'cointreau', missing: ['Cointreau'], use: ['Triple sec', 'Grand Marnier'], tr: 'Aynı portakal likörü ailesinden; 1:1.', en: 'Same orange-liqueur family; 1:1.' },
        { key: 'grand marnier', missing: ['Grand Marnier'], use: ['Cointreau', 'Triple sec'], tr: 'Portakal likörü; 1:1.', en: 'Orange liqueur; 1:1.' },
        { key: 'sugar syrup', missing: ['Sugar syrup', 'Simple syrup'], use: ['Sugar'], tr: 'Eşit miktar şekeri sıcak suda erit (1:1 şurup).', en: 'Dissolve equal parts sugar in hot water (1:1 syrup).' },
        { key: 'sugar', missing: ['Sugar', 'Powdered sugar'], use: ['Sugar syrup', 'Simple syrup'], tr: '1 çay kaşığı şeker yerine ~1 cl şurup.', en: 'Use ~1 cl syrup per teaspoon of sugar.' },
        { key: 'soda', missing: ['Soda water', 'Club soda', 'Carbonated water'], use: ['Soda water', 'Club soda', 'Carbonated water'], tr: 'Sade gazlı su; birebir aynı işlevi görür.', en: 'Plain sparkling water; same job.' },
        { key: 'bourbon', missing: ['Bourbon'], use: ['Rye whiskey', 'Whiskey', 'Blended whiskey'], tr: 'Viski ailesinden; profil biraz değişir.', en: 'Same whiskey family; slightly different profile.' },
        { key: 'rye whiskey', missing: ['Rye whiskey'], use: ['Bourbon', 'Whiskey'], tr: 'Biraz daha tatlı bir sonuç verir.', en: 'Gives a slightly sweeter drink.' },
        { key: 'cognac', missing: ['Cognac'], use: ['Brandy'], tr: 'Konyak bir brendidir; 1:1.', en: 'Cognac is a brandy; 1:1.' },
        { key: 'brandy', missing: ['Brandy'], use: ['Cognac'], tr: 'Konyak bir brendidir; 1:1.', en: 'Cognac is a brandy; 1:1.' },
        { key: 'kahlua', missing: ['Kahlua', 'Coffee liqueur'], use: ['Kahlua', 'Coffee liqueur', 'Tia Maria'], tr: 'Kahve likörü; 1:1.', en: 'Coffee liqueur; 1:1.' },
        { key: 'angostura bitters', missing: ['Angostura bitters', 'Bitters'], use: ['Angostura bitters', 'Bitters', 'Orange bitters', "Peychaud's bitters"], tr: 'Birkaç damla aromatik bitter.', en: 'A few dashes of aromatic bitters.' },
        { key: 'ginger beer', missing: ['Ginger beer'], use: ['Ginger ale'], tr: 'Daha yumuşak bir zencefil tadı verir.', en: 'Gives a milder ginger taste.' },
        { key: 'ginger ale', missing: ['Ginger ale'], use: ['Ginger beer'], tr: 'Daha keskin bir zencefil tadı verir.', en: 'Gives a sharper ginger taste.' },
        { key: 'tequila', missing: ['Tequila'], use: ['Mezcal'], tr: 'Agave ailesinden; daha isli.', en: 'Same agave family; smokier.' }
    ];

    const norm = value => String(value || '').toLowerCase().replace(/\s+/g, ' ').trim();

    /** Rule whose `missing` names cover this recipe ingredient. `match(recipeName, name)` decides. */
    function substituteRuleFor(ingredient, match) {
        const name = norm(ingredient);
        if (!name) return null;
        const test = typeof match === 'function' ? match : (a, b) => norm(a) === norm(b);
        return SUBSTITUTE_RULES.find(rule => rule.missing.some(target => norm(target) === name || test(ingredient, target))) || null;
    }

    /**
     * For a recipe with exactly one missing ingredient, return the bar ingredient that can replace
     * it with a high-confidence rule; otherwise null. `owned(name)` says whether the bar satisfies
     * a recipe ingredient called `name` (game.js: selectedIngredients.some(checkIngredientMatch)).
     */
    function findSubstitution(missingList, owned, match) {
        if (!Array.isArray(missingList) || missingList.length !== 1 || typeof owned !== 'function') return null;
        const missing = missingList[0];
        const rule = substituteRuleFor(missing, match);
        if (!rule) return null;
        const use = rule.use.find(name => norm(name) !== norm(missing) && owned(name));
        return use ? { missing, use, rule } : null;
    }

    // --- Today's cocktail -------------------------------------------------------------------
    // Fixed-date occasions only (no movable religious holidays that need yearly maintenance).
    function occasionFor(date) {
        const m = date.getMonth() + 1, d = date.getDate();
        if ((m === 12 && d >= 20) || (m === 1 && d === 1)) return 'newyear';
        if (m === 2 && d === 14) return 'valentine';
        if (m === 10 && d === 31) return 'halloween';
        if (m === 12 || m <= 2) return 'winter';
        if (m >= 6 && m <= 8) return 'summer';
        return '';
    }
    const OCCASION_TAGS = {
        newyear: ['christmas', 'holiday', 'winter'],
        winter: ['winter', 'christmas'],
        summer: ['summer', 'beach', 'frozen', 'refreshing', 'fresh'],
        valentine: ['datenight', 'passion'],
        halloween: ['halloween']
    };
    // Vibe filters in game.js that fit each occasion.
    const OCCASION_VIBE = { newyear: 'winter', winter: 'winter', summer: 'summer', valentine: 'romantic', halloween: '' };

    function tagsOf(drink) {
        return String(drink && drink.strTags || '').split(',').map(tag => tag.trim().toLowerCase()).filter(Boolean);
    }
    function fitsOccasion(drink, occasion, vibeMatch) {
        if (!occasion) return false;
        const tags = tagsOf(drink);
        if ((OCCASION_TAGS[occasion] || []).some(tag => tags.includes(tag))) return true;
        const vibe = OCCASION_VIBE[occasion];
        return Boolean(vibe && typeof vibeMatch === 'function' && vibeMatch(drink, vibe));
    }
    // Days since 1970-01-01 in the viewer's local calendar: the pick changes at local midnight.
    function localDayNumber(date) {
        return Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86400000);
    }
    function dayHash(day) {
        let h = (day * 2654435761) >>> 0;
        h ^= h >>> 16;
        return Math.imul(h, 2246822507) >>> 0;
    }

    /**
     * Deterministic for a given date and bar: prefers what the bar can make (else the closest
     * recipes), then the occasion/season. `missingCount(drink)` returns how many ingredients are
     * missing (null/undefined when the bar is empty). Returns {drink, reason, occasion}.
     */
    function pickDailyCocktail(drinks, date, { missingCount, vibeMatch } = {}) {
        const pool = (Array.isArray(drinks) ? drinks : []).filter(d => d && d.idDrink)
            .slice().sort((a, b) => String(a.idDrink).localeCompare(String(b.idDrink)));
        if (!pool.length) return null;
        const when = date instanceof Date && !Number.isNaN(date.getTime()) ? date : new Date();
        const occasion = occasionFor(when);
        let candidates = pool, reason = 'all';
        if (typeof missingCount === 'function') {
            const scored = pool.map(drink => ({ drink, missing: missingCount(drink) }))
                .filter(row => Number.isFinite(row.missing));
            if (scored.length) {
                const best = Math.min(...scored.map(row => row.missing));
                candidates = scored.filter(row => row.missing === best).map(row => row.drink);
                reason = best === 0 ? 'ready' : 'closest';
            }
        }
        const seasonal = candidates.filter(drink => fitsOccasion(drink, occasion, vibeMatch));
        const chosenPool = seasonal.length ? seasonal : candidates;
        const drink = chosenPool[dayHash(localDayNumber(when)) % chosenPool.length];
        return { drink, reason, occasion: seasonal.length ? occasion : '' };
    }

    // --- AI Barmen preference context --------------------------------------------------------
    const TASTE_EN = { Sert: 'strong', Tatlı: 'sweet', Ekşi: 'sour', Ferah: 'refreshing' };
    function clip(text, max) {
        if (text.length <= max) return text;
        const cut = text.slice(0, max - 1);
        const space = cut.lastIndexOf(' ');
        return (space > max * 0.6 ? cut.slice(0, space) : cut).replace(/[,;:\s]+$/, '') + '…';
    }
    /**
     * Short (<= maxLength) summary of taste preferences and the latest like/dislike per recipe
     * from the personal notebook. Contains recipe names and tastes only: no notes, no dates.
     */
    function preferenceSummary(preferences, history, { language = 'tr', maxLength = 200 } = {}) {
        const en = language === 'en';
        const prefs = preferences && typeof preferences === 'object' ? preferences : {};
        const parts = [];
        const tastes = (Array.isArray(prefs.tastes) ? prefs.tastes : []).filter(t => TASTE_EN[t]);
        if (tastes.length) parts.push((en ? 'Likes ' : 'Sevdiği tatlar: ') + tastes.map(t => en ? TASTE_EN[t] : t.toLocaleLowerCase('tr-TR')).join(', '));
        if (prefs.alcohol === 'Non_Alcoholic') parts.push(en ? 'prefers alcohol-free' : 'alkolsüz tercih ediyor');
        else if (prefs.alcohol === 'Alcoholic') parts.push(en ? 'prefers alcoholic drinks' : 'alkollü tercih ediyor');
        const latest = new Map();
        (Array.isArray(history) ? history : []).slice().sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)).forEach(row => {
            if (row && row.rating && row.drinkId && !latest.has(row.drinkId)) latest.set(row.drinkId, row);
        });
        const clean = name => String(name || '').replace(/[\r\n\t]+/g, ' ').replace(/[;|]/g, ',').trim().slice(0, 40);
        const liked = [...latest.values()].filter(r => r.rating === 'like').map(r => clean(r.name)).filter(Boolean).slice(0, 4);
        const disliked = [...latest.values()].filter(r => r.rating === 'dislike').map(r => clean(r.name)).filter(Boolean).slice(0, 3);
        if (liked.length) parts.push((en ? 'liked: ' : 'beğendi: ') + liked.join(', '));
        if (disliked.length) parts.push((en ? 'disliked: ' : 'beğenmedi: ') + disliked.join(', '));
        return clip(parts.join('; '), maxLength);
    }

    // --- Party planner (Reserve) ------------------------------------------------------------
    const PARTY_LIMITS = { minGuests: 10, maxGuests: 50, minPerGuest: 1, maxPerGuest: 4, maxRecipes: 3 };
    function clampInt(value, min, max) {
        const n = Math.round(Number(value));
        return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : min;
    }
    // "Juice of 1" counts fruit, not volume: listed with the fruit count instead of totalled.
    const UNMEASURABLE = /\b(?:fill|top(?:\s+up)?|to taste|full glass|parts?|juice of)\b/i;
    // Solids are totalled in cl-equivalents but are not bought in bottles.
    function bottleSizeCl(name) {
        const n = norm(name);
        if (/\b(?:sugar|salt|powder(?:ed)?)\b/.test(n) && !/syrup/.test(n)) return null;
        if (/bitters/.test(n)) return 20;
        if (/(juice|soda|water|tonic|cola|coke|ginger ale|ginger beer|lemonade|sprite|7-up|milk|cream|cider|beer|tea|coffee)/.test(n)) return 100;
        return 70;
    }
    /**
     * guests 10–50, drinksPerGuest 1–4, 1–3 recipes. Servings are split evenly across recipes.
     * measureToCl(measure) -> cl or null; owned(name) -> bool; cost(drink) -> per-serving cost|null.
     */
    function planParty({ guests, drinksPerGuest, recipes, measureToCl, owned, cost } = {}) {
        const g = clampInt(guests, PARTY_LIMITS.minGuests, PARTY_LIMITS.maxGuests);
        const per = clampInt(drinksPerGuest, PARTY_LIMITS.minPerGuest, PARTY_LIMITS.maxPerGuest);
        const list = [...new Map((Array.isArray(recipes) ? recipes : []).filter(d => d && d.idDrink).map(d => [d.idDrink, d])).values()]
            .slice(0, PARTY_LIMITS.maxRecipes);
        const totalServings = g * per;
        const result = { guests: g, drinksPerGuest: per, totalServings, recipes: [], ingredients: [], unmeasured: [], missing: [], estimatedCost: null };
        if (!list.length) return result;
        const base = Math.floor(totalServings / list.length), extra = totalServings % list.length;
        const totals = new Map(), unmeasured = new Map();
        let costSum = 0, costKnown = true;
        list.forEach((drink, index) => {
            const servings = base + (index < extra ? 1 : 0);
            result.recipes.push({ id: drink.idDrink, name: drink.strDrink || '', servings });
            const perServing = typeof cost === 'function' ? cost(drink) : null;
            if (Number.isFinite(perServing)) costSum += perServing * servings; else costKnown = false;
            for (let i = 1; i <= 15; i++) {
                const name = String(drink[`strIngredient${i}`] || '').trim();
                if (!name) continue;
                const measure = String(drink[`strMeasure${i}`] || '').trim();
                // measureToCl guesses 10 cl for "fill"/"top"/"to taste" (fine for cost estimates);
                // relative "parts" have no absolute volume. Those are listed, not totalled.
                const cl = typeof measureToCl === 'function' && measure && !UNMEASURABLE.test(measure) ? measureToCl(measure) : null;
                const id = norm(name);
                if (Number.isFinite(cl) && cl > 0) {
                    const row = totals.get(id) || { name, cl: 0, recipes: [] };
                    row.cl += cl * servings;
                    if (!row.recipes.includes(drink.strDrink)) row.recipes.push(drink.strDrink);
                    totals.set(id, row);
                } else {
                    const row = unmeasured.get(id) || { name, uses: [] };
                    row.uses.push({ recipe: drink.strDrink || '', measure, servings });
                    unmeasured.set(id, row);
                }
            }
        });
        result.ingredients = [...totals.values()].map(row => {
            const size = bottleSizeCl(row.name);
            const cl = Math.round(row.cl * 10) / 10;
            return { name: row.name, cl, bottleCl: size, bottles: size ? Math.max(1, Math.ceil(cl / size - 1e-9)) : null, recipes: row.recipes,
                owned: typeof owned === 'function' ? Boolean(owned(row.name)) : false };
        }).sort((a, b) => b.cl - a.cl || a.name.localeCompare(b.name));
        result.unmeasured = [...unmeasured.values()].map(row => ({ ...row,
            owned: typeof owned === 'function' ? Boolean(owned(row.name)) : false }));
        const seen = new Set();
        result.missing = [...result.ingredients, ...result.unmeasured].filter(row => !row.owned)
            .map(row => row.name).filter(name => !seen.has(norm(name)) && seen.add(norm(name)));
        result.estimatedCost = costKnown ? Math.round(costSum) : null;
        return result;
    }

    const api = { SUBSTITUTE_RULES, substituteRuleFor, findSubstitution, occasionFor, fitsOccasion, pickDailyCocktail,
        localDayNumber, preferenceSummary, PARTY_LIMITS, planParty, bottleSizeCl };
    root.BarSmart = api;
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
