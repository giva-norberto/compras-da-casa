// ============================================================================
// LISTALAR - EXCLUSÕES ADMINISTRATIVAS
// ARQUIVO: admin-exclusoes.js
//
// ETAPA 1:
// Exclusão administrativa de usuário.
//
// DIRETRIZES:
// - Não altera o index.html.
// - Não altera a lógica do admin.js.
// - Cria uma área própria dentro da seção Usuários.
// - O navegador apenas solicita a exclusão.
// - A limpeza real é executada pela Cloud Function.
// ============================================================================

import {
  app,
  auth,
  db
} from "./firebase-config.js";

import {
  collection,
  doc,
  getDoc,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
  getFunctions,
  httpsCallable
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-functions.js";

// Deve ser a mesma região configurada em functions/index.js.
const REGIAO_FUNCOES =
  "southamerica-east1";

const functions = getFunctions(
  app,
  REGIAO_FUNCOES
);

const solicitarExclusaoUsuario =
  httpsCallable(
    functions,
    "excluirUsuarioAdministrativo"
  );

let usuarioAdministrador = null;
let usuariosExclusao = [];
let exclusaoEmAndamento = false;

// ============================================================================
// UTILIDADES
// ============================================================================

function textoSeguro(valor) {
  return String(valor || "").trim();
}

function normalizarTexto(valor) {
  return textoSeguro(valor)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function obterElemento(id) {
  return document.getElementById(id);
}

function mostrarStatus(
  mensagem,
  tipo = "info"
) {
  const status = obterElemento(
    "statusExclusaoUsuario"
  );

  if (!status) {
    return;
  }

  status.textContent = mensagem || "";
  status.dataset.tipo = tipo;
}

function mensagemErroFunctions(erro) {
  const codigo = textoSeguro(
    erro?.code
  );

  const mensagemServidor = textoSeguro(
    erro?.message
  );

  const mensagens = {
    "functions/unauthenticated":
      "Sua sessão não está autenticada.",

    "functions/permission-denied":
      "Sua conta não possui autorização administrativa.",

    "functions/invalid-argument":
      "O usuário informado é inválido.",

    "functions/not-found":
      "O usuário não foi encontrado.",

    "functions/failed-precondition":
      mensagemServidor ||
      "Este usuário não pode ser excluído individualmente.",

    "functions/internal":
      mensagemServidor ||
      "O servidor não conseguiu concluir a exclusão.",

    "functions/unavailable":
      "O serviço está temporariamente indisponível. Tente novamente."
  };

  return (
    mensagens[codigo] ||
    mensagemServidor ||
    "Não foi possível excluir o usuário."
  );
}

function formatarPapel(usuario) {
  if (usuario.adminSistema === true) {
    return "Administrador do sistema";
  }

  if (
    normalizarTexto(usuario.papel) ===
    "admin"
  ) {
    return "Administrador da família";
  }

  return "Membro";
}

function usuarioProtegido(usuario) {
  if (!usuarioAdministrador) {
    return true;
  }

  if (
    usuario.id ===
    usuarioAdministrador.uid
  ) {
    return true;
  }

  if (usuario.adminSistema === true) {
    return true;
  }

  return (
    normalizarTexto(usuario.papel) ===
    "admin"
  );
}

function motivoProtecao(usuario) {
  if (
    usuario.id ===
    usuarioAdministrador?.uid
  ) {
    return "Sua conta administrativa";
  }

  if (usuario.adminSistema === true) {
    return "Administrador do sistema";
  }

  if (
    normalizarTexto(usuario.papel) ===
    "admin"
  ) {
    return "Excluir junto com a família";
  }

  return "";
}

// ============================================================================
// ESTILO EXCLUSIVO DO MÓDULO
// ============================================================================

function aplicarEstilosExclusao() {
  if (
    document.getElementById(
      "adminExclusoesStyles"
    )
  ) {
    return;
  }

  const style =
    document.createElement("style");

  style.id = "adminExclusoesStyles";

  style.textContent = `
    .admin-delete-card {
      margin-top: 18px;
    }

    .admin-delete-alert {
      margin: 14px 0;
      padding: 12px 14px;
      border: 1px solid #fecaca;
      border-radius: 12px;
      background: #fef2f2;
      color: #991b1b;
      font-size: 0.92rem;
      line-height: 1.45;
    }

    .admin-delete-search {
      display: flex;
      gap: 10px;
      align-items: center;
      margin-bottom: 14px;
    }

    .admin-delete-search input {
      width: 100%;
      min-width: 0;
    }

    .admin-delete-list {
      display: grid;
      gap: 10px;
    }

    .admin-delete-user {
      display: flex;
      justify-content: space-between;
      gap: 14px;
      align-items: center;
      padding: 13px;
      border: 1px solid #e5e7eb;
      border-radius: 12px;
      background: #ffffff;
    }

    .admin-delete-user-info {
      min-width: 0;
      flex: 1;
    }

    .admin-delete-user-info strong {
      display: block;
      color: #111827;
      margin-bottom: 3px;
      overflow-wrap: anywhere;
    }

    .admin-delete-user-info span {
      display: block;
      color: #6b7280;
      font-size: 0.86rem;
      line-height: 1.4;
      overflow-wrap: anywhere;
    }

    .admin-delete-user-meta {
      margin-top: 6px;
    }

    .admin-delete-button {
      flex: 0 0 auto;
      border: 0;
      border-radius: 10px;
      padding: 10px 13px;
      background: #dc2626;
      color: #ffffff;
      font-weight: 700;
      cursor: pointer;
    }

    .admin-delete-button:hover {
      background: #b91c1c;
    }

    .admin-delete-button:disabled {
      cursor: not-allowed;
      opacity: 0.55;
    }

    .admin-delete-protected {
      flex: 0 0 auto;
      border-radius: 999px;
      padding: 7px 10px;
      background: #f3f4f6;
      color: #4b5563;
      font-size: 0.76rem;
      font-weight: 700;
      text-align: center;
    }

    #statusExclusaoUsuario {
      min-height: 20px;
      margin: 10px 0;
      font-size: 0.9rem;
      font-weight: 600;
    }

    #statusExclusaoUsuario[data-tipo="success"] {
      color: #15803d;
    }

    #statusExclusaoUsuario[data-tipo="danger"] {
      color: #b91c1c;
    }

    #statusExclusaoUsuario[data-tipo="info"] {
      color: #475569;
    }

    @media (max-width: 640px) {
      .admin-delete-user {
        align-items: stretch;
        flex-direction: column;
      }

      .admin-delete-button {
        width: 100%;
      }

      .admin-delete-protected {
        align-self: flex-start;
      }
    }
  `;

  document.head.appendChild(style);
}

// ============================================================================
// CRIAÇÃO DA ÁREA ADMINISTRATIVA
// ============================================================================

function criarAreaExclusaoUsuario() {
  if (
    document.getElementById(
      "areaExclusaoUsuarioAdmin"
    )
  ) {
    return;
  }

  const secaoUsuarios =
    document.getElementById(
      "secao-usuarios"
    );

  if (!secaoUsuarios) {
    console.warn(
      "A seção de usuários não foi localizada."
    );

    return;
  }

  const card = document.createElement(
    "div"
  );

  card.id = "areaExclusaoUsuarioAdmin";
  card.className =
    "admin-card admin-delete-card";

  card.innerHTML = `
    <div class="card-title">
      <div>
        <h3>🗑️ Exclusão administrativa</h3>

        <p>
          Remove o membro da família, o cadastro do
          Firestore e a conta de acesso.
        </p>
      </div>

      <button
        id="btnAtualizarExclusaoUsuarios"
        type="button"
        class="btn btn-secondary"
      >
        ↻ Atualizar
      </button>
    </div>

    <div class="admin-delete-alert">
      Esta ação é permanente. Administradores do sistema
      e proprietários de família não podem ser excluídos
      individualmente.
    </div>

    <div class="admin-delete-search">
      <input
        id="buscaExclusaoUsuarios"
        type="search"
        placeholder="🔎 Buscar usuário para excluir"
        autocomplete="off"
      >
    </div>

    <p
      id="statusExclusaoUsuario"
      data-tipo="info"
    ></p>

    <div
      id="listaExclusaoUsuarios"
      class="admin-delete-list"
    >
      <div class="empty-state">
        Carregando usuários...
      </div>
    </div>
  `;

  secaoUsuarios.appendChild(card);

  obterElemento(
    "btnAtualizarExclusaoUsuarios"
  )?.addEventListener(
    "click",
    carregarUsuariosExclusao
  );

  obterElemento(
    "buscaExclusaoUsuarios"
  )?.addEventListener(
    "input",
    renderizarUsuariosExclusao
  );

  obterElemento(
    "listaExclusaoUsuarios"
  )?.addEventListener(
    "click",
    tratarCliqueListaUsuarios
  );
}

// ============================================================================
// VALIDAÇÃO DO ADMINISTRADOR
// ============================================================================

async function confirmarAcessoAdministrativo(
  usuario
) {
  if (!usuario) {
    return false;
  }

  const usuarioRef = doc(
    db,
    "usuarios",
    usuario.uid
  );

  const usuarioSnap =
    await getDoc(usuarioRef);

  if (!usuarioSnap.exists()) {
    return false;
  }

  return (
    usuarioSnap.data()?.adminSistema ===
    true
  );
}

// ============================================================================
// CARREGAMENTO E RENDERIZAÇÃO
// ============================================================================

async function carregarUsuariosExclusao() {
  const lista = obterElemento(
    "listaExclusaoUsuarios"
  );

  if (!lista) {
    return;
  }

  lista.innerHTML = `
    <div class="empty-state">
      Carregando usuários...
    </div>
  `;

  mostrarStatus(
    "Atualizando lista de usuários...",
    "info"
  );

  try {
    const usuariosSnap = await getDocs(
      collection(db, "usuarios")
    );

    usuariosExclusao =
      usuariosSnap.docs.map(
        (usuarioSnap) => ({
          id: usuarioSnap.id,
          ...usuarioSnap.data()
        })
      );

    usuariosExclusao.sort(
      (usuarioA, usuarioB) => {
        const nomeA =
          textoSeguro(
            usuarioA.nome ||
            usuarioA.email ||
            usuarioA.id
          );

        const nomeB =
          textoSeguro(
            usuarioB.nome ||
            usuarioB.email ||
            usuarioB.id
          );

        return nomeA.localeCompare(
          nomeB,
          "pt-BR"
        );
      }
    );

    mostrarStatus(
      `${usuariosExclusao.length} usuário(s) localizado(s).`,
      "info"
    );

    renderizarUsuariosExclusao();
  } catch (erro) {
    console.error(
      "Erro ao carregar usuários para exclusão:",
      erro
    );

    lista.innerHTML = `
      <div class="empty-state">
        Não foi possível carregar os usuários.
      </div>
    `;

    mostrarStatus(
      "Falha ao consultar os usuários.",
      "danger"
    );
  }
}

function criarLinhaUsuario(usuario) {
  const linha = document.createElement(
    "div"
  );

  linha.className = "admin-delete-user";

  const informacoes =
    document.createElement("div");

  informacoes.className =
    "admin-delete-user-info";

  const nome = document.createElement(
    "strong"
  );

  nome.textContent =
    textoSeguro(usuario.nome) ||
    "Usuário sem nome";

  const email = document.createElement(
    "span"
  );

  email.textContent =
    textoSeguro(usuario.email) ||
    "E-mail não informado";

  const detalhes =
    document.createElement("span");

  detalhes.className =
    "admin-delete-user-meta";

  detalhes.textContent =
    `${formatarPapel(usuario)} · ` +
    `Família: ${
      textoSeguro(usuario.familiaId) ||
      "não informada"
    }`;

  const uid = document.createElement(
    "span"
  );

  uid.textContent =
    `UID: ${usuario.id}`;

  informacoes.append(
    nome,
    email,
    detalhes,
    uid
  );

  linha.appendChild(informacoes);

  if (usuarioProtegido(usuario)) {
    const protegido =
      document.createElement("span");

    protegido.className =
      "admin-delete-protected";

    protegido.textContent =
      motivoProtecao(usuario);

    linha.appendChild(protegido);

    return linha;
  }

  const botao = document.createElement(
    "button"
  );

  botao.type = "button";
  botao.className =
    "admin-delete-button";

  botao.dataset.uid = usuario.id;
  botao.textContent = "Excluir usuário";

  linha.appendChild(botao);

  return linha;
}

function renderizarUsuariosExclusao() {
  const lista = obterElemento(
    "listaExclusaoUsuarios"
  );

  if (!lista) {
    return;
  }

  const termo = normalizarTexto(
    obterElemento(
      "buscaExclusaoUsuarios"
    )?.value
  );

  const usuariosFiltrados =
    usuariosExclusao.filter(
      (usuario) => {
        if (!termo) {
          return true;
        }

        const conteudo = normalizarTexto(
          [
            usuario.nome,
            usuario.email,
            usuario.familiaId,
            usuario.papel,
            usuario.id
          ].join(" ")
        );

        return conteudo.includes(termo);
      }
    );

  lista.innerHTML = "";

  if (
    usuariosFiltrados.length === 0
  ) {
    const vazio =
      document.createElement("div");

    vazio.className = "empty-state";
    vazio.textContent =
      "Nenhum usuário encontrado.";

    lista.appendChild(vazio);

    return;
  }

  const fragmento =
    document.createDocumentFragment();

  usuariosFiltrados.forEach(
    (usuario) => {
      fragmento.appendChild(
        criarLinhaUsuario(usuario)
      );
    }
  );

  lista.appendChild(fragmento);
}

// ============================================================================
// EXCLUSÃO
// ============================================================================

async function tratarCliqueListaUsuarios(
  evento
) {
  const botao = evento.target.closest(
    ".admin-delete-button"
  );

  if (!botao) {
    return;
  }

  const uid = textoSeguro(
    botao.dataset.uid
  );

  if (!uid) {
    return;
  }

  const usuario =
    usuariosExclusao.find(
      (item) => item.id === uid
    );

  if (!usuario) {
    window.alert(
      "O usuário selecionado não foi localizado."
    );

    return;
  }

  await confirmarExclusaoUsuario(
    usuario,
    botao
  );
}

async function confirmarExclusaoUsuario(
  usuario,
  botao
) {
  if (exclusaoEmAndamento) {
    return;
  }

  const nome =
    textoSeguro(usuario.nome) ||
    "Usuário sem nome";

  const email =
    textoSeguro(usuario.email) ||
    "E-mail não informado";

  const primeiraConfirmacao =
    window.confirm(
      `EXCLUSÃO PERMANENTE\n\n` +
      `Usuário: ${nome}\n` +
      `E-mail: ${email}\n\n` +
      `A conta de acesso e os registros vinculados ` +
      `serão removidos.\n\n` +
      `Deseja continuar?`
    );

  if (!primeiraConfirmacao) {
    return;
  }

  const confirmacaoDigitada =
    window.prompt(
      `Para confirmar a exclusão de "${nome}", ` +
      `digite exatamente:\n\nEXCLUIR`
    );

  if (
    textoSeguro(confirmacaoDigitada)
      .toUpperCase() !== "EXCLUIR"
  ) {
    mostrarStatus(
      "Exclusão cancelada: confirmação incorreta.",
      "info"
    );

    return;
  }

  exclusaoEmAndamento = true;

  const textoOriginal =
    botao.textContent;

  botao.disabled = true;
  botao.textContent = "Excluindo...";

  mostrarStatus(
    `Excluindo ${nome}...`,
    "info"
  );

  try {
    const resposta =
      await solicitarExclusaoUsuario({
        uid: usuario.id
      });

    const resultado =
      resposta.data || {};

    mostrarStatus(
      resultado.mensagem ||
      "Usuário excluído com sucesso.",
      "success"
    );

    window.alert(
      `Usuário excluído com sucesso.\n\n` +
      `Nome: ${nome}\n` +
      `E-mail: ${email}\n` +
      `Vínculos de família removidos: ` +
      `${resultado.membrosRemovidos || 0}\n` +
      `Convites removidos: ` +
      `${resultado.convitesRemovidos || 0}`
    );

    await carregarUsuariosExclusao();

    if (
      typeof window.carregarUsuarios ===
      "function"
    ) {
      await window.carregarUsuarios();
    }

    if (
      typeof window.carregarDashboard ===
      "function"
    ) {
      await window.carregarDashboard();
    }
  } catch (erro) {
    console.error(
      "Erro ao excluir usuário:",
      erro
    );

    const mensagem =
      mensagemErroFunctions(erro);

    mostrarStatus(
      mensagem,
      "danger"
    );

    window.alert(
      `Não foi possível excluir o usuário.\n\n${mensagem}`
    );
  } finally {
    exclusaoEmAndamento = false;

    if (document.body.contains(botao)) {
      botao.disabled = false;
      botao.textContent =
        textoOriginal;
    }
  }
}

// ============================================================================
// INICIALIZAÇÃO
// ============================================================================

async function inicializarExclusoesAdmin(
  usuario
) {
  try {
    const autorizado =
      await confirmarAcessoAdministrativo(
        usuario
      );

    if (!autorizado) {
      console.warn(
        "Área de exclusões não autorizada."
      );

      return;
    }

    usuarioAdministrador = usuario;

    aplicarEstilosExclusao();
    criarAreaExclusaoUsuario();

    await carregarUsuariosExclusao();
  } catch (erro) {
    console.error(
      "Erro ao inicializar exclusões administrativas:",
      erro
    );
  }
}

onAuthStateChanged(
  auth,
  (usuario) => {
    if (!usuario) {
      usuarioAdministrador = null;
      return;
    }

    inicializarExclusoesAdmin(
      usuario
    );
  }
);

// Ponte opcional para atualização manual pelo painel.
window.carregarUsuariosExclusaoAdmin =
  carregarUsuariosExclusao;
