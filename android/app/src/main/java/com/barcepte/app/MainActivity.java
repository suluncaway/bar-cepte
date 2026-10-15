package com.barcepte.app;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.ViewGroup;
import android.view.Window;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebViewClient;
import androidx.webkit.WebViewAssetLoader;
import android.widget.LinearLayout;
import android.widget.Toast;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import org.json.JSONArray;
import org.json.JSONObject;

import com.startapp.sdk.ads.banner.Banner;
import com.startapp.sdk.adsbase.Ad;
import com.startapp.sdk.adsbase.StartAppAd;
import com.startapp.sdk.adsbase.StartAppSDK;
import com.startapp.sdk.adsbase.adlisteners.AdEventListener;

public class MainActivity extends Activity {

    private WebView webView;
    private Banner startAppBanner;
    private ValueCallback<Uri[]> filePathCallback;
    private final static int FILE_CHOOSER_RESULT_CODE = 1001;
    private long backPressedTime = 0;
    private static final String APP_URL = "https://appassets.androidplatform.net/assets/index.html";
    private static final String MIGRATION_URL = "https://appassets.androidplatform.net/assets/__migration__.html";
    private static final String LEGACY_URL = "file:///android_asset/index.html";
    private String migrationScript;
    private String migrationData;
    private volatile boolean migrating;


    // Start.io Uygulama Kimliği
    private static final String STARTIO_APP_ID = "209724229";

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Koyu durum çubuğu ve tam ekran optimizasyonu
        Window window = getWindow();
        window.addFlags(WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            window.setStatusBarColor(0xFF07090E);
            window.setNavigationBarColor(0xFF07090E);
        }

        // Start.io SDK Başlatma
        StartAppSDK.init(this, STARTIO_APP_ID, false);
        // Gerçek para kazanma modu aktif (Test modu kapatıldı)
        StartAppSDK.setTestAdsEnabled(BuildConfig.DEBUG);
        // Açılışta pat diye splash reklam çıkmasını engelle (kullanıcı dostu):
        StartAppAd.disableSplash();

        // Ana dikey düzen (Üstte WebView, en altta Start.io Banner)
        LinearLayout rootLayout = new LinearLayout(this);
        rootLayout.setOrientation(LinearLayout.VERTICAL);
        rootLayout.setBackgroundColor(0xFF07090E);
        rootLayout.setLayoutParams(new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
        ));

        // WebView kurulumu
        webView = new WebView(this);
        LinearLayout.LayoutParams webViewParams = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                0,
                1.0f // Kalan tüm dikey alanı kapla
        );
        webView.setLayoutParams(webViewParams);
        rootLayout.addView(webView);

        // Start.io Banner Reklam Bileşeni
        startAppBanner = new Banner(this);
        LinearLayout.LayoutParams adParams = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.WRAP_CONTENT
        );
        startAppBanner.setLayoutParams(adParams);
        rootLayout.addView(startAppBanner);

        // Reklamı yükle
        if (!BuildConfig.DEBUG) startAppBanner.loadAd();

        setContentView(rootLayout);

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        
        // Güvenlik Sıkılaştırması: Çapraz dosya erişimini engelle
        settings.setAllowFileAccessFromFileURLs(false);
        settings.setAllowUniversalAccessFromFileURLs(false);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);

        settings.setLoadWithOverviewMode(true);
        settings.setUseWideViewPort(true);
        settings.setSupportZoom(false);
        settings.setBuiltInZoomControls(false);
        settings.setDisplayZoomControls(false);

        // Donanım hızlandırma
        webView.setLayerType(View.LAYER_TYPE_HARDWARE, null);

        migrating = !getPreferences(MODE_PRIVATE).getBoolean("httpsStorageMigrated", false);
        if (migrating) {
            try (InputStream input = getAssets().open("storage-migration.js")) {
                ByteArrayOutputStream output = new ByteArrayOutputStream();
                byte[] buffer = new byte[4096];
                int size;
                while ((size = input.read(buffer)) != -1) output.write(buffer, 0, size);
                migrationScript = output.toString("UTF-8");
                settings.setAllowFileAccess(true);
            } catch (Exception error) {
                migrating = false;
                Toast.makeText(this, "Veri aktarımı başlatılamadı. Bir sonraki açılışta tekrar denenecek.", Toast.LENGTH_LONG).show();
            }
        }

        // Güvenli URL Yönlendirmesi: Sadece yerel assets WebView içinde açılır, harici siteler sistem tarayıcısına gider
        final WebViewAssetLoader assetLoader = new WebViewAssetLoader.Builder()
                .addPathHandler("/assets/", new WebViewAssetLoader.AssetsPathHandler(this))
                .build();
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                String url = request.getUrl().toString();
                if (migrating && (LEGACY_URL.equals(url) || MIGRATION_URL.equals(url))) {
                    return new WebResourceResponse("text/html", "UTF-8", new ByteArrayInputStream(
                            "<!doctype html><meta charset=utf-8><title>Bar Cepte</title>".getBytes(StandardCharsets.UTF_8)));
                }
                return assetLoader.shouldInterceptRequest(request.getUrl());
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                if (!migrating) return;
                if (LEGACY_URL.equals(url)) {
                    view.evaluateJavascript(migrationScript + ";JSON.stringify(BarStorageMigration.snapshot(localStorage));", value -> {
                        try {
                            migrationData = new JSONArray("[" + value + "]").getString(0);
                            new JSONObject(migrationData);
                            view.loadUrl(MIGRATION_URL);
                        } catch (Exception error) {
                            finishMigration(false);
                        }
                    });
                } else if (MIGRATION_URL.equals(url)) {
                    String restore = migrationScript + ";BarStorageMigration.restore(localStorage,JSON.parse("
                            + JSONObject.quote(migrationData) + "));";
                    view.evaluateJavascript(restore, value -> finishMigration("true".equals(value)));
                }
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, String url) {
                if (isAppUrl(url) || (migrating && LEGACY_URL.equals(url))) {
                    return false; // Yerel uygulamada kal
                }
                // Harici bağlantıları (http, https, mailto vb.) güvenli varsayılan tarayıcıda aç
                try {
                    Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
                    startActivity(intent);
                    return true;
                } catch (Exception e) {
                    return true;
                }
            }
        });

        // Fotoğraf seçimi desteği
        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onShowFileChooser(WebView webView, ValueCallback<Uri[]> filePathCallback,
                                            FileChooserParams fileChooserParams) {
                if (MainActivity.this.filePathCallback != null) {
                    MainActivity.this.filePathCallback.onReceiveValue(null);
                }
                MainActivity.this.filePathCallback = filePathCallback;

                Intent intent = new Intent(Intent.ACTION_GET_CONTENT);
                intent.addCategory(Intent.CATEGORY_OPENABLE);
                intent.setType("image/*");
                startActivityForResult(Intent.createChooser(intent, "Kokteyl Fotoğrafı Seç"), FILE_CHOOSER_RESULT_CODE);
                return true;
            }
        });

        // Web arayüzü ile iletişim köprüsü (Akıllı reklam sayacı)
        webView.addJavascriptInterface(new AndroidBridge(), "AndroidBridge");

        // Yerel dosyaları doğrudan yükle
        webView.loadUrl(migrating ? LEGACY_URL : APP_URL);
    }

    private void finishMigration(boolean success) {
        migrating = false;
        webView.getSettings().setAllowFileAccess(false);
        migrationData = null;
        migrationScript = null;
        if (success) getPreferences(MODE_PRIVATE).edit().putBoolean("httpsStorageMigrated", true).apply();
        else Toast.makeText(this, "Eski veriler korunuyor; aktarım bir sonraki açılışta tekrar denenecek.", Toast.LENGTH_LONG).show();
        webView.loadUrl(APP_URL);
    }

    private boolean isAppUrl(String url) {
        if (url == null) return false;
        Uri uri = Uri.parse(url);
        return "https".equals(uri.getScheme())
                && "appassets.androidplatform.net".equals(uri.getHost())
                && uri.getPath() != null && uri.getPath().startsWith("/assets/");
    }

    // Web arayüzü ile Android arasındaki akıllı reklam köprüsü
    public class AndroidBridge {
        private int recipeCounter = 0;
        private long lastAdTime = 0;
        private StartAppAd startAppAd;

        @JavascriptInterface
        public void onRecipeOpened() {
            if (BuildConfig.DEBUG) return;
            recipeCounter++;
            long now = System.currentTimeMillis();

            // Kullanıcıyı kesinlikle boğmamak için akıllı eşik:
            // 1) En az 5 farklı kokteyl açılmış olmalı (recipeCounter >= 5)
            // 2) Son reklamın üzerinden en az 2.5 dakika (150.000 ms) geçmiş olmalı
            if (recipeCounter >= 5 && (now - lastAdTime >= 150000)) {
                runOnUiThread(() -> {
                    if (startAppAd == null) {
                        startAppAd = new StartAppAd(MainActivity.this);
                    }
                    startAppAd.loadAd(new AdEventListener() {
                        @Override
                        public void onReceiveAd(Ad ad) {
                            startAppAd.showAd();
                        }

                        @Override
                        public void onFailedToReceiveAd(Ad ad) {
                            // Reklam gelmezse sessizce geç
                        }
                    });
                });
                recipeCounter = 0;
                lastAdTime = now;
            }
        }
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        if (requestCode == FILE_CHOOSER_RESULT_CODE) {
            if (filePathCallback != null) {
                Uri[] results = null;
                if (resultCode == Activity.RESULT_OK && data != null) {
                    String dataString = data.getDataString();
                    if (dataString != null) {
                        results = new Uri[]{Uri.parse(dataString)};
                    }
                }
                filePathCallback.onReceiveValue(results);
                filePathCallback = null;
            }
        }
        super.onActivityResult(requestCode, resultCode, data);
    }

    @Override
    public void onBackPressed() {
        if (webView.canGoBack()) {
            webView.goBack();
        } else {
            if (backPressedTime + 2000 > System.currentTimeMillis()) {
                super.onBackPressed();
            } else {
                Toast.makeText(this, "Çıkmak için tekrar basın", Toast.LENGTH_SHORT).show();
                backPressedTime = System.currentTimeMillis();
            }
        }
    }
}


