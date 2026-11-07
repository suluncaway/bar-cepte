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
                window.BarPersonalUI?.editStock(resolveIngredientName(value));
                break;
            case 'substitute':
                applySubstituteToBar(button.dataset.ing, button.dataset.sub, event);
                break;
            case 'open-mix-mode': {
                const servings = button.closest('[data-servings]')?.dataset.servings || 1;
                if (button.closest('#personal-dialog')) window.BarPersonalUI?.close();
                openMixMode(value, servings);
                break;
            }
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
            case 'share-link':
                shareRecipeLink(value);
                break;
            case 'reset-filters':
                resetCocktailFilters();
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
    fallback.innerHTML = '<svg class="ui-icon ui-icon-lg" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4h14l-7 8-7-8ZM12 12v7M8 20h8"/></svg>';
    fallback.className = image.className + ' image-fallback';
    image.replaceWith(fallback);
}, true);
