// Set only to a verified public support page owned by the project maintainer.
// Never put account credentials, payment secrets or private banking data here.
const SUPPORT_URL = 'https://buymeacoffee.com/suluncau';
// Keep the user's original widget snippet unchanged; isolate its new tab.
document.querySelectorAll('a.bmc-btn[target="_blank"]').forEach(link => {
    link.rel = 'noopener noreferrer';
});
document.querySelectorAll('[data-support-button]').forEach(button => {
    // Static links work without JavaScript; do not open a second tab for them.
    if (button.tagName === 'A') return;
    button.addEventListener('click', () => {
        if (!SUPPORT_URL) {
            document.getElementById('support-dialog').showModal();
            return;
        }
        const url = new URL(SUPPORT_URL);
        if (url.protocol === 'https:' && !url.username && !url.password) {
            window.open(url.href, '_blank', 'noopener,noreferrer');
        }
    });
});
document.getElementById('support-close').addEventListener('click', () => {
    document.getElementById('support-dialog').close();
});
