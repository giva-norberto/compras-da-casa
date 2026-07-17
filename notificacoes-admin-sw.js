/**
 * ============================================================================
 * LISTALAR - NOTIFICAÇÕES ADMINISTRATIVAS EM SEGUNDO PLANO
 * Arquivo: notificacoes-admin-sw.js
 *
 * RESPONSABILIDADE:
 * - Inicializar o Firebase Cloud Messaging dentro do service worker.
 * - Permitir que notificações sejam recebidas com o ListaLar fechado.
 *
 * IMPORTANTE:
 * - Este arquivo é carregado pelo service-worker.js.
 * - Não possui lógica de cache.
 * - Não envia notificações.
 * - O envio é realizado pela Cloud Function.
 * ============================================================================
 */

importScripts(
  "https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js"
);

importScripts(
  "https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js"
);

// ============================================================================
// CONFIGURAÇÃO FIREBASE DO LISTALAR
// ============================================================================

const firebaseConfigListaLar = {
  apiKey:
    "AIzaSyC2U7q5HupxKyI3QiAyan-2Sio55NSir0Y",

  authDomain:
    "compras-da-casa.firebaseapp.com",

  projectId:
    "compras-da-casa",

  storageBucket:
    "compras-da-casa.firebasestorage.app",

  messagingSenderId:
    "63765433273",

  appId:
    "1:63765433273:web:c478a3dd33ef3cd55a0468"
};

// Evita inicializar o Firebase mais de uma vez.
if (!firebase.apps.length) {
  firebase.initializeApp(
    firebaseConfigListaLar
  );
}

const messagingListaLar =
  firebase.messaging();

// ============================================================================
// MENSAGENS RECEBIDAS EM SEGUNDO PLANO
// ============================================================================

messagingListaLar.onBackgroundMessage(
  (payload) => {
    /*
     * A Cloud Function já envia o título, corpo,
     * ícone e link dentro da mensagem.
     *
     * O próprio Firebase Messaging exibe a
     * notificação no navegador.
     *
     * Não usamos showNotification() aqui para
     * evitar notificações duplicadas.
     */

    console.log(
      "[ListaLar] Notificação administrativa recebida:",
      payload
    );
  }
);
