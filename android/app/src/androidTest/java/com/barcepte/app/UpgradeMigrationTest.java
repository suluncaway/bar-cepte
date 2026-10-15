package com.barcepte.app;
import androidx.test.core.app.ActivityScenario;
import androidx.test.core.app.ApplicationProvider;
import android.content.Intent;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import org.junit.Test;
import org.junit.runner.RunWith;
import static org.junit.Assert.*;
@RunWith(AndroidJUnit4.class)
public class UpgradeMigrationTest extends WebViewTestSupport {
    @Test public void preserveDataAndLoadBundledRecipesAfterUpgrade() throws Exception {
        Intent intent=new Intent(ApplicationProvider.getApplicationContext(),MainActivity.class).putExtra("barcepte_offline_test",true);
        try(ActivityScenario<MainActivity> scenario=ActivityScenario.launch(intent)) {
            await(scenario,"location.href==='https://appassets.androidplatform.net/assets/index.html' && document.readyState==='complete'");
            await(scenario,"typeof allCocktails!=='undefined' && allCocktails.length>400");
            assertEquals("Migration storage: "+evaluate(scenario,"JSON.stringify(Object.keys(localStorage))"),"true",evaluate(scenario,"JSON.parse(localStorage.getItem('favoriteCocktails')||'[]').includes('11000')"));
            assertEquals("true",evaluate(scenario,"JSON.parse(localStorage.getItem('selectedIngredients')).includes('Gin')"));
            assertEquals("true",evaluate(scenario,"JSON.parse(localStorage.getItem('shoppingList')).includes('Şeker')"));
            assertEquals("true",evaluate(scenario,"JSON.parse(localStorage.getItem('customRecipes'))[0].strDrink==='Çilek 🥂'"));
            scenario.onActivity(activity->{
                assertTrue(activity.getPreferences(0).getBoolean("httpsStorageMigrated",false));
                assertFalse(findWebView(activity.getWindow().getDecorView()).getSettings().getAllowFileAccess());
                assertTrue(findWebView(activity.getWindow().getDecorView()).getSettings().getBlockNetworkLoads());
            });
        }
        // Reopening must not repeat migration or overwrite values with the old source snapshot.
        try(ActivityScenario<MainActivity> scenario=ActivityScenario.launch(intent)) {
            await(scenario,"location.href.indexOf('https://appassets.androidplatform.net/')===0 && document.readyState==='complete'");
            assertEquals("true",evaluate(scenario,"JSON.parse(localStorage.getItem('customRecipes'))[0].idDrink==='custom_upgrade'"));
        }
    }
}
