/* Input boundaries shared by the web UI and regression tests. No executable imports. */
(function (root) {
    'use strict';
    const MAX_BACKUP_LENGTH = 8 * 1024 * 1024;
    function text(value, max, required = false) {
        if (typeof value !== 'string' || value.length > max || (required && !value.trim())) {
            throw new Error('Geçersiz metin alanı');
        }
        return value;
    }
    function stringList(value, max = 1000) {
        if (!Array.isArray(value) || value.length > max) throw new Error('Geçersiz liste');
        return [...new Set(value.map(item => text(item, 200, true)))];
    }
    function safeImage(src) {
        if (typeof src !== 'string' || src.length > 2 * 1024 * 1024) return '';
        if (/^data:image\/(?:png|jpeg|webp|gif);base64,[a-z0-9+/=\s]+$/i.test(src)) return src;
        try {
            const url = new URL(src);
            return url.protocol === 'https:' && url.hostname === 'www.thecocktaildb.com' &&
                !url.username && !url.password && !url.port && url.pathname.startsWith('/images/')
                ? url.href : '';
        } catch { return ''; }
    }
    function recipe(value) {
        if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Geçersiz tarif');
        const id = text(value.idDrink, 100, true);
        if (!/^custom_[a-zA-Z0-9_-]+$/.test(id)) throw new Error('Geçersiz tarif kimliği');
        const ingredients = stringList(value.customIngredients, 50);
        if (!ingredients.length) throw new Error('Malzeme gerekli');
        return {
            idDrink: id, isCustom: true, strCategory: 'Özel',
            strDrink: text(value.strDrink, 200, true),
            strInstructions: text(value.strInstructions, 10000, true),
            strServing: text(value.strServing || '', 1000),
            strAlcoholic: value.strAlcoholic === 'Non_Alcoholic' ? 'Non_Alcoholic' : 'Alcoholic',
            strGlass: text(value.strGlass || 'Cocktail glass', 100),
            strDrinkThumb: safeImage(value.strDrinkThumb),
            customIngredients: ingredients
        };
    }
    function recipes(value) {
        if (!Array.isArray(value) || value.length > 300) throw new Error('Geçersiz tarif listesi');
        const result = value.map(recipe);
        if (new Set(result.map(r => r.idDrink)).size !== result.length) throw new Error('Tekrarlanan tarif kimliği');
        return result;
    }
    const TASTES = ['Sert', 'Tatlı', 'Ekşi', 'Ferah'];
    function preferences(value) {
        if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Geçersiz tercihler');
        const alcohol = value.alcohol || 'all';
        if (!['all', 'Alcoholic', 'Non_Alcoholic'].includes(alcohol)) throw new Error('Geçersiz tercih');
        const tastes = stringList(value.tastes || [], 4);
        if (tastes.some(taste => !TASTES.includes(taste))) throw new Error('Geçersiz tat');
        if (value.onboardingDone !== undefined && typeof value.onboardingDone !== 'boolean') throw new Error('Geçersiz rehber durumu');
        return {alcohol, tastes, onboardingDone: value.onboardingDone === true};
    }
    function history(value) {
        if (!Array.isArray(value) || value.length > 100) throw new Error('Geçersiz geçmiş');
        const result = value.map(row => {
            if (!row || typeof row !== 'object' || Array.isArray(row)) throw new Error('Geçersiz kayıt');
            if (!Number.isSafeInteger(row.createdAt) || row.createdAt < 0 || !Number.isFinite(new Date(row.createdAt).getTime())) throw new Error('Geçersiz tarih');
            if (![null, 'like', 'dislike'].includes(row.rating ?? null)) throw new Error('Geçersiz değerlendirme');
            if (row.taste && !TASTES.includes(row.taste)) throw new Error('Geçersiz tat');
            return {id: text(row.id, 100, true), drinkId: text(row.drinkId, 100, true),
                name: text(row.name, 200, true), createdAt: row.createdAt,
                taste: row.taste || '', rating: row.rating ?? null, note: text(row.note || '', 300)};
        });
        if (new Set(result.map(row => row.id)).size !== result.length) throw new Error('Tekrarlanan geçmiş kimliği');
        return result.sort((a, b) => b.createdAt - a.createdAt);
    }
    function backup(value) {
        if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Geçersiz yedek');
        // Validate the entire document before changing any application state.
        return {
            favorites: stringList(value.favorites || []),
            customs: recipes(value.customs || []),
            shopping: stringList(value.shopping || []),
            selected: stringList(value.selected || []),
            ...(value.preferences === undefined ? {} : {preferences: preferences(value.preferences)}),
            ...(value.history === undefined ? {} : {history: history(value.history)})
        };
    }
    function readStored(key, validate) {
        try {
            const raw = root.localStorage.getItem(key);
            if (!raw) return [];
            if (raw.length > MAX_BACKUP_LENGTH) return [];
            return validate(JSON.parse(raw));
        } catch { return []; }
    }
    function releaseURL(value) {
        try {
            const url = new URL(value);
            return url.protocol === 'https:' && url.hostname === 'github.com' &&
                !url.username && !url.password && !url.port &&
                url.pathname.startsWith('/suluncaway/bar-cepte/releases/')
                ? url.href : 'https://github.com/suluncaway/bar-cepte/releases/latest';
        } catch { return 'https://github.com/suluncaway/bar-cepte/releases/latest'; }
    }
    const api = { MAX_BACKUP_LENGTH, stringList, recipe, recipes, backup, readStored, safeImage, releaseURL, preferences, history };
    root.BarSecurity = api;
    if (typeof module !== 'undefined') module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
