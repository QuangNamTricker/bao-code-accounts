// firebase-config.js
// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-firestore.js";

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyCCPZvTZd1RKGaZxpKJWiCQb4JvqjA7l-U",
    authDomain: "bao-code-accounts.firebaseapp.com",
    projectId: "bao-code-accounts",
    storageBucket: "bao-code-accounts.firebasestorage.app",
    messagingSenderId: "195898289743",
    appId: "1:195898289743:web:696a5646367dc08ad5443a",
    measurementId: "G-ED38789Q9R"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Export các đối tượng để sử dụng ở các file khác
export { auth, db };