// Static UI handlers. Generated from trusted source markup, never from user input.
document.querySelector('[data-ui="ui-0"]').addEventListener('click', function(event) { openTimerModal(15, 'Buzla kuvvetlice çalkala (Shaker)'); });
document.querySelector('[data-ui="ui-1"]').addEventListener('click', function(event) { toggleWakeLock(); });
document.querySelector('[data-ui="ui-2"]').addEventListener('click', function(event) { installPWA(); });
document.querySelector('[data-ui="ui-3"]').addEventListener('click', function(event) { setAlcoholFilter('all'); });
document.querySelector('[data-ui="ui-4"]').addEventListener('click', function(event) { setAlcoholFilter('Alcoholic'); });
document.querySelector('[data-ui="ui-5"]').addEventListener('click', function(event) { setAlcoholFilter('Non_Alcoholic'); });
document.querySelector('[data-ui="ui-6"]').addEventListener('click', function(event) { toggleOnlyFavoritesFilter(); });
document.querySelector('[data-ui="ui-7"]').addEventListener('click', function(event) { setTasteFilter('all', this); });
document.querySelector('[data-ui="ui-8"]').addEventListener('click', function(event) { setTasteFilter('Sert', this); });
document.querySelector('[data-ui="ui-9"]').addEventListener('click', function(event) { setTasteFilter('Tatlı', this); });
document.querySelector('[data-ui="ui-10"]').addEventListener('click', function(event) { setTasteFilter('Ekşi', this); });
document.querySelector('[data-ui="ui-11"]').addEventListener('click', function(event) { setTasteFilter('Ferah', this); });
document.querySelector('[data-ui="ui-12"]').addEventListener('input', function(event) { debouncedRenderIngredients(); });
document.querySelector('[data-ui="ui-13"]').addEventListener('click', function(event) { clearSelection(); });
document.querySelector('[data-ui="ui-14"]').addEventListener('input', function(event) { debouncedFilterCocktails(); });
document.querySelector('[data-ui="ui-15"]').addEventListener('click', function(event) { pickRandomCocktail(); });
document.querySelector('[data-ui="ui-16"]').addEventListener('click', function(event) { switchTab('bar'); });
document.querySelector('[data-ui="ui-17"]').addEventListener('click', function(event) { switchTab('alkol'); });
document.querySelector('[data-ui="ui-18"]').addEventListener('click', function(event) { switchTab('mutfak'); });
document.querySelector('[data-ui="ui-19"]').addEventListener('click', function(event) { switchTab('favorites'); });
document.querySelector('[data-ui="ui-20"]').addEventListener('click', function(event) { switchTab('custom'); });
document.querySelector('[data-ui="ui-21"]').addEventListener('click', function(event) { switchTab('my-recipes'); });
document.querySelector('[data-ui="ui-22"]').addEventListener('click', function(event) { switchTab('shop'); });
document.querySelector('[data-ui="ui-23"]').addEventListener('click', function(event) { switchTab('sync'); });
document.querySelector('[data-ui="ui-24"]').addEventListener('click', function(event) { setKitchenSubCategory('all', this); });
document.querySelector('[data-ui="ui-25"]').addEventListener('click', function(event) { setKitchenSubCategory('meyve', this); });
document.querySelector('[data-ui="ui-26"]').addEventListener('click', function(event) { setKitchenSubCategory('gazli', this); });
document.querySelector('[data-ui="ui-27"]').addEventListener('click', function(event) { setKitchenSubCategory('tatli', this); });
document.querySelector('[data-ui="ui-28"]').addEventListener('click', function(event) { setKitchenSubCategory('baharat', this); });
document.querySelector('[data-ui="ui-29"]').addEventListener('click', function(event) { setKitchenSubCategory('sut-kahve', this); });
document.querySelector('[data-ui="ui-30"]').addEventListener('click', function(event) { scrollIngredients(-160); });
document.querySelector('[data-ui="ui-31"]').addEventListener('click', function(event) { scrollIngredients(160); });
document.querySelector('[data-ui="ui-32"]').addEventListener('click', function(event) { saveCustomRecipe(); });
document.querySelector('[data-ui="ui-33"]').addEventListener('click', function(event) { clearShoppingList(); });
document.querySelector('[data-ui="ui-34"]').addEventListener('click', function(event) { exportUserData(); });
document.querySelector('[data-ui="ui-35"]').addEventListener('click', function(event) { importUserData(); });
document.querySelector('[data-ui="ui-36"]').addEventListener('click', function(event) { forceSyncOnlineDatabase(); });
document.querySelector('[data-ui="ui-37"]').addEventListener('click', function(event) { checkForAppUpdates(true); });
document.querySelector('[data-ui="ui-38"]').addEventListener('click', function(event) { closeTimerModal(); });
document.querySelector('[data-ui="ui-39"]').addEventListener('click', function(event) { setTimerDuration(15, 'Buzla kuvvetlice çalkala (Shaker)'); });
document.querySelector('[data-ui="ui-40"]').addEventListener('click', function(event) { setTimerDuration(30, 'Buzla nazikçe karıştır (Stir)'); });
document.querySelector('[data-ui="ui-41"]').addEventListener('click', function(event) { setTimerDuration(45, 'İyice soğut ve harmanla'); });
document.querySelector('[data-ui="ui-42"]').addEventListener('click', function(event) { toggleTimer(); });
document.querySelector('[data-ui="ui-43"]').addEventListener('click', function(event) { resetTimer(); });
document.querySelector('[data-ui="ui-44"]').addEventListener('click', function(event) { closeUpdateModal(); });
document.querySelector('[data-ui="ui-45"]').addEventListener('click', function(event) { closeUpdateModal(); });
let serviceWorkerAPI = null;
try { serviceWorkerAPI = navigator.serviceWorker; } catch { /* Restricted preview: offline mode unavailable. */ }
if (serviceWorkerAPI) {
            window.addEventListener('load', () => {
                serviceWorkerAPI.register('./sw.js').then(reg => {
                    // PWA arka plan güncellemesi yakalandığında
                    reg.addEventListener('updatefound', () => {
                        const newWorker = reg.installing;
                        if (newWorker) {
                            newWorker.addEventListener('statechange', () => {
                                if (newWorker.state === 'installed' && serviceWorkerAPI.controller) {
                                    // PWA yeni sürüm yüklendi, kullanıcıya bildirim ver
                                    console.log('Yeni PWA sürümü hazır.');
                                }
                            });
                        }
                    });
                }).catch(err => console.log('SW Registration failed: ', err));
            });
        }
    
