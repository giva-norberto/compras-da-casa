// ==========================================
// ListaLar - Módulo Tarefas
// Arquivo: tarefas.js
// Versão: 2.1.0
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


// ==========================================
// Firebase
// ==========================================

const firebaseConfig = {
  apiKey: "AIzaSyC2U7q5HupxKyI3QiAyan-2Sio55NSir0Y",
  authDomain: "compras-da-casa.firebaseapp.com",
  projectId: "compras-da-casa",
  storageBucket: "compras-da-casa.firebasestorage.app",
  messagingSenderId: "63765433273",
  appId: "1:63765433273:web:c478a3dd33ef3cd55a0468"
};

const app = getApps().length > 0
  ? getApp()
  : initializeApp(firebaseConfig);

const auth = getAuth(app);
const db = getFirestore(app);


// Enquanto configuracoes/modulos ainda não estiver definido,
// o administrador do sistema pode testar o módulo.
const ADMIN_COMO_PILOTO_SEM_CONFIG = true;


// ==========================================
// Estado
// ==========================================

let usuarioAtual = null;
let familiaIdAtual = null;
let familiaNomeAtual = "";
let moduloLiberado = false;
let estruturaCriada = false;
let eventosConfigurados = false;
let salvandoTarefa = false;

let membros = [];
let tarefas = [];
let tarefaEdicaoId = null;
let unsubscribeTarefas = null;

const el = (id) => document.getElementById(id);


// ==========================================
// Utilidades
// ==========================================

function esperar(tempo) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, tempo);
  });
}

function escaparHtml(valor) {
  return String(valor ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatarDataIso(dataIso) {
  if (!dataIso) {
    return "";
  }

  const partes = String(dataIso).split("-");

  if (partes.length !== 3) {
    return String(dataIso);
  }

  return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

function formatarCompromisso(
  dataAgendada,
  horario
) {
  if (!dataAgendada) {
    return "";
  }

  const dataFormatada =
    formatarDataIso(dataAgendada);

  return horario
    ? `${dataFormatada} às ${horario}`
    : dataFormatada;
}

function prazoVencido(
  prazo,
  concluida
) {
  if (
    !prazo ||
    concluida === true
  ) {
    return false;
  }

  const hoje = new Date();

  hoje.setHours(
    0,
    0,
    0,
    0
  );

  const dataPrazo =
    new Date(
      `${prazo}T00:00:00`
    );

  return (
    !Number.isNaN(
      dataPrazo.getTime()
    ) &&
    dataPrazo.getTime() <
      hoje.getTime()
  );
}

function pesoPrioridade(
  prioridade
) {
  return {
    alta: 1,
    media: 2,
    baixa: 3
  }[prioridade] || 4;
}

function rotuloPrioridade(
  prioridade
) {
  return {
    alta: "Alta",
    media: "Média",
    baixa: "Baixa"
  }[prioridade] || "Média";
}

function nomeUsuarioAtual() {
  return (
    usuarioAtual?.displayName ||
    usuarioAtual?.email ||
    "Usuário"
  );
}

function nomeMembro(membro) {
  return (
    membro?.nome ||
    membro?.displayName ||
    membro?.email ||
    "Membro da família"
  );
}

async function avisar(
  titulo,
  texto,
  tipo = "info"
) {
  if (
    typeof window.mostrarMensagem ===
    "function"
  ) {
    await window.mostrarMensagem({
      titulo,
      texto,
      tipo
    });

    return;
  }

  window.alert(
    `${titulo}\n\n${texto}`
  );
}

async function confirmarExclusao(
  titulo,
  texto
) {
  if (
    typeof window.confirmarAcao ===
    "function"
  ) {
    return window.confirmarAcao({
      titulo,
      texto,
      tipo: "warning",
      confirmarTexto: "Excluir",
      cancelarTexto: "Cancelar",
      confirmarClasse: "danger"
    });
  }

  return window.confirm(
    `${titulo}\n\n${texto}`
  );
}

function ordenarTarefas(lista) {
  return [...lista].sort(
    (a, b) => {
      const conclusaoA =
        a.concluida === true
          ? 1
          : 0;

      const conclusaoB =
        b.concluida === true
          ? 1
          : 0;

      if (
        conclusaoA !==
        conclusaoB
      ) {
        return (
          conclusaoA -
          conclusaoB
        );
      }

      const dataA = String(
        a.dataAgendada ||
        a.data ||
        a.prazo ||
        "9999-12-31"
      );

      const dataB = String(
        b.dataAgendada ||
        b.data ||
        b.prazo ||
        "9999-12-31"
      );

      if (dataA !== dataB) {
        return dataA.localeCompare(
          dataB
        );
      }

      const prioridadeA =
        pesoPrioridade(
          a.prioridade
        );

      const prioridadeB =
        pesoPrioridade(
          b.prioridade
        );

      if (
        prioridadeA !==
        prioridadeB
      ) {
        return (
          prioridadeA -
          prioridadeB
        );
      }

      return String(
        a.titulo || ""
      ).localeCompare(
        String(
          b.titulo || ""
        ),
        "pt-BR"
      );
    }
  );
}


// ==========================================
// Criação automática da tela
// ==========================================

function criarTelaTarefas() {
  if (el("tarefas")) {
    return true;
  }

  const areaPrincipal =
    document.querySelector(
      "main.app"
    );

  if (!areaPrincipal) {
    return false;
  }

  const secao =
    document.createElement(
      "section"
    );

  secao.id = "tarefas";
  secao.className = "screen";

  secao.innerHTML = `
    <div class="card tarefas-card-principal">

      <div class="title-row tarefas-cabecalho">

        <div>
          <h2 class="title">
            Tarefas
          </h2>

          <p
            id="tarefasSubtitulo"
            class="subtitle"
          >
            Organize as atividades da família.
          </p>
        </div>

        <button
          id="btnNovaTarefa"
          type="button"
          class="btn btn-primary tarefas-btn-nova"
        >
          + Nova
        </button>

      </div>


      <div class="summary">

        <div class="mini-card">
          <strong id="tarefasTotal">
            0
          </strong>

          <span>
            Total
          </span>
        </div>


        <div class="mini-card">
          <strong id="tarefasPendentes">
            0
          </strong>

          <span>
            Pendentes
          </span>
        </div>


        <div class="mini-card">
          <strong id="tarefasConcluidas">
            0
          </strong>

          <span>
            Concluídas
          </span>
        </div>

      </div>


      <form
        id="formularioTarefa"
        class="tarefas-formulario"
        autocomplete="off"
        novalidate
        hidden
      >

        <div class="tarefas-formulario-titulo">

          <strong id="tituloFormularioTarefa">
            Nova tarefa
          </strong>

        </div>


        <div class="tarefas-campo">

          <label for="tarefaTitulo">
            Tarefa
          </label>

          <input
            id="tarefaTitulo"
            name="tarefaTitulo"
            type="text"
            maxlength="120"
            placeholder="Ex.: Levar filho ao médico"
            required
          >

        </div>


        <div class="tarefas-grid-duas-colunas">

          <div class="tarefas-campo">

            <label for="tarefaResponsavel">
              Responsável
            </label>

            <select
              id="tarefaResponsavel"
              name="tarefaResponsavel"
            >

              <option value="">
                Sem responsável
              </option>

            </select>

          </div>


          <div class="tarefas-campo">

            <label for="tarefaPrioridade">
              Prioridade
            </label>

            <select
              id="tarefaPrioridade"
              name="tarefaPrioridade"
            >

              <option value="baixa">
                Baixa
              </option>

              <option
                value="media"
                selected
              >
                Média
              </option>

              <option value="alta">
                Alta
              </option>

            </select>

          </div>

        </div>


        <div class="tarefas-grid-data-hora">

          <div class="tarefas-campo">

            <label for="tarefaData">
              Data do compromisso
            </label>

            <input
              id="tarefaData"
              name="tarefaData"
              type="date"
            >

          </div>


          <div class="tarefas-campo">

            <label for="tarefaHorario">
              Horário
            </label>

            <input
              id="tarefaHorario"
              name="tarefaHorario"
              type="time"
            >

          </div>

        </div>


        <div class="tarefas-campo">

          <label for="tarefaPrazo">
            Prazo da tarefa
          </label>

          <input
            id="tarefaPrazo"
            name="tarefaPrazo"
            type="date"
          >

        </div>


        <div class="tarefas-campo">

          <label for="tarefaObservacao">
            Observação
          </label>

          <textarea
            id="tarefaObservacao"
            name="tarefaObservacao"
            rows="2"
            maxlength="500"
            placeholder="Informação adicional, se necessário"
          ></textarea>

        </div>


        <div class="tarefas-formulario-acoes">

          <button
            id="btnCancelarTarefa"
            type="button"
            class="btn btn-yellow"
          >
            Cancelar
          </button>


          <button
            id="btnSalvarTarefa"
            type="submit"
            class="btn btn-primary"
          >
            Salvar tarefa
          </button>

        </div>

      </form>


      <div
        id="listaTarefas"
        class="tarefas-lista"
      >

        <div class="empty">
          Carregando tarefas...
        </div>

      </div>

    </div>
  `;

  const rodape =
    areaPrincipal.querySelector(
      ".footer"
    );

  if (rodape) {
    areaPrincipal.insertBefore(
      secao,
      rodape
    );
  } else {
    areaPrincipal.appendChild(
      secao
    );
  }

  return true;
}

function criarBotaoTarefas() {
  if (el("tab-tarefas")) {
    return true;
  }

  const menuInferior =
    document.querySelector(
      ".bottom-nav"
    );

  if (!menuInferior) {
    return false;
  }

  const botao =
    document.createElement(
      "button"
    );

  botao.id = "tab-tarefas";
  botao.className = "tab";
  botao.type = "button";
  botao.hidden = true;

  botao.setAttribute(
    "aria-label",
    "Abrir tarefas"
  );

  botao.innerHTML = `
    <span class="ico">
      ✅
    </span>

    <span>
      Tarefas
    </span>
  `;

  const botaoAdmin =
    el("tab-admin");

  if (
    botaoAdmin &&
    botaoAdmin.parentElement ===
      menuInferior
  ) {
    menuInferior.insertBefore(
      botao,
      botaoAdmin
    );
  } else {
    menuInferior.appendChild(
      botao
    );
  }

  return true;
}

function criarEstruturaModulo() {
  const telaCriada =
    criarTelaTarefas();

  const botaoCriado =
    criarBotaoTarefas();

  estruturaCriada =
    telaCriada &&
    botaoCriado;

  if (estruturaCriada) {
    configurarEventos();
    ajustarMenu();
  }

  return estruturaCriada;
}

async function aguardarEstruturaListaLar() {
  for (
    let tentativa = 1;
    tentativa <= 30;
    tentativa += 1
  ) {
    if (criarEstruturaModulo()) {
      return true;
    }

    await esperar(100);
  }

  console.error(
    "Módulo Tarefas: main.app ou .bottom-nav não encontrado."
  );

  return false;
}


// ==========================================
// Menu e navegação
// ==========================================

function ajustarMenu() {
  const menu =
    document.querySelector(
      ".bottom-nav"
    );

  if (!menu) {
    return;
  }

  const quantidade = [
    ...menu.querySelectorAll(
      ".tab"
    )
  ].filter((botao) => {
    return !botao.hidden;
  }).length;

  menu.style.gridTemplateColumns =
    `repeat(${Math.max(
      quantidade,
      1
    )}, minmax(0, 1fr))`;
}

function abrirTelaTarefas() {
  if (!moduloLiberado) {
    return;
  }

  if (
    typeof window.abrirTela ===
    "function"
  ) {
    window.abrirTela(
      "tarefas"
    );

    return;
  }

  document
    .querySelectorAll(
      ".screen"
    )
    .forEach((tela) => {
      tela.classList.remove(
        "active"
      );
    });

  document
    .querySelectorAll(
      ".tab"
    )
    .forEach((aba) => {
      aba.classList.remove(
        "active"
      );
    });

  el("tarefas")
    ?.classList.add(
      "active"
    );

  el("tab-tarefas")
    ?.classList.add(
      "active"
    );

  window.scrollTo({
    top: 0,
    behavior: "auto"
  });
}

function definirVisibilidade(
  liberado
) {
  moduloLiberado =
    liberado === true;

  const botao =
    el("tab-tarefas");

  if (botao) {
    botao.hidden =
      !moduloLiberado;
  }

  ajustarMenu();

  if (
    !moduloLiberado &&
    el("tarefas")
      ?.classList
      .contains("active")
  ) {
    if (
      typeof window.abrirTela ===
      "function"
    ) {
      window.abrirTela(
        "lista"
      );
    } else {
      el("tarefas")
        ?.classList
        .remove("active");

      el("tab-tarefas")
        ?.classList
        .remove("active");

      el("lista")
        ?.classList
        .add("active");

      el("tab-lista")
        ?.classList
        .add("active");
    }
  }
}


// ==========================================
// Contexto da família e liberação
// ==========================================

async function lerConfiguracaoModulos() {
  try {
    return await getDoc(
      doc(
        db,
        "configuracoes",
        "modulos"
      )
    );
  } catch (erro) {
    console.warn(
      "Módulo Tarefas: não foi possível ler configuracoes/modulos.",
      erro
    );

    return null;
  }
}

async function carregarContexto(
  user
) {
  const usuarioSnap =
    await getDoc(
      doc(
        db,
        "usuarios",
        user.uid
      )
    );

  if (!usuarioSnap.exists()) {
    familiaIdAtual = null;
    familiaNomeAtual = "";

    definirVisibilidade(
      false
    );

    pararListener();

    return;
  }

  const dadosUsuario =
    usuarioSnap.data();

  const familiaId =
    dadosUsuario.familiaId ||
    "";

  if (!familiaId) {
    familiaIdAtual = null;
    familiaNomeAtual = "";

    definirVisibilidade(
      false
    );

    pararListener();

    return;
  }

  const [
    familiaSnap,
    modulosSnap
  ] = await Promise.all([

    getDoc(
      doc(
        db,
        "familias",
        familiaId
      )
    ),

    lerConfiguracaoModulos()

  ]);

  const familia =
    familiaSnap.exists()
      ? familiaSnap.data()
      : {};

  const modulos =
    modulosSnap?.exists()
      ? modulosSnap.data()
      : {};

  familiaIdAtual =
    familiaId;

  familiaNomeAtual =
    familia.nome ||
    "Minha família";

  const configuracaoSemDefinicao =
    !modulosSnap ||
    !modulosSnap.exists() ||
    (
      typeof modulos
        .tarefasLiberadas !==
        "boolean" &&
      !modulos.familiaPilotoId
    );

  const liberadoParaTodos =
    modulos.tarefasLiberadas ===
    true;

  const liberadoParaPiloto =
    Boolean(
      modulos.familiaPilotoId
    ) &&
    modulos.familiaPilotoId ===
      familiaId;

  const adminComoPiloto =
    ADMIN_COMO_PILOTO_SEM_CONFIG &&
    configuracaoSemDefinicao &&
    dadosUsuario.adminSistema ===
      true;

  const liberado =
    liberadoParaTodos ||
    liberadoParaPiloto ||
    adminComoPiloto;

  definirVisibilidade(
    liberado
  );

  const subtitulo =
    el("tarefasSubtitulo");

  if (subtitulo) {
    subtitulo.textContent =
      `Organize as atividades da ${familiaNomeAtual}.`;
  }

  if (!liberado) {
    membros = [];

    preencherResponsaveis();
    pararListener();

    return;
  }

  await carregarMembros();
  iniciarListener();
}


// ==========================================
// Membros da família
// ==========================================

async function carregarMembros() {
  membros = [];

  try {
    const snap =
      await getDocs(
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
      .filter((membro) => {
        return (
          membro.ativo !==
          false
        );
      });

  } catch (erro) {
    console.warn(
      "Módulo Tarefas: não foi possível carregar os membros.",
      erro
    );
  }

  const usuarioJaIncluido =
    membros.some((membro) => {
      return (
        (
          membro.uid ||
          membro.id
        ) ===
        usuarioAtual?.uid
      );
    });

  if (
    usuarioAtual &&
    !usuarioJaIncluido
  ) {
    membros.push({
      id:
        usuarioAtual.uid,

      uid:
        usuarioAtual.uid,

      nome:
        usuarioAtual
          .displayName ||
        "",

      email:
        usuarioAtual
          .email ||
        "",

      ativo: true
    });
  }

  membros.sort(
    (a, b) => {
      return nomeMembro(a)
        .localeCompare(
          nomeMembro(b),
          "pt-BR"
        );
    }
  );

  preencherResponsaveis();
}

function preencherResponsaveis() {
  const campo =
    el("tarefaResponsavel");

  if (!campo) {
    return;
  }

  const valorAtual =
    campo.value;

  campo.innerHTML = `
    <option value="">
      Sem responsável
    </option>
  `;

  membros.forEach(
    (membro) => {
      const option =
        document.createElement(
          "option"
        );

      option.value =
        membro.uid ||
        membro.id;

      option.textContent =
        nomeMembro(membro);

      campo.appendChild(
        option
      );
    }
  );

  const valorAindaExiste = [
    ...campo.options
  ].some((opcao) => {
    return (
      opcao.value ===
      valorAtual
    );
  });

  if (valorAindaExiste) {
    campo.value =
      valorAtual;
  }
}


// ==========================================
// Leitura em tempo real
// ==========================================

function pararListener() {
  if (
    typeof unsubscribeTarefas ===
    "function"
  ) {
    unsubscribeTarefas();
  }

  unsubscribeTarefas = null;
  tarefas = [];

  renderizarTarefas();
}

function iniciarListener() {
  pararListener();

  if (
    !familiaIdAtual ||
    !moduloLiberado
  ) {
    return;
  }

  const tarefasRef =
    collection(
      db,
      "familias",
      familiaIdAtual,
      "tarefas"
    );

  unsubscribeTarefas =
    onSnapshot(
      tarefasRef,

      (snap) => {
        tarefas =
          snap.docs.map(
            (registro) => ({
              id:
                registro.id,

              ...registro.data()
            })
          );

        renderizarTarefas();
      },

      async (erro) => {
        console.error(
          "Erro ao carregar tarefas:",
          erro
        );

        const area =
          el("listaTarefas");

        if (area) {
          area.innerHTML = `
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


// ==========================================
// Renderização
// ==========================================

function atualizarResumo() {
  const total =
    tarefas.length;

  const concluidas =
    tarefas.filter(
      (tarefa) => {
        return (
          tarefa.concluida ===
          true
        );
      }
    ).length;

  const pendentes =
    total -
    concluidas;

  if (el("tarefasTotal")) {
    el("tarefasTotal")
      .textContent =
        String(total);
  }

  if (
    el("tarefasPendentes")
  ) {
    el("tarefasPendentes")
      .textContent =
        String(pendentes);
  }

  if (
    el("tarefasConcluidas")
  ) {
    el("tarefasConcluidas")
      .textContent =
        String(concluidas);
  }
}

function renderizarTarefas() {
  atualizarResumo();

  const area =
    el("listaTarefas");

  if (!area) {
    return;
  }

  if (!moduloLiberado) {
    area.innerHTML = `
      <div class="empty">
        O módulo Tarefas ainda não está liberado para esta família.
      </div>
    `;

    return;
  }

  if (
    tarefas.length ===
    0
  ) {
    area.innerHTML = `
      <div class="empty">
        Nenhuma tarefa cadastrada.<br>
        Toque em <strong>+ Nova</strong> para começar.
      </div>
    `;

    return;
  }

  area.innerHTML =
    ordenarTarefas(tarefas)
      .map((tarefa) => {
        const concluida =
          tarefa.concluida ===
          true;

        const vencida =
          prazoVencido(
            tarefa.prazo,
            concluida
          );

        const prioridade =
          tarefa.prioridade ||
          "media";

        const dataAgendada =
          tarefa.dataAgendada ||
          tarefa.data ||
          "";

        const horario =
          tarefa.horario ||
          "";

        const compromisso =
          formatarCompromisso(
            dataAgendada,
            horario
          );

        const prazoFormatado =
          formatarDataIso(
            tarefa.prazo
          );

        const titulo =
          escaparHtml(
            tarefa.titulo ||
            "Tarefa sem título"
          );

        const responsavel =
          escaparHtml(
            tarefa
              .responsavelNome ||
            "Sem responsável"
          );

        const observacao =
          escaparHtml(
            tarefa.observacao ||
            ""
          );

        const classes = [
          "tarefa-item",

          concluida
            ? "concluida"
            : "",

          vencida
            ? "vencida"
            : "",

          `prioridade-${prioridade}`
        ]
          .filter(Boolean)
          .join(" ");

        return `
          <article
            class="${classes}"
            data-tarefa-id="${escaparHtml(
              tarefa.id
            )}"
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
                title="${
                  concluida
                    ? "Reabrir tarefa"
                    : "Concluir tarefa"
                }"
              >
                ${concluida ? "✓" : ""}
              </button>


              <div class="tarefa-conteudo">

                <strong class="tarefa-titulo">
                  ${titulo}
                </strong>


                <div class="tarefa-detalhes">

                  <span>
                    👤 ${responsavel}
                  </span>


                  ${
                    compromisso
                      ? `
                        <span class="tarefa-data-compromisso">
                          📅 ${escaparHtml(
                            compromisso
                          )}
                        </span>
                      `
                      : ""
                  }


                  ${
                    prazoFormatado
                      ? `
                        <span
                          class="tarefa-prazo ${
                            vencida
                              ? "tarefa-prazo-vencido"
                              : ""
                          }"
                        >
                          ⏳ Até ${escaparHtml(
                            prazoFormatado
                          )}
                        </span>
                      `
                      : ""
                  }


                  <span>
                    ⚑ ${rotuloPrioridade(
                      prioridade
                    )}
                  </span>

                </div>


                ${
                  observacao
                    ? `
                      <p class="tarefa-observacao">
                        ${observacao}
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


// ==========================================
// Formulário
// ==========================================

function abrirFormulario(
  tarefa = null
) {
  if (!moduloLiberado) {
    return;
  }

  const formulario =
    el("formularioTarefa");

  if (!formulario) {
    return;
  }

  tarefaEdicaoId =
    tarefa?.id ||
    null;

  el("tituloFormularioTarefa")
    .textContent =
      tarefa
        ? "Editar tarefa"
        : "Nova tarefa";

  el("tarefaTitulo").value =
    tarefa?.titulo ||
    "";

  el("tarefaResponsavel")
    .value =
      tarefa
        ?.responsavelUid ||
      "";

  el("tarefaPrioridade")
    .value =
      tarefa?.prioridade ||
      "media";

  el("tarefaData").value =
    tarefa?.dataAgendada ||
    tarefa?.data ||
    "";

  el("tarefaHorario").value =
    tarefa?.horario ||
    "";

  el("tarefaPrazo").value =
    tarefa?.prazo ||
    "";

  el("tarefaObservacao")
    .value =
      tarefa?.observacao ||
      "";

  el("btnSalvarTarefa")
    .textContent =
      tarefa
        ? "Salvar alterações"
        : "Salvar tarefa";

  formulario.hidden =
    false;

  window.setTimeout(
    () => {
      el("tarefaTitulo")
        ?.focus();

      formulario.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
    },
    50
  );
}

function limparFormulario() {
  if (el("tarefaTitulo")) {
    el("tarefaTitulo")
      .value = "";
  }

  if (
    el("tarefaResponsavel")
  ) {
    el("tarefaResponsavel")
      .value = "";
  }

  if (
    el("tarefaPrioridade")
  ) {
    el("tarefaPrioridade")
      .value =
        "media";
  }

  if (el("tarefaData")) {
    el("tarefaData")
      .value = "";
  }

  if (el("tarefaHorario")) {
    el("tarefaHorario")
      .value = "";
  }

  if (el("tarefaPrazo")) {
    el("tarefaPrazo")
      .value = "";
  }

  if (
    el("tarefaObservacao")
  ) {
    el("tarefaObservacao")
      .value = "";
  }
}

function fecharFormulario() {
  const formulario =
    el("formularioTarefa");

  if (!formulario) {
    return;
  }

  formulario.hidden = true;
  tarefaEdicaoId = null;

  limparFormulario();

  if (
    el("tituloFormularioTarefa")
  ) {
    el("tituloFormularioTarefa")
      .textContent =
        "Nova tarefa";
  }

  if (el("btnSalvarTarefa")) {
    el("btnSalvarTarefa")
      .textContent =
        "Salvar tarefa";
  }
}

async function salvarTarefa(
  evento
) {
  evento?.preventDefault();

  if (salvandoTarefa) {
    return;
  }

  if (
    !usuarioAtual ||
    !familiaIdAtual ||
    !moduloLiberado
  ) {
    await avisar(
      "Módulo indisponível",
      "O módulo Tarefas não está liberado para esta família.",
      "warning"
    );

    return;
  }

  const titulo =
    el("tarefaTitulo")
      ?.value
      .trim() ||
    "";

  const responsavelUid =
    el("tarefaResponsavel")
      ?.value ||
    "";

  const prioridade =
    el("tarefaPrioridade")
      ?.value ||
    "media";

  const dataAgendada =
    el("tarefaData")
      ?.value ||
    "";

  const horario =
    el("tarefaHorario")
      ?.value ||
    "";

  const prazo =
    el("tarefaPrazo")
      ?.value ||
    "";

  const observacao =
    el("tarefaObservacao")
      ?.value
      .trim() ||
    "";

  if (!titulo) {
    await avisar(
      "Informe a tarefa",
      "Digite o nome ou a descrição da tarefa.",
      "warning"
    );

    el("tarefaTitulo")
      ?.focus();

    return;
  }

  if (
    horario &&
    !dataAgendada
  ) {
    await avisar(
      "Informe a data",
      "Para usar um horário, informe também a data do compromisso.",
      "warning"
    );

    el("tarefaData")
      ?.focus();

    return;
  }

  const responsavel =
    membros.find((membro) => {
      return (
        (
          membro.uid ||
          membro.id
        ) ===
        responsavelUid
      );
    });

  const dados = {
    titulo,

    responsavelUid,

    responsavelNome:
      responsavel
        ? nomeMembro(
            responsavel
          )
        : "",

    prioridade,

    dataAgendada,

    horario,

    prazo,

    observacao,

    atualizadaEm:
      serverTimestamp(),

    atualizadoPorUid:
      usuarioAtual.uid,

    atualizadoPorNome:
      nomeUsuarioAtual(),

    atualizadoPorEmail:
      usuarioAtual.email ||
      ""
  };

  const botao =
    el("btnSalvarTarefa");

  const editando =
    Boolean(
      tarefaEdicaoId
    );

  const tarefaIdAtual =
    tarefaEdicaoId;

  try {
    salvandoTarefa =
      true;

    if (botao) {
      botao.disabled =
        true;

      botao.textContent =
        "Salvando...";
    }

    if (
      editando &&
      tarefaIdAtual
    ) {
      await updateDoc(
        doc(
          db,
          "familias",
          familiaIdAtual,
          "tarefas",
          tarefaIdAtual
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

          concluida:
            false,

          criadaEm:
            serverTimestamp(),

          criadoPorUid:
            usuarioAtual.uid,

          criadoPorNome:
            nomeUsuarioAtual(),

          criadoPorEmail:
            usuarioAtual.email ||
            ""
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
      "Não foi possível salvar a tarefa. Verifique sua conexão e as regras do Firestore.",
      "warning"
    );

  } finally {
    salvandoTarefa =
      false;

    if (botao) {
      botao.disabled =
        false;

      botao.textContent =
        editando
          ? "Salvar alterações"
          : "Salvar tarefa";
    }
  }
}


// ==========================================
// Ações
// ==========================================

async function alternarConclusao(
  tarefa
) {
  if (
    !familiaIdAtual ||
    !usuarioAtual
  ) {
    return;
  }

  const concluir =
    tarefa.concluida !==
    true;

  try {
    await updateDoc(
      doc(
        db,
        "familias",
        familiaIdAtual,
        "tarefas",
        tarefa.id
      ),
      {
        concluida:
          concluir,

        concluidaEm:
          concluir
            ? serverTimestamp()
            : null,

        concluidaPorUid:
          concluir
            ? usuarioAtual.uid
            : "",

        concluidaPorNome:
          concluir
            ? nomeUsuarioAtual()
            : "",

        atualizadaEm:
          serverTimestamp(),

        atualizadoPorUid:
          usuarioAtual.uid,

        atualizadoPorNome:
          nomeUsuarioAtual(),

        atualizadoPorEmail:
          usuarioAtual.email ||
          ""
      }
    );

  } catch (erro) {
    console.error(
      "Erro ao alterar conclusão da tarefa:",
      erro
    );

    await avisar(
      "Tarefa não atualizada",
      "Não foi possível alterar a situação da tarefa.",
      "warning"
    );
  }
}

async function excluirTarefa(
  tarefa
) {
  const aceitou =
    await confirmarExclusao(
      "Excluir tarefa",
      `Deseja excluir a tarefa "${tarefa.titulo || "Tarefa"}"?`
    );

  if (
    !aceitou ||
    !familiaIdAtual
  ) {
    return;
  }

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

    if (
      tarefaEdicaoId ===
      tarefa.id
    ) {
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

async function tratarCliqueLista(
  evento
) {
  const botao =
    evento.target.closest(
      "[data-acao]"
    );

  if (!botao) {
    return;
  }

  const item =
    botao.closest(
      "[data-tarefa-id]"
    );

  const tarefaId =
    item?.dataset.tarefaId ||
    "";

  const tarefa =
    tarefas.find((registro) => {
      return (
        registro.id ===
        tarefaId
      );
    });

  if (!tarefa) {
    return;
  }

  const acao =
    botao.dataset.acao;

  if (acao === "editar") {
    abrirFormulario(
      tarefa
    );

    return;
  }

  if (acao === "concluir") {
    await alternarConclusao(
      tarefa
    );

    return;
  }

  if (acao === "excluir") {
    await excluirTarefa(
      tarefa
    );
  }
}


// ==========================================
// Eventos
// ==========================================

function configurarEventos() {
  if (eventosConfigurados) {
    return;
  }

  const botaoMenu =
    el("tab-tarefas");

  const botaoNova =
    el("btnNovaTarefa");

  const botaoCancelar =
    el("btnCancelarTarefa");

  const formulario =
    el("formularioTarefa");

  const lista =
    el("listaTarefas");

  if (
    !botaoMenu ||
    !botaoNova ||
    !botaoCancelar ||
    !formulario ||
    !lista
  ) {
    return;
  }

  botaoMenu.addEventListener(
    "click",
    abrirTelaTarefas
  );

  botaoNova.addEventListener(
    "click",
    () => {
      abrirFormulario();
    }
  );

  botaoCancelar.addEventListener(
    "click",
    fecharFormulario
  );

  formulario.addEventListener(
    "submit",
    salvarTarefa
  );

  lista.addEventListener(
    "click",
    tratarCliqueLista
  );

  eventosConfigurados =
    true;
}


// ==========================================
// Integração com tarefas-audio.js
// ==========================================

window.ListaLarTarefas = {

  abrirTela() {
    abrirTelaTarefas();
  },

  abrirNovaTarefa(
    dados = {}
  ) {
    if (!moduloLiberado) {
      return false;
    }

    abrirTelaTarefas();

    abrirFormulario({
      id: null,

      titulo:
        dados.titulo ||
        "",

      responsavelUid:
        dados.responsavelUid ||
        "",

      prioridade:
        dados.prioridade ||
        "media",

      dataAgendada:
        dados.dataAgendada ||
        dados.data ||
        "",

      horario:
        dados.horario ||
        "",

      prazo:
        dados.prazo ||
        "",

      observacao:
        dados.observacao ||
        ""
    });

    return true;
  },

  obterFamiliaId() {
    return familiaIdAtual;
  },

  obterNomeFamilia() {
    return familiaNomeAtual;
  },

  obterMembros() {
    return [
      ...membros
    ];
  },

  obterTarefas() {
    return [
      ...tarefas
    ];
  },

  estaLiberado() {
    return moduloLiberado;
  }

};


// ==========================================
// Inicialização
// ==========================================

async function iniciar() {
  const estruturaDisponivel =
    await aguardarEstruturaListaLar();

  if (!estruturaDisponivel) {
    return;
  }

  definirVisibilidade(
    false
  );

  renderizarTarefas();

  onAuthStateChanged(
    auth,

    async (user) => {
      usuarioAtual =
        user ||
        null;

      if (!user) {
        familiaIdAtual = null;
        familiaNomeAtual = "";
        membros = [];
        tarefaEdicaoId = null;

        fecharFormulario();
        pararListener();
        preencherResponsaveis();

        definirVisibilidade(
          false
        );

        return;
      }

      try {
        await carregarContexto(
          user
        );

        window.dispatchEvent(
          new CustomEvent(
            "listalar:tarefas-pronto",
            {
              detail: {
                familiaId:
                  familiaIdAtual,

                familiaNome:
                  familiaNomeAtual,

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

        pararListener();

        definirVisibilidade(
          false
        );
      }
    }
  );
}

if (
  document.readyState ===
  "loading"
) {
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
