package com.barcepte.app;
import androidx.test.core.app.ActivityScenario;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import org.junit.Test;
import org.junit.runner.RunWith;
import static org.junit.Assert.*;
@RunWith(AndroidJUnit4.class)
public class LegacySeedTest extends WebViewTestSupport {
    @Test public void seedOriginalFileOrigin() throws Exception {
        try(ActivityScenario<MainActivity> scenario=ActivityScenario.launch(MainActivity.class)) {
            await(scenario,"location.href==='file:///android_asset/index.html' && document.readyState==='complete'");
            scenario.onActivity(activity->activity.getPreferences(0).edit().putBoolean("httpsStorageMigrated",false).commit());
            String script="(function(){localStorage.setItem('favoriteCocktails',JSON.stringify(['11000']));"
                +"localStorage.setItem('selectedIngredients',JSON.stringify(['Gin']));"
                +"localStorage.setItem('shoppingList',JSON.stringify(['Şeker']));"
                +"localStorage.setItem('customRecipes',JSON.stringify([{idDrink:'custom_upgrade',strDrink:'Çilek 🥂',strInstructions:'Karıştır',customIngredients:['Gin'],strDrinkThumb:'',strAlcoholic:'Alcoholic'}]));"
                +"localStorage.setItem('bar_cepte_lang','tr');return true;})()";
            assertEquals("true",evaluate(scenario,script));
        }
    }
}
