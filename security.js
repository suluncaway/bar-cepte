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
            if (row.servings !== undefined && ![1,2,4,8].includes(row.servings)) throw new Error('Invalid servings');
            return {id: text(row.id, 100, true), drinkId: text(row.drinkId, 100, true),
                name: text(row.name, 200, true), createdAt: row.createdAt,
                taste: row.taste || '', rating: row.rating ?? null, note: text(row.note || '', 300),
                ...(row.servings === undefined ? {} : {servings:row.servings})};
        });
        if (new Set(result.map(row => row.id)).size !== result.length) throw new Error('Tekrarlanan geçmiş kimliği');
        return result.sort((a, b) => b.createdAt - a.createdAt);
    }
    function inventory(value) {
        if (!value || typeof value !== 'object' || Array.isArray(value) || !Array.isArray(value.items) || value.items.length > 1000) throw new Error('Invalid inventory');
        const items = value.items.map(row => {
            if (!row || typeof row !== 'object' || !Number.isFinite(row.quantity) || row.quantity < 0 || row.quantity > 1000000 || !['ml','cl','oz','g','piece'].includes(row.unit)) throw new Error('Invalid stock quantity or unit');
            return {ingredient:text(row.ingredient,200,true),quantity:Math.round(row.quantity*1000)/1000,unit:row.unit};
        });
        if (new Set(items.map(row=>row.ingredient.trim().toLowerCase())).size !== items.length) throw new Error('Duplicate stock ingredient');
        const deductions=stringList(value.deductions || [],100);
        const receipts=value.receipts || [];
        if (!Array.isArray(receipts) || receipts.length > 100) throw new Error('Invalid stock receipts');
        const checked=receipts.map(row=>{
            if (!row || typeof row !== 'object' || !Number.isSafeInteger(row.createdAt) || row.createdAt<0 || typeof row.undone!=='boolean') throw new Error('Invalid stock receipt');
            const changes=inventory({items:row.changes}).items;
            if (!changes.length || changes.length>50 || changes.some(item=>item.quantity<=0)) throw new Error('Invalid stock changes');
            const id=text(row.id,100,true);
            if (!deductions.includes(id)) throw new Error('Missing stock event');
            return {id,name:text(row.name,200,true),createdAt:row.createdAt,undone:row.undone,changes};
        });
        if (new Set(checked.map(row=>row.id)).size!==checked.length) throw new Error('Duplicate stock receipt');
        return {items, deductions, ...(value.receipts===undefined?{}:{receipts:checked})};
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
            ...(value.history === undefined ? {} : {history: history(value.history)}),
            ...(value.inventory === undefined ? {} : {inventory: inventory(value.inventory)})
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
    const api = { MAX_BACKUP_LENGTH, stringList, recipe, recipes, backup, readStored, safeImage, releaseURL, preferences, history, inventory };
    root.BarSecurity = api;
    if (typeof module !== 'undefined') module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
