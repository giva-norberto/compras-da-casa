// ==========================================
// ListaLar - Módulo Tarefas
// Arquivo: tarefas.js
// ==========================================

import {
  initializeApp,
  getApps,
  getApp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";

import {
  getAuth,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyC2U7q5HupxKyI3QiAyan-2Sio55NSir0Y",
  authDomain: "compras-da-casa.firebaseapp.com",
  projectId: "compras-da-casa",
  storageBucket: "compras-da-casa.firebasestorage.app",
  messagingSenderId: "63765433273",
  appId: "1:63765433273:web:c478a3dd33ef3cd55a0468"
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Permite que o administrador teste enquanto configuracoes/modulos
// ainda não foi criado. Depois, a regra oficial continua sendo:
// tarefasLiberadas == true OU familiaId == familiaPilotoId.
const ADMIN_COMO_PILOTO_SEM_CONFIG = true;

let usuarioAtual = null;
let familiaIdAtual = null;
let familiaNomeAtual = "";
let moduloLiberado = false;
let membros = [];
let tarefas = [];
let tarefaEdicaoId = null;
let unsubscribeTarefas = null;

const el = (id) => document.getElementById(id);

function escaparHtml(valor) {
  return String(valor ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatarPrazo(prazo) {
  if (!prazo) return "Sem prazo";

  const partes = String(prazo).split("-");

  return partes.length === 3
    ? `${partes[2]}/${partes[1]}/${partes[0]}`
    : prazo;
}

function prazoVencido(prazo, concluida) {
  if (!prazo || concluida) return false;

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const data = new Date(`${prazo}T00:00:00`);

  return !Number.isNaN(data.getTime()) && data < hoje;
}

function pesoPrioridade(prioridade) {
  return {
    alta: 1,
    media: 2,
    baixa: 3
  }[prioridade] || 4;
}

function rotuloPrioridade(prioridade) {
  return {
    alta: "Alta",
    media: "Média",
    baixa: "Baixa"
  }[prioridade] || "Média";
}

async function avisar(titulo, texto, tipo = "info") {
  if (typeof window.mostrarMensagem === "function") {
    return window.mostrarMensagem({
      titulo,
      texto,
      tipo
    });
  }

  window.alert(`${titulo}\n\n${texto}`);
}

async function confirmar(titulo, texto) {
  if (typeof window.confirmarAcao === "function") {
    return window.confirmarAcao({
      titulo,
      texto,
      tipo: "warning",
      confirmarTexto: "Excluir",
      cancelarTexto: "Cancelar",
      confirmarClasse: "danger"
    });
  }

  return window.confirm(`${titulo}\n\n${texto}`);
}

function ajustarMenu() {
  const menu = document.querySelector(".bottom-nav");

  if (!menu) return;

  const quantidade = [...menu.querySelectorAll(".tab")]
    .filter((botao) => !botao.hidden)
    .length;

  menu.style.gridTemplateColumns =
    `repeat(${Math.max(quantidade, 1)}, 1fr)`;
}

function definirVisibilidade(liberado) {
  moduloLiberado = liberado === true;

  const botao = el("tab-tarefas");

  if (botao) {
    botao.hidden = !moduloLiberado;
  }

  ajustarMenu();

  if (
    !moduloLiberado &&
    el("tarefas")?.classList.contains("active") &&
    typeof window.abrirTela === "function"
  ) {
    window.abrirTela("lista");
  }
}

async function carregarContexto(user) {
  const usuarioSnap = await getDoc(
    doc(db, "usuarios", user.uid)
  );

  if (!usuarioSnap.exists()) {
    definirVisibilidade(false);
    return;
  }

  const dadosUsuario = usuarioSnap.data();
  const familiaId = dadosUsuario.familiaId || "";

  if (!familiaId) {
    definirVisibilidade(false);
    return;
  }

  const [familiaSnap, modulosSnap] = await Promise.all([
    getDoc(
      doc(db, "familias", familiaId)
    ),
    getDoc(
      doc(db, "configuracoes", "modulos")
    )
  ]);

  const familia = familiaSnap.exists()
    ? familiaSnap.data()
    : {};

  const modulos = modulosSnap.exists()
    ? modulosSnap.data()
    : {};

  familiaIdAtual = familiaId;
  familiaNomeAtual = familia.nome || "Minha família";

  const liberado =
    modulos.tarefasLiberadas === true ||
    modulos.familiaPilotoId === familiaId ||
    (
      ADMIN_COMO_PILOTO_SEM_CONFIG &&
      !modulosSnap.exists() &&
      dadosUsuario.adminSistema === true
    );

  definirVisibilidade(liberado);

  if (!liberado) {
    pararListener();
    return;
  }

  await carregarMembros();
  iniciarListener();
}

async function carregarMembros() {
  const snap = await getDocs(
    collection(
      db,
      "familias",
      familiaIdAtual,
      "membros"
    )
  );

  membros = snap.docs
    .map((registro) => ({
      id: registro.id,
      ...registro.data()
    }))
    .filter((membro) => membro.ativo !== false)
    .sort((a, b) =>
      String(a.nome || a.email || "")
        .localeCompare(
          String(b.nome || b.email || ""),
          "pt-BR"
        )
    );

  preencherResponsaveis();
}

function preencherResponsaveis() {
  const campo = el("tarefaResponsavel");

  if (!campo) return;

  const valorAtual = campo.value;

  campo.innerHTML = `
    <option value="">
      Sem responsável
    </option>
  `;

  membros.forEach((membro) => {
    const option = document.createElement("option");

    option.value = membro.uid || membro.id;

    option.textContent =
      membro.nome ||
      membro.email ||
      "Membro da família";

    campo.appendChild(option);
  });

  if (
    [...campo.options]
      .some((opcao) => opcao.value === valorAtual)
  ) {
    campo.value = valorAtual;
  }
}

function pararListener() {
  if (typeof unsubscribeTarefas === "function") {
    unsubscribeTarefas();
  }

  unsubscribeTarefas = null;
  tarefas = [];

  renderizar();
}

function iniciarListener() {
  pararListener();

  unsubscribeTarefas = onSnapshot(
    collection(
      db,
      "familias",
      familiaIdAtual,
      "tarefas"
    ),

    (snap) => {
      tarefas = snap.docs.map(
        (registro) => ({
          id: registro.id,
          ...registro.data()
        })
      );

      renderizar();
    },

    async (erro) => {
      console.error(
        "Erro ao carregar tarefas:",
        erro
      );

      if (el("listaTarefas")) {
        el("listaTarefas").innerHTML = `
          <div class="empty">
            Não foi possível carregar as tarefas.
          </div>
        `;
      }

      await avisar(
        "Erro ao carregar tarefas",
        "Verifique a conexão e as regras do Firestore.",
        "warning"
      );
    }
  );
}

function ordenar(lista) {
  return [...lista].sort((a, b) => {
    const conclusao =
      Number(a.concluida === true) -
      Number(b.concluida === true);

    if (conclusao !== 0) {
      return conclusao;
    }

    const prioridade =
      pesoPrioridade(a.prioridade) -
      pesoPrioridade(b.prioridade);

    if (prioridade !== 0) {
      return prioridade;
    }

    return String(a.prazo || "9999-12-31")
      .localeCompare(
        String(b.prazo || "9999-12-31")
      );
  });
}

function renderizar() {
  const area = el("listaTarefas");

  if (!area) return;

  const concluidas = tarefas.filter(
    (tarefa) => tarefa.concluida === true
  ).length;

  if (el("tarefasTotal")) {
    el("tarefasTotal").textContent =
      String(tarefas.length);
  }

  if (el("tarefasPendentes")) {
    el("tarefasPendentes").textContent =
      String(tarefas.length - concluidas);
  }

  if (el("tarefasConcluidas")) {
    el("tarefasConcluidas").textContent =
      String(concluidas);
  }

  if (!tarefas.length) {
    area.innerHTML = `
      <div class="empty">
        Nenhuma tarefa cadastrada.<br>
        Toque em <strong>+ Nova</strong> para começar.
      </div>
    `;

    return;
  }

  area.innerHTML = ordenar(tarefas)
    .map((tarefa) => {
      const concluida =
        tarefa.concluida === true;

      const vencida = prazoVencido(
        tarefa.prazo,
        concluida
      );

      const prioridade =
        tarefa.prioridade || "media";

      return `
        <article
          class="
            tarefa-item
            ${concluida ? "concluida" : ""}
            ${vencida ? "vencida" : ""}
            prioridade-${prioridade}
          "
          data-tarefa-id="${escaparHtml(tarefa.id)}"
        >
          <div class="tarefa-topo">
            <button
              type="button"
              class="tarefa-check"
              data-acao="concluir"
              aria-label="${
                concluida
                  ? "Reabrir tarefa"
                  : "Concluir tarefa"
              }"
            >
              ${concluida ? "✓" : ""}
            </button>

            <div class="tarefa-conteudo">
              <strong class="tarefa-titulo">
                ${escaparHtml(
                  tarefa.titulo ||
                  "Tarefa sem título"
                )}
              </strong>

              <div class="tarefa-detalhes">
                <span>
                  👤 ${escaparHtml(
                    tarefa.responsavelNome ||
                    "Sem responsável"
                  )}
                </span>

                <span
                  class="${
                    vencida
                      ? "tarefa-prazo-vencido"
                      : ""
                  }"
                >
                  📅 ${formatarPrazo(tarefa.prazo)}
                </span>

                <span>
                  ⚑ ${rotuloPrioridade(prioridade)}
                </span>
              </div>

              ${
                tarefa.observacao
                  ? `
                    <p class="tarefa-observacao">
                      ${escaparHtml(
                        tarefa.observacao
                      )}
                    </p>
                  `
                  : ""
              }
            </div>
          </div>

          <div class="tarefa-acoes">
            <button
              type="button"
              class="tarefa-acao editar"
              data-acao="editar"
            >
              ✏️ Editar
            </button>

            <button
              type="button"
              class="tarefa-acao excluir"
              data-acao="excluir"
            >
              🗑️ Excluir
            </button>
          </div>
        </article>
      `;
    })
    .join("");
}

function abrirFormulario(tarefa = null) {
  const formulario = el("formularioTarefa");

  if (!formulario) return;

  tarefaEdicaoId = tarefa?.id || null;

  el("tituloFormularioTarefa").textContent =
    tarefa
      ? "Editar tarefa"
      : "Nova tarefa";

  el("tarefaTitulo").value =
    tarefa?.titulo || "";

  el("tarefaResponsavel").value =
    tarefa?.responsavelUid || "";

  el("tarefaPrazo").value =
    tarefa?.prazo || "";

  el("tarefaPrioridade").value =
    tarefa?.prioridade || "media";

  el("tarefaObservacao").value =
    tarefa?.observacao || "";

  el("btnSalvarTarefa").textContent =
    tarefa
      ? "Salvar alterações"
      : "Salvar tarefa";

  formulario.hidden = false;

  el("tarefaTitulo")?.focus();
}

function fecharFormulario() {
  const formulario = el("formularioTarefa");

  if (!formulario) return;

  formulario.hidden = true;
  tarefaEdicaoId = null;

  el("tarefaTitulo").value = "";
  el("tarefaResponsavel").value = "";
  el("tarefaPrazo").value = "";
  el("tarefaPrioridade").value = "media";
  el("tarefaObservacao").value = "";
  el("btnSalvarTarefa").textContent =
    "Salvar tarefa";
}

async function salvarTarefa() {
  if (
    !usuarioAtual ||
    !familiaIdAtual ||
    !moduloLiberado
  ) {
    return avisar(
      "Módulo indisponível",
      "O módulo Tarefas não está liberado para esta família.",
      "warning"
    );
  }

  const titulo =
    el("tarefaTitulo")?.value.trim() || "";

  const responsavelUid =
    el("tarefaResponsavel")?.value || "";

  const prazo =
    el("tarefaPrazo")?.value || "";

  const prioridade =
    el("tarefaPrioridade")?.value || "media";

  const observacao =
    el("tarefaObservacao")?.value.trim() || "";

  if (!titulo) {
    await avisar(
      "Informe a tarefa",
      "Digite o nome ou a descrição da tarefa.",
      "warning"
    );

    el("tarefaTitulo")?.focus();

    return;
  }

  const responsavel = membros.find(
    (membro) =>
      (membro.uid || membro.id) ===
      responsavelUid
  );

  const dados = {
    titulo,
    responsavelUid,

    responsavelNome:
      responsavel?.nome ||
      responsavel?.email ||
      "",

    prazo,
    prioridade,
    observacao,

    atualizadaEm:
      serverTimestamp(),

    atualizadoPorUid:
      usuarioAtual.uid,

    atualizadoPorNome:
      usuarioAtual.displayName ||
      usuarioAtual.email ||
      "",

    atualizadoPorEmail:
      usuarioAtual.email || ""
  };

  const botao = el("btnSalvarTarefa");

  const editando = Boolean(tarefaEdicaoId);

  try {
    if (botao) {
      botao.disabled = true;
      botao.textContent = "Salvando...";
    }

    if (editando) {
      await updateDoc(
        doc(
          db,
          "familias",
          familiaIdAtual,
          "tarefas",
          tarefaEdicaoId
        ),
        dados
      );
    } else {
      await addDoc(
        collection(
          db,
          "familias",
          familiaIdAtual,
          "tarefas"
        ),
        {
          ...dados,

          concluida: false,

          criadaEm:
            serverTimestamp(),

          criadoPorUid:
            usuarioAtual.uid,

          criadoPorNome:
            usuarioAtual.displayName ||
            usuarioAtual.email ||
            "",

          criadoPorEmail:
            usuarioAtual.email || ""
        }
      );
    }

    fecharFormulario();
  } catch (erro) {
    console.error(
      "Erro ao salvar tarefa:",
      erro
    );

    await avisar(
      "Erro ao salvar",
      "Não foi possível salvar a tarefa.",
      "warning"
    );
  } finally {
    if (botao) {
      botao.disabled = false;

      botao.textContent = editando
        ? "Salvar alterações"
        : "Salvar tarefa";
    }
  }
}

async function alternarConclusao(tarefa) {
  try {
    const concluir =
      tarefa.concluida !== true;

    await updateDoc(
      doc(
        db,
        "familias",
        familiaIdAtual,
        "tarefas",
        tarefa.id
      ),
      {
        concluida: concluir,

        concluidaEm:
          concluir
            ? serverTimestamp()
            : null,

        concluidaPorUid:
          concluir
            ? usuarioAtual?.uid || ""
            : "",

        concluidaPorNome:
          concluir
            ? (
                usuarioAtual?.displayName ||
                usuarioAtual?.email ||
                ""
              )
            : "",

        atualizadaEm:
          serverTimestamp()
      }
    );
  } catch (erro) {
    console.error(
      "Erro ao concluir tarefa:",
      erro
    );

    await avisar(
      "Tarefa não atualizada",
      "Não foi possível alterar a situação da tarefa.",
      "warning"
    );
  }
}

async function excluirTarefa(tarefa) {
  const aceitou = await confirmar(
    "Excluir tarefa",
    `Deseja excluir a tarefa "${tarefa.titulo}"?`
  );

  if (!aceitou) return;

  try {
    await deleteDoc(
      doc(
        db,
        "familias",
        familiaIdAtual,
        "tarefas",
        tarefa.id
      )
    );

    if (tarefaEdicaoId === tarefa.id) {
      fecharFormulario();
    }
  } catch (erro) {
    console.error(
      "Erro ao excluir tarefa:",
      erro
    );

    await avisar(
      "Erro ao excluir",
      "Não foi possível excluir a tarefa.",
      "warning"
    );
  }
}

async function tratarCliqueLista(evento) {
  const botao = evento.target.closest(
    "[data-acao]"
  );

  if (!botao) return;

  const item = botao.closest(
    "[data-tarefa-id]"
  );

  const tarefa = tarefas.find(
    (registro) =>
      registro.id ===
      item?.dataset.tarefaId
  );

  if (!tarefa) return;

  if (botao.dataset.acao === "editar") {
    abrirFormulario(tarefa);
  }

  if (botao.dataset.acao === "concluir") {
    await alternarConclusao(tarefa);
  }

  if (botao.dataset.acao === "excluir") {
    await excluirTarefa(tarefa);
  }
}

function configurarEventos() {
  el("btnNovaTarefa")
    ?.addEventListener(
      "click",
      () => abrirFormulario()
    );

  el("btnCancelarTarefa")
    ?.addEventListener(
      "click",
      fecharFormulario
    );

  el("btnSalvarTarefa")
    ?.addEventListener(
      "click",
      salvarTarefa
    );

  el("listaTarefas")
    ?.addEventListener(
      "click",
      tratarCliqueLista
    );
}

window.ListaLarTarefas = {
  abrirNovaTarefa(dados = {}) {
    abrirFormulario({
      titulo:
        dados.titulo || "",

      responsavelUid:
        dados.responsavelUid || "",

      prazo:
        dados.prazo || "",

      prioridade:
        dados.prioridade || "media",

      observacao:
        dados.observacao || ""
    });
  },

  obterFamiliaId() {
    return familiaIdAtual;
  },

  obterNomeFamilia() {
    return familiaNomeAtual;
  },

  obterMembros() {
    return [...membros];
  },

  estaLiberado() {
    return moduloLiberado;
  }
};

function iniciar() {
  configurarEventos();

  onAuthStateChanged(
    auth,
    async (user) => {
      usuarioAtual = user || null;

      if (!user) {
        familiaIdAtual = null;
        familiaNomeAtual = "";
        membros = [];

        pararListener();
        definirVisibilidade(false);
        fecharFormulario();

        return;
      }

      try {
        await carregarContexto(user);

        window.dispatchEvent(
          new CustomEvent(
            "listalar:tarefas-pronto",
            {
              detail: {
                familiaId:
                  familiaIdAtual,

                liberado:
                  moduloLiberado
              }
            }
          )
        );
      } catch (erro) {
        console.error(
          "Erro ao iniciar módulo Tarefas:",
          erro
        );

        definirVisibilidade(false);
      }
    }
  );
}

if (document.readyState === "loading") {
  document.addEventListener(
    "DOMContentLoaded",
    iniciar,
    {
      once: true
    }
  );
} else {
  iniciar();
}
