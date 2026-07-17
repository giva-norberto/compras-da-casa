/**
 * ============================================================================
 * LISTALAR - NOTIFICAÇÕES ADMINISTRATIVAS
 * Arquivo: notificacoes-admin.js
 *
 * RESPONSABILIDADE:
 * - Solicitar autorização de notificações no aparelho do administrador.
 * - Registrar o service worker já existente do ListaLar.
 * - Gerar o token Firebase Cloud Messaging.
 * - Enviar o token para uma Cloud Function segura.
 * - Exibir o controle dentro do painel administrativo.
 *
 * IMPORTANTE:
 * - Este arquivo não grava diretamente no Firestore.
 * - A Cloud Function validarará adminSistema === true.
 * - A chave VAPID será colocada posteriormente.
 * ============================================================================
 */

import {
  app,
  auth,
} from "./firebase-config.js";

import {
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
  getFunctions,
  httpsCallable,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-functions.js";

import {
  getMessaging,
  getToken,
  isSupported,
  onMessage,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging.js";

// ============================================================================
// CONFIGURAÇÕES
// ============================================================================

const REGIAO_FUNCOES =
  "southamerica-east1";

/**
 * A chave pública VAPID será gerada no Firebase Console.
 *
 * Não coloque chave privada neste arquivo.
 * A chave VAPID pública pode ficar no navegador.
 */
const CHAVE_PUBLICA_VAPID =
  "COLE_AQUI_A_CHAVE_PUBLICA_VAPID";

const functions = getFunctions(
  app,
  REGIAO_FUNCOES,
);

/**
 * Esta Cloud Function será criada na próxima etapa.
 */
const registrarDispositivoAdmin =
  httpsCallable(
    functions,
    "registrarDispositivoAdmin",
  );

// ============================================================================
// ESTADO INTERNO
// ============================================================================

let usuarioAdministrador = null;
let messaging = null;
let listenerPrimeiroPlanoAtivo = false;
let ativacaoEmAndamento = false;

// ============================================================================
// UTILIDADES
// ============================================================================

function textoSeguro(valor) {
  return String(valor || "").trim();
}

function chaveVapidConfigurada() {
  return (
    textoSeguro(CHAVE_PUBLICA_VAPID) !== "" &&
    CHAVE_PUBLICA_VAPID !==
      "COLE_AQUI_A_CHAVE_PUBLICA_VAPID"
  );
}

function obterElemento(id) {
  return document.getElementById(id);
}

function executandoComoPwa() {
  const modoStandalone =
    window.matchMedia(
      "(display-mode: standalone)",
    ).matches;

  const standaloneIos =
    window.navigator.standalone === true;

  return modoStandalone || standaloneIos;
}

function detectarPlataforma() {
  const userAgent =
    navigator.userAgent || "";

  if (/android/i.test(userAgent)) {
    return "Android";
  }

  if (/iphone|ipad|ipod/i.test(userAgent)) {
    return "iOS";
  }

  if (/windows/i.test(userAgent)) {
    return "Windows";
  }

  if (/macintosh|mac os x/i.test(userAgent)) {
    return "macOS";
  }

  if (/linux/i.test(userAgent)) {
    return "Linux";
  }

  return "Desconhecida";
}

function detectarNavegador() {
  const userAgent =
    navigator.userAgent || "";

  if (/edg/i.test(userAgent)) {
    return "Microsoft Edge";
  }

  if (/opr|opera/i.test(userAgent)) {
    return "Opera";
  }

  if (
    /chrome|crios/i.test(userAgent) &&
    !/edg|opr|opera/i.test(userAgent)
  ) {
    return "Google Chrome";
  }

  if (/firefox|fxios/i.test(userAgent)) {
    return "Mozilla Firefox";
  }

  if (
    /safari/i.test(userAgent) &&
    !/chrome|crios|android/i.test(userAgent)
  ) {
    return "Safari";
  }

  return "Navegador não identificado";
}

function mensagemErroFunctions(erro) {
  const codigo = textoSeguro(
    erro?.code,
  );

  const mensagemServidor = textoSeguro(
    erro?.message,
  );

  const mensagens = {
    "functions/unauthenticated":
      "Sua sessão administrativa não está autenticada.",

    "functions/permission-denied":
      "Somente o administrador do sistema pode registrar este aparelho.",

    "functions/invalid-argument":
      "O token de notificação recebido é inválido.",

    "functions/internal":
      "O servidor não conseguiu registrar este aparelho.",

    "functions/unavailable":
      "O serviço está temporariamente indisponível.",
  };

  return (
    mensagens[codigo] ||
    mensagemServidor ||
    "Não foi possível ativar as notificações."
  );
}

// ============================================================================
// INTERFACE
// ============================================================================

function aplicarEstilosNotificacoesAdmin() {
  if (
    document.getElementById(
      "notificacoesAdminStyles",
    )
  ) {
    return;
  }

  const style =
    document.createElement("style");

  style.id = "notificacoesAdminStyles";

  style.textContent = `
    .notificacoes-admin-card {
      margin-top: 18px;
    }

    .notificacoes-admin-conteudo {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 18px;
    }

    .notificacoes-admin-texto {
      min-width: 0;
      flex: 1;
    }

    .notificacoes-admin-texto strong {
      display: block;
      margin-bottom: 5px;
      color: #111827;
    }

    .notificacoes-admin-texto p {
      margin: 0;
      color: #64748b;
      line-height: 1.5;
    }

    .notificacoes-admin-status {
      margin-top: 10px;
      min-height: 20px;
      font-size: 0.9rem;
      font-weight: 600;
    }

    .notificacoes-admin-status[data-tipo="success"] {
      color: #15803d;
    }

    .notificacoes-admin-status[data-tipo="warning"] {
      color: #b45309;
    }

    .notificacoes-admin-status[data-tipo="danger"] {
      color: #b91c1c;
    }

    .notificacoes-admin-status[data-tipo="info"] {
      color: #475569;
    }

    .notificacoes-admin-botao {
      flex: 0 0 auto;
      min-width: 180px;
    }

    @media (max-width: 640px) {
      .notificacoes-admin-conteudo {
        align-items: stretch;
        flex-direction: column;
      }

      .notificacoes-admin-botao {
        width: 100%;
        min-width: 0;
      }
    }
  `;

  document.head.appendChild(style);
}

function criarAreaNotificacoesAdmin() {
  if (
    document.getElementById(
      "areaNotificacoesAdmin",
    )
  ) {
    return;
  }

  const secaoDashboard =
    document.getElementById(
      "secao-dashboard",
    );

  if (!secaoDashboard) {
    console.warn(
      "A seção administrativa do dashboard não foi localizada.",
    );

    return;
  }

  const card =
    document.createElement("div");

  card.id = "areaNotificacoesAdmin";
  card.className =
    "admin-card notificacoes-admin-card";

  card.innerHTML = `
    <div class="notificacoes-admin-conteudo">
      <div class="notificacoes-admin-texto">
        <strong>
          🔔 Notificações administrativas
        </strong>

        <p>
          Receba no celular um aviso quando uma nova família
          for cadastrada no ListaLar.
        </p>

        <div
          id="statusNotificacoesAdmin"
          class="notificacoes-admin-status"
          data-tipo="info"
        ></div>
      </div>

      <button
        id="btnAtivarNotificacoesAdmin"
        type="button"
        class="btn btn-primary notificacoes-admin-botao"
      >
        Ativar notificações
      </button>
    </div>
  `;

  const gradeEstatisticas =
    secaoDashboard.querySelector(
      ".stats-grid",
    );

  if (gradeEstatisticas) {
    gradeEstatisticas.insertAdjacentElement(
      "afterend",
      card,
    );
  } else {
    secaoDashboard.appendChild(card);
  }

  obterElemento(
    "btnAtivarNotificacoesAdmin",
  )?.addEventListener(
    "click",
    ativarNotificacoesAdmin,
  );

  atualizarInterfacePermissao();
}

function mostrarStatus(
  mensagem,
  tipo = "info",
) {
  const status = obterElemento(
    "statusNotificacoesAdmin",
  );

  if (!status) {
    return;
  }

  status.textContent =
    mensagem || "";

  status.dataset.tipo = tipo;
}

function atualizarInterfacePermissao() {
  const botao = obterElemento(
    "btnAtivarNotificacoesAdmin",
  );

  if (!botao) {
    return;
  }

  if (
    !("Notification" in window)
  ) {
    botao.disabled = true;
    botao.textContent =
      "Não disponível";

    mostrarStatus(
      "Este navegador não oferece suporte a notificações.",
      "danger",
    );

    return;
  }

  if (
    Notification.permission ===
    "granted"
  ) {
    botao.disabled = false;
    botao.textContent =
      "Notificações ativadas";

    mostrarStatus(
      "Este aparelho está autorizado a receber notificações.",
      "success",
    );

    return;
  }

  if (
    Notification.permission ===
    "denied"
  ) {
    botao.disabled = true;
    botao.textContent =
      "Permissão bloqueada";

    mostrarStatus(
      "As notificações foram bloqueadas nas configurações do navegador.",
      "warning",
    );

    return;
  }

  botao.disabled = false;
  botao.textContent =
    "Ativar notificações";

  mostrarStatus(
    "Toque no botão para autorizar este aparelho.",
    "info",
  );
}

function definirBotaoCarregando(
  carregando,
) {
  const botao = obterElemento(
    "btnAtivarNotificacoesAdmin",
  );

  if (!botao) {
    return;
  }

  botao.disabled = carregando;

  if (carregando) {
    botao.textContent =
      "Ativando...";
  } else {
    atualizarInterfacePermissao();
  }
}

// ============================================================================
// SERVICE WORKER E FIREBASE MESSAGING
// ============================================================================

async function obterRegistroServiceWorker() {
  if (
    !("serviceWorker" in navigator)
  ) {
    throw new Error(
      "Este navegador não oferece suporte a service worker.",
    );
  }

  /**
   * Utiliza o mesmo service-worker.js já existente no ListaLar.
   * Não será criado um segundo service worker concorrente.
   */
  const registro =
    await navigator.serviceWorker.register(
      "./service-worker.js",
      {
        scope: "./",
      },
    );

  await navigator.serviceWorker.ready;

  return registro;
}

async function obterInstanciaMessaging() {
  if (messaging) {
    return messaging;
  }

  const suportado =
    await isSupported();

  if (!suportado) {
    throw new Error(
      "O Firebase Cloud Messaging não é compatível com este navegador.",
    );
  }

  messaging = getMessaging(app);

  ativarListenerPrimeiroPlano();

  return messaging;
}

function ativarListenerPrimeiroPlano() {
  if (
    !messaging ||
    listenerPrimeiroPlanoAtivo
  ) {
    return;
  }

  listenerPrimeiroPlanoAtivo = true;

  onMessage(
    messaging,
    (mensagem) => {
      const titulo =
        textoSeguro(
          mensagem?.notification?.title,
        ) ||
        "ListaLar";

      const corpo =
        textoSeguro(
          mensagem?.notification?.body,
        ) ||
        "Você recebeu uma nova notificação administrativa.";

      mostrarStatus(
        `${titulo}: ${corpo}`,
        "success",
      );

      window.dispatchEvent(
        new CustomEvent(
          "listalar:notificacao-admin",
          {
            detail: mensagem,
          },
        ),
      );
    },
  );
}

// ============================================================================
// REGISTRO DO APARELHO
// ============================================================================

async function gerarTokenNotificacao() {
  if (!chaveVapidConfigurada()) {
    throw new Error(
      "A chave pública VAPID ainda não foi configurada.",
    );
  }

  const instanciaMessaging =
    await obterInstanciaMessaging();

  const registroServiceWorker =
    await obterRegistroServiceWorker();

  const token = await getToken(
    instanciaMessaging,
    {
      vapidKey: CHAVE_PUBLICA_VAPID,
      serviceWorkerRegistration:
        registroServiceWorker,
    },
  );

  if (!token) {
    throw new Error(
      "O Firebase não retornou o token deste aparelho.",
    );
  }

  return token;
}

async function enviarTokenParaServidor(
  token,
) {
  const resposta =
    await registrarDispositivoAdmin({
      token,

      plataforma:
        detectarPlataforma(),

      navegador:
        detectarNavegador(),

      idioma:
        navigator.language || "",

      fusoHorario:
        Intl.DateTimeFormat()
            .resolvedOptions()
            .timeZone || "",

      pwaInstalado:
        executandoComoPwa(),

      userAgent:
        navigator.userAgent || "",

      origem:
        window.location.origin,

      pagina:
        window.location.pathname,
    });

  return resposta.data || {};
}

async function registrarAparelhoAtual() {
  const token =
    await gerarTokenNotificacao();

  const resultado =
    await enviarTokenParaServidor(
      token,
    );

  localStorage.setItem(
    "listalar_notificacoes_admin_ativas",
    "true",
  );

  localStorage.setItem(
    "listalar_notificacoes_admin_atualizado_em",
    new Date().toISOString(),
  );

  return resultado;
}

// ============================================================================
// AÇÃO DO BOTÃO
// ============================================================================

async function ativarNotificacoesAdmin() {
  if (ativacaoEmAndamento) {
    return;
  }

  if (!usuarioAdministrador) {
    mostrarStatus(
      "A sessão administrativa não foi localizada.",
      "danger",
    );

    return;
  }

  ativacaoEmAndamento = true;
  definirBotaoCarregando(true);

  try {
    if (
      !("Notification" in window)
    ) {
      throw new Error(
        "Este navegador não oferece suporte a notificações.",
      );
    }

    if (
      Notification.permission ===
      "denied"
    ) {
      throw new Error(
        "A permissão foi bloqueada. Libere as notificações nas configurações do navegador.",
      );
    }

    let permissao =
      Notification.permission;

    if (permissao === "default") {
      permissao =
        await Notification.requestPermission();
    }

    if (permissao !== "granted") {
      throw new Error(
        "A autorização para notificações não foi concedida.",
      );
    }

    mostrarStatus(
      "Registrando este aparelho...",
      "info",
    );

    const resultado =
      await registrarAparelhoAtual();

    mostrarStatus(
      resultado.mensagem ||
      "Notificações ativadas neste aparelho.",
      "success",
    );

    atualizarInterfacePermissao();
  } catch (erro) {
    console.error(
      "Erro ao ativar notificações administrativas:",
      erro,
    );

    const mensagem =
      erro?.code
        ? mensagemErroFunctions(erro)
        : (
            erro?.message ||
            "Não foi possível ativar as notificações."
          );

    mostrarStatus(
      mensagem,
      "danger",
    );
  } finally {
    ativacaoEmAndamento = false;
    definirBotaoCarregando(false);
  }
}

// ============================================================================
// SINCRONIZAÇÃO AUTOMÁTICA
// ============================================================================

async function sincronizarTokenAutorizado() {
  if (
    Notification.permission !==
    "granted"
  ) {
    return;
  }

  if (!chaveVapidConfigurada()) {
    return;
  }

  try {
    await registrarAparelhoAtual();

    mostrarStatus(
      "Notificações ativas e aparelho sincronizado.",
      "success",
    );
  } catch (erro) {
    console.warn(
      "Não foi possível sincronizar automaticamente o token FCM:",
      erro,
    );

    mostrarStatus(
      "As notificações estão autorizadas, mas este aparelho precisa ser sincronizado novamente.",
      "warning",
    );
  }
}

// ============================================================================
// INICIALIZAÇÃO
// ============================================================================

async function inicializarNotificacoesAdmin(
  usuario,
) {
  usuarioAdministrador = usuario;

  aplicarEstilosNotificacoesAdmin();
  criarAreaNotificacoesAdmin();

  if (
    "Notification" in window &&
    Notification.permission ===
      "granted"
  ) {
    await sincronizarTokenAutorizado();
  }
}

onAuthStateChanged(
  auth,
  (usuario) => {
    if (!usuario) {
      usuarioAdministrador = null;
      return;
    }

    inicializarNotificacoesAdmin(
      usuario,
    );
  },
);

// Disponibiliza apenas a chamada necessária ao painel.
window.ativarNotificacoesAdmin =
  ativarNotificacoesAdmin;
