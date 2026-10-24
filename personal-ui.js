/* Personal bar UI. Existing recipe matching, filters and storage remain authoritative. */
(function () {
    'use strict';
    const PKEY = 'personalPreferences', HKEY = 'preparationHistory', IKEY = 'barInventory';
    let returningUser = false;
    try {returningUser = ['selectedIngredients','favoriteCocktails','customRecipes','shoppingList','bar_cepte_lang','barcepte_auth_user'].some(key=>localStorage.getItem(key)!==null);} catch {}
    let dialog, host, mode = '', step = 0, draft, draftSelected = [], feedbackId = '';
    let returnFocus = null, manualEvent = null, nextInlineId = 0;
    const en = () => currentLang === 'en';
    const t = (tr, eng) => en() ? eng : tr;
    const e = value => escapeHTML(String(value ?? ''));
    function preferences() {
        const value = BarSecurity.readStored(PKEY, BarSecurity.preferences);
        return Array.isArray(value) ? BarPersonal.defaults() : value;
    }
    const history = () => BarSecurity.readStored(HKEY, BarSecurity.history);
    function inventory() {
        const value=BarSecurity.readStored(IKEY,BarSecurity.inventory);
        return Array.isArray(value)?BarInventory.empty():value;
    }
    const stockRows=(drink,count=1,selected=selectedIngredients)=>BarInventory.assess(drink,selected,inventory(),checkIngredientMatch,count);
    const unitName=unit=>unit==='piece'?t('adet','pieces'):unit;
    const quantityText=row=>`${row.quantity.toLocaleString(en()?'en-GB':'tr-TR',{maximumFractionDigits:3})} ${unitName(row.unit)}`;
    function stockSection() {
        const stock=inventory();
        return `<details class="personal-panel personal-stock"><summary>${t('Miktarlı stok takibi','Stock quantities')}</summary>
            <p>${t('Miktar girmek isteğe bağlıdır. Girilmeyen miktarlar yeterlilik hesabına katılmaz. ml/cl/oz çevrilir; gram ve adet ayrı tutulur.','Quantities are optional. Unspecified amounts cannot be checked. ml/cl/oz are converted; grams and pieces stay separate.')}</p>
            ${selectedIngredients.length?`<div class="personal-stock-list">${selectedIngredients.map(id=>{
                const row=stock.items.find(item=>item.ingredient===id);
                return button('stock-edit',e(`${en()?id:translateIngredientName(id)}: ${row?quantityText(row)+(row.quantity===0?t(' · Tükendi',' · Empty'):''):t('Miktar belirtilmedi','Quantity unspecified')} · ${t('Düzenle','Edit')}`),id);
            }).join('')}</div>`:`<p>${t('Önce barına malzeme ekle.','Add ingredients to your bar first.')}</p>`}
            ${(stock.receipts||[]).length?`<h3>${t('Son stok işlemleri','Recent stock changes')}</h3><p>${t('Son 100 işlem saklanır. Geri alma yalnızca düşülen miktarı ekler; sonraki stok girişlerin korunur.','The last 100 changes are kept. Undo adds back only the deducted amount and keeps later stock edits.')}</p>
            <div class="personal-stock-log">${stock.receipts.map(row=>`<article><h4>${e(row.name)}</h4><time>${e(new Date(row.createdAt).toLocaleString(en()?'en-GB':'tr-TR'))}</time>
            <p>${row.changes.map(item=>e(`${en()?item.ingredient:translateIngredientName(item.ingredient)}: −${quantityText(item)}`)).join(' · ')}</p>
            ${row.undone?`<p>${t('Geri alındı','Undone')}</p>`:button('stock-undo',t('Stok düşümünü geri al','Undo stock deduction'),row.id)}</article>`).join('')}</div>`:''}</details>`;
    }
    function editStock(id) {
        if(!selectedIngredients.includes(id))return;
        const row=inventory().items.find(item=>item.ingredient===id);
        mode='stock';
        dialog.innerHTML=`<h2 id="personal-dialog-title">${e(en()?id:translateIngredientName(id))}</h2>
            <p>${t('Elinde kalan toplam miktarı gir. Boş bırakmak miktar takibini kapatır; 0 tükendi demektir.','Enter the total amount remaining. Leave blank to stop quantity tracking; 0 means empty.')}</p>
            <label for="stock-quantity">${t('Kalan miktar','Amount remaining')}</label><input id="stock-quantity" inputmode="decimal" type="text" value="${row?.quantity??''}" autocomplete="off">
            <label for="stock-unit">${t('Birim','Unit')}</label><select id="stock-unit">${Object.keys(BarInventory.units).map(unit=>`<option value="${unit}" ${unit===(row?.unit||'ml')?'selected':''}>${unitName(unit)}</option>`).join('')}</select>
            <p id="stock-error" role="alert"></p><div class="personal-actions">${button('done',t('Vazgeç','Cancel'))}${button('stock-save',t('Stoku kaydet','Save stock'),id)}</div>`;
        showDialog();dialog.querySelector('#stock-quantity').focus();
    }
    function saveStock(id) {
        if(!selectedIngredients.includes(id))return;
        const raw=dialog.querySelector('#stock-quantity').value.trim(),stock=inventory();
        const unit=dialog.querySelector('#stock-unit').value;
        try {
            if(raw && !/^\d+(?:[.,]\d{1,3})?$/.test(raw))throw new Error('invalid');
            const items=stock.items.filter(row=>row.ingredient!==id);
            if(raw)items.push({ingredient:id,quantity:Number(raw.replace(',','.')),unit});
            if(!write({[IKEY]:BarSecurity.inventory({...stock,items})}))return;
            close();filterCocktails();renderDashboard();
        } catch {dialog.querySelector('#stock-error').textContent=t('0–1.000.000 arasında, en fazla 3 ondalık basamaklı bir miktar gir.','Enter an amount from 0 to 1,000,000 with up to 3 decimal places.');}
    }
    function stockStatus(row) {
        if(!row.ingredient)return t('Eksik','Missing');
        if(row.missing)return t('Stok yetersiz','Insufficient stock')+`: ${quantityText(row.stock)}`;
        if(row.unchecked)return row.stock?t('Ölçü/birim elle kontrol edilmeli','Check measure/unit manually'):t('Miktar belirtilmedi','Quantity unspecified');
        return t('Stok','Stock')+`: ${quantityText(row.stock)}`;
    }
    function updateStockStatus(article,id,count) {
        const drink=find(id);if(!drink)return;
        const rows=stockRows(drink,count);
        article.querySelectorAll('[data-stock-row]').forEach(label=>{
            const row=rows[Number(label.dataset.stockRow)];
            label.textContent=stockStatus(row);label.classList.toggle('personal-missing',row.missing);
        });
        article.querySelectorAll('[data-personal="add-missing"]').forEach(control=>{
            const missing=missingFor(drink,count);
            control.hidden=!missing.length;
            control.textContent=pendingFor(drink,count).length?t('Eksikleri listeye ekle','Add missing to shopping list'):t('✓ Eksikler listede','✓ Missing items are listed');
        });
    }
    function preparationStockMarkup(row) {
        const stock=inventory(),receipt=stock.receipts?.find(item=>item.id===row.id);
        if(stock.deductions.includes(row.id))return receipt?.undone?`<p>${t('Stok düşümü geri alındı. Bu hazırlama için tekrar düşülmez.','Stock deduction was undone. This preparation cannot deduct again.')}</p>`:
            `<p>${t('Bu hazırlama için stok zaten düşüldü.','Stock was deducted for this preparation.')}</p>${receipt?button('stock-undo',t('Stok düşümünü geri al','Undo stock deduction'),row.id):''}`;
        const drink=find(row.drinkId);if(!drink)return '';
        const rows=stockRows(drink,row.servings||1),known=[...new Map(rows.filter(item=>item.compatible&&item.required>0).map(item=>[item.ingredient,item])).values()];
        if(!known.length)return `<p>${t('Ölçüsü ve stoku bilinen malzeme yok; otomatik stok düşülmez.','No ingredients have both a known measure and stock quantity; nothing will be deducted.')}</p>`;
        const insufficient=rows.some(item=>item.missing);
        return `<p>${e(String(row.servings||1))} ${t('porsiyon için düşülecek:','servings will deduct:')}</p><ul>${known.map(item=>`<li>${e(en()?item.ingredient:translateIngredientName(item.ingredient))}: ${e(quantityText({quantity:item.required,unit:item.stock.unit}))}</li>`).join('')}</ul>
            <p>${t('Yalnızca ölçüsü ve birimi bilinen stoklar azaltılır. Diğer malzemeleri elle kontrol et.','Only stock with known measures and compatible units is reduced. Check other ingredients manually.')}</p>
            ${insufficient?`<p>${t('Eksik veya yetersiz stok var. Önce stok miktarını düzelt.','Stock is missing or insufficient. Update quantities first.')}</p>`:''}
            ${button('stock-deduct',t('Stoktan düş','Deduct from stock'),row.id,insufficient?'disabled':'')}`;
    }
    function applyStock(eventId,undo=false) {
        const stock=inventory(),row=history().find(item=>item.id===eventId),drink=row&&find(row.drinkId);
        if(!undo && !drink)return;
        const result=undo?BarInventory.undo(stock,eventId):BarInventory.deduct(stock,stockRows(drink,row.servings||1),eventId,row.name);
        if(result.conflict || result.insufficient) {
            alert(result.conflict?t('Geri alınamadı: ilgili malzemelerin miktar takibini açıp aynı tür birimi seç (hacim/gram/adet).','Could not undo: enable quantity tracking for the affected ingredients and use compatible units (volume/grams/pieces).'):
                t('Stok yetersiz; hiçbir miktar düşülmedi.','Insufficient stock; no quantities were deducted.'));return;
        }
        if(result.inventory!==stock && !write({[IKEY]:BarSecurity.inventory(result.inventory)}))return;
        filterCocktails();renderDashboard();
        if(mode==='feedback') {
            const current=history().find(item=>item.id===feedbackId);
            if(current)dialog.querySelector('.personal-preparation-stock').innerHTML=preparationStockMarkup(current);
        }
        showToast(undo?t('Stok düşümü geri alındı.','Stock deduction undone.'):t('Stok güncellendi.','Stock updated.'),'success');
    }
    const pool = () => [...customRecipes, ...allCocktails];
    const find = id => pool().find(drink => drink.idDrink === id);
    function notifyFailure() {
        alert(t('Kaydedilemedi. Depolama iznini ve boş alanı kontrol et.', 'Could not save. Check storage permissions and free space.'));
    }
    function write(values) {
        const previous = {};
        try {
            for (const key of Object.keys(values)) previous[key] = localStorage.getItem(key);
            for (const [key, value] of Object.entries(values)) localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch {
            for (const [key, value] of Object.entries(previous)) {
                try { if (value === null) localStorage.removeItem(key); else localStorage.setItem(key, value); } catch {}
            }
            notifyFailure(); return false;
        }
    }
    function reqs(drink) {
        return drink.isCustom ? (drink.customIngredients || []).map(ingredientNameOnly) :
            Array.from({length:15},(_,i)=>drink['strIngredient'+(i+1)]).filter(Boolean).map(ingredientNameOnly);
    }
    const shoppingKey = name => normalizeSearchText(resolveIngredientName(name));
    const missingFor = (drink,count=1) => [...new Set(stockRows(drink,count).filter(row=>row.missing).map(row=>row.name))];
    const pendingFor = (drink,count=1) => missingFor(drink,count).filter(name=>!shoppingList.some(item=>shoppingKey(item)===shoppingKey(name)));
    function shoppingButton(drink,always=false) {
        if (!always && !missingFor(drink).length) return '';
        return button('add-missing', pendingFor(drink).length ? t('Eksikleri listeye ekle','Add missing to shopping list') : t('✓ Eksikler listede','✓ Missing items are listed'),drink.idDrink,missingFor(drink).length?'':'hidden');
    }
    function addMissing(target, id) {
        const drink=find(id); if(!drink)return;
        const count=Number(target.closest('.personal-mini')?.querySelector('.personal-inline')?.dataset.servings)||1;
        const missing=missingFor(drink,count), added=new Set(pendingFor(drink,count).map(shoppingKey)).size;
        const updated=BarPersonal.mergeShopping(shoppingList,missing,shoppingKey);
        try {BarSecurity.stringList(updated);}catch {notifyFailure();return;}
        if(!write({shoppingList:updated}))return;
        shoppingList=updated;
        renderShoppingList();
        document.querySelectorAll('[data-personal="add-missing"]').forEach(control=>{
            const recipe=find(control.dataset.id);if(!recipe)return;
            const size=Number(control.closest('.personal-mini')?.querySelector('.personal-inline')?.dataset.servings)||1;
            control.textContent=pendingFor(recipe,size).length?t('Eksikleri listeye ekle','Add missing to shopping list'):t('✓ Eksikler listede','✓ Missing items are listed');
        });
        const article=target.closest('.personal-mini');
        let status=article?.querySelector('.personal-shopping-status');
        if(article&&!status){status=document.createElement('p');status.className='personal-shopping-status';status.setAttribute('role','status');article.append(status);}
        if(status)status.textContent=added?t(`${added} malzeme alışveriş listesine eklendi.`,`${added} ingredients added to your shopping list.`):
            t('Eksik malzemeler zaten listede.','The missing ingredients are already listed.');
    }
    function suggestions(selected = selectedIngredients, prefs = preferences(), active = true) {
        return BarPersonal.recommend(pool(), prefs, history(), {
            requirements:reqs,
            missing:drink=>[...new Set(stockRows(drink,1,selected).filter(row=>row.missing).map(row=>row.name))],
            taste:drink=>{enrichDrink(drink); return drink.computedTaste;},
            allow:drink=>!active || (matchesAlcoholFilter(drink) && matchesVibeFilter(drink) &&
                (!onlyFavoritesFilter || favoriteCocktails.includes(drink.idDrink)) &&
                (tasteFilter==='all' || analyzeRecipe(drink).tasteProfile===tasteFilter) &&
                (!document.getElementById('cocktail-search')?.value.trim() ||
                    normalizeSearchText(document.getElementById('cocktail-search').value).split(/\s+/).filter(Boolean)
                        .every(token=>recipeMatchesSearchToken(drink,reqs(drink),token))))
        });
    }
    const tasteName = taste => en() ? ({Sert:'strong',Tatlı:'sweet',Ekşi:'sour',Ferah:'refreshing'}[taste] || taste) : taste;
    function button(action, label, value = '', extra = '') {
        return `<button type="button" data-personal="${action}" data-id="${e(value)}" ${action==='open-recipe'?'aria-expanded="false"':''} ${extra}>${label}</button>`;
    }
    function suggestionMarkup(result) {
        const rows = result.ready.length ? result.ready : result.nearby;
        if (!pool().length) return `<p role="status">${t('Tarifler yükleniyor. Çevrimdışıysan daha önce açtığın tarifler kullanılacak.', 'Loading recipes. Offline, previously cached recipes will be used.')}</p>`;
        if (!rows.length) return `<p>${t('Bu tercihler ve filtrelerle eşleşen tarif yok. Rehberi yeniden açarak tercihlerini değiştirebilirsin.', 'No recipes match these preferences and filters. Restart the guide to change your preferences.')}</p>`;
        return `<p>${result.ready.length ? t('Malzemelerin var; miktarı belirtilmeyenleri elle kontrol et.', 'You have the ingredients; check unspecified quantities manually.') :
            t('Henüz hazır tarif yok. Bunlar için eksik malzemeler:', 'No recipes are ready yet. Missing ingredients for these recipes:')}</p>
            <div class="personal-grid">${rows.map(row=>`<article class="personal-mini">
                ${BarSecurity.safeImage(row.drink.strDrinkThumb) ? `<img class="personal-photo" src="${e(BarSecurity.safeImage(row.drink.strDrinkThumb))}" alt="${e(row.drink.strDrink)}" loading="lazy" data-image-fallback>` : '<span class="personal-photo personal-photo-fallback" aria-hidden="true">🍹</span>'}
                <h4>${e(row.drink.strDrink)}</h4>
                <p>${row.missing.length ? `${t('Eksik / stok yetersiz', 'Missing / insufficient stock')}: ${row.missing.map(name=>e(en()?name:translateIngredientName(name))).join(', ')}` :
                    row.explicit ? t(`${tasteName(row.taste)} tatları sevdiğin ve malzemelerin hazır olduğu için.`, `Because you like ${tasteName(row.taste)} flavours and have the ingredients.`) :
                    row.learned ? t('Beğendiğin tariflerin tat profiline uyuyor; malzemelerin hazır.', 'Matches recipes you liked; your ingredients are ready.') :
                    result.personal ? t('Tercihlerine uyuyor ve malzemelerin hazır.', 'Matches your preferences and ingredients.') :
                    t('Klasik seçkimizden; malzemelerin hazır.', 'From our classic selection; your ingredients are ready.')}</p>
                ${button('open-recipe',t('Tarifi aç', 'Open recipe'), row.drink.idDrink)}
                ${shoppingButton(row.drink)}
            </article>`).join('')}</div>`;
    }
    function refresh() {
        if (!host) return;
        const stockOpen=host.querySelector('.personal-stock')?.open;
        const records = history();
        host.innerHTML = `<section class="personal-panel" aria-labelledby="personal-welcome-title">
            <h2 id="personal-welcome-title">${t('Barını sana göre düzenle', 'Make this bar yours')}</h2>
            <p>${t('Tercihlerini seç, elindekileri ekle ve ilk uygun tarifini bul. Hesap gerekmez.', 'Choose your tastes, add your ingredients and find your first recipe. No account needed.')}</p>
            ${button('start',t('Başlangıç rehberini aç', 'Open getting-started guide'))}
        </section>
        ${stockSection()}
        <section class="personal-panel" aria-labelledby="personal-picks-title">
            <h2 id="personal-picks-title">${t('Sana uygun', 'For you')}</h2>${suggestionMarkup(suggestions())}
        </section>
        <section class="personal-panel" aria-labelledby="personal-history-title">
            <h2 id="personal-history-title">${t('Yaptıklarım', 'My preparations')}</h2>
            <p>${t('Son 100 hazırlaman bu cihazda saklanır. Yedekleme ile diğer cihazına taşıyabilirsin.', 'Your last 100 preparations are stored on this device. Use Backup to move them to another device.')}</p>
            ${records.length ? `<div class="personal-history">${records.map(row=>`<article class="personal-mini">
                <h3>${e(row.name)}</h3><time datetime="${new Date(row.createdAt).toISOString()}">${e(new Date(row.createdAt).toLocaleString(en()?'en-GB':'tr-TR'))}</time>
                <p>${row.rating==='like'?t('Beğendim', 'Liked'):row.rating==='dislike'?t('Bana göre değil', 'Not for me'):t('Henüz değerlendirilmedi', 'Not rated yet')}</p>
                ${row.note ? `<p class="personal-note">${e(row.note)}</p>` : ''}
                <div class="personal-actions">${find(row.drinkId)?button('open-recipe',t('Tarifi aç','Open recipe'),row.drinkId):`<span>${t('Tarif artık mevcut değil.', 'Recipe is no longer available.')}</span>`}
                ${button('edit',t('Not / değerlendirme', 'Note / rating'),row.id)}
                ${button('delete-history',t('Kaydı sil', 'Delete entry'),row.id)}</div>
            </article>`).join('')}</div>${button('clear-history',t('Geçmişi temizle', 'Clear history'))}` : `<p>${t('Henüz hazırlama kaydın yok. Bir tarifin detayından “Hazırladım” diyerek başlayabilirsin.', 'No preparations yet. Choose “I made this” in a recipe to get started.')}</p>`}
        </section>`;
        if(stockOpen)host.querySelector('.personal-stock').open=true;
        if (dialog.open && mode==='guide' && step===3) renderGuide();
    }
    function showDialog() {
        if (!dialog.open) {returnFocus = document.activeElement; dialog.showModal();}
    }
    function close() {
        dialog.close(); mode=''; feedbackId='';
        if (returnFocus?.isConnected) returnFocus.focus();
    }
    function start() {
        draft = {...preferences(), tastes:[...preferences().tastes]};
        draftSelected = [...selectedIngredients]; step=0; mode='guide';
        // A reload during the guide must not force it open again.
        if (!preferences().onboardingDone) write({[PKEY]:{...preferences(),onboardingDone:true}});
        renderGuide(); showDialog();
    }
    function renderGuide() {
        const titles = [t('Ne keşfetmek istersin?', 'What would you like to explore?'), t('Hangi tatları seversin?', 'Which flavours do you like?'), t('Elinde neler var?', 'What do you have?'), t('Barınla ilk tariflerin', 'Your first recipes')];
        dialog.innerHTML = `<h2 id="personal-dialog-title">${titles[step]}</h2>
            <p>${step<3?t(`Adım ${step+1} / 3`, `Step ${step+1} / 3`):t('Tercihlerin ve barın kaydedildi.', 'Your preferences and bar have been saved.')}</p>
            ${step===0 ? `<fieldset><legend>${t('İçecek tercihi', 'Drink preference')}</legend>${[['all',t('Hepsi','All')],['Alcoholic',t('Alkollü','Alcoholic')],['Non_Alcoholic',t('Alkolsüz','Non-alcoholic')]].map(([value,label])=>`<label><input type="radio" name="personal-alcohol" value="${value}" ${draft.alcohol===value?'checked':''}> ${label}</label>`).join('')}</fieldset>` : ''}
            ${step===1 ? `<fieldset><legend>${t('Birden fazla seçebilir veya boş bırakabilirsin.', 'Choose several or leave blank.')}</legend>${['Sert','Tatlı','Ekşi','Ferah'].map(taste=>`<label><input type="checkbox" name="personal-taste" value="${taste}" ${draft.tastes.includes(taste)?'checked':''}> ${e(tasteName(taste))}</label>`).join('')}</fieldset>` : ''}
            ${step===2 ? `<label for="personal-ingredient-search">${t('Malzeme ara', 'Search ingredients')}</label><input id="personal-ingredient-search" type="search" autocomplete="off"><p>${t('Mevcut barın korunur; seçimlerini buradan değiştirebilirsin.', 'Your current bar is preserved; adjust it here.')}</p><div class="personal-ingredients">${ingredientChoices('')}</div>` : ''}
            ${step===3 ? suggestionMarkup(suggestions(draftSelected,draft,false)) : ''}
            <div class="personal-actions">${step<3 ? button('skip',t('Atla', 'Skip')) : button('done',t('Barıma git', 'Go to my bar'))}
            ${step>0&&step<3?button('back',t('Geri', 'Back')):''}${step<3?button('next',step===2?t('Kaydet ve tarifleri gör', 'Save and see recipes'):t('Devam', 'Next')):''}</div>`;
    }
    function ingredientChoices(query) {
        const normalized = normalizeSearchText(query);
        return popularIngredients.filter(ing=>normalizeSearchText([ing.id,ing.name,ing.nameEn].join(' ')).includes(normalized)).map(ing=>
            `<label><input type="checkbox" data-personal-ingredient="${e(ing.id)}" ${draftSelected.includes(ing.id)?'checked':''}> ${e(en()?(ing.nameEn||ing.id):translateIngredientName(ing.name||ing.id))}</label>`).join('') || `<p>${t('Malzeme bulunamadı.', 'No ingredients found.')}</p>`;
    }
    function skip() {
        if (write({[PKEY]:{...preferences(),onboardingDone:true}})) {close(); refresh();}
    }
    function collectStep() {
        if (step===0) draft.alcohol=dialog.querySelector('[name="personal-alcohol"]:checked')?.value || 'all';
        if (step===1) draft.tastes=[...dialog.querySelectorAll('[name="personal-taste"]:checked')].map(input=>input.value);
    }
    function feedback(id) {
        const row=history().find(row=>row.id===id); if(!row)return;
        feedbackId=id; mode='feedback';
        dialog.innerHTML=`<h2 id="personal-dialog-title">${e(row.name)}</h2><p>${t('Hazırlaman kaydedildi. Değerlendirme ve not isteğe bağlı.', 'Preparation saved. Rating and note are optional.')}</p>
            <section class="personal-preparation-stock" aria-label="${t('Stok işlemi','Stock change')}">${preparationStockMarkup(row)}</section>
            <fieldset><legend>${t('Nasıl buldun?', 'How was it?')}</legend>${[['',t('Değerlendirme yok','No rating')],['like',t('Beğendim','Liked')],['dislike',t('Bana göre değil','Not for me')]].map(([value,label])=>`<label><input type="radio" name="personal-rating" value="${value}" ${(row.rating||'')===value?'checked':''}> ${label}</label>`).join('')}</fieldset>
            <label for="personal-note">${t('Notun (en fazla 300 karakter)', 'Your note (up to 300 characters)')}</label><textarea id="personal-note" maxlength="300" rows="4">${e(row.note)}</textarea>
            <div class="personal-actions">${button('done',t('Kapat', 'Close'))}${button('save-feedback',t('Değerlendirmeyi kaydet','Save rating'))}</div>`;
        showDialog();
    }
    function record(drink, id, servings=1) {
        if (!drink) return false;
        const records=history();
        const updated=BarPersonal.addPreparation(records,{id,drinkId:drink.idDrink,name:drink.strDrink,createdAt:Date.now(),taste:analyzeRecipe(drink).tasteProfile,rating:null,note:'',servings:BarPersonal.servings(servings)});
        if (updated!==records && !write({[HKEY]:BarSecurity.history(updated)}))return false;
        refresh(); feedback(id); return true;
    }
    async function openRecipe(target, id) {
        const drink=find(id); if(!drink)return;
        const article=target.closest('.personal-mini'); if(!article)return;
        const existing=article.querySelector('.personal-inline');
        if(existing){existing.remove();target.removeAttribute('aria-controls');target.setAttribute('aria-expanded','false');target.textContent=t('Tarifi aç','Open recipe');return;}
        const panel=document.createElement('section'); panel.className='personal-inline';panel.id='personal-inline-'+(++nextInlineId);
        target.setAttribute('aria-controls',panel.id);target.setAttribute('aria-expanded','true');target.textContent=t('Tarifi kapat','Close recipe');
        const ingredients=stockRows(drink);
        panel.dataset.servings='1';
        panel.innerHTML=`<div class="personal-servings" role="group" aria-label="${t('Porsiyon sayısı','Servings')}">
            <span>${t('Porsiyon','Servings')}</span>${[1,2,4,8].map(count=>button('portion',`${count}×`,id,`data-size="${count}" aria-label="${count} ${t('porsiyon','servings')}" aria-pressed="${count===1}"`)).join('')}</div>
            <h4>${t('Malzemeler ve ölçüler','Ingredients and measures')}</h4>
            <ul>${ingredients.map(row=>`<li>${e(en()?row.name:translateIngredientName(row.name))} <strong data-personal-measure="${e(translateMeasureText(row.measure))}">${e(translateMeasureText(row.measure))}</strong>
                <span class="personal-stock-status ${row.missing?'personal-missing':''}" data-stock-row="${ingredients.indexOf(row)}">${e(stockStatus(row))}</span></li>`).join('')}</ul>
            <h4>${t('Hazırlanışı','Instructions')}</h4><p class="personal-instructions">${e(cleanInstructionText(en()||drink.isCustom?drink.strInstructions:(drink.strInstructionsTR||drink.strInstructions)||''))}</p>
            <div class="personal-actions">${button('prepared',t('Hazırladım','I made this'),id)}
            <button type="button" data-action="open-mix-mode" data-value="${e(encodeURIComponent(id))}">${t('Adım adım hazırla','Prepare step by step')}</button></div>
            ${shoppingButton(drink,true)}`;
        article.append(panel);
        if(!en() && !drink.isCustom && !drink.strInstructionsTR && drink.strInstructions) {
            try {
                const translated=await translateToTurkish(drink.strInstructions);
                if(panel.isConnected && !en())panel.querySelector('.personal-instructions').textContent=cleanInstructionText(translated||drink.strInstructions);
            } catch { /* Keep the original recipe readable when translation is unavailable. */ }
        }
    }
    function mount() {
        host=document.createElement('div'); host.id='personal-bar';
        document.getElementById('bar-dashboard').prepend(host);
        dialog=document.createElement('dialog');dialog.id='personal-dialog';dialog.setAttribute('aria-labelledby','personal-dialog-title');document.body.append(dialog);
        dialog.addEventListener('cancel',event=>{event.preventDefault(); if(mode==='guide'&&step<3)skip();else close();});
        document.addEventListener('input',event=>{
            if(event.target.id==='personal-ingredient-search') dialog.querySelector('.personal-ingredients').innerHTML=ingredientChoices(event.target.value);
        });
        document.addEventListener('change',event=>{
            const id=event.target.dataset.personalIngredient;
            if(id) draftSelected=event.target.checked?[...new Set([...draftSelected,id])]:draftSelected.filter(value=>value!==id);
        });
        document.addEventListener('click',event=>{
            const target=event.target.closest('[data-personal]');if(!target)return;
            event.preventDefault();event.stopPropagation();const id=target.dataset.id;
            switch(target.dataset.personal) {
                case 'start':start();break;
                case 'skip':skip();break;
                case 'back':collectStep();step--;renderGuide();dialog.querySelector('h2').tabIndex=-1;dialog.querySelector('h2').focus();break;
                case 'next':
                    collectStep();
                    if(step===2){
                        draft.onboardingDone=true;
                        if(!write({[PKEY]:BarSecurity.preferences(draft),selectedIngredients:BarSecurity.stringList(draftSelected)}))return;
                        selectedIngredients=[...draftSelected];renderIngredients();filterCocktails();
                    }
                    step++;renderGuide();dialog.querySelector('h2').tabIndex=-1;dialog.querySelector('h2').focus();break;
                case 'done': {const wasGuide=mode==='guide';close();if(wasGuide)switchTab('bar');break;}
                case 'open-recipe':openRecipe(target,id);break;
                case 'add-missing':addMissing(target,id);break;
                case 'stock-edit':editStock(id);break;
                case 'stock-save':saveStock(id);break;
                case 'stock-deduct':applyStock(id);break;
                case 'stock-undo':applyStock(id,true);break;
                case 'portion': {
                    const panel=target.closest('.personal-inline');if(!panel)break;
                    const count=BarPersonal.servings(target.dataset.size);panel.dataset.servings=String(count);
                    panel.querySelectorAll('[data-personal="portion"]').forEach(control=>control.setAttribute('aria-pressed',String(Number(control.dataset.size)===count)));
                    panel.querySelectorAll('[data-personal-measure]').forEach(measure=>measure.textContent=scaleMeasure(measure.dataset.personalMeasure,count));
                    updateStockStatus(target.closest('.personal-mini'),id,count);
                    break;
                }
                case 'edit':feedback(id);break;
                case 'prepared': {
                    if(manualEvent?.drinkId===id && Date.now()-manualEvent.time<1000){feedback(manualEvent.id);break;}
                    const eventId=crypto.randomUUID();
                    const servings=target.closest('[data-servings]')?.dataset.servings||1;
                    if(record(find(id),eventId,servings))manualEvent={drinkId:id,id:eventId,time:Date.now()};break;
                }
                case 'save-feedback': {
                    const rating=dialog.querySelector('[name="personal-rating"]:checked')?.value || null;
                    const note=dialog.querySelector('#personal-note').value;
                    if(note.length>300)return;
                    const records=history().map(row=>row.id===feedbackId?{...row,rating,note}:row);
                    if(write({[HKEY]:BarSecurity.history(records)})){close();refresh();}break;
                }
                case 'delete-history':if(write({[HKEY]:history().filter(row=>row.id!==id)}))refresh();break;
                case 'clear-history':if(confirm(t('Tüm hazırlama geçmişi silinsin mi? Favorilerin korunur.', 'Clear all preparation history? Your favourites will be kept.'))&&write({[HKEY]:[]}))refresh();break;
            }
        });
        refresh();
        const existing = selectedIngredients.length || favoriteCocktails.length || customRecipes.length || shoppingList.length || history().length;
        if(!preferences().onboardingDone && !existing && !returningUser)start();
    }
    window.BarPersonalUI={refresh,record,close,start,missing:missingFor,editStock,reset:()=>{manualEvent=null;if(dialog?.open)close();refresh();}};
    document.addEventListener('DOMContentLoaded',mount);
})();
