// Event handlers receive strings as data, never interpolated JavaScript.
document.addEventListener('click', event => {
    const button = event.target.closest('[data-action]');
    if (button) {
        event.stopPropagation();
        const value = decodeURIComponent(button.dataset.value || '');
        switch (button.dataset.action) {
            case 'shopping': toggleShoppingList(value, event); break;
            case 'ingredient': quickAddIngredientToBar(value, event); break;
            case 'favorite': toggleFavorite(value, event); break;
            case 'share': shareCustomRecipe(value, event); break;
            case 'delete': deleteCustomRecipe(value, event); break;
            case 'timer': openTimerForDrink(value, event); break;
            case 'portion': changePortion(button.dataset.card, Number(value), button); break;
            case 'purchased':
                quickAddIngredientToBar(value, event);
                toggleShoppingList(value, event);
                break;
        }
    } else if (event.target.closest('[data-stop-card]')) {
        event.stopPropagation();
    }
}, true);
document.addEventListener('error', event => {
    const image = event.target;
    if (image.tagName !== 'IMG' || !image.hasAttribute('data-image-fallback')) return;
    const fallback = document.createElement('span');
    fallback.textContent = '🍹';
    fallback.className = image.className;
    image.replaceWith(fallback);
}, true);
