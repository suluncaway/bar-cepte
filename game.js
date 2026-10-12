// Bar Cepte — Akıllı Bar & Kokteyl Asistanı

// Temel Malzemeler Kataloğu
const baseIngredients = [
    { id: "Vodka", name: "Votka", nameEn: "Vodka", emoji: "🍸", cat: "alkol", taste: "Sert", cal: 64 },
    { id: "Gin", name: "Cin", nameEn: "Gin", emoji: "🌲", cat: "alkol", taste: "Sert", cal: 64 },
    { id: "Rum", name: "Rom", nameEn: "Rum", emoji: "🏴‍☠️", cat: "alkol", taste: "Sert", cal: 64 },
    { id: "Tequila", name: "Tekila", nameEn: "Tequila", emoji: "🌵", cat: "alkol", taste: "Sert", cal: 64 },
    { id: "Triple Sec", name: "Portakal Likörü", nameEn: "Triple Sec", emoji: "🍊", cat: "alkol", taste: "Tatlı", cal: 100 },
    { id: "Whiskey", name: "Viski", nameEn: "Whiskey", emoji: "🥃", cat: "alkol", taste: "Sert", cal: 70 },
    { id: "Bourbon", name: "Burbon Viski", nameEn: "Bourbon", emoji: "🪵", cat: "alkol", taste: "Sert", cal: 70 },
    { id: "Amaretto", name: "Amaretto", nameEn: "Amaretto", emoji: "🌰", cat: "alkol", taste: "Tatlı", cal: 110 },
    { id: "Campari", name: "Campari", nameEn: "Campari", emoji: "❤️", cat: "alkol", taste: "Ekşi", cal: 80 },
    { id: "Sweet Vermouth", name: "Tatlı Vermut", nameEn: "Sweet Vermouth", emoji: "🍷", cat: "alkol", taste: "Tatlı", cal: 45 },
    { id: "Dry Vermouth", name: "Sek Vermut", nameEn: "Dry Vermouth", emoji: "🍸", cat: "alkol", taste: "Ekşi", cal: 45 },
    { id: "Lime Juice", name: "Misket Limonu Suyu", nameEn: "Lime Juice", emoji: "🟢", cat: "mutfak", taste: "Ekşi", cal: 8 },
    { id: "Lemon Juice", name: "Limon Suyu", nameEn: "Lemon Juice", emoji: "🟡", cat: "mutfak", taste: "Ekşi", cal: 7 },
    { id: "Orange Juice", name: "Portakal Suyu", nameEn: "Orange Juice", emoji: "🍹", cat: "mutfak", taste: "Tatlı", cal: 45 },
    { id: "Cranberry Juice", name: "Kızılcık Suyu", nameEn: "Cranberry Juice", emoji: "🍒", cat: "mutfak", taste: "Ekşi", cal: 46 },
    { id: "Pineapple Juice", name: "Ananas Suyu", nameEn: "Pineapple Juice", emoji: "🍍", cat: "mutfak", taste: "Tatlı", cal: 50 },
    { id: "Grenadine", name: "Nar Şurubu", nameEn: "Grenadine", emoji: "🩸", cat: "mutfak", taste: "Tatlı", cal: 54 },
    { id: "Coca-Cola", name: "Kola", nameEn: "Cola", emoji: "🥤", cat: "mutfak", taste: "Tatlı", cal: 42 },
    { id: "Tonic Water", name: "Tonik", nameEn: "Tonic Water", emoji: "🫧", cat: "mutfak", taste: "Ekşi", cal: 34 },
    { id: "Soda Water", name: "Maden Suyu", nameEn: "Club Soda", emoji: "💦", cat: "mutfak", taste: "Ferah", cal: 0 },
    { id: "Egg White", name: "Yumurta Akı", nameEn: "Egg White", emoji: "🥚", cat: "mutfak", taste: "Ferah", cal: 15 },
    { id: "Salt", name: "Tuz", nameEn: "Salt", emoji: "🧂", cat: "mutfak", taste: "Sert", cal: 0 },
    { id: "Sugar", name: "Şeker", nameEn: "Sugar", emoji: "🍬", cat: "mutfak", taste: "Tatlı", cal: 30 },
    { id: "Milk", name: "Süt", nameEn: "Milk", emoji: "🥛", cat: "mutfak", taste: "Tatlı", cal: 42 },
    { id: "Coffee", name: "Kahve", nameEn: "Coffee", emoji: "☕", cat: "mutfak", taste: "Sert", cal: 2 },
    { id: "Mint", name: "Nane", nameEn: "Mint", emoji: "🍃", cat: "mutfak", taste: "Ferah", cal: 1 },
    { id: "Ice", name: "Buz", nameEn: "Ice", emoji: "🧊", cat: "mutfak", taste: "Ferah", cal: 0 }
];

let currentLang = 'tr';
try { currentLang = localStorage.getItem('bar_cepte_lang') || localStorage.getItem('bar_language') || 'tr'; } catch(e) {}
if (typeof window !== 'undefined') window.currentLang = currentLang;
let currentUnit = 'cl';
try {
    currentUnit = localStorage.getItem('bar_cepte_unit') || localStorage.getItem('bar_unit') || (currentLang === 'en' ? 'oz' : 'cl');
} catch(e) {}
if (typeof window !== 'undefined') window.currentUnit = currentUnit;

const I18N = {
    tr: {
        brand: 'Bar Cepte',
        title: 'Bar Cepte — Akıllı Bar & Kokteyl Asistanı',
        statusReady: 'Tarifler hazır',
        statusCount: 'Tarif Hazır',
        statusLoading: 'Paketlenmiş veritabanı yükleniyor...',
        timer: 'Sayaç',
        keepScreenOn: 'Ekran Koru',
        install: 'Yükle',
        support: 'Destek Ol',
        signIn: 'Giriş Yap',
        myBar: 'Barım',
        exploreDrinks: 'Kokteyl keşfet',
        kitchen: 'Mutfak',
        favorites: 'Favoriler',
        addRecipe: '+ Tarif ekle',
        myRecipes: 'Tariflerim',
        shopping: 'Alışveriş',
        backup: 'Yedekleme',
        heroEyebrow: 'EVDEKİ BARIN, BİR ADIM ÖTEDE',
        heroHeading: 'Bu akşam,<br><span>barmen sensin.</span>',
        heroDesc: 'Elindeki malzemelerden yeni favorine.<br>Barını oluştur, zevkine göre keşfet ve güzel bir şeyler hazırla.',
        heroBuildBar: 'Barımı oluştur',
        heroSurprise: 'Bana bir tarif öner',
        heroNote: '<span class="status-dot"></span> Alkollü & alkolsüz tarifler <span class="note-divider"></span> Tamamen senin zevkin',
        heroCaptionSpan: 'BAR CEPTE SEÇKİSİ',
        heroCaptionStrong: 'İyi bir akşamın<br>küçük ritüeli.',
        discoveryEyebrow: 'KEŞİF TEZGÂHI',
        discoveryHeading: 'Senin barında ne var?',
        startChoosing: 'Malzemelerini seçerek başla',
        clear: '🗑️ Temizle',
        searchIngPlaceholder: 'Malzeme ara: cin, nane, limon…',
        searchCocktailPlaceholder: 'Kokteyl veya malzeme yaz: \'rom nane\', \'Margarita\'…',
        random: '🎲 Rastgele',
        filterByProfile: 'Zevkine göre daralt',
        all: 'Hepsi',
        alcoholic: 'Alkollü',
        nonAlcoholic: 'Alkolsüz',
        allTastes: 'Tüm Tatlar',
        tasteStrong: '🔥 Sert',
        tasteSweet: '🍭 Tatlı',
        tasteSour: '🍋 Ekşi',
        tasteFresh: '🍃 Ferah',
        vibeLabel: '🎭 Ortam:',
        vibeAll: 'Tümü',
        vibeSummer: '☀️ Yaz & Havuz',
        vibeRomantic: '🕯️ Romantik Akşam',
        vibeChill: '🍿 Dizi & Film',
        vibeWinter: '❄️ Kış & Şömine',
        vibeParty: '🎉 Parti & Shot',
        readyTitle: 'Hemen Yapabileceklerin',
        missingTitle: 'Yaklaştığın Tarifler (1-4 Eksik)',
        missingSearchTitle: 'Arama Sonuçları (Eksik Malzemeli)',
        missingFavTitle: 'Favorilerim (Eksik Malzemeli)',
        emptyDiscovery: 'Yukarıdan malzeme seçerek veya kokteyl adı aratarak kokteylleri keşfedebilirsin.',
        noSelectedIng: 'Henüz seçili malzeme yok.',
        detailsToggle: 'Detay ▼',
        detailsClose: 'Kapat ▲',
        homeCost: 'Ev Maliyeti:',
        barSavings: 'Bar Tasarrufu:',
        portions: '👥 Porsiyon:',
        partyPortion: '8x Parti',
        ingredientsMeasures: 'Malzemeler & Ölçüler:',
        timerBtn: '⏱️ Sayaç',
        storyBtn: '📸 Story İndir',
        servingGarnish: 'Servis/Garnitür:',
        instructions: 'Hazırlanışı:',
        startMix: 'Adım Adım Hazırlamaya Başla',
        missingWarn: '⚠️ Eksik:',
        substitute: 'Muadil:',
        addToBar: 'Bara Ekle',
        inCart: '🛒 Çıkar',
        addToCart: '➕ Alışverişe Ekle',
        shoppingInList: '🛒 Listede',
        shoppingAdd: '🛒 Listeye Ekle',
        smartTipTitle: 'AKILLI BAR ÖNERİSİ',
        barOverview: 'Bar Durumu & Envanter',
        barFillRate: 'Bar Doluluk Oranı',
        availableCocktails: 'Yapılabilen Kokteyl',
        ingredientsInBar: 'Barındaki Malzemeler:',
        emptyBarBtn: '🗑️ Barı Boşalt',
        affiliateLabel: 'ÖNERİ',
        affiliateTitle: 'Paslanmaz Shaker & Bar Seti',
        affiliateDesc: 'Evde kokteyl hazırlamak için gereken tüm temel ekipmanlar',
        affiliateBtn: 'İncele',
        footerTitle: 'Bar Cepte — Akıllı Bar & Kokteyl Asistanı',
        footerBarware: '🛒 Bar Ekipmanları',
        footerPrivacy: '🛡️ Gizlilik & 18+ Yasal Uyarı',
        footer18Title: '18+ YASAL BİLGİLENDİRME & SORUMLU TÜKETİM',
        footer18Text: 'Bar Cepte içerisindeki tüm kokteyl tarifleri, rehberler ve yayınlanan reklamlar yalnızca <strong>18 yaş ve üzeri</strong> yetişkinler içindir. 18 yaşından küçüklerin alkol tüketimi ve satın alması yasalara aykırıdır. Sağlığınız için lütfen ölçülü ve sorumlu tüketiniz.',
        emptyBarDesc: "Henüz barına malzeme eklemedin. 'Kokteyl keşfet' veya 'Mutfak' sekmesinden malzeme seçebilirsin.",
        alcoholsLiquors: "Alkoller & Likörler",
        kitchenMixers: "Mutfak & Mikserler",
        emptyShoppingList: "Alışveriş listeniz boş. Eksik malzemelerden 'Alışverişe Ekle' butonuna basarak liste oluşturabilirsiniz.",
        bought: "✓ Aldım",
        remove: "Sil",
        noCustomRecipes: "Henüz kendi özel tarifini eklemedin. '✨ Tarif Ekle' sekmesinden ekleyebilirsin.",
        customTitle: "✨ Yeni Kokteyl Tarifi Ekle",
        myRecipesTitle: "📜 Kendi Eklediğim Özel Tarifler",
        shoppingTitle: "🛒 Eksik Malzeme Alışveriş Listesi",
        clearAll: "Hepsini Sil",
        syncTitle: "⚙️ Veri Yedekleme & Aktarım",
        syncDesc: "Favori kokteyllerinizi ve kendi tariflerinizi başka bir cihaza taşımak için kodu kopyalayın veya yapıştırın.",
        copyBackup: "Yedekleme Kodunu Kopyala",
        pasteBackupPlaceholder: "Başka cihazdan aldığınız yedekleme kodunu buraya yapıştırın...",
        restoreBackup: "Yedeği Geri Yükle",
        updateDb: "Kokteyl Veritabanını Güncelle",
        checkUpdates: "Yeni Sürüm Kontrolü Yap",
        editorialEyebrow: "KLASİKLERDEN İLHAM AL",
        editorialHeading: "Her güzel akşamın bir tarifi var.",
        editorialAside: "Bir tarif seç, detaylarını keşfet.",
        overviewBadge: "GENEL BAKIŞ",
        smartAdviceTitle: "Akıllı Bar Önerisi",
        optAlcoholic: "Alkollü Kokteyl",
        optMocktail: "Alkolsüz (Mocktail)",
        optMartini: "🍸 Martini / Kadeh",
        optHighball: "🥤 Uzun Bardak (Highball)",
        optRocks: "🥃 Kısa Bardak (On the Rocks)",
        optShot: "🥃 Shot Bardağı",
        optFlute: "🥂 Şampanya Kadehi",
        optCopper: "🪣 Bakır Kupa (Mule)",
        photoLabel: "📷 Kokteyl Fotoğrafı:",
        saveRecipeBtn: "Tarifi Kaydet",
        syncOnlineDbNote: "Çevrimiçi veritabanından yeni kokteylleri kontrol et:",
        updateTitle: "YENİ SÜRÜM MEVCUT!",
        updateVersionText: "v1.2.0 hazır",
        updateWhatsNew: "Yenilikler:",
        updateNotes: "Hata düzeltmeleri ve performans iyileştirmeleri.",
        updateBtn: "Şimdi Güncelle",
        updateLaterBtn: "Daha Sonra Hatırlat",
        timerTitle: "BARMEN ZAMANLAYICISI",
        timerPreset15: "15s Shaker",
        timerPreset30: "30s Karıştır",
        timerPreset45: "45s Soğut",
        timerStart: "▶ Başlat",
        timerPause: "⏸ Duraklat",
        timerReset: "🔄 Sıfırla",
        mixEyebrow: "🍸 BARMEN MODU",
        mixPrev: "← Önceki",
        mixNext: "Sonraki Adım →",
        mixFinish: "Tamamla & Kapat ✓",
        reserveExclusiveClub: "ÖZEL SEÇKİ KULÜBÜ",
        reserveBullet1: "<strong>%100 Reklamsız Deneyim:</strong> Sıfır reklam, kesintisiz hız.",
        reserveBullet2: "<strong>Gizli Speakeasy Seçkisi:</strong> Usta barmenlerin imza kokteylleri ve şurup rehberleri.",
        reserveBullet3: "<strong>Parti & Porsiyon Modu:</strong> 10-50 kişilik davetler için tam malzeme hesabı.",
        reserveBullet4: "<strong>Reserve Altın Rozeti:</strong> Hesabında parıldayan statü ve öncelikli destek.",
        reserveHaveKey: "Zaten bir aktivasyon kodun var mı?",
        reserveActivateBtn: "Aktive Et",
        reserveActiveHeading: "Reserve Üyeliğiniz Aktif!",
        reserveActiveDesc: "Tüm ayrıcalıklar, gizli kokteyller ve reklamsız deneyim bu cihazda devrede.",
        reserveActiveNote: "Keyifli akşamlar dileriz. Tezgâhın kontrolü sizde! 🍸",
        reserveDeactivateBtn: "Bu cihazdan üyeliği kaldır",
        authH3: "BARMEN KULÜBÜ",
        authDesc: "Google hesabınla bağlan, bar dolabını ve VIP ayrıcalıklarını tüm cihazlarına eşitle.",
        authBullet1: "<strong class=\"text-white\">Bulut Senkronizasyonu:</strong> Favori kokteyllerin, bar dolabın ve tariflerin asla silinmez.",
        authBullet2: "<strong class=\"text-white\">Çoklu Cihaz:</strong> Telefondan veya bilgisayardan açtığında tüm seçimlerin anında karşında.",
        authBullet3: "<strong class=\"text-white\">Tek Kullanımlık Lisans Koruma:</strong> Satın aldığın Shopier kodun hesabına mühürlenir.",
        authGuestBtn: "⚡ Veya Misafir Barmen Olarak Devam Et",
        authSyncTitle: "Bulut Senkronizasyonu",
        authSyncActive: "● Devrede",
        authSyncDesc: "Favorileriniz, bar dolabınız ve özel tarifleriniz Google hesabınızla güvenle eşitleniyor.",
        authLastSyncLabel: "Son Eşitleme:",
        authSyncNowBtn: "Şimdi Eşitle ⟳",
        authLinkTitle: "Shopier Kodunu Hesabına Bağla",
        authLinkDesc: "Shopier'dan aldığın aktivasyon anahtarını hesabına mühürle; tüm cihazlarında kod yazmadan VIP ol.",
        authLinkBtn: "Bağla",
        authLogoutBtn: "Hesaptan Çıkış Yap",
        supportTitle: "Bar Cepte’ye destek",
        supportDesc: "Destek sayfamız henüz hazır değil. Bağlantı doğrulandığında buradan güvenle ulaşabileceksiniz. İlginiz için teşekkür ederiz.",
        supportClose: "Tamam"
    },
    en: {
        brand: 'Pocket Bar',
        title: 'Pocket Bar — Smart Home Bar & Cocktail Assistant',
        statusReady: 'Recipes ready',
        statusCount: 'Recipes Ready',
        statusLoading: 'Loading cocktail database...',
        timer: 'Timer',
        keepScreenOn: 'Keep Awake',
        install: 'Install',
        support: 'Support',
        signIn: 'Sign In',
        myBar: 'My Bar',
        exploreDrinks: 'Explore Drinks',
        kitchen: 'Kitchen',
        favorites: 'Favorites',
        addRecipe: '+ Add Recipe',
        myRecipes: 'My Recipes',
        shopping: 'Shopping List',
        backup: 'Backup & Sync',
        heroEyebrow: 'YOUR HOME BAR, ONE STEP AWAY',
        heroHeading: 'Tonight,<br><span>you\'re the bartender.</span>',
        heroDesc: 'From ingredients on hand to your new favorite drink.<br>Build your bar, explore your taste, and mix something great.',
        heroBuildBar: 'Build My Bar',
        heroSurprise: 'Surprise Me',
        heroNote: '<span class="status-dot"></span> Alcoholic & non-alcoholic recipes <span class="note-divider"></span> Crafted for your taste',
        heroCaptionSpan: 'POCKET BAR SELECTION',
        heroCaptionStrong: 'A little ritual<br>for a great evening.',
        discoveryEyebrow: 'DISCOVERY COUNTER',
        discoveryHeading: 'What\'s in your bar?',
        startChoosing: 'Start by choosing your ingredients',
        clear: '🗑️ Clear',
        searchIngPlaceholder: 'Search ingredients: gin, mint, lime…',
        searchCocktailPlaceholder: 'Search cocktail or ingredient: \'rum mint\', \'Margarita\'…',
        random: '🎲 Random',
        filterByProfile: 'Filter by taste profile',
        all: 'All',
        alcoholic: 'Alcoholic',
        nonAlcoholic: 'Non-Alcoholic',
        allTastes: 'All Tastes',
        tasteStrong: '🔥 Strong',
        tasteSweet: '🍭 Sweet',
        tasteSour: '🍋 Sour',
        tasteFresh: '🍃 Fresh',
        vibeLabel: '🎭 Vibe:',
        vibeAll: 'All',
        vibeSummer: '☀️ Summer & Pool',
        vibeRomantic: '🕯️ Romantic Night',
        vibeChill: '🍿 Movie & Chill',
        vibeWinter: '❄️ Cozy Winter',
        vibeParty: '🎉 Party & Shots',
        readyTitle: 'Ready to Make Right Now',
        missingTitle: 'Almost Ready (Missing 1-4)',
        missingSearchTitle: 'Search Results (Missing Ingredients)',
        missingFavTitle: 'Favorites (Missing Ingredients)',
        emptyDiscovery: 'Select ingredients above or search by cocktail name to discover drinks.',
        noSelectedIng: 'No ingredients selected yet.',
        detailsToggle: 'Details ▼',
        detailsClose: 'Close ▲',
        homeCost: 'Home Cost:',
        barSavings: 'Bar Savings:',
        portions: '👥 Servings:',
        partyPortion: '8x Party',
        ingredientsMeasures: 'Ingredients & Measures:',
        timerBtn: '⏱️ Timer',
        storyBtn: '📸 Story Card',
        servingGarnish: 'Garnish / Glass:',
        instructions: 'Instructions:',
        startMix: 'Start Step-by-Step Mix',
        missingWarn: '⚠️ Missing:',
        substitute: 'Substitute:',
        addToBar: 'Add to Bar',
        inCart: '🛒 In Cart',
        addToCart: '➕ Add to Cart',
        shoppingInList: '🛒 In List',
        shoppingAdd: '🛒 Add to List',
        smartTipTitle: 'SMART BAR TIP',
        barOverview: 'Bar Inventory & Overview',
        barFillRate: 'Bar Fill Rate',
        availableCocktails: 'Available Cocktails',
        ingredientsInBar: 'Ingredients in Your Bar:',
        emptyBarBtn: '🗑️ Empty Bar',
        affiliateLabel: 'STAFF PICK',
        affiliateTitle: 'Stainless Steel Cocktail Shaker Set',
        affiliateDesc: 'Essential bar tools for crafting premium cocktails at home',
        affiliateBtn: 'View',
        footerTitle: 'Pocket Bar — Smart Home Bar & Cocktail Assistant',
        footerBarware: '🛒 Bar Tools & Equipment',
        footerPrivacy: '🛡️ Privacy & 21+ Notice',
        footer18Title: '21+ LEGAL NOTICE & RESPONSIBLE DRINKING',
        footer18Text: 'All cocktail recipes and contents in Pocket Bar are strictly intended for adults of legal drinking age (21+ in the US). Please enjoy responsibly and in moderation.',
        emptyBarDesc: "No ingredients in your bar yet. Select ingredients from 'Explore Drinks' or 'Kitchen' tab.",
        alcoholsLiquors: "Spirits & Liqueurs",
        kitchenMixers: "Kitchen & Mixers",
        emptyShoppingList: "Your shopping list is empty. Add missing items from recipe cards.",
        bought: "✓ Got It",
        remove: "Delete",
        noCustomRecipes: "No custom recipes added yet. Tap '+ Add Recipe' to create one.",
        customTitle: "✨ Add Custom Cocktail Recipe",
        myRecipesTitle: "📜 My Custom Recipes",
        shoppingTitle: "🛒 Shopping List",
        clearAll: "Clear All",
        syncTitle: "⚙️ Backup & Device Sync",
        syncDesc: "Copy or paste your backup code to transfer your bar, favorites, and recipes between devices.",
        copyBackup: "Copy Backup Code",
        pasteBackupPlaceholder: "Paste your backup code here...",
        restoreBackup: "Restore Backup",
        updateDb: "Update Cocktail Database",
        checkUpdates: "Check for Updates",
        editorialEyebrow: "INSPIRED BY CLASSICS",
        editorialHeading: "Every great evening has a recipe.",
        editorialAside: "Pick a recipe, explore the details.",
        overviewBadge: "OVERVIEW",
        smartAdviceTitle: "Smart Bar Tip",
        optAlcoholic: "Alcoholic Cocktail",
        optMocktail: "Non-Alcoholic (Mocktail)",
        optMartini: "🍸 Martini / Cocktail Glass",
        optHighball: "🥤 Tall Glass (Highball)",
        optRocks: "🥃 Short Glass (On the Rocks)",
        optShot: "🥃 Shot Glass",
        optFlute: "🥂 Champagne Flute",
        optCopper: "🪣 Copper Mug (Mule)",
        photoLabel: "📷 Cocktail Photo:",
        saveRecipeBtn: "Save Recipe",
        syncOnlineDbNote: "Check for new cocktails from online database:",
        updateTitle: "NEW VERSION AVAILABLE!",
        updateVersionText: "v1.2.0 ready",
        updateWhatsNew: "What's New:",
        updateNotes: "Bug fixes and performance improvements.",
        updateBtn: "Update Now",
        updateLaterBtn: "Remind Later",
        timerTitle: "BARTENDER TIMER",
        timerPreset15: "15s Shake",
        timerPreset30: "30s Stir",
        timerPreset45: "45s Chill",
        timerStart: "▶ Start",
        timerPause: "⏸ Pause",
        timerReset: "🔄 Reset",
        mixEyebrow: "🍸 BARTENDER MODE",
        mixPrev: "← Previous",
        mixNext: "Next Step →",
        mixFinish: "Finish ✓",
        reserveExclusiveClub: "EXCLUSIVE CURATION CLUB",
        reserveBullet1: "<strong>100% Ad-Free Experience:</strong> Zero ads, pure speed.",
        reserveBullet2: "<strong>Secret Speakeasy Curation:</strong> Master bartenders' signature cocktails & syrup guides.",
        reserveBullet3: "<strong>Party & Batch Calculator:</strong> Exact ingredient scaling for 10-50 guests.",
        reserveBullet4: "<strong>Reserve Gold Badge:</strong> Shining status on your account & priority support.",
        reserveHaveKey: "Already have an activation code?",
        reserveActivateBtn: "Activate",
        reserveActiveHeading: "Your Reserve Membership is Active!",
        reserveActiveDesc: "All privileges, secret cocktails, and ad-free experience are active on this device.",
        reserveActiveNote: "Enjoy your evening. You run the bar tonight! 🍸",
        reserveDeactivateBtn: "Remove membership from this device",
        authH3: "BARTENDER CLUB",
        authDesc: "Connect with your Google account to sync your bar cabinet and VIP privileges across all devices.",
        authBullet1: "<strong class=\"text-white\">Cloud Sync:</strong> Your favorite cocktails, home bar cabinet, and recipes are safely stored.",
        authBullet2: "<strong class=\"text-white\">Multi-Device:</strong> Instantly access all your ingredients and drinks on phone, tablet, or PC.",
        authBullet3: "<strong class=\"text-white\">Protected VIP License:</strong> Your purchased VIP code is permanently sealed to your account.",
        authGuestBtn: "⚡ Or Continue as Guest Bartender",
        authSyncTitle: "Cloud Sync",
        authSyncActive: "● Active",
        authSyncDesc: "Your favorites, bar cabinet, and custom recipes are securely synced with your Google account.",
        authLastSyncLabel: "Last Synced:",
        authSyncNowBtn: "Sync Now ⟳",
        authLinkTitle: "Link License Key to Account",
        authLinkDesc: "Seal your activation key to your account; enjoy VIP status across all devices without re-typing codes.",
        authLinkBtn: "Link",
        authLogoutBtn: "Sign Out",
        supportTitle: "Support Pocket Bar",
        supportDesc: "Our support page is being updated. You will be able to access verified support links shortly. Thank you for your support.",
        supportClose: "OK"
    }
};

let popularIngredients = [...baseIngredients];
let selectedIngredients = BarSecurity.readStored('selectedIngredients', BarSecurity.stringList);
let favoriteCocktails = BarSecurity.readStored('favoriteCocktails', BarSecurity.stringList);
let customRecipes = BarSecurity.readStored('customRecipes', BarSecurity.recipes);
let shoppingList = BarSecurity.readStored('shoppingList', BarSecurity.stringList);
let allCocktails = [];
let currentTab = "alkol";
let currentKitchenSubCat = "all";
let currentAlcoholSubCat = "all";
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

// Arama metinlerini normalleştirme (Türkçe karakter ve aksan duyarsızlığı)
function normalizeSearchText(str) {
    if (!str) return '';
    return str.toString()
        .toLocaleLowerCase('tr')
        .replace(/ı/g, 'i')
        .replace(/ğ/g, 'g')
        .replace(/ü/g, 'u')
        .replace(/ş/g, 's')
        .replace(/ö/g, 'o')
        .replace(/ç/g, 'c');
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
function getTimerPresetLabel(seconds) {
    const isEn = (typeof currentLang !== 'undefined' ? currentLang : (typeof window !== 'undefined' && window.currentLang)) === 'en';
    if (seconds === 15) {
        return isEn ? 'Shake vigorously with ice (Shaker)' : 'Buzla kuvvetlice çalkala (Shaker)';
    }
    if (seconds === 30) {
        return isEn ? 'Stir gently with ice (Stir)' : 'Buzla nazikçe karıştır (Stir)';
    }
    if (seconds === 45) {
        return isEn ? 'Chill thoroughly & blend' : 'İyice soğut ve harmanla';
    }
    return isEn ? `${seconds}s Mixing Timer` : `${seconds}s Barmen Zamanlayıcısı`;
}

function openTimerModal(duration = 15, label = '') {
    triggerHaptic('light');
    let finalLabel = label;
    if (!finalLabel ||
        finalLabel === 'Buzla kuvvetlice çalkala (Shaker)' || finalLabel === 'Shake vigorously with ice (Shaker)' ||
        finalLabel === 'Buzla nazikçe karıştır (Stir)' || finalLabel === 'Stir gently with ice (Stir)' ||
        finalLabel === 'İyice soğut ve harmanla' || finalLabel === 'Chill thoroughly & blend') {
        finalLabel = getTimerPresetLabel(duration);
    }
    setTimerDuration(duration, finalLabel);
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
    let finalLabel = label;
    if (!finalLabel ||
        finalLabel === 'Buzla kuvvetlice çalkala (Shaker)' || finalLabel === 'Shake vigorously with ice (Shaker)' ||
        finalLabel === 'Buzla nazikçe karıştır (Stir)' || finalLabel === 'Stir gently with ice (Stir)' ||
        finalLabel === 'İyice soğut ve harmanla' || finalLabel === 'Chill thoroughly & blend') {
        finalLabel = getTimerPresetLabel(seconds);
    }
    const labelEl = document.getElementById('timer-label');
    if (labelEl) labelEl.innerText = finalLabel;
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
        toggleBtn.innerText = currentLang === 'en' ? "⏸ Pause" : "⏸ Duraklat";
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
        toggleBtn.innerText = currentLang === 'en' ? "▶ Start" : "▶ Başlat";
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
    let label = currentLang === 'en' ? 'Shake with ice (Shaker)' : 'Buzla çalkala (Shaker)';
    
    if (/stir|karıştır/i.test(inst)) {
        duration = 30;
        label = currentLang === 'en' ? `Stir gently with ice (Stir): ${drinkName}` : `Buzla nazikçe karıştır (Stir): ${drinkName}`;
    } else if (/blend|blender/i.test(inst)) {
        duration = 20;
        label = currentLang === 'en' ? `Blend with ice: ${drinkName}` : `Blender ile çek: ${drinkName}`;
    } else if (/layer|float|katman/i.test(inst)) {
        duration = 30;
        label = currentLang === 'en' ? `Layer gently: ${drinkName}` : `Katmanlayarak dök: ${drinkName}`;
    } else {
        duration = 15;
        label = currentLang === 'en' ? `Shake vigorously with ice (Shaker): ${drinkName}` : `Buzla kuvvetlice çalkala (Shaker): ${drinkName}`;
    }
    
    openTimerModal(duration, label);
}

function openTimerForDrink(drinkId, event) {
    if (event) event.stopPropagation();
    const d = allCocktails.find(c => c.idDrink === drinkId) || customRecipes.find(c => c.idDrink === drinkId);
    if (d) {
        openTimerForTechnique(d.strInstructions || '', d.strDrink || '', event);
    } else {
        openTimerModal(15, currentLang === 'en' ? 'Shake vigorously with ice (Shaker)' : 'Buzla kuvvetlice çalkala (Shaker)');
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
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// Güvenli Görsel Kaynağı (XSS koruması: yalnızca http(s) ve data:image izinli)
function safeImageSrc(src) {
    return BarSecurity.safeImage(src);
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
    const trimmed = ingName.trim();
    if (currentLang === 'en') {
        const base = baseIngredients.find(b => b.id.toLowerCase() === trimmed.toLowerCase());
        if (base && base.nameEn) return base.nameEn;
        if (base) return base.id;
        return trimmed;
    }
    const lower = trimmed.toLowerCase();
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

function convertClToOz(text) {
    if (!text) return text;
    let res = text.replace(/(\d+(\.\d+)?)\s*cl\b/gi, (match, numStr) => {
        const val = parseFloat(numStr);
        const ozVal = Math.round((val / 3) * 10) / 10;
        const finalNum = ozVal % 1 === 0 ? ozVal.toFixed(0) : ozVal.toFixed(1);
        return `${finalNum} oz`;
    });
    res = res.replace(/(\d+(\.\d+)?)\s*ml\b/gi, (match, numStr) => {
        const val = parseFloat(numStr);
        const ozVal = Math.round((val / 30) * 10) / 10;
        const finalNum = ozVal % 1 === 0 ? ozVal.toFixed(0) : ozVal.toFixed(1);
        return `${finalNum} oz`;
    });
    return res;
}

function translateMeasureText(measureStr) {
    if (!measureStr) return '';
    let res = measureStr;
    if (currentUnit === 'oz') {
        res = convertClToOz(res);
        if (currentLang === 'tr') {
            Object.keys(measureTranslations).sort((a, b) => b.length - a.length).forEach(key => {
                const regex = new RegExp(`\\b${key}\\b`, 'gi');
                res = res.replace(regex, measureTranslations[key]);
            });
        }
    } else {
        res = convertOzToCl(res);
        if (currentLang === 'tr') {
            Object.keys(measureTranslations).sort((a, b) => b.length - a.length).forEach(key => {
                const regex = new RegExp(`\\b${key}\\b`, 'gi');
                res = res.replace(regex, measureTranslations[key]);
            });
        }
    }
    return res;
}

function getTasteLabel(taste) {
    if (currentLang === 'en') {
        switch (taste) {
            case 'Sert': return 'Strong';
            case 'Tatlı': return 'Sweet';
            case 'Ekşi': return 'Sour';
            case 'Ferah': return 'Fresh';
            case 'Dengeli': return 'Balanced';
            default: return taste || 'Classic';
        }
    }
    return taste || 'Dengeli';
}

function getAbvLabel(computedABV, lang = currentLang) {
    if (!computedABV) return lang === 'en' ? 'Custom' : 'Özel';
    const abv = typeof computedABV === 'object' ? (computedABV.abv ?? 0) : (Number(computedABV) || 0);
    if (abv === 0) {
        return lang === 'en' ? '🟢 Non-Alcoholic (0%)' : '🟢 Alkolsüz (%0)';
    }
    const icon = abv <= 8 ? '🍃' : abv <= 18 ? '🍹' : '🔥';
    return lang === 'en' 
        ? `${icon} ~${abv}% ABV` 
        : `${icon} ~%${abv} ABV`;
}

// IndexedDB Başlatma
function initDB() {
    return new Promise((resolve) => {
        let request;
        try { request = indexedDB.open("BarCepteDB", 2); }
        catch { resolve(); return; }
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
        request.onblocked = () => { resolve(); };
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
                if (statusText) statusText.innerText = currentLang === 'en' ? "Screen On" : "Ekran Açık";
                if (icon) icon.innerText = "⚡";
                
                wakeLock.addEventListener('release', () => {
                    wakeLock = null;
                    if (btn) btn.className = "pill-btn px-3 py-1.5 rounded-xl border border-white/10 bg-white/5 text-[11px] font-semibold text-slate-300 flex items-center gap-1.5 hover:border-amber-500/40 hover:bg-white/10";
                    if (statusText) statusText.innerText = currentLang === 'en' ? "Keep Awake" : "Ekran Koru";
                    if (icon) icon.innerText = "💡";
                });
            } catch (err) {
                alert(currentLang === 'en' ? "Screen wake lock could not be initialized on this device." : "Ekran kilidi bu cihazda başlatılamadı.");
            }
        } else {
            await wakeLock.release();
            wakeLock = null;
        }
    } else {
        alert(currentLang === 'en' ? "Your browser does not support Screen Wake Lock API." : "Tarayıcınız Ekran Uyanık Tutma (Screen Wake Lock) API'sini desteklemiyor.");
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
    if (!instructions) return currentLang === 'en' ? "🥄 Stir Gently" : "🥄 Karıştır";
    const inst = instructions.toLowerCase();
    if (/shake|çalkala/i.test(inst)) return currentLang === 'en' ? "🧊 Shake with Ice" : "🧊 Shaker ile Çalkala";
    if (/blend|blender/i.test(inst)) return currentLang === 'en' ? "🌪️ Blend with Ice" : "🌪️ Blender ile Çek";
    if (/layer|float|katman/i.test(inst)) return currentLang === 'en' ? "🍷 Layer Gently" : "🍷 Katmanlayarak Dök";
    if (/stir|karıştır/i.test(inst)) return currentLang === 'en' ? "🥄 Stir Well" : "🥄 Kaşıkla Karıştır";
    return currentLang === 'en' ? "🍸 Build in Glass" : "🍸 Bardağa Direkt Dök";
}

function getGlassBadge(glassStr) {
    if (!glassStr) return currentLang === 'en' ? "🍸 Cocktail Glass" : "🍸 Kokteyl Kadehi";
    if (currentLang === 'en') {
        const lower = glassStr.trim().toLowerCase();
        if (lower.includes('martini') || lower.includes('cocktail glass')) return `🍸 ${escapeHTML(glassStr)}`;
        if (lower.includes('highball') || lower.includes('collins')) return `🥤 ${escapeHTML(glassStr)}`;
        if (lower.includes('old-fashioned') || lower.includes('rocks') || lower.includes('whiskey')) return `🥃 ${escapeHTML(glassStr)}`;
        if (lower.includes('shot')) return `🥃 ${escapeHTML(glassStr)}`;
        if (lower.includes('champagne') || lower.includes('flute')) return `🥂 ${escapeHTML(glassStr)}`;
        if (lower.includes('copper') || lower.includes('mug')) return `🪣 ${escapeHTML(glassStr)}`;
        if (lower.includes('wine')) return `🍷 ${escapeHTML(glassStr)}`;
        if (lower.includes('beer') || lower.includes('pint')) return `🍺 ${escapeHTML(glassStr)}`;
        return `🍸 ${escapeHTML(glassStr)}`;
    }
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
        if(el) {
            el.className = "text-slate-400 py-1.5 px-2.5 rounded-xl shrink-0 transition-all hover:text-white";
            el.removeAttribute('aria-current');
        }
    });
    
    const activeTab = document.getElementById(`tab-${tab}`);
    if(activeTab) {
        activeTab.className = "bg-amber-500/15 text-amber-400 border border-amber-500/30 py-1.5 px-3 rounded-xl shrink-0 transition-all font-bold";
        activeTab.setAttribute('aria-current', 'page');
    }
    document.getElementById('editorial-hero')?.classList.toggle('hidden', !['alkol', 'mutfak'].includes(tab));
    document.getElementById('discovery-controls')?.classList.toggle('hidden', !['alkol', 'mutfak', 'favorites'].includes(tab));
    if (!['alkol', 'mutfak', 'favorites'].includes(tab)) {
        document.getElementById('smart-recommendation-banner')?.classList.add('hidden');
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

    const alcSubcatsEl = document.getElementById('alcohol-subcategories');
    if (alcSubcatsEl) {
        if (tab === 'alkol') {
            alcSubcatsEl.classList.remove('hidden');
        } else {
            alcSubcatsEl.classList.add('hidden');
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
    window.scrollTo({top: 0, behavior: 'instant'});
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

function setAlcoholSubCategory(subCat, btnEl) {
    triggerHaptic('light');
    currentAlcoholSubCat = subCat;
    document.querySelectorAll('#alcohol-subcategories .alcohol-subcat-btn').forEach(b => {
        const isMutfak = b.getAttribute('data-value') === 'mutfak';
        b.className = isMutfak
            ? "alcohol-subcat-btn pill-btn px-2.5 py-1 rounded-full bg-slate-900/80 text-emerald-400 border border-emerald-500/30 shrink-0 hover:text-white whitespace-nowrap"
            : "alcohol-subcat-btn pill-btn px-2.5 py-1 rounded-full bg-slate-900/80 text-slate-400 border border-white/10 shrink-0 hover:text-white whitespace-nowrap";
    });
    const target = btnEl || document.querySelector(`#alcohol-subcategories .alcohol-subcat-btn[data-value="${subCat}"]`);
    if (target) {
        target.className = "alcohol-subcat-btn pill-btn px-2.5 py-1 rounded-full bg-amber-500 text-slate-950 font-bold shrink-0 shadow-sm whitespace-nowrap";
    }
    renderIngredients();
}

function getAlcoholGroup(ing) {
    if (ing.cat === 'mutfak') return 'mutfak';
    const lower = ((ing.id || '') + ' ' + (ing.name || '')).toLowerCase();
    if (/(vodka|votka|gin|cin)/i.test(lower)) {
        return 'votka-cin';
    }
    if (/(whiskey|whisky|bourbon|scotch|rye|viski|brandy|cognac|konyak|brendi|pisco)/i.test(lower)) {
        return 'viski-konyak';
    }
    if (/(tequila|tekila|mezcal|rum|rom|cachaca|cachaça)/i.test(lower)) {
        return 'tekila-rom';
    }
    if (/(liqueur|likör|triple sec|cointreau|curacao|curaçao|amaretto|campari|aperol|kahlua|baileys|sambuca|schnapps|ouzo|absinthe|chartreuse|drambuie|frangelico|galliano|midori|malibu|passoa)/i.test(lower)) {
        return 'likor-aperitif';
    }
    if (/(wine|şarap|vermouth|vermut|champagne|prosecco|şampanya|beer|bira|ale|stout|cider)/i.test(lower)) {
        return 'sarap-bira';
    }
    return 'diger-alkol';
}

function getAlcoholGroupLabel(groupId) {
    if (currentLang === 'en') {
        switch (groupId) {
            case 'votka-cin': return 'Vodka & Gin';
            case 'viski-konyak': return 'Whiskey & Cognac';
            case 'tekila-rom': return 'Tequila & Rum';
            case 'likor-aperitif': return 'Liqueurs & Aperitifs';
            case 'sarap-bira': return 'Wine & Vermouth';
            case 'mutfak': return 'Kitchen';
            default: return 'Spirits';
        }
    }
    switch (groupId) {
        case 'votka-cin': return 'Votka & Cin';
        case 'viski-konyak': return 'Viski & Konyak';
        case 'tekila-rom': return 'Tekila & Rom';
        case 'likor-aperitif': return 'Likör & Aperitif';
        case 'sarap-bira': return 'Şarap & Vermut';
        case 'mutfak': return 'Mutfak';
        default: return 'Özel Alkol';
    }
}

function matchesAlcoholSubCategory(ing) {
    if (currentTab !== 'alkol') return true;
    if (currentAlcoholSubCat === 'mutfak') return ing.cat === 'mutfak';
    if (currentAlcoholSubCat === 'all') return ing.cat === 'alkol';
    if (ing.cat !== 'alkol') return false;
    const group = getAlcoholGroup(ing);
    if (currentAlcoholSubCat === group) return true;
    if (currentAlcoholSubCat === 'sarap-bira' && group === 'diger-alkol') return true;
    return false;
}

function updateFavoritesFilterUI() {
    const favBtn = document.getElementById('btn-fav-filter');
    const favText = document.getElementById('fav-filter-text');
    if (favText) {
        const label = currentLang === 'en' ? 'Favorites' : 'Favorilerim';
        favText.innerText = `${label} (${favoriteCocktails.length})`;
    }
    
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
    if(readyCountEl) readyCountEl.innerText = `${countReady} ${currentLang === 'en' ? 'Recipes' : 'Tarif'}`;

    const dashClearBtn = document.getElementById('btn-dashboard-clear-bar');
    if (dashClearBtn) {
        dashClearBtn.classList.toggle('hidden', selectedIngredients.length === 0);
        dashClearBtn.innerHTML = currentLang === 'en' ? '<span>🗑️</span> Empty Bar' : '<span>🗑️</span> Barı Boşalt';
    }

    const topContainer = document.getElementById('top-ingredients');
    if(topContainer) {
        if (selectedIngredients.length === 0) {
            topContainer.innerHTML = `<span class="text-slate-500 text-xs">${I18N[currentLang].emptyBarDesc}</span>`;
        } else {
            const selectedItems = selectedIngredients.map(id => popularIngredients.find(pi => pi.id === id) || { id, name: id, emoji: '🥃', cat: 'alkol' });
            const selectedAlcohols = selectedItems.filter(i => i.cat === 'alkol');
            const selectedKitchen = selectedItems.filter(i => i.cat !== 'alkol');

            let html = '';
            if (selectedAlcohols.length > 0) {
                html += `
                    <div class="w-full mb-3">
                        <div class="text-[11px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5 mb-2">
                            <span>🍸</span> ${I18N[currentLang].alcoholsLiquors} (${selectedAlcohols.length})
                        </div>
                        <div class="flex flex-wrap gap-2 text-xs">
                            ${selectedAlcohols.map(item => {
                                const encodedId = encodeURIComponent(item.id);
                                const grpLabel = getAlcoholGroupLabel(getAlcoholGroup(item));
                                const titleLabel = currentLang === 'en' ? 'Remove from Bar' : 'Barından Çıkar';
                                return `
                                    <span class="bg-slate-900/90 text-amber-300 border border-amber-500/20 px-3 py-1.5 rounded-xl shadow-sm flex items-center gap-2 font-medium break-words text-xs">
                                        <span>${item.emoji || '🥃'} ${escapeHTML(translateIngredientName(item.name || item.id))} <span class="text-[10px] text-amber-400/70 font-semibold">(${escapeHTML(grpLabel)})</span></span>
                                        <button data-action="remove-ingredient" data-value="${escapeHTML(encodedId)}" class="text-amber-400/60 hover:text-rose-400 font-bold text-xs ml-0.5 hover:scale-110 transition-transform" title="${titleLabel}">✕</button>
                                    </span>
                                `;
                            }).join('')}
                        </div>
                    </div>
                `;
            }
            if (selectedKitchen.length > 0) {
                html += `
                    <div class="w-full">
                        <div class="text-[11px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5 mb-2">
                            <span>🍊</span> ${I18N[currentLang].kitchenMixers} (${selectedKitchen.length})
                        </div>
                        <div class="flex flex-wrap gap-2 text-xs">
                            ${selectedKitchen.map(item => {
                                const encodedId = encodeURIComponent(item.id);
                                const titleLabel = currentLang === 'en' ? 'Remove from Bar' : 'Barından Çıkar';
                                return `
                                    <span class="bg-slate-900/90 text-emerald-300 border border-emerald-500/20 px-3 py-1.5 rounded-xl shadow-sm flex items-center gap-2 font-medium break-words text-xs">
                                        <span>${item.emoji || '🍊'} ${escapeHTML(translateIngredientName(item.name || item.id))}</span>
                                        <button data-action="remove-ingredient" data-value="${escapeHTML(encodedId)}" class="text-emerald-400/60 hover:text-rose-400 font-bold text-xs ml-0.5 hover:scale-110 transition-transform" title="${titleLabel}">✕</button>
                                    </span>
                                `;
                            }).join('')}
                        </div>
                    </div>
                `;
            }
            topContainer.innerHTML = html;
        }
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
        if(el) el.className = "px-2.5 py-1 rounded-lg text-slate-400 whitespace-nowrap transition-all hover:text-white";
    });
    const activeId = filter === 'all' ? 'btn-all-alcohol' : filter === 'Alcoholic' ? 'btn-alcoholic' : 'btn-non-alcoholic';
    const activeEl = document.getElementById(activeId);
    if(activeEl) activeEl.className = "px-2.5 py-1 rounded-lg bg-amber-500 text-slate-950 font-bold whitespace-nowrap transition-all shadow-sm";
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

let currentVibeFilter = 'all';

function setVibeFilter(vibe, btn) {
    triggerHaptic('light');
    currentVibeFilter = vibe || 'all';
    document.querySelectorAll('.vibe-btn').forEach(b => {
        b.className = "vibe-btn pill-btn px-3 py-1 rounded-full bg-slate-900/80 text-slate-300 border border-white/10 shrink-0 hover:border-amber-500/40";
    });
    const target = btn || document.querySelector(`.vibe-btn[data-vibe="${vibe}"]`);
    if (target) {
        target.className = "vibe-btn pill-btn px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 shrink-0 font-bold";
    }
    filterCocktails();
}

function matchesVibeFilter(d) {
    if (currentVibeFilter === 'all') return true;
    const str = `${d.strDrink || ''} ${d.strCategory || ''} ${d.strInstructions || ''} ${d.strGlass || ''}`.toLowerCase();
    const abv = d.computedABV ? d.computedABV.abv : 0;
    const taste = d.computedTaste || '';

    switch (currentVibeFilter) {
        case 'summer':
            return (taste === 'Ferah' || taste === 'Tatlı') || /(mojito|margarita|daiquiri|colada|spritz|fizz|tonic|lemonade|soda|punch|tropical|gin|rum|tequila)/i.test(str);
        case 'romantic':
            return /(martini|coupe|champagne|wine|prosecco|cosmopolitan|manhattan|negroni|french 75)/i.test(str) || /(cocktail glass|martini glass|champagne)/i.test(d.strGlass || '');
        case 'chill':
            return abv <= 15 || d.strAlcoholic === 'Non alcoholic' || /(beer|cider|spritz|highball|collins|lemonade|soda)/i.test(str);
        case 'winter':
            return /(whiskey|bourbon|scotch|brandy|cognac|coffee|tea|hot|toddy|cacao|cinnamon|cream|kahlua)/i.test(str) || taste === 'Sert';
        case 'party':
            return d.strCategory === 'Shot' || /(shot|shooter|bomb|punch|party)/i.test(str) || abv >= 25;
        default:
            return true;
    }
}

function renderIngredients() {
    const container = document.getElementById('ingredients-container');
    if (!container) return;
    container.innerHTML = '';
    const summary = document.getElementById('selection-summary');
    if (summary) {
        if (selectedIngredients.length) {
            summary.textContent = currentLang === 'en' 
                ? `${selectedIngredients.length} ingredients in your bar`
                : `${selectedIngredients.length} malzeme barına eklendi`;
        } else {
            summary.textContent = currentLang === 'en'
                ? 'Start by choosing your ingredients'
                : 'Malzemelerini seçerek başla';
        }
    }

    // Üst başlık temizleme butonu
    const headerClearBtn = document.getElementById('btn-clear-selection-header');
    if (headerClearBtn) {
        headerClearBtn.classList.toggle('hidden', selectedIngredients.length === 0);
        headerClearBtn.textContent = currentLang === 'en' ? '🗑️ Clear' : '🗑️ Temizle';
    }

    // Arama yanındaki temizle butonu (Dinamik adet göstergesi)
    const searchClearBtn = document.querySelector('[data-ui="ui-13"]');
    if (searchClearBtn) {
        const clearText = currentLang === 'en' ? '🗑️ Clear' : '🗑️ Temizle';
        searchClearBtn.textContent = selectedIngredients.length ? `${clearText} (${selectedIngredients.length})` : clearText;
    }

    // Seçili Malzemeler Paneli (Tray)
    const tray = document.getElementById('selected-ingredients-tray');
    const badgeCount = document.getElementById('selected-badge-count');
    const chipsContainer = document.getElementById('selected-chips-container');
    if (tray && badgeCount && chipsContainer) {
        if (selectedIngredients.length > 0) {
            tray.classList.remove('hidden');
            badgeCount.textContent = selectedIngredients.length;
            const trayLabel = tray.querySelector('.text-amber-400.font-bold');
            if (trayLabel) {
                trayLabel.innerHTML = `<span>🍸</span> ${currentLang === 'en' ? 'Ingredients in Your Bar' : 'Barındaki Malzemeler'} (<span id="selected-badge-count">${selectedIngredients.length}</span>)`;
            }
            const clearAllBtn = tray.querySelector('[data-action="clear-all-ingredients"]');
            if (clearAllBtn) {
                clearAllBtn.innerHTML = `<span>🗑️</span> ${currentLang === 'en' ? 'Clear All' : 'Tümünü Temizle'}`;
            }
            chipsContainer.innerHTML = selectedIngredients.map(id => {
                const item = popularIngredients.find(pi => pi.id === id);
                const emoji = item ? item.emoji : '🥃';
                const name = item 
                    ? (currentLang === 'en' ? (item.nameEn || item.id) : item.name)
                    : (currentLang === 'en' ? id : translateIngredientName(id));
                const encodedId = encodeURIComponent(id);
                return `
                    <span class="inline-flex items-center gap-1.5 bg-amber-500/15 text-amber-200 border border-amber-500/35 px-2.5 py-1 rounded-xl text-xs font-semibold shadow-sm transition-all hover:border-amber-400">
                        <span>${emoji}</span>
                        <span>${escapeHTML(name)}</span>
                        <button data-action="remove-ingredient" data-value="${escapeHTML(encodedId)}" class="text-amber-400/80 hover:text-rose-400 font-bold ml-1 text-xs w-4 h-4 flex items-center justify-center rounded-full hover:bg-white/10" title="${currentLang === 'en' ? 'Remove from Bar' : 'Barından Çıkar'}">✕</button>
                    </span>
                `;
            }).join('');
        } else {
            tray.classList.add('hidden');
            chipsContainer.innerHTML = '';
        }
    }
    
    const searchVal = document.getElementById('ing-search')?.value.trim() || "";
    const searchNorm = normalizeSearchText(searchVal);
    const searchLowerTr = searchVal.toLocaleLowerCase('tr');
    const searchLowerEn = searchVal.toLowerCase();

    // Arama yapılıyorsa kafa karıştırıcı alt kategori butonlarını gizle, temizlenince aktif sekmedekini geri aç
    const alcSubcatsEl = document.getElementById('alcohol-subcategories');
    const kitchenSubcatsEl = document.getElementById('kitchen-subcategories');
    if (alcSubcatsEl) {
        alcSubcatsEl.classList.toggle('hidden', !!searchVal || currentTab !== 'alkol');
    }
    if (kitchenSubcatsEl) {
        kitchenSubcatsEl.classList.toggle('hidden', !!searchVal || currentTab !== 'mutfak');
    }
    
    const filtered = popularIngredients
        .filter(i => {
            if (searchVal) {
                // Global malzeme araması (Alkol + Mutfak tüm kategorileri kapsar)
                const nameNorm = normalizeSearchText(i.name);
                const nameEnNorm = normalizeSearchText(i.nameEn);
                const idNorm = normalizeSearchText(i.id);
                const trNorm = typeof translateIngredientName === 'function' ? normalizeSearchText(translateIngredientName(i.id)) : '';
                return nameNorm.includes(searchNorm) ||
                       nameEnNorm.includes(searchNorm) ||
                       idNorm.includes(searchNorm) ||
                       (trNorm && trNorm.includes(searchNorm)) ||
                       (i.name && (i.name.toLocaleLowerCase('tr').includes(searchLowerTr) || i.name.toLowerCase().includes(searchLowerEn))) ||
                       (i.nameEn && i.nameEn.toLowerCase().includes(searchLowerEn)) ||
                       (i.id && (i.id.toLowerCase().includes(searchLowerEn) || i.id.toLocaleLowerCase('tr').includes(searchLowerTr)));
            }
            if (currentTab === 'alkol') {
                if (currentAlcoholSubCat === 'mutfak') {
                    if (i.cat !== 'mutfak') return false;
                } else {
                    if (i.cat !== 'alkol') return false;
                    if (!matchesAlcoholSubCategory(i)) return false;
                }
            } else if (currentTab === 'mutfak') {
                if (i.cat !== 'mutfak') return false;
                if (!matchesKitchenSubCategory(i)) return false;
            } else if (i.cat !== currentTab) {
                return false;
            }
            return true;
        })
        .sort((a, b) => {
            if (searchVal) {
                const aName = (currentLang === 'en' ? (a.nameEn || a.id) : a.name).toLocaleLowerCase('tr');
                const bName = (currentLang === 'en' ? (b.nameEn || b.id) : b.name).toLocaleLowerCase('tr');
                const aStarts = aName.startsWith(searchLowerTr) || (a.id && a.id.toLowerCase().startsWith(searchLowerEn));
                const bStarts = bName.startsWith(searchLowerTr) || (b.id && b.id.toLowerCase().startsWith(searchLowerEn));
                if (aStarts && !bStarts) return -1;
                if (!aStarts && bStarts) return 1;
                let aIsBase = baseIngredients.some(base => base.id === a.id);
                let bIsBase = baseIngredients.some(base => base.id === b.id);
                if (aIsBase && !bIsBase) return -1;
                if (!aIsBase && bIsBase) return 1;
                return aName.localeCompare(bName, currentLang === 'en' ? 'en' : 'tr');
            }
            let aIsBase = baseIngredients.some(base => base.id === a.id);
            let bIsBase = baseIngredients.some(base => base.id === b.id);
            if (aIsBase && !bIsBase) return -1;
            if (!aIsBase && bIsBase) return 1;
            if (currentTab === 'alkol' && currentAlcoholSubCat === 'all') {
                const groupOrder = ['votka-cin', 'viski-konyak', 'tekila-rom', 'likor-aperitif', 'sarap-bira', 'diger-alkol'];
                const aOrder = groupOrder.indexOf(getAlcoholGroup(a));
                const bOrder = groupOrder.indexOf(getAlcoholGroup(b));
                if (aOrder !== bOrder) return aOrder - bOrder;
            }
            return a.name.localeCompare(b.name, currentLang === 'en' ? 'en' : 'tr');
        });
    
    if (filtered.length === 0) {
        const noResult = document.createElement('div');
        noResult.className = "w-full py-8 text-center text-slate-400 text-xs flex flex-col items-center justify-center gap-2";
        if (searchVal) {
            noResult.innerHTML = `
                <span class="text-2xl">🔍</span>
                <p class="font-medium text-slate-300">"${escapeHTML(searchVal)}" ${currentLang === 'en' ? 'no matching ingredients found.' : 'ile eşleşen malzeme bulunamadı.'}</p>
                <p class="text-[11px] text-slate-500">${currentLang === 'en' ? 'Try searching in Turkish or English (e.g. mint, limon, rom)' : 'Türkçe veya İngilizce isim deneyebilirsiniz (örn: nane, limon, rom)'}</p>
            `;
        } else {
            noResult.innerHTML = `
                <span class="text-2xl">🍃</span>
                <p class="font-medium text-slate-300">${currentLang === 'en' ? 'No ingredients found in this category.' : 'Bu kategoride malzeme bulunamadı.'}</p>
            `;
        }
        container.appendChild(noResult);
        return;
    }

    filtered.forEach(ing => {
        const isSelected = selectedIngredients.includes(ing.id);
        const displayName = currentLang === 'en' ? (ing.nameEn || ing.id) : ing.name;
        const card = document.createElement('div');
        card.setAttribute('role', 'button');
        card.setAttribute('aria-label', displayName);
        card.setAttribute('aria-pressed', String(isSelected));
        card.tabIndex = 0;
        card.className = isSelected 
            ? "snap-center shrink-0 w-[108px] sm:w-[114px] min-h-[148px] sm:min-h-[152px] bg-gradient-to-b from-amber-500 to-amber-600 border border-amber-300 rounded-2xl flex flex-col items-center justify-start p-2.5 text-center gap-1.5 cursor-pointer text-slate-950 font-bold shadow-lg transition-transform active:scale-95 min-w-0"
            : "snap-center shrink-0 w-[108px] sm:w-[114px] min-h-[148px] sm:min-h-[152px] acrylic-card rounded-2xl flex flex-col items-center justify-start p-2.5 text-center gap-1.5 cursor-pointer text-slate-300 font-semibold hover:border-amber-500/30 transition-transform active:scale-95 min-w-0";
        
        const groupTag = (ing.cat === 'alkol')
            ? `<span class="ingredient-group-tag text-[9px] ${isSelected ? 'text-slate-950 font-black bg-black/15' : 'text-amber-400 font-bold bg-amber-500/15 border border-amber-500/25'}">${escapeHTML(getAlcoholGroupLabel(getAlcoholGroup(ing)))}</span>`
            : `<span class="ingredient-group-tag text-[9px] ${isSelected ? 'text-slate-950 font-black bg-black/15' : 'text-emerald-400 font-bold bg-emerald-500/15 border border-emerald-500/25'}">${currentLang === 'en' ? 'Kitchen' : 'Mutfak'}</span>`;

        card.innerHTML = `
            <div class="h-14 sm:h-16 w-full flex items-center justify-center mb-1 shrink-0">
                <img src="https://www.thecocktaildb.com/images/ingredients/${encodeURIComponent(ing.id)}-Small.png" 
                     alt="${escapeHTML(displayName)}" 
                     class="max-h-full max-w-full object-contain drop-shadow-md"
                     loading="lazy" data-image-fallback>
            </div>
            <span class="ingredient-name text-[11px] leading-tight font-semibold text-center w-full px-0.5 break-words line-clamp-2">${escapeHTML(displayName)}</span>
            ${groupTag}
        `;
        
        card.addEventListener('click', () => {
            triggerHaptic('light');
            selectedIngredients = isSelected ? selectedIngredients.filter(i => i !== ing.id) : [...selectedIngredients, ing.id];
            try { localStorage.setItem('selectedIngredients', JSON.stringify(selectedIngredients)); } catch(e) {}
            renderIngredients();
            filterCocktails();
        });
        card.addEventListener('keydown', event => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                card.click();
            }
        });
        container.appendChild(card);
    });
}

const debouncedRenderIngredients = debounce(renderIngredients, 150);
const debouncedFilterCocktails = debounce(filterCocktails, 180);

function clearSelection() {
    const searchInput = document.getElementById('ing-search');
    const hasSearch = searchInput && searchInput.value.trim().length > 0;
    
    if (selectedIngredients.length === 0 && !hasSearch) {
        showToast(currentLang === 'en' ? 'No ingredients currently selected in your bar.' : 'Barında zaten seçili malzeme yok.', 'info');
        return;
    }
    triggerHaptic('medium');
    const count = selectedIngredients.length;
    selectedIngredients = [];
    try { localStorage.setItem('selectedIngredients', JSON.stringify(selectedIngredients)); } catch(e) {}
    if (searchInput) searchInput.value = '';
    renderIngredients();
    filterCocktails();
    renderDashboard();
    if (count > 0) {
        showToast(currentLang === 'en' ? `Cleared ${count} ingredients from your bar.` : `${count} malzeme barından temizlendi.`, 'info');
    }
}

function removeIngredientFromBar(ingId, event) {
    if (event) event.stopPropagation();
    const targetId = decodeURIComponent(String(ingId || '').trim());
    if (!targetId) return;
    triggerHaptic('light');
    selectedIngredients = selectedIngredients.filter(i => i.toLowerCase() !== targetId.toLowerCase());
    try { localStorage.setItem('selectedIngredients', JSON.stringify(selectedIngredients)); } catch(e) {}
    const item = popularIngredients.find(pi => pi.id.toLowerCase() === targetId.toLowerCase());
    const name = item ? translateIngredientName(item.name) : translateIngredientName(targetId);
    renderIngredients();
    filterCocktails();
    renderDashboard();
    showToast(currentLang === 'en' ? `Removed "${name}" from bar.` : `"${name}" barından çıkarıldı.`, 'info');
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
        return { abv: 0, label: getAbvLabel({ abv: 0 }, currentLang), badgeCls: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' };
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
        return { abv: 0, label: getAbvLabel({ abv: 0 }, currentLang), badgeCls: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' };
    }

    const abvPercent = Math.min(Math.round((pureAlcoholCl / totalVolumeCl) * 100), 75);
    const badgeCls = abvPercent <= 8 
        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
        : abvPercent <= 18 
            ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' 
            : 'bg-rose-500/10 text-rose-400 border-rose-500/20';

    return { 
        abv: abvPercent, 
        label: getAbvLabel({ abv: abvPercent }, currentLang), 
        badgeCls 
    };
}

// Ev Kokteyl Maliyeti Hesaplama Motoru
function calculateRecipeCost(d) {
    let reqs = [];
    if (d.isCustom && Array.isArray(d.customIngredients)) {
        reqs = d.customIngredients.map(i => ({ name: i, measure: '' }));
    } else {
        for (let i = 1; i <= 15; i++) {
            const ing = d[`strIngredient${i}`];
            const m = d[`strMeasure${i}`] ? d[`strMeasure${i}`].trim() : '';
            if (ing && ing.trim()) reqs.push({ name: ing.trim(), measure: m });
        }
    }

    if (reqs.length === 0) return { cost: 35, barEst: 350, savingsPercent: 90 };

    let totalCost = 0;
    reqs.forEach(({ name, measure }) => {
        let cl = 4.0;
        if (measure) {
            const converted = convertOzToCl(measure);
            const numMatch = converted.match(/(\d+(\.\d+)?)\s*cl/i);
            if (numMatch) cl = parseFloat(numMatch[1]);
            else if (/dash|damla/i.test(measure)) cl = 0.2;
            else if (/tsp|çay kaşığı/i.test(measure)) cl = 0.5;
            else if (/tbsp|yemek kaşığı/i.test(measure)) cl = 1.5;
            else if (/cup|bardak/i.test(measure)) cl = 20.0;
        }

        const lower = name.toLowerCase();
        let unitCostPerCl = 2.0;

        if (/(vodka|gin|rum|tequila|whiskey|bourbon|scotch|brandy|cognac|raki|rakı|absinthe)/i.test(lower)) {
            unitCostPerCl = 12.0;
        } else if (/(triple sec|cointreau|kahlua|amaretto|campari|aperol|baileys|curacao|schnapps|liqueur|likör)/i.test(lower)) {
            unitCostPerCl = 9.5;
        } else if (/(vermouth|vermut|wine|şarap|champagne|şampanya|prosecco)/i.test(lower)) {
            unitCostPerCl = 5.0;
        } else if (/(juice|meyve|limon|lemon|lime)/i.test(lower)) {
            unitCostPerCl = 1.8;
        } else if (/(soda|tonic|water|su|gazoz|cola)/i.test(lower)) {
            unitCostPerCl = 1.0;
        }

        totalCost += (cl * unitCostPerCl);
    });

    const roundedCost = Math.max(15, Math.round(totalCost));
    const estimatedBarPrice = Math.max(250, Math.round(roundedCost * 7.5));
    const savings = Math.round(((estimatedBarPrice - roundedCost) / estimatedBarPrice) * 100);

    return {
        cost: roundedCost,
        barEst: estimatedBarPrice,
        savingsPercent: savings
    };
}

// Kokteyl Verilerini Bir Defa Önbelleğe Alarak Arama Hızını Uçurur
function enrichDrink(d) {
    // Never trust precomputed HTML class names or numeric fields from imported/cache data.
    const analysis = analyzeRecipe(d);
    d.computedCalories = analysis.calories;
    d.computedTaste = analysis.tasteProfile;
    d.computedABV = calculateRecipeABV(d);
    d.computedCost = calculateRecipeCost(d);
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
    const votes = Object.create(null);

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
        const safeBestIng = escapeHTML(translateIngredientName(bestIng));

        const tipTitle = currentLang === 'en' ? 'SMART BAR TIP' : 'AKILLI BAR ÖNERİSİ';
        const tipBody = currentLang === 'en'
            ? `Add just <b class="text-amber-400 font-bold">${safeBestIng}</b> to your bar to unlock <b class="text-emerald-400 font-bold">+${maxVotes} new cocktails</b> right away!`
            : `Barına sadece <b class="text-amber-400 font-bold">${safeBestIng}</b> eklersen hemen <b class="text-emerald-400 font-bold">+${maxVotes} yeni kokteyl</b> yapabileceksin!`;

        const html = `
            <div class="acrylic-card border-amber-500/30 p-4 rounded-3xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xl min-w-0 overflow-hidden">
                <div class="flex items-center gap-3.5 min-w-0">
                    <div class="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-xl shrink-0">
                        💡
                    </div>
                    <div class="min-w-0">
                        <p class="text-[10px] text-amber-400 font-bold uppercase tracking-wider">${tipTitle}</p>
                        <p class="text-xs text-slate-200 mt-0.5 break-words">${tipBody}</p>
                    </div>
                </div>
                <div class="flex gap-2 shrink-0 w-full sm:w-auto justify-end pt-1 sm:pt-0">
                    <button data-action="shopping" data-value="${escapeHTML(encodedIng)}" class="pill-btn text-xs bg-white/5 text-slate-300 border border-white/10 px-3 py-1.5 rounded-xl font-medium hover:border-amber-500/40">
                        ${inShop ? (currentLang === 'en' ? '🛒 In List' : '🛒 Listede') : (currentLang === 'en' ? '🛒 Add to List' : '🛒 Listeye Ekle')}
                    </button>
                    <button data-action="ingredient" data-value="${escapeHTML(encodedIng)}" class="pill-btn text-xs bg-amber-500 text-slate-950 font-bold px-3 py-1.5 rounded-xl hover:bg-amber-400">
                        ${currentLang === 'en' ? '+ Add to Bar' : '+ Bara Ekle'}
                    </button>
                </div>
            </div>
        `;

        banner.innerHTML = html;
        banner.classList.remove('hidden');

        if (adviceBox && adviceText) {
            adviceText.innerHTML = tipBody;
            adviceBox.classList.remove('hidden');
        }
    } else {
        banner.classList.add('hidden');
        if (adviceBox) adviceBox.classList.add('hidden');
    }
}

// Akıllı Malzeme Muadilleri Veritabanı
const INGREDIENT_SUBSTITUTES = {
    'triple sec': { sub: 'Cointreau veya Portakal Likörü', note: 'Aynı narenciye tat dengesini verir.' },
    'cointreau': { sub: 'Triple Sec veya Grand Marnier', note: 'Portakal likörü alternatifidir.' },
    'grand marnier': { sub: 'Triple Sec veya Konyak + Portakal Kabuğu', note: 'Konyak bazlı portakal likörüdür.' },
    'sugar syrup': { sub: 'Bal, Agave veya 1:1 Şeker-Sıcak Su', note: 'Aynı tatlılık dengesini sağlar.' },
    'simple syrup': { sub: 'Bal, Agave veya 1:1 Şeker-Sıcak Su', note: 'Aynı tatlılık dengesini sağlar.' },
    'şeker şurubu': { sub: 'Bal, Agave veya 1:1 Şeker-Sıcak Su', note: 'Aynı tatlılık dengesini sağlar.' },
    'sugar': { sub: 'Bal, Akçaağaç Şurubu veya Pudra Şekeri', note: 'Tatlılık dengesi sağlar.' },
    'şeker': { sub: 'Bal veya Akçaağaç Şurubu', note: 'Tatlılık dengesi sağlar.' },
    'lime juice': { sub: 'Taze Limon Suyu', note: 'Benzer asiditeyi ve ferahlığı verir.' },
    'misket limonu suyu': { sub: 'Taze Limon Suyu', note: 'Benzer asiditeyi ve ferahlığı verir.' },
    'lemon juice': { sub: 'Misket Limonu (Lime) Suyu', note: 'Asidite dengesi için 1:1 kullanılabilir.' },
    'limon suyu': { sub: 'Misket Limonu (Lime) Suyu', note: 'Asidite dengesi için 1:1 kullanılabilir.' },
    'bourbon': { sub: 'Rye (Çavdar) Viski veya İrlanda Viskisi', note: 'Tatlı meşe profiline benzerdir.' },
    'rye whiskey': { sub: 'Bourbon Viski', note: 'Biraz daha tatlı bir profil elde edilir.' },
    'viski': { sub: 'Bourbon veya Scotch', note: 'Temel tahıl alkolü alternatifi.' },
    'club soda': { sub: 'Sade Maden Suyu', note: 'Kabarcık ve ferahlık için mükemmel alternatiftir.' },
    'soda': { sub: 'Maden Suyu', note: 'Ferahlatıcı asit sağlar.' },
    'tonic water': { sub: 'Soda + Limon Dilimi veya Bitter Lemon', note: 'Kinin ferahlığı için alternatif.' },
    'tonik': { sub: 'Maden Suyu + Limon Dilimi', note: 'Ferahlatıcı alternatif.' },
    'angostura bitters': { sub: 'Peychaud\'s veya Portakal Bitters', note: 'Birkaç damla aromatik derinlik katar.' },
    'kahlua': { sub: 'Tia Maria veya Şekerli Espresso', note: 'Kahve likörü alternatifidir.' },
    'campari': { sub: 'Aperol veya Select Aperitivo', note: 'Aperol daha tatlı ve hafif alkollüdür.' },
    'aperol': { sub: 'Campari (daha az miktarda)', note: 'Campari daha acımsı ve güçlüdür.' },
    'sweet vermouth': { sub: 'Kırmızı Şarap + az Bal/Konyak', note: 'Tatlı kırmızı vermut muadilidir.' },
    'tatlı vermut': { sub: 'Kırmızı Şarap + az Bal/Konyak', note: 'Tatlı kırmızı vermut muadilidir.' },
    'dry vermouth': { sub: 'Sek Beyaz Şarap veya Lillet Blanc', note: 'Sek beyaz vermut yerine kullanılabilir.' },
    'sek vermut': { sub: 'Sek Beyaz Şarap', note: 'Sek beyaz vermut yerine kullanılabilir.' },
    'dark rum': { sub: 'Altın Rom veya Baharatlı (Spiced) Rom', note: 'Koyu rom derinliğini yakalar.' },
    'koyu rom': { sub: 'Altın Rom veya Baharatlı Rom', note: 'Koyu rom derinliğini yakalar.' },
    'white rum': { sub: 'Votka + 1 çay kaşığı şeker şurubu', note: 'Nötr rom alternatifi.' },
    'beyaz rom': { sub: 'Votka + az Şeker Şurubu', note: 'Nötr rom alternatifi.' },
    'grenadine': { sub: 'Nar Ekşisi (tatlı) veya Ahududu Şurubu', note: 'Renk ve tatlı-mayhoşluk katar.' },
    'nar şurubu': { sub: 'Tatlı Nar Ekşisi veya Vişne Şurubu', note: 'Renk ve tatlı-mayhoşluk katar.' },
    'maraschino liqueur': { sub: 'Kiraz Likörü veya Amaretto', note: 'Meyvemsi badem aroması verir.' },
    'amaretto': { sub: 'Badem Özütü + Konyak/Viski', note: 'Tatlı badem aroması sağlar.' },
    'tequila': { sub: 'Mezcal veya Beyaz Rom', note: 'Agave aroması verir.' },
    'tekila': { sub: 'Mezcal veya Beyaz Rom', note: 'Agave aroması verir.' },
    'cognac': { sub: 'Brandy veya İspanyol Brendisi', note: 'Damıtılmış şarap bazlı içki muadili.' },
    'brandy': { sub: 'Konyak veya Armagnac', note: 'Benzer meyvemsi meşe lezzeti verir.' },
    'cream': { sub: 'Süt + az Tereyağı veya Hindistan Cevizi Kreması', note: 'Kıvam ve yumuşaklık katar.' },
    'krema': { sub: 'Süt + az Tereyağı veya Hindistan Cevizi Kreması', note: 'Kıvam ve yumuşaklık katar.' },
    'coconut cream': { sub: 'Krema + Hindistan Cevizi Sütü', note: 'Tropikal kıvam sağlar.' },
    'ginger beer': { sub: 'Zencefilli Gazoz veya Zencefil Suyu + Soda', note: 'Baharatlı zencefil lezzeti verir.' },
    'zencefilli gazoz': { sub: 'Zencefil Rendesi + Soda + Bal', note: 'Baharatlı ferahlık sağlar.' }
};

function getIngredientSubstitute(name) {
    if (!name) return null;
    const lower = String(name).toLowerCase().trim();
    for (const [key, val] of Object.entries(INGREDIENT_SUBSTITUTES)) {
        if (lower.includes(key) || key.includes(lower)) {
            return val;
        }
    }
    return null;
}

function showToast(message, type = 'info') {
    let container = document.getElementById('bar-toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'bar-toast-container';
        container.className = 'fixed top-20 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 pointer-events-none px-4 w-full max-w-sm';
        document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    const borderColor = type === 'success' ? 'border-emerald-500/40 text-emerald-300' : 'border-amber-500/40 text-amber-300';
    toast.className = `acrylic-card px-4 py-2.5 rounded-2xl border ${borderColor} text-xs font-semibold shadow-2xl flex items-center gap-2 animate-fade-in transition-all pointer-events-auto`;
    toast.innerHTML = `<span>🍸</span><span>${escapeHTML(message)}</span>`;
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(-10px)';
        setTimeout(() => toast.remove(), 300);
    }, 2800);
}

function applySubstituteToBar(ingEncoded, subEncoded, event) {
    if (event) event.stopPropagation();
    const ingName = decodeURIComponent(ingEncoded || '');
    const subName = decodeURIComponent(subEncoded || '');
    quickAddIngredientToBar(ingName);
    showToast(currentLang === 'en' ? `Added with "${subName}" substitute!` : `"${subName}" muadiliyle barına eklendi!`, 'success');
}

// --- ADIM ADIM BARMEN MODU SİSTEMİ ---
let currentMixDrink = null;
let currentMixStep = 0;
let mixSteps = [];
let mixTimerInterval = null;
let mixTimerRemaining = 15;

function openMixMode(drinkId) {
    const targetId = String(drinkId || '').trim();
    const d = allCocktails.find(c => c.idDrink === targetId) || customRecipes.find(c => c.idDrink === targetId);
    if (!d) return;
    currentMixDrink = d;
    currentMixStep = 0;

    let ingList = [];
    if (d.isCustom && Array.isArray(d.customIngredients)) {
        ingList = d.customIngredients;
    } else {
        for (let i = 1; i <= 15; i++) {
            const ing = d[`strIngredient${i}`];
            const m = d[`strMeasure${i}`] ? d[`strMeasure${i}`].trim() : '';
            if (ing && ing.trim()) {
                const trName = translateIngredientName(ing.trim());
                const trMeasure = translateMeasureText(m);
                ingList.push(trMeasure ? `${trMeasure} ${trName}` : trName);
            }
        }
    }

    const isShaken = /shak|çalkala/i.test(d.strInstructions || '') || /shak|çalkala/i.test(d.strInstructionsTR || '');
    const glass = d.strGlass || (currentLang === 'en' ? 'Cocktail glass' : 'Kokteyl bardağı');

    if (currentLang === 'en') {
        mixSteps = [
            {
                heading: '1. Glassware & Prep',
                body: `<p>• <b>Glass:</b> Prepare ${escapeHTML(glass)} and chill with ice cubes.</p><p class="mt-2">• <b>Barware:</b> Get ${isShaken ? 'cocktail shaker and strainer' : 'mixing glass and bar spoon'} ready.</p>`,
                hasTimer: false
            },
            {
                heading: '2. Measure & Add Ingredients',
                body: `<p class="font-semibold text-amber-300 mb-2">Measured Ingredients:</p><ul class="space-y-1.5">${ingList.map(item => `<li class="flex items-center gap-2 bg-black/40 px-3 py-1.5 rounded-xl border border-white/5"><span>🥃</span><span>${escapeHTML(item)}</span></li>`).join('')}</ul>`,
                hasTimer: false
            },
            {
                heading: isShaken ? '3. Shake (Shaker)' : '3. Stir with Ice',
                body: isShaken
                    ? `<p>Fill shaker generously with ice, seal tightly, and shake vigorously until frosty on the outside.</p>`
                    : `<p>Stir gently and rhythmically with a bar spoon over ice to chill and dilute properly.</p>`,
                hasTimer: true,
                timerSeconds: isShaken ? 15 : 30,
                timerLabel: isShaken ? 'Shake vigorously with ice' : 'Stir gently with bar spoon'
            },
            {
                heading: '4. Strain & Serve',
                body: `<p>• Strain the chilled cocktail into the ${escapeHTML(glass)}.</p><p class="mt-2">• ${d.strServing ? `<b>Garnish:</b> ${escapeHTML(d.strServing)}` : 'Add garnish and serve fresh.'}</p><div class="text-center pt-3 text-amber-400 font-bold text-sm">🎉 Your cocktail is ready, cheers!</div>`,
                hasTimer: false
            }
        ];
    } else {
        mixSteps = [
            {
                heading: '1. Hazırlık & Kadeh',
                body: `<p>• <b>Kadeh:</b> ${escapeHTML(glass)} hazırla ve içerisine birkaç küp buz ekleyerek soğut.</p><p class="mt-2">• <b>Ekipman:</b> ${isShaken ? 'Shaker (çalkalayıcı) ve süzgeç' : 'Karıştırma bardağı ve bar kaşığı'} hazırla.</p>`,
                hasTimer: false
            },
            {
                heading: '2. Malzemeleri Ekle',
                body: `<p class="font-semibold text-amber-300 mb-2">Ölçülü Malzeme Listesi:</p><ul class="space-y-1.5">${ingList.map(item => `<li class="flex items-center gap-2 bg-black/40 px-3 py-1.5 rounded-xl border border-white/5"><span>🥃</span><span>${escapeHTML(item)}</span></li>`).join('')}</ul>`,
                hasTimer: false
            },
            {
                heading: isShaken ? '3. Çalkalama (Shaker)' : '3. Karıştırma (Stir)',
                body: isShaken
                    ? `<p>Shaker'ın içine bol buz doldur, kapağını sıkıca kapat ve buzlar kırağı tutana kadar kuvvetlice salla.</p>`
                    : `<p>Buz dolu karıştırma bardağında bar kaşığı ile kokteyli nazikçe ve ritmik şekilde döndürerek soğut.</p>`,
                hasTimer: true,
                timerSeconds: isShaken ? 15 : 30,
                timerLabel: isShaken ? 'Buzla kuvvetlice çalkala' : 'Bar kaşığıyla nazikçe karıştır'
            },
            {
                heading: '4. Süzme & Servis',
                body: `<p>• Soğuyan kokteyli süzerek ${escapeHTML(glass)} içine aktar.</p><p class="mt-2">• ${d.strServing ? `<b>Garnitür:</b> ${escapeHTML(d.strServing)}` : 'Garnitürünü ekle ve taze servis et.'}</p><div class="text-center pt-3 text-amber-400 font-bold text-sm">🎉 Kokteylin hazır, afiyet olsun!</div>`,
                hasTimer: false
            }
        ];
    }

    const titleEl = document.getElementById('mix-modal-title');
    const subtitleEl = document.getElementById('mix-modal-subtitle');
    if (titleEl) titleEl.textContent = d.strDrink;
    if (subtitleEl) subtitleEl.textContent = `${glass} • ${getTasteLabel(d.computedTaste)}`;
    renderMixStep();

    const modal = document.getElementById('mix-mode-modal');
    if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    }
}

function renderMixStep() {
    const step = mixSteps[currentMixStep];
    if (!step) return;

    const counter = document.getElementById('mix-step-counter');
    const heading = document.getElementById('mix-step-heading');
    const body = document.getElementById('mix-step-body');
    const dotsContainer = document.getElementById('mix-step-dots');

    if (counter) counter.textContent = currentLang === 'en' ? `Step ${currentMixStep + 1} / ${mixSteps.length}` : `Adım ${currentMixStep + 1} / ${mixSteps.length}`;
    if (heading) heading.textContent = step.heading;
    if (body) body.innerHTML = step.body;

    const prevBtn = document.getElementById('btn-mix-prev');
    const nextBtn = document.getElementById('btn-mix-next');
    if (prevBtn) {
        prevBtn.textContent = currentLang === 'en' ? '← Previous' : '← Önceki';
        prevBtn.disabled = currentMixStep === 0;
    }
    if (nextBtn) {
        const isLast = currentMixStep === mixSteps.length - 1;
        nextBtn.innerHTML = isLast 
            ? `<span>${currentLang === 'en' ? 'Finish ✓' : 'Tamamla & Kapat ✓'}</span>`
            : `<span>${currentLang === 'en' ? 'Next Step →' : 'Sonraki Adım →'}</span>`;
    }

    if (dotsContainer) {
        dotsContainer.innerHTML = mixSteps.map((_, i) => `<span class="w-2 h-2 rounded-full ${i === currentMixStep ? 'bg-amber-400' : 'bg-white/20'}"></span>`).join('');
    }

    const timerBox = document.getElementById('mix-timer-box');
    if (timerBox) {
        if (step.hasTimer) {
            timerBox.classList.remove('hidden');
            timerBox.classList.add('flex');
            mixTimerRemaining = step.timerSeconds;
            const display = document.getElementById('mix-timer-display');
            const label = document.getElementById('mix-timer-label');
            const runBtn = document.getElementById('btn-mix-timer-run');
            if (display) display.textContent = `00:${String(mixTimerRemaining).padStart(2, '0')}`;
            if (label) label.textContent = step.timerLabel;
            if (runBtn) runBtn.textContent = currentLang === 'en' ? 'Start' : 'Başlat';
            clearInterval(mixTimerInterval);
            mixTimerInterval = null;
        } else {
            timerBox.classList.add('hidden');
            timerBox.classList.remove('flex');
            clearInterval(mixTimerInterval);
            mixTimerInterval = null;
        }
    }
}

function nextMixStep() {
    if (currentMixStep < mixSteps.length - 1) {
        currentMixStep++;
        renderMixStep();
        triggerHaptic('light');
    } else {
        closeMixMode();
        showToast(currentLang === 'en' ? 'Cheers! You crafted the cocktail like a pro 🍸' : 'Tebrikler! Kokteylini başarıyla hazırladın 🍸', 'success');
    }
}

function prevMixStep() {
    if (currentMixStep > 0) {
        currentMixStep--;
        renderMixStep();
        triggerHaptic('light');
    }
}

function closeMixMode() {
    clearInterval(mixTimerInterval);
    mixTimerInterval = null;
    const modal = document.getElementById('mix-mode-modal');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
}

function toggleMixTimer() {
    const runBtn = document.getElementById('btn-mix-timer-run');
    if (mixTimerInterval) {
        clearInterval(mixTimerInterval);
        mixTimerInterval = null;
        if (runBtn) runBtn.textContent = currentLang === 'en' ? 'Resume' : 'Devam Et';
    } else {
        if (runBtn) runBtn.textContent = currentLang === 'en' ? 'Pause' : 'Durdur';
        mixTimerInterval = setInterval(() => {
            mixTimerRemaining--;
            const display = document.getElementById('mix-timer-display');
            if (mixTimerRemaining <= 0) {
                clearInterval(mixTimerInterval);
                mixTimerInterval = null;
                if (display) display.textContent = '00:00';
                if (runBtn) runBtn.textContent = currentLang === 'en' ? 'Done!' : 'Bitti!';
                triggerHaptic('success');
                showToast(currentLang === 'en' ? "⏱️ Time's up! Great shake." : '⏱️ Süre doldu! Harika bir çalkalama.', 'success');
            } else {
                if (display) display.textContent = `00:${String(mixTimerRemaining).padStart(2, '0')}`;
            }
        }, 1000);
    }
}

// --- INSTAGRAM STORY KART OLUŞTURMA & İNDİRME MOTORU (HTML5 CANVAS) ---
function downloadCocktailStoryCard(drinkId) {
    const targetId = String(drinkId || '').trim();
    const d = allCocktails.find(c => c.idDrink === targetId) || customRecipes.find(c => c.idDrink === targetId);
    if (!d) return;

    triggerHaptic('medium');
    showToast(currentLang === 'en' ? '📸 Preparing story card...' : '📸 Hikaye kartı hazırlanıyor...', 'info');

    const canvas = document.createElement('canvas');
    canvas.width = 1080;
    canvas.height = 1920;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (typeof ctx.roundRect !== 'function') {
        ctx.roundRect = function(x, y, w, h, r) {
            ctx.rect(x, y, w, h);
        };
    }

    // Arka Plan Gradyanı
    const bgGrad = ctx.createLinearGradient(0, 0, 0, 1920);
    bgGrad.addColorStop(0, '#0a1210');
    bgGrad.addColorStop(0.5, '#121f1b');
    bgGrad.addColorStop(1, '#1b2f29');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, 1080, 1920);

    // Üst Merkez Altın Işıma
    const radialGrad = ctx.createRadialGradient(540, 420, 50, 540, 420, 500);
    radialGrad.addColorStop(0, 'rgba(213, 180, 123, 0.12)');
    radialGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = radialGrad;
    ctx.fillRect(0, 0, 1080, 950);

    // Dış Dekoratif Çerçeve
    ctx.strokeStyle = 'rgba(213, 180, 123, 0.35)';
    ctx.lineWidth = 3;
    ctx.strokeRect(50, 50, 980, 1820);

    // İç İnce Çerçeve
    ctx.strokeStyle = 'rgba(213, 180, 123, 0.15)';
    ctx.lineWidth = 1;
    ctx.strokeRect(65, 65, 950, 1790);

    // Başlık
    ctx.fillStyle = '#d5b47b';
    ctx.font = 'bold 26px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(currentLang === 'en' ? '🍸   P O C K E T   B A R' : '🍸   B A R   C E P T E', 540, 140);

    ctx.fillStyle = '#8a9b93';
    ctx.font = '500 18px sans-serif';
    ctx.fillText(currentLang === 'en' ? 'THE HOME BAR COLLECTION • ISSUE #01' : 'THE HOME BAR COLLECTION • SEÇKİ #01', 540, 180);

    // Çizgi
    ctx.strokeStyle = 'rgba(213, 180, 123, 0.4)';
    ctx.beginPath();
    ctx.moveTo(340, 220);
    ctx.lineTo(740, 220);
    ctx.stroke();

    // Kokteyl Adı
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 70px serif';
    const drinkName = d.strDrink || (currentLang === 'en' ? 'Cocktail' : 'Kokteyl');
    ctx.fillText(drinkName, 540, 320);

    // Rozetler
    const glass = currentLang === 'en' ? (d.strGlass || 'Cocktail Glass') : (glassTranslations[(d.strGlass || '').toLowerCase()] || d.strGlass || 'Kokteyl Bardağı');
    const taste = getTasteLabel(d.computedTaste || 'Klasik');
    const abv = getAbvLabel(d.computedABV, currentLang);
    const cost = currentLang === 'en' 
        ? (d.computedCostUsd ? `~$${d.computedCostUsd.cost}` : '~$1.85') 
        : (d.computedCost ? `~${d.computedCost.cost} ₺` : '~45 ₺');

    ctx.font = '600 24px sans-serif';
    ctx.fillStyle = '#d5b47b';
    ctx.fillText(`${glass}  •  ${taste}  •  ${abv}`, 540, 380);

    // Kutu 1: Malzemeler
    ctx.fillStyle = 'rgba(10, 18, 16, 0.7)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(110, 440, 860, 680, 24);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#d5b47b';
    ctx.font = 'bold 28px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(currentLang === 'en' ? 'INGREDIENTS & MEASURES' : 'MALZEMELER & ÖLÇÜLER', 150, 500);

    let rawIngs = [];
    if (d.isCustom && Array.isArray(d.customIngredients)) {
        rawIngs = d.customIngredients;
    } else {
        for (let i = 1; i <= 15; i++) {
            const ing = d[`strIngredient${i}`];
            const m = d[`strMeasure${i}`] ? d[`strMeasure${i}`].trim() : '';
            if (ing && ing.trim()) {
                const trName = translateIngredientName(ing.trim());
                const trMeasure = translateMeasureText(m);
                rawIngs.push(trMeasure ? `${trMeasure} ${trName}` : trName);
            }
        }
    }

    let yPos = 560;
    rawIngs.slice(0, 8).forEach((item) => {
        ctx.fillStyle = '#d5b47b';
        ctx.beginPath();
        ctx.arc(160, yPos - 8, 5, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#eeeae0';
        ctx.font = '500 28px sans-serif';
        ctx.fillText(item, 185, yPos);
        yPos += 58;
    });

    // Kutu 2: Hazırlanışı
    ctx.fillStyle = 'rgba(10, 18, 16, 0.7)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(110, 1160, 860, 480, 24);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#d5b47b';
    ctx.font = 'bold 28px sans-serif';
    ctx.fillText(currentLang === 'en' ? 'INSTRUCTIONS' : 'HAZIRLANIŞI', 150, 1220);

    const instr = currentLang === 'en' 
        ? (d.strInstructions || d.strInstructionsTR || 'Stir with ice and serve.') 
        : (d.strInstructionsTR || d.strInstructions || 'Buzla karıştırın ve servis edin.');
    ctx.fillStyle = '#c5d2cb';
    ctx.font = '400 24px sans-serif';
    const words = instr.split(' ');
    let line = '';
    let instrY = 1275;
    for (let n = 0; n < words.length; n++) {
        const testLine = line + words[n] + ' ';
        const metrics = ctx.measureText(testLine);
        if (metrics.width > 760 && n > 0) {
            ctx.fillText(line, 150, instrY);
            line = words[n] + ' ';
            instrY += 38;
            if (instrY > 1580) break;
        } else {
            line = testLine;
        }
    }
    if (line && instrY <= 1580) {
        ctx.fillText(line, 150, instrY);
    }

    // Kutu 3: Maliyet
    ctx.fillStyle = 'rgba(16, 185, 129, 0.15)';
    ctx.strokeStyle = 'rgba(16, 185, 129, 0.4)';
    ctx.beginPath();
    ctx.roundRect(110, 1680, 860, 90, 20);
    ctx.fill();
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.fillStyle = '#34d399';
    ctx.font = 'bold 24px sans-serif';
    ctx.fillText(currentLang === 'en' 
        ? `💰 Home Cost: ${cost}   |   Bar Savings: ~85%+` 
        : `💰 Ev Yapımı Maliyet: ${cost}   |   Bar Tasarrufu: ~%85+`, 540, 1735);

    // Alt Filigran
    ctx.fillStyle = '#6a7d74';
    ctx.font = '500 18px sans-serif';
    ctx.fillText(currentLang === 'en' ? 'Pocket Bar — Smart Home Bar & Cocktail Assistant' : 'Bar Cepte — Akıllı Ev Barı & Kokteyl Asistanı', 540, 1820);

    // İndirme Tetikle
    const link = document.createElement('a');
    link.download = `${currentLang === 'en' ? 'PocketBar' : 'BarCepte'}-${drinkName.replace(/[^a-zA-Z0-9_-]/g, '_')}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();

    showToast(currentLang === 'en' ? `📸 ${drinkName} story card downloaded!` : `📸 ${drinkName} Story kartı hazırlandı!`, 'success');
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

function recipeMatchesSearchToken(d, reqs, token) {
    if (!token) return true;
    const tokenNorm = normalizeSearchText(token);
    const dNameNorm = normalizeSearchText(d.strDrink || '');
    const dNameTrNorm = normalizeSearchText(d.strDrinkTR || '');

    if (dNameNorm.includes(tokenNorm) || (dNameTrNorm && dNameTrNorm.includes(tokenNorm))) {
        return true;
    }

    return reqs.some(r => {
        if (!r) return false;
        const rNorm = normalizeSearchText(r);
        if (rNorm.includes(tokenNorm)) return true;

        const trName = typeof translateIngredientName === 'function' ? normalizeSearchText(translateIngredientName(r)) : '';
        if (trName && trName.includes(tokenNorm)) return true;

        const matchedPopular = popularIngredients.filter(pi => {
            const piNorm = normalizeSearchText(pi.name);
            const piEnNorm = normalizeSearchText(pi.nameEn);
            const piIdNorm = normalizeSearchText(pi.id);
            return piNorm.includes(tokenNorm) || piEnNorm.includes(tokenNorm) || piIdNorm.includes(tokenNorm);
        });

        for (const pi of matchedPopular) {
            if (checkIngredientMatch(r, pi.id) || checkIngredientMatch(r, pi.name)) return true;
        }

        return checkIngredientMatch(r, token);
    });
}

function filterCocktails() {
    const readyContainer = document.getElementById('recipes-ready');
    const missingContainer = document.getElementById('recipes-missing');
    const cocktailSearch = document.getElementById('cocktail-search')?.value.toLowerCase().trim() || "";

    if (!readyContainer || !missingContainer) return;

    updateFavoritesFilterUI();
    const isDiscovery = selectedIngredients.length === 0 && !cocktailSearch && !onlyFavoritesFilter && currentVibeFilter === 'all';
    document.getElementById('editorial-picks')?.classList.toggle('hidden', !isDiscovery);
    document.getElementById('ready-section')?.classList.toggle('hidden', isDiscovery);
    document.getElementById('missing-section')?.classList.toggle('hidden', isDiscovery);

    if (cocktailSearch && document.getElementById('recipes-display-sections')?.classList.contains('hidden')) {
        switchTab('alkol');
    }

    if (selectedIngredients.length === 0 && !cocktailSearch && !onlyFavoritesFilter && currentVibeFilter === 'all') {
        const preferred = ['11003', '11007', '17212'];
        const discoveryPool = allCocktails.filter(d => matchesAlcoholFilter(d) && matchesVibeFilter(d));
        discoveryPool.forEach(enrichDrink);
        const picks = discoveryPool.filter(d => tasteFilter === 'all' || d.computedTaste === tasteFilter)
            .sort((a, b) => {
                const rank = id => preferred.includes(id) ? preferred.indexOf(id) : 99;
                return rank(a.idDrink) - rank(b.idDrink);
            }).slice(0, 3);
        const picksGrid = document.getElementById('editorial-picks-grid');
        if (picksGrid) renderLists(picks, picksGrid, false);
        readyContainer.innerHTML = `<div class="col-span-full text-center py-8 text-slate-500 text-xs">${I18N[currentLang].emptyDiscovery}</div>`;
        missingContainer.innerHTML = `<div class="col-span-full text-center py-8 text-slate-500 text-xs">${I18N[currentLang].noSelectedIng}</div>`;
        const countReadyEl = document.getElementById('count-ready');
        if (countReadyEl) countReadyEl.innerText = "0";
        
        const titleMissing = document.getElementById('title-missing');
        if(titleMissing) titleMissing.innerHTML = `<span class="w-2 h-2 rounded-full bg-rose-400"></span> ${I18N[currentLang].missingTitle} <span id="count-missing" class="text-[10px] bg-rose-500/10 text-rose-400 px-2 py-0.5 rounded-full border border-rose-500/20 font-bold">0</span>`;

        updateSmartAdvice([]);
        if (currentTab === 'bar') renderDashboard();
        return;
    }

    let readyMatches = [];
    let missingMatches = [];
    let pool = [...customRecipes, ...allCocktails].filter(d => matchesAlcoholFilter(d) && matchesVibeFilter(d));

    if (onlyFavoritesFilter) {
        pool = pool.filter(d => favoriteCocktails.includes(d.idDrink));
    }

    pool.forEach(d => {
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

        if (cocktailSearch) {
            const tokens = normalizeSearchText(cocktailSearch).split(/\s+/).filter(Boolean);
            const matchesAllTokens = tokens.length > 0 && tokens.every(token => recipeMatchesSearchToken(d, reqs, token));
            if (!matchesAllTokens) return;
        }

        let missing = reqs.filter(r => !selectedIngredients.some(s => checkIngredientMatch(r, s)));
        let hasAtLeastOneMatch = reqs.some(r => selectedIngredients.some(s => checkIngredientMatch(r, s)));

        enrichDrink(d);

        if (tasteFilter === 'all' || d.computedTaste === tasteFilter) {
            if (cocktailSearch || onlyFavoritesFilter || currentVibeFilter !== 'all') {
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
        if (cocktailSearch) {
            const qNorm = normalizeSearchText(cocktailSearch);
            const aDrink = a.drink || a;
            const bDrink = b.drink || b;
            const aNameMatch = normalizeSearchText(aDrink.strDrink || '').includes(qNorm);
            const bNameMatch = normalizeSearchText(bDrink.strDrink || '').includes(qNorm);
            if (aNameMatch && !bNameMatch) return -1;
            if (!aNameMatch && bNameMatch) return 1;
        }
        const idA = a.idDrink || a.drink?.idDrink;
        const idB = b.idDrink || b.drink?.idDrink;
        return (favoriteCocktails.includes(idB) ? 1 : 0) - (favoriteCocktails.includes(idA) ? 1 : 0);
    };

    readyMatches.sort(sortFn);
    
    missingMatches.sort((a,b) => {
        if (cocktailSearch) {
            const qNorm = normalizeSearchText(cocktailSearch);
            const aDrink = a.drink || a;
            const bDrink = b.drink || b;
            const aNameMatch = normalizeSearchText(aDrink.strDrink || '').includes(qNorm);
            const bNameMatch = normalizeSearchText(bDrink.strDrink || '').includes(qNorm);
            if (aNameMatch && !bNameMatch) return -1;
            if (!aNameMatch && bNameMatch) return 1;
        }
        if(a.missingList.length !== b.missingList.length) return a.missingList.length - b.missingList.length;
        return sortFn(a.drink, b.drink);
    });

    const readySectionH2 = document.querySelector('#ready-section h2');
    if (readySectionH2) {
        readySectionH2.innerHTML = `<span class="w-2 h-2 rounded-full bg-emerald-400"></span> ${I18N[currentLang].readyTitle} <span id="count-ready" class="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/20 font-bold">${readyMatches.length}</span>`;
    }

    const titleMissing = document.getElementById('title-missing');
    if(titleMissing) {
        if(cocktailSearch) {
            titleMissing.innerHTML = `<span class="w-2 h-2 rounded-full bg-rose-400"></span> ${I18N[currentLang].missingSearchTitle} <span id="count-missing" class="text-[10px] bg-rose-500/10 text-rose-400 px-2 py-0.5 rounded-full border border-rose-500/20 font-bold">${missingMatches.length}</span>`;
        } else if (onlyFavoritesFilter) {
            titleMissing.innerHTML = `<span class="w-2 h-2 rounded-full bg-rose-400"></span> ${I18N[currentLang].missingFavTitle} <span id="count-missing" class="text-[10px] bg-rose-500/10 text-rose-400 px-2 py-0.5 rounded-full border border-rose-500/20 font-bold">${missingMatches.length}</span>`;
        } else if (currentVibeFilter !== 'all') {
            const vibeNamesTr = {
                summer: '☀️ Yaz & Havuz',
                romantic: '🕯️ Romantik Akşam',
                chill: '🍿 Dizi & Film',
                winter: '❄️ Kış & Şömine',
                party: '🎉 Parti & Shot'
            };
            const vibeNamesEn = {
                summer: '☀️ Summer & Pool',
                romantic: '🕯️ Romantic Night',
                chill: '🍿 Movie & Chill',
                winter: '❄️ Cozy Winter',
                party: '🎉 Party & Shots'
            };
            const label = currentLang === 'en' ? (vibeNamesEn[currentVibeFilter] || 'Vibe') : (vibeNamesTr[currentVibeFilter] || 'Ortam');
            const suffix = currentLang === 'en' ? 'Selection' : 'Seçkisi';
            titleMissing.innerHTML = `<span class="w-2 h-2 rounded-full bg-amber-400"></span> ${label} ${suffix} <span id="count-missing" class="text-[10px] bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded-full border border-amber-500/20 font-bold">${missingMatches.length}</span>`;
        } else {
            titleMissing.innerHTML = `<span class="w-2 h-2 rounded-full bg-rose-400"></span> ${I18N[currentLang].missingTitle} <span id="count-missing" class="text-[10px] bg-rose-500/10 text-rose-400 px-2 py-0.5 rounded-full border border-rose-500/20 font-bold">${missingMatches.length}</span>`;
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
        container.innerHTML = `<div class="col-span-full text-center py-8 text-slate-500 text-xs">${I18N[currentLang].noCustomRecipes}</div>`;
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
            const sub = getIngredientSubstitute(m);
            const subHTML = sub ? `
            <div class="flex items-center justify-between gap-1 text-[10px] bg-amber-500/10 border border-amber-500/25 px-2.5 py-1 rounded-xl text-amber-300 mt-1 min-w-0" data-stop-card>
                <span class="truncate">💡 <b>${currentLang === 'en' ? 'Substitute:' : 'Muadil:'}</b> ${escapeHTML(sub.sub)}</span>
                <button data-action="substitute" data-ing="${escapeHTML(encodedM)}" data-sub="${escapeHTML(encodeURIComponent(sub.sub))}" class="pill-btn font-bold text-amber-400 hover:text-white shrink-0 ml-1.5 underline">
                    ${currentLang === 'en' ? 'Add to Bar' : 'Bara Ekle'}
                </button>
            </div>` : '';
            return `
            <div class="flex flex-col gap-1 mt-1 bg-rose-950/20 px-3 py-1.5 rounded-xl border border-rose-500/20 min-w-0">
                <div class="flex items-center justify-between gap-2 min-w-0">
                    <p class="text-[11px] text-rose-300 font-medium break-words min-w-0">⚠️ ${currentLang === 'en' ? 'Missing:' : 'Eksik:'} ${safeM}</p>
                    <button data-action="shopping" data-value="${escapeHTML(encodedM)}" class="pill-btn text-[10px] bg-black/40 border border-white/10 text-slate-300 px-2.5 py-1 rounded-lg hover:border-amber-500/40 shrink-0">
                        ${inShop ? (currentLang === 'en' ? '🛒 Remove' : '🛒 Çıkar') : (currentLang === 'en' ? '➕ Add to List' : '➕ Alışverişe Ekle')}
                    </button>
                </div>
                ${subHTML}
            </div>
            `;
        }).join('') : '';

        const card = document.createElement('div');
        const cardId = `card_${d.idDrink.replace(/[^a-zA-Z0-9_]/g, '_')}`;
        card.id = cardId;
        card.className = "acrylic-card cocktail-card rounded-3xl p-4 shadow-xl cursor-pointer select-none relative animate-fade-in flex flex-col min-w-0 overflow-hidden self-start h-fit";
        
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
            : (currentLang === 'en'
                ? escapeHTML(cleanInstructionText(d.strInstructions || ''))
                : (rawTR ? escapeHTML(rawTR) : 'Çevriliyor...'));
        const abvBadge = d.computedABV ? `<span class="text-[10px] font-bold ${d.computedABV.badgeCls} px-2 py-0.5 rounded-lg border font-mono">${escapeHTML(getAbvLabel(d.computedABV, currentLang))}</span>` : '';

        card.innerHTML = `
            ${d.strDrinkThumb && safeImageSrc(d.strDrinkThumb) 
                ? `<img src="${escapeHTML(safeImageSrc(d.strDrinkThumb))}" class="w-full h-40 object-contain bg-black/30 rounded-2xl mb-3 shadow-inner" loading="lazy" data-image-fallback>`
                : `<div class="w-full h-40 bg-black/30 rounded-2xl mb-3 flex items-center justify-center text-4xl">🍹</div>`}
            
            <button data-action="favorite" data-value="${escapeHTML(drinkIdEncoded)}" class="pill-btn absolute top-6 right-6 bg-slate-950/80 p-2 rounded-full border border-white/10 text-sm z-10 shadow-lg hover:border-rose-500/50">${isFav ? '❤️' : '🤍'}</button>
            
            ${d.isCustom ? `
            <button data-action="share" data-value="${escapeHTML(drinkIdEncoded)}" class="pill-btn absolute top-6 left-6 bg-slate-950/80 p-2 rounded-full border border-white/10 text-sm z-10 shadow-lg hover:border-amber-500">📤</button>
            <button data-action="delete" data-value="${escapeHTML(drinkIdEncoded)}" class="pill-btn absolute top-6 left-16 bg-rose-500/20 text-rose-400 p-2 rounded-full border border-rose-500/30 text-sm z-10 shadow-lg">🗑️</button>
            ` : ''}
            
            <div class="flex justify-between items-start mt-2 min-w-0 gap-2">
                <div class="min-w-0 flex-1">
                    <div class="flex flex-wrap gap-1.5 mb-1.5">
                        <span class="text-[10px] font-bold bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded-lg border border-amber-500/20 uppercase tracking-wider">${escapeHTML(getTasteLabel(d.computedTaste))}</span>
                        <span class="text-[10px] font-semibold bg-black/30 text-slate-400 px-2 py-0.5 rounded-lg border border-white/5 font-mono">🔥 ~${d.computedCalories} kcal</span>
                        ${abvBadge}
                        <span class="text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-lg border border-emerald-500/20 font-mono recipe-cost-badge">${currentLang === 'en' ? `💵 ~$${d.computedCost ? (d.computedCost.cost / 30).toFixed(2) : '1.20'}` : `💵 ~${d.computedCost ? d.computedCost.cost : 35} ₺`}</span>
                    </div>
                    <h3 class="font-extrabold text-white text-base leading-snug break-words hyphens-auto text-title-responsive">${safeDrinkName}</h3>
                    <p class="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1 break-words">${glassBadge}</p>
                </div>
                <span class="text-amber-400 text-xs font-bold toggle-icon shrink-0 pl-1 pt-1">${currentLang === 'en' ? 'Details ▼' : 'Detay ▼'}</span>
            </div>
            
            ${isMissingList ? `<div class="mt-2.5 pt-2 border-t border-white/5 flex flex-col gap-1 min-w-0">${missingTextHTML}</div>` : ''}
            
            <div class="details-section mt-2.5 space-y-3 min-w-0 overflow-hidden">
                <!-- Ev Maliyeti ve Bar Tasarrufu -->
                <div class="flex flex-wrap items-center justify-between gap-2 bg-emerald-950/20 border border-emerald-500/20 p-2.5 rounded-2xl text-[11px] text-emerald-300">
                    <span class="flex items-center gap-1 font-medium">💰 <b>${currentLang === 'en' ? 'Home Cost:' : 'Ev Maliyeti:'}</b> ${currentLang === 'en' ? `~$${d.computedCost ? (d.computedCost.cost / 30).toFixed(2) : '1.20'}` : `~${d.computedCost ? d.computedCost.cost : 35} ₺`}</span>
                    <span class="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-500/20">${currentLang === 'en' ? `Bar Savings: ~${d.computedCost ? d.computedCost.savingsPercent : 90}%` : `Bar Tasarrufu: ~%${d.computedCost ? d.computedCost.savingsPercent : 90}`}</span>
                </div>

                <!-- Porsiyon Kontrolü (Taşmayan Esnek Düzen) -->
                <div class="flex flex-wrap items-center justify-between gap-1.5 bg-black/30 p-2 rounded-2xl border border-white/5" data-stop-card>
                    <span class="text-[11px] text-slate-400 font-medium shrink-0">${currentLang === 'en' ? '👥 Servings:' : '👥 Porsiyon:'}</span>
                    <div class="flex flex-wrap gap-1 shrink-0">
                        <button data-action="portion" data-card="${cardId}" data-value="1" class="portion-btn pill-btn px-2.5 py-0.5 rounded-lg text-[10px] bg-amber-500/20 text-amber-400 border border-amber-500/40 font-bold">1x</button>
                        <button data-action="portion" data-card="${cardId}" data-value="2" class="portion-btn pill-btn px-2.5 py-0.5 rounded-lg text-[10px] bg-black/40 text-slate-400 border border-white/5">2x</button>
                        <button data-action="portion" data-card="${cardId}" data-value="4" class="portion-btn pill-btn px-2.5 py-0.5 rounded-lg text-[10px] bg-black/40 text-slate-400 border border-white/5">4x</button>
                        <button data-action="portion" data-card="${cardId}" data-value="8" class="portion-btn pill-btn px-2.5 py-0.5 rounded-lg text-[10px] bg-black/40 text-slate-400 border border-white/5">${currentLang === 'en' ? '8x Party' : '8x Parti'}</button>
                    </div>
                </div>

                <!-- Malzemeler ve Ölçüler -->
                <div class="space-y-1 min-w-0">
                    <span class="text-[11px] text-slate-400 font-medium block">${currentLang === 'en' ? 'Ingredients & Measures:' : 'Malzemeler & Ölçüler:'}</span>
                    <div class="flex flex-wrap">${ingredientsHTML}</div>
                </div>

                <!-- Bardak & Teknik & Sayaç -->
                <div class="flex flex-wrap items-center gap-1.5 pt-1">
                    <span class="text-[10px] bg-white/5 text-slate-300 border border-white/10 px-2.5 py-1 rounded-xl flex items-center gap-1">${techniqueBadge}</span>
                    <button data-action="timer" data-value="${escapeHTML(drinkIdEncoded)}" class="pill-btn text-[10px] bg-amber-500/10 text-amber-300 border border-amber-500/30 px-2.5 py-1 rounded-xl flex items-center gap-1 hover:bg-amber-500/20 font-semibold shadow-sm">⏱️ ${currentLang === 'en' ? 'Timer' : 'Sayaç'}</button>
                    <button data-action="export-story" data-value="${escapeHTML(drinkIdEncoded)}" class="pill-btn text-[10px] bg-amber-500/10 text-amber-300 border border-amber-500/30 px-2.5 py-1 rounded-xl flex items-center gap-1 hover:bg-amber-500/20 font-semibold shadow-sm" data-stop-card>📸 ${currentLang === 'en' ? 'Story Card' : 'Story İndir'}</button>
                    <span class="text-[10px] bg-white/5 text-slate-300 border border-white/10 px-2.5 py-1 rounded-xl flex items-center gap-1">${glassBadge}</span>
                </div>

                ${d.strServing ? `<div class="bg-amber-500/10 border border-amber-500/20 p-2.5 rounded-2xl text-[11px] text-amber-300 italic break-words">💡 <b>${currentLang === 'en' ? 'Serving/Garnish:' : 'Servis/Garnitür:'}</b> ${safeServing}</div>` : ''}
                
                <p class="text-xs text-slate-300 instruction-text bg-black/30 p-3 rounded-2xl border border-white/5 leading-relaxed break-words">
                    <b class="text-slate-400 text-[11px] block mb-1 uppercase tracking-wider font-semibold">${currentLang === 'en' ? 'Instructions:' : 'Hazırlanışı:'}</b>
                    <span>${safeInstructions}</span>
                </p>

                <button data-action="open-mix-mode" data-value="${escapeHTML(drinkIdEncoded)}" class="pill-btn w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black py-2.5 px-4 rounded-2xl shadow-lg flex items-center justify-center gap-2 text-xs transition-all mt-2" data-stop-card>
                    <span>🚀</span><span>${currentLang === 'en' ? 'Start Step-by-Step Mix' : 'Adım Adım Hazırlamaya Başla'}</span>
                </button>
            </div>
        `;

        card.onclick = async (e) => {
            if (e.target.closest('button')) return;
            const details = card.querySelector('.details-section');
            const icon = card.querySelector('.toggle-icon');
            const span = card.querySelector('.instruction-text span');
            if (!details.classList.contains('open')) {
                triggerHaptic('light');
                const parentGrid = card.parentElement;
                if (parentGrid) {
                    parentGrid.querySelectorAll('.cocktail-card').forEach(other => {
                        if (other !== card) {
                            const otherDet = other.querySelector('.details-section.open');
                            if (otherDet) {
                                otherDet.classList.remove('open');
                                const otherIcon = other.querySelector('.toggle-icon');
                                if (otherIcon) otherIcon.innerText = currentLang === 'en' ? "Details ▼" : "Detay ▼";
                            }
                        }
                    });
                }
                details.classList.add('open');
                icon.innerText = currentLang === 'en' ? "Close ▲" : "Kapat ▲";

                // Android uygulaması için akıllı reklam tetikleyicisi
                if (window.AndroidBridge && typeof window.AndroidBridge.onRecipeOpened === 'function') {
                    try { window.AndroidBridge.onRecipeOpened(); } catch (err) {}
                }
                if (!d.isCustom) {
                    if (currentLang === 'en') {
                        span.textContent = cleanInstructionText(d.strInstructions || '');
                    } else {
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
                }
            } else {
                details.classList.remove('open');
                icon.innerText = currentLang === 'en' ? "Details ▼" : "Detay ▼";
            }
        };
        return card;
}

const COCKTAIL_PAGE_SIZE = 24;

function renderLists(items, container, isMissingList) {
    container.innerHTML = "";
    if (!items || items.length === 0) {
        container.innerHTML = `<div class="col-span-full text-center py-8 text-slate-500 text-xs">${currentLang === 'en' ? 'No cocktails found matching these criteria.' : 'Bu kriterlere uygun kokteyl bulunamadı.'}</div>`;
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
            const showMoreLabel = currentLang === 'en' ? `Show More (+${Math.min(remaining, COCKTAIL_PAGE_SIZE)})` : `Daha Fazla Göster (+${Math.min(remaining, COCKTAIL_PAGE_SIZE)})`;
            const remainingLabel = currentLang === 'en' ? `Remaining: ${remaining}` : `Kalan: ${remaining}`;
            loadMoreWrapper.innerHTML = `
                <button class="pill-btn px-6 py-2.5 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-bold hover:bg-amber-500/25 shadow-lg flex items-center gap-2">
                    <span>${showMoreLabel}</span>
                    <span class="text-slate-400 font-normal">${remainingLabel}</span>
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
    const shareText = currentLang === 'en'
        ? `🍹 *${recipe.strDrink}* (Custom Recipe)\n\n🔹 *Ingredients:*\n${ingredientsText}\n\n🔸 *Instructions:*\n${recipe.strInstructions}\n\n_Crafted with Pocket Bar!_`
        : `🍹 *${recipe.strDrink}* (Özel Tarif)\n\n🔹 *Malzemeler:*\n${ingredientsText}\n\n🔸 *Hazırlanışı:*\n${recipe.strInstructions}\n\n_Bar Cepte ile hazırlandı!_`;

    if (navigator.share) {
        navigator.share({
            title: recipe.strDrink,
            text: shareText
        }).catch(err => console.log('Paylaşım iptal:', err));
    } else if (navigator.clipboard && navigator.clipboard.writeText) {
        try {
            await navigator.clipboard.writeText(shareText);
            alert(currentLang === 'en' ? "Recipe copied to clipboard!" : "Tarif panoya kopyalandı!");
        } catch(err) {
            alert((currentLang === 'en' ? "Copying failed. Recipe content:\n\n" : "Kopyalama başarısız oldu. Tarif içeriği:\n\n") + shareText);
        }
    } else {
        alert(shareText);
    }
}

function deleteCustomRecipe(id, event) {
    if(event) event.stopPropagation();
    if(confirm(currentLang === 'en' ? "Are you sure you want to delete this custom recipe?" : "Bu özel tarifi silmek istediğine emin misin?")) {
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
    if (confirm(currentLang === 'en' ? "Are you sure you want to clear all items from the shopping list?" : "Alışveriş listesindeki tüm malzemeleri silmek istediğinize emin misiniz?")) {
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
        container.innerHTML = `<p class="text-center py-8 text-slate-500 text-xs">${I18N[currentLang].emptyShoppingList}</p>`;
        return;
    }
    container.innerHTML = "";
    shoppingList.forEach(item => {
        const row = document.createElement('div');
        row.className = "flex items-center justify-between gap-2 bg-black/30 p-3 rounded-2xl border border-white/5 shadow-sm min-w-0";
        const encodedItem = encodeURIComponent(item);
        const translatedName = translateIngredientName(item);
        const safeItem = escapeHTML(translatedName || item);
        const boughtText = I18N[currentLang].bought || (currentLang === 'en' ? '✓ Got It' : '✓ Aldım');
        const removeText = I18N[currentLang].remove || (currentLang === 'en' ? 'Delete' : 'Sil');
        row.innerHTML = `
            <div class="flex items-center gap-2 min-w-0">
                <span class="text-amber-400 shrink-0">🛒</span>
                <span class="capitalize text-slate-200 font-semibold text-xs break-words min-w-0">${safeItem}</span>
            </div>
            <div class="flex gap-2 shrink-0">
                <button data-action="purchased" data-value="${escapeHTML(encodedItem)}" class="pill-btn text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 text-xs font-semibold px-2.5 py-1 rounded-xl hover:bg-emerald-500/20">
                    ${boughtText}
                </button>
                <button data-action="shopping" data-value="${escapeHTML(encodedItem)}" class="pill-btn text-rose-400 text-xs font-semibold px-2 py-1 hover:text-rose-300">
                    ${removeText}
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
        return alert(currentLang === 'en' ? "Please fill in recipe name, at least one ingredient, and instructions!" : "Lütfen tarif adı, en az bir malzeme ve hazırlanışını doldurun!");
    }
    if (name.length > 200 || instructions.length > 10000 || serving.length > 1000 ||
        ingredients.length > 50 || ingredients.some(i => i.length > 200) || customRecipes.length >= 300) {
        return alert(currentLang === 'en' ? "Recipe limit exceeded. Max 300 recipes, 50 ingredients, and 200 character name." : "Tarif sınırı aşıldı. En fazla 300 tarif, 50 malzeme ve 200 karakterlik ad kullanın.");
    }

    let base64Image = "";
    if (imageInput && imageInput.files && imageInput.files[0]) {
        const file = imageInput.files[0];
        if (!/^image\/(jpeg|png|webp|gif)$/.test(file.type) || file.size > 5 * 1024 * 1024) {
            return alert(currentLang === 'en' ? "Please select a JPG, PNG, WebP or GIF under 5 MB." : "En fazla 5 MB boyutunda JPG, PNG, WebP veya GIF seçin.");
        }
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

    alert(currentLang === 'en' ? "Custom recipe successfully saved!" : "Özel tarif başarıyla kaydedildi!");
    
    switchTab('my-recipes');
    filterCocktails();
}

async function exportUserData() {
    const data = { favorites: favoriteCocktails, customs: customRecipes, shopping: shoppingList, selected: selectedIngredients };
    const encrypted = btoa(unescape(encodeURIComponent(JSON.stringify(data))));
    
    try {
        if (navigator.clipboard) {
            await navigator.clipboard.writeText(encrypted);
            alert(currentLang === 'en' ? "Backup code copied to clipboard!" : "Yedekleme kodu panoya kopyalandı!");
        } else {
            throw new Error("Clipboard unavailable");
        }
    } catch(err) {
        const input = document.getElementById('sync-data-input');
        if (input) {
            input.value = encrypted;
            input.select();
            alert(currentLang === 'en' ? "Backup code written to the box below. You can copy it from there." : "Yedekleme kodu aşağıdaki kutuya yazıldı. Buradan kopyalayabilirsiniz.");
        }
    }
}

async function importUserData() {
    const input = document.getElementById('sync-data-input')?.value.trim();
    if(!input) return alert(currentLang === 'en' ? "Please paste a valid backup code." : "Lütfen geçerli bir yedekleme kodu yapıştırın.");
    try {
        if (input.length > BarSecurity.MAX_BACKUP_LENGTH) throw new Error('Yedek çok büyük');
        const decrypted = BarSecurity.backup(JSON.parse(decodeURIComponent(escape(atob(input)))));
        if (!confirm(currentLang === 'en' ? "This backup will replace your current favorites, custom recipes, shopping and bar shelf. Continue?" : "Bu yedek mevcut favori, tarif, alışveriş ve malzeme listelerinizin yerini alacak. Devam edilsin mi?")) return;
        const values = {
            favoriteCocktails: decrypted.favorites, customRecipes: decrypted.customs,
            shoppingList: decrypted.shopping, selectedIngredients: decrypted.selected
        };
        const previous = Object.fromEntries(Object.keys(values).map(key => [key, localStorage.getItem(key)]));
        try {
            for (const [key, value] of Object.entries(values)) localStorage.setItem(key, JSON.stringify(value));
            if (db) {
                await new Promise((resolve, reject) => {
                    const tx = db.transaction("custom_recipes", "readwrite");
                    tx.oncomplete = resolve;
                    tx.onerror = tx.onabort = () => reject(new Error('Veritabanına yazılamadı'));
                    const store = tx.objectStore("custom_recipes");
                    store.clear();
                    decrypted.customs.forEach(recipe => store.put(recipe));
                });
            }
        } catch (error) {
            for (const [key, value] of Object.entries(previous)) {
                try {
                    if (value === null) localStorage.removeItem(key);
                    else localStorage.setItem(key, value);
                } catch {}
            }
            return alert(currentLang === 'en' ? "Backup could not be saved. Check storage permissions and free space." : "Yedek kaydedilemedi. Depolama iznini ve boş alanı kontrol edin.");
        }
        favoriteCocktails = decrypted.favorites;
        customRecipes = decrypted.customs;
        shoppingList = decrypted.shopping;
        selectedIngredients = decrypted.selected;
        
        alert(currentLang === 'en' ? "Sync successful!" : "Senkronizasyon başarılı!");
        location.reload();
    } catch {
        alert(currentLang === 'en' ? "Invalid or corrupted backup code!" : "Geçersiz veya bozuk yedekleme kodu!");
    }
}

function pickRandomCocktail() {
    const pool = [...customRecipes, ...allCocktails];
    if (pool.length === 0) return alert(currentLang === 'en' ? "Recipes not loaded yet, please wait." : "Tarifler henüz yüklenmedi, lütfen bekleyin.");
    
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

function applyLanguage() {
    const t = I18N[currentLang];
    if (!t) return;

    // Document title
    document.title = t.title;

    // Brand title in header
    const brandTitle = document.getElementById('brand-title');
    if (brandTitle) brandTitle.innerText = t.brand;

    // Status element
    const statusEl = document.getElementById('status');
    if (statusEl && allCocktails.length > 0) {
        statusEl.innerText = `${allCocktails.length + customRecipes.length} ${t.statusCount}`;
    }

    // Language toggle button & Unit toggle button text
    const langBtn = document.getElementById('btn-lang-toggle');
    if (langBtn) {
        if (currentLang === 'en') {
            langBtn.innerHTML = '<span class="text-slate-400 font-medium">TR</span><span class="text-slate-500 text-[10px]">/</span><span class="text-amber-300 font-black">EN 🇺🇸</span>';
            langBtn.title = 'Switch to Turkish / Türkçeye Geç';
        } else {
            langBtn.innerHTML = '<span class="text-amber-300 font-black">🇹🇷 TR</span><span class="text-slate-500 text-[10px]">/</span><span class="text-slate-400 font-medium">EN</span>';
            langBtn.title = 'Switch to English / İngilizceye Geç';
        }
    }
    const unitBtn = document.getElementById('btn-unit-toggle');
    if (unitBtn) {
        if (currentUnit === 'oz') {
            unitBtn.innerHTML = '<span class="text-slate-400 font-medium">cl</span><span class="text-slate-500 text-[10px]">/</span><span class="text-amber-300 font-black">oz</span>';
            unitBtn.title = currentLang === 'en' ? 'Unit: oz (Click to switch to cl)' : 'Ölçü: oz (cl birimine geçmek için tıkla)';
        } else {
            unitBtn.innerHTML = '<span class="text-amber-300 font-black">cl</span><span class="text-slate-500 text-[10px]">/</span><span class="text-slate-400 font-medium">oz</span>';
            unitBtn.title = currentLang === 'en' ? 'Unit: cl (Click to switch to oz)' : 'Ölçü: cl (oz birimine geçmek için tıkla)';
        }
    }

    // Navigation Tabs
    const tabMap = {
        'tab-bar': t.myBar,
        'tab-alkol': t.exploreDrinks,
        'tab-mutfak': t.kitchen,
        'tab-favorites': t.favorites,
        'tab-custom': t.addRecipe,
        'tab-my-recipes': t.myRecipes,
        'tab-shop': t.shopping,
        'tab-sync': t.backup
    };
    Object.entries(tabMap).forEach(([id, text]) => {
        const el = document.getElementById(id);
        if (el) el.innerText = text;
    });

    // Hero section
    const heroEyebrow = document.querySelector('#editorial-hero .eyebrow');
    if (heroEyebrow) heroEyebrow.innerHTML = `<span class="eyebrow-line"></span> ${t.heroEyebrow}`;
    const heroHeading = document.getElementById('hero-heading');
    if (heroHeading) heroHeading.innerHTML = t.heroHeading;
    const heroDesc = document.querySelector('#editorial-hero p');
    if (heroDesc) heroDesc.innerHTML = t.heroDesc;
    const heroBuildBar = document.getElementById('hero-build-bar');
    if (heroBuildBar) heroBuildBar.innerHTML = `${t.heroBuildBar} <span aria-hidden="true">↗</span>`;
    const heroSurprise = document.getElementById('hero-surprise');
    if (heroSurprise) heroSurprise.innerHTML = `${t.heroSurprise} <span aria-hidden="true">→</span>`;
    const heroNote = document.querySelector('#editorial-hero .hero-note');
    if (heroNote) heroNote.innerHTML = t.heroNote;
    const heroCaption = document.querySelector('#editorial-hero figcaption');
    if (heroCaption) heroCaption.innerHTML = `<span>${t.heroCaptionSpan}</span><strong>${t.heroCaptionStrong}</strong>`;

    // Discovery section
    const discEyebrow = document.querySelector('#discovery-controls .eyebrow');
    if (discEyebrow) discEyebrow.innerText = t.discoveryEyebrow;
    const discHeading = document.getElementById('discovery-heading');
    if (discHeading) discHeading.innerText = t.discoveryHeading;
    const selSummary = document.getElementById('selection-summary');
    if (selSummary && selectedIngredients.length === 0) selSummary.innerText = t.startChoosing;
    const clearSelBtn = document.getElementById('btn-clear-selection-header');
    if (clearSelBtn) clearSelBtn.innerHTML = t.clear;

    // Search inputs & action buttons
    const ingSearch = document.getElementById('ing-search');
    if (ingSearch) ingSearch.placeholder = t.searchIngPlaceholder;
    const cocktailSearch = document.getElementById('cocktail-search');
    if (cocktailSearch) cocktailSearch.placeholder = t.searchCocktailPlaceholder;
    const clearBtn13 = document.querySelector('[data-ui="ui-13"]');
    if (clearBtn13) clearBtn13.innerHTML = t.clear;
    const randBtn15 = document.querySelector('[data-ui="ui-15"]');
    if (randBtn15) randBtn15.innerHTML = t.random;
    const filterCap = document.querySelector('.filter-caption');
    if (filterCap) filterCap.innerText = t.filterByProfile;

    // Alcohol segment
    const btnAllAlc = document.getElementById('btn-all-alcohol');
    if (btnAllAlc) btnAllAlc.innerText = t.all;
    const btnAlc = document.getElementById('btn-alcoholic');
    if (btnAlc) btnAlc.innerText = t.alcoholic;
    const btnNonAlc = document.getElementById('btn-non-alcoholic');
    if (btnNonAlc) btnNonAlc.innerText = t.nonAlcoholic;

    // Taste filters
    const tasteBtnAll = document.querySelector('[data-taste="all"]');
    if (tasteBtnAll) tasteBtnAll.innerText = t.allTastes;
    const tasteBtnStrong = document.querySelector('[data-taste="Sert"]');
    if (tasteBtnStrong) tasteBtnStrong.innerText = t.tasteStrong;
    const tasteBtnSweet = document.querySelector('[data-taste="Tatlı"]');
    if (tasteBtnSweet) tasteBtnSweet.innerText = t.tasteSweet;
    const tasteBtnSour = document.querySelector('[data-taste="Ekşi"]');
    if (tasteBtnSour) tasteBtnSour.innerText = t.tasteSour;
    const tasteBtnFresh = document.querySelector('[data-taste="Ferah"]');
    if (tasteBtnFresh) tasteBtnFresh.innerText = t.tasteFresh;

    // Vibe filter label & buttons
    const vibeLabel = document.querySelector('#discovery-controls .vibe-label, #discovery-controls span.uppercase');
    if (vibeLabel && vibeLabel.innerText.includes('Ortam')) vibeLabel.innerText = t.vibeLabel;
    const vibeAll = document.querySelector('[data-vibe="all"]');
    if (vibeAll) vibeAll.innerText = t.vibeAll;
    const vibeSummer = document.querySelector('[data-vibe="summer"]');
    if (vibeSummer) vibeSummer.innerText = t.vibeSummer;
    const vibeRom = document.querySelector('[data-vibe="romantic"]');
    if (vibeRom) vibeRom.innerText = t.vibeRomantic;
    const vibeChill = document.querySelector('[data-vibe="chill"]');
    if (vibeChill) vibeChill.innerText = t.vibeChill;
    const vibeWinter = document.querySelector('[data-vibe="winter"]');
    if (vibeWinter) vibeWinter.innerText = t.vibeWinter;
    const vibeParty = document.querySelector('[data-vibe="party"]');
    if (vibeParty) vibeParty.innerText = t.vibeParty;

    // Alcohol subcategories
    const alcSubcatAll = document.querySelector('#alcohol-subcategories [data-value="all"]');
    if (alcSubcatAll) alcSubcatAll.innerText = t.all;
    const alcSubcatVodka = document.querySelector('#alcohol-subcategories [data-value="votka-cin"]');
    if (alcSubcatVodka) alcSubcatVodka.innerText = currentLang === 'en' ? '🍸 Vodka & Gin' : '🍸 Votka & Cin';
    const alcSubcatWhiskey = document.querySelector('#alcohol-subcategories [data-value="viski-konyak"]');
    if (alcSubcatWhiskey) alcSubcatWhiskey.innerText = currentLang === 'en' ? '🥃 Whiskey & Cognac' : '🥃 Viski & Konyak';
    const alcSubcatTequila = document.querySelector('#alcohol-subcategories [data-value="tekila-rom"]');
    if (alcSubcatTequila) alcSubcatTequila.innerText = currentLang === 'en' ? '🌵 Tequila & Rum' : '🌵 Tekila & Rom';
    const alcSubcatLiqueur = document.querySelector('#alcohol-subcategories [data-value="likor-aperitif"]');
    if (alcSubcatLiqueur) alcSubcatLiqueur.innerText = currentLang === 'en' ? '🍊 Liqueur & Aperitif' : '🍊 Likör & Aperitif';
    const alcSubcatWine = document.querySelector('#alcohol-subcategories [data-value="sarap-bira"]');
    if (alcSubcatWine) alcSubcatWine.innerText = currentLang === 'en' ? '🍷 Wine, Vermouth & Beer' : '🍷 Şarap, Vermut & Bira';
    const alcSubcatKitchen = document.querySelector('#alcohol-subcategories [data-value="mutfak"]');
    if (alcSubcatKitchen) alcSubcatKitchen.innerText = currentLang === 'en' ? '🌿 Kitchen & Garnishes' : '🌿 Mutfak & Garnitür';

    // Kitchen subcategories
    const kitSubcatAll = document.querySelector('#kitchen-subcategories [data-subcat="all"]');
    if (kitSubcatAll) kitSubcatAll.innerText = t.all;
    const kitSubcatCitrus = document.querySelector('#kitchen-subcategories [data-subcat="meyve"]');
    if (kitSubcatCitrus) kitSubcatCitrus.innerText = currentLang === 'en' ? '🍊 Citrus & Fruit' : '🍊 Meyve & Narenciye';
    const kitSubcatSoda = document.querySelector('#kitchen-subcategories [data-subcat="gazli"]');
    if (kitSubcatSoda) kitSubcatSoda.innerText = currentLang === 'en' ? '🫧 Soda & Mixers' : '🫧 Gazlı & Meşrubat';
    const kitSubcatSyrup = document.querySelector('#kitchen-subcategories [data-subcat="tatli"]');
    if (kitSubcatSyrup) kitSubcatSyrup.innerText = currentLang === 'en' ? '🍯 Syrup & Sweet' : '🍯 Şurup & Tatlı';
    const kitSubcatHerbs = document.querySelector('#kitchen-subcategories [data-subcat="baharat"]');
    if (kitSubcatHerbs) kitSubcatHerbs.innerText = currentLang === 'en' ? '🌿 Herbs & Spices' : '🌿 Ot & Baharat';
    const kitSubcatMilk = document.querySelector('#kitchen-subcategories [data-subcat="sut-kahve"]');
    if (kitSubcatMilk) kitSubcatMilk.innerText = currentLang === 'en' ? '☕ Milk & Coffee' : '☕ Süt & Kahve';

    // Editorial Picks section
    const edEyebrow = document.querySelector('#editorial-picks .eyebrow');
    if (edEyebrow) edEyebrow.innerText = t.editorialEyebrow;
    const edHeading = document.querySelector('#editorial-picks h2');
    if (edHeading) edHeading.innerText = t.editorialHeading;
    const edAside = document.querySelector('#editorial-picks .section-aside');
    if (edAside) edAside.innerText = t.editorialAside;

    // Hero video toggle button
    const heroVidText = document.getElementById('hero-video-toggle-text');
    if (heroVidText) {
        const video = document.getElementById('hero-cocktail-video');
        const isPlaying = video && !video.paused && video.classList.contains('video-active');
        heroVidText.innerText = isPlaying 
            ? (currentLang === 'en' ? '🎬 Live' : '🎬 Canlı')
            : (currentLang === 'en' ? '🖼️ Photo' : '🖼️ Foto');
    }

    // Bar Dashboard
    const dashH2 = document.querySelector('#bar-dashboard h2');
    if (dashH2) dashH2.innerHTML = `<span>📊</span> ${t.barOverview}`;
    const dashOverview = document.querySelector('#bar-dashboard .border-b span.font-mono');
    if (dashOverview) dashOverview.innerText = t.overviewBadge;
    const dashFillRateLabel = document.querySelector('#bar-dashboard .grid > div:nth-child(1) p.text-slate-400');
    if (dashFillRateLabel) dashFillRateLabel.innerText = t.barFillRate;
    const dashReadyCountLabel = document.querySelector('#bar-dashboard .grid > div:nth-child(2) p.text-slate-400');
    if (dashReadyCountLabel) dashReadyCountLabel.innerText = t.availableCocktails;
    const dashAdviceTitle = document.querySelector('#bar-advice-box p:first-child');
    if (dashAdviceTitle) dashAdviceTitle.innerHTML = `<span>💡</span> ${t.smartAdviceTitle}`;
    const dashIngsLabel = document.querySelector('#bar-dashboard .flex.justify-between p.font-semibold');
    if (dashIngsLabel) dashIngsLabel.innerText = t.ingredientsInBar;
    const btnClearBar = document.getElementById('btn-dashboard-clear-bar');
    if (btnClearBar) {
        btnClearBar.innerHTML = `<span>🗑️</span> ${t.emptyBarBtn}`;
    }
    const trayClearBtn = document.querySelector('#selected-ingredients-tray [data-action="clear-all-ingredients"]');
    if (trayClearBtn) {
        trayClearBtn.innerHTML = `<span>🗑️</span> ${currentLang === 'en' ? 'Clear All' : 'Tümünü Temizle'}`;
    }
    const trayLabel = document.querySelector('#selected-ingredients-tray span.text-amber-400');
    if (trayLabel) {
        trayLabel.innerHTML = `<span>🍸</span> ${currentLang === 'en' ? 'Ingredients in Your Bar' : 'Barındaki Malzemeler'} (<span id="selected-badge-count">${selectedIngredients.length}</span>)`;
    }

    // Panels
    const customH2 = document.querySelector('#custom-recipe-panel h2');
    if (customH2) customH2.innerText = t.customTitle;
    const customNameInput = document.getElementById('custom-name');
    if (customNameInput) customNameInput.placeholder = currentLang === 'en' ? 'Cocktail Name (e.g., Strawberry Margarita)' : 'Kokteyl Adı (Örn: Çilekli Margarita)';
    const optAlc = document.querySelector('#custom-alcoholic option[value="Alcoholic"]');
    if (optAlc) optAlc.innerText = t.optAlcoholic;
    const optMock = document.querySelector('#custom-alcoholic option[value="Non_Alcoholic"]');
    if (optMock) optMock.innerText = t.optMocktail;
    const optMartini = document.querySelector('#custom-glass option[value="Cocktail glass"]');
    if (optMartini) optMartini.innerText = t.optMartini;
    const optHighball = document.querySelector('#custom-glass option[value="Highball glass"]');
    if (optHighball) optHighball.innerText = t.optHighball;
    const optRocks = document.querySelector('#custom-glass option[value="Old-fashioned glass"]');
    if (optRocks) optRocks.innerText = t.optRocks;
    const optShot = document.querySelector('#custom-glass option[value="Shot glass"]');
    if (optShot) optShot.innerText = t.optShot;
    const optFlute = document.querySelector('#custom-glass option[value="Champagne flute"]');
    if (optFlute) optFlute.innerText = t.optFlute;
    const optCopper = document.querySelector('#custom-glass option[value="Copper Mug"]');
    if (optCopper) optCopper.innerText = t.optCopper;
    const photoLabel = document.querySelector('#custom-recipe-panel label');
    if (photoLabel) photoLabel.innerText = t.photoLabel;
    const customIngsInput = document.getElementById('custom-ingredients');
    if (customIngsInput) customIngsInput.placeholder = currentLang === 'en' ? 'Ingredients (comma separated: 2 oz Vodka, 1 oz Lemon Juice, Ice)' : 'Malzemeler (Virgülle ayırın: 50 ml Votka, 25 ml Limon Suyu, Buz)';
    const customInstrInput = document.getElementById('custom-instructions');
    if (customInstrInput) customInstrInput.placeholder = currentLang === 'en' ? 'Preparation Steps (e.g., Add ice to shaker, shake vigorously for 15s...)' : 'Hazırlanış Adımları (Örn: Shaker\'a buz ekleyin, 15 saniye kuvvetlice çalkalayın...)';
    const customServingInput = document.getElementById('custom-serving');
    if (customServingInput) customServingInput.placeholder = currentLang === 'en' ? 'Serving & Garnish (e.g., Salt rim and lime wedge)...' : 'Servis & Garnitür Önerisi (Örn: Tuzlu kenar ve misket limonu dilimi ile servis edin)...';
    const saveRecipeBtn = document.querySelector('[data-ui="ui-32"]');
    if (saveRecipeBtn) saveRecipeBtn.innerText = t.saveRecipeBtn;

    const myRecipesH2 = document.querySelector('#my-recipes-panel h2');
    if (myRecipesH2) myRecipesH2.innerText = t.myRecipesTitle;
    const shopH2 = document.querySelector('#shopping-list-panel h2');
    if (shopH2) shopH2.innerText = t.shoppingTitle;
    const shopClearBtn = document.querySelector('#shopping-list-panel [data-ui="ui-33"]');
    if (shopClearBtn) shopClearBtn.innerText = t.clearAll;
    const syncH2 = document.querySelector('#sync-panel h2');
    if (syncH2) syncH2.innerText = t.syncTitle;
    const syncDesc = document.querySelector('#sync-panel p');
    if (syncDesc) syncDesc.innerText = t.syncDesc;
    const syncCopyBtn = document.querySelector('[data-ui="ui-34"]');
    if (syncCopyBtn) syncCopyBtn.innerText = t.copyBackup;
    const syncInput = document.getElementById('sync-data-input');
    if (syncInput) syncInput.placeholder = t.pasteBackupPlaceholder;
    const syncRestoreBtn = document.querySelector('[data-ui="ui-35"]');
    if (syncRestoreBtn) syncRestoreBtn.innerText = t.restoreBackup;
    const syncCheckNote = document.querySelector('#sync-panel .border-t p');
    if (syncCheckNote) syncCheckNote.innerText = t.syncOnlineDbNote;
    const btnForceSync = document.getElementById('btn-force-sync');
    if (btnForceSync) btnForceSync.innerHTML = `<span>🔄</span> ${t.updateDb}`;
    const btnCheckUpdate = document.querySelector('[data-ui="ui-37"]');
    if (btnCheckUpdate) btnCheckUpdate.innerHTML = `<span>🚀</span> ${t.checkUpdates} (v1.1.0)`;

    // Affiliate Card
    const affLabel = document.querySelector('#affiliate-banner span.tracking-wider');
    if (affLabel) affLabel.innerText = t.affiliateLabel;
    const affTitle = document.querySelector('#affiliate-banner span.font-bold');
    if (affTitle) affTitle.innerText = t.affiliateTitle;
    const affDesc = document.querySelector('#affiliate-banner p');
    if (affDesc) affDesc.innerText = t.affiliateDesc;
    const affBtn = document.querySelector('#affiliate-banner a span:first-child');
    if (affBtn) affBtn.innerText = t.affiliateBtn;

    // Header action buttons
    const btnOpenTimer = document.getElementById('btn-open-timer');
    if (btnOpenTimer) {
        btnOpenTimer.title = currentLang === 'en' ? 'Bartender Timer (Shaker / Stir)' : 'Barmen Sayacı (Shaker / Karıştırma)';
        const timerSpan = btnOpenTimer.querySelector('span.hidden') || btnOpenTimer.querySelectorAll('span')[1];
        if (timerSpan) timerSpan.innerText = currentLang === 'en' ? 'Timer' : 'Sayaç';
    }

    const btnWake = document.getElementById('btn-wake-lock');
    if (btnWake) {
        btnWake.title = currentLang === 'en' ? 'Keeps screen awake while mixing cocktails' : 'Kokteyl yaparken ekranın kapanmasını önler';
    }
    const wakeStatus = document.getElementById('wake-status');
    if (wakeStatus) {
        if (typeof wakeLock !== 'undefined' && wakeLock) {
            wakeStatus.innerText = currentLang === 'en' ? 'Screen On' : 'Ekran Açık';
        } else {
            wakeStatus.innerText = currentLang === 'en' ? 'Keep Awake' : 'Ekran Koru';
        }
    }

    const btnPwa = document.getElementById('btn-pwa-install');
    if (btnPwa) {
        const pwaSpan = btnPwa.querySelector('span.hidden') || btnPwa.querySelectorAll('span')[1];
        if (pwaSpan) pwaSpan.innerText = currentLang === 'en' ? 'Install' : 'Yükle';
        btnPwa.title = currentLang === 'en' ? 'Install App' : 'Uygulamayı Yükle';
    }

    const btnSupport = document.querySelector('[data-support-button]');
    if (btnSupport) {
        btnSupport.title = currentLang === 'en' ? 'Buy the developer a coffee' : 'Geliştiriciye Bir Kahve Ismarla';
        const supSpan = btnSupport.querySelector('span.hidden') || btnSupport.querySelectorAll('span')[1];
        if (supSpan) supSpan.innerText = currentLang === 'en' ? 'Support' : 'Destek Ol';
    }

    const btnReserve = document.getElementById('btn-open-reserve');
    if (btnReserve) {
        btnReserve.title = currentLang === 'en' ? 'Pocket Bar Reserve — Ad-Free & Exclusive Curation' : 'Bar Cepte Reserve — Reklamsız & Özel Seçkiler';
    }

    const btnAuth = document.getElementById('btn-auth-user');
    if (btnAuth) {
        btnAuth.title = currentLang === 'en' ? 'Bartender Club & Account' : 'Barmen Kulübü & Hesabım';
    }
    const authLabel = document.getElementById('auth-btn-label');
    if (authLabel && !window.currentUser) {
        authLabel.innerText = currentLang === 'en' ? 'Sign In' : 'Giriş Yap';
    }

    // Timer Modal
    const timerH3 = document.querySelector('#shaker-timer-modal h3');
    if (timerH3) timerH3.innerText = t.timerTitle;
    const preset15 = document.querySelector('[data-ui="ui-39"]');
    if (preset15) preset15.innerText = t.timerPreset15;
    const preset30 = document.querySelector('[data-ui="ui-40"]');
    if (preset30) preset30.innerText = t.timerPreset30;
    const preset45 = document.querySelector('[data-ui="ui-41"]');
    if (preset45) preset45.innerText = t.timerPreset45;
    const timerToggleBtn = document.getElementById('btn-timer-toggle');
    if (timerToggleBtn) {
        if (typeof timerRunning !== 'undefined' && timerRunning) {
            timerToggleBtn.innerText = t.timerPause;
        } else {
            timerToggleBtn.innerText = t.timerStart;
        }
    }
    const timerResetBtn = document.querySelector('[data-ui="ui-43"]');
    if (timerResetBtn) timerResetBtn.innerText = t.timerReset;
    const timerLabelEl = document.getElementById('timer-label');
    if (timerLabelEl) {
        timerLabelEl.innerText = getTimerPresetLabel(timerDefault || 15);
    }

    // Update Modal
    const updateH3 = document.querySelector('#update-modal h3');
    if (updateH3) updateH3.innerText = t.updateTitle;
    const updateVerText = document.getElementById('update-version-text');
    if (updateVerText && !updateVerText.dataset.custom) updateVerText.innerText = t.updateVersionText;
    const updateWhatsNew = document.querySelector('#update-notes-container p.font-semibold');
    if (updateWhatsNew) updateWhatsNew.innerText = t.updateWhatsNew;
    const updateNotesText = document.getElementById('update-notes-text');
    if (updateNotesText && !updateNotesText.dataset.custom) updateNotesText.innerText = t.updateNotes;
    const updateBtnLabel = document.getElementById('update-btn-label');
    if (updateBtnLabel && !updateBtnLabel.dataset.custom) updateBtnLabel.innerText = t.updateBtn;
    const pwaLaterBtn = document.querySelector('[data-ui="ui-45"]');
    if (pwaLaterBtn) pwaLaterBtn.innerText = t.updateLaterBtn;

    // Mix Mode Modal
    const mixEyebrow = document.querySelector('#mix-mode-modal span.uppercase');
    if (mixEyebrow) mixEyebrow.innerText = t.mixEyebrow;
    const mixRunBtn = document.getElementById('btn-mix-timer-run');
    if (mixRunBtn && (!mixTimerInterval)) {
        mixRunBtn.innerText = t.timerStart;
    }
    const mixPrevBtn = document.getElementById('btn-mix-prev');
    if (mixPrevBtn) mixPrevBtn.innerText = t.mixPrev;
    const mixNextBtn = document.getElementById('btn-mix-next');
    if (mixNextBtn && (!currentMixDrink)) {
        mixNextBtn.innerText = t.mixNext;
    }

    // Support Modal / Dialog
    const supportCloseBtn = document.getElementById('support-close');
    if (supportCloseBtn) supportCloseBtn.innerText = t.supportClose;
    const supportH2 = document.getElementById('support-title');
    if (supportH2) supportH2.innerText = t.supportTitle;
    const supportP = document.querySelector('#support-dialog p');
    if (supportP) supportP.innerText = t.supportDesc;

    // Reserve Modal
    const reserveClubBadge = document.querySelector('#reserve-modal .inline-flex');
    if (reserveClubBadge) reserveClubBadge.innerHTML = `<span>👑</span> ${t.reserveExclusiveClub}`;
    const planMonthly = document.querySelector('[data-plan="monthly"]');
    if (planMonthly) planMonthly.innerText = currentLang === 'en' ? 'Monthly' : 'Aylık';
    const planAnnual = document.querySelector('[data-plan="annual"]');
    if (planAnnual) planAnnual.innerText = currentLang === 'en' ? '⭐ Annual' : '⭐ Yıllık';
    const planLifetime = document.querySelector('[data-plan="lifetime"]');
    if (planLifetime) planLifetime.innerText = currentLang === 'en' ? 'Lifetime' : 'Ömür Boyu';
    const reserveBullets = document.querySelectorAll('#reserve-status-inactive .bg-black\\/40 > div span:last-child');
    if (reserveBullets.length >= 4) {
        reserveBullets[0].innerHTML = t.reserveBullet1;
        reserveBullets[1].innerHTML = t.reserveBullet2;
        reserveBullets[2].innerHTML = t.reserveBullet3;
        reserveBullets[3].innerHTML = t.reserveBullet4;
    }
    const reservePrompt = document.querySelector('#reserve-status-inactive .border-t p');
    if (reservePrompt) reservePrompt.innerText = t.reserveHaveKey;
    const activateReserveBtn = document.getElementById('btn-activate-reserve');
    if (activateReserveBtn) activateReserveBtn.innerText = t.reserveActivateBtn;
    const deactivateReserveBtn = document.getElementById('btn-deactivate-reserve');
    if (deactivateReserveBtn) deactivateReserveBtn.innerText = t.reserveDeactivateBtn;
    const reserveHeading = document.querySelector('#reserve-modal h3');
    if (reserveHeading) {
        reserveHeading.innerHTML = currentLang === 'en'
            ? 'POCKET BAR <span class="bg-gradient-to-r from-amber-400 to-amber-600 bg-clip-text text-transparent">RESERVE</span>'
            : 'BAR CEPTE <span class="bg-gradient-to-r from-amber-400 to-amber-600 bg-clip-text text-transparent">RESERVE</span>';
    }
    const reserveDesc = document.querySelector('#reserve-modal .space-y-1 p');
    if (reserveDesc) {
        reserveDesc.innerText = currentLang === 'en'
            ? 'Unleash your bar. Ad-free, unlimited, and master mixologist level.'
            : 'Barının sınırlarını kaldır. Reklamsız, sınırsız ve usta miksoloji seviyesinde.';
    }
    const reserveActiveH4 = document.querySelector('#reserve-status-active h4');
    if (reserveActiveH4) reserveActiveH4.innerText = t.reserveActiveHeading;
    const reserveActiveDesc = document.querySelector('#reserve-status-active p.text-xs');
    if (reserveActiveDesc) reserveActiveDesc.innerText = t.reserveActiveDesc;
    const reserveActiveNote = document.querySelector('#reserve-status-active .bg-white\\/5');
    if (reserveActiveNote) reserveActiveNote.innerText = t.reserveActiveNote;

    // Auth Modal
    const authH3 = document.querySelector('#auth-modal h3');
    if (authH3) authH3.innerText = t.authH3;
    const authDesc = document.querySelector('#auth-view-logged-out p');
    if (authDesc) authDesc.innerText = t.authDesc;
    const authBullets = document.querySelectorAll('#auth-view-logged-out .bg-black\\/40 > div div');
    if (authBullets.length >= 3) {
        authBullets[0].innerHTML = t.authBullet1;
        authBullets[1].innerHTML = t.authBullet2;
        authBullets[2].innerHTML = t.authBullet3;
    }
    const demoLoginBtn = document.getElementById('btn-demo-login');
    if (demoLoginBtn) demoLoginBtn.innerText = t.authGuestBtn;
    const authSyncCardTitle = document.querySelector('#auth-view-logged-in .bg-white\\/5 .font-bold span:first-child');
    if (authSyncCardTitle) authSyncCardTitle.innerHTML = `<span>☁️</span> ${t.authSyncTitle}`;
    const authSyncCardActive = document.querySelector('#auth-view-logged-in .bg-white\\/5 .font-bold span:last-child');
    if (authSyncCardActive) authSyncCardActive.innerHTML = t.authSyncActive;
    const authSyncCardDesc = document.querySelector('#auth-view-logged-in .bg-white\\/5 > p');
    if (authSyncCardDesc) authSyncCardDesc.innerText = t.authSyncDesc;
    const authLastSyncSpan = document.querySelector('#auth-view-logged-in .border-t.border-white\\/5 > span');
    if (authLastSyncSpan) {
        const curTime = document.getElementById('auth-sync-time')?.innerText || '-';
        authLastSyncSpan.innerHTML = `${t.authLastSyncLabel} <span id="auth-sync-time" class="text-white font-medium">${curTime}</span>`;
    }
    const authSyncNowBtn = document.getElementById('btn-auth-sync-now');
    if (authSyncNowBtn) authSyncNowBtn.innerText = t.authSyncNowBtn;
    const authBindTitle = document.querySelector('#auth-license-bind-section .font-bold');
    if (authBindTitle) authBindTitle.innerHTML = `<span>👑</span> ${t.authLinkTitle}`;
    const authBindDesc = document.querySelector('#auth-license-bind-section > p');
    if (authBindDesc) authBindDesc.innerText = t.authLinkDesc;
    const bindLicenseBtn = document.getElementById('btn-bind-account-license');
    if (bindLicenseBtn) bindLicenseBtn.innerText = t.authLinkBtn;
    const logoutBtn = document.getElementById('btn-auth-logout');
    if (logoutBtn) logoutBtn.innerText = t.authLogoutBtn;

    // Footer
    const footerTitle = document.querySelector('.app-footer p.font-medium');
    if (footerTitle) footerTitle.innerText = t.footerTitle;
    const footerEq = document.querySelector('.app-footer a[href*="amazon"]');
    if (footerEq) footerEq.innerText = t.footerBarware;
    const footerPriv = document.querySelector('.app-footer a[href="privacy.html"]');
    if (footerPriv) footerPriv.innerText = t.footerPrivacy;
    const footer18Title = document.querySelector('.app-footer .mt-4 span:last-child');
    if (footer18Title) footer18Title.innerText = t.footer18Title;
    const footer18Text = document.querySelector('.app-footer .mt-4 p');
    if (footer18Text) footer18Text.innerHTML = t.footer18Text;

    // Sub-module refreshes
    if (typeof window !== 'undefined' && typeof window.refreshReserveUI === 'function') {
        window.refreshReserveUI();
    }
    if (typeof window !== 'undefined' && window.BarAuth && typeof window.BarAuth.updateAuthUI === 'function') {
        window.BarAuth.updateAuthUI();
    }
}

function setLanguage(lang) {
    currentLang = lang === 'en' ? 'en' : 'tr';
    if (typeof window !== 'undefined') {
        window.currentLang = currentLang;
    }
    try { 
        localStorage.setItem('bar_cepte_lang', currentLang);
        localStorage.setItem('bar_language', currentLang);
    } catch(e) {}

    // Auto-switch default units if not explicitly locked:
    // When going English -> default oz; when going Turkish -> default cl
    if (currentLang === 'en') {
        currentUnit = 'oz';
    } else {
        currentUnit = 'cl';
    }
    if (typeof window !== 'undefined') {
        window.currentUnit = currentUnit;
    }
    try { 
        localStorage.setItem('bar_cepte_unit', currentUnit);
        localStorage.setItem('bar_unit', currentUnit);
    } catch(e) {}

    applyLanguage();
    allCocktails.forEach(enrichDrink);
    customRecipes.forEach(enrichDrink);
    renderIngredients();
    filterCocktails();
    updateFavoritesFilterUI();

    if (currentTab === 'bar') renderDashboard();
    if (currentTab === 'my-recipes') renderMyRecipes();
    if (currentTab === 'shop') renderShoppingList();

    const toastMsg = currentLang === 'en' 
        ? 'Switched to Pocket Bar (English & oz units)' 
        : 'Bar Cepte (Türkçe & cl birimi) aktif edildi';
    showToast(toastMsg, 'success');
}

let lastLangToggleTime = 0;
function toggleLanguage() {
    const now = Date.now();
    if (now - lastLangToggleTime < 150) return;
    lastLangToggleTime = now;
    triggerHaptic('medium');
    setLanguage(currentLang === 'tr' ? 'en' : 'tr');
}

let lastUnitToggleTime = 0;
function toggleUnit() {
    const now = Date.now();
    if (now - lastUnitToggleTime < 150) return;
    lastUnitToggleTime = now;
    triggerHaptic('light');
    currentUnit = currentUnit === 'cl' ? 'oz' : 'cl';
    try { 
        localStorage.setItem('bar_cepte_unit', currentUnit);
        localStorage.setItem('bar_unit', currentUnit);
    } catch(e) {}
    
    applyLanguage();
    filterCocktails();
    if (currentTab === 'bar') renderDashboard();
    if (currentTab === 'my-recipes') renderMyRecipes();
    showToast(currentLang === 'en' ? `Unit set to ${currentUnit}` : `Ölçü birimi: ${currentUnit}`, 'info');
}

function initHeroVideo() {
    const video = document.getElementById('hero-cocktail-video');
    const toggleBtn = document.getElementById('btn-hero-video-toggle');
    const toggleText = document.getElementById('hero-video-toggle-text');
    const pulseDot = document.getElementById('hero-video-toggle-dot');
    if (!video || !toggleBtn) return;

    video.addEventListener('canplay', () => {
        video.classList.add('video-active');
        video.play().catch(() => {});
        toggleBtn.classList.remove('hidden');
    });

    video.addEventListener('error', () => {
        video.classList.remove('video-active');
        toggleBtn.classList.add('hidden');
    });

    toggleBtn.addEventListener('click', (e) => {
        e.preventDefault();
        triggerHaptic('light');
        if (video.paused || !video.classList.contains('video-active')) {
            video.classList.add('video-active');
            video.play().then(() => {
                if (pulseDot) pulseDot.style.background = '#10b981';
                if (toggleText) toggleText.innerText = currentLang === 'en' ? '🎬 Live' : '🎬 Canlı';
            }).catch(() => {});
        } else {
            video.pause();
            video.classList.remove('video-active');
            if (pulseDot) pulseDot.style.background = '#64748b';
            if (toggleText) toggleText.innerText = currentLang === 'en' ? '🖼️ Photo' : '🖼️ Foto';
        }
    });
}

document.addEventListener("DOMContentLoaded", async () => {
    applyLanguage();
    initHeroVideo();

    const langToggleBtn = document.getElementById('btn-lang-toggle');
    if (langToggleBtn && !langToggleBtn.dataset.directBound) {
        langToggleBtn.dataset.directBound = 'true';
        langToggleBtn.addEventListener('click', (e) => {
            e.preventDefault();
            toggleLanguage();
        });
    }
    const unitToggleBtn = document.getElementById('btn-unit-toggle');
    if (unitToggleBtn && !unitToggleBtn.dataset.directBound) {
        unitToggleBtn.dataset.directBound = 'true';
        unitToggleBtn.addEventListener('click', (e) => {
            e.preventDefault();
            toggleUnit();
        });
    }

    await initDB();
    fetchDataWithIndexedDB();
    updateFavoritesFilterUI();

    // Otomatik Sürüm Güncelleme Kontrolü (Açılıştan 2 sn sonra arka planda sessizce başlar)
    setTimeout(() => {
        checkForAppUpdates();
    }, 2000);
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
                            customRecipes = customReq.result.flatMap(item => {
                                try { return [BarSecurity.recipe(item)]; } catch { return []; }
                            }).slice(0, 300);
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
    if (statusEl) statusEl.innerText = currentLang === 'en' ? "Syncing online database..." : "Online veritabanı eşitleniyor...";
    await updateDataInBackground(true);
    alert(currentLang === 'en' ? "Cocktail database successfully synced from the cloud!" : "Kokteyl veritabanı internet üzerinden başarıyla eşitlendi!");
}

// ==========================================
// OTOMATİK SÜRÜM GÜNCELLEME SİSTEMİ (Android APK, Windows .exe, Web)
// ==========================================
const CURRENT_APP_VERSION = "1.1.0";

function isNewerVersion(current, latest) {
    const cleanCurr = String(current).replace(/^v/i, '').split('.').map(n => parseInt(n, 10) || 0);
    const cleanLat = String(latest).replace(/^v/i, '').split('.').map(n => parseInt(n, 10) || 0);
    for (let i = 0; i < Math.max(cleanCurr.length, cleanLat.length); i++) {
        const c = cleanCurr[i] || 0;
        const l = cleanLat[i] || 0;
        if (l > c) return true;
        if (l < c) return false;
    }
    return false;
}

async function checkForAppUpdates(manual = false) {
    try {
        const now = Date.now();
        const lastCheck = parseInt(localStorage.getItem('bar_cepte_last_update_check') || '0', 10);
        // Otomatik denetim günde 1 kez çalışır; manuel buton her zaman çalışır
        if (!manual && (now - lastCheck < 24 * 60 * 60 * 1000)) {
            return;
        }

        const resp = await fetch('https://api.github.com/repos/suluncaway/bar-cepte/releases/latest');
        if (!resp.ok) {
            if (manual) alert(currentLang === 'en' ? "Could not reach update server." : "Güncelleme sunucusuna erişilemedi.");
            return;
        }

        localStorage.setItem('bar_cepte_last_update_check', String(now));
        const release = await resp.json();
        const latestTag = release.tag_name || '';

        if (latestTag && isNewerVersion(CURRENT_APP_VERSION, latestTag)) {
            showUpdateModal(release);
        } else if (manual) {
            alert(currentLang === 'en' ? `Awesome! Pocket Bar is up to date (v${CURRENT_APP_VERSION}).` : `Harika! Bar Cepte uygulamanız en güncel sürümde (v${CURRENT_APP_VERSION}).`);
        }
    } catch (e) {
        if (manual) alert(currentLang === 'en' ? "Connection error during update check." : "Güncelleme denetimi sırasında bağlantı hatası oluştu.");
    }
}

function showUpdateModal(release) {
    const modal = document.getElementById('update-modal');
    if (!modal) return;

    const verEl = document.getElementById('update-version-text');
    const notesEl = document.getElementById('update-notes-text');
    const btn = document.getElementById('btn-update-download');
    const btnLabel = document.getElementById('update-btn-label');

    if (verEl) verEl.innerText = currentLang === 'en' ? `${release.tag_name} Ready! (Current: v${CURRENT_APP_VERSION})` : `${release.tag_name} Hazır! (Mevcut: v${CURRENT_APP_VERSION})`;
    if (notesEl) {
        notesEl.innerText = release.body 
            ? release.body.replace(/###|\*\*|_/g, '').slice(0, 300) 
            : (currentLang === 'en' ? "New cocktails, performance improvements and bug fixes." : "Yeni kokteyller, performans artışı ve hata düzeltmeleri.");
    }

    const ua = navigator.userAgent.toLowerCase();
    const isElectron = ua.includes('electron');
    const isAndroid = ua.includes('android') || (window.AndroidBridge !== undefined);

    let targetUrl = release.html_url || 'https://github.com/suluncaway/bar-cepte/releases/latest';

    if (isElectron) {
        if (btnLabel) btnLabel.innerText = currentLang === 'en' ? "Download Windows Update (.exe)" : "Windows Güncellemesini İndir (.exe)";
        const exeAsset = release.assets && release.assets.find(a => a.name.endsWith('.exe'));
        if (exeAsset) targetUrl = exeAsset.browser_download_url;
        else targetUrl = 'https://github.com/suluncaway/bar-cepte/releases/latest/download/BarCepte-Setup.exe';
    } else if (isAndroid) {
        if (btnLabel) btnLabel.innerText = currentLang === 'en' ? "Download & Install New APK" : "Yeni APK'yı İndir & Güncelle";
        const apkAsset = release.assets && release.assets.find(a => a.name.endsWith('.apk'));
        if (apkAsset) targetUrl = apkAsset.browser_download_url;
        else targetUrl = 'https://github.com/suluncaway/bar-cepte/releases/latest/download/BarCepte-Debug.apk';
    } else {
        if (btnLabel) btnLabel.innerText = currentLang === 'en' ? "See What's New & Reload" : "Yenilikleri Gör & Sayfayı Yenile";
        targetUrl = window.location.href;
    }

    if (btn) {
        btn.href = (isElectron || isAndroid) ? BarSecurity.releaseURL(targetUrl) : window.location.href;
        btn.onclick = (isElectron || isAndroid) ? null : event => {
            event.preventDefault();
            window.location.reload();
        };
    }

    modal.classList.remove('hidden');
    modal.classList.add('flex');
}

function closeUpdateModal() {
    const modal = document.getElementById('update-modal');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
}
