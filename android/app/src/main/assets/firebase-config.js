/**
 * Bar Cepte — Google Sign-In & Firebase Bulut Entegrasyonu (Android WebView)
 */

const BAR_FIREBASE_CONFIG = {
    googleClientId: "",
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
