// ==========================================
// ListaLar - Painel Administrativo
// Arquivo: admin.js
// ==========================================

import {
  initializeApp,
  getApps,
  getApp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";

import {
  getAuth,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";


// ==========================================
// Configuração do Firebase
// ==========================================

const firebaseConfig = {
  apiKey: "AIzaSyC2U7q5HupxKyI3QiAyan-2Sio55NSir0Y",
  authDomain: "compras-da-casa.firebaseapp.com",
  projectId: "compras-da-casa",
  storageBucket: "compras-da-casa.firebasestorage.app",
  messagingSenderId: "63765433273",
  appId: "1:63765433273:web:c478a3dd33ef3cd55a0468"
};


// Evita inicializar o Firebase duas vezes.
const app = getApps().length > 0
  ? getApp()
  : initializeApp(firebaseConfig);

const auth = getAuth(app);
const db = getFirestore(app);


// ==========================================
// Referências administrativas
// ==========================================

const REFERENCIA_COMUNICADO = doc(
  db,
  "configuracoes",
  "comunicadoGeral"
);

const REFERENCIA_CONFIGURACOES = doc(
  db,
  "configuracoes",
  "geral"
);


// ==========================================
// Estado do painel
// ==========================================

let usuarioAdminAtual = null;

let familiasCarregadas = [];
let usuariosCarregados = [];

let painelInicializado = false;
let acaoDepoisDoModal = null;


// ==========================================
// Funções auxiliares
// ==========================================

function elemento(id) {
  return document.getElementById(id);
}

function escaparHtml(valor) {
  return String(valor ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function textoNormalizado(valor) {
  return String(valor ?? "")
    .trim()
    .toLocaleLowerCase("pt-BR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function obterData(valor) {
  if (!valor) {
    return null;
  }

  try {
    if (typeof valor.toDate === "function") {
      return valor.toDate();
    }

    if (typeof valor.seconds === "number") {
      return new Date(valor.seconds * 1000);
    }

    const data = new Date(valor);

    if (!Number.isNaN(data.getTime())) {
      return data;
    }
  } catch (erro) {
    console.warn("Data inválida:", erro);
  }

  return null;
}

function obterTempoData(valor) {
  const data = obterData(valor);
  return data ? data.getTime() : 0;
}

function formatarData(valor) {
  const data = obterData(valor);

  if (!data) {
    return "Data não informada";
  }

  return new Intl.DateTimeFormat(
    "pt-BR",
    {
      dateStyle: "short",
      timeStyle: "short"
    }
  ).format(data);
}

function obterDataFamilia(familia) {
  return (
    familia.atualizadaEm ||
    familia.atualizadoEm ||
    familia.criadaEm ||
    familia.criadoEm ||
    familia.createdAt ||
    null
  );
}

function obterDataUsuario(usuario) {
  return (
    usuario.atualizadoEm ||
    usuario.criadoEm ||
    usuario.criadaEm ||
    usuario.createdAt ||
    null
  );
}

function obterNomeFamilia(familia) {
  return (
    familia.nome ||
    familia.nomeFamilia ||
    familia.titulo ||
    "Família sem nome"
  );
}

function obterNomeUsuario(usuario) {
  return (
    usuario.nome ||
    usuario.displayName ||
    usuario.nomeCompleto ||
    usuario.email ||
    "Usuário sem nome"
  );
}

function obterFotoUsuario(usuario) {
  return (
    usuario.fotoUrl ||
    usuario.photoURL ||
    usuario.foto ||
    ""
  );
}

function primeiraLetra(valor) {
  const texto = String(valor || "?").trim();

  if (!texto) {
    return "?";
  }

  return texto.charAt(0).toUpperCase();
}

function mensagemErro(erro) {
  if (erro?.code === "permission-denied") {
    return (
      "O Firestore bloqueou esta operação. " +
      "Verifique se as regras permitem acesso para " +
      "usuários com adminSistema igual a true."
    );
  }

  if (erro?.code === "unavailable") {
    return (
      "O Firebase está temporariamente indisponível. " +
      "Verifique sua conexão e tente novamente."
    );
  }

  return (
    erro?.message ||
    "Ocorreu um erro inesperado."
  );
}

function definirLoader(texto) {
  const paragrafo = document.querySelector(
    "#adminLoader p"
  );

  if (paragrafo) {
    paragrafo.textContent = texto;
  }
}

function exibirPainel() {
  elemento("adminLoader")?.classList.add("hidden");
  elemento("adminApp")?.classList.remove("hidden");
}

function ocultarPainel() {
  elemento("adminApp")?.classList.add("hidden");
  elemento("adminLoader")?.classList.remove("hidden");
}


// ==========================================
// Modal administrativo
// ==========================================

function abrirAdminModal({
  titulo = "Aviso",
  texto = "",
  icone = "ℹ️",
  textoBotao = "OK",
  depoisDeFechar = null
} = {}) {
  const modal = elemento("adminModal");

  if (!modal) {
    window.alert(texto);
    return;
  }

  elemento("adminModalTitle").textContent = titulo;
  elemento("adminModalText").textContent = texto;
  elemento("adminModalIcon").textContent = icone;
  elemento("adminModalButton").textContent = textoBotao;

  acaoDepoisDoModal =
    typeof depoisDeFechar === "function"
      ? depoisDeFechar
      : null;

  modal.classList.add("active");
}

window.fecharAdminModal = function() {
  elemento("adminModal")?.classList.remove("active");

  const acao = acaoDepoisDoModal;
  acaoDepoisDoModal = null;

  if (acao) {
    acao();
  }
};


// ==========================================
// Perfil e validação administrativa
// ==========================================

function preencherPerfilAdministrador(usuario) {
  elemento("adminNome").textContent =
    usuario.displayName || "Administrador";

  elemento("adminEmail").textContent =
    usuario.email || "";

  const foto = elemento("adminFoto");

  if (foto) {
    foto.src =
      usuario.photoURL ||
      "./icon-192.png";

    foto.onerror = function() {
      foto.src = "./icon-192.png";
    };
  }
}

async function validarAdministrador(usuario) {
  if (!usuario?.uid) {
    return false;
  }

  const usuarioRef = doc(
    db,
    "usuarios",
    usuario.uid
  );

  const snapshot = await getDoc(usuarioRef);

  if (!snapshot.exists()) {
    return false;
  }

  const dados = snapshot.data();

  return dados.adminSistema === true;
}


// ==========================================
// Navegação do painel
// ==========================================

window.voltarListaLar = function() {
  window.location.href = "./index.html";
};

window.abrirSecao = async function(nomeSecao) {
  document
    .querySelectorAll(".admin-section")
    .forEach((secao) => {
      secao.classList.remove("active");
    });

  document
    .querySelectorAll(".admin-tab")
    .forEach((botao) => {
      botao.classList.remove("active");
    });

  elemento(`secao-${nomeSecao}`)
    ?.classList.add("active");

  document
    .querySelector(
      `.admin-tab[data-section="${nomeSecao}"]`
    )
    ?.classList.add("active");

  window.scrollTo({
    top: 0,
    behavior: "auto"
  });

  if (nomeSecao === "dashboard") {
    await carregarDashboard();
  }

  if (nomeSecao === "familias") {
    await carregarFamilias();
  }

  if (nomeSecao === "usuarios") {
    await carregarUsuarios();
  }
};


// ==========================================
// Dashboard
// ==========================================

function renderizarFamiliasRecentes() {
  const area = elemento("familiasRecentes");

  if (!area) {
    return;
  }

  const recentes = [...familiasCarregadas]
    .sort((a, b) => {
      return (
        obterTempoData(obterDataFamilia(b)) -
        obterTempoData(obterDataFamilia(a))
      );
    })
    .slice(0, 5);

  if (recentes.length === 0) {
    area.innerHTML = `
      <div class="empty-state">
        Nenhuma família cadastrada.
      </div>
    `;

    return;
  }

  area.innerHTML = recentes
    .map((familia) => {
      const nome = escaparHtml(
        obterNomeFamilia(familia)
      );

      const dono = escaparHtml(
        familia.criadoPorEmail ||
        familia.donoEmail ||
        familia.donoId ||
        "Responsável não informado"
      );

      const data = escaparHtml(
        formatarData(obterDataFamilia(familia))
      );

      return `
        <div class="simple-item">
          <div class="data-item-main">
            <div class="data-avatar">
              👨‍👩‍👧
            </div>

            <div class="data-info">
              <strong>${nome}</strong>
              <span>${dono}</span>
            </div>
          </div>

          <span class="data-badge">
            ${data}
          </span>
        </div>
      `;
    })
    .join("");
}

window.carregarDashboard = async function() {
  try {
    const [
      snapshotFamilias,
      snapshotUsuarios,
      snapshotComunicado,
      snapshotConfiguracoes
    ] = await Promise.all([
      getDocs(collection(db, "familias")),
      getDocs(collection(db, "usuarios")),
      getDoc(REFERENCIA_COMUNICADO),
      getDoc(REFERENCIA_CONFIGURACOES)
    ]);

    familiasCarregadas =
      snapshotFamilias.docs.map((documento) => ({
        id: documento.id,
        ...documento.data()
      }));

    usuariosCarregados =
      snapshotUsuarios.docs.map((documento) => ({
        id: documento.id,
        ...documento.data()
      }));

    elemento("totalFamilias").textContent =
      String(familiasCarregadas.length);

    elemento("totalUsuarios").textContent =
      String(usuariosCarregados.length);

    const comunicado = snapshotComunicado.exists()
      ? snapshotComunicado.data()
      : {};

    elemento("statusComunicado").textContent =
      comunicado.ativo === true
        ? "Ativo"
        : "Inativo";

    const configuracoes =
      snapshotConfiguracoes.exists()
        ? snapshotConfiguracoes.data()
        : {};

    elemento("statusManutencao").textContent =
      configuracoes.modoManutencao === true
        ? "Ativada"
        : "Desativada";

    renderizarFamiliasRecentes();
  } catch (erro) {
    console.error(
      "Erro ao carregar dashboard:",
      erro
    );

    abrirAdminModal({
      titulo: "Erro no painel",
      texto: mensagemErro(erro),
      icone: "⚠️"
    });
  }
};


// ==========================================
// Famílias
// ==========================================

function renderizarFamilias() {
  const area = elemento("listaFamiliasAdmin");

  if (!area) {
    return;
  }

  const termo = textoNormalizado(
    elemento("buscaFamilias")?.value
  );

  const filtradas = familiasCarregadas
    .filter((familia) => {
      const conteudo = textoNormalizado(
        [
          obterNomeFamilia(familia),
          familia.criadoPorEmail,
          familia.donoEmail,
          familia.donoId,
          familia.id
        ].join(" ")
      );

      return conteudo.includes(termo);
    })
    .sort((a, b) => {
      return obterNomeFamilia(a).localeCompare(
        obterNomeFamilia(b),
        "pt-BR"
      );
    });

  if (filtradas.length === 0) {
    area.innerHTML = `
      <div class="empty-state">
        Nenhuma família encontrada.
      </div>
    `;

    return;
  }

  area.innerHTML = filtradas
    .map((familia) => {
      const nome = escaparHtml(
        obterNomeFamilia(familia)
      );

      const responsavel = escaparHtml(
        familia.criadoPorEmail ||
        familia.donoEmail ||
        familia.donoId ||
        "Responsável não informado"
      );

      const data = escaparHtml(
        formatarData(obterDataFamilia(familia))
      );

      return `
        <div class="data-item">
          <div class="data-item-main">
            <div class="data-avatar">
              👨‍👩‍👧
            </div>

            <div class="data-info">
              <strong>${nome}</strong>

              <span>
                ${responsavel}
                · ${data}
              </span>
            </div>
          </div>

          <span class="data-badge">
            Família
          </span>
        </div>
      `;
    })
    .join("");
}

window.carregarFamilias = async function() {
  const area = elemento("listaFamiliasAdmin");

  if (area) {
    area.innerHTML = `
      <div class="empty-state">
        Carregando famílias...
      </div>
    `;
  }

  try {
    const snapshot = await getDocs(
      collection(db, "familias")
    );

    familiasCarregadas =
      snapshot.docs.map((documento) => ({
        id: documento.id,
        ...documento.data()
      }));

    renderizarFamilias();
  } catch (erro) {
    console.error(
      "Erro ao carregar famílias:",
      erro
    );

    if (area) {
      area.innerHTML = `
        <div class="empty-state">
          Não foi possível carregar as famílias.
        </div>
      `;
    }

    abrirAdminModal({
      titulo: "Erro ao carregar famílias",
      texto: mensagemErro(erro),
      icone: "⚠️"
    });
  }
};


// ==========================================
// Usuários
// ==========================================

function renderizarUsuarios() {
  const area = elemento("listaUsuariosAdmin");

  if (!area) {
    return;
  }

  const termo = textoNormalizado(
    elemento("buscaUsuarios")?.value
  );

  const filtrados = usuariosCarregados
    .filter((usuario) => {
      const conteudo = textoNormalizado(
        [
          obterNomeUsuario(usuario),
          usuario.email,
          usuario.familiaId,
          usuario.id
        ].join(" ")
      );

      return conteudo.includes(termo);
    })
    .sort((a, b) => {
      return obterNomeUsuario(a).localeCompare(
        obterNomeUsuario(b),
        "pt-BR"
      );
    });

  if (filtrados.length === 0) {
    area.innerHTML = `
      <div class="empty-state">
        Nenhum usuário encontrado.
      </div>
    `;

    return;
  }

  area.innerHTML = filtrados
    .map((usuario) => {
      const nomeUsuario = obterNomeUsuario(usuario);
      const nome = escaparHtml(nomeUsuario);

      const email = escaparHtml(
        usuario.email ||
        "E-mail não informado"
      );

      const familia = escaparHtml(
        usuario.familiaId ||
        "Sem família"
      );

      const fotoUrl = escaparHtml(
        obterFotoUsuario(usuario)
      );

      const avatar = fotoUrl
        ? `
          <img
            src="${fotoUrl}"
            alt="${nome}"
            loading="lazy"
            referrerpolicy="no-referrer"
          >
        `
        : escaparHtml(
            primeiraLetra(nomeUsuario)
          );

      const tipo = usuario.adminSistema === true
        ? "Administrador"
        : escaparHtml(
            usuario.papel ||
            "Usuário"
          );

      return `
        <div class="data-item">
          <div class="data-item-main">
            <div class="data-avatar">
              ${avatar}
            </div>

            <div class="data-info">
              <strong>${nome}</strong>

              <span>
                ${email}
                · Família: ${familia}
              </span>
            </div>
          </div>

          <span class="data-badge">
            ${tipo}
          </span>
        </div>
      `;
    })
    .join("");
}

window.carregarUsuarios = async function() {
  const area = elemento("listaUsuariosAdmin");

  if (area) {
    area.innerHTML = `
      <div class="empty-state">
        Carregando usuários...
      </div>
    `;
  }

  try {
    const snapshot = await getDocs(
      collection(db, "usuarios")
    );

    usuariosCarregados =
      snapshot.docs.map((documento) => ({
        id: documento.id,
        ...documento.data()
      }));

    renderizarUsuarios();
  } catch (erro) {
    console.error(
      "Erro ao carregar usuários:",
      erro
    );

    if (area) {
      area.innerHTML = `
        <div class="empty-state">
          Não foi possível carregar os usuários.
        </div>
      `;
    }

    abrirAdminModal({
      titulo: "Erro ao carregar usuários",
      texto: mensagemErro(erro),
      icone: "⚠️"
    });
  }
};


// ==========================================
// Comunicado geral
// ==========================================

function renderizarPreviewComunicado() {
  const titulo =
    elemento("comunicadoTitulo")?.value.trim() ||
    "Comunicado ListaLar";

  const mensagem =
    elemento("comunicadoMensagem")?.value.trim() ||
    "Preencha os campos acima para visualizar.";

  const tipo =
    elemento("comunicadoTipo")?.value ||
    "info";

  const icones = {
    info: "ℹ️",
    success: "✨",
    warning: "⚠️",
    maintenance: "🛠️"
  };

  const preview = elemento("previewComunicado");

  if (!preview) {
    return;
  }

  preview.querySelector(
    ".announcement-icon"
  ).textContent = icones[tipo] || "📢";

  preview.querySelector(
    "strong"
  ).textContent = titulo;

  preview.querySelector(
    "p"
  ).textContent = mensagem;
}

async function carregarComunicadoSalvo() {
  try {
    const snapshot = await getDoc(
      REFERENCIA_COMUNICADO
    );

    if (!snapshot.exists()) {
      renderizarPreviewComunicado();
      return;
    }

    const dados = snapshot.data();

    elemento("comunicadoTitulo").value =
      dados.titulo || "";

    elemento("comunicadoMensagem").value =
      dados.mensagem || "";

    elemento("comunicadoTipo").value =
      dados.tipo || "info";

    elemento("comunicadoAtivo").checked =
      dados.ativo === true;

    elemento("comunicadoObrigatorio").checked =
      dados.obrigatorio === true;

    renderizarPreviewComunicado();
  } catch (erro) {
    console.error(
      "Erro ao carregar comunicado:",
      erro
    );
  }
}

window.limparFormularioComunicado = function() {
  elemento("comunicadoTitulo").value = "";
  elemento("comunicadoMensagem").value = "";
  elemento("comunicadoTipo").value = "info";
  elemento("comunicadoAtivo").checked = false;
  elemento("comunicadoObrigatorio").checked = false;

  renderizarPreviewComunicado();
};

window.salvarComunicado = async function() {
  const titulo =
    elemento("comunicadoTitulo").value.trim();

  const mensagem =
    elemento("comunicadoMensagem").value.trim();

  const tipo =
    elemento("comunicadoTipo").value;

  const ativo =
    elemento("comunicadoAtivo").checked;

  const obrigatorio =
    elemento("comunicadoObrigatorio").checked;

  if (ativo && !titulo) {
    abrirAdminModal({
      titulo: "Título necessário",
      texto:
        "Informe um título antes de ativar o comunicado.",
      icone: "⚠️"
    });

    return;
  }

  if (ativo && !mensagem) {
    abrirAdminModal({
      titulo: "Mensagem necessária",
      texto:
        "Informe a mensagem antes de ativar o comunicado.",
      icone: "⚠️"
    });

    return;
  }

  try {
    await setDoc(
      REFERENCIA_COMUNICADO,
      {
        titulo,
        mensagem,
        tipo,
        ativo,
        obrigatorio,
        atualizadoEm: serverTimestamp(),
        atualizadoPorUid:
          usuarioAdminAtual?.uid || "",
        atualizadoPorEmail:
          usuarioAdminAtual?.email || ""
      },
      {
        merge: true
      }
    );

    elemento("statusComunicado").textContent =
      ativo
        ? "Ativo"
        : "Inativo";

    renderizarPreviewComunicado();

    abrirAdminModal({
      titulo: "Comunicado salvo",
      texto:
        ativo
          ? "O comunicado foi salvo e está ativo."
          : "O comunicado foi salvo como inativo.",
      icone: "✅"
    });
  } catch (erro) {
    console.error(
      "Erro ao salvar comunicado:",
      erro
    );

    abrirAdminModal({
      titulo: "Erro ao salvar",
      texto: mensagemErro(erro),
      icone: "⚠️"
    });
  }
};


// ==========================================
// Configurações gerais
// ==========================================

async function carregarConfiguracoesGerais() {
  try {
    const snapshot = await getDoc(
      REFERENCIA_CONFIGURACOES
    );

    if (!snapshot.exists()) {
      return;
    }

    const dados = snapshot.data();

    elemento("modoManutencao").checked =
      dados.modoManutencao === true;

    elemento("mensagemManutencao").value =
      dados.mensagemManutencao || "";

    elemento("permitirNovasFamilias").checked =
      dados.permitirNovasFamilias !== false;

    elemento("atualizacaoObrigatoria").checked =
      dados.atualizacaoObrigatoria === true;

    elemento("versaoMinima").value =
      dados.versaoMinima || "";

    elemento("versaoAtual").value =
      dados.versaoAtual || "";

    elemento("statusManutencao").textContent =
      dados.modoManutencao === true
        ? "Ativada"
        : "Desativada";
  } catch (erro) {
    console.error(
      "Erro ao carregar configurações:",
      erro
    );
  }
}

window.salvarConfiguracoesGerais = async function() {
  const modoManutencao =
    elemento("modoManutencao").checked;

  const mensagemManutencao =
    elemento("mensagemManutencao").value.trim();

  const permitirNovasFamilias =
    elemento("permitirNovasFamilias").checked;

  const atualizacaoObrigatoria =
    elemento("atualizacaoObrigatoria").checked;

  const versaoMinima =
    elemento("versaoMinima").value.trim();

  const versaoAtual =
    elemento("versaoAtual").value.trim();

  if (
    modoManutencao &&
    !mensagemManutencao
  ) {
    abrirAdminModal({
      titulo: "Mensagem necessária",
      texto:
        "Informe uma mensagem antes de ativar o modo manutenção.",
      icone: "⚠️"
    });

    return;
  }

  if (
    atualizacaoObrigatoria &&
    !versaoMinima
  ) {
    abrirAdminModal({
      titulo: "Versão mínima necessária",
      texto:
        "Informe a versão mínima antes de ativar a atualização obrigatória.",
      icone: "⚠️"
    });

    return;
  }

  try {
    await setDoc(
      REFERENCIA_CONFIGURACOES,
      {
        modoManutencao,
        mensagemManutencao,
        permitirNovasFamilias,
        atualizacaoObrigatoria,
        versaoMinima,
        versaoAtual,
        atualizadoEm: serverTimestamp(),
        atualizadoPorUid:
          usuarioAdminAtual?.uid || "",
        atualizadoPorEmail:
          usuarioAdminAtual?.email || ""
      },
      {
        merge: true
      }
    );

    elemento("statusManutencao").textContent =
      modoManutencao
        ? "Ativada"
        : "Desativada";

    abrirAdminModal({
      titulo: "Configurações salvas",
      texto:
        "As configurações gerais foram atualizadas com sucesso.",
      icone: "✅"
    });
  } catch (erro) {
    console.error(
      "Erro ao salvar configurações:",
      erro
    );

    abrirAdminModal({
      titulo: "Erro ao salvar",
      texto: mensagemErro(erro),
      icone: "⚠️"
    });
  }
};


// ==========================================
// Eventos dos campos
// ==========================================

function configurarEventos() {
  elemento("buscaFamilias")
    ?.addEventListener(
      "input",
      renderizarFamilias
    );

  elemento("buscaUsuarios")
    ?.addEventListener(
      "input",
      renderizarUsuarios
    );

  [
    "comunicadoTitulo",
    "comunicadoMensagem",
    "comunicadoTipo"
  ].forEach((id) => {
    elemento(id)?.addEventListener(
      "input",
      renderizarPreviewComunicado
    );

    elemento(id)?.addEventListener(
      "change",
      renderizarPreviewComunicado
    );
  });
}


// ==========================================
// Inicialização
// ==========================================

async function inicializarPainel(usuario) {
  if (
    painelInicializado &&
    usuarioAdminAtual?.uid === usuario.uid
  ) {
    return;
  }

  painelInicializado = true;
  usuarioAdminAtual = usuario;

  preencherPerfilAdministrador(usuario);
  configurarEventos();
  exibirPainel();

  await Promise.all([
    carregarDashboard(),
    carregarComunicadoSalvo(),
    carregarConfiguracoesGerais()
  ]);
}

async function iniciarAdministracao() {
  ocultarPainel();
  definirLoader(
    "Validando acesso administrativo..."
  );

  try {
    await setPersistence(
      auth,
      browserLocalPersistence
    );

    onAuthStateChanged(
      auth,
      async (usuario) => {
        if (!usuario) {
          definirLoader(
            "Usuário não conectado."
          );

          abrirAdminModal({
            titulo: "Acesso necessário",
            texto:
              "Entre no ListaLar antes de acessar a administração.",
            icone: "🔒",
            textoBotao: "Voltar",
            depoisDeFechar: () => {
              window.location.href = "./index.html";
            }
          });

          return;
        }

        definirLoader(
          "Verificando permissão administrativa..."
        );

        try {
          const possuiAcesso =
            await validarAdministrador(usuario);

          if (!possuiAcesso) {
            abrirAdminModal({
              titulo: "Acesso não autorizado",
              texto:
                "Seu usuário não possui permissão para acessar o painel administrativo.",
              icone: "🔒",
              textoBotao: "Voltar",
              depoisDeFechar: () => {
                window.location.href = "./index.html";
              }
            });

            return;
          }

          await inicializarPainel(usuario);
        } catch (erro) {
          console.error(
            "Erro ao validar administrador:",
            erro
          );

          definirLoader(
            "Não foi possível validar o acesso."
          );

          abrirAdminModal({
            titulo: "Erro de acesso",
            texto: mensagemErro(erro),
            icone: "⚠️",
            textoBotao: "Voltar",
            depoisDeFechar: () => {
              window.location.href = "./index.html";
            }
          });
        }
      }
    );
  } catch (erro) {
    console.error(
      "Erro ao iniciar administração:",
      erro
    );

    definirLoader(
      "Não foi possível iniciar o painel."
    );

    abrirAdminModal({
      titulo: "Erro de inicialização",
      texto: mensagemErro(erro),
      icone: "⚠️"
    });
  }
}


// O arquivo é carregado no final do admin.html,
// mas esta verificação deixa a inicialização segura.

if (document.readyState === "loading") {
  document.addEventListener(
    "DOMContentLoaded",
    iniciarAdministracao,
    {
      once: true
    }
  );
} else {
  iniciarAdministracao();
}
