/**
 * ============================================================================
 * LISTALAR - NOTIFICAÇÕES ADMINISTRATIVAS
 * Arquivo: notificacoes-admin.js
 * ============================================================================
 *
 * Responsabilidades:
 * - Ligar o botão existente na aba Ajustes.
 * - Solicitar permissão de notificações.
 * - Registrar o service worker exclusivo das notificações administrativas.
 * - Gerar o token do Firebase Cloud Messaging.
 * - Enviar o token para a Cloud Function registrarDispositivoAdmin.
 * - Atualizar o texto e o estado do botão.
 */

import {
  app,
  auth
} from "./firebase-config.js";

import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
  getFunctions,
  httpsCallable
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-functions.js";

import {
  getMessaging,
  getToken,
  isSupported,
  onMessage
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging.js";


// ============================================================================
// CONFIGURAÇÕES
// ============================================================================

const REGIAO_FUNCOES =
  "southamerica-east1";

const CHAVE_PUBLICA_VAPID =
  "BP6CuPfL918ej5k3JtJZFB1KlJIi24krhr9RVeLOsiO9cRC-FVqy8fClDVRWorxqbtO4HROZnOqGakFyYMCZFyE";

const NOME_SERVICE_WORKER =
  "./notificacoes-admin-sw.js";

/*
 * Usa um escopo próprio para não substituir o
 * service-worker.js principal do PWA.
 */
const ESCOPO_SERVICE_WORKER =
  "./notificacoes-admin/";

const functions = getFunctions(
  app,
  REGIAO_FUNCOES
);

const registrarDispositivoAdmin =
  httpsCallable(
    functions,
    "registrarDispositivoAdmin"
  );


// ============================================================================
// ESTADO
// ============================================================================

let usuarioAdministrador = null;
let messaging = null;
let ativacaoEmAndamento = false;
let listenerPrimeiroPlanoAtivo = false;
let eventosConfigurados = false;


// ============================================================================
// ELEMENTOS E UTILIDADES
// ============================================================================

function elemento(id) {
  return document.getElementById(id);
}

function textoSeguro(valor) {
  return String(valor ?? "").trim();
}

function chaveVapidConfigurada() {
  return (
    textoSeguro(CHAVE_PUBLICA_VAPID) !== "" &&
    CHAVE_PUBLICA_VAPID !==
      "COLE_AQUI_A_CHAVE_PUBLICA_VAPID"
  );
}

function executandoComoPwa() {
  const modoStandalone =
    window.matchMedia(
      "(display-mode: standalone)"
    ).matches;

  const standaloneIos =
    window.navigator.standalone === true;

  return (
    modoStandalone ||
    standaloneIos
  );
}

function detectarPlataforma() {
  const userAgent =
    navigator.userAgent || "";

  if (/android/i.test(userAgent)) {
    return "Android";
  }

  if (
    /iphone|ipad|ipod/i.test(userAgent)
  ) {
    return "iOS";
  }

  if (/windows/i.test(userAgent)) {
    return "Windows";
  }

  if (
    /macintosh|mac os x/i.test(userAgent)
  ) {
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
    !/chrome|crios|android/i.test(
      userAgent
    )
  ) {
    return "Safari";
  }

  return "Navegador não identificado";
}

function mensagemErroFunctions(erro) {
  const codigo =
    textoSeguro(erro?.code);

  const mensagemServidor =
    textoSeguro(erro?.message);

  const mensagens = {
    "functions/unauthenticated":
      "Sua sessão administrativa não está autenticada.",

    "functions/permission-denied":
      "Somente o administrador do sistema pode registrar este aparelho.",

    "functions/invalid-argument":
      "O token de notificação recebido é inválido.",

    "functions/not-found":
      "A função registrarDispositivoAdmin ainda não foi publicada.",

    "functions/internal":
      "O servidor não conseguiu registrar este aparelho.",

    "functions/unavailable":
      "O serviço está temporariamente indisponível."
  };

  return (
    mensagens[codigo] ||
    mensagemServidor ||
    "Não foi possível ativar as notificações."
  );
}

function mostrarStatus(
  mensagem,
  tipo = "info"
) {
  const status = elemento(
    "statusNotificacoesAdmin"
  );

  if (!status) {
    return;
  }

  status.textContent =
    mensagem;

  status.dataset.tipo =
    tipo;
}

function definirBotao({
  texto,
  desabilitado = false
}) {
  const botao = elemento(
    "btnAtivarNotificacoesAdmin"
  );

  if (!botao) {
    return;
  }

  botao.textContent =
    texto;

  botao.disabled =
    desabilitado;
}

function formatarDataAtivacao() {
  const valor = localStorage.getItem(
    "listalar_notificacoes_admin_atualizado_em"
  );

  if (!valor) {
    return "";
  }

  const data =
    new Date(valor);

  if (
    Number.isNaN(
      data.getTime()
    )
  ) {
    return "";
  }

  return new Intl.DateTimeFormat(
    "pt-BR",
    {
      dateStyle: "short",
      timeStyle: "short"
    }
  ).format(data);
}


// ============================================================================
// INTERFACE
// ============================================================================

function atualizarInterfacePermissao() {
  const botao = elemento(
    "btnAtivarNotificacoesAdmin"
  );

  if (!botao) {
    return;
  }

  if (
    !("Notification" in window)
  ) {
    definirBotao({
      texto:
        "Notificações não disponíveis",
      desabilitado: true
    });

    mostrarStatus(
      "Este navegador não oferece suporte a notificações.",
      "danger"
    );

    return;
  }

  if (
    Notification.permission ===
    "denied"
  ) {
    definirBotao({
      texto: "Permissão bloqueada",
      desabilitado: true
    });

    mostrarStatus(
      "As notificações foram bloqueadas. Libere a permissão nas configurações do navegador.",
      "warning"
    );

    return;
  }

  if (
    Notification.permission ===
    "granted"
  ) {
    const ativadoEm =
      formatarDataAtivacao();

    definirBotao({
      texto:
        "🔄 Sincronizar notificações",
      desabilitado: false
    });

    mostrarStatus(
      ativadoEm
        ? `✅ Notificações autorizadas neste dispositivo. Última sincronização: ${ativadoEm}.`
        : "✅ Notificações autorizadas. Toque no botão para registrar este dispositivo.",
      "success"
    );

    return;
  }

  definirBotao({
    texto:
      "🔔 Ativar notificações",
    desabilitado: false
  });

  mostrarStatus(
    "Clique no botão para autorizar as notificações neste dispositivo.",
    "info"
  );
}

function definirBotaoCarregando(
  carregando
) {
  if (carregando) {
    definirBotao({
      texto: "Ativando...",
      desabilitado: true
    });

    return;
  }

  atualizarInterfacePermissao();
}

function configurarEventoBotao() {
  if (eventosConfigurados) {
    return;
  }

  const botao = elemento(
    "btnAtivarNotificacoesAdmin"
  );

  if (!botao) {
    console.warn(
      "O botão btnAtivarNotificacoesAdmin não foi encontrado no admin.html."
    );

    return;
  }

  botao.addEventListener(
    "click",
    ativarNotificacoesAdmin
  );

  eventosConfigurados = true;
}


// ============================================================================
// FIREBASE MESSAGING E SERVICE WORKER
// ============================================================================

async function obterRegistroServiceWorker() {
  if (
    !("serviceWorker" in navigator)
  ) {
    throw new Error(
      "Este navegador não oferece suporte a service worker."
    );
  }

  const registro =
    await navigator.serviceWorker.register(
      NOME_SERVICE_WORKER,
      {
        scope:
          ESCOPO_SERVICE_WORKER
      }
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
      "O Firebase Cloud Messaging não é compatível com este navegador."
    );
  }

  messaging =
    getMessaging(app);

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

  listenerPrimeiroPlanoAtivo =
    true;

  onMessage(
    messaging,
    (mensagem) => {
      const titulo =
        textoSeguro(
          mensagem?.notification?.title
        ) ||
        "ListaLar";

      const corpo =
        textoSeguro(
          mensagem?.notification?.body
        ) ||
        "Você recebeu uma nova notificação administrativa.";

      mostrarStatus(
        `${titulo}: ${corpo}`,
        "success"
      );

      window.dispatchEvent(
        new CustomEvent(
          "listalar:notificacao-admin",
          {
            detail: mensagem
          }
        )
      );
    }
  );
}

async function gerarTokenNotificacao() {
  if (
    !chaveVapidConfigurada()
  ) {
    throw new Error(
      "A chave pública VAPID ainda não foi configurada."
    );
  }

  const instanciaMessaging =
    await obterInstanciaMessaging();

  const registroServiceWorker =
    await obterRegistroServiceWorker();

  const token =
    await getToken(
      instanciaMessaging,
      {
        vapidKey:
          CHAVE_PUBLICA_VAPID,

        serviceWorkerRegistration:
          registroServiceWorker
      }
    );

  if (!token) {
    throw new Error(
      "O Firebase não retornou o token deste dispositivo."
    );
  }

  return token;
}

async function enviarTokenParaServidor(
  token
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
        window.location.pathname
    });

  return resposta.data || {};
}

async function registrarAparelhoAtual() {
  const token =
    await gerarTokenNotificacao();

  const resultado =
    await enviarTokenParaServidor(
      token
    );

  const atualizadoEm =
    new Date().toISOString();

  localStorage.setItem(
    "listalar_notificacoes_admin_ativas",
    "true"
  );

  localStorage.setItem(
    "listalar_notificacoes_admin_atualizado_em",
    atualizadoEm
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
      "A sessão administrativa ainda não foi localizada.",
      "danger"
    );

    return;
  }

  ativacaoEmAndamento =
    true;

  definirBotaoCarregando(
    true
  );

  try {
    if (
      !("Notification" in window)
    ) {
      throw new Error(
        "Este navegador não oferece suporte a notificações."
      );
    }

    if (
      Notification.permission ===
      "denied"
    ) {
      throw new Error(
        "A permissão foi bloqueada. Libere as notificações nas configurações do navegador."
      );
    }

    let permissao =
      Notification.permission;

    if (
      permissao === "default"
    ) {
      permissao =
        await Notification
          .requestPermission();
    }

    if (
      permissao !== "granted"
    ) {
      throw new Error(
        "A autorização para notificações não foi concedida."
      );
    }

    mostrarStatus(
      "Gerando o token e registrando este dispositivo...",
      "info"
    );

    const resultado =
      await registrarAparelhoAtual();

    mostrarStatus(
      resultado.mensagem ||
        "✅ Notificações ativadas e dispositivo registrado.",
      "success"
    );
  } catch (erro) {
    console.error(
      "Erro ao ativar notificações administrativas:",
      erro
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
      "danger"
    );
  } finally {
    ativacaoEmAndamento =
      false;

    definirBotaoCarregando(
      false
    );
  }
}


// ============================================================================
// INICIALIZAÇÃO
// ============================================================================

function inicializarInterface() {
  configurarEventoBotao();
  atualizarInterfacePermissao();
}

onAuthStateChanged(
  auth,
  (usuario) => {
    usuarioAdministrador =
      usuario || null;

    inicializarInterface();
  }
);

if (
  document.readyState === "loading"
) {
  document.addEventListener(
    "DOMContentLoaded",
    inicializarInterface,
    {
      once: true
    }
  );
} else {
  inicializarInterface();
}

window.ativarNotificacoesAdmin =
  ativarNotificacoesAdmin;
