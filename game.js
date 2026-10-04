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
let currentKitchenSubCat = "all";
let alcoholFilter = "all";
let tasteFilter = "all";
let onlyFavoritesFilter = false;
let db;
let wakeLock = null;
let deferredPwaPrompt = null;

// Timer State
let timerInterval = null;
let timerRemaining = 15;
let timerRunning = false;
let timerDefault = 15;

// Haptic Titreşim Geri Bildirimi
function triggerHaptic(type = 'light') {
    if ('vibrate' in navigator) {
        try {
            if (type === 'light') navigator.vibrate(12);
            else if (type === 'medium') navigator.vibrate(25);
            else if (type === 'success') navigator.vibrate([30, 40, 30]);
            else if (type === 'timer') navigator.vibrate([100, 100, 100, 100, 200]);
        } catch(e) {}
    }
}

// Debounce Yardımcısı (Arama & Filtreleme Performansı)
function debounce(func, wait = 180) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

// Web Audio API ile Kristal Netliğinde Barmen Çan Sesi
function playChimeSound() {
    try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;
        const ctx = new AudioContext();
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, now);
        osc.frequency.exponentialRampToValueAtTime(440, now + 0.8);
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.8);
    } catch(e) {}
}

// Barmen Zamanlayıcısı (Shaker & Stir Timer) Fonksiyonları
function openTimerModal(duration = 15, label = 'Buzla kuvvetlice çalkala (Shaker)') {
    triggerHaptic('light');
    setTimerDuration(duration, label);
    const modal = document.getElementById('shaker-timer-modal');
    if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    }
}

function closeTimerModal() {
    pauseTimer();
    const modal = document.getElementById('shaker-timer-modal');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
}

function setTimerDuration(seconds, label = '') {
    pauseTimer();
    timerDefault = seconds;
    timerRemaining = seconds;
    updateTimerDisplay();
    if (label) {
        const labelEl = document.getElementById('timer-label');
        if (labelEl) labelEl.innerText = label;
    }
    document.querySelectorAll('.timer-preset-btn').forEach(btn => {
        if (btn.innerText.includes(`${seconds}s`)) {
            btn.className = "timer-preset-btn pill-btn py-2 px-1 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold text-[11px]";
        } else {
            btn.className = "timer-preset-btn pill-btn py-2 px-1 rounded-xl bg-black/40 text-slate-300 border border-white/10 text-[11px]";
        }
    });
}

function updateTimerDisplay() {
    const display = document.getElementById('timer-display');
    if (!display) return;
    const mins = Math.floor(timerRemaining / 60);
    const secs = timerRemaining % 60;
    display.innerText = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function toggleTimer() {
    if (timerRunning) {
        pauseTimer();
    } else {
        startTimer();
    }
}

function startTimer() {
    if (timerRemaining <= 0) timerRemaining = timerDefault;
    timerRunning = true;
    triggerHaptic('light');
    const toggleBtn = document.getElementById('btn-timer-toggle');
    const display = document.getElementById('timer-display');
    if (toggleBtn) {
        toggleBtn.innerText = "⏸ Duraklat";
        toggleBtn.className = "flex-1 bg-amber-600/80 text-white font-black py-3 rounded-2xl shadow-lg active:scale-95 transition-all text-xs";
    }
    if (display) display.classList.remove('timer-finish-anim');

    timerInterval = setInterval(() => {
        timerRemaining--;
        updateTimerDisplay();
        if (timerRemaining <= 0) {
            finishTimer();
        }
    }, 1000);
}

function pauseTimer() {
    timerRunning = false;
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = null;
    const toggleBtn = document.getElementById('btn-timer-toggle');
    if (toggleBtn) {
        toggleBtn.innerText = "▶ Başlat";
        toggleBtn.className = "flex-1 bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-black py-3 rounded-2xl shadow-lg active:scale-95 transition-all text-xs hover:from-amber-400 hover:to-amber-500";
    }
}

function resetTimer() {
    pauseTimer();
    timerRemaining = timerDefault;
    updateTimerDisplay();
    const display = document.getElementById('timer-display');
    if (display) display.classList.remove('timer-finish-anim');
}

function finishTimer() {
    pauseTimer();
    triggerHaptic('timer');
    playChimeSound();
    const display = document.getElementById('timer-display');
    if (display) display.classList.add('timer-finish-anim');
}

function openTimerForTechnique(instructions, drinkName, event) {
    if (event) event.stopPropagation();
    const inst = (instructions || '').toLowerCase();
    let duration = 15;
    let label = 'Buzla çalkala (Shaker)';
    
    if (/stir|karıştır/i.test(inst)) {
        duration = 30;
        label = `Buzla nazikçe karıştır (Stir): ${drinkName}`;
    } else if (/blend|blender/i.test(inst)) {
        duration = 20;
        label = `Blender ile çek: ${drinkName}`;
    } else if (/layer|float|katman/i.test(inst)) {
        duration = 30;
        label = `Katmanlayarak dök: ${drinkName}`;
    } else {
        duration = 15;
        label = `Buzla kuvvetlice çalkala (Shaker): ${drinkName}`;
    }
    
    openTimerModal(duration, label);
}

function openTimerForDrink(drinkId, event) {
    if (event) event.stopPropagation();
    const d = allCocktails.find(c => c.idDrink === drinkId) || customRecipes.find(c => c.idDrink === drinkId);
    if (d) {
        openTimerForTechnique(d.strInstructions || '', d.strDrink || '', event);
    } else {
        openTimerModal(15, 'Buzla kuvvetlice çalkala (Shaker)');
    }
}

// HTML Entity ve Kaçış Karakteri Temizleyici (Google Translate ve Önbellek Kaynaklı Hataları Düzeltir)
function cleanInstructionText(text) {
    if (!text) return '';
    let s = String(text);
    s = s
        .replace(/&amp;#0*39;/gi, "'")
        .replace(/&#0*39;/gi, "'")
        .replace(/&apos;/gi, "'")
        .replace(/&amp;quot;/gi, '"')
        .replace(/&quot;/gi, '"')
        .replace(/&amp;amp;/gi, '&')
        .replace(/&amp;/gi, '&')
        .replace(/&amp;lt;/gi, '<')
        .replace(/&lt;/gi, '<')
        .replace(/&amp;gt;/gi, '>')
        .replace(/&gt;/gi, '>')
        .replace(/&nbsp;/gi, ' ');

    if (s.includes('&') && s.includes(';')) {
        try {
            const txt = document.createElement("textarea");
            txt.innerHTML = s;
            s = txt.value;
        } catch(e) {}
    }

    return s.trim();
}

// XSS Sanitizasyonu (Güvenlik Önlemi)
function escapeHTML(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

// Güvenli Görsel Kaynağı (XSS koruması: yalnızca http(s) ve data:image izinli)
function safeImageSrc(src) {
    const s = String(src || '').trim();
    return /^(https?:\/\/|data:image\/)/i.test(s) ? s : '';
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

const measureTranslations = {
    "dash": "damla",
    "dashes": "damla",
    "tsp": "çay kaşığı",
    "tblsp": "yemek kaşığı",
    "tbsp": "yemek kaşığı",
    "part": "ölçü",
    "parts": "ölçü",
    "slice": "dilim",
    "slices": "dilim",
    "wedge": "dilim",
    "wedges": "dilim",
    "splash": "çok az",
    "cube": "küp",
    "cubes": "küp",
    "cup": "bardak",
    "cups": "bardak",
    "pinch": "tutam",
    "leaves": "yaprak",
    "leaf": "yaprak",
    "drop": "damla",
    "drops": "damla",
    "sprig": "dal",
    "sprigs": "dal",
    "twist": "burgu kabuk",
    "peel": "kabuk",
    "whole": "bütün",
    "half": "yarım",
    "ounce": "oz",
    "ounces": "oz"
};

const ingredientTranslations = {
    "vodka": "Votka",
    "gin": "Cin",
    "rum": "Rom",
    "light rum": "Açık Rom",
    "dark rum": "Siyah Rom",
    "white rum": "Beyaz Rom",
    "tequila": "Tekila",
    "whiskey": "Viski",
    "bourbon": "Burbon",
    "scotch": "İskoç Viskisi",
    "brandy": "Kanyak",
    "cognac": "Konyak",
    "triple sec": "Portakal Likörü",
    "sweet vermouth": "Tatlı Vermut",
    "dry vermouth": "Sek Vermut",
    "campari": "Campari",
    "amaretto": "Amaretto",
    "lime juice": "Misket Limonu Suyu",
    "lemon juice": "Limon Suyu",
    "orange juice": "Portakal Suyu",
    "pineapple juice": "Ananas Suyu",
    "cranberry juice": "Kızılcık Suyu",
    "grapefruit juice": "Greyfurt Suyu",
    "apple juice": "Elma Suyu",
    "tomato juice": "Domates Suyu",
    "grenadine": "Nar Şurubu",
    "simple syrup": "Şeker Şurubu",
    "sugar syrup": "Şeker Şurubu",
    "sugar": "Şeker",
    "powdered sugar": "Pudra Şekeri",
    "salt": "Tuz",
    "pepper": "Karabiber",
    "mint": "Nane",
    "mint leaves": "Nane Yaprağı",
    "ice": "Buz",
    "water": "Su",
    "soda water": "Maden Suyu",
    "club soda": "Maden Suyu",
    "tonic water": "Tonik",
    "ginger ale": "Zencefilli Gazoz",
    "ginger beer": "Zencefil Birası",
    "cola": "Kola",
    "sprite": "Sprite",
    "7-up": "7-Up",
    "milk": "Süt",
    "cream": "Krema",
    "heavy cream": "Koyu Krema",
    "egg white": "Yumurta Akı",
    "egg yolk": "Yumurta Sarısı",
    "egg": "Yumurta",
    "coffee": "Kahve",
    "espresso": "Espresso",
    "kahlua": "Kahve Likörü",
    "baileys irish cream": "İrlanda Kreması",
    "blue curacao": "Mavi Turunç Likörü",
    "peach schnapps": "Şeftali Likörü",
    "apple schnapps": "Elma Likörü",
    "cointreau": "Cointreau",
    "grand marnier": "Grand Marnier",
    "galliano": "Galliano",
    "midori": "Kavun Likörü",
    "malibu": "Hindistan Cevizi Romu",
    "champagne": "Şampanya",
    "prosecco": "Prosecco",
    "white wine": "Beyaz Şarap",
    "red wine": "Kırmızı Şarap",
    "beer": "Bira",
    "ale": "Ale Bira",
    "stout": "Stout Bira",
    "cider": "Elma Şarabı",
    "bitters": "Bitters",
    "angostura bitters": "Angostura Bitters",
    "orange bitters": "Portakal Bitters",
    "lemon": "Limon",
    "lime": "Misket Limonu",
    "orange": "Portakal",
    "cherry": "Kiraz",
    "maraschino cherry": "Maraschino Kirazı",
    "olive": "Zeytin",
    "celery": "Kereviz",
    "tabasco sauce": "Acı Sos",
    "worcestershire sauce": "Worcestershire Sosu",
    "cinnamon": "Tarçın",
    "nutmeg": "Muskat",
    "ginger": "Zencefil",
    "honey": "Bal",
    "agave syrup": "Agave Şurubu",
    "maple syrup": "Akçaağaç Şurubu",
    "chocolate": "Çikolata",
    "cocoa powder": "Kakao Tozu"
};

function translateIngredientName(ingName) {
    if (!ingName) return '';
    const lower = ingName.trim().toLowerCase();
    if (ingredientTranslations[lower]) return ingredientTranslations[lower];
    const base = baseIngredients.find(b => b.id.toLowerCase() === lower);
    if (base) return base.name;
    return ingName;
}

function convertOzToCl(text) {
    if (!text) return text;
    return text.replace(/(\d+\s+\d+\/\d+|\d+\/\d+|\d+(\.\d+)?)\s*(oz|ounces?)\b/gi, (match, numStr, _, unit) => {
        let val = 0;
        if (numStr.includes(' ') && numStr.includes('/')) {
            const [whole, frac] = numStr.split(' ');
            const [num, den] = frac.split('/');
            val = parseFloat(whole) + (parseFloat(num) / parseFloat(den));
        } else if (numStr.includes('/')) {
            const [num, den] = numStr.split('/');
            val = parseFloat(num) / parseFloat(den);
        } else {
            val = parseFloat(numStr);
        }
        const scaledVal = Math.round(val * 3 * 10) / 10;
        const finalNum = scaledVal % 1 === 0 ? scaledVal.toFixed(0) : scaledVal.toFixed(1);
        return `${finalNum} cl`;
    }).replace(/\b(oz|ounces?)\b/gi, 'cl');
}

function translateMeasureText(measureStr) {
    if (!measureStr) return '';
    let res = convertOzToCl(measureStr);
    Object.keys(measureTranslations).sort((a, b) => b.length - a.length).forEach(key => {
        const regex = new RegExp(`\\b${key}\\b`, 'gi');
        res = res.replace(regex, measureTranslations[key]);
    });
    return res;
}

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

    let preProcessedText = convertOzToCl(text);
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
        "\\bfloat\\b": "pour gently on top",
        "\\btsp\\b": "teaspoon",
        "\\btbsp\\b": "tablespoon",
        "\\bclub soda\\b": "soda water",
        "\\boz\\b": "ounce"
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
            "üzerine nazikçe dökün": "üstüne yavaşça dökün (yüzdürün)",
            "çay kaşığı": "çay kaşığı (tsp)",
            "yemek kaşığı": "yemek kaşığı (tbsp)",
            "maden suyu": "maden suyu (soda)",
            "soda suyu": "maden suyu",
            "dilim": "dilim",
            "buz kütlesi": "buz küpü",
            "buz kütleleri": "buz küpleri",
            "şeker şurubu": "şeker şurubu (simple syrup)",
            "ons": "oz"
        };

        const trTerms = Object.entries(trGlossary).sort((a, b) => b[0].length - a[0].length);
        const trRegex = new RegExp(trTerms.map(([k]) => `\\b${k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`).join('|'), 'gi');
        translatedText = translatedText.replace(trRegex, m => {
            const found = trTerms.find(([k]) => k.toLowerCase() === m.toLowerCase());
            return found ? found[1] : m;
        });

        return cleanInstructionText(translatedText);
    } catch { 
        return cleanInstructionText(text); 
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

    const subcatsEl = document.getElementById('kitchen-subcategories');
    if (subcatsEl) {
        if (tab === 'mutfak') {
            subcatsEl.classList.remove('hidden');
        } else {
            subcatsEl.classList.add('hidden');
        }
    }

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

function setKitchenSubCategory(subCat, btnEl) {
    triggerHaptic('light');
    currentKitchenSubCat = subCat;
    document.querySelectorAll('#kitchen-subcategories .subcat-btn').forEach(b => {
        b.className = "subcat-btn pill-btn px-2.5 py-1 rounded-full bg-slate-900/80 text-slate-400 border border-white/10 shrink-0 hover:text-white";
    });
    const target = btnEl || document.querySelector(`#kitchen-subcategories .subcat-btn[data-subcat="${subCat}"]`);
    if (target) {
        target.className = "subcat-btn pill-btn px-2.5 py-1 rounded-full bg-amber-500 text-slate-950 font-bold shrink-0 shadow-sm";
    }
    renderIngredients();
}

function matchesKitchenSubCategory(ing) {
    if (currentTab !== 'mutfak' || currentKitchenSubCat === 'all') return true;
    const lower = (ing.id + ' ' + ing.name).toLowerCase();
    if (currentKitchenSubCat === 'meyve') {
        return /(lemon|lime|orange|grapefruit|apple|cranberry|pineapple|juice|cherry|peach|apricot|fruit|limon|portakal|elma|kızılcık|ananas|meyve|greyfurt|çilek|vişne|şeftali)/i.test(lower);
    }
    if (currentKitchenSubCat === 'gazli') {
        return /(soda|tonic|cola|coke|sprite|ginger ale|ginger beer|gazoz|maden suyu|tonik|kola)/i.test(lower);
    }
    if (currentKitchenSubCat === 'tatli') {
        return /(syrup|sugar|grenadine|honey|agave|nectar|maple|chocolate|cocoa|şeker|şurup|bal|çikolata)/i.test(lower);
    }
    if (currentKitchenSubCat === 'baharat') {
        return /(mint|cinnamon|nutmeg|salt|pepper|olive|celery|tabasco|worcestershire|bitters|nane|tarçın|muskat|tuz|biber|zeytin)/i.test(lower);
    }
    if (currentKitchenSubCat === 'sut-kahve') {
        return /(milk|cream|coffee|espresso|egg|tea|süt|krema|kahve|çay|yumurta)/i.test(lower);
    }
    return true;
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
    triggerHaptic('light');
    onlyFavoritesFilter = !onlyFavoritesFilter;
    if (onlyFavoritesFilter) {
        switchTab('favorites');
    } else {
        switchTab('alkol');
    }
}

function renderDashboard() {
    const baseTotal = baseIngredients.length;
    const selected = selectedIngredients.length;
    let rate = baseTotal > 0 ? Math.round((Math.min(selected, baseTotal) / baseTotal) * 100) : 0;
    if (rate > 100) rate = 100;
    
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

function matchesAlcoholFilter(d) {
    if (alcoholFilter === 'all') return true;
    const a = String(d.strAlcoholic || '').trim().toLowerCase();
    if (alcoholFilter === 'Alcoholic') {
        return a === 'alcoholic' || a === 'optional alcohol';
    }
    return a === 'non alcoholic' || a === 'non_alcoholic' || a === 'nonalcoholic';
}

function setAlcoholFilter(filter) {
    triggerHaptic('light');
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
    triggerHaptic('light');
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
        .filter(i => i.cat === currentTab && matchesKitchenSubCategory(i) && (i.name.toLowerCase().includes(searchVal) || i.id.toLowerCase().includes(searchVal)))
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
            triggerHaptic('light');
            selectedIngredients = isSelected ? selectedIngredients.filter(i => i !== ing.id) : [...selectedIngredients, ing.id];
            try { localStorage.setItem('selectedIngredients', JSON.stringify(selectedIngredients)); } catch(e) {}
            renderIngredients();
            filterCocktails();
        };
        container.appendChild(card);
    });
}

const debouncedRenderIngredients = debounce(renderIngredients, 150);
const debouncedFilterCocktails = debounce(filterCocktails, 180);

function clearSelection() {
    if(selectedIngredients.length === 0) return;
    triggerHaptic('medium');
    selectedIngredients = [];
    try { localStorage.setItem('selectedIngredients', JSON.stringify(selectedIngredients)); } catch(e) {}
    renderIngredients();
    filterCocktails();
}

function ingredientNameOnly(str) {
    const s = String(str || '').trim();
    const m = s.match(/^[\d\s\/.,-]+(?:ml|oz|cl|dash(?:es)?|tsp|tbsp|gr|shot|parts?)?\s*(.*)$/i);
    return m ? m[1].trim() : s;
}

function analyzeRecipe(drink) {
    let totalCal = 0;
    let tastes = { Sert: 0, Tatlı: 0, Ekşi: 0, Ferah: 0 };
    let reqs = drink.isCustom 
        ? (Array.isArray(drink.customIngredients) ? drink.customIngredients : [])
        : Array.from({length:15}, (_,i)=>drink[`strIngredient${i+1}`]).filter(Boolean);
    reqs = reqs.map(ingredientNameOnly).filter(Boolean);
    
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

// Tahmini Alkol Oranı (% ABV Hesabı)
function calculateRecipeABV(drink) {
    const alcoholicStr = String(drink.strAlcoholic || '').toLowerCase();
    if (alcoholicStr.includes('non') || alcoholicStr === 'optional alcohol') {
        return { abv: 0, label: '🟢 Alkolsüz (%0)', badgeCls: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' };
    }

    let reqs = [];
    if (drink.isCustom && Array.isArray(drink.customIngredients)) {
        drink.customIngredients.forEach(ing => {
            const parts = ing.match(/^([\d\s\/.,-]+(?:ml|oz|cl|dash|dashes|tsp|tbsp|gr|shot)?)\s*(.*)$/i);
            const measure = parts && parts[1] ? parts[1].trim() : '';
            const name = parts && parts[2] ? parts[2].trim() : ing.trim();
            reqs.push({ name, measure });
        });
    } else {
        for (let i = 1; i <= 15; i++) {
            const ing = drink[`strIngredient${i}`];
            const measure = drink[`strMeasure${i}`] || '';
            if (ing && ing.trim()) {
                reqs.push({ name: ing.trim(), measure: measure.trim() });
            }
        }
    }

    let totalVolumeCl = 0;
    let pureAlcoholCl = 0;

    reqs.forEach(({ name, measure }) => {
        let cl = 4.0;
        if (measure) {
            const converted = convertOzToCl(measure);
            const numMatch = converted.match(/(\d+(\.\d+)?)\s*cl/i);
            if (numMatch) {
                cl = parseFloat(numMatch[1]);
            } else if (/dash|damla/i.test(measure)) {
                cl = 0.2;
            } else if (/tsp|çay kaşığı/i.test(measure)) {
                cl = 0.5;
            } else if (/tbsp|yemek kaşığı/i.test(measure)) {
                cl = 1.5;
            } else if (/cup|bardak/i.test(measure)) {
                cl = 20.0;
            }
        }

        const lower = name.toLowerCase();
        let alcStrength = 0;

        if (/(vodka|gin|rum|tequila|whiskey|bourbon|scotch|brandy|cognac|raki|rakı|absinthe)/i.test(lower)) {
            alcStrength = 0.40;
        } else if (/(triple sec|cointreau|kahlua|amaretto|campari|aperol|baileys|curacao|schnapps|liqueur|likör|galliano|midori|malibu)/i.test(lower)) {
            alcStrength = 0.24;
        } else if (/(vermouth|vermut|sherry|port)/i.test(lower)) {
            alcStrength = 0.16;
        } else if (/(wine|şarap|champagne|şampanya|prosecco)/i.test(lower)) {
            alcStrength = 0.12;
        } else if (/(beer|bira|cider|ale|stout)/i.test(lower)) {
            alcStrength = 0.05;
        }

        totalVolumeCl += cl;
        pureAlcoholCl += (cl * alcStrength);
    });

    if (totalVolumeCl === 0 || pureAlcoholCl === 0) {
        return { abv: 0, label: '🟢 Alkolsüz (%0)', badgeCls: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' };
    }

    const abvPercent = Math.min(Math.round((pureAlcoholCl / totalVolumeCl) * 100), 75);
    if (abvPercent <= 8) {
        return { abv: abvPercent, label: `🍃 ~%${abvPercent} ABV`, badgeCls: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' };
    } else if (abvPercent <= 18) {
        return { abv: abvPercent, label: `🍹 ~%${abvPercent} ABV`, badgeCls: 'bg-amber-500/10 text-amber-400 border-amber-500/20' };
    } else {
        return { abv: abvPercent, label: `🔥 ~%${abvPercent} ABV`, badgeCls: 'bg-rose-500/10 text-rose-400 border-rose-500/20' };
    }
}

// Kokteyl Verilerini Bir Defa Önbelleğe Alarak Arama Hızını Uçurur
function enrichDrink(d) {
    if (!d.computedCalories || !d.computedTaste) {
        const analysis = analyzeRecipe(d);
        d.computedCalories = analysis.calories;
        d.computedTaste = analysis.tasteProfile;
    }
    if (!d.computedABV) {
        d.computedABV = calculateRecipeABV(d);
    }
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

function resolveIngredientName(name) {
    const n = String(name || '').trim().toLowerCase();
    const found = popularIngredients.find(pi => pi.id.toLowerCase() === n || pi.name.toLowerCase() === n);
    return found ? found.id : String(name || '').trim();
}

function quickAddIngredientToBar(ingName, event) {
    if (event) event.stopPropagation();
    triggerHaptic('success');
    const id = resolveIngredientName(ingName);
    if (id && !selectedIngredients.includes(id)) {
        selectedIngredients.push(id);
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
    let pool = [...customRecipes, ...allCocktails].filter(d => matchesAlcoholFilter(d));

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

        enrichDrink(d);

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
    
    customRecipes.forEach(enrichDrink);
    renderLists(customRecipes, container, false);
}

function createCocktailCardElement(item, isMissingList) {
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

            const trMeasure = translateMeasureText(pair.measure);
            const trName = translateIngredientName(pair.name);

            const measureText = trMeasure 
                ? `<b class="measure-span text-amber-300 ml-1 font-mono text-[10px]" data-raw="${escapeHTML(trMeasure)}">${escapeHTML(trMeasure)}</b>` 
                : '';

            ingredientsHTML += `
                <span class="inline-flex items-center ${cls} text-[11px] px-2.5 py-1 rounded-xl border m-0.5 shadow-sm max-w-full overflow-hidden">
                    <span class="break-words">${escapeHTML(trName)}</span>${measureText}
                </span>
            `;
        });

        let missingTextHTML = isMissingList ? missingList.map(m => {
            const encodedM = encodeURIComponent(m);
            const inShop = shoppingList.includes(m);
            const trMissingName = translateIngredientName(m);
            const safeM = escapeHTML(trMissingName);
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
        card.className = "acrylic-card cocktail-card rounded-3xl p-4 shadow-xl cursor-pointer select-none relative animate-fade-in flex flex-col min-w-0 overflow-hidden";
        
        const drinkIdEncoded = encodeURIComponent(d.idDrink);
        const glassBadge = getGlassBadge(d.strGlass);
        const techniqueBadge = getTechniqueBadge(d.strInstructions);
        const safeDrinkName = escapeHTML(d.strDrink);
        const safeServing = escapeHTML(d.strServing);
        const rawTR = d.strInstructionsTR ? cleanInstructionText(d.strInstructionsTR) : '';
        if (d.strInstructionsTR && d.strInstructionsTR !== rawTR) {
            d.strInstructionsTR = rawTR;
            if (db) {
                try {
                    const tx = db.transaction("cocktails", "readwrite");
                    tx.objectStore("cocktails").put(d);
                } catch(e) {}
            }
        }
        const safeInstructions = d.isCustom 
            ? escapeHTML(cleanInstructionText(d.strInstructions || '')) 
            : (rawTR ? escapeHTML(rawTR) : 'Çevriliyor...');
        const abvBadge = d.computedABV ? `<span class="text-[10px] font-bold ${d.computedABV.badgeCls} px-2 py-0.5 rounded-lg border font-mono">${escapeHTML(d.computedABV.label)}</span>` : '';

        card.innerHTML = `
            ${d.strDrinkThumb && safeImageSrc(d.strDrinkThumb) 
                ? `<img src="${escapeHTML(safeImageSrc(d.strDrinkThumb))}" class="w-full h-40 object-contain bg-black/30 rounded-2xl mb-3 shadow-inner" loading="lazy" onerror="this.outerHTML='<div class=\\'w-full h-40 bg-black/30 rounded-2xl mb-3 flex items-center justify-center text-4xl\\'>🍹</div>'">` 
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
                        ${abvBadge}
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

                <!-- Bardak & Teknik & Sayaç -->
                <div class="flex flex-wrap items-center gap-1.5 pt-1">
                    <span class="text-[10px] bg-white/5 text-slate-300 border border-white/10 px-2.5 py-1 rounded-xl flex items-center gap-1">${techniqueBadge}</span>
                    <button onclick="openTimerForDrink(decodeURIComponent('${drinkIdEncoded}'), event)" class="pill-btn text-[10px] bg-amber-500/10 text-amber-300 border border-amber-500/30 px-2.5 py-1 rounded-xl flex items-center gap-1 hover:bg-amber-500/20 font-semibold shadow-sm">⏱️ Sayaç</button>
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
                triggerHaptic('light');
                details.classList.add('open');
                icon.innerText = "Kapat ▲";
                if (!d.isCustom) {
                    if (!d.strInstructionsTR) {
                        span.textContent = "Çevriliyor...";
                        const trText = await translateToTurkish(d.strInstructions);
                        d.strInstructionsTR = cleanInstructionText(trText);
                        if (db) {
                            try {
                                const tx = db.transaction("cocktails", "readwrite");
                                tx.objectStore("cocktails").put(d);
                            } catch(e) {}
                        }
                    } else {
                        d.strInstructionsTR = cleanInstructionText(d.strInstructionsTR);
                    }
                    span.textContent = d.strInstructionsTR;
                }
            } else {
                details.classList.remove('open');
                icon.innerText = "Detay ▼";
            }
        };
        return card;
}

const COCKTAIL_PAGE_SIZE = 24;

function renderLists(items, container, isMissingList) {
    container.innerHTML = "";
    if (!items || items.length === 0) {
        container.innerHTML = `<div class="col-span-full text-center py-8 text-slate-500 text-xs">Bu kriterlere uygun kokteyl bulunamadı.</div>`;
        return;
    }

    let currentIndex = 0;

    function renderBatch() {
        const oldWrapper = container.querySelector('.load-more-container');
        if (oldWrapper) oldWrapper.remove();

        const nextBatch = items.slice(currentIndex, currentIndex + COCKTAIL_PAGE_SIZE);
        const fragment = document.createDocumentFragment();
        nextBatch.forEach(item => {
            fragment.appendChild(createCocktailCardElement(item, isMissingList));
        });
        container.appendChild(fragment);
        currentIndex += nextBatch.length;

        if (currentIndex < items.length) {
            const remaining = items.length - currentIndex;
            const loadMoreWrapper = document.createElement('div');
            loadMoreWrapper.className = "col-span-full flex flex-col items-center py-6 load-more-container";
            loadMoreWrapper.innerHTML = `
                <button class="pill-btn px-6 py-2.5 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-bold hover:bg-amber-500/25 shadow-lg flex items-center gap-2">
                    <span>Daha Fazla Göster (+${Math.min(remaining, COCKTAIL_PAGE_SIZE)})</span>
                    <span class="text-slate-400 font-normal">Kalan: ${remaining}</span>
                </button>
            `;
            const btn = loadMoreWrapper.querySelector('button');
            btn.onclick = (e) => {
                e.stopPropagation();
                triggerHaptic('light');
                renderBatch();
            };

            if ('IntersectionObserver' in window) {
                const observer = new IntersectionObserver((entries) => {
                    if (entries[0].isIntersecting) {
                        observer.disconnect();
                        renderBatch();
                    }
                }, { rootMargin: '300px' });
                observer.observe(loadMoreWrapper);
            }

            container.appendChild(loadMoreWrapper);
        }
    }

    renderBatch();
}

async function shareCustomRecipe(id, event) {
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
    } else if (navigator.clipboard && navigator.clipboard.writeText) {
        try {
            await navigator.clipboard.writeText(shareText);
            alert("Tarif panoya kopyalandı!");
        } catch(err) {
            alert("Kopyalama başarısız oldu. Tarif içeriği:\n\n" + shareText);
        }
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
    const data = { favorites: favoriteCocktails, customs: customRecipes, shopping: shoppingList, selected: selectedIngredients };
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
        if(Array.isArray(decrypted.selected)) selectedIngredients = decrypted.selected;
        
        try {
            localStorage.setItem('favoriteCocktails', JSON.stringify(favoriteCocktails));
            localStorage.setItem('customRecipes', JSON.stringify(customRecipes));
            localStorage.setItem('shoppingList', JSON.stringify(shoppingList));
            localStorage.setItem('selectedIngredients', JSON.stringify(selectedIngredients));
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
                
                // Önceden çevrilmiş ve önbelleğe entity (&#39;) ile kaydedilmiş tarifleri temizle
                allCocktails.forEach(d => {
                    if (d.strInstructionsTR) {
                        const cleaned = cleanInstructionText(d.strInstructionsTR);
                        if (d.strInstructionsTR !== cleaned) {
                            d.strInstructionsTR = cleaned;
                            try {
                                const wtx = db.transaction("cocktails", "readwrite");
                                wtx.objectStore("cocktails").put(d);
                            } catch(e) {}
                        }
                    }
                    enrichDrink(d);
                });
                autoExtractAllIngredients();
                renderIngredients(); 
                filterCocktails();
                
                if (statusEl) statusEl.innerText = `${allCocktails.length + customRecipes.length} Tarif Hazır`;
                updateDataInBackground();
                return;
            }
        }

        if (statusEl) statusEl.innerText = "Paketlenmiş veritabanı yükleniyor...";
        await fetchAndStoreData();

    } catch (err) {
        console.error("Veri yükleme hatası:", err);
        if (statusEl) statusEl.innerText = "Çevrimdışı Mod";
        autoExtractAllIngredients();
        renderIngredients();
        filterCocktails();
    }
}

async function fetchAndStoreData() {
    const statusEl = document.getElementById('status');
    let loadedDrinks = [];

    // 1. Önce yerel bundled cocktails.json dosyasından anında yüklemeyi dene
    try {
        const localResp = await fetch('./cocktails.json');
        if (localResp.ok) {
            loadedDrinks = await localResp.json();
        }
    } catch(e) {
        console.warn("Yerel cocktails.json okunamadı, internetten indirilecek:", e);
    }

    // 2. Yerel JSON yoksa veya boşsa API'den indir
    if (!loadedDrinks || loadedDrinks.length === 0) {
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
        loadedDrinks = apiDrinks;
    }

    const uniqueDrinks = new Map();
    loadedDrinks.forEach(drink => {
        if (drink && drink.idDrink) uniqueDrinks.set(drink.idDrink, drink);
    });
    allCocktails = Array.from(uniqueDrinks.values());
    allCocktails.forEach(enrichDrink);

    if (allCocktails.length > 0 && db) {
        try {
            const writeTx = db.transaction("cocktails", "readwrite");
            const writeStore = writeTx.objectStore("cocktails");
            allCocktails.forEach(drink => writeStore.put(drink));
        } catch(e) {}
    }

    try {
        localStorage.setItem('bar_cepte_last_sync', Date.now().toString());
    } catch(e) {}

    autoExtractAllIngredients();
    renderIngredients();
    filterCocktails();

    if (statusEl) statusEl.innerText = `${allCocktails.length + customRecipes.length} Tarif Hazır`;
}

const SYNC_INTERVAL_MS = 14 * 24 * 60 * 60 * 1000; // 14 günde bir otomatik kontrol

async function updateDataInBackground(force = false) {
    try {
        const lastSync = parseInt(localStorage.getItem('bar_cepte_last_sync') || '0', 10);
        const now = Date.now();
        if (!force && (now - lastSync < SYNC_INTERVAL_MS)) {
            return; // 14 gün dolmadan arka planda 26 API çağrısı yapma
        }

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
        apiDrinks.forEach(drink => {
            if (drink && drink.idDrink) uniqueDrinks.set(drink.idDrink, drink);
        });
        const newCocktails = Array.from(uniqueDrinks.values());

        if (newCocktails.length > 0) {
            try {
                localStorage.setItem('bar_cepte_last_sync', Date.now().toString());
            } catch(e) {}
        }

        if (newCocktails.length > allCocktails.length || force) {
            newCocktails.forEach(enrichDrink);
            if (db) {
                const writeTx = db.transaction("cocktails", "readwrite");
                const writeStore = writeTx.objectStore("cocktails");
                newCocktails.forEach(drink => writeStore.put(drink));
            }
            
            allCocktails = newCocktails;
            autoExtractAllIngredients();
            renderIngredients();
            filterCocktails();
            if (currentTab === 'my-recipes') renderMyRecipes();
            
            const statusEl = document.getElementById('status');
            if (statusEl) statusEl.innerText = `${allCocktails.length + customRecipes.length} Tarif Güncellendi`;
        }
    } catch (error) {
        console.error("Arka plan güncelleme hatası:", error);
    }
}

async function forceSyncOnlineDatabase() {
    triggerHaptic('medium');
    const statusEl = document.getElementById('status');
    if (statusEl) statusEl.innerText = "Online veritabanı eşitleniyor...";
    await updateDataInBackground(true);
    alert("Kokteyl veritabanı internet üzerinden başarıyla eşitlendi!");
}
