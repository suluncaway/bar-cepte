// Applies the saved light/dark choice before first paint (dark is the default).
try { if (localStorage.getItem('barcepte_theme') === 'light') document.documentElement.dataset.theme = 'light'; } catch {}
