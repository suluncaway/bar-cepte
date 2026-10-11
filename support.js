// Set only to a verified public support page owned by the project maintainer.
// Never put account credentials, payment secrets or private banking data here.
const SUPPORT_URL = 'https://buymeacoffee.com/suluncau';
document.querySelectorAll('[data-support-button]').forEach(button => {
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
