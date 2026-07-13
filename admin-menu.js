// ==========================================
// ListaLar - Menu Administrativo
// Mostra o botão Admin somente para usuários
// que possuem admin: true no Firestore.
// ==========================================

import {
  getApps,
  getApp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";

import {
  getAuth,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
  getFirestore,
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const ID_BOTAO_ADMIN = "tab-admin";
const PAGINA_ADMIN = "./admin.html";

let observadorIniciado = false;

/**
 * Aguarda o Firebase principal do ListaLar ser inicializado.
 */
async function aguardarFirebase(
  tentativas = 100,
  intervalo = 100
) {
  for (
    let tentativa = 0;
    tentativa < tentativas;
    tentativa++
  ) {
    if (getApps().length > 0) {
      return getApp();
    }

    await new Promise((resolve) => {
      window.setTimeout(resolve, intervalo);
    });
  }

  throw new Error(
    "O Firebase do ListaLar não foi inicializado."
  );
}

/**
 * Localiza o menu inferior do aplicativo.
 */
function obterMenuInferior() {
  return document.querySelector(".bottom-nav");
}

/**
 * Ajusta automaticamente a quantidade de colunas do menu.
 */
function ajustarColunasMenu() {
  const menu = obterMenuInferior();

  if (!menu) {
    return;
  }

  const quantidadeBotoes =
    menu.querySelectorAll(".tab").length;

  menu.style.gridTemplateColumns =
    `repeat(${Math.max(quantidadeBotoes, 1)}, minmax(0, 1fr))`;
}

/**
 * Remove o botão Admin quando o usuário não possui acesso.
 */
function removerBotaoAdmin() {
  const botao =
    document.getElementById(ID_BOTAO_ADMIN);

  if (botao) {
    botao.remove();
  }

  ajustarColunasMenu();
}

/**
 * Abre a página administrativa.
 */
function abrirPainelAdmin() {
  window.location.href = PAGINA_ADMIN;
}

/**
 * Cria o botão Admin no menu inferior.
 */
function criarBotaoAdmin() {
  if (document.getElementById(ID_BOTAO_ADMIN)) {
    return;
  }

  const menu = obterMenuInferior();

  if (!menu) {
    console.warn(
      "Menu inferior não encontrado. " +
      "O botão Admin não foi criado."
    );

    return;
  }

  const botao = document.createElement("button");

  botao.id = ID_BOTAO_ADMIN;
  botao.type = "button";
  botao.className = "tab";

  botao.setAttribute(
    "aria-label",
    "Abrir painel administrativo"
  );

  botao.innerHTML = `
    <span class="ico">⚙️</span>
    <span>Admin</span>
  `;

  botao.addEventListener(
    "click",
    abrirPainelAdmin
  );

  menu.appendChild(botao);

  ajustarColunasMenu();
}

/**
 * Consulta no Firestore se o usuário possui admin: true.
 */
async function usuarioEhAdmin(usuario) {
  if (!usuario?.uid) {
    return false;
  }

  try {
    const db = getFirestore();

    const referenciaUsuario = doc(
      db,
      "usuarios",
      usuario.uid
    );

    const snapshotUsuario =
      await getDoc(referenciaUsuario);

    if (!snapshotUsuario.exists()) {
      return false;
    }

    const dadosUsuario =
      snapshotUsuario.data();

    return dadosUsuario.admin === true;
  } catch (erro) {
    console.error(
      "Erro ao verificar permissão administrativa:",
      erro
    );

    return false;
  }
}

/**
 * Verifica o usuário conectado e controla o botão Admin.
 */
async function verificarAcessoAdmin(usuario) {
  removerBotaoAdmin();

  if (!usuario) {
    return;
  }

  const possuiAcesso =
    await usuarioEhAdmin(usuario);

  if (possuiAcesso) {
    criarBotaoAdmin();
  }
}

/**
 * Inicializa o módulo administrativo.
 */
async function inicializarMenuAdmin() {
  if (observadorIniciado) {
    return;
  }

  try {
    await aguardarFirebase();

    const auth = getAuth();

    observadorIniciado = true;

    onAuthStateChanged(
      auth,
      async (usuario) => {
        await verificarAcessoAdmin(usuario);
      }
    );
  } catch (erro) {
    console.error(
      "Não foi possível iniciar o menu administrativo:",
      erro
    );

    removerBotaoAdmin();
  }
}

/**
 * Aguarda o HTML carregar.
 */
if (document.readyState === "loading") {
  document.addEventListener(
    "DOMContentLoaded",
    inicializarMenuAdmin,
    {
      once: true
    }
  );
} else {
  inicializarMenuAdmin();
}
