package com.barcepte.app;
import androidx.test.core.app.ActivityScenario;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import org.junit.Test;
import org.junit.runner.RunWith;
import static org.junit.Assert.*;
@RunWith(AndroidJUnit4.class)
public class LegacyPersistenceTest extends WebViewTestSupport {
    @Test public void originalDataExistsAfterProcessRestart() throws Exception {
        try(ActivityScenario<MainActivity> scenario=ActivityScenario.launch(MainActivity.class)) {
            await(scenario,"location.href==='file:///android_asset/index.html' && document.readyState==='complete'");
            assertEquals("true",evaluate(scenario,"JSON.parse(localStorage.getItem('favoriteCocktails')||'[]').includes('11000')"));
            assertEquals("true",evaluate(scenario,"JSON.parse(localStorage.getItem('customRecipes')||'[]')[0].strDrink==='Çilek 🥂'"));
        }
    }
}
