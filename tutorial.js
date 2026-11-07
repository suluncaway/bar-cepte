// Short how-to tour shown on open for visitors who are not signed in.
(() => {
    const HIDE_KEY = 'barcepte_tutorial_hidden';
    const STEPS = {
        tr: [
            ['Bar Cepte\'ye hoş geldin', 'Evdeki malzemelerle yapabileceğin kokteylleri bulur. Dört adımda nasıl kullanılacağını gösterelim.'],
            ['1. Malzemelerim', 'Elindeki şişeleri ve mutfak malzemelerini (limon, nane, buz…) seç. Ne kadar çok seçersen öneriler o kadar isabetli olur.'],
            ['2. Tarifler', 'Hemen yapabileceklerin ve 1–4 malzeme eksikle yapabileceklerin listelenir. Karta dokununca tarif, ölçüler ve porsiyon açılır; tat ve ortam filtreleriyle daraltabilirsin.'],
            ['3. Favoriler ve daha fazlası', 'Beğendiğin tarifi kalple kaydet. "Daha fazla" menüsünde Barım, Alışveriş listesi, kendi tariflerin ve AI Barmen var.'],
            ['4. Giriş yap', 'Google ile giriş yaparsan barın ve favorilerin yedeklenir, başka cihazda da kaldığın yerden devam edersin.']
        ],
        en: [
            ['Welcome to Pocket Bar', 'It finds cocktails you can make with what you have at home. Here is how it works in four steps.'],
            ['1. My Ingredients', 'Pick the bottles and kitchen items you have (lemon, mint, ice…). The more you pick, the better the suggestions.'],
            ['2. Recipes', 'See what you can make right now and what is 1–4 ingredients away. Tap a card for the recipe, measures and servings; narrow it down with taste and vibe filters.'],
            ['3. Favorites and more', 'Save a recipe with the heart. "More" holds My Bar, the shopping list, your own recipes and the AI Bartender.'],
            ['4. Sign in', 'Sign in with Google to back up your bar and favorites and continue on another device.']
        ]
    };
    const UI = {
        tr: { skip: 'Atla', back: 'Geri', next: 'İleri', done: 'Başla', login: 'Giriş yap', hide: 'Bir daha gösterme' },
        en: { skip: 'Skip', back: 'Back', next: 'Next', done: 'Start', login: 'Sign in', hide: "Don't show again" }
    };
    const lang = () => (typeof currentLang !== 'undefined' && currentLang === 'en') ? 'en' : 'tr';
    const hidden = () => { try { return localStorage.getItem(HIDE_KEY) === '1'; } catch { return false; } };
    let step = 0;

    function render(dialog) {
        const steps = STEPS[lang()], ui = UI[lang()], last = step === steps.length - 1;
        dialog.querySelector('#tutorial-title').textContent = steps[step][0];
        dialog.querySelector('#tutorial-text').textContent = steps[step][1];
        dialog.querySelector('#tutorial-dots').innerHTML = steps.map((_, i) => `<i${i === step ? ' class="on"' : ''}></i>`).join('');
        dialog.querySelector('[data-tour="skip"]').textContent = ui.skip;
        dialog.querySelector('[data-tour="back"]').textContent = ui.back;
        dialog.querySelector('[data-tour="back"]').hidden = step === 0;
        dialog.querySelector('[data-tour="next"]').textContent = last ? ui.done : ui.next;
        dialog.querySelector('[data-tour="login"]').textContent = ui.login;
        dialog.querySelector('[data-tour="login"]').hidden = !last;
        dialog.querySelector('#tutorial-hide-label').textContent = ui.hide;
    }

    function close(dialog) {
        try { if (dialog.querySelector('#tutorial-hide').checked) localStorage.setItem(HIDE_KEY, '1'); } catch {}
        dialog.close();
    }

    function open() {
        if (hidden() || window.BarAuth?.isLoggedIn?.()) return;
        const dialog = document.getElementById('tutorial-dialog');
        if (!dialog || dialog.open) return;
        step = 0; render(dialog); dialog.showModal();
    }

    document.addEventListener('DOMContentLoaded', () => {
        const dialog = document.getElementById('tutorial-dialog');
        if (!dialog) return;
        dialog.addEventListener('click', event => {
            const action = event.target.closest('[data-tour]')?.dataset.tour;
            if (!action) return;
            if (action === 'skip') close(dialog);
            else if (action === 'back') { step = Math.max(0, step - 1); render(dialog); }
            else if (action === 'next') { if (step === STEPS.tr.length - 1) close(dialog); else { step++; render(dialog); } }
            else if (action === 'login') { close(dialog); document.getElementById('btn-auth-user')?.click(); }
        });
        // The first-visit preference wizard opens on the same load; show the tour after it closes.
        setTimeout(() => {
            const wizard = document.getElementById('personal-dialog');
            if (wizard?.open) wizard.addEventListener('close', open, { once: true });
            else open();
        }, 0);
    });
})();
