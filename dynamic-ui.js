// Event handlers receive strings as data, never interpolated JavaScript.
document.addEventListener('click', event => {
    const button = event.target.closest('[data-action]');
    if (button) {
        event.stopPropagation();
        const value = decodeURIComponent(button.dataset.value || '');
        switch (button.dataset.action) {
            case 'shopping': toggleShoppingList(value, event); break;
            case 'alcohol-subcat': setAlcoholSubCategory(value, button); break;
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
            case 'substitute':
                applySubstituteToBar(button.dataset.ing, button.dataset.sub, event);
                break;
            case 'open-mix-mode':
                if (button.closest('#personal-dialog')) window.BarPersonalUI?.close();
                openMixMode(value);
                break;
            case 'close-mix-mode':
                closeMixMode();
                break;
            case 'mix-next-step':
                nextMixStep();
                break;
            case 'mix-prev-step':
                prevMixStep();
                break;
            case 'mix-timer-toggle':
                toggleMixTimer();
                break;
            case 'vibe':
                setVibeFilter(button.dataset.vibe, button);
                break;
            case 'export-story':
                downloadCocktailStoryCard(value);
                break;
            case 'clear-all-ingredients':
                clearSelection();
                break;
            case 'remove-ingredient':
                removeIngredientFromBar(value, event);
                break;
            case 'toggle-language':
                toggleLanguage();
                break;
            case 'toggle-unit':
                toggleUnit();
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
