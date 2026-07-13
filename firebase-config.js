// ==========================================
// ListaLar - Configuração compartilhada Firebase
// ==========================================

import {
  initializeApp,
  getApps,
  getApp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";

import {
  getAuth,
  browserLocalPersistence,
  setPersistence
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
  getFirestore
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyC2U7q5HupxKyI3QiAyan-2Sio55NSir0Y",
  authDomain: "compras-da-casa.firebaseapp.com",
  projectId: "compras-da-casa",
  storageBucket: "compras-da-casa.firebasestorage.app",
  messagingSenderId: "63765433273",
  appId: "1:63765433273:web:c478a3dd33ef3cd55a0468"
};

const app = getApps().length
  ? getApp()
  : initializeApp(firebaseConfig);

const auth = getAuth(app);
const db = getFirestore(app);

setPersistence(
  auth,
  browserLocalPersistence
).catch((erro) => {
  console.warn(
    "Não foi possível configurar a persistência do login:",
    erro
  );
});

export {
  app,
  auth,
  db
};
