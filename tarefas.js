// ==========================================
// ListaLar - Módulo Tarefas
// Arquivo: tarefas.js
// Versão: 3.0.0
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

const app = getApps().length
  ? getApp()
  : initializeApp(firebaseConfig);

const auth = getAuth(app);
const db = getFirestore(app);


// ==========================================
// Configuração temporária do piloto
// ==========================================

const ADMIN_COMO_PILOTO_SEM_CONFIG = true;


// ==========================================
// Estado geral
// ==========================================

let usuarioAtual = null;
let familiaIdAtual = null;
let familiaNomeAtual = "";
let moduloLiberado = false;

let membros = [];

let tarefasFamilia = [];
let tarefasPessoais = [];
let tarefas = [];

let tarefaEdicaoId = null;
let tarefaEdicaoOrigem = null;

let unsubscribeTarefasFamilia = null;
let unsubscribeTarefasPessoais = null;

let eventosConfigurados = false;
let estruturaNovaCriada = false;
let salvandoTarefa = false;


// ==========================================
// Estado da visualização
// ==========================================

let modoPrincipal = "lista";
let filtroAtual = "todas";

let modoCalendario = "mes";
let dataCalendario = new Date();
let dataSelecionada = new Date();

dataCalendario.setHours(0, 0, 0, 0);
dataSelecionada.setHours(0, 0, 0, 0);


// ==========================================
// Atalho de elemento
// ==========================================

const el = (id) => document.getElementById(id);


// ==========================================
// Utilidades
// ==========================================

function escaparHtml(valor) {
  return String(valor ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}


function dataParaIso(data) {
  if (!(data instanceof Date)) {
    return "";
  }

  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const dia = String(data.getDate()).padStart(2, "0");

  return `${ano}-${mes}-${dia}`;
}


function isoParaData(valor) {
  if (!valor) {
    return null;
  }

  const partes = String(valor).split("-");

  if (partes.length !== 3) {
    return null;
  }

  const ano = Number(partes[0]);
  const mes = Number(partes[1]);
  const dia = Number(partes[2]);

  const data = new Date(
    ano,
    mes - 1,
    dia
  );

  if (
    data.getFullYear() !== ano ||
    data.getMonth() !== mes - 1 ||
    data.getDate() !== dia
  ) {
    return null;
  }

  data.setHours(0, 0, 0, 0);

  return data;
}


function formatarData(valor) {
  const data = isoParaData(valor);

  if (!data) {
    return "";
  }

  return data.toLocaleDateString(
    "pt-BR"
  );
}


function formatarDataCompleta(valor) {
  const data = isoParaData(valor);

  if (!data) {
    return "";
  }

  return data.toLocaleDateString(
    "pt-BR",
    {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric"
    }
  );
}


function formatarPrazo(prazo) {
  if (!prazo) {
    return "Sem prazo";
  }

  return formatarData(prazo) || prazo;
}


function normalizarHorario(valor) {
  if (!valor) {
    return "";
  }

  return String(valor).slice(0, 5);
}


function obterDataCompromisso(tarefa) {
  return (
    tarefa.dataCompromisso ||
    tarefa.data ||
    tarefa.prazo ||
    ""
  );
}


function prazoVencido(prazo, concluida) {
  if (!prazo || concluida === true) {
    return false;
  }

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const dataPrazo = isoParaData(prazo);

  if (!dataPrazo) {
    return false;
  }

  return dataPrazo < hoje;
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


function capitalizarPrimeiraLetra(texto) {
  const valor = String(texto || "").trim();

  if (!valor) {
    return "";
  }

  return (
    valor.charAt(0).toUpperCase() +
    valor.slice(1)
  );
}


function mesmoDia(dataA, dataB) {
  return (
    dataA.getFullYear() === dataB.getFullYear() &&
    dataA.getMonth() === dataB.getMonth() &&
    dataA.getDate() === dataB.getDate()
  );
}


function obterInicioSemana(data) {
  const resultado = new Date(data);
  resultado.setHours(0, 0, 0, 0);

  const diaSemana = resultado.getDay();

  const diferenca =
    diaSemana === 0
      ? -6
      : 1 - diaSemana;

  resultado.setDate(
    resultado.getDate() + diferenca
  );

  return resultado;
}


function adicionarDias(data, quantidade) {
  const novaData = new Date(data);

  novaData.setDate(
    novaData.getDate() + quantidade
  );

  novaData.setHours(0, 0, 0, 0);

  return novaData;
}


function adicionarMeses(data, quantidade) {
  const novaData = new Date(
    data.getFullYear(),
    data.getMonth() + quantidade,
    1
  );

  novaData.setHours(0, 0, 0, 0);

  return novaData;
}


function obterNomeUsuario() {
  if (!usuarioAtual) {
    return "";
  }

  const membroAtual = membros.find(
    (membro) =>
      (membro.uid || membro.id) ===
      usuarioAtual.uid
  );

  return (
    membroAtual?.nome ||
    membroAtual?.displayName ||
    usuarioAtual.displayName ||
    usuarioAtual.email ||
    "Eu"
  );
}


// ==========================================
// Mensagens
// ==========================================

async function avisar(
  titulo,
  texto,
  tipo = "info"
) {
  if (
    typeof window.mostrarMensagem ===
    "function"
  ) {
    return window.mostrarMensagem({
      titulo,
      texto,
      tipo
    });
  }

  window.alert(
    `${titulo}\n\n${texto}`
  );
}


async function confirmar(
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


// ==========================================
// Menu inferior
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
    ...menu.querySelectorAll(".tab")
  ].filter(
    (botao) => !botao.hidden
  ).length;

  menu.style.gridTemplateColumns =
    `repeat(${Math.max(
      quantidade,
      1
    )}, 1fr)`;
}


function definirVisibilidade(
  liberado
) {
  moduloLiberado =
    liberado === true;

  function aplicarVisibilidadeMenu() {
    const botao =
      el("tab-tarefas");

    if (!botao) {
      return false;
    }

    botao.hidden =
      !moduloLiberado;

    botao.style.display =
      moduloLiberado
        ? ""
        : "none";

    ajustarMenu();

    return true;
  }

  // Tenta imediatamente.
  if (!aplicarVisibilidadeMenu()) {

    // O menu pode ser criado depois pelo index ou por outro arquivo.
    let tentativas = 0;

    const intervalo =
      window.setInterval(() => {
        tentativas += 1;

        const encontrou =
          aplicarVisibilidadeMenu();

        if (
          encontrou ||
          tentativas >= 40
        ) {
          window.clearInterval(
            intervalo
          );
        }
      }, 250);
  }

  if (
    !moduloLiberado &&
    el("tarefas")?.classList.contains(
      "active"
    ) &&
    typeof window.abrirTela ===
      "function"
  ) {
    window.abrirTela("lista");
  }
}

// ==========================================
// Estrutura visual dinâmica
// ==========================================

function criarBotaoControle({
  id,
  texto,
  valor,
  grupo,
  ativo = false
}) {
  const botao =
    document.createElement("button");

  botao.type = "button";
  botao.id = id;
  botao.className =
    "tarefas-controle-btn";

  botao.dataset.valor = valor;
  botao.dataset.grupo = grupo;

  if (ativo) {
    botao.classList.add("ativo");
  }

  botao.textContent = texto;

  return botao;
}


function criarBarraPrincipal() {
  if (el("tarefasBarraPrincipal")) {
    return;
  }

  const telaTarefas =
    el("tarefas");

  if (!telaTarefas) {
    return;
  }

  const barra =
    document.createElement("div");

  barra.id =
    "tarefasBarraPrincipal";

  barra.className =
    "tarefas-barra-principal";

  const grupoModos =
    document.createElement("div");

  grupoModos.className =
    "tarefas-grupo-controles tarefas-modos-principais";

  grupoModos.appendChild(
    criarBotaoControle({
      id: "btnModoLista",
      texto: "📋 Lista",
      valor: "lista",
      grupo: "modo-principal",
      ativo: true
    })
  );

  grupoModos.appendChild(
    criarBotaoControle({
      id: "btnModoCalendario",
      texto: "📅 Calendário",
      valor: "calendario",
      grupo: "modo-principal"
    })
  );

  const grupoFiltros =
    document.createElement("div");

  grupoFiltros.id =
    "tarefasFiltros";

  grupoFiltros.className =
    "tarefas-grupo-controles tarefas-filtros";

  grupoFiltros.appendChild(
    criarBotaoControle({
      id: "btnFiltroTodas",
      texto: "Todas",
      valor: "todas",
      grupo: "filtro",
      ativo: true
    })
  );

  grupoFiltros.appendChild(
    criarBotaoControle({
      id: "btnFiltroFamilia",
      texto: "Família",
      valor: "familia",
      grupo: "filtro"
    })
  );

  grupoFiltros.appendChild(
    criarBotaoControle({
      id: "btnFiltroPessoais",
      texto: "Pessoais",
      valor: "pessoais",
      grupo: "filtro"
    })
  );

  barra.appendChild(grupoModos);
  barra.appendChild(grupoFiltros);

  const referencia =
    el("tarefasResumo") ||
    el("listaTarefas") ||
    telaTarefas.firstElementChild;

  if (referencia) {
    referencia.parentElement.insertBefore(
      barra,
      referencia
    );
  } else {
    telaTarefas.appendChild(barra);
  }
}


function criarAreaLista() {
  const lista = el("listaTarefas");

  if (!lista) {
    return;
  }

  if (!lista.parentElement?.id) {
    const envoltorio =
      document.createElement("div");

    envoltorio.id =
      "tarefasAreaLista";

    envoltorio.className =
      "tarefas-area-lista";

    lista.parentElement.insertBefore(
      envoltorio,
      lista
    );

    envoltorio.appendChild(lista);

    return;
  }

  if (
    lista.parentElement.id !==
    "tarefasAreaLista"
  ) {
    const envoltorio =
      document.createElement("div");

    envoltorio.id =
      "tarefasAreaLista";

    envoltorio.className =
      "tarefas-area-lista";

    lista.parentElement.insertBefore(
      envoltorio,
      lista
    );

    envoltorio.appendChild(lista);
  }
}


function criarAreaCalendario() {
  if (el("tarefasAreaCalendario")) {
    return;
  }

  const telaTarefas =
    el("tarefas");

  if (!telaTarefas) {
    return;
  }

  const area =
    document.createElement("section");

  area.id =
    "tarefasAreaCalendario";

  area.className =
    "tarefas-area-calendario";

  area.hidden = true;

  area.innerHTML = `
    <div class="tarefas-calendario-topo">
      <div class="tarefas-calendario-navegacao">
        <button
          type="button"
          id="btnCalendarioAnterior"
          class="tarefas-calendario-seta"
          aria-label="Período anterior"
        >
          ‹
        </button>

        <strong id="tarefasCalendarioTitulo">
          Calendário
        </strong>

        <button
          type="button"
          id="btnCalendarioProximo"
          class="tarefas-calendario-seta"
          aria-label="Próximo período"
        >
          ›
        </button>
      </div>

      <div class="tarefas-calendario-acoes">
        <div class="tarefas-grupo-controles">
          <button
            type="button"
            id="btnCalendarioMes"
            class="tarefas-controle-btn ativo"
            data-grupo="modo-calendario"
            data-valor="mes"
          >
            Mês
          </button>

          <button
            type="button"
            id="btnCalendarioSemana"
            class="tarefas-controle-btn"
            data-grupo="modo-calendario"
            data-valor="semana"
          >
            Semana
          </button>
        </div>

        <button
          type="button"
          id="btnCalendarioHoje"
          class="tarefas-btn-hoje"
        >
          Hoje
        </button>
      </div>
    </div>

    <div
      id="tarefasCalendario"
      class="tarefas-calendario"
    ></div>

    <section
      id="tarefasDiaSelecionado"
      class="tarefas-dia-selecionado"
    >
      <div class="tarefas-dia-titulo">
        <strong id="tarefasDiaTitulo">
          Compromissos do dia
        </strong>

        <span id="tarefasDiaQuantidade">
          0
        </span>
      </div>

      <div
        id="tarefasListaDia"
        class="tarefas-lista-dia"
      ></div>
    </section>
  `;

  const areaLista =
    el("tarefasAreaLista");

  if (areaLista) {
    areaLista.parentElement.insertBefore(
      area,
      areaLista.nextSibling
    );
  } else {
    telaTarefas.appendChild(area);
  }
}


function criarCampoVisibilidade() {
  if (el("tarefaVisibilidade")) {
    return;
  }

  const campoResponsavel =
    el("tarefaResponsavel");

  if (!campoResponsavel) {
    return;
  }

  const grupo =
    document.createElement("div");

  grupo.className =
    "tarefas-campo tarefas-campo-visibilidade";

  grupo.innerHTML = `
    <label for="tarefaVisibilidade">
      Visibilidade
    </label>

    <select id="tarefaVisibilidade">
      <option value="familia">
        Família
      </option>

      <option value="pessoal">
        Pessoal
      </option>
    </select>
  `;

  const grupoResponsavel =
    campoResponsavel.closest(
      ".tarefas-campo, .form-group, .campo"
    );

  if (grupoResponsavel) {
    grupoResponsavel.insertAdjacentElement(
      "afterend",
      grupo
    );
  } else {
    campoResponsavel.insertAdjacentElement(
      "afterend",
      grupo
    );
  }
}


function criarCamposCompromisso() {
  const campoPrazo =
    el("tarefaPrazo");

  if (!campoPrazo) {
    return;
  }

  if (!el("tarefaDataCompromisso")) {
    const grupoData =
      document.createElement("div");

    grupoData.className =
      "tarefas-campo tarefas-campo-data";

    grupoData.innerHTML = `
      <label for="tarefaDataCompromisso">
        Data do compromisso
      </label>

      <input
        type="date"
        id="tarefaDataCompromisso"
      >
    `;

    const grupoPrazo =
      campoPrazo.closest(
        ".tarefas-campo, .form-group, .campo"
      );

    if (grupoPrazo) {
      grupoPrazo.parentElement.insertBefore(
        grupoData,
        grupoPrazo
      );
    } else {
      campoPrazo.insertAdjacentElement(
        "beforebegin",
        grupoData
      );
    }
  }

  if (!el("tarefaHorario")) {
    const grupoHorario =
      document.createElement("div");

    grupoHorario.className =
      "tarefas-campo tarefas-campo-horario";

    grupoHorario.innerHTML = `
      <label for="tarefaHorario">
        Horário
      </label>

      <input
        type="time"
        id="tarefaHorario"
      >
    `;

    const campoData =
      el("tarefaDataCompromisso");

    const grupoData =
      campoData?.closest(
        ".tarefas-campo, .form-group, .campo"
      );

    if (grupoData) {
      grupoData.insertAdjacentElement(
        "afterend",
        grupoHorario
      );
    } else if (campoData) {
      campoData.insertAdjacentElement(
        "afterend",
        grupoHorario
      );
    }
  }

  const labelPrazo =
    campoPrazo.previousElementSibling;

  if (
    labelPrazo &&
    labelPrazo.tagName === "LABEL"
  ) {
    labelPrazo.textContent =
      "Prazo para conclusão";
  }
}


function criarEstruturaNova() {
  if (estruturaNovaCriada) {
    return true;
  }

  const telaTarefas =
    el("tarefas");

  const listaTarefas =
    el("listaTarefas");

  // A tela ainda não foi inserida no HTML.
  // Não marca como criada para permitir nova tentativa.
  if (
    !telaTarefas ||
    !listaTarefas
  ) {
    return false;
  }

  criarBarraPrincipal();
  criarAreaLista();
  criarAreaCalendario();
  criarCampoVisibilidade();
  criarCamposCompromisso();

  estruturaNovaCriada = true;

  configurarEventosNovos();
  atualizarModoPrincipal();
  atualizarBotoesAtivos();

  return true;
}

// ==========================================
// Contexto do usuário
// ==========================================
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
    console.warn(
      "Documento do usuário não encontrado:",
      user.uid
    );

    definirVisibilidade(false);
    return;
  }

  const dadosUsuario =
    usuarioSnap.data();

  const familiaId =
    dadosUsuario.familiaId || "";

  if (!familiaId) {
    console.warn(
      "Usuário sem familiaId:",
      user.uid
    );

    definirVisibilidade(false);
    return;
  }

  let familia = {};
  let modulos = {};

  // ==========================================
  // Buscar família
  // ==========================================

  try {
    const familiaSnap =
      await getDoc(
        doc(
          db,
          "familias",
          familiaId
        )
      );

    familia =
      familiaSnap.exists()
        ? familiaSnap.data()
        : {};
  } catch (erro) {
    console.error(
      "Erro ao buscar família:",
      erro
    );

    // Não bloqueia o menu apenas porque
    // o nome da família não carregou.
    familia = {};
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
    console.warn(
      "Documento do usuário não encontrado:",
      user.uid
    );

    definirVisibilidade(false);
    return;
  }

  const dadosUsuario =
    usuarioSnap.data();

  const familiaId =
    dadosUsuario.familiaId || "";

  if (!familiaId) {
    console.warn(
      "Usuário sem familiaId:",
      user.uid
    );

    definirVisibilidade(false);
    return;
  }

  let familia = {};
  let modulos = {};

  // ==========================================
  // Buscar família
  // ==========================================

  try {
    const familiaSnap =
      await getDoc(
        doc(
          db,
          "familias",
          familiaId
        )
      );

    familia =
      familiaSnap.exists()
        ? familiaSnap.data()
        : {};
  } catch (erro) {
    console.error(
      "Erro ao buscar família:",
      erro
    );

    familia = {};
  }

  // ==========================================
  // Buscar configuração dos módulos
  // ==========================================

  try {
    const modulosSnap =
      await getDoc(
        doc(
          db,
          "configuracoes",
          "modulos"
        )
      );

    modulos =
      modulosSnap.exists()
        ? modulosSnap.data()
        : {};
  } catch (erro) {
    console.error(
      "Erro ao buscar configurações dos módulos:",
      erro
    );

    // Se a configuração não puder ser lida,
    // o administrador continua sendo liberado.
    modulos = {};
  }

  familiaIdAtual =
    familiaId;

  familiaNomeAtual =
    familia.nome ||
    "Minha família";

  const ehAdministrador =
    dadosUsuario.adminSistema === true ||
    dadosUsuario.adminSistema === "true";

  const ehFamiliaPiloto =
    modulos.familiaPilotoId === familiaId ||
    (
      ADMIN_COMO_PILOTO_SEM_CONFIG &&
      ehAdministrador
    );

  const liberado =
    ehFamiliaPiloto ||
    modulos.tarefasLiberadas === true ||
    modulos.tarefasLiberadas === "true";

  console.log(
    "Diagnóstico módulo Tarefas:",
    {
      uid:
        user.uid,

      familiaId,

      adminSistema:
        dadosUsuario.adminSistema,

      ehAdministrador,

      familiaPilotoId:
        modulos.familiaPilotoId,

      ehFamiliaPiloto,

      tarefasLiberadas:
        modulos.tarefasLiberadas,

      liberado
    }
  );

  definirVisibilidade(
    liberado
  );

  if (!liberado) {
    pararListeners();
    return;
  }

  criarEstruturaNova();

  try {
    await carregarMembros();
  } catch (erro) {
    console.error(
      "Erro ao carregar membros:",
      erro
    );

    membros = [];
    preencherResponsaveis();
  }

  iniciarListeners();
}
// ==========================================
// Membros da família
// ==========================================

async function carregarMembros() {
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
    .filter(
      (membro) =>
        membro.ativo !== false
    )
    .sort((a, b) =>
      String(
        a.nome ||
        a.email ||
        ""
      ).localeCompare(
        String(
          b.nome ||
          b.email ||
          ""
        ),
        "pt-BR"
      )
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

  campo.innerHTML =
    '<option value="">Sem responsável</option>';

  membros.forEach((membro) => {
    const option =
      document.createElement("option");

    option.value =
      membro.uid ||
      membro.id;

    option.textContent =
      membro.nome ||
      membro.email ||
      "Membro da família";

    campo.appendChild(option);
  });

  if (
    usuarioAtual &&
    ![
      ...campo.options
    ].some(
      (opcao) =>
        opcao.value ===
        usuarioAtual.uid
    )
  ) {
    const optionAtual =
      document.createElement("option");

    optionAtual.value =
      usuarioAtual.uid;

    optionAtual.textContent =
      obterNomeUsuario();

    campo.appendChild(optionAtual);
  }

  if (
    [...campo.options].some(
      (opcao) =>
        opcao.value ===
        valorAtual
    )
  ) {
    campo.value = valorAtual;
  }
}


// ==========================================
// Listeners do Firestore
// ==========================================

function pararListeners() {
  if (
    typeof unsubscribeTarefasFamilia ===
    "function"
  ) {
    unsubscribeTarefasFamilia();
  }

  if (
    typeof unsubscribeTarefasPessoais ===
    "function"
  ) {
    unsubscribeTarefasPessoais();
  }

  unsubscribeTarefasFamilia = null;
  unsubscribeTarefasPessoais = null;

  tarefasFamilia = [];
  tarefasPessoais = [];
  tarefas = [];

  renderizarTudo();
}


function iniciarListeners() {
  pararListeners();

  unsubscribeTarefasFamilia =
    onSnapshot(
      collection(
        db,
        "familias",
        familiaIdAtual,
        "tarefas"
      ),

      (snap) => {
        tarefasFamilia =
          snap.docs.map(
            (registro) => ({
              id: registro.id,
              origem: "familia",
              visibilidade: "familia",
              ...registro.data()
            })
          );

        juntarTarefas();
      },

      async (erro) => {
        console.error(
          "Erro ao carregar tarefas da família:",
          erro
        );

        await avisar(
          "Erro ao carregar tarefas",
          "Não foi possível carregar as tarefas da família.",
          "warning"
        );
      }
    );

  unsubscribeTarefasPessoais =
    onSnapshot(
      collection(
        db,
        "usuarios",
        usuarioAtual.uid,
        "tarefasPessoais"
      ),

      (snap) => {
        tarefasPessoais =
          snap.docs.map(
            (registro) => ({
              id: registro.id,
              origem: "pessoal",
              visibilidade: "pessoal",
              responsavelUid:
                usuarioAtual.uid,
              responsavelNome:
                obterNomeUsuario(),
              ...registro.data()
            })
          );

        juntarTarefas();
      },

      async (erro) => {
        console.error(
          "Erro ao carregar tarefas pessoais:",
          erro
        );

        await avisar(
          "Erro ao carregar tarefas",
          "Não foi possível carregar suas tarefas pessoais.",
          "warning"
        );
      }
    );
}


function juntarTarefas() {
  tarefas = [
    ...tarefasFamilia,
    ...tarefasPessoais
  ];

  renderizarTudo();
}


// ==========================================
// Filtros
// ==========================================

function obterTarefasVisiveis() {
  if (filtroAtual === "familia") {
    return tarefas.filter(
      (tarefa) =>
        tarefa.origem === "familia"
    );
  }

  if (filtroAtual === "pessoais") {
    return tarefas.filter(
      (tarefa) =>
        tarefa.origem === "pessoal"
    );
  }

  return [...tarefas];
}


function obterTarefasDoDia(
  data,
  lista = obterTarefasVisiveis()
) {
  const dataIso =
    dataParaIso(data);

  return lista.filter(
    (tarefa) =>
      obterDataCompromisso(
        tarefa
      ) === dataIso
  );
}


// ==========================================
// Ordenação
// ==========================================

function ordenar(lista) {
  return [...lista].sort(
    (a, b) => {
      const conclusao =
        Number(
          a.concluida === true
        ) -
        Number(
          b.concluida === true
        );

      if (conclusao !== 0) {
        return conclusao;
      }

      const dataA =
        obterDataCompromisso(a) ||
        "9999-12-31";

      const dataB =
        obterDataCompromisso(b) ||
        "9999-12-31";

      const comparacaoData =
        String(dataA).localeCompare(
          String(dataB)
        );

      if (comparacaoData !== 0) {
        return comparacaoData;
      }

      const horarioA =
        normalizarHorario(
          a.horario
        ) || "99:99";

      const horarioB =
        normalizarHorario(
          b.horario
        ) || "99:99";

      const comparacaoHorario =
        horarioA.localeCompare(
          horarioB
        );

      if (
        comparacaoHorario !== 0
      ) {
        return comparacaoHorario;
      }

      const prioridade =
        pesoPrioridade(
          a.prioridade
        ) -
        pesoPrioridade(
          b.prioridade
        );

      if (prioridade !== 0) {
        return prioridade;
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
// Cartão da tarefa
// ==========================================

function criarHtmlCartao(
  tarefa
) {
  const concluida =
    tarefa.concluida === true;

  const vencida =
    prazoVencido(
      tarefa.prazo,
      concluida
    );

  const prioridade =
    tarefa.prioridade ||
    "media";

  const dataCompromisso =
    obterDataCompromisso(
      tarefa
    );

  const horario =
    normalizarHorario(
      tarefa.horario
    );

  return `
    <article
      class="
        tarefa-item
        ${concluida ? "concluida" : ""}
        ${vencida ? "vencida" : ""}
        prioridade-${escaparHtml(prioridade)}
      "
      data-tarefa-id="${escaparHtml(tarefa.id)}"
      data-tarefa-origem="${escaparHtml(tarefa.origem)}"
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
            ${
              tarefa.responsavelNome
                ? `
                  <span>
                    👤 ${escaparHtml(
                      tarefa.responsavelNome
                    )}
                  </span>
                `
                : ""
            }

            ${
              dataCompromisso
                ? `
                  <span>
                    📅 ${escaparHtml(
                      formatarData(
                        dataCompromisso
                      )
                    )}
                  </span>
                `
                : ""
            }

            ${
              horario
                ? `
                  <span>
                    🕒 ${escaparHtml(
                      horario
                    )}
                  </span>
                `
                : ""
            }

            ${
              tarefa.prazo
                ? `
                  <span
                    class="${
                      vencida
                        ? "tarefa-prazo-vencido"
                        : ""
                    }"
                  >
                    ⏳ ${escaparHtml(
                      formatarPrazo(
                        tarefa.prazo
                      )
                    )}
                  </span>
                `
                : ""
            }

            <span>
              ⚑ ${escaparHtml(
                rotuloPrioridade(
                  prioridade
                )
              )}
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
}


// ==========================================
// Resumo e lista
// ==========================================

function atualizarResumo(
  lista
) {
  const concluidas =
    lista.filter(
      (tarefa) =>
        tarefa.concluida === true
    ).length;

  if (el("tarefasTotal")) {
    el("tarefasTotal").textContent =
      String(lista.length);
  }

  if (el("tarefasPendentes")) {
    el("tarefasPendentes").textContent =
      String(
        lista.length -
        concluidas
      );
  }

  if (el("tarefasConcluidas")) {
    el("tarefasConcluidas").textContent =
      String(concluidas);
  }
}


function renderizarLista() {
  const area =
    el("listaTarefas");

  if (!area) {
    return;
  }

  const lista =
    obterTarefasVisiveis();

  atualizarResumo(lista);

  if (!lista.length) {
    const mensagem =
      filtroAtual === "familia"
        ? "Nenhuma tarefa da família cadastrada."
        : filtroAtual === "pessoais"
          ? "Nenhuma tarefa pessoal cadastrada."
          : "Nenhuma tarefa cadastrada.";

    area.innerHTML = `
      <div class="empty">
        ${mensagem}<br>
        Toque em <strong>+ Nova</strong> para começar.
      </div>
    `;

    return;
  }

  area.innerHTML =
    ordenar(lista)
      .map(criarHtmlCartao)
      .join("");
}


// ==========================================
// Calendário mensal
// ==========================================

function renderizarCalendarioMes() {
  const area =
    el("tarefasCalendario");

  if (!area) {
    return;
  }

  const ano =
    dataCalendario.getFullYear();

  const mes =
    dataCalendario.getMonth();

  const primeiroDia =
    new Date(
      ano,
      mes,
      1
    );

  const ultimoDia =
    new Date(
      ano,
      mes + 1,
      0
    );

  const inicioGrade =
    obterInicioSemana(
      primeiroDia
    );

  const quantidadeSemanas =
    Math.ceil(
      (
        ultimoDia.getTime() -
        inicioGrade.getTime()
      ) /
      (
        7 *
        24 *
        60 *
        60 *
        1000
      )
    ) + 1;

  const quantidadeDias =
    Math.min(
      Math.max(
        quantidadeSemanas * 7,
        35
      ),
      42
    );

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const tarefasVisiveis =
    obterTarefasVisiveis();

  let html = `
    <div class="tarefas-calendario-semana-cabecalho">
      <span>SEG</span>
      <span>TER</span>
      <span>QUA</span>
      <span>QUI</span>
      <span>SEX</span>
      <span>SÁB</span>
      <span>DOM</span>
    </div>

    <div class="tarefas-calendario-grade">
  `;

  for (
    let indice = 0;
    indice < quantidadeDias;
    indice += 1
  ) {
    const data =
      adicionarDias(
        inicioGrade,
        indice
      );

    const dataIso =
      dataParaIso(data);

    const tarefasDia =
      obterTarefasDoDia(
        data,
        tarefasVisiveis
      );

    const foraMes =
      data.getMonth() !== mes;

    const hojeClasse =
      mesmoDia(data, hoje)
        ? "hoje"
        : "";

    const selecionadoClasse =
      mesmoDia(
        data,
        dataSelecionada
      )
        ? "selecionado"
        : "";

    const compromissos =
      ordenar(tarefasDia)
        .slice(0, 3)
        .map((tarefa) => {
          const horario =
            normalizarHorario(
              tarefa.horario
            );

          return `
            <span
              class="
                tarefas-calendario-compromisso
                prioridade-${escaparHtml(
                  tarefa.prioridade ||
                  "media"
                )}
                ${
                  tarefa.concluida
                    ? "concluido"
                    : ""
                }
              "
            >
              ${
                horario
                  ? `<b>${escaparHtml(horario)}</b>`
                  : ""
              }

              ${escaparHtml(
                tarefa.titulo ||
                "Tarefa"
              )}
            </span>
          `;
        })
        .join("");

    const restante =
      tarefasDia.length - 3;

    html += `
      <button
        type="button"
        class="
          tarefas-calendario-dia
          ${foraMes ? "fora-mes" : ""}
          ${hojeClasse}
          ${selecionadoClasse}
          ${
            tarefasDia.length
              ? "com-compromisso"
              : ""
          }
        "
        data-data="${dataIso}"
      >
        <span class="tarefas-calendario-numero">
          ${data.getDate()}
        </span>

        <span class="tarefas-calendario-eventos">
          ${compromissos}

          ${
            restante > 0
              ? `
                <small>
                  +${restante}
                </small>
              `
              : ""
          }
        </span>
      </button>
    `;
  }

  html += `
    </div>
  `;

  area.innerHTML = html;

  const titulo =
    el("tarefasCalendarioTitulo");

  if (titulo) {
    titulo.textContent =
      capitalizarPrimeiraLetra(
        dataCalendario.toLocaleDateString(
          "pt-BR",
          {
            month: "long",
            year: "numeric"
          }
        )
      );
  }
}


// ==========================================
// Calendário semanal
// ==========================================

function renderizarCalendarioSemana() {
  const area =
    el("tarefasCalendario");

  if (!area) {
    return;
  }

  const inicio =
    obterInicioSemana(
      dataCalendario
    );

  const fim =
    adicionarDias(
      inicio,
      6
    );

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const tarefasVisiveis =
    obterTarefasVisiveis();

  let html = `
    <div class="tarefas-semana">
  `;

  for (
    let indice = 0;
    indice < 7;
    indice += 1
  ) {
    const data =
      adicionarDias(
        inicio,
        indice
      );

    const dataIso =
      dataParaIso(data);

    const tarefasDia =
      ordenar(
        obterTarefasDoDia(
          data,
          tarefasVisiveis
        )
      );

    html += `
      <section
        class="
          tarefas-semana-dia
          ${
            mesmoDia(data, hoje)
              ? "hoje"
              : ""
          }
          ${
            mesmoDia(
              data,
              dataSelecionada
            )
              ? "selecionado"
              : ""
          }
        "
      >
        <button
          type="button"
          class="tarefas-semana-dia-topo"
          data-data="${dataIso}"
        >
          <span>
            ${data
              .toLocaleDateString(
                "pt-BR",
                {
                  weekday: "short"
                }
              )
              .replace(".", "")
              .toUpperCase()}
          </span>

          <strong>
            ${data.getDate()}
          </strong>
        </button>

        <div class="tarefas-semana-eventos">
          ${
            tarefasDia.length
              ? tarefasDia.map(
                  (tarefa) => `
                    <button
                      type="button"
                      class="
                        tarefas-semana-evento
                        prioridade-${escaparHtml(
                          tarefa.prioridade ||
                          "media"
                        )}
                        ${
                          tarefa.concluida
                            ? "concluido"
                            : ""
                        }
                      "
                      data-data="${dataIso}"
                    >
                      ${
                        tarefa.horario
                          ? `
                            <strong>
                              ${escaparHtml(
                                normalizarHorario(
                                  tarefa.horario
                                )
                              )}
                            </strong>
                          `
                          : ""
                      }

                      <span>
                        ${escaparHtml(
                          tarefa.titulo ||
                          "Tarefa"
                        )}
                      </span>
                    </button>
                  `
                ).join("")
              : `
                <button
                  type="button"
                  class="tarefas-semana-vazio"
                  data-data="${dataIso}"
                >
                  Sem compromissos
                </button>
              `
          }
        </div>
      </section>
    `;
  }

  html += `
    </div>
  `;

  area.innerHTML = html;

  const titulo =
    el("tarefasCalendarioTitulo");

  if (titulo) {
    const mesmoMes =
      inicio.getMonth() ===
      fim.getMonth();

    titulo.textContent =
      mesmoMes
        ? capitalizarPrimeiraLetra(
            inicio.toLocaleDateString(
              "pt-BR",
              {
                month: "long",
                year: "numeric"
              }
            )
          )
        : `${inicio.toLocaleDateString(
            "pt-BR",
            {
              day: "2-digit",
              month: "short"
            }
          )} – ${fim.toLocaleDateString(
            "pt-BR",
            {
              day: "2-digit",
              month: "short",
              year: "numeric"
            }
          )}`;
  }
}


// ==========================================
// Lista do dia selecionado
// ==========================================

function renderizarDiaSelecionado() {
  const area =
    el("tarefasListaDia");

  const titulo =
    el("tarefasDiaTitulo");

  const quantidade =
    el("tarefasDiaQuantidade");

  if (!area) {
    return;
  }

  const lista =
    ordenar(
      obterTarefasDoDia(
        dataSelecionada
      )
    );

  if (titulo) {
    titulo.textContent =
      capitalizarPrimeiraLetra(
        formatarDataCompleta(
          dataParaIso(
            dataSelecionada
          )
        )
      );
  }

  if (quantidade) {
    quantidade.textContent =
      String(lista.length);
  }

  if (!lista.length) {
    area.innerHTML = `
      <div class="empty">
        Nenhum compromisso neste dia.
      </div>
    `;

    return;
  }

  area.innerHTML =
    lista
      .map(criarHtmlCartao)
      .join("");
}


// ==========================================
// Renderização geral
// ==========================================

function renderizarCalendario() {
  if (
    modoCalendario === "semana"
  ) {
    renderizarCalendarioSemana();
  } else {
    renderizarCalendarioMes();
  }

  renderizarDiaSelecionado();
}


function renderizarTudo() {
  renderizarLista();
  renderizarCalendario();
  atualizarModoPrincipal();
  atualizarBotoesAtivos();
}


// ==========================================
// Atualização dos modos
// ==========================================

function atualizarModoPrincipal() {
  const areaLista =
    el("tarefasAreaLista");

  const areaCalendario =
    el("tarefasAreaCalendario");

  if (areaLista) {
    areaLista.hidden =
      modoPrincipal !== "lista";
  }

  if (areaCalendario) {
    areaCalendario.hidden =
      modoPrincipal !== "calendario";
  }
}


function atualizarBotoesAtivos() {
  document
    .querySelectorAll(
      '[data-grupo="modo-principal"]'
    )
    .forEach((botao) => {
      botao.classList.toggle(
        "ativo",
        botao.dataset.valor ===
          modoPrincipal
      );
    });

  document
    .querySelectorAll(
      '[data-grupo="filtro"]'
    )
    .forEach((botao) => {
      botao.classList.toggle(
        "ativo",
        botao.dataset.valor ===
          filtroAtual
      );
    });

  document
    .querySelectorAll(
      '[data-grupo="modo-calendario"]'
    )
    .forEach((botao) => {
      botao.classList.toggle(
        "ativo",
        botao.dataset.valor ===
          modoCalendario
      );
    });
}


// ==========================================
// Formulário
// ==========================================

function atualizarCampoVisibilidade() {
  const visibilidade =
    el("tarefaVisibilidade")?.value ||
    "familia";

  const campoResponsavel =
    el("tarefaResponsavel");

  if (!campoResponsavel) {
    return;
  }

  if (visibilidade === "pessoal") {
    campoResponsavel.value =
      usuarioAtual?.uid || "";

    campoResponsavel.disabled =
      true;
  } else {
    campoResponsavel.disabled =
      false;
  }
}


function abrirFormulario(
  tarefa = null
) {
  const formulario =
    el("formularioTarefa");

  if (!formulario) {
    return;
  }

  criarEstruturaNova();

  tarefaEdicaoId =
    tarefa?.id || null;

  tarefaEdicaoOrigem =
    tarefa?.origem || null;

  if (
    el("tituloFormularioTarefa")
  ) {
    el(
      "tituloFormularioTarefa"
    ).textContent =
      tarefa
        ? "Editar tarefa"
        : "Nova tarefa";
  }

  if (el("tarefaTitulo")) {
    el("tarefaTitulo").value =
      tarefa?.titulo || "";
  }

  if (el("tarefaVisibilidade")) {
    el("tarefaVisibilidade").value =
      tarefa?.origem === "pessoal" ||
      tarefa?.visibilidade === "pessoal"
        ? "pessoal"
        : "familia";
  }

  if (el("tarefaResponsavel")) {
    el("tarefaResponsavel").value =
      tarefa?.responsavelUid ||
      (
        tarefa?.origem === "pessoal"
          ? usuarioAtual?.uid || ""
          : ""
      );
  }

  if (
    el("tarefaDataCompromisso")
  ) {
    el(
      "tarefaDataCompromisso"
    ).value =
      tarefa
        ? obterDataCompromisso(
            tarefa
          )
        : "";
  }

  if (el("tarefaHorario")) {
    el("tarefaHorario").value =
      normalizarHorario(
        tarefa?.horario
      );
  }

  if (el("tarefaPrazo")) {
    el("tarefaPrazo").value =
      tarefa?.prazo || "";
  }

  if (el("tarefaPrioridade")) {
    el("tarefaPrioridade").value =
      tarefa?.prioridade ||
      "media";
  }

  if (el("tarefaObservacao")) {
    el("tarefaObservacao").value =
      tarefa?.observacao || "";
  }

  if (el("btnSalvarTarefa")) {
    el(
      "btnSalvarTarefa"
    ).textContent =
      tarefa
        ? "Salvar alterações"
        : "Salvar tarefa";
  }

  atualizarCampoVisibilidade();

  formulario.hidden = false;

  el("tarefaTitulo")?.focus();
}


function fecharFormulario() {
  const formulario =
    el("formularioTarefa");

  if (!formulario) {
    return;
  }

  formulario.hidden = true;

  tarefaEdicaoId = null;
  tarefaEdicaoOrigem = null;

  if (el("tarefaTitulo")) {
    el("tarefaTitulo").value = "";
  }

  if (el("tarefaVisibilidade")) {
    el("tarefaVisibilidade").value =
      "familia";
  }

  if (el("tarefaResponsavel")) {
    el("tarefaResponsavel").disabled =
      false;

    el("tarefaResponsavel").value =
      "";
  }

  if (
    el("tarefaDataCompromisso")
  ) {
    el(
      "tarefaDataCompromisso"
    ).value = "";
  }

  if (el("tarefaHorario")) {
    el("tarefaHorario").value =
      "";
  }

  if (el("tarefaPrazo")) {
    el("tarefaPrazo").value =
      "";
  }

  if (el("tarefaPrioridade")) {
    el("tarefaPrioridade").value =
      "media";
  }

  if (el("tarefaObservacao")) {
    el("tarefaObservacao").value =
      "";
  }

  if (el("btnSalvarTarefa")) {
    el(
      "btnSalvarTarefa"
    ).textContent =
      "Salvar tarefa";
  }
}


// ==========================================
// Salvar tarefa
// ==========================================

async function salvarTarefa() {
  if (
    salvandoTarefa ||
    !usuarioAtual ||
    !familiaIdAtual ||
    !moduloLiberado
  ) {
    return;
  }

  const titulo =
    el("tarefaTitulo")
      ?.value.trim() || "";

  const visibilidade =
    el("tarefaVisibilidade")
      ?.value || "familia";

  let responsavelUid =
    el("tarefaResponsavel")
      ?.value || "";

  const dataCompromisso =
    el("tarefaDataCompromisso")
      ?.value || "";

  const horario =
    el("tarefaHorario")
      ?.value || "";

  const prazo =
    el("tarefaPrazo")
      ?.value || "";

  const prioridade =
    el("tarefaPrioridade")
      ?.value || "media";

  const observacao =
    el("tarefaObservacao")
      ?.value.trim() || "";

  if (!titulo) {
    await avisar(
      "Informe a tarefa",
      "Digite o nome ou a descrição da tarefa.",
      "warning"
    );

    el("tarefaTitulo")?.focus();

    return;
  }

  if (
    visibilidade === "pessoal"
  ) {
    responsavelUid =
      usuarioAtual.uid;
  }

  const responsavel =
    membros.find(
      (membro) =>
        (membro.uid || membro.id) ===
        responsavelUid
    );

  const responsavelNome =
    visibilidade === "pessoal"
      ? obterNomeUsuario()
      : (
          responsavel?.nome ||
          responsavel?.email ||
          ""
        );

  const dados = {
    titulo,
    visibilidade,
    responsavelUid,
    responsavelNome,
    dataCompromisso,
    horario,
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

  const botao =
    el("btnSalvarTarefa");

  salvandoTarefa = true;

  try {
    if (botao) {
      botao.disabled = true;
      botao.textContent =
        "Salvando...";
    }

    const novaOrigem =
      visibilidade === "pessoal"
        ? "pessoal"
        : "familia";

    if (
      tarefaEdicaoId &&
      tarefaEdicaoOrigem ===
        novaOrigem
    ) {
      const referencia =
        novaOrigem === "pessoal"
          ? doc(
              db,
              "usuarios",
              usuarioAtual.uid,
              "tarefasPessoais",
              tarefaEdicaoId
            )
          : doc(
              db,
              "familias",
              familiaIdAtual,
              "tarefas",
              tarefaEdicaoId
            );

      await updateDoc(
        referencia,
        dados
      );
    } else {
      const novaColecao =
        novaOrigem === "pessoal"
          ? collection(
              db,
              "usuarios",
              usuarioAtual.uid,
              "tarefasPessoais"
            )
          : collection(
              db,
              "familias",
              familiaIdAtual,
              "tarefas"
            );

      await addDoc(
        novaColecao,
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

      if (
        tarefaEdicaoId &&
        tarefaEdicaoOrigem &&
        tarefaEdicaoOrigem !==
          novaOrigem
      ) {
        const referenciaAntiga =
          tarefaEdicaoOrigem ===
          "pessoal"
            ? doc(
                db,
                "usuarios",
                usuarioAtual.uid,
                "tarefasPessoais",
                tarefaEdicaoId
              )
            : doc(
                db,
                "familias",
                familiaIdAtual,
                "tarefas",
                tarefaEdicaoId
              );

        await deleteDoc(
          referenciaAntiga
        );
      }
    }

    fecharFormulario();
  } catch (erro) {
    console.error(
      "Erro ao salvar tarefa:",
      erro
    );

    await avisar(
      "Erro ao salvar",
      "Não foi possível salvar a tarefa. Verifique também as regras do Firestore.",
      "warning"
    );
  } finally {
    salvandoTarefa = false;

    if (botao) {
      botao.disabled = false;

      botao.textContent =
        tarefaEdicaoId
          ? "Salvar alterações"
          : "Salvar tarefa";
    }
  }
}


// ==========================================
// Referência da tarefa
// ==========================================

function obterReferenciaTarefa(
  tarefa
) {
  if (
    tarefa.origem === "pessoal"
  ) {
    return doc(
      db,
      "usuarios",
      usuarioAtual.uid,
      "tarefasPessoais",
      tarefa.id
    );
  }

  return doc(
    db,
    "familias",
    familiaIdAtual,
    "tarefas",
    tarefa.id
  );
}


// ==========================================
// Concluir tarefa
// ==========================================

async function alternarConclusao(
  tarefa
) {
  try {
    const concluir =
      tarefa.concluida !== true;

    await updateDoc(
      obterReferenciaTarefa(
        tarefa
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
            ? usuarioAtual?.displayName ||
              usuarioAtual?.email ||
              ""
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


// ==========================================
// Excluir tarefa
// ==========================================

async function excluirTarefa(
  tarefa
) {
  const aceitou =
    await confirmar(
      "Excluir tarefa",
      `Deseja excluir a tarefa "${tarefa.titulo}"?`
    );

  if (!aceitou) {
    return;
  }

  try {
    await deleteDoc(
      obterReferenciaTarefa(
        tarefa
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


// ==========================================
// Localizar tarefa pelo cartão
// ==========================================

function localizarTarefaNoElemento(
  elemento
) {
  const item =
    elemento.closest(
      "[data-tarefa-id]"
    );

  if (!item) {
    return null;
  }

  const id =
    item.dataset.tarefaId;

  const origem =
    item.dataset.tarefaOrigem;

  return tarefas.find(
    (registro) =>
      registro.id === id &&
      registro.origem === origem
  ) || null;
}


// ==========================================
// Clique nos cartões
// ==========================================

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

  const tarefa =
    localizarTarefaNoElemento(
      botao
    );

  if (!tarefa) {
    return;
  }

  if (
    botao.dataset.acao ===
    "editar"
  ) {
    abrirFormulario(tarefa);
  }

  if (
    botao.dataset.acao ===
    "concluir"
  ) {
    await alternarConclusao(
      tarefa
    );
  }

  if (
    botao.dataset.acao ===
    "excluir"
  ) {
    await excluirTarefa(
      tarefa
    );
  }
}


// ==========================================
// Eventos dos controles
// ==========================================

function selecionarModoPrincipal(
  modo
) {
  if (
    modo !== "lista" &&
    modo !== "calendario"
  ) {
    return;
  }

  modoPrincipal = modo;

  atualizarModoPrincipal();
  atualizarBotoesAtivos();

  if (
    modoPrincipal ===
    "calendario"
  ) {
    renderizarCalendario();
  }
}


function selecionarFiltro(
  filtro
) {
  if (
    ![
      "todas",
      "familia",
      "pessoais"
    ].includes(filtro)
  ) {
    return;
  }

  filtroAtual = filtro;

  atualizarBotoesAtivos();
  renderizarLista();
  renderizarCalendario();
}


function selecionarModoCalendario(
  modo
) {
  if (
    modo !== "mes" &&
    modo !== "semana"
  ) {
    return;
  }

  modoCalendario = modo;

  atualizarBotoesAtivos();
  renderizarCalendario();
}


function navegarCalendario(
  direcao
) {
  if (
    modoCalendario === "semana"
  ) {
    dataCalendario =
      adicionarDias(
        dataCalendario,
        direcao * 7
      );
  } else {
    dataCalendario =
      adicionarMeses(
        dataCalendario,
        direcao
      );
  }

  renderizarCalendario();
}


function irParaHoje() {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  dataCalendario =
    new Date(hoje);

  dataSelecionada =
    new Date(hoje);

  renderizarCalendario();
}


function selecionarDataCalendario(
  dataIso
) {
  const data =
    isoParaData(dataIso);

  if (!data) {
    return;
  }

  dataSelecionada =
    new Date(data);

  if (
    modoCalendario === "mes" &&
    (
      data.getMonth() !==
        dataCalendario.getMonth() ||
      data.getFullYear() !==
        dataCalendario.getFullYear()
    )
  ) {
    dataCalendario =
      new Date(
        data.getFullYear(),
        data.getMonth(),
        1
      );
  } else {
    dataCalendario =
      new Date(data);
  }

  renderizarCalendario();
}


// ==========================================
// Configuração dos eventos novos
// ==========================================

function configurarEventosNovos() {
  el("tarefasBarraPrincipal")
    ?.addEventListener(
      "click",
      (evento) => {
        const botao =
          evento.target.closest(
            "[data-grupo]"
          );

        if (!botao) {
          return;
        }

        if (
          botao.dataset.grupo ===
          "modo-principal"
        ) {
          selecionarModoPrincipal(
            botao.dataset.valor
          );
        }

        if (
          botao.dataset.grupo ===
          "filtro"
        ) {
          selecionarFiltro(
            botao.dataset.valor
          );
        }
      }
    );

  el("tarefasAreaCalendario")
    ?.addEventListener(
      "click",
      (evento) => {
        const botaoModo =
          evento.target.closest(
            '[data-grupo="modo-calendario"]'
          );

        if (botaoModo) {
          selecionarModoCalendario(
            botaoModo.dataset.valor
          );

          return;
        }

        const botaoData =
          evento.target.closest(
            "[data-data]"
          );

        if (botaoData) {
          selecionarDataCalendario(
            botaoData.dataset.data
          );
        }
      }
    );

  el("btnCalendarioAnterior")
    ?.addEventListener(
      "click",
      () => navegarCalendario(-1)
    );

  el("btnCalendarioProximo")
    ?.addEventListener(
      "click",
      () => navegarCalendario(1)
    );

  el("btnCalendarioHoje")
    ?.addEventListener(
      "click",
      irParaHoje
    );

  el("tarefaVisibilidade")
    ?.addEventListener(
      "change",
      atualizarCampoVisibilidade
    );

  el("tarefasListaDia")
    ?.addEventListener(
      "click",
      tratarCliqueLista
    );
}


// ==========================================
// Eventos já existentes
// ==========================================

function configurarEventos() {
  if (eventosConfigurados) {
    return;
  }

  eventosConfigurados = true;

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


// ==========================================
// API pública para o áudio
// ==========================================

window.ListaLarTarefas = {
  abrirNovaTarefa(
    dados = {}
  ) {
    abrirFormulario({
      titulo:
        dados.titulo || "",

      responsavelUid:
        dados.responsavelUid || "",

      dataCompromisso:
        dados.dataCompromisso ||
        dados.data ||
        dados.prazo ||
        "",

      horario:
        dados.horario || "",

      prazo:
        dados.prazo || "",

      prioridade:
        dados.prioridade ||
        "media",

      observacao:
        dados.observacao ||
        "",

      visibilidade:
        dados.visibilidade ||
        "familia",

      origem:
        dados.visibilidade ===
          "pessoal"
          ? "pessoal"
          : "familia"
    });
  },

  abrirCalendario(
    data = null
  ) {
    selecionarModoPrincipal(
      "calendario"
    );

    if (data) {
      selecionarDataCalendario(
        data
      );
    }
  },

  obterFamiliaId: () =>
    familiaIdAtual,

  obterNomeFamilia: () =>
    familiaNomeAtual,

  obterMembros: () =>
    [...membros],

  obterUsuarioAtual: () => ({
    uid:
      usuarioAtual?.uid || "",

    nome:
      obterNomeUsuario(),

    email:
      usuarioAtual?.email || ""
  }),

  obterFiltroAtual: () =>
    filtroAtual,

  estaLiberado: () =>
    moduloLiberado
};


// ==========================================
// Inicialização
// ==========================================

function iniciar() {
  configurarEventos();

  function garantirEstruturaTarefas() {
    if (criarEstruturaNova()) {
      return;
    }

    let tentativas = 0;

    const intervalo =
      window.setInterval(() => {
        tentativas += 1;

        const criada =
          criarEstruturaNova();

        if (
          criada ||
          tentativas >= 40
        ) {
          window.clearInterval(
            intervalo
          );
        }
      }, 250);
  }

  garantirEstruturaTarefas();

  onAuthStateChanged(
    auth,
    async (user) => {
      usuarioAtual =
        user || null;

      if (!user) {
        familiaIdAtual = null;
        familiaNomeAtual = "";

        membros = [];

        pararListeners();
        definirVisibilidade(false);
        fecharFormulario();

        return;
      }

      try {
        garantirEstruturaTarefas();

        await carregarContexto(
          user
        );

        definirVisibilidade(
          moduloLiberado
        );

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


// ==========================================
// Executar módulo
// ==========================================

if (document.readyState === "loading") {
  document.addEventListener(
    "DOMContentLoaded",
    iniciar,
    { once: true }
  );
} else {
  iniciar();
}
