// Bar Cepte — Akıllı Bar & Kokteyl Asistanı

// Temel Malzemeler Kataloğu
const baseIngredients = [
    { id: "Vodka", name: "Votka", emoji: "🍸", cat: "alkol", taste: "Sert", cal: 64 },
    { id: "Gin", name: "Cin", emoji: "🌲", cat: "alkol", taste: "Sert", cal: 64 },
    { id: "Rum", name: "Rom", emoji: "🏴‍☠️", cat: "alkol", taste: "Sert", cal: 64 },
    { id: "Tequila", name: "Tekila", emoji: "🌵", cat: "alkol", taste: "Sert", cal: 64 },
    { id: "Triple Sec", name: "Portakal Likörü", emoji: "🍊", cat: "alkol", taste: "Tatlı", cal: 100 },
    { id: "Whiskey", name: "Viski", emoji: "🥃", cat: "alkol", taste: "Sert", cal: 70 },
    { id: "Bourbon", name: "Burbon Viski", emoji: "🪵", cat: "alkol", taste: "Sert", cal: 70 },
    { id: "Amaretto", name: "Amaretto", emoji: "🌰", cat: "alkol", taste: "Tatlı", cal: 110 },
    { id: "Campari", name: "Campari", emoji: "❤️", cat: "alkol", taste: "Ekşi", cal: 80 },
    { id: "Sweet Vermouth", name: "Tatlı Vermut", emoji: "🍷", cat: "alkol", taste: "Tatlı", cal: 45 },
    { id: "Dry Vermouth", name: "Sek Vermut", emoji: "🍸", cat: "alkol", taste: "Ekşi", cal: 45 },
    { id: "Lime Juice", name: "Misket Limonu Suyu", emoji: "🟢", cat: "mutfak", taste: "Ekşi", cal: 8 },
    { id: "Lemon Juice", name: "Limon Suyu", emoji: "🟡", cat: "mutfak", taste: "Ekşi", cal: 7 },
    { id: "Orange Juice", name: "Portakal Suyu", emoji: "🍹", cat: "mutfak", taste: "Tatlı", cal: 45 },
    { id: "Cranberry Juice", name: "Kızılcık Suyu", emoji: "🍒", cat: "mutfak", taste: "Ekşi", cal: 46 },
    { id: "Pineapple Juice", name: "Ananas Suyu", emoji: "🍍", cat: "mutfak", taste: "Tatlı", cal: 50 },
    { id: "Grenadine", name: "Nar Şurubu", emoji: "🩸", cat: "mutfak", taste: "Tatlı", cal: 54 },
    { id: "Coca-Cola", name: "Kola", emoji: "🥤", cat: "mutfak", taste: "Tatlı", cal: 42 },
    { id: "Tonic Water", name: "Tonik", emoji: "🫧", cat: "mutfak", taste: "Ekşi", cal: 34 },
    { id: "Soda Water", name: "Maden Suyu", emoji: "💦", cat: "mutfak", taste: "Ferah", cal: 0 },
    { id: "Egg White", name: "Yumurta Akı", emoji: "🥚", cat: "mutfak", taste: "Ferah", cal: 15 },
    { id: "Salt", name: "Tuz", emoji: "🧂", cat: "mutfak", taste: "Sert", cal: 0 },
    { id: "Sugar", name: "Şeker", emoji: "🍬", cat: "mutfak", taste: "Tatlı", cal: 30 },
    { id: "Milk", name: "Süt", emoji: "🥛", cat: "mutfak", taste: "Tatlı", cal: 42 },
    { id: "Coffee", name: "Kahve", emoji: "☕", cat: "mutfak", taste: "Sert", cal: 2 },
    { id: "Mint", name: "Nane", emoji: "🍃", cat: "mutfak", taste: "Ferah", cal: 1 },
    { id: "Ice", name: "Buz", emoji: "🧊", cat: "mutfak", taste: "Ferah", cal: 0 }
];

let popularIngredients = [...baseIngredients];
let selectedIngredients = JSON.parse(localStorage.getItem('selectedIngredients')) || [];
let favoriteCocktails = JSON.parse(localStorage.getItem('favoriteCocktails')) || [];
let customRecipes = JSON.parse(localStorage.getItem('customRecipes')) || [];
let shoppingList = JSON.parse(localStorage.getItem('shoppingList')) || [];
let allCocktails = [];
let currentTab = "alkol";
let alcoholFilter = "all";
let tasteFilter = "all";
let onlyFavoritesFilter = false;
let db;
let wakeLock = null;
let deferredPwaPrompt = null;

// XSS Sanitizasyonu (Güvenlik Önlemi)
function escapeHTML(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// Bardak Tipi Sözlüğü
const glassTranslations = {
    "highball glass": "🥤 Uzun Bardak (Highball)",
    "cocktail glass": "🍸 Martini Kadehi",
    "old-fashioned glass": "🥃 Kısa Bardak",
    "whiskey glass": "🥃 Viski Bardağı",
    "collins glass": "🥤 Collins Bardağı",
    "shot glass": "🥃 Shot",
    "champagne flute": "🥂 Şampanya Kadehi",
    "hurricane glass": "🍹 Tropikal Bardak",
    "copper mug": "🪣 Bakır Kupa (Mule)",
    "margarita glass": "🍸 Margarita Kadehi",
    "punch bowl": "🥣 Panç Kasesi",
    "coffee mug": "☕ Sıcak Kupa",
    "irish coffee cup": "☕ İrlanda Kadehi",
    "white wine glass": "🍷 Şarap Kadehi",
    "beer mug": "🍺 Bira Bardağı"
};

// IndexedDB Başlatma
function initDB() {
    return new Promise((resolve) => {
        const request = indexedDB.open("BarCepteDB", 2);
        request.onupgradeneeded = e => {
            db = e.target.result;
            if (!db.objectStoreNames.contains("cocktails")) {
                db.createObjectStore("cocktails", { keyPath: "idDrink" });
            }
            if (!db.objectStoreNames.contains("custom_recipes")) {
                db.createObjectStore("custom_recipes", { keyPath: "idDrink" });
            }
        };
        request.onsuccess = e => { db = e.target.result; resolve(); };
        request.onerror = () => { resolve(); };
    });
}

function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Akıllı ve Hassas Malzeme Eşleme (False-positive engelleme)
function checkIngredientMatch(recipeIng, userIngId) {
    if (!recipeIng || !userIngId) return false;

    const r = recipeIng.trim().toLowerCase();
    const u = userIngId.trim().toLowerCase();

    if (r === u) return true;

    const foundIng = popularIngredients.find(pi => pi.id.toLowerCase() === u || pi.name.toLowerCase() === u);
    const candidateNames = [u];
    if (foundIng) {
        if (foundIng.id) candidateNames.push(foundIng.id.toLowerCase());
        if (foundIng.name) candidateNames.push(foundIng.name.toLowerCase());
    }

    for (const cand of candidateNames) {
        if (r === cand) return true;

        if (cand === "ice" || cand === "buz") {
            if (/\bjuice\b/i.test(r) && !/\bice\b/i.test(r)) return false;
            if (new RegExp(`\\b${escapeRegExp(cand)}\\b`, 'i').test(r)) return true;
            continue;
        }

        if (cand === "gin" || cand === "cin") {
            if (/\bginger\b/i.test(r) && !/\bgin\b/i.test(r)) return false;
            if (new RegExp(`\\b${escapeRegExp(cand)}\\b`, 'i').test(r)) return true;
            continue;
        }

        if (cand === "rum" || cand === "rom") {
            if (new RegExp(`\\b${escapeRegExp(cand)}\\b`, 'i').test(r)) return true;
            continue;
        }

        const regexCand = new RegExp(`\\b${escapeRegExp(cand)}\\b`, 'i');
        if (regexCand.test(r)) return true;

        const regexRecipe = new RegExp(`\\b${escapeRegExp(r)}\\b`, 'i');
        if (regexRecipe.test(cand)) return true;
    }

    return false;
}

// Barmen Modu: Ekran Uyanık Tutma (Wake Lock API)
async function toggleWakeLock() {
    const btn = document.getElementById('btn-wake-lock');
    const statusText = document.getElementById('wake-status');
    const icon = document.getElementById('wake-icon');

    if ('wakeLock' in navigator) {
        if (!wakeLock) {
            try {
                wakeLock = await navigator.wakeLock.request('screen');
                if (btn) btn.className = "pill-btn px-3 py-1.5 rounded-xl border border-amber-500 bg-amber-500/15 text-[11px] font-bold text-amber-300 flex items-center gap-1.5 shadow-sm";
                if (statusText) statusText.innerText = "Ekran Açık";
                if (icon) icon.innerText = "⚡";
                
                wakeLock.addEventListener('release', () => {
                    wakeLock = null;
                    if (btn) btn.className = "pill-btn px-3 py-1.5 rounded-xl border border-white/10 bg-white/5 text-[11px] font-semibold text-slate-300 flex items-center gap-1.5 hover:border-amber-500/40 hover:bg-white/10";
                    if (statusText) statusText.innerText = "Ekran Koru";
                    if (icon) icon.innerText = "💡";
                });
            } catch (err) {
                alert("Ekran kilidi bu cihazda başlatılamadı.");
            }
        } else {
            await wakeLock.release();
            wakeLock = null;
        }
    } else {
        alert("Tarayıcınız Ekran Uyanık Tutma (Screen Wake Lock) API'sini desteklemiyor.");
    }
}

// PWA Kurulum Yönetimi
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPwaPrompt = e;
    const btn = document.getElementById('btn-pwa-install');
    if (btn) btn.classList.remove('hidden');
});

function installPWA() {
    if (deferredPwaPrompt) {
        deferredPwaPrompt.prompt();
        deferredPwaPrompt.userChoice.then(() => {
            deferredPwaPrompt = null;
            const btn = document.getElementById('btn-pwa-install');
            if (btn) btn.classList.add('hidden');
        });
    }
}

// Porsiyon / Kişi Sayısına Göre Ölçü Hesaplayıcı
function scaleMeasure(measureStr, multiplier = 1) {
    if (!measureStr || multiplier === 1) return measureStr || '';
    
    return measureStr.replace(/(\d+\s+\d+\/\d+|\d+\/\d+|\d+(\.\d+)?)/g, match => {
        let val = 0;
        if (match.includes(' ') && match.includes('/')) {
            const [whole, frac] = match.split(' ');
            const [num, den] = frac.split('/');
            val = parseFloat(whole) + (parseFloat(num) / parseFloat(den));
        } else if (match.includes('/')) {
            const [num, den] = match.split('/');
            val = parseFloat(num) / parseFloat(den);
        } else {
            val = parseFloat(match);
        }
        const scaled = Math.round(val * multiplier * 10) / 10;
        return scaled % 1 === 0 ? scaled.toFixed(0) : scaled.toFixed(1);
    });
}

function changePortion(cardId, multiplier, btnEl) {
    const card = document.getElementById(cardId);
    if (!card) return;

    card.querySelectorAll('.portion-btn').forEach(b => {
        b.className = "portion-btn px-2 py-0.5 rounded-lg text-[10px] bg-black/40 text-slate-400 border border-white/5";
    });
    if (btnEl) btnEl.className = "portion-btn px-2 py-0.5 rounded-lg text-[10px] bg-amber-500/20 text-amber-400 border border-amber-500/40 font-bold";

    card.querySelectorAll('.measure-span').forEach(span => {
        const raw = span.getAttribute('data-raw');
        if (raw) {
            span.innerText = scaleMeasure(raw, multiplier);
        }
    });
}

function getTechniqueBadge(instructions) {
    if (!instructions) return "🥄 Karıştır";
    const inst = instructions.toLowerCase();
    if (/shake|çalkala/i.test(inst)) return "🧊 Shaker ile Çalkala";
    if (/blend|blender/i.test(inst)) return "🌪️ Blender ile Çek";
    if (/layer|float|katman/i.test(inst)) return "🍷 Katmanlayarak Dök";
    if (/stir|karıştır/i.test(inst)) return "🥄 Kaşıkla Karıştır";
    return "🍸 Bardağa Direkt Dök";
}

function getGlassBadge(glassStr) {
    if (!glassStr) return "🍸 Kokteyl Kadehi";
    const lower = glassStr.trim().toLowerCase();
    return glassTranslations[lower] || `🍸 ${escapeHTML(glassStr)}`;
}

// Türkçe Çeviri (Google Translate API + Cache)
async function translateToTurkish(text) {
    if (!text) return "Bilinmiyor.";

    let preProcessedText = text;
    const engGlossary = {
        "\\bmuddle\\b": "crush",
        "\\bmuddled\\b": "crushed",
        "\\bmuddling\\b": "crushing",
        "\\bdash\\b": "drop",
        "\\bdashes\\b": "drops",
        "\\bstrain\\b": "filter",
        "\\bon the rocks\\b": "over ice",
        "\\bgarnish\\b": "decorate",
        "\\bhighball\\b": "tall glass",
        "\\bold-fashioned\\b": "short glass",
        "\\bwedge\\b": "slice",
        "\\bzest\\b": "peel",
        "\\bbuild\\b": "mix directly",
        "\\bjigger\\b": "measure",
        "\\bparts\\b": "measures",
        "\\bpart\\b": "measure",
        "\\bsplash\\b": "small amount",
        "\\bfloat\\b": "pour gently on top"
    };

    for (const [engWord, simpleEng] of Object.entries(engGlossary)) {
        preProcessedText = preProcessedText.replace(new RegExp(engWord, "gi"), simpleEng);
    }

    try {
        const res = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=tr&dt=t&q=${encodeURIComponent(preProcessedText)}`);
        const data = await res.json();
        let translatedText = data[0].map(item => item[0]).join('');

        const trGlossary = {
            "ezmek": "tokmakla ezin",
            "ezin": "tokmakla ezin",
            "ezilmiş": "tokmakla ezilmiş",
            "damla": "damla (dash)",
            "filtre": "süzün (strain)",
            "filtreleyin": "süzün (strain)",
            "süsleyin": "süsleyin (garnish)",
            "uzun bardak bardağı": "uzun bardak (highball)",
            "uzun bardak": "uzun bardak (highball)",
            "kısa bardak bardağı": "kısa bardak (old fashioned)",
            "kısa bardak": "kısa bardak (old fashioned)",
            "ölçü": "ölçü (part)",
            "ölçüler": "ölçü (part)",
            "küçük miktar": "çok az miktar (splash)",
            "buzun üzerine": "bol buzlu bardağa",
            "üzerine nazikçe dökün": "üstüne yavaşça dökün (yüzdürün)"
        };

        for (const [badWord, goodWord] of Object.entries(trGlossary)) {
            translatedText = translatedText.replace(new RegExp(`\\b${badWord}\\b`, "gi"), goodWord);
        }

        return translatedText;
    } catch { 
        return text; 
    }
}

function autoExtractAllIngredients() {
    const existingIds = popularIngredients.map(i => i.id.toLowerCase());
    const newIngredientsMap = new Map();

    const allSources = [...allCocktails, ...customRecipes];

    allSources.forEach(drink => {
        let reqs = [];
        if (drink.isCustom && Array.isArray(drink.customIngredients)) {
            reqs = drink.customIngredients;
        } else {
            for (let i = 1; i <= 15; i++) {
                if (drink[`strIngredient${i}`]) reqs.push(drink[`strIngredient${i}`]);
            }
        }

        reqs.forEach(ing => {
            if (ing && ing.trim()) {
                const cleanIng = ing.replace(/^[\d\s\/.,-]+(ml|oz|cl|dash|dashes|tsp|tbsp|gr|shot)?\s*/i, '').trim() || ing.trim();
                const lowerIng = cleanIng.toLowerCase();
                
                if (!existingIds.includes(lowerIng) && !newIngredientsMap.has(lowerIng)) {
                    let isAlcohol = /(vodka|rum|gin|tequila|whiskey|liqueur|beer|wine|brandy|cognac|champagne|ale|stout|bourbon|scotch|amaretto|aperol|campari|vermouth|sec|schnapps|cider|rakı|raki|votka|viski|rom|cin|likör|bira|şarap)/i.test(lowerIng);
                    let isSweet = /(syrup|sugar|sweet|juice|cola|soda|grenadine|cream|honey|nectar|fruit|şeker|şurup|bal)/i.test(lowerIng);
                    let isSour = /(lemon|lime|sour|bitter|grapefruit|limon|ekşi)/i.test(lowerIng);

                    let cat = isAlcohol ? "alkol" : "mutfak";
                    let taste = isAlcohol ? "Sert" : "Ferah";
                    if (isSweet) taste = "Tatlı";
                    if (isSour) taste = "Ekşi";

                    let cal = isAlcohol ? 80 : (isSweet ? 45 : 10);
                    
                    let emoji = "🫙";
                    if (isAlcohol) {
                        if (/(beer|ale|stout|bira)/i.test(lowerIng)) emoji = "🍺";
                        else if (/(wine|champagne|şarap)/i.test(lowerIng)) emoji = "🍾";
                        else if (/(brandy|cognac|whiskey|bourbon|scotch|viski)/i.test(lowerIng)) emoji = "🥃";
                        else if (/(liqueur|amaretto|aperol|campari|vermouth|likör)/i.test(lowerIng)) emoji = "🍷";
                        else emoji = "🍶";
                    } else {
                        if (/(lemon|lime|limon)/i.test(lowerIng)) emoji = "🍋";
                        else if (/(orange|grapefruit|portakal)/i.test(lowerIng)) emoji = "🍊";
                        else if (/(apple|elma)/i.test(lowerIng)) emoji = "🍎";
                        else if (/(berry|cherry|strawberry|raspberry|çilek|vişne)/i.test(lowerIng)) emoji = "🍓";
                        else if (/(peach|apricot|şeftali|kayısı)/i.test(lowerIng)) emoji = "🍑";
                        else if (/(syrup|honey|nectar|şurup|bal)/i.test(lowerIng)) emoji = "🍯";
                        else if (/(sugar|şeker)/i.test(lowerIng)) emoji = "🍬";
                        else if (/(milk|cream|süt|krema)/i.test(lowerIng)) emoji = "🥛";
                        else if (/(coffee|espresso|kahve)/i.test(lowerIng)) emoji = "☕";
                        else if (/(tea|çay)/i.test(lowerIng)) emoji = "🍵";
                        else if (/(water|soda|su|maden)/i.test(lowerIng)) emoji = "💦";
                        else if (/(mint|leaves|nane)/i.test(lowerIng)) emoji = "🌿";
                        else if (/(juice|meyve suyu)/i.test(lowerIng)) emoji = "🧃";
                    }

                    newIngredientsMap.set(lowerIng, {
                        id: cleanIng,
                        name: cleanIng, 
                        emoji: emoji,
                        cat: cat,
                        taste: taste,
                        cal: cal
                    });
                    existingIds.push(lowerIng);
                }
            }
        });
    });

    const newIngs = Array.from(newIngredientsMap.values());
    popularIngredients.push(...newIngs);
}

function scrollIngredients(amount) {
    const container = document.getElementById('ingredients-container');
    if(container) container.scrollBy({ left: amount, behavior: 'smooth' });
}

function switchTab(tab) {
    currentTab = tab;
    ['tab-bar', 'tab-alkol', 'tab-mutfak', 'tab-favorites', 'tab-custom', 'tab-my-recipes', 'tab-shop', 'tab-sync'].forEach(t => {
        const el = document.getElementById(t);
        if(el) el.className = "text-slate-400 py-1.5 px-2.5 rounded-xl shrink-0 transition-all hover:text-white";
    });
    
    const activeTab = document.getElementById(`tab-${tab}`);
    if(activeTab) {
        activeTab.className = "bg-amber-500/15 text-amber-400 border border-amber-500/30 py-1.5 px-3 rounded-xl shrink-0 transition-all font-bold";
    }

    const sections = ['bar-dashboard', 'ingredients-section', 'custom-recipe-panel', 'my-recipes-panel', 'shopping-list-panel', 'sync-panel', 'recipes-display-sections'];
    sections.forEach(id => {
        const el = document.getElementById(id);
        if(el) el.classList.add('hidden');
    });

    if (tab === 'bar') { 
        document.getElementById('bar-dashboard').classList.remove('hidden'); 
        renderDashboard(); 
    } else if (tab === 'custom') {
        document.getElementById('custom-recipe-panel').classList.remove('hidden');
    } else if (tab === 'my-recipes') { 
        document.getElementById('my-recipes-panel').classList.remove('hidden'); 
        renderMyRecipes(); 
    } else if (tab === 'shop') { 
        document.getElementById('shopping-list-panel').classList.remove('hidden'); 
        renderShoppingList(); 
    } else if (tab === 'sync') {
        document.getElementById('sync-panel').classList.remove('hidden');
    } else if (tab === 'favorites') {
        onlyFavoritesFilter = true;
        document.getElementById('recipes-display-sections').classList.remove('hidden');
        updateFavoritesFilterUI();
        filterCocktails();
    } else {
        onlyFavoritesFilter = false;
        document.getElementById('ingredients-section').classList.remove('hidden');
        document.getElementById('recipes-display-sections').classList.remove('hidden');
        const ingSearch = document.getElementById('ing-search');
        if (ingSearch) ingSearch.value = ""; 
        renderIngredients();
        filterCocktails();
    }
}

function updateFavoritesFilterUI() {
    const favBtn = document.getElementById('btn-fav-filter');
    const favText = document.getElementById('fav-filter-text');
    if (favText) favText.innerText = `Favorilerim (${favoriteCocktails.length})`;
    
    if (favBtn) {
        if (onlyFavoritesFilter) {
            favBtn.className = "pill-btn px-3 py-1.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 shrink-0 flex items-center gap-1.5 font-bold shadow-sm";
        } else {
            favBtn.className = "pill-btn px-3 py-1.5 rounded-full bg-slate-900/80 text-rose-400 border border-white/10 shrink-0 flex items-center gap-1.5 hover:border-rose-500/40";
        }
    }
}

function toggleOnlyFavoritesFilter() {
    onlyFavoritesFilter = !onlyFavoritesFilter;
    if (onlyFavoritesFilter) {
        switchTab('favorites');
    } else {
        switchTab('alkol');
    }
}

function renderDashboard() {
    const total = popularIngredients.length;
    const selected = selectedIngredients.length;
    const rate = total > 0 ? Math.round((selected / total) * 100) : 0;
    
    const fillRateEl = document.getElementById('bar-fill-rate');
    if(fillRateEl) fillRateEl.innerText = `${rate}%`;
    
    const readyCountEl = document.getElementById('ready-count');
    const countReady = document.getElementById('count-ready') ? document.getElementById('count-ready').innerText : "0";
    if(readyCountEl) readyCountEl.innerText = `${countReady} Tarif`;

    const topContainer = document.getElementById('top-ingredients');
    if(topContainer) {
        topContainer.innerHTML = selectedIngredients.map(id => {
            const item = popularIngredients.find(pi => pi.id === id);
            const label = item ? `${item.emoji} ${escapeHTML(item.name)}` : escapeHTML(id);
            return `<span class="bg-slate-900/90 text-amber-300 border border-white/10 px-3 py-1.5 rounded-xl shadow-sm flex items-center gap-1.5 font-medium break-words">${label}</span>`;
        }).join('') || `<span class="text-slate-500 text-xs">Henüz barına malzeme eklemedin. 'Alkoller' veya 'Mutfak' sekmesinden malzeme seçebilirsin.</span>`;
    }
}

function setAlcoholFilter(filter) {
    alcoholFilter = filter;
    ['btn-all-alcohol', 'btn-alcoholic', 'btn-non-alcoholic'].forEach(id => {
        const el = document.getElementById(id);
        if(el) el.className = "px-2.5 py-1 rounded-lg text-slate-400 transition-all hover:text-white";
    });
    const activeId = filter === 'all' ? 'btn-all-alcohol' : filter === 'Alcoholic' ? 'btn-alcoholic' : 'btn-non-alcoholic';
    const activeEl = document.getElementById(activeId);
    if(activeEl) activeEl.className = "px-2.5 py-1 rounded-lg bg-amber-500 text-slate-950 font-bold transition-all shadow-sm";
    filterCocktails();
}

function setTasteFilter(taste, el) {
    tasteFilter = taste;
    document.querySelectorAll('.taste-btn').forEach(btn => {
        btn.className = "taste-btn pill-btn px-3 py-1.5 rounded-full bg-slate-900/80 text-slate-400 border border-white/10 shrink-0 hover:text-white hover:border-white/20";
    });
    const target = el || document.querySelector(`.taste-btn[data-taste="${taste}"]`);
    if(target) {
        target.className = "taste-btn pill-btn px-3 py-1.5 rounded-full bg-amber-500 text-slate-950 font-bold shrink-0 shadow-sm";
    }
    filterCocktails();
}

function renderIngredients() {
    const container = document.getElementById('ingredients-container');
    if (!container) return;
    container.innerHTML = '';
    
    const searchVal = document.getElementById('ing-search')?.value.toLowerCase().trim() || "";
    
    const filtered = popularIngredients
        .filter(i => i.cat === currentTab && (i.name.toLowerCase().includes(searchVal) || i.id.toLowerCase().includes(searchVal)))
        .sort((a, b) => {
            let aIsBase = baseIngredients.some(base => base.id === a.id);
            let bIsBase = baseIngredients.some(base => base.id === b.id);
            if (aIsBase && !bIsBase) return -1;
            if (!aIsBase && bIsBase) return 1;
            return a.name.localeCompare(b.name, 'tr');
        });
    
    filtered.forEach(ing => {
        const isSelected = selectedIngredients.includes(ing.id);
        const card = document.createElement('div');
        card.className = isSelected 
            ? "snap-center shrink-0 w-24 h-28 bg-gradient-to-b from-amber-500 to-amber-600 border border-amber-300 rounded-2xl flex flex-col items-center justify-center p-2 text-center gap-1 cursor-pointer text-slate-950 font-bold shadow-lg transition-transform active:scale-95 min-w-0"
            : "snap-center shrink-0 w-24 h-28 acrylic-card rounded-2xl flex flex-col items-center justify-center p-2 text-center gap-1 cursor-pointer text-slate-300 font-semibold hover:border-amber-500/30 transition-transform active:scale-95 min-w-0";
        
        card.innerHTML = `
            <div class="h-10 flex items-center justify-center mb-1 shrink-0">
                <img src="https://www.thecocktaildb.com/images/ingredients/${encodeURIComponent(ing.id)}-Small.png" 
                     alt="${escapeHTML(ing.name)}" 
                     class="max-h-full max-w-full object-contain drop-shadow-md"
                     loading="lazy"
                     onerror="this.outerHTML='<span class=\\'text-2xl\\'>${ing.emoji}</span>'">
            </div>
            <span class="text-[11px] break-words w-full px-1 line-clamp-2 leading-tight overflow-hidden">${escapeHTML(ing.name)}</span>
        `;
        
        card.onclick = () => {
            selectedIngredients = isSelected ? selectedIngredients.filter(i => i !== ing.id) : [...selectedIngredients, ing.id];
            try { localStorage.setItem('selectedIngredients', JSON.stringify(selectedIngredients)); } catch(e) {}
            renderIngredients();
            filterCocktails();
        };
        container.appendChild(card);
    });
}

function clearSelection() {
    if(selectedIngredients.length === 0) return;
    selectedIngredients = [];
    try { localStorage.setItem('selectedIngredients', JSON.stringify(selectedIngredients)); } catch(e) {}
    renderIngredients();
    filterCocktails();
}

function analyzeRecipe(drink) {
    let totalCal = 0;
    let tastes = { Sert: 0, Tatlı: 0, Ekşi: 0, Ferah: 0 };
    let reqs = drink.isCustom 
        ? (Array.isArray(drink.customIngredients) ? drink.customIngredients : [])
        : Array.from({length:15}, (_,i)=>drink[`strIngredient${i+1}`]).filter(Boolean);
    
    reqs.forEach(r => {
        const match = popularIngredients.find(pi => pi.id.toLowerCase() === r.toLowerCase() || pi.name.toLowerCase() === r.toLowerCase());
        if (match) {
            totalCal += match.cal;
            tastes[match.taste] += 1;
        } else {
            totalCal += 35; 
        }
    });

    let dominantTaste = Object.keys(tastes).reduce((a, b) => tastes[a] >= tastes[b] ? a : b);
    if (tastes[dominantTaste] === 0) dominantTaste = "Ferah";

    return { calories: totalCal, tasteProfile: dominantTaste };
}

// Akıllı Tavsiye Motoru: "Bunu Alırsan +X Tarif Açılır"
function updateSmartAdvice(missingMatches) {
    const banner = document.getElementById('smart-recommendation-banner');
    const adviceBox = document.getElementById('bar-advice-box');
    const adviceText = document.getElementById('bar-advice-text');

    if (!banner) return;

    if (selectedIngredients.length === 0 || missingMatches.length === 0) {
        banner.classList.add('hidden');
        if (adviceBox) adviceBox.classList.add('hidden');
        return;
    }

    const oneMissingDrinks = missingMatches.filter(m => m.missingList.length === 1);
    const votes = {};

    oneMissingDrinks.forEach(m => {
        const ing = m.missingList[0];
        votes[ing] = (votes[ing] || 0) + 1;
    });

    let bestIng = null;
    let maxVotes = 0;

    for (const [ing, count] of Object.entries(votes)) {
        if (count > maxVotes) {
            maxVotes = count;
            bestIng = ing;
        }
    }

    if (bestIng && maxVotes >= 1) {
        const encodedIng = encodeURIComponent(bestIng);
        const inShop = shoppingList.includes(bestIng);
        const safeBestIng = escapeHTML(bestIng);

        const html = `
            <div class="acrylic-card border-amber-500/30 p-4 rounded-3xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xl min-w-0 overflow-hidden">
                <div class="flex items-center gap-3.5 min-w-0">
                    <div class="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-xl shrink-0">
                        💡
                    </div>
                    <div class="min-w-0">
                        <p class="text-[10px] text-amber-400 font-bold uppercase tracking-wider">AKILLI BAR ÖNERİSİ</p>
                        <p class="text-xs text-slate-200 mt-0.5 break-words">
                            Barına sadece <b class="text-amber-400 font-bold">${safeBestIng}</b> eklersen hemen <b class="text-emerald-400 font-bold">+${maxVotes} yeni kokteyl</b> yapabileceksin!
                        </p>
                    </div>
                </div>
                <div class="flex gap-2 shrink-0 w-full sm:w-auto justify-end pt-1 sm:pt-0">
                    <button onclick="toggleShoppingList(decodeURIComponent('${encodedIng}'), event)" class="pill-btn text-xs bg-white/5 text-slate-300 border border-white/10 px-3 py-1.5 rounded-xl font-medium hover:border-amber-500/40">
                        ${inShop ? '🛒 Listede' : '🛒 Listeye Ekle'}
                    </button>
                    <button onclick="quickAddIngredientToBar(decodeURIComponent('${encodedIng}'), event)" class="pill-btn text-xs bg-amber-500 text-slate-950 font-bold px-3 py-1.5 rounded-xl hover:bg-amber-400">
                        + Bara Ekle
                    </button>
                </div>
            </div>
        `;

        banner.innerHTML = html;
        banner.classList.remove('hidden');

        if (adviceBox && adviceText) {
            adviceText.innerHTML = `Barına sadece <b class="text-amber-400">${safeBestIng}</b> alırsan, anında <b class="text-emerald-400">+${maxVotes} yeni kokteyl</b> hazırlayabilirsin!`;
            adviceBox.classList.remove('hidden');
        }
    } else {
        banner.classList.add('hidden');
        if (adviceBox) adviceBox.classList.add('hidden');
    }
}

function quickAddIngredientToBar(ingName, event) {
    if (event) event.stopPropagation();
    if (!selectedIngredients.includes(ingName)) {
        selectedIngredients.push(ingName);
        try { localStorage.setItem('selectedIngredients', JSON.stringify(selectedIngredients)); } catch(e) {}
        renderIngredients();
        filterCocktails();
        renderDashboard();
    }
}

function filterCocktails() {
    const readyContainer = document.getElementById('recipes-ready');
    const missingContainer = document.getElementById('recipes-missing');
    const cocktailSearch = document.getElementById('cocktail-search')?.value.toLowerCase().trim() || "";

    if (!readyContainer || !missingContainer) return;

    updateFavoritesFilterUI();

    if (cocktailSearch && document.getElementById('recipes-display-sections')?.classList.contains('hidden')) {
        switchTab('alkol');
    }

    if (selectedIngredients.length === 0 && !cocktailSearch && !onlyFavoritesFilter) {
        readyContainer.innerHTML = `<div class="col-span-full text-center py-8 text-slate-500 text-xs">Yukarıdan malzeme seçerek veya kokteyl adı aratarak kokteylleri keşfedebilirsin.</div>`;
        missingContainer.innerHTML = `<div class="col-span-full text-center py-8 text-slate-500 text-xs">Henüz seçili malzeme yok.</div>`;
        const countReadyEl = document.getElementById('count-ready');
        if (countReadyEl) countReadyEl.innerText = "0";
        
        const titleMissing = document.getElementById('title-missing');
        if(titleMissing) titleMissing.innerHTML = `<span class="w-2 h-2 rounded-full bg-rose-400"></span> Yaklaştığın Tarifler (1-4 Eksik) <span id="count-missing" class="text-[10px] bg-rose-500/10 text-rose-400 px-2 py-0.5 rounded-full border border-rose-500/20 font-bold">0</span>`;

        updateSmartAdvice([]);
        if (currentTab === 'bar') renderDashboard();
        return;
    }

    let readyMatches = [];
    let missingMatches = [];
    let pool = [...customRecipes, ...allCocktails].filter(d => alcoholFilter === 'all' || d.strAlcoholic === alcoholFilter);

    if (onlyFavoritesFilter) {
        pool = pool.filter(d => favoriteCocktails.includes(d.idDrink));
    }

    pool.forEach(d => {
        let isNameMatch = cocktailSearch ? d.strDrink.toLowerCase().includes(cocktailSearch) : true;
        if (!isNameMatch) return; 

        let reqs = [];
        if (d.isCustom && Array.isArray(d.customIngredients)) {
            reqs = d.customIngredients.map(i => i.trim()).filter(Boolean);
        } else {
            for (let i = 1; i <= 15; i++) {
                const ing = d[`strIngredient${i}`];
                if (ing && ing.trim()) reqs.push(ing.trim());
            }
        }

        if (reqs.length === 0) return;

        let missing = reqs.filter(r => !selectedIngredients.some(s => checkIngredientMatch(r, s)));
        let hasAtLeastOneMatch = reqs.some(r => selectedIngredients.some(s => checkIngredientMatch(r, s)));

        let analysis = analyzeRecipe(d);
        d.computedCalories = analysis.calories;
        d.computedTaste = analysis.tasteProfile;

        if (tasteFilter === 'all' || d.computedTaste === tasteFilter) {
            if (cocktailSearch || onlyFavoritesFilter) {
                if (missing.length === 0) {
                    readyMatches.push(d);
                } else {
                    missingMatches.push({ drink: d, missingList: missing });
                }
            } else {
                if (missing.length === 0) {
                    readyMatches.push(d);
                } else if (missing.length > 0 && missing.length <= 4 && hasAtLeastOneMatch) {
                    missingMatches.push({ drink: d, missingList: missing });
                }
            }
        }
    });

    const sortFn = (a, b) => {
        const idA = a.idDrink || a.drink?.idDrink;
        const idB = b.idDrink || b.drink?.idDrink;
        return (favoriteCocktails.includes(idB) ? 1 : 0) - (favoriteCocktails.includes(idA) ? 1 : 0);
    };

    readyMatches.sort(sortFn);
    
    missingMatches.sort((a,b) => {
        if(a.missingList.length !== b.missingList.length) return a.missingList.length - b.missingList.length;
        return sortFn(a.drink, b.drink);
    });

    const countReadyEl = document.getElementById('count-ready');
    if (countReadyEl) countReadyEl.innerText = readyMatches.length;

    const titleMissing = document.getElementById('title-missing');
    if(titleMissing) {
        if(cocktailSearch) {
            titleMissing.innerHTML = `<span class="w-2 h-2 rounded-full bg-rose-400"></span> Arama Sonuçları (Eksik Malzemeli) <span id="count-missing" class="text-[10px] bg-rose-500/10 text-rose-400 px-2 py-0.5 rounded-full border border-rose-500/20 font-bold">${missingMatches.length}</span>`;
        } else if (onlyFavoritesFilter) {
            titleMissing.innerHTML = `<span class="w-2 h-2 rounded-full bg-rose-400"></span> Favorilerim (Eksik Malzemeli) <span id="count-missing" class="text-[10px] bg-rose-500/10 text-rose-400 px-2 py-0.5 rounded-full border border-rose-500/20 font-bold">${missingMatches.length}</span>`;
        } else {
            titleMissing.innerHTML = `<span class="w-2 h-2 rounded-full bg-rose-400"></span> Yaklaştığın Tarifler (1-4 Eksik) <span id="count-missing" class="text-[10px] bg-rose-500/10 text-rose-400 px-2 py-0.5 rounded-full border border-rose-500/20 font-bold">${missingMatches.length}</span>`;
        }
    }

    renderLists(readyMatches, readyContainer, false);
    renderLists(missingMatches, missingContainer, true);
    
    updateSmartAdvice(missingMatches);

    if (currentTab === 'bar') renderDashboard();
}

function renderMyRecipes() {
    const container = document.getElementById('my-recipes-container');
    if (!container) return;
    
    if (customRecipes.length === 0) {
        container.innerHTML = `<div class="col-span-full text-center py-8 text-slate-500 text-xs">Henüz kendi özel tarifini eklemedin. '✨ Tarif Ekle' sekmesinden ekleyebilirsin.</div>`;
        return;
    }
    
    customRecipes.forEach(d => {
        let analysis = analyzeRecipe(d);
        d.computedCalories = analysis.calories;
        d.computedTaste = analysis.tasteProfile;
    });

    renderLists(customRecipes, container, false);
}

function renderLists(items, container, isMissingList) {
    container.innerHTML = "";
    if (items.length === 0) {
        container.innerHTML = `<div class="col-span-full text-center py-8 text-slate-500 text-xs">Bu kriterlere uygun kokteyl bulunamadı.</div>`;
        return;
    }

    const fragment = document.createDocumentFragment();
    items.slice(0, 40).forEach(item => {
        const d = isMissingList ? item.drink : item;
        const missingList = isMissingList ? item.missingList : [];
        const isFav = favoriteCocktails.includes(d.idDrink);

        let ingredientsHTML = "";
        let rawIngredientsData = [];

        if (d.isCustom && Array.isArray(d.customIngredients)) {
            d.customIngredients.forEach(ing => {
                const parts = ing.match(/^([\d\s\/.,-]+(?:ml|oz|cl|dash|dashes|tsp|tbsp|gr|shot)?)\s*(.*)$/i);
                const measure = parts && parts[1] ? parts[1].trim() : '';
                const name = parts && parts[2] ? parts[2].trim() : ing.trim();
                rawIngredientsData.push({ name: name || ing, measure: measure });
            });
        } else {
            for (let i = 1; i <= 15; i++) {
                const ing = d[`strIngredient${i}`];
                const measure = d[`strMeasure${i}`] ? d[`strMeasure${i}`].trim() : '';
                if (ing && ing.trim()) {
                    rawIngredientsData.push({ name: ing.trim(), measure: measure });
                }
            }
        }

        rawIngredientsData.forEach(pair => {
            const isSel = selectedIngredients.some(s => checkIngredientMatch(pair.name, s));
            let cls = isSel 
                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" 
                : "bg-black/30 text-slate-400 border-white/5";

            if (isMissingList && missingList.some(m => m.toLowerCase() === pair.name.toLowerCase())) {
                cls = "bg-rose-500/15 text-rose-300 border-rose-500/30";
            }
            if (currentTab === 'my-recipes') {
                cls = "bg-black/30 text-slate-400 border-white/5";
            }

            const measureText = pair.measure 
                ? `<b class="measure-span text-amber-300 ml-1 font-mono text-[10px]" data-raw="${escapeHTML(pair.measure)}">${escapeHTML(pair.measure)}</b>` 
                : '';

            ingredientsHTML += `
                <span class="inline-flex items-center ${cls} text-[11px] px-2.5 py-1 rounded-xl border m-0.5 shadow-sm max-w-full overflow-hidden">
                    <span class="break-words">${escapeHTML(pair.name)}</span>${measureText}
                </span>
            `;
        });

        let missingTextHTML = isMissingList ? missingList.map(m => {
            const encodedM = encodeURIComponent(m);
            const inShop = shoppingList.includes(m);
            const safeM = escapeHTML(m);
            return `
            <div class="flex items-center justify-between gap-2 mt-1 bg-rose-950/20 px-3 py-1.5 rounded-xl border border-rose-500/20 min-w-0">
                <p class="text-[11px] text-rose-300 font-medium break-words min-w-0">⚠️ Eksik: ${safeM}</p>
                <button onclick="toggleShoppingList(decodeURIComponent('${encodedM}'), event)" class="pill-btn text-[10px] bg-black/40 border border-white/10 text-slate-300 px-2.5 py-1 rounded-lg hover:border-amber-500/40 shrink-0">
                    ${inShop ? '🛒 Çıkar' : '➕ Alışverişe Ekle'}
                </button>
            </div>
            `;
        }).join('') : '';

        const card = document.createElement('div');
        const cardId = `card_${d.idDrink.replace(/[^a-zA-Z0-9_]/g, '_')}`;
        card.id = cardId;
        card.className = "acrylic-card rounded-3xl p-4 shadow-xl cursor-pointer select-none relative animate-fade-in flex flex-col min-w-0 overflow-hidden";
        
        const drinkIdEncoded = encodeURIComponent(d.idDrink);
        const glassBadge = getGlassBadge(d.strGlass);
        const techniqueBadge = getTechniqueBadge(d.strInstructions);
        const safeDrinkName = escapeHTML(d.strDrink);
        const safeServing = escapeHTML(d.strServing);
        const safeInstructions = d.isCustom ? escapeHTML(d.strInstructions) : (d.strInstructionsTR ? escapeHTML(d.strInstructionsTR) : 'Çevriliyor...');

        card.innerHTML = `
            ${d.strDrinkThumb 
                ? `<img src="${d.strDrinkThumb}" class="w-full h-40 object-contain bg-black/30 rounded-2xl mb-3 shadow-inner" loading="lazy" onerror="this.outerHTML='<div class=\\'w-full h-40 bg-black/30 rounded-2xl mb-3 flex items-center justify-center text-4xl\\'>🍹</div>'">` 
                : `<div class="w-full h-40 bg-black/30 rounded-2xl mb-3 flex items-center justify-center text-4xl">🍹</div>`}
            
            <button onclick="toggleFavorite(decodeURIComponent('${drinkIdEncoded}'), event)" class="pill-btn absolute top-6 right-6 bg-slate-950/80 p-2 rounded-full border border-white/10 text-sm z-10 shadow-lg hover:border-rose-500/50">${isFav ? '❤️' : '🤍'}</button>
            
            ${d.isCustom ? `
            <button onclick="shareCustomRecipe(decodeURIComponent('${drinkIdEncoded}'), event)" class="pill-btn absolute top-6 left-6 bg-slate-950/80 p-2 rounded-full border border-white/10 text-sm z-10 shadow-lg hover:border-amber-500">📤</button>
            <button onclick="deleteCustomRecipe(decodeURIComponent('${drinkIdEncoded}'), event)" class="pill-btn absolute top-6 left-16 bg-rose-500/20 text-rose-400 p-2 rounded-full border border-rose-500/30 text-sm z-10 shadow-lg">🗑️</button>
            ` : ''}
            
            <div class="flex justify-between items-start mt-auto min-w-0 gap-2">
                <div class="min-w-0 flex-1">
                    <div class="flex flex-wrap gap-1.5 mb-1.5">
                        <span class="text-[10px] font-bold bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded-lg border border-amber-500/20 uppercase tracking-wider">${escapeHTML(d.computedTaste)}</span>
                        <span class="text-[10px] font-semibold bg-black/30 text-slate-400 px-2 py-0.5 rounded-lg border border-white/5 font-mono">🔥 ~${d.computedCalories} kcal</span>
                    </div>
                    <h3 class="font-extrabold text-white text-base leading-snug break-words hyphens-auto text-title-responsive">${safeDrinkName}</h3>
                    <p class="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1 break-words">${glassBadge}</p>
                </div>
                <span class="text-amber-400 text-xs font-bold toggle-icon shrink-0 pl-1 pt-1">Detay ▼</span>
            </div>
            
            ${isMissingList ? `<div class="mt-2.5 pt-2 border-t border-white/5 flex flex-col gap-1 min-w-0">${missingTextHTML}</div>` : ''}
            
            <div class="details-section mt-2.5 space-y-3 min-w-0 overflow-hidden">
                <!-- Porsiyon Kontrolü (Taşmayan Esnek Düzen) -->
                <div class="flex flex-wrap items-center justify-between gap-1.5 bg-black/30 p-2 rounded-2xl border border-white/5" onclick="event.stopPropagation()">
                    <span class="text-[11px] text-slate-400 font-medium shrink-0">👥 Porsiyon:</span>
                    <div class="flex flex-wrap gap-1 shrink-0">
                        <button onclick="changePortion('${cardId}', 1, this)" class="portion-btn pill-btn px-2.5 py-0.5 rounded-lg text-[10px] bg-amber-500/20 text-amber-400 border border-amber-500/40 font-bold">1x</button>
                        <button onclick="changePortion('${cardId}', 2, this)" class="portion-btn pill-btn px-2.5 py-0.5 rounded-lg text-[10px] bg-black/40 text-slate-400 border border-white/5">2x</button>
                        <button onclick="changePortion('${cardId}', 4, this)" class="portion-btn pill-btn px-2.5 py-0.5 rounded-lg text-[10px] bg-black/40 text-slate-400 border border-white/5">4x</button>
                        <button onclick="changePortion('${cardId}', 8, this)" class="portion-btn pill-btn px-2.5 py-0.5 rounded-lg text-[10px] bg-black/40 text-slate-400 border border-white/5">8x Parti</button>
                    </div>
                </div>

                <!-- Malzemeler ve Ölçüler -->
                <div class="space-y-1 min-w-0">
                    <span class="text-[11px] text-slate-400 font-medium block">Malzemeler & Ölçüler:</span>
                    <div class="flex flex-wrap">${ingredientsHTML}</div>
                </div>

                <!-- Bardak & Teknik -->
                <div class="flex flex-wrap gap-1.5 pt-1">
                    <span class="text-[10px] bg-white/5 text-slate-300 border border-white/10 px-2.5 py-1 rounded-xl flex items-center gap-1">${techniqueBadge}</span>
                    <span class="text-[10px] bg-white/5 text-slate-300 border border-white/10 px-2.5 py-1 rounded-xl flex items-center gap-1">${glassBadge}</span>
                </div>

                ${d.strServing ? `<div class="bg-amber-500/10 border border-amber-500/20 p-2.5 rounded-2xl text-[11px] text-amber-300 italic break-words">💡 <b>Servis/Garnitür:</b> ${safeServing}</div>` : ''}
                
                <p class="text-xs text-slate-300 instruction-text bg-black/30 p-3 rounded-2xl border border-white/5 leading-relaxed break-words">
                    <b class="text-slate-400 text-[11px] block mb-1 uppercase tracking-wider font-semibold">Hazırlanışı:</b>
                    <span>${safeInstructions}</span>
                </p>
            </div>
        `;

        card.onclick = async (e) => {
            if (e.target.closest('button')) return;
            const details = card.querySelector('.details-section');
            const icon = card.querySelector('.toggle-icon');
            const span = card.querySelector('.instruction-text span');
            if (!details.classList.contains('open')) {
                details.classList.add('open');
                icon.innerText = "Kapat ▲";
                if (!d.isCustom) {
                    if (!d.strInstructionsTR) {
                        span.innerText = "Çevriliyor...";
                        d.strInstructionsTR = await translateToTurkish(d.strInstructions);
                    }
                    span.innerText = escapeHTML(d.strInstructionsTR);
                }
            } else {
                details.classList.remove('open');
                icon.innerText = "Detay ▼";
            }
        };
        fragment.appendChild(card);
    });
    container.appendChild(fragment);
}

function shareCustomRecipe(id, event) {
    if(event) event.stopPropagation();
    const recipe = customRecipes.find(r => r.idDrink === id);
    if (!recipe) return;

    const reqs = Array.isArray(recipe.customIngredients) ? recipe.customIngredients : [];
    const ingredientsText = reqs.map(i => `- ${i}`).join('\n');
    const shareText = `🍹 *${recipe.strDrink}* (Özel Tarif)\n\n🔹 *Malzemeler:*\n${ingredientsText}\n\n🔸 *Hazırlanışı:*\n${recipe.strInstructions}\n\n_Bar Cepte ile hazırlandı!_`;

    if (navigator.share) {
        navigator.share({
            title: recipe.strDrink,
            text: shareText
        }).catch(err => console.log('Paylaşım iptal:', err));
    } else if (navigator.clipboard) {
        navigator.clipboard.writeText(shareText);
        alert("Tarif panoya kopyalandı!");
    } else {
        alert(shareText);
    }
}

function deleteCustomRecipe(id, event) {
    if(event) event.stopPropagation();
    if(confirm("Bu özel tarifi silmek istediğine emin misin?")) {
        customRecipes = customRecipes.filter(r => r.idDrink !== id);
        try { localStorage.setItem('customRecipes', JSON.stringify(customRecipes)); } catch(e) {}
        
        try {
            if (db) {
                const tx = db.transaction("custom_recipes", "readwrite");
                tx.objectStore("custom_recipes").delete(id);
            }
        } catch (e) { console.error("IDB Silme Hatası:", e); }

        filterCocktails();
        if(currentTab === 'my-recipes') renderMyRecipes();
    }
}

function toggleFavorite(id, event) {
    if(event) event.stopPropagation();
    favoriteCocktails = favoriteCocktails.includes(id) ? favoriteCocktails.filter(f => f !== id) : [...favoriteCocktails, id];
    try { localStorage.setItem('favoriteCocktails', JSON.stringify(favoriteCocktails)); } catch(e) {}
    updateFavoritesFilterUI();
    filterCocktails();
}

function toggleShoppingList(item, event) {
    if(event) event.stopPropagation();
    shoppingList = shoppingList.includes(item) ? shoppingList.filter(i => i !== item) : [...shoppingList, item];
    try { localStorage.setItem('shoppingList', JSON.stringify(shoppingList)); } catch(e) {}
    filterCocktails();
    if (currentTab === 'shop') renderShoppingList();
}

function clearShoppingList() {
    if (shoppingList.length === 0) return;
    if (confirm("Alışveriş listesindeki tüm malzemeleri silmek istediğinize emin misiniz?")) {
        shoppingList = [];
        try { localStorage.setItem('shoppingList', JSON.stringify(shoppingList)); } catch(e) {}
        renderShoppingList();
        filterCocktails();
    }
}

function renderShoppingList() {
    const container = document.getElementById('shopping-list-container');
    if (!container) return;
    if (shoppingList.length === 0) {
        container.innerHTML = `<p class="text-center py-8 text-slate-500 text-xs">Alışveriş listeniz boş. Eksik malzemelerden 'Alışverişe Ekle' butonuna basarak liste oluşturabilirsiniz.</p>`;
        return;
    }
    container.innerHTML = "";
    shoppingList.forEach(item => {
        const row = document.createElement('div');
        row.className = "flex items-center justify-between gap-2 bg-black/30 p-3 rounded-2xl border border-white/5 shadow-sm min-w-0";
        const encodedItem = encodeURIComponent(item);
        const safeItem = escapeHTML(item);
        row.innerHTML = `
            <div class="flex items-center gap-2 min-w-0">
                <span class="text-amber-400 shrink-0">🛒</span>
                <span class="capitalize text-slate-200 font-semibold text-xs break-words min-w-0">${safeItem}</span>
            </div>
            <div class="flex gap-2 shrink-0">
                <button onclick="quickAddIngredientToBar(decodeURIComponent('${encodedItem}'), event); toggleShoppingList(decodeURIComponent('${encodedItem}'), event)" class="pill-btn text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 text-xs font-semibold px-2.5 py-1 rounded-xl hover:bg-emerald-500/20">
                    ✓ Aldım
                </button>
                <button onclick="toggleShoppingList(decodeURIComponent('${encodedItem}'), event)" class="pill-btn text-rose-400 text-xs font-semibold px-2 py-1 hover:text-rose-300">
                    Sil
                </button>
            </div>
        `;
        container.appendChild(row);
    });
}

function compressImage(file, maxWidth = 480, maxHeight = 480, quality = 0.75) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (e) => {
            const img = new Image();
            img.src = e.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > maxWidth) {
                        height = Math.round((height * maxWidth) / width);
                        width = maxWidth;
                    }
                } else {
                    if (height > maxHeight) {
                        width = Math.round((width * maxHeight) / height);
                        height = maxHeight;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL('image/jpeg', quality));
            };
            img.onerror = () => resolve('');
        };
        reader.onerror = () => resolve('');
    });
}

async function saveCustomRecipe() {
    const name = document.getElementById('custom-name')?.value.trim();
    const ingredientsRaw = document.getElementById('custom-ingredients')?.value || "";
    const instructions = document.getElementById('custom-instructions')?.value.trim();
    const serving = document.getElementById('custom-serving')?.value.trim() || "";
    const alcoholicSelect = document.getElementById('custom-alcoholic');
    const isAlcoholic = alcoholicSelect ? alcoholicSelect.value : "Alcoholic";
    const glassSelect = document.getElementById('custom-glass');
    const glassType = glassSelect ? glassSelect.value : "Cocktail glass";
    const imageInput = document.getElementById('custom-image-input');

    const ingredients = ingredientsRaw.split(',').map(i => i.trim()).filter(Boolean);

    if(!name || !instructions || ingredients.length === 0) {
        return alert("Lütfen tarif adı, en az bir malzeme ve hazırlanışını doldurun!");
    }

    let base64Image = "";
    if (imageInput && imageInput.files && imageInput.files[0]) {
        base64Image = await compressImage(imageInput.files[0], 480, 480, 0.75);
    }

    const newRecipe = {
        idDrink: "custom_" + Date.now(),
        strDrink: name,
        strCategory: "Özel",
        strAlcoholic: isAlcoholic,
        strGlass: glassType,
        strInstructions: instructions,
        strServing: serving,
        strDrinkThumb: base64Image,
        isCustom: true,
        customIngredients: ingredients
    };

    customRecipes.push(newRecipe);

    try {
        localStorage.setItem('customRecipes', JSON.stringify(customRecipes));
    } catch(err) {
        try {
            const stripped = customRecipes.map(r => ({ ...r, strDrinkThumb: "" }));
            localStorage.setItem('customRecipes', JSON.stringify(stripped));
        } catch(e) {}
    }

    try {
        if (db) {
            const tx = db.transaction("custom_recipes", "readwrite");
            tx.objectStore("custom_recipes").put(newRecipe);
        }
    } catch (e) { console.error("IDB Kayıt Hatası:", e); }

    autoExtractAllIngredients();
    renderIngredients();

    document.getElementById('custom-name').value = "";
    document.getElementById('custom-ingredients').value = "";
    document.getElementById('custom-instructions').value = "";
    document.getElementById('custom-serving').value = "";
    if (imageInput) imageInput.value = "";

    alert("Özel tarif başarıyla kaydedildi!");
    
    switchTab('my-recipes');
    filterCocktails();
}

async function exportUserData() {
    const data = { favorites: favoriteCocktails, customs: customRecipes, shopping: shoppingList };
    const encrypted = btoa(unescape(encodeURIComponent(JSON.stringify(data))));
    
    try {
        if (navigator.clipboard) {
            await navigator.clipboard.writeText(encrypted);
            alert("Yedekleme kodu panoya kopyalandı!");
        } else {
            throw new Error("Clipboard unavailable");
        }
    } catch(err) {
        const input = document.getElementById('sync-data-input');
        if (input) {
            input.value = encrypted;
            input.select();
            alert("Yedekleme kodu aşağıdaki kutuya yazıldı. Buradan kopyalayabilirsiniz.");
        }
    }
}

function importUserData() {
    const input = document.getElementById('sync-data-input')?.value.trim();
    if(!input) return alert("Lütfen geçerli bir yedekleme kodu yapıştırın.");
    try {
        const decrypted = JSON.parse(decodeURIComponent(escape(atob(input))));
        if(Array.isArray(decrypted.favorites)) favoriteCocktails = decrypted.favorites;
        if(Array.isArray(decrypted.customs)) customRecipes = decrypted.customs;
        if(Array.isArray(decrypted.shopping)) shoppingList = decrypted.shopping;
        
        try {
            localStorage.setItem('favoriteCocktails', JSON.stringify(favoriteCocktails));
            localStorage.setItem('customRecipes', JSON.stringify(customRecipes));
            localStorage.setItem('shoppingList', JSON.stringify(shoppingList));
        } catch(e) {}
        
        if (db) {
            const tx = db.transaction("custom_recipes", "readwrite");
            const store = tx.objectStore("custom_recipes");
            customRecipes.forEach(recipe => store.put(recipe));
        }
        
        alert("Senkronizasyon başarılı!");
        location.reload();
    } catch {
        alert("Geçersiz veya bozuk yedekleme kodu!");
    }
}

function pickRandomCocktail() {
    const pool = [...customRecipes, ...allCocktails];
    if (pool.length === 0) return alert("Tarifler henüz yüklenmedi, lütfen bekleyin.");
    
    const randomDrink = pool[Math.floor(Math.random() * pool.length)];
    const searchInput = document.getElementById('cocktail-search');
    
    if (searchInput) {
        switchTab('alkol');
        searchInput.value = randomDrink.strDrink;
        filterCocktails();
        
        setTimeout(() => {
            const displaySec = document.getElementById('recipes-display-sections');
            if (displaySec) displaySec.scrollIntoView({ behavior: 'smooth' });
            
            const firstCard = document.querySelector('#recipes-ready > div') || document.querySelector('#recipes-missing > div');
            if (firstCard) {
                const details = firstCard.querySelector('.details-section');
                if (details && !details.classList.contains('open')) {
                    firstCard.click();
                }
            }
        }, 200);
    }
}

document.addEventListener("DOMContentLoaded", async () => {
    await initDB();
    fetchDataWithIndexedDB();
    updateFavoritesFilterUI();
});

async function fetchDataWithIndexedDB() {
    const statusEl = document.getElementById('status');
    if(statusEl) statusEl.innerText = "Veritabanı denetleniyor...";

    try {
        if (db) {
            try {
                const customTx = db.transaction("custom_recipes", "readonly");
                const customStore = customTx.objectStore("custom_recipes");
                const customReq = customStore.getAll();
                
                await new Promise((resolve) => {
                    customReq.onsuccess = () => {
                        if (customReq.result && customReq.result.length > 0) {
                            customRecipes = customReq.result;
                            try { localStorage.setItem('customRecipes', JSON.stringify(customRecipes)); } catch(e) {}
                        }
                        resolve();
                    };
                    customReq.onerror = () => resolve();
                });
            } catch(e) {}
        }

        if (db) {
            const tx = db.transaction("cocktails", "readonly");
            const store = tx.objectStore("cocktails");
            const localCount = await new Promise(r => {
                const req = store.count();
                req.onsuccess = () => r(req.result);
                req.onerror = () => r(0);
            });

            if (localCount > 0) {
                const getAllReq = db.transaction("cocktails", "readonly").objectStore("cocktails").getAll();
                allCocktails = await new Promise(r => {
                    getAllReq.onsuccess = () => r(getAllReq.result || []);
                    getAllReq.onerror = () => r([]);
                });
                
                autoExtractAllIngredients();
                renderIngredients(); 
                filterCocktails();
                
                if(statusEl) statusEl.innerText = `${allCocktails.length + customRecipes.length} Tarif Hazır`;
                updateDataInBackground();
                return;
            }
        }

        if(statusEl) statusEl.innerText = "İlk kurulum yapılıyor...";
        await fetchAndStoreData();

    } catch (err) {
        console.error("Veri yükleme hatası:", err);
        if(statusEl) statusEl.innerText = "Çevrimdışı Mod";
        autoExtractAllIngredients();
        renderIngredients();
        filterCocktails();
    }
}

async function fetchAndStoreData() {
    const statusEl = document.getElementById('status');
    const letters = 'abcdefghijklmnopqrstuvwxyz'.split('');
    let apiDrinks = [];

    const chunkSize = 5;
    for (let i = 0; i < letters.length; i += chunkSize) {
        const chunk = letters.slice(i, i + chunkSize);
        const percent = Math.round((i / letters.length) * 100);
        if (statusEl) statusEl.innerText = `Tarifler indiriliyor (%${percent})...`;

        const promises = chunk.map(async (letter) => {
            try {
                const r = await fetch(`https://www.thecocktaildb.com/api/json/v1/1/search.php?f=${letter}`);
                if (!r.ok) return [];
                const d = await r.json();
                return d.drinks || [];
            } catch(e) {
                return [];
            }
        });

        const results = await Promise.all(promises);
        results.forEach(list => apiDrinks.push(...list));
    }

    const uniqueDrinks = new Map();
    apiDrinks.forEach(drink => uniqueDrinks.set(drink.idDrink, drink));
    allCocktails = Array.from(uniqueDrinks.values());

    if (allCocktails.length > 0 && db) {
        try {
            const writeTx = db.transaction("cocktails", "readwrite");
            const writeStore = writeTx.objectStore("cocktails");
            allCocktails.forEach(drink => writeStore.put(drink));
        } catch(e) {}
    }

    autoExtractAllIngredients();
    renderIngredients();
    filterCocktails();

    if(statusEl) statusEl.innerText = `${allCocktails.length + customRecipes.length} Tarif Hazır`;
}

async function updateDataInBackground() {
    try {
        const letters = 'abcdefghijklmnopqrstuvwxyz'.split('');
        let apiDrinks = [];

        const chunkSize = 6;
        for (let i = 0; i < letters.length; i += chunkSize) {
            const chunk = letters.slice(i, i + chunkSize);
            const promises = chunk.map(async (letter) => {
                try {
                    const r = await fetch(`https://www.thecocktaildb.com/api/json/v1/1/search.php?f=${letter}`);
                    if (!r.ok) return [];
                    const d = await r.json();
                    return d.drinks || [];
                } catch(e) { return []; }
            });
            const results = await Promise.all(promises);
            results.forEach(list => apiDrinks.push(...list));
            await new Promise(res => setTimeout(res, 60));
        }

        const uniqueDrinks = new Map();
        apiDrinks.forEach(drink => uniqueDrinks.set(drink.idDrink, drink));
        const newCocktails = Array.from(uniqueDrinks.values());

        if(newCocktails.length > allCocktails.length) {
            if (db) {
                const writeTx = db.transaction("cocktails", "readwrite");
                const writeStore = writeTx.objectStore("cocktails");
                newCocktails.forEach(drink => writeStore.put(drink));
            }
            
            allCocktails = newCocktails;
            autoExtractAllIngredients();
            renderIngredients();
            filterCocktails();
            if(currentTab === 'my-recipes') renderMyRecipes();
            
            const statusEl = document.getElementById('status');
            if(statusEl) statusEl.innerText = `${allCocktails.length + customRecipes.length} Tarif Güncellendi`;
        }
    } catch (error) {}
}
