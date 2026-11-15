package com.barcepte.app;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;
import androidx.webkit.WebViewAssetLoader;
import org.json.JSONTokener;
import org.json.JSONObject;

/** HTTPS local origin enables fetch/crypto without universal file access. */
final class LocalAssetClient extends WebViewClient {
    static final String ORIGIN = "https://appassets.androidplatform.net";
    static final String HOME = ORIGIN + "/assets/index.html";
    static final String MIGRATION = ORIGIN + "/assets/android-migration.html";
    static final String LEGACY = "file:///android_asset/android-migration.html";
    private final Activity activity;
    private final WebViewAssetLoader loader;
    private String legacyState;
    private int migrationStage = 0;

    LocalAssetClient(Activity activity) {
        this.activity = activity;
        loader = new WebViewAssetLoader.Builder()
                .addPathHandler("/assets/", new WebViewAssetLoader.AssetsPathHandler(activity))
                .build();
    }

    @Override
    public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
        return loader.shouldInterceptRequest(request.getUrl());
    }

    @Override
    public boolean shouldOverrideUrlLoading(WebView view, String url) {
        Uri uri = Uri.parse(url);
        if ("https".equals(uri.getScheme()) && "appassets.androidplatform.net".equals(uri.getHost())
                && uri.getPort() == -1 && uri.getPath() != null && uri.getPath().startsWith("/assets/")) {
            return false;
        }
        // Never pass arbitrary intent:, javascript:, content: or file: URLs to Android.
        if ("https".equals(uri.getScheme()) || "http".equals(uri.getScheme()) || "mailto".equals(uri.getScheme())) {
            try { activity.startActivity(new Intent(Intent.ACTION_VIEW, uri)); }
            catch (Exception ignored) { /* No handler installed. */ }
        }
        return true;
    }

    @Override
    public void onPageFinished(WebView view, String url) {
        if (migrationStage == 0 && LEGACY.equals(url)) {
            migrationStage = 1;
            // This bundled blank page has no scripts, ads or bridge calls. Keep the old
            // storage intact; only restore missing keys in the new origin once.
            view.evaluateJavascript("JSON.stringify(Object.assign({}, localStorage))", result -> {
                try {
                    Object decoded = new JSONTokener(result).nextValue();
                    if (!(decoded instanceof String)) throw new IllegalStateException("Storage unavailable");
                    legacyState = (String) decoded;
                    new JSONObject(legacyState); // Validate before constructing the restoration script.
                    view.loadUrl(MIGRATION);
                } catch (Exception error) { migrationFailed(); }
            });
        } else if (migrationStage == 1 && MIGRATION.equals(url)) {
            migrationStage = 2;
            String script = "(function(){try{const marker='barcepte_https_migrated_v1';"
                    + "if(!localStorage.getItem(marker)){const old=JSON.parse(" + JSONObject.quote(legacyState) + ");"
                    + "for(const key of Object.keys(old)){if(typeof old[key]==='string' && localStorage.getItem(key)===null)"
                    + "localStorage.setItem(key,old[key]);}localStorage.setItem(marker,'1');}return true;}catch(e){return false;}})()";
            view.evaluateJavascript(script, result -> {
                legacyState = null;
                if ("true".equals(result)) {
                    migrationStage = 3;
                    view.loadUrl(HOME);
                    view.clearHistory();
                } else migrationFailed();
            });
        }
    }

    private void migrationFailed() {
        Toast.makeText(activity, "Yerel veri aktarımı tamamlanamadı. Eski verileriniz korunuyor; uygulamayı yeniden başlatın.", Toast.LENGTH_LONG).show();
    }
}
