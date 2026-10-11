/**
 * Bar Cepte — Google Sign-In & Firebase Bulut Entegrasyonu
 * 
 * Bu dosya Google ile Giriş (OAuth 2.0) ve Firebase Firestore bulut senkronizasyonu
 * için gerekli yapılandırma bilgilerini barındırır.
 * 
 * Kurulum Adımları:
 * 1. Google Cloud Console (https://console.cloud.google.com) veya Firebase Console'da yeni proje açın.
 * 2. Authentication > Sign-in method > Google'ı aktifleştirin.
 * 3. Web Client ID bilginizi 'googleClientId' alanına yapıştırın.
 */

const BAR_FIREBASE_CONFIG = {
    // Google Cloud OAuth 2.0 Web Client ID
    googleClientId: "869237464662-mhq835cgaqusep0m9oeqb46amjioc9j8.apps.googleusercontent.com",

    // Firebase Web Yapılandırması (İsteğe bağlı Firestore REST desteği)
    apiKey: "",
    authDomain: "bar-cepte.firebaseapp.com",
    projectId: "bar-cepte",
    storageBucket: "bar-cepte.appspot.com",
    messagingSenderId: "",
    appId: ""
};

if (typeof window !== 'undefined') {
    window.BAR_FIREBASE_CONFIG = BAR_FIREBASE_CONFIG;
}
if (typeof module !== 'undefined') {
    module.exports = BAR_FIREBASE_CONFIG;
}
