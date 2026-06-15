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
let db;

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
    });
}

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

    allCocktails.forEach(drink => {
        for (let i = 1; i <= 15; i++) {
            const ing = drink[`strIngredient${i}`];
            if (ing && ing.trim()) {
                const cleanIng = ing.trim();
                const lowerIng = cleanIng.toLowerCase();
                
                if (!existingIds.includes(lowerIng) && !newIngredientsMap.has(lowerIng)) {
                    let isAlcohol = /(vodka|rum|gin|tequila|whiskey|liqueur|beer|wine|brandy|cognac|champagne|ale|stout|bourbon|scotch|amaretto|aperol|campari|vermouth|sec|schnapps|cider)/i.test(lowerIng);
                    let isSweet = /(syrup|sugar|sweet|juice|cola|soda|grenadine|cream|honey|nectar|fruit)/i.test(lowerIng);
                    let isSour = /(lemon|lime|sour|bitter|grapefruit)/i.test(lowerIng);

                    let cat = isAlcohol ? "alkol" : "mutfak";
                    let taste = isAlcohol ? "Sert" : "Ferah";
                    if (isSweet) taste = "Tatlı";
                    if (isSour) taste = "Ekşi";

                    let cal = isAlcohol ? 80 : (isSweet ? 45 : 10);
                    
                    let emoji = "🫙";
                    if (isAlcohol) {
                        if (/(beer|ale|stout)/i.test(lowerIng)) emoji = "🍺";
                        else if (/(wine|champagne)/i.test(lowerIng)) emoji = "🍾";
                        else if (/(brandy|cognac|whiskey|bourbon|scotch)/i.test(lowerIng)) emoji = "🥃";
                        else if (/(liqueur|amaretto|aperol|campari|vermouth)/i.test(lowerIng)) emoji = "🍷";
                        else emoji = "🍶";
                    } else {
                        if (/(lemon|lime)/i.test(lowerIng)) emoji = "🍋";
                        else if (/(orange|grapefruit)/i.test(lowerIng)) emoji = "🍊";
                        else if (/(apple)/i.test(lowerIng)) emoji = "🍎";
                        else if (/(berry|cherry|strawberry|raspberry)/i.test(lowerIng)) emoji = "🍓";
                        else if (/(peach|apricot)/i.test(lowerIng)) emoji = "🍑";
                        else if (/(syrup|honey|nectar)/i.test(lowerIng)) emoji = "🍯";
                        else if (/(sugar)/i.test(lowerIng)) emoji = "🍬";
                        else if (/(milk|cream)/i.test(lowerIng)) emoji = "🥛";
                        else if (/(coffee|espresso)/i.test(lowerIng)) emoji = "☕";
                        else if (/(tea)/i.test(lowerIng)) emoji = "🍵";
                        else if (/(water|soda)/i.test(lowerIng)) emoji = "💦";
                        else if (/(mint|leaves)/i.test(lowerIng)) emoji = "🌿";
                        else if (/(juice)/i.test(lowerIng)) emoji = "🧃";
                    }

                    newIngredientsMap.set(lowerIng, {
                        id: cleanIng,
                        name: cleanIng, 
                        emoji: emoji,
                        cat: cat,
                        taste: taste,
                        cal: cal
                    });
                }
            }
        }
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
    ['tab-bar', 'tab-alkol', 'tab-mutfak', 'tab-custom', 'tab-my-recipes', 'tab-shop', 'tab-sync'].forEach(t => {
        const el = document.getElementById(t);
        if(el) el.className = "text-slate-400 pb-1 px-1 shrink-0";
    });
    
    const activeTab = document.getElementById(`tab-${tab}`);
    if(activeTab) activeTab.className = "border-b-2 border-amber-500 text-amber-500 pb-1 px-1 shrink-0";

    const sections = ['bar-dashboard', 'ingredients-section', 'custom-recipe-panel', 'my-recipes-panel', 'shopping-list-panel', 'sync-panel', 'recipes-display-sections'];
    sections.forEach(id => {
        const el = document.getElementById(id);
        if(el) el.classList.add('hidden');
    });

    if (tab === 'bar') { document.getElementById('bar-dashboard').classList.remove('hidden'); renderDashboard(); }
    else if (tab === 'custom') document.getElementById('custom-recipe-panel').classList.remove('hidden');
    else if (tab === 'my-recipes') { document.getElementById('my-recipes-panel').classList.remove('hidden'); renderMyRecipes(); }
    else if (tab === 'shop') { document.getElementById('shopping-list-panel').classList.remove('hidden'); renderShoppingList(); }
    else if (tab === 'sync') document.getElementById('sync-panel').classList.remove('hidden');
    else {
        document.getElementById('ingredients-section').classList.remove('hidden');
        document.getElementById('recipes-display-sections').classList.remove('hidden');
        document.getElementById('ing-search').value = ""; 
        renderIngredients();
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
        topContainer.innerHTML = selectedIngredients.slice(0, 5).map(id => 
            `<span class="bg-slate-800 text-amber-400 border border-slate-700 px-2.5 py-1 rounded-lg shadow-sm">${id}</span>`
        ).join('') || "Henüz malzeme seçmedin.";
    }
}

function setAlcoholFilter(filter) {
    alcoholFilter = filter;
    ['btn-all-alcohol', 'btn-alcoholic', 'btn-non-alcoholic'].forEach(id => {
        const el = document.getElementById(id);
        if(el) el.className = "px-2.5 py-1 rounded text-slate-400";
    });
    const activeId = filter === 'all' ? 'btn-all-alcohol' : filter === 'Alcoholic' ? 'btn-alcoholic' : 'btn-non-alcoholic';
    const activeEl = document.getElementById(activeId);
    if(activeEl) activeEl.className = "px-2.5 py-1 rounded bg-amber-500 text-slate-950";
    filterCocktails();
}

function setTasteFilter(taste) {
    tasteFilter = taste;
    document.querySelectorAll('.taste-btn').forEach(btn => {
        btn.className = "taste-btn px-2.5 py-1 rounded-full bg-slate-900 text-slate-400 border border-slate-800 shrink-0";
    });
    event.target.className = "taste-btn px-2.5 py-1 rounded-full bg-slate-800 text-amber-400 border border-amber-500/20 shrink-0";
    filterCocktails();
}

function renderIngredients() {
    const container = document.getElementById('ingredients-container');
    if (!container) return;
    container.innerHTML = '';
    
    const searchVal = document.getElementById('ing-search')?.value.toLowerCase() || "";
    
    const filtered = popularIngredients
        .filter(i => i.cat === currentTab && i.name.toLowerCase().includes(searchVal))
        .sort((a, b) => {
            let aIsBase = baseIngredients.some(base => base.id === a.id);
            let bIsBase = baseIngredients.some(base => base.id === b.id);
            if (aIsBase && !bIsBase) return -1;
            if (!aIsBase && bIsBase) return 1;
            return a.name.localeCompare(b.name);
        });
    
    filtered.forEach(ing => {
        const isSelected = selectedIngredients.includes(ing.id);
        const card = document.createElement('div');
        card.className = isSelected 
            ? "snap-center shrink-0 w-24 h-28 bg-amber-500 border-2 border-amber-300 rounded-xl flex flex-col items-center justify-center p-2 text-center gap-1 cursor-pointer text-slate-950 font-black shadow-lg"
            : "snap-center shrink-0 w-24 h-28 bg-slate-900 border border-slate-700 rounded-xl flex flex-col items-center justify-center p-2 text-center gap-1 cursor-pointer text-slate-300 font-bold";
        
        card.innerHTML = `
            <div class="h-10 flex items-center justify-center mb-1">
                <img src="https://www.thecocktaildb.com/images/ingredients/${encodeURIComponent(ing.id)}-Small.png" 
                     alt="${ing.name}" 
                     class="max-h-full max-w-full object-contain drop-shadow-md"
                     loading="lazy"
                     onerror="this.outerHTML='<span class=\\'text-2xl\\'>${ing.emoji}</span>'">
            </div>
            <span class="text-[10px] break-words w-full px-1">${ing.name}</span>
        `;
        
        card.onclick = () => {
            selectedIngredients = isSelected ? selectedIngredients.filter(i => i !== ing.id) : [...selectedIngredients, ing.id];
            localStorage.setItem('selectedIngredients', JSON.stringify(selectedIngredients));
            renderIngredients();
            setTimeout(() => filterCocktails(), 50);
        };
        container.appendChild(card);
    });
}

function clearSelection() {
    if(selectedIngredients.length === 0) return;
    selectedIngredients = [];
    localStorage.setItem('selectedIngredients', JSON.stringify(selectedIngredients));
    renderIngredients();
    filterCocktails();
}

function analyzeRecipe(drink) {
    let totalCal = 0;
    let tastes = { Sert: 0, Tatlı: 0, Ekşi: 0, Ferah: 0 };
    let reqs = drink.isCustom ? drink.customIngredients : Array.from({length:15}, (_,i)=>drink[`strIngredient${i+1}`]).filter(Boolean);
    
    reqs.forEach(r => {
        const match = popularIngredients.find(pi => r.toLowerCase() === pi.id.toLowerCase() || r.toLowerCase() === pi.name.toLowerCase());
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

function filterCocktails() {
    const readyContainer = document.getElementById('recipes-ready');
    const missingContainer = document.getElementById('recipes-missing');
    const cocktailSearch = document.getElementById('cocktail-search')?.value.toLowerCase().trim() || "";

    if (!readyContainer || !missingContainer) return;

    if (selectedIngredients.length === 0 && !cocktailSearch) {
        readyContainer.innerHTML = `<div class="col-span-full text-center py-4 text-slate-500 text-xs">Malzeme seçin veya kokteyl arayın.</div>`;
        missingContainer.innerHTML = `<div class="col-span-full text-center py-4 text-slate-500 text-xs">Malzeme seçin veya kokteyl arayın.</div>`;
        document.getElementById('count-ready').innerText = "0";
        
        const titleMissing = document.getElementById('title-missing');
        if(titleMissing) titleMissing.innerHTML = `🔴 Yaklaştığın Tarifler (1-4 Eksik) <span id="count-missing" class="text-[10px] bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/20">0</span>`;

        if (currentTab === 'bar') renderDashboard();
        return;
    }

    let readyMatches = [];
    let missingMatches = [];
    let pool = [...customRecipes, ...allCocktails].filter(d => alcoholFilter === 'all' || d.strAlcoholic === alcoholFilter);

    pool.forEach(d => {
        let isNameMatch = cocktailSearch ? d.strDrink.toLowerCase().includes(cocktailSearch) : true;
        if (!isNameMatch) return; 

        let reqs = d.isCustom ? d.customIngredients.map(i=>i.toLowerCase()) : [];
        if (!d.isCustom) {
            for (let i = 1; i <= 15; i++) {
                if (d[`strIngredient${i}`]) reqs.push(d[`strIngredient${i}`].toLowerCase().trim());
            }
        }

        let missing = reqs.filter(r => !selectedIngredients.some(s => r.includes(s.toLowerCase())));
        let hasAtLeastOneMatch = reqs.some(r => selectedIngredients.some(s => r.includes(s.toLowerCase())));

        let analysis = analyzeRecipe(d);
        d.computedCalories = analysis.calories;
        d.computedTaste = analysis.tasteProfile;

        if (tasteFilter === 'all' || d.computedTaste === tasteFilter) {
            if (cocktailSearch) {
                if (missing.length === 0 && reqs.length > 0) {
                    readyMatches.push(d);
                } else {
                    missingMatches.push({ drink: d, missingList: missing });
                }
            } else {
                if (missing.length === 0 && reqs.length > 0) {
                    readyMatches.push(d);
                } else if (missing.length > 0 && missing.length <= 4 && hasAtLeastOneMatch) {
                    missingMatches.push({ drink: d, missingList: missing });
                }
            }
        }
    });

    const sortFn = (a, b) => favoriteCocktails.includes(b.idDrink || b.drink.idDrink) - favoriteCocktails.includes(a.idDrink || a.drink.idDrink);
    readyMatches.sort(sortFn);
    
    missingMatches.sort((a,b) => {
        if(a.missingList.length !== b.missingList.length) return a.missingList.length - b.missingList.length;
        return sortFn(a.drink, b.drink);
    });

    document.getElementById('count-ready').innerText = readyMatches.length;

    const titleMissing = document.getElementById('title-missing');
    if(titleMissing) {
        if(cocktailSearch) {
            titleMissing.innerHTML = `🔴 Arama Sonuçları (Eksik Malzemeli) <span id="count-missing" class="text-[10px] bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/20">${missingMatches.length}</span>`;
        } else {
            titleMissing.innerHTML = `🔴 Yaklaştığın Tarifler (1-4 Eksik) <span id="count-missing" class="text-[10px] bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/20">${missingMatches.length}</span>`;
        }
    }

    renderLists(readyMatches, readyContainer, false);
    renderLists(missingMatches, missingContainer, true);
    
    if (currentTab === 'bar') renderDashboard();
}

function renderMyRecipes() {
    const container = document.getElementById('my-recipes-container');
    if (!container) return;
    
    if (customRecipes.length === 0) {
        container.innerHTML = `<div class="col-span-full text-center py-4 text-slate-500 text-xs">Henüz kendi tarifini eklemedin.</div>`;
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
        container.innerHTML = `<div class="col-span-full text-center py-4 text-slate-500 text-xs">Sonuç yok.</div>`;
        return;
    }

    const fragment = document.createDocumentFragment();
    items.slice(0, 30).forEach(item => {
        const d = isMissingList ? item.drink : item;
        const missingList = isMissingList ? item.missingList : [];
        const isFav = favoriteCocktails.includes(d.idDrink);

        let ingHTML = "";
        let reqs = d.isCustom ? d.customIngredients : Array.from({length:15}, (_,i)=>d[`strIngredient${i+1}`]).filter(Boolean);
        
        reqs.forEach(req => {
            const isSel = selectedIngredients.some(s => req.toLowerCase().includes(s.toLowerCase()));
            let cls = isSel ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-slate-950 text-slate-400 border-slate-800";
            if (isMissingList && missingList.some(m => m.toLowerCase() === req.toLowerCase())) {
                cls = "bg-rose-500/20 text-rose-400 border-rose-500/30";
            }
            if(currentTab === 'my-recipes') {
                cls = "bg-slate-950 text-slate-400 border-slate-800";
            }
            ingHTML += `<span class="inline-block ${cls} text-[10px] px-2 py-0.5 rounded border m-0.5">${req}</span>`;
        });

        let missingTextHTML = isMissingList ? missingList.map(m => `
            <div class="flex items-center justify-between mt-1">
                <p class="text-[10px] text-rose-400">⚠️ Eksik: ${m}</p>
                <button onclick="toggleShoppingList('${m}', event)" class="text-[10px] bg-slate-950 border border-slate-800 text-slate-300 px-2 py-1 rounded-lg hover:border-amber-500">
                    ${shoppingList.includes(m) ? '🛒 Çıkar' : '➕ Ekle'}
                </button>
            </div>
        `).join('') : '';

        const card = document.createElement('div');
        card.className = "bg-slate-900 rounded-2xl p-4 border border-slate-800 shadow-lg cursor-pointer select-none relative animate-fade-in flex flex-col";
        
        card.innerHTML = `
            ${d.strDrinkThumb ? `<img src="${d.strDrinkThumb}" class="w-full h-36 object-contain bg-slate-950/50 rounded-lg mb-3">` : `<div class="w-full h-36 bg-slate-950 rounded-lg mb-3 flex items-center justify-center text-4xl">🍹</div>`}
            <button onclick="toggleFavorite('${d.idDrink}', event)" class="absolute top-6 right-6 bg-slate-950/80 p-2 rounded-full border border-slate-800 text-sm z-10">${isFav ? '❤️' : '🤍'}</button>
            
            ${d.isCustom ? `
            <button onclick="shareCustomRecipe('${d.idDrink}', event)" class="absolute top-6 left-6 bg-slate-950/80 p-2 rounded-full border border-slate-800 text-sm z-10">📤</button>
            <button onclick="deleteCustomRecipe('${d.idDrink}', event)" class="absolute top-6 left-16 bg-rose-500/20 text-rose-400 p-2 rounded-full border border-rose-500/30 text-sm z-10">🗑️</button>
            ` : ''}
            
            <div class="flex justify-between items-center mt-auto">
                <div>
                    <div class="flex gap-1 mb-1">
                        <span class="text-[9px] font-bold bg-amber-500/10 text-amber-500 px-1.5 py-0.5 rounded border border-amber-500/20 uppercase">${d.computedTaste}</span>
                        <span class="text-[9px] font-bold bg-slate-950 text-slate-400 px-1.5 py-0.5 rounded border border-slate-800">🔥 ~${d.computedCalories} kcal</span>
                    </div>
                    <h3 class="font-black text-white text-base leading-tight">${d.strDrink}</h3>
                </div>
                <span class="text-amber-500 text-xs font-bold toggle-icon shrink-0 pl-2">Detay ▼</span>
            </div>
            ${isMissingList ? `<div class="mt-2 pt-2 border-t border-slate-800/50 flex flex-col gap-1">${missingTextHTML}</div>` : ''}
            
            <div class="details-section mt-1 space-y-3">
                <div class="flex flex-wrap pt-3 border-t border-slate-800/80">${ingHTML}</div>
                ${d.strServing ? `<div class="bg-amber-500/10 border border-amber-500/20 p-2 rounded-lg text-[10px] text-amber-400 italic">💡 <b>Servis Önerisi:</b> ${d.strServing}</div>` : ''}
                <p class="text-xs text-slate-400 instruction-text">
                    <b class="text-slate-500 text-[10px] block mb-1">Hazırlanışı:</b>
                    <span>${d.isCustom ? d.strInstructions : 'Çevriliyor...'}</span>
                </p>
            </div>
        `;

        card.onclick = async () => {
            const details = card.querySelector('.details-section');
            const icon = card.querySelector('.toggle-icon');
            const span = card.querySelector('.instruction-text span');
            if (!details.classList.contains('open')) {
                details.classList.add('open');
                icon.innerText = "Kapat ▲";
                if (!d.isCustom && span.innerText === 'Çevriliyor...') {
                    span.innerText = await translateToTurkish(d.strInstructions);
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
    event.stopPropagation();
    const recipe = customRecipes.find(r => r.idDrink === id);
    if (!recipe) return;

    const ingredientsText = recipe.customIngredients.map(i => `- ${i}`).join('\n');
    const shareText = `🍹 *${recipe.strDrink}* (Özel Tarif)\n\n🔹 *Malzemeler:*\n${ingredientsText}\n\n🔸 *Hazırlanışı:*\n${recipe.strInstructions}\n\n_Bar Cepte ile hazırlandı!_`;

    if (navigator.share) {
        navigator.share({
            title: recipe.strDrink,
            text: shareText
        }).catch(err => console.log('Paylaşım iptal:', err));
    } else {
        navigator.clipboard.writeText(shareText);
        alert("Tarif metni panoya kopyalandı!");
    }
}

function deleteCustomRecipe(id, event) {
    event.stopPropagation();
    if(confirm("Bu özel tarifi silmek istediğine emin misin?")) {
        customRecipes = customRecipes.filter(r => r.idDrink !== id);
        localStorage.setItem('customRecipes', JSON.stringify(customRecipes));
        
        try {
            const tx = db.transaction("custom_recipes", "readwrite");
            tx.objectStore("custom_recipes").delete(id);
        } catch (e) { console.error("IDB Silme Hatası:", e); }

        filterCocktails();
        if(currentTab === 'my-recipes') renderMyRecipes();
    }
}

function toggleFavorite(id, event) {
    event.stopPropagation();
    favoriteCocktails = favoriteCocktails.includes(id) ? favoriteCocktails.filter(f => f !== id) : [...favoriteCocktails, id];
    localStorage.setItem('favoriteCocktails', JSON.stringify(favoriteCocktails));
    filterCocktails();
}

function toggleShoppingList(item, event) {
    event.stopPropagation();
    shoppingList = shoppingList.includes(item) ? shoppingList.filter(i => i !== item) : [...shoppingList, item];
    localStorage.setItem('shoppingList', JSON.stringify(shoppingList));
    filterCocktails();
    if (currentTab === 'shop') renderShoppingList();
}

function renderShoppingList() {
    const container = document.getElementById('shopping-list-container');
    if (!container) return;
    if (shoppingList.length === 0) {
        container.innerHTML = `<p class="text-center py-4 text-slate-500 text-xs">Alışveriş listeniz boş.</p>`;
        return;
    }
    container.innerHTML = "";
    shoppingList.forEach(item => {
        const row = document.createElement('div');
        row.className = "flex items-center justify-between bg-slate-950 p-2.5 rounded-xl border border-slate-800";
        row.innerHTML = `
            <span class="capitalize text-slate-200 font-medium">🛒 ${item}</span>
            <button onclick="toggleShoppingList('${item}', event)" class="text-rose-400 font-bold px-2">Sil</button>
        `;
        container.appendChild(row);
    });
}

async function saveCustomRecipe() {
    const name = document.getElementById('custom-name').value.trim();
    const ingredients = document.getElementById('custom-ingredients').value.split(',').map(i => i.trim());
    const instructions = document.getElementById('custom-instructions').value.trim();
    const serving = document.getElementById('custom-serving').value.trim();
    const imageInput = document.getElementById('custom-image-input');

    if(!name || !instructions || !ingredients[0]) return alert("Lütfen ad, malzeme ve hazırlanışı doldur!");

    let base64Image = "";
    if (imageInput.files && imageInput.files[0]) {
        base64Image = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.readAsDataURL(imageInput.files[0]);
        });
    }

    const newRecipe = {
        idDrink: "custom_" + Date.now(),
        strDrink: name,
        strCategory: "Özel",
        strAlcoholic: "Alcoholic",
        strInstructions: instructions,
        strServing: serving,
        strDrinkThumb: base64Image,
        isCustom: true,
        customIngredients: ingredients
    };

    customRecipes.push(newRecipe);
    localStorage.setItem('customRecipes', JSON.stringify(customRecipes));

    try {
        const tx = db.transaction("custom_recipes", "readwrite");
        tx.objectStore("custom_recipes").put(newRecipe);
    } catch (e) { console.error("IDB Kayıt Hatası:", e); }

    document.getElementById('custom-name').value = "";
    document.getElementById('custom-ingredients').value = "";
    document.getElementById('custom-instructions').value = "";
    document.getElementById('custom-serving').value = "";
    imageInput.value = "";

    alert("Tarif veritabanına başarıyla kaydedildi!");
    
    if(currentTab === 'my-recipes') renderMyRecipes();
    filterCocktails();
}

function exportUserData() {
    const data = { favorites: favoriteCocktails, customs: customRecipes, shopping: shoppingList };
    const encrypted = btoa(unescape(encodeURIComponent(JSON.stringify(data))));
    navigator.clipboard.writeText(encrypted);
    alert("Yedekleme kodu panoya kopyalandı!");
}

function importUserData() {
    const input = document.getElementById('sync-data-input').value.trim();
    if(!input) return alert("Geçerli bir kod yapıştırın.");
    try {
        const decrypted = JSON.parse(decodeURIComponent(escape(atob(input))));
        if(decrypted.favorites) favoriteCocktails = decrypted.favorites;
        if(decrypted.customs) customRecipes = decrypted.customs;
        if(decrypted.shopping) shoppingList = decrypted.shopping;
        
        localStorage.setItem('favoriteCocktails', JSON.stringify(favoriteCocktails));
        localStorage.setItem('customRecipes', JSON.stringify(customRecipes));
        localStorage.setItem('shoppingList', JSON.stringify(shoppingList));
        
        const tx = db.transaction("custom_recipes", "readwrite");
        const store = tx.objectStore("custom_recipes");
        customRecipes.forEach(recipe => store.put(recipe));
        
        alert("Senkronizasyon başarılı!");
        location.reload();
    } catch {
        alert("Geçersiz yedekleme kodu!");
    }
}

// YENİ: Rastgele Kokteyl Seçici
function pickRandomCocktail() {
    const pool = [...customRecipes, ...allCocktails];
    if (pool.length === 0) return alert("Tarifler henüz yüklenmedi, lütfen bekleyin.");
    
    const randomDrink = pool[Math.floor(Math.random() * pool.length)];
    const searchInput = document.getElementById('cocktail-search');
    
    if (searchInput) {
        searchInput.value = randomDrink.strDrink;
        filterCocktails();
        
        setTimeout(() => {
            document.getElementById('recipes-display-sections').scrollIntoView({ behavior: 'smooth' });
            
            const firstCard = document.querySelector('#recipes-ready > div') || document.querySelector('#recipes-missing > div');
            if (firstCard) {
                const details = firstCard.querySelector('.details-section');
                if (details && !details.classList.contains('open')) {
                    firstCard.click();
                }
            }
        }, 150);
    }
}

document.addEventListener("DOMContentLoaded", async () => {
    await initDB();
    fetchDataWithIndexedDB();
});

async function fetchDataWithIndexedDB() {
    const statusEl = document.getElementById('status');
    if(statusEl) statusEl.innerText = "Veritabanı denetleniyor...";

    try {
        const customTx = db.transaction("custom_recipes", "readonly");
        const customStore = customTx.objectStore("custom_recipes");
        const customReq = customStore.getAll();
        
        customReq.onsuccess = () => {
            if (customReq.result && customReq.result.length > 0) {
                customRecipes = customReq.result;
                localStorage.setItem('customRecipes', JSON.stringify(customRecipes));
            }
        };

        const tx = db.transaction("cocktails", "readonly");
        const store = tx.objectStore("cocktails");
        const localCount = await new Promise(r => {
            const req = store.count();
            req.onsuccess = () => r(req.result);
        });

        if (localCount > 0) {
            const getAllReq = db.transaction("cocktails", "readonly").objectStore("cocktails").getAll();
            allCocktails = await new Promise(r => getAllReq.onsuccess = () => r(getAllReq.result));
            
            autoExtractAllIngredients();
            renderIngredients(); 
            filterCocktails();
            
            if(statusEl) statusEl.innerText = `${allCocktails.length + customRecipes.length} Tarif Hazır`;
            updateDataInBackground();
            return;
        }

        if(statusEl) statusEl.innerText = "İlk kurulum (Tarifler indiriliyor)...";
        await fetchAndStoreData();

    } catch {
        if(statusEl) statusEl.innerText = "Bağlantı Hatası (Çevrimdışı)";
    }
}

async function updateDataInBackground() {
    try {
        const letters = 'abcdefghijklmnopqrstuvwxyz5'.split('');
        let apiDrinks = [];

        for (const l of letters) {
            const r = await fetch(`https://www.thecocktaildb.com/api/json/v1/1/search.php?f=${l}`);
            if (r.ok) {
                const d = await r.json();
                if (d.drinks) apiDrinks.push(...d.drinks);
            }
            await new Promise(res => setTimeout(res, 50)); 
        }

        const uniqueDrinks = new Map();
        apiDrinks.forEach(drink => uniqueDrinks.set(drink.idDrink, drink));
        const newCocktails = Array.from(uniqueDrinks.values());

        if(newCocktails.length > allCocktails.length) {
            const writeTx = db.transaction("cocktails", "readwrite");
            const writeStore = writeTx.objectStore("cocktails");
            newCocktails.forEach(drink => writeStore.put(drink));
            
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

async function fetchAndStoreData() {
    const letters = 'abcdefghijklmnopqrstuvwxyz5'.split('');
    let apiDrinks = [];

    for (const l of letters) {
        try {
            const r = await fetch(`https://www.thecocktaildb.com/api/json/v1/1/search.php?f=${l}`);
            if (!r.ok) continue;
            const d = await r.json();
            if (d.drinks) apiDrinks.push(...d.drinks);
        } catch(e) {}
    }

    const uniqueDrinks = new Map();
    apiDrinks.forEach(drink => uniqueDrinks.set(drink.idDrink, drink));
    allCocktails = Array.from(uniqueDrinks.values());

    const writeTx = db.transaction("cocktails", "readwrite");
    const writeStore = writeTx.objectStore("cocktails");
    allCocktails.forEach(drink => writeStore.put(drink));

    autoExtractAllIngredients();
    renderIngredients();
    filterCocktails();

    const statusEl = document.getElementById('status');
    if(statusEl) statusEl.innerText = `${allCocktails.length + customRecipes.length} Tarif Hazır`;
}
