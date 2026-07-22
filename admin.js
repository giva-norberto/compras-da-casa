// ==========================================
// ListaLar - Painel Administrativo
// Arquivo: admin.js
// Versão: 2.1.0
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

const REFERENCIA_MODULOS = doc(
  db,
  "configuracoes",
  "modulos"
);


// ==========================================
// Estado do painel
// ==========================================

let usuarioAdminAtual = null;
let dadosUsuarioAdminAtual = null;
let configuracaoModulosAtual = {};

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

function formatarUltimoAcesso(valor) {
  const data = obterData(valor);

  if (!data) {
    return "Ainda não registrado";
  }

  const agora = new Date();

  const inicioHoje = new Date(
    agora.getFullYear(),
    agora.getMonth(),
    agora.getDate()
  );

  const inicioData = new Date(
    data.getFullYear(),
    data.getMonth(),
    data.getDate()
  );

  const diferencaDias = Math.floor(
    (
      inicioHoje.getTime() -
      inicioData.getTime()
    ) / 86400000
  );

  const horario = new Intl.DateTimeFormat(
    "pt-BR",
    {
      hour: "2-digit",
      minute: "2-digit"
    }
  ).format(data);

  if (diferencaDias === 0) {
    return `Hoje às ${horario}`;
  }

  if (diferencaDias === 1) {
    return `Ontem às ${horario}`;
  }

  if (
    diferencaDias > 1 &&
    diferencaDias <= 7
  ) {
    return `Há ${diferencaDias} dias`;
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
  elemento("adminLoader")
    ?.classList.add("hidden");

  elemento("adminApp")
    ?.classList.remove("hidden");
}

function ocultarPainel() {
  elemento("adminApp")
    ?.classList.add("hidden");

  elemento("adminLoader")
    ?.classList.remove("hidden");
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

  elemento("adminModalTitle").textContent =
    titulo;

  elemento("adminModalText").textContent =
    texto;

  elemento("adminModalIcon").textContent =
    icone;

  elemento("adminModalButton").textContent =
    textoBotao;

  acaoDepoisDoModal =
    typeof depoisDeFechar === "function"
      ? depoisDeFechar
      : null;

  modal.classList.add("active");
}

window.fecharAdminModal = function() {
  elemento("adminModal")
    ?.classList.remove("active");

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
    usuario.displayName ||
    "Administrador";

  elemento("adminEmail").textContent =
    usuario.email ||
    "";

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

  const snapshot = await getDoc(
    usuarioRef
  );

  if (!snapshot.exists()) {
    return false;
  }

  const dados = snapshot.data();

  if (dados.adminSistema !== true) {
    dadosUsuarioAdminAtual = null;
    return false;
  }

  dadosUsuarioAdminAtual = {
    id: snapshot.id,
    ...dados
  };

  return true;
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

  if (nomeSecao === "configuracoes") {
    await carregarConfiguracaoTarefas();
  }
};


// ==========================================
// Dashboard
// ==========================================

function renderizarFamiliasRecentes() {
  const area = elemento(
    "familiasRecentes"
  );

  if (!area) {
    return;
  }

  const recentes = [
    ...familiasCarregadas
  ]
    .sort((a, b) => {
      return (
        obterTempoData(
          obterDataFamilia(b)
        ) -
        obterTempoData(
          obterDataFamilia(a)
        )
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
        formatarData(
          obterDataFamilia(familia)
        )
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
      getDocs(
        collection(db, "familias")
      ),
      getDocs(
        collection(db, "usuarios")
      ),
      getDoc(
        REFERENCIA_COMUNICADO
      ),
      getDoc(
        REFERENCIA_CONFIGURACOES
      )
    ]);

    familiasCarregadas =
      snapshotFamilias.docs.map(
        (documento) => ({
          id: documento.id,
          ...documento.data()
        })
      );

    usuariosCarregados =
      snapshotUsuarios.docs.map(
        (documento) => ({
          id: documento.id,
          ...documento.data()
        })
      );

    elemento("totalFamilias").textContent =
      String(
        familiasCarregadas.length
      );

    elemento("totalUsuarios").textContent =
      String(
        usuariosCarregados.length
      );

    const comunicado =
      snapshotComunicado.exists()
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
    atualizarStatusModuloTarefas();
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
  const area = elemento(
    "listaFamiliasAdmin"
  );

  if (!area) {
    return;
  }

  const termo = textoNormalizado(
    elemento("buscaFamilias")?.value
  );

  const filtradas =
    familiasCarregadas
      .filter((familia) => {
        const conteudo =
          textoNormalizado(
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
        return obterNomeFamilia(a)
          .localeCompare(
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

      const responsavel =
        escaparHtml(
          familia.criadoPorEmail ||
          familia.donoEmail ||
          familia.donoId ||
          "Responsável não informado"
        );

      const data = escaparHtml(
        formatarData(
          obterDataFamilia(familia)
        )
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
  const area = elemento(
    "listaFamiliasAdmin"
  );

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
      snapshot.docs.map(
        (documento) => ({
          id: documento.id,
          ...documento.data()
        })
      );

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
      titulo:
        "Erro ao carregar famílias",
      texto: mensagemErro(erro),
      icone: "⚠️"
    });
  }
};


// ==========================================
// Usuários
// ==========================================

function renderizarUsuarios() {
  const area = elemento(
    "listaUsuariosAdmin"
  );

  if (!area) {
    return;
  }

  const termo = textoNormalizado(
    elemento("buscaUsuarios")?.value
  );

  const filtrados =
    usuariosCarregados
      .filter((usuario) => {
        const conteudo =
          textoNormalizado(
            [
              obterNomeUsuario(usuario),
              usuario.email,
              usuario.familiaId,
              formatarUltimoAcesso(
                usuario.ultimoAcesso
              ),
              usuario.id
            ].join(" ")
          );

        return conteudo.includes(termo);
      })
      .sort((a, b) => {
        return obterNomeUsuario(a)
          .localeCompare(
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
      const nomeUsuario =
        obterNomeUsuario(usuario);

      const nome =
        escaparHtml(nomeUsuario);

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

      const tipo =
        usuario.adminSistema === true
          ? "Administrador"
          : escaparHtml(
              usuario.papel ||
              "Usuário"
            );

      const ultimoAcesso =
        escaparHtml(
          formatarUltimoAcesso(
            usuario.ultimoAcesso
          )
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

              <span>
                Último acesso: ${ultimoAcesso}
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
  const area = elemento(
    "listaUsuariosAdmin"
  );

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
      snapshot.docs.map(
        (documento) => ({
          id: documento.id,
          ...documento.data()
        })
      );

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
      titulo:
        "Erro ao carregar usuários",
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
    elemento("comunicadoTitulo")
      ?.value.trim() ||
    "Comunicado ListaLar";

  const mensagem =
    elemento("comunicadoMensagem")
      ?.value.trim() ||
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

  const preview = elemento(
    "previewComunicado"
  );

  if (!preview) {
    return;
  }

  const iconePreview =
    preview.querySelector(
      ".announcement-icon"
    );

  const tituloPreview =
    preview.querySelector("strong");

  const mensagemPreview =
    preview.querySelector("p");

  if (iconePreview) {
    iconePreview.textContent =
      icones[tipo] || "📢";
  }

  if (tituloPreview) {
    tituloPreview.textContent =
      titulo;
  }

  if (mensagemPreview) {
    mensagemPreview.textContent =
      mensagem;
  }
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
      dados.titulo ||
      "";

    elemento("comunicadoMensagem").value =
      dados.mensagem ||
      "";

    elemento("comunicadoTipo").value =
      dados.tipo ||
      "info";

    elemento("comunicadoAtivo").checked =
      dados.ativo === true;

    elemento(
      "comunicadoObrigatorio"
    ).checked =
      dados.obrigatorio === true;

    renderizarPreviewComunicado();
  } catch (erro) {
    console.error(
      "Erro ao carregar comunicado:",
      erro
    );
  }
}

window.limparFormularioComunicado =
  function() {
    elemento("comunicadoTitulo").value =
      "";

    elemento("comunicadoMensagem").value =
      "";

    elemento("comunicadoTipo").value =
      "info";

    elemento("comunicadoAtivo").checked =
      false;

    elemento(
      "comunicadoObrigatorio"
    ).checked =
      false;

    renderizarPreviewComunicado();
  };

window.salvarComunicado =
  async function() {
    const titulo =
      elemento("comunicadoTitulo")
        .value.trim();

    const mensagem =
      elemento("comunicadoMensagem")
        .value.trim();

    const tipo =
      elemento("comunicadoTipo").value;

    const ativo =
      elemento("comunicadoAtivo").checked;

    const obrigatorio =
      elemento(
        "comunicadoObrigatorio"
      ).checked;

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
          atualizadoEm:
            serverTimestamp(),
          atualizadoPorUid:
            usuarioAdminAtual?.uid ||
            "",
          atualizadoPorEmail:
            usuarioAdminAtual?.email ||
            ""
        },
        {
          merge: true
        }
      );

      elemento(
        "statusComunicado"
      ).textContent =
        ativo
          ? "Ativo"
          : "Inativo";

      renderizarPreviewComunicado();

      abrirAdminModal({
        titulo: "Comunicado salvo",
        texto: ativo
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

    elemento(
      "mensagemManutencao"
    ).value =
      dados.mensagemManutencao ||
      "";

    elemento(
      "permitirNovasFamilias"
    ).checked =
      dados.permitirNovasFamilias !==
      false;

    elemento(
      "atualizacaoObrigatoria"
    ).checked =
      dados.atualizacaoObrigatoria ===
      true;

    elemento("versaoMinima").value =
      dados.versaoMinima ||
      "";

    elemento("versaoAtual").value =
      dados.versaoAtual ||
      "";

    elemento(
      "statusManutencao"
    ).textContent =
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

window.salvarConfiguracoesGerais =
  async function() {
    const modoManutencao =
      elemento(
        "modoManutencao"
      ).checked;

    const mensagemManutencao =
      elemento(
        "mensagemManutencao"
      ).value.trim();

    const permitirNovasFamilias =
      elemento(
        "permitirNovasFamilias"
      ).checked;

    const atualizacaoObrigatoria =
      elemento(
        "atualizacaoObrigatoria"
      ).checked;

    const versaoMinima =
      elemento(
        "versaoMinima"
      ).value.trim();

    const versaoAtual =
      elemento(
        "versaoAtual"
      ).value.trim();

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
        titulo:
          "Versão mínima necessária",
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
          atualizadoEm:
            serverTimestamp(),
          atualizadoPorUid:
            usuarioAdminAtual?.uid ||
            "",
          atualizadoPorEmail:
            usuarioAdminAtual?.email ||
            ""
        },
        {
          merge: true
        }
      );

      elemento(
        "statusManutencao"
      ).textContent =
        modoManutencao
          ? "Ativada"
          : "Desativada";

      abrirAdminModal({
        titulo:
          "Configurações salvas",
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
// Controle do módulo Tarefas
// ==========================================

// ==========================================
// Controle dos módulos Tarefas e Gastos
// ==========================================

function criarEstilosControleTarefas() {
  if (elemento("adminModulosEstilos")) {
    return;
  }

  const estilo = document.createElement("style");

  estilo.id = "adminModulosEstilos";

  estilo.textContent = `
    .admin-modulos {
      margin-bottom: 24px;
      padding: 20px;
      border: 1px solid rgba(15, 23, 42, 0.10);
      border-radius: 18px;
      background: #ffffff;
      box-shadow: 0 8px 24px rgba(15, 23, 42, 0.06);
    }

    .admin-modulos-topo {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 16px;
      margin-bottom: 16px;
    }

    .admin-modulos-titulo {
      margin: 0;
      font-size: 1.1rem;
      color: #0f172a;
    }

    .admin-modulos-descricao {
      margin: 6px 0 0;
      color: #64748b;
      line-height: 1.5;
    }

    .admin-modulos-caixa {
      display: grid;
      gap: 12px;
    }

    .admin-modulo-linha {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      padding: 16px;
      border-radius: 14px;
      background: #f8fafc;
    }

    .admin-modulo-conteudo {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      min-width: 0;
    }

    .admin-modulo-icone {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      flex: 0 0 auto;
      width: 42px;
      height: 42px;
      border-radius: 12px;
      background: #e0f2fe;
      font-size: 1.25rem;
    }

    .admin-modulo-info {
      min-width: 0;
    }

    .admin-modulo-info strong,
    .admin-modulo-info span {
      display: block;
    }

    .admin-modulo-info strong {
      color: #0f172a;
    }

    .admin-modulo-info span {
      margin-top: 4px;
      color: #64748b;
      font-size: 0.9rem;
      line-height: 1.4;
      overflow-wrap: anywhere;
    }

    .admin-modulo-controle {
      display: flex;
      align-items: center;
      gap: 12px;
      flex: 0 0 auto;
    }

    .admin-modulo-status {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-height: 30px;
      padding: 6px 10px;
      border-radius: 999px;
      font-size: 0.82rem;
      font-weight: 700;
      white-space: nowrap;
      background: #e2e8f0;
      color: #334155;
    }

    .admin-modulo-status.ativo {
      background: #dcfce7;
      color: #166534;
    }

    .admin-modulo-status.piloto {
      background: #fef3c7;
      color: #92400e;
    }

    .admin-switch-modulo {
      position: relative;
      display: inline-flex;
      flex: 0 0 auto;
      width: 52px;
      height: 30px;
    }

    .admin-switch-modulo input {
      position: absolute;
      opacity: 0;
      pointer-events: none;
    }

    .admin-switch-modulo-trilho {
      width: 100%;
      height: 100%;
      border-radius: 999px;
      background: #cbd5e1;
      cursor: pointer;
      transition: 0.2s ease;
    }

    .admin-switch-modulo-trilho::after {
      content: "";
      position: absolute;
      top: 4px;
      left: 4px;
      width: 22px;
      height: 22px;
      border-radius: 50%;
      background: #ffffff;
      box-shadow: 0 2px 7px rgba(15, 23, 42, 0.24);
      transition: 0.2s ease;
    }

    .admin-switch-modulo input:checked +
    .admin-switch-modulo-trilho {
      background: #16a34a;
    }

    .admin-switch-modulo input:checked +
    .admin-switch-modulo-trilho::after {
      transform: translateX(22px);
    }

    .admin-modulos-piloto {
      margin-top: 12px;
      padding: 14px 16px;
      border: 1px dashed #cbd5e1;
      border-radius: 14px;
      background: #ffffff;
    }

    .admin-modulos-piloto strong,
    .admin-modulos-piloto span {
      display: block;
    }

    .admin-modulos-piloto span {
      margin-top: 4px;
      color: #64748b;
      font-size: 0.9rem;
      overflow-wrap: anywhere;
    }

    .admin-modulos-acoes {
      display: flex;
      justify-content: flex-end;
      margin-top: 16px;
    }

    .admin-modulos-botao {
      min-height: 42px;
      padding: 10px 18px;
      border: 0;
      border-radius: 12px;
      background: #2563eb;
      color: #ffffff;
      font: inherit;
      font-weight: 700;
      cursor: pointer;
    }

    .admin-modulos-botao:disabled {
      opacity: 0.65;
      cursor: wait;
    }

    @media (max-width: 720px) {
      .admin-modulos-topo,
      .admin-modulo-linha {
        align-items: stretch;
        flex-direction: column;
      }

      .admin-modulo-controle {
        justify-content: space-between;
      }

      .admin-modulos-botao {
        width: 100%;
      }
    }
  `;

  document.head.appendChild(estilo);
}


function criarControleModuloTarefas() {
  if (elemento("adminControleModulos")) {
    return true;
  }

  const secao =
    elemento("secao-configuracoes") ||
    document.querySelector(
      '.admin-section[data-section="configuracoes"]'
    );

  if (!secao) {
    console.warn(
      "Admin: seção de configurações não encontrada para inserir o controle de módulos."
    );

    return false;
  }

  criarEstilosControleTarefas();

  const bloco = document.createElement("div");

  bloco.id = "adminControleModulos";
  bloco.className = "admin-modulos";

  bloco.innerHTML = `
    <div class="admin-modulos-topo">
      <div>
        <h3 class="admin-modulos-titulo">
          🧩 Módulos do ListaLar
        </h3>

        <p class="admin-modulos-descricao">
          Sua família permanece como família piloto.
          Ative cada opção abaixo para liberar o módulo
          correspondente para todas as famílias.
        </p>
      </div>
    </div>

    <div class="admin-modulos-caixa">
      <div class="admin-modulo-linha">
        <div class="admin-modulo-conteudo">
          <span class="admin-modulo-icone">✅</span>

          <div class="admin-modulo-info">
            <strong>Módulo Tarefas</strong>

            <span>
              Desativado: somente a família piloto terá acesso.
            </span>
          </div>
        </div>

        <div class="admin-modulo-controle">
          <span
            id="statusModuloTarefas"
            class="admin-modulo-status"
          >
            Carregando...
          </span>

          <label
            class="admin-switch-modulo"
            title="Liberar Tarefas para todas as famílias"
          >
            <input
              id="tarefasLiberadas"
              type="checkbox"
            >

            <span
              class="admin-switch-modulo-trilho"
            ></span>
          </label>
        </div>
      </div>

      <div class="admin-modulo-linha">
        <div class="admin-modulo-conteudo">
          <span class="admin-modulo-icone">💰</span>

          <div class="admin-modulo-info">
            <strong>Módulo Gastos</strong>

            <span>
              Desativado: somente a família piloto terá acesso.
            </span>
          </div>
        </div>

        <div class="admin-modulo-controle">
          <span
            id="statusModuloGastos"
            class="admin-modulo-status"
          >
            Carregando...
          </span>

          <label
            class="admin-switch-modulo"
            title="Liberar Gastos para todas as famílias"
          >
            <input
              id="gastosLiberados"
              type="checkbox"
            >

            <span
              class="admin-switch-modulo-trilho"
            ></span>
          </label>
        </div>
      </div>
    </div>

    <div class="admin-modulos-piloto">
      <strong>Família piloto</strong>

      <span id="familiaPilotoTarefas">
        Identificando sua família...
      </span>
    </div>

    <div class="admin-modulos-acoes">
      <button
        id="btnSalvarModuloTarefas"
        type="button"
        class="admin-modulos-botao"
      >
        Salvar módulos
      </button>
    </div>
  `;

  secao.prepend(bloco);

  elemento("btnSalvarModuloTarefas")
    ?.addEventListener(
      "click",
      window.salvarConfiguracaoTarefas
    );

  elemento("tarefasLiberadas")
    ?.addEventListener(
      "change",
      atualizarStatusModuloTarefas
    );

  elemento("gastosLiberados")
    ?.addEventListener(
      "change",
      atualizarStatusModuloTarefas
    );

  return true;
}


function obterFamiliaPilotoId() {
  return (
    configuracaoModulosAtual.familiaPilotoId ||
    dadosUsuarioAdminAtual?.familiaId ||
    ""
  );
}


function obterNomeFamiliaPiloto(familiaId) {
  if (!familiaId) {
    return "Família não identificada";
  }

  const familia = familiasCarregadas.find(
    (registro) => registro.id === familiaId
  );

  if (!familia) {
    return familiaId;
  }

  return `${obterNomeFamilia(familia)} · ${familiaId}`;
}


function atualizarStatusIndividualModulo(
  campoId,
  statusId
) {
  const campoLiberacao = elemento(campoId);
  const status = elemento(statusId);

  const liberadoParaTodas =
    campoLiberacao?.checked === true;

  if (!status) {
    return;
  }

  status.classList.remove(
    "ativo",
    "piloto"
  );

  if (liberadoParaTodas) {
    status.textContent =
      "Liberado para todos";

    status.classList.add("ativo");
  } else {
    status.textContent =
      "Somente família piloto";

    status.classList.add("piloto");
  }
}


function atualizarStatusModuloTarefas() {
  atualizarStatusIndividualModulo(
    "tarefasLiberadas",
    "statusModuloTarefas"
  );

  atualizarStatusIndividualModulo(
    "gastosLiberados",
    "statusModuloGastos"
  );

  const familiaPiloto =
    elemento("familiaPilotoTarefas");

  if (familiaPiloto) {
    familiaPiloto.textContent =
      obterNomeFamiliaPiloto(
        obterFamiliaPilotoId()
      );
  }
}


async function garantirFamiliaPilotoTarefas() {
  const familiaAdminId =
    dadosUsuarioAdminAtual?.familiaId || "";

  const snapshot = await getDoc(
    REFERENCIA_MODULOS
  );

  configuracaoModulosAtual =
    snapshot.exists()
      ? snapshot.data()
      : {};

  configuracaoModulosAtual = {
    ...configuracaoModulosAtual,

    tarefasLiberadas:
      configuracaoModulosAtual
        .tarefasLiberadas === true,

    gastosLiberados:
      configuracaoModulosAtual
        .gastosLiberados === true
  };

  if (
    !configuracaoModulosAtual.familiaPilotoId &&
    familiaAdminId
  ) {
    await setDoc(
      REFERENCIA_MODULOS,
      {
        familiaPilotoId:
          familiaAdminId,

        tarefasLiberadas:
          configuracaoModulosAtual
            .tarefasLiberadas === true,

        gastosLiberados:
          configuracaoModulosAtual
            .gastosLiberados === true,

        atualizadoEm:
          serverTimestamp(),

        atualizadoPorUid:
          usuarioAdminAtual?.uid || "",

        atualizadoPorEmail:
          usuarioAdminAtual?.email || ""
      },
      {
        merge: true
      }
    );

    configuracaoModulosAtual = {
      ...configuracaoModulosAtual,

      familiaPilotoId:
        familiaAdminId
    };
  }
}


async function carregarConfiguracaoTarefas() {
  criarControleModuloTarefas();

  const campoTarefas =
    elemento("tarefasLiberadas");

  const campoGastos =
    elemento("gastosLiberados");

  const statusTarefas =
    elemento("statusModuloTarefas");

  const statusGastos =
    elemento("statusModuloGastos");

  try {
    if (statusTarefas) {
      statusTarefas.textContent =
        "Carregando...";
    }

    if (statusGastos) {
      statusGastos.textContent =
        "Carregando...";
    }

    await garantirFamiliaPilotoTarefas();

    if (campoTarefas) {
      campoTarefas.checked =
        configuracaoModulosAtual
          .tarefasLiberadas === true;
    }

    if (campoGastos) {
      campoGastos.checked =
        configuracaoModulosAtual
          .gastosLiberados === true;
    }

    atualizarStatusModuloTarefas();
  } catch (erro) {
    console.error(
      "Erro ao carregar configuração dos módulos:",
      erro
    );

    if (statusTarefas) {
      statusTarefas.textContent =
        "Erro ao carregar";
    }

    if (statusGastos) {
      statusGastos.textContent =
        "Erro ao carregar";
    }

    abrirAdminModal({
      titulo:
        "Erro nos módulos",

      texto:
        mensagemErro(erro),

      icone:
        "⚠️"
    });
  }
}


window.salvarConfiguracaoTarefas =
  async function() {
    const familiaAdminId =
      dadosUsuarioAdminAtual?.familiaId || "";

    const familiaPilotoId =
      configuracaoModulosAtual
        .familiaPilotoId ||
      familiaAdminId;

    const campoTarefas =
      elemento("tarefasLiberadas");

    const campoGastos =
      elemento("gastosLiberados");

    const botao =
      elemento("btnSalvarModuloTarefas");

    const tarefasLiberadas =
      campoTarefas?.checked === true;

    const gastosLiberados =
      campoGastos?.checked === true;

    if (!familiaPilotoId) {
      abrirAdminModal({
        titulo:
          "Família piloto não identificada",

        texto:
          "Seu usuário administrador não possui familiaId. Verifique o documento do seu usuário no Firestore.",

        icone:
          "⚠️"
      });

      return;
    }

    try {
      if (botao) {
        botao.disabled = true;
        botao.textContent =
          "Salvando...";
      }

      await setDoc(
        REFERENCIA_MODULOS,
        {
          tarefasLiberadas,
          gastosLiberados,
          familiaPilotoId,

          atualizadoEm:
            serverTimestamp(),

          atualizadoPorUid:
            usuarioAdminAtual?.uid || "",

          atualizadoPorEmail:
            usuarioAdminAtual?.email || ""
        },
        {
          merge: true
        }
      );

      configuracaoModulosAtual = {
        ...configuracaoModulosAtual,
        tarefasLiberadas,
        gastosLiberados,
        familiaPilotoId
      };

      atualizarStatusModuloTarefas();

      const situacaoTarefas =
        tarefasLiberadas
          ? "Tarefas: liberado para todas as famílias."
          : "Tarefas: somente família piloto.";

      const situacaoGastos =
        gastosLiberados
          ? "Gastos: liberado para todas as famílias."
          : "Gastos: somente família piloto.";

      abrirAdminModal({
        titulo:
          "Módulos atualizados",

        texto:
          `${situacaoTarefas} ${situacaoGastos}`,

        icone:
          "✅"
      });
    } catch (erro) {
      console.error(
        "Erro ao salvar configuração dos módulos:",
        erro
      );

      abrirAdminModal({
        titulo:
          "Erro ao salvar módulos",

        texto:
          mensagemErro(erro),

        icone:
          "⚠️"
      });
    } finally {
      if (botao) {
        botao.disabled = false;

        botao.textContent =
          "Salvar módulos";
      }
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
    elemento(id)
      ?.addEventListener(
        "input",
        renderizarPreviewComunicado
      );

    elemento(id)
      ?.addEventListener(
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
    usuarioAdminAtual?.uid ===
      usuario.uid
  ) {
    return;
  }

  painelInicializado = true;
  usuarioAdminAtual = usuario;

  preencherPerfilAdministrador(
    usuario
  );

  configurarEventos();
  criarControleModuloTarefas();
  exibirPainel();

  await Promise.all([
    carregarDashboard(),
    carregarComunicadoSalvo(),
    carregarConfiguracoesGerais(),
    carregarConfiguracaoTarefas()
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
            titulo:
              "Acesso necessário",
            texto:
              "Entre no ListaLar antes de acessar a administração.",
            icone: "🔒",
            textoBotao: "Voltar",
            depoisDeFechar: () => {
              window.location.href =
                "./index.html";
            }
          });

          return;
        }

        definirLoader(
          "Verificando permissão administrativa..."
        );

        try {
          const possuiAcesso =
            await validarAdministrador(
              usuario
            );

          if (!possuiAcesso) {
            abrirAdminModal({
              titulo:
                "Acesso não autorizado",
              texto:
                "Seu usuário não possui permissão para acessar o painel administrativo.",
              icone: "🔒",
              textoBotao: "Voltar",
              depoisDeFechar: () => {
                window.location.href =
                  "./index.html";
              }
            });

            return;
          }

          await inicializarPainel(
            usuario
          );
        } catch (erro) {
          console.error(
            "Erro ao validar administrador:",
            erro
          );

          definirLoader(
            "Não foi possível validar o acesso."
          );

          abrirAdminModal({
            titulo:
              "Erro de acesso",
            texto:
              mensagemErro(erro),
            icone: "⚠️",
            textoBotao: "Voltar",
            depoisDeFechar: () => {
              window.location.href =
                "./index.html";
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
      titulo:
        "Erro de inicialização",
      texto:
        mensagemErro(erro),
      icone: "⚠️"
    });
  }
}


// O arquivo é carregado no final do admin.html,
// mas esta verificação deixa a inicialização segura.

if (
  document.readyState === "loading"
) {
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
