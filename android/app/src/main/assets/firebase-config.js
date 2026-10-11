/**
 * Bar Cepte — Google Sign-In & Firebase Bulut Entegrasyonu (Android WebView)
 */

const BAR_FIREBASE_CONFIG = {
    googleClientId: "869237464662-mhq835cgaqusep0m9oeqb46amjioc9j8.apps.googleusercontent.com",
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
