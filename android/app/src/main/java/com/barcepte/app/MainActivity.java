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
import android.webkit.WebViewClient;
import android.widget.LinearLayout;
import android.widget.Toast;

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
        StartAppSDK.setTestAdsEnabled(false);
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
        startAppBanner.loadAd();

        setContentView(rootLayout);

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        
        // Güvenlik Sıkılaştırması: Çapraz dosya erişimini engelle
        settings.setAllowFileAccessFromFileURLs(false);
        settings.setAllowUniversalAccessFromFileURLs(false);
        settings.setAllowFileAccess(true); // Yerel assets yüklemesi için
        settings.setAllowContentAccess(true);

        settings.setLoadWithOverviewMode(true);
        settings.setUseWideViewPort(true);
        settings.setSupportZoom(false);
        settings.setBuiltInZoomControls(false);
        settings.setDisplayZoomControls(false);

        // Donanım hızlandırma
        webView.setLayerType(View.LAYER_TYPE_HARDWARE, null);

        // Güvenli URL Yönlendirmesi: Sadece yerel assets WebView içinde açılır, harici siteler sistem tarayıcısına gider
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, String url) {
                if (url != null && url.startsWith("file:///android_asset/")) {
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
        webView.loadUrl("file:///android_asset/index.html");
    }

    // Web arayüzü ile Android arasındaki akıllı reklam köprüsü
    public class AndroidBridge {
        private int recipeCounter = 0;
        private long lastAdTime = 0;
        private StartAppAd startAppAd;

        @JavascriptInterface
        public void onRecipeOpened() {
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


