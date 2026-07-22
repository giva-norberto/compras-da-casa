// ==========================================
// ListaLar - Lembretes de Medicamentos
// Arquivo: tarefas-medicamentos.js
// Versão: 1.1.0
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
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  serverTimestamp,
  writeBatch
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
// Estado geral
// ==========================================

let usuarioAtual = null;
let familiaIdAtual = "";
let familiaNomeAtual = "";
let membros = [];

let lembretes = [];
let historico = [];

let filtroAtual = "todos";
let lembreteEdicaoId = null;
let salvandoLembrete = false;
let registrandoCompraId = null;

let unsubscribeLembretes = null;
let unsubscribeHistorico = null;

let estruturaInstalada = false;
let eventosConfigurados = false;
let contextoEmEspera = false;


// ==========================================
// Atalho de elemento
// ==========================================

const el = (id) =>
  document.getElementById(id);


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


function formatarNomePessoa(valor) {
  const texto =
    String(valor ?? "")
      .trim()
      .replace(/\s+/g, " ");

  if (!texto) {
    return "";
  }

  const conectivos =
    new Set([
      "da",
      "das",
      "de",
      "do",
      "dos",
      "e"
    ]);

  return texto
    .toLocaleLowerCase("pt-BR")
    .split(" ")
    .map((palavra, indice) => {
      if (
        indice > 0 &&
        conectivos.has(palavra)
      ) {
        return palavra;
      }

      return palavra
        .split("-")
        .map((parte) => {
          if (!parte) {
            return parte;
          }

          return (
            parte
              .charAt(0)
              .toLocaleUpperCase("pt-BR") +
            parte.slice(1)
          );
        })
        .join("-");
    })
    .join(" ");
}


function dataParaIso(data) {
  if (!(data instanceof Date)) {
    return "";
  }

  const ano =
    data.getFullYear();

  const mes =
    String(
      data.getMonth() + 1
    ).padStart(2, "0");

  const dia =
    String(
      data.getDate()
    ).padStart(2, "0");

  return `${ano}-${mes}-${dia}`;
}


function isoParaData(valor) {
  if (!valor) {
    return null;
  }

  const partes =
    String(valor).split("-");

  if (partes.length !== 3) {
    return null;
  }

  const ano =
    Number(partes[0]);

  const mes =
    Number(partes[1]);

  const dia =
    Number(partes[2]);

  const data =
    new Date(
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

  data.setHours(
    0,
    0,
    0,
    0
  );

  return data;
}


function hojeSemHora() {
  const hoje =
    new Date();

  hoje.setHours(
    0,
    0,
    0,
    0
  );

  return hoje;
}


function adicionarDias(
  data,
  quantidade
) {
  const novaData =
    new Date(data);

  novaData.setDate(
    novaData.getDate() +
    Number(quantidade || 0)
  );

  novaData.setHours(
    0,
    0,
    0,
    0
  );

  return novaData;
}


function diferencaDias(
  dataInicial,
  dataFinal
) {
  const milissegundosPorDia =
    24 *
    60 *
    60 *
    1000;

  return Math.round(
    (
      dataFinal.getTime() -
      dataInicial.getTime()
    ) /
    milissegundosPorDia
  );
}


function formatarData(valor) {
  const data =
    isoParaData(valor);

  if (!data) {
    return "Data não informada";
  }

  return data.toLocaleDateString(
    "pt-BR"
  );
}


function formatarDataLonga(valor) {
  const data =
    isoParaData(valor);

  if (!data) {
    return "Data não informada";
  }

  return data.toLocaleDateString(
    "pt-BR",
    {
      day: "2-digit",
      month: "long",
      year: "numeric"
    }
  );
}


function normalizarNumero(
  valor,
  minimo,
  maximo,
  padrao
) {
  const numero =
    Number(valor);

  if (!Number.isFinite(numero)) {
    return padrao;
  }

  return Math.min(
    Math.max(
      Math.trunc(numero),
      minimo
    ),
    maximo
  );
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


function pesoPrioridade(
  prioridade
) {
  return {
    alta: 1,
    media: 2,
    baixa: 3
  }[prioridade] || 4;
}


function obterNomeUsuario() {
  const api =
    window.ListaLarTarefas;

  if (
    api &&
    typeof api.obterUsuarioAtual ===
      "function"
  ) {
    const usuarioApi =
      api.obterUsuarioAtual();

    if (usuarioApi?.nome) {
      return usuarioApi.nome;
    }
  }

  return (
    usuarioAtual?.displayName ||
    usuarioAtual?.email ||
    "Usuário"
  );
}


function obterNomePessoaPorUid(
  uid
) {
  if (!uid) {
    return "Família / uso geral";
  }

  const membro =
    membros.find(
      (item) =>
        (
          item.uid ||
          item.id
        ) === uid
    );

  const nome =
    membro?.nome ||
    membro?.displayName ||
    membro?.email ||
    (
      uid === usuarioAtual?.uid
        ? obterNomeUsuario()
        : "Membro da família"
    );

  return (
    formatarNomePessoa(nome) ||
    "Membro da família"
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


async function confirmar({
  titulo,
  texto,
  confirmarTexto =
    "Confirmar",
  cancelarTexto =
    "Cancelar",
  tipo =
    "warning",
  confirmarClasse =
    "primary"
}) {
  if (
    typeof window.confirmarAcao ===
    "function"
  ) {
    return window.confirmarAcao({
      titulo,
      texto,
      tipo,
      confirmarTexto,
      cancelarTexto,
      confirmarClasse
    });
  }

  return window.confirm(
    `${titulo}\n\n${texto}`
  );
}


// ==========================================
// Classificação automática
// ==========================================

function classificarLembrete(
  lembrete
) {
  const proximaCompra =
    isoParaData(
      lembrete.proximaCompra
    );

  if (!proximaCompra) {
    return "proximos";
  }

  const hoje =
    hojeSemHora();

  if (hoje >= proximaCompra) {
    return "comprar-agora";
  }

  const diasAntes =
    normalizarNumero(
      lembrete.avisarDiasAntes,
      0,
      365,
      0
    );

  const inicioAviso =
    adicionarDias(
      proximaCompra,
      -diasAntes
    );

  if (hoje >= inicioAviso) {
    return "em-breve";
  }

  return "proximos";
}


function obterInformacaoPrazo(
  lembrete
) {
  const proximaCompra =
    isoParaData(
      lembrete.proximaCompra
    );

  if (!proximaCompra) {
    return {
      texto:
        "Sem data definida",

      detalhe:
        "",

      classe:
        "proximos"
    };
  }

  const hoje =
    hojeSemHora();

  const dias =
    diferencaDias(
      hoje,
      proximaCompra
    );

  const classe =
    classificarLembrete(
      lembrete
    );

  if (dias < 0) {
    const atraso =
      Math.abs(dias);

    return {
      texto:
        atraso === 1
          ? "Atrasado há 1 dia"
          : `Atrasado há ${atraso} dias`,

      detalhe:
        formatarData(
          lembrete.proximaCompra
        ),

      classe
    };
  }

  if (dias === 0) {
    return {
      texto:
        "Comprar hoje",

      detalhe:
        formatarData(
          lembrete.proximaCompra
        ),

      classe
    };
  }

  if (dias === 1) {
    return {
      texto:
        "Comprar amanhã",

      detalhe:
        formatarData(
          lembrete.proximaCompra
        ),

      classe
    };
  }

  return {
    texto:
      `Faltam ${dias} dias`,

    detalhe:
      formatarData(
        lembrete.proximaCompra
      ),

    classe
  };
}


function rotuloSituacao(
  situacao
) {
  return {
    "comprar-agora":
      "Comprar agora",

    "em-breve":
      "Em breve",

    proximos:
      "Próximos"
  }[situacao] || "Próximos";
}


function iconeSituacao(
  situacao
) {
  return {
    "comprar-agora":
      "⚠️",

    "em-breve":
      "⏳",

    proximos:
      "📅"
  }[situacao] || "📅";
}


// ==========================================
// Indicador Remédios em Tarefas
// ==========================================

function criarIndicadorMedicamentos() {
  const resumo =
    el("tarefasResumo");

  if (!resumo) {
    return false;
  }

  resumo.classList.add(
    "medicamentos-instalado"
  );

  let indicador =
    el(
      "tarefasMedicamentosCard"
    );

  if (!indicador) {
    indicador =
      document.createElement(
        "button"
      );

    indicador.id =
      "tarefasMedicamentosCard";

    indicador.type =
      "button";

    indicador.className =
      "mini-card medicamentos-resumo-card";

    indicador.hidden =
      true;

    indicador.setAttribute(
      "aria-label",
      "Abrir lembretes de medicamentos"
    );

    indicador.setAttribute(
      "title",
      "Abrir lembretes de medicamentos"
    );

    indicador.innerHTML = `
      <strong
        id="tarefasMedicamentosQuantidade"
      >
        0
      </strong>

      <span>
        Remédios
      </span>
    `;

    resumo.appendChild(
      indicador
    );
  }

  return true;
}


function atualizarIndicador() {
  const indicador =
    el(
      "tarefasMedicamentosCard"
    );

  const quantidade =
    el(
      "tarefasMedicamentosQuantidade"
    );

  if (
    !indicador ||
    !quantidade
  ) {
    return;
  }

  const precisamAtencao =
    lembretes.filter(
      (lembrete) => {
        const situacao =
          classificarLembrete(
            lembrete
          );

        return (
          situacao ===
            "comprar-agora" ||
          situacao ===
            "em-breve"
        );
      }
    ).length;

  quantidade.textContent =
    String(
      precisamAtencao
    );

  indicador.classList.toggle(
    "tem-atencao",
    precisamAtencao > 0
  );

  if (precisamAtencao === 0) {
    indicador.setAttribute(
      "aria-label",
      "Abrir lembretes de medicamentos. Nenhum medicamento precisa de atenção."
    );

    return;
  }

  indicador.setAttribute(
    "aria-label",
    `Abrir lembretes de medicamentos. ${precisamAtencao} lembrete${
      precisamAtencao === 1
        ? ""
        : "s"
    } precisa${
      precisamAtencao === 1
        ? ""
        : "m"
    } de atenção.`
  );
}


function definirVisibilidadeModulo(
  visivel
) {
  const indicador =
    el(
      "tarefasMedicamentosCard"
    );

  if (indicador) {
    indicador.hidden =
      !visivel;
  }

  if (
    !visivel &&
    el("medicamentos")
      ?.classList.contains(
        "active"
      )
  ) {
    voltarParaTarefas();
  }
}


// ==========================================
// Tela de medicamentos
// ==========================================

function criarTelaMedicamentos() {
  if (el("medicamentos")) {
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

  secao.id =
    "medicamentos";

  secao.className =
    "screen medicamentos-screen";

  secao.innerHTML = `
    <div class="medicamentos-container">

      <header class="medicamentos-cabecalho">

        <div class="medicamentos-cabecalho-superior">

          <button
            id="btnVoltarMedicamentos"
            type="button"
            class="medicamentos-btn-voltar"
            aria-label="Voltar para Tarefas"
            title="Voltar para Tarefas"
          >
            ‹
          </button>

          <div class="medicamentos-titulo-area">

            <h2>
              Lembretes de medicamentos
            </h2>

          </div>

          <button
            id="btnNovoMedicamento"
            type="button"
            class="medicamentos-btn-novo"
          >
            Adicionar Medicamento
          </button>

        </div>

      </header>


      <nav
        id="medicamentosFiltros"
        class="medicamentos-filtros"
        aria-label="Filtros dos lembretes"
      >

        <button
          type="button"
          class="medicamentos-filtro ativo"
          data-filtro-medicamento="todos"
        >
          Todos
        </button>

        <button
          type="button"
          class="medicamentos-filtro"
          data-filtro-medicamento="comprar-agora"
        >
          Comprar agora
        </button>

        <button
          type="button"
          class="medicamentos-filtro"
          data-filtro-medicamento="em-breve"
        >
          Em breve
        </button>

        <button
          type="button"
          class="medicamentos-filtro"
          data-filtro-medicamento="proximos"
        >
          Próximos
        </button>

        <button
          type="button"
          class="medicamentos-filtro"
          data-filtro-medicamento="historico"
        >
          Histórico
        </button>

      </nav>


      <form
        id="formularioMedicamento"
        class="medicamentos-formulario"
        autocomplete="off"
        novalidate
        hidden
      >

        <div class="medicamentos-formulario-topo">

          <div>
            <strong
              id="tituloFormularioMedicamento"
            >
              Novo lembrete
            </strong>
          </div>

          <button
            id="btnFecharFormularioMedicamento"
            type="button"
            class="medicamentos-btn-fechar"
            aria-label="Fechar formulário"
            title="Fechar"
          >
            ×
          </button>

        </div>


        <div class="medicamentos-campo">

          <label for="medicamentoNome">
            Medicamento
          </label>

          <input
            id="medicamentoNome"
            name="medicamentoNome"
            type="text"
            maxlength="120"
            placeholder="Ex.: Losartana 50 mg"
            required
          >

        </div>


        <div class="medicamentos-grid-duas-colunas">

          <div class="medicamentos-campo">

            <label for="medicamentoParaNome">
              Para quem
            </label>

            <input
              id="medicamentoParaNome"
              name="medicamentoParaNome"
              type="text"
              maxlength="100"
              list="medicamentoPessoasSugestoes"
              placeholder="Ex.: Givanildo, Gabriel ou Maria"
              autocomplete="off"
              required
            >

            <datalist id="medicamentoPessoasSugestoes"></datalist>

          </div>


          <div class="medicamentos-campo">

            <label for="medicamentoProximaCompra">
              Próxima compra
            </label>

            <input
              id="medicamentoProximaCompra"
              name="medicamentoProximaCompra"
              type="date"
              required
            >

          </div>

        </div>


        <div class="medicamentos-grid-tres-colunas">

          <div class="medicamentos-campo">

            <label for="medicamentoAvisarDias">
              Avisar antes
            </label>

            <input
              id="medicamentoAvisarDias"
              name="medicamentoAvisarDias"
              type="number"
              min="0"
              max="365"
              step="1"
              value="5"
              inputmode="numeric"
              required
            >

          </div>


          <div class="medicamentos-campo">

            <label for="medicamentoRepeticaoDias">
              Repetir a cada
            </label>

            <input
              id="medicamentoRepeticaoDias"
              name="medicamentoRepeticaoDias"
              type="number"
              min="1"
              max="3650"
              step="1"
              value="30"
              inputmode="numeric"
              required
            >

          </div>


          <div class="medicamentos-campo">

            <label for="medicamentoPrioridade">
              Prioridade
            </label>

            <select
              id="medicamentoPrioridade"
              name="medicamentoPrioridade"
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


        <div class="medicamentos-campo">

          <label for="medicamentoObservacao">
            Observação
          </label>

          <textarea
            id="medicamentoObservacao"
            name="medicamentoObservacao"
            rows="3"
            maxlength="500"
            placeholder="Ex.: Comprar caixa com 30 comprimidos"
          ></textarea>

        </div>


        <div class="medicamentos-formulario-acoes">

          <button
            id="btnCancelarMedicamento"
            type="button"
            class="medicamentos-btn-secundario"
          >
            Cancelar
          </button>

          <button
            id="btnSalvarMedicamento"
            type="submit"
            class="medicamentos-btn-salvar"
          >
            Salvar lembrete
          </button>

        </div>

      </form>


      <div
        id="medicamentosConteudo"
        class="medicamentos-conteudo"
      >
        <div class="medicamentos-vazio">
          Carregando lembretes...
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


// ==========================================
// Navegação
// ==========================================

function abrirTelaMedicamentos() {
  if (!familiaIdAtual) {
    avisar(
      "Aguarde um momento",
      "Os dados da família ainda estão sendo carregados.",
      "warning"
    );

    aguardarContexto();

    return;
  }

  fecharFormulario();

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

  el("medicamentos")
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

  renderizarTudo();
}


function voltarParaTarefas() {
  fecharFormulario();

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


// ==========================================
// Pessoas da família
// ==========================================

function atualizarMembrosPelaApi() {
  const api =
    window.ListaLarTarefas;

  if (
    api &&
    typeof api.obterMembros ===
      "function"
  ) {
    const lista =
      api.obterMembros();

    if (Array.isArray(lista)) {
      membros = lista;
    }
  }

  preencherPessoas();
}


function preencherPessoas() {
  const campo =
    el(
      "medicamentoParaNome"
    );

  const sugestoes =
    el(
      "medicamentoPessoasSugestoes"
    );

  if (
    !campo ||
    !sugestoes
  ) {
    return;
  }

  const pessoas =
    [...membros];

  if (
    usuarioAtual &&
    !pessoas.some(
      (membro) =>
        (
          membro.uid ||
          membro.id
        ) ===
        usuarioAtual.uid
    )
  ) {
    pessoas.push({
      uid:
        usuarioAtual.uid,

      nome:
        obterNomeUsuario(),

      email:
        usuarioAtual.email || ""
    });
  }

  const nomesUnicos =
    new Map();

  pessoas
    .filter(
      (membro) =>
        membro.ativo !== false
    )
    .forEach((membro) => {
      const nome =
        formatarNomePessoa(
          membro.nome ||
          membro.displayName ||
          membro.email ||
          ""
        );

      if (!nome) {
        return;
      }

      const chave =
        nome.toLocaleLowerCase(
          "pt-BR"
        );

      if (
        !nomesUnicos.has(chave)
      ) {
        nomesUnicos.set(
          chave,
          nome
        );
      }
    });

  sugestoes.innerHTML =
    [...nomesUnicos.values()]
      .sort((a, b) =>
        a.localeCompare(
          b,
          "pt-BR"
        )
      )
      .map(
        (nome) => `
          <option value="${escaparHtml(nome)}"></option>
        `
      )
      .join("");
}


// ==========================================
// Formulário
// ==========================================

function limparFormulario() {
  const formulario =
    el(
      "formularioMedicamento"
    );

  formulario?.reset();

  lembreteEdicaoId =
    null;

  const proximaCompra =
    el(
      "medicamentoProximaCompra"
    );

  const avisarDias =
    el(
      "medicamentoAvisarDias"
    );

  const repeticaoDias =
    el(
      "medicamentoRepeticaoDias"
    );

  const prioridade =
    el(
      "medicamentoPrioridade"
    );

  const paraNome =
    el(
      "medicamentoParaNome"
    );

  if (proximaCompra) {
    proximaCompra.value =
      dataParaIso(
        adicionarDias(
          hojeSemHora(),
          30
        )
      );
  }

  if (avisarDias) {
    avisarDias.value =
      "5";
  }

  if (repeticaoDias) {
    repeticaoDias.value =
      "30";
  }

  if (prioridade) {
    prioridade.value =
      "media";
  }

  if (paraNome) {
    paraNome.value =
      "";
  }

  const titulo =
    el(
      "tituloFormularioMedicamento"
    );

  const botaoSalvar =
    el(
      "btnSalvarMedicamento"
    );

  if (titulo) {
    titulo.textContent =
      "Novo lembrete";
  }

  if (botaoSalvar) {
    botaoSalvar.textContent =
      "Salvar lembrete";
  }
}


function abrirFormulario(
  lembrete = null
) {
  const formulario =
    el(
      "formularioMedicamento"
    );

  if (!formulario) {
    return;
  }

  atualizarMembrosPelaApi();
  limparFormulario();

  if (lembrete) {
    lembreteEdicaoId =
      lembrete.id;

    const nome =
      el(
        "medicamentoNome"
      );

    const paraNome =
      el(
        "medicamentoParaNome"
      );

    const proximaCompra =
      el(
        "medicamentoProximaCompra"
      );

    const avisarDias =
      el(
        "medicamentoAvisarDias"
      );

    const repeticaoDias =
      el(
        "medicamentoRepeticaoDias"
      );

    const prioridade =
      el(
        "medicamentoPrioridade"
      );

    const observacao =
      el(
        "medicamentoObservacao"
      );

    if (nome) {
      nome.value =
        lembrete.medicamento ||
        "";
    }

    if (paraNome) {
      paraNome.value =
        formatarNomePessoa(
          lembrete.paraNome ||
          obterNomePessoaPorUid(
            lembrete.paraUid ||
            ""
          )
        );
    }

    if (proximaCompra) {
      proximaCompra.value =
        lembrete.proximaCompra ||
        "";
    }

    if (avisarDias) {
      avisarDias.value =
        String(
          normalizarNumero(
            lembrete
              .avisarDiasAntes,
            0,
            365,
            5
          )
        );
    }

    if (repeticaoDias) {
      repeticaoDias.value =
        String(
          normalizarNumero(
            lembrete
              .repeticaoDias,
            1,
            3650,
            30
          )
        );
    }

    if (prioridade) {
      prioridade.value =
        lembrete.prioridade ||
        "media";
    }

    if (observacao) {
      observacao.value =
        lembrete.observacao ||
        "";
    }

    const titulo =
      el(
        "tituloFormularioMedicamento"
      );

    const botaoSalvar =
      el(
        "btnSalvarMedicamento"
      );

    if (titulo) {
      titulo.textContent =
        "Editar lembrete";
    }

    if (botaoSalvar) {
      botaoSalvar.textContent =
        "Salvar alterações";
    }
  }

  formulario.hidden =
    false;

  window.setTimeout(() => {
    formulario.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });

    el("medicamentoNome")
      ?.focus();
  }, 50);
}


function fecharFormulario() {
  const formulario =
    el(
      "formularioMedicamento"
    );

  if (formulario) {
    formulario.hidden =
      true;
  }

  limparFormulario();
}


function obterDadosFormulario() {
  const medicamento =
    el("medicamentoNome")
      ?.value
      .trim() ||
    "";

  const paraNome =
    formatarNomePessoa(
      el("medicamentoParaNome")
        ?.value ||
      ""
    );

  const proximaCompra =
    el("medicamentoProximaCompra")
      ?.value ||
    "";

  const avisarDiasAntes =
    normalizarNumero(
      el("medicamentoAvisarDias")
        ?.value,
      0,
      365,
      5
    );

  const repeticaoDias =
    normalizarNumero(
      el("medicamentoRepeticaoDias")
        ?.value,
      1,
      3650,
      30
    );

  const prioridade =
    el("medicamentoPrioridade")
      ?.value ||
    "media";

  const observacao =
    el("medicamentoObservacao")
      ?.value
      .trim() ||
    "";

  return {
    medicamento,

    paraUid:
      "",

    paraNome,

    proximaCompra,

    avisarDiasAntes,

    repeticaoDias,

    prioridade,

    observacao
  };
}


function validarDados(dados) {
  if (!dados.medicamento) {
    return "Informe o nome do medicamento.";
  }

  if (!dados.paraNome) {
    return "Informe para quem é o medicamento.";
  }

  if (
    !isoParaData(
      dados.proximaCompra
    )
  ) {
    return "Informe uma próxima data de compra válida.";
  }

  if (
    dados.avisarDiasAntes < 0 ||
    dados.avisarDiasAntes > 365
  ) {
    return "Informe quantos dias antes avisar, entre 0 e 365.";
  }

  if (
    dados.repeticaoDias < 1 ||
    dados.repeticaoDias > 3650
  ) {
    return "Informe a repetição entre 1 e 3650 dias.";
  }

  if (
    ![
      "alta",
      "media",
      "baixa"
    ].includes(
      dados.prioridade
    )
  ) {
    return "Selecione uma prioridade válida.";
  }

  return "";
}


async function salvarLembrete(
  evento
) {
  evento?.preventDefault();

  if (salvandoLembrete) {
    return;
  }

  if (
    !usuarioAtual ||
    !familiaIdAtual
  ) {
    await avisar(
      "Não foi possível salvar",
      "Aguarde o carregamento da família e tente novamente.",
      "warning"
    );

    return;
  }

  const dados =
    obterDadosFormulario();

  const erroValidacao =
    validarDados(dados);

  if (erroValidacao) {
    await avisar(
      "Verifique o formulário",
      erroValidacao,
      "warning"
    );

    return;
  }

  salvandoLembrete =
    true;

  const botao =
    el(
      "btnSalvarMedicamento"
    );

  if (botao) {
    botao.disabled =
      true;

    botao.textContent =
      "Salvando...";
  }

  try {
    if (lembreteEdicaoId) {
      await updateDoc(
        doc(
          db,
          "familias",
          familiaIdAtual,
          "lembretesMedicamentos",
          lembreteEdicaoId
        ),
        {
          ...dados,

          atualizadoEm:
            serverTimestamp(),

          atualizadoPorUid:
            usuarioAtual.uid,

          atualizadoPorNome:
            obterNomeUsuario()
        }
      );

      await avisar(
        "Lembrete atualizado",
        "As alterações foram salvas.",
        "success"
      );
    } else {
      await addDoc(
        collection(
          db,
          "familias",
          familiaIdAtual,
          "lembretesMedicamentos"
        ),
        {
          ...dados,

          ativo:
            true,

          criadoEm:
            serverTimestamp(),

          criadoPorUid:
            usuarioAtual.uid,

          criadoPorNome:
            obterNomeUsuario(),

          atualizadoEm:
            serverTimestamp(),

          atualizadoPorUid:
            usuarioAtual.uid,

          atualizadoPorNome:
            obterNomeUsuario()
        }
      );

      await avisar(
        "Lembrete criado",
        "O medicamento foi adicionado aos lembretes.",
        "success"
      );
    }

    fecharFormulario();
  } catch (erro) {
    console.error(
      "Erro ao salvar lembrete de medicamento:",
      erro
    );

    await avisar(
      "Lembrete não salvo",
      "Não foi possível salvar o lembrete. Verifique sua conexão e tente novamente.",
      "warning"
    );
  } finally {
    salvandoLembrete =
      false;

    if (botao) {
      botao.disabled =
        false;

      botao.textContent =
        lembreteEdicaoId
          ? "Salvar alterações"
          : "Salvar lembrete";
    }
  }
}


// ==========================================
// Referências do Firestore
// ==========================================

function referenciaLembrete(
  id
) {
  return doc(
    db,
    "familias",
    familiaIdAtual,
    "lembretesMedicamentos",
    id
  );
}


function colecaoHistorico() {
  return collection(
    db,
    "familias",
    familiaIdAtual,
    "historicoMedicamentos"
  );
}


// ==========================================
// Excluir lembrete
// ==========================================

async function excluirLembrete(
  lembrete
) {
  const aceitou =
    await confirmar({
      titulo:
        "Excluir lembrete",

      texto:
        `Deseja excluir o lembrete de “${
          lembrete.medicamento ||
          "Medicamento"
        }”? O histórico de compras já registrado será mantido.`,

      confirmarTexto:
        "Excluir",

      cancelarTexto:
        "Cancelar",

      tipo:
        "warning",

      confirmarClasse:
        "danger"
    });

  if (!aceitou) {
    return;
  }

  try {
    await deleteDoc(
      referenciaLembrete(
        lembrete.id
      )
    );

    if (
      lembreteEdicaoId ===
      lembrete.id
    ) {
      fecharFormulario();
    }

    await avisar(
      "Lembrete excluído",
      "O lembrete foi removido.",
      "success"
    );
  } catch (erro) {
    console.error(
      "Erro ao excluir lembrete:",
      erro
    );

    await avisar(
      "Não foi possível excluir",
      "Tente novamente em alguns instantes.",
      "warning"
    );
  }
}


// ==========================================
// Marcar Já comprei
// ==========================================

async function registrarCompra(
  lembrete
) {
  if (
    registrandoCompraId ||
    !familiaIdAtual ||
    !usuarioAtual
  ) {
    return;
  }

  const repeticaoDias =
    normalizarNumero(
      lembrete.repeticaoDias,
      1,
      3650,
      30
    );

  const dataCompra =
    hojeSemHora();

  const dataCompraIso =
    dataParaIso(
      dataCompra
    );

  const novaProximaCompra =
    adicionarDias(
      dataCompra,
      repeticaoDias
    );

  const novaProximaCompraIso =
    dataParaIso(
      novaProximaCompra
    );

  const aceitou =
    await confirmar({
      titulo:
        "Marcar como comprado",

      texto:
        `Confirmar a compra de “${
          lembrete.medicamento ||
          "Medicamento"
        }” hoje? A próxima compra será calculada para ${
          formatarData(
            novaProximaCompraIso
          )
        }.`,

      confirmarTexto:
        "Já comprei",

      cancelarTexto:
        "Cancelar",

      tipo:
        "info",

      confirmarClasse:
        "primary"
    });

  if (!aceitou) {
    return;
  }

  registrandoCompraId =
    lembrete.id;

  renderizarTudo();

  try {
    const batch =
      writeBatch(db);

    const historicoRef =
      doc(
        colecaoHistorico()
      );

    batch.set(
      historicoRef,
      {
        lembreteId:
          lembrete.id,

        medicamento:
          lembrete.medicamento ||
          "Medicamento",

        paraUid:
          lembrete.paraUid ||
          "",

        paraNome:
          formatarNomePessoa(
            lembrete.paraNome ||
            obterNomePessoaPorUid(
              lembrete.paraUid ||
              ""
            )
          ) ||
          "Não informado",

        prioridade:
          lembrete.prioridade ||
          "media",

        observacao:
          lembrete.observacao ||
          "",

        repeticaoDias,

        avisarDiasAntes:
          normalizarNumero(
            lembrete
              .avisarDiasAntes,
            0,
            365,
            5
          ),

        dataCompra:
          dataCompraIso,

        proximaCompraAnterior:
          lembrete.proximaCompra ||
          "",

        proximaCompraCalculada:
          novaProximaCompraIso,

        registradoEm:
          serverTimestamp(),

        registradoPorUid:
          usuarioAtual.uid,

        registradoPorNome:
          obterNomeUsuario()
      }
    );

    batch.update(
      referenciaLembrete(
        lembrete.id
      ),
      {
        ultimaCompra:
          dataCompraIso,

        ultimaCompraEm:
          serverTimestamp(),

        ultimaCompraPorUid:
          usuarioAtual.uid,

        ultimaCompraPorNome:
          obterNomeUsuario(),

        proximaCompra:
          novaProximaCompraIso,

        atualizadoEm:
          serverTimestamp(),

        atualizadoPorUid:
          usuarioAtual.uid,

        atualizadoPorNome:
          obterNomeUsuario()
      }
    );

    await batch.commit();

    await avisar(
      "Compra registrada",
      `A próxima compra foi calculada para ${
        formatarData(
          novaProximaCompraIso
        )
      }.`,
      "success"
    );
  } catch (erro) {
    console.error(
      "Erro ao registrar compra:",
      erro
    );

    await avisar(
      "Compra não registrada",
      "Não foi possível atualizar o lembrete e o histórico.",
      "warning"
    );
  } finally {
    registrandoCompraId =
      null;

    renderizarTudo();
  }
}


// ==========================================
// Ordenação
// ==========================================

function ordenarLembretes(
  lista
) {
  return [...lista].sort(
    (a, b) => {
      const dataA =
        a.proximaCompra ||
        "9999-12-31";

      const dataB =
        b.proximaCompra ||
        "9999-12-31";

      const comparacaoData =
        String(dataA)
          .localeCompare(
            String(dataB)
          );

      if (
        comparacaoData !== 0
      ) {
        return comparacaoData;
      }

      const comparacaoPrioridade =
        pesoPrioridade(
          a.prioridade
        ) -
        pesoPrioridade(
          b.prioridade
        );

      if (
        comparacaoPrioridade !== 0
      ) {
        return comparacaoPrioridade;
      }

      return String(
        a.medicamento ||
        ""
      ).localeCompare(
        String(
          b.medicamento ||
          ""
        ),
        "pt-BR"
      );
    }
  );
}


function ordenarHistorico(
  lista
) {
  return [...lista].sort(
    (a, b) => {
      const dataA =
        a.dataCompra ||
        "";

      const dataB =
        b.dataCompra ||
        "";

      const comparacaoData =
        String(dataB)
          .localeCompare(
            String(dataA)
          );

      if (
        comparacaoData !== 0
      ) {
        return comparacaoData;
      }

      return String(
        a.medicamento ||
        ""
      ).localeCompare(
        String(
          b.medicamento ||
          ""
        ),
        "pt-BR"
      );
    }
  );
}


// ==========================================
// Cartão do medicamento
// ==========================================

function criarHtmlLembrete(
  lembrete
) {
  const situacao =
    classificarLembrete(
      lembrete
    );

  const prazo =
    obterInformacaoPrazo(
      lembrete
    );

  const prioridade =
    lembrete.prioridade ||
    "media";

  const avisarDiasAntes =
    normalizarNumero(
      lembrete.avisarDiasAntes,
      0,
      365,
      5
    );

  const repeticaoDias =
    normalizarNumero(
      lembrete.repeticaoDias,
      1,
      3650,
      30
    );

  const nomePessoa =
    formatarNomePessoa(
      lembrete.paraNome ||
      obterNomePessoaPorUid(
        lembrete.paraUid ||
        ""
      )
    ) ||
    "Não informado";

  const registrando =
    registrandoCompraId ===
    lembrete.id;

  const textoAviso =
    avisarDiasAntes === 0
      ? "No dia"
      : `${avisarDiasAntes} dia${
          avisarDiasAntes === 1
            ? ""
            : "s"
        }`;

  const textoRepeticao =
    `${repeticaoDias} dia${
      repeticaoDias === 1
        ? ""
        : "s"
    }`;

  return `
    <article
      class="
        medicamento-card
        status-${escaparHtml(situacao)}
        prioridade-${escaparHtml(prioridade)}
      "
      data-lembrete-id="${escaparHtml(lembrete.id)}"
    >

      <div
        class="
          medicamento-card-topo
          medicamento-card-topo-harmonico
        "
      >

        <div
          class="
            medicamento-titulo
            medicamento-titulo-harmonico
          "
        >

          <h3>
            ${escaparHtml(
              lembrete.medicamento ||
              "Medicamento"
            )}
          </h3>

          <div class="medicamento-linha-pessoa">

            <span>
              Para:
              <strong>
                ${escaparHtml(nomePessoa)}
              </strong>
            </span>

            <span
              class="
                medicamento-prioridade
                prioridade-${escaparHtml(prioridade)}
              "
            >
              Prioridade
              ${escaparHtml(
                rotuloPrioridade(
                  prioridade
                )
              )}
            </span>

          </div>

        </div>


        <span
          class="
            medicamento-situacao
            medicamento-situacao-principal
          "
        >
          ${escaparHtml(
            rotuloSituacao(
              situacao
            )
          )}
        </span>

      </div>


      <div
        class="
          medicamento-detalhes
          medicamento-detalhes-harmonicos
        "
      >

        <div
          class="
            medicamento-detalhe
            medicamento-detalhe-principal
          "
        >

          <small>
            Próxima compra
          </small>

          <strong>
            ${escaparHtml(
              formatarDataLonga(
                lembrete.proximaCompra
              )
            )}
          </strong>

          <span
            class="
              medicamento-detalhe-apoio
              status-${escaparHtml(prazo.classe)}
            "
          >
            ${escaparHtml(
              prazo.texto
            )}
          </span>

        </div>


        <div class="medicamento-detalhe">

          <small>
            Avisar antes
          </small>

          <strong>
            ${escaparHtml(textoAviso)}
          </strong>

        </div>


        <div class="medicamento-detalhe">

          <small>
            Repetição
          </small>

          <strong>
            ${escaparHtml(textoRepeticao)}
          </strong>

        </div>

      </div>


      ${
        lembrete.observacao
          ? `
              <div class="medicamento-observacao">

                <strong>
                  Observação
                </strong>

                <p>
                  ${escaparHtml(
                    lembrete.observacao
                  )}
                </p>

              </div>
            `
          : ""
      }


      <div class="medicamento-acoes">

        <button
          type="button"
          class="medicamento-acao comprou"
          data-acao-medicamento="comprou"
          ${registrando ? "disabled" : ""}
        >
          ${
            registrando
              ? "Registrando..."
              : "Já comprei"
          }
        </button>

        <button
          type="button"
          class="medicamento-acao editar"
          data-acao-medicamento="editar"
          ${registrando ? "disabled" : ""}
        >
          Editar
        </button>

        <button
          type="button"
          class="medicamento-acao excluir"
          data-acao-medicamento="excluir"
          ${registrando ? "disabled" : ""}
        >
          Excluir
        </button>

      </div>

    </article>
  `;
}


// ==========================================
// Cartão do histórico
// ==========================================

function criarHtmlHistorico(
  item
) {
  return `
    <article class="medicamento-historico-card">

      <div class="medicamento-historico-icone">
        ✓
      </div>

      <div class="medicamento-historico-conteudo">

        <div class="medicamento-historico-topo">

          <div>
            <h3>
              ${escaparHtml(
                item.medicamento ||
                "Medicamento"
              )}
            </h3>

            <span>
              ${escaparHtml(
                formatarNomePessoa(
                  item.paraNome ||
                  "Não informado"
                )
              )}
            </span>
          </div>

          <span class="medicamento-historico-data">
            Comprado em
            ${escaparHtml(
              formatarData(
                item.dataCompra
              )
            )}
          </span>

        </div>


        <div class="medicamento-historico-informacoes">

          <span>
            Repetição:
            ${escaparHtml(
              String(
                item.repeticaoDias ||
                30
              )
            )}
            dias
          </span>

          <span>
            Próxima compra calculada:
            ${escaparHtml(
              formatarData(
                item.proximaCompraCalculada
              )
            )}
          </span>

          ${
            item.registradoPorNome
              ? `
                  <span>
                    Registrado por
                    ${escaparHtml(
                      item.registradoPorNome
                    )}
                  </span>
                `
              : ""
          }

        </div>

      </div>

    </article>
  `;
}


// ==========================================
// Mensagem vazia
// ==========================================

function criarHtmlVazio(
  titulo,
  texto,
  mostrarBotao = false
) {
  return `
    <div class="medicamentos-vazio">

      <div
        class="medicamentos-vazio-icone"
        aria-hidden="true"
      >
        💊
      </div>

      <strong>
        ${escaparHtml(titulo)}
      </strong>

      <p>
        ${escaparHtml(texto)}
      </p>

      ${
        mostrarBotao
          ? `
              <button
                type="button"
                data-acao-medicamento="novo"
                class="medicamentos-vazio-botao"
              >
                Adicionar medicamento
              </button>
            `
          : ""
      }

    </div>
  `;
}


// ==========================================
// Seção de medicamentos
// ==========================================

function criarHtmlSecao({
  situacao,
  titulo,
  descricao,
  lista
}) {
  const itens =
    ordenarLembretes(
      lista
    );

  return `
    <section
      class="
        medicamentos-secao
        secao-${escaparHtml(situacao)}
      "
    >

      <div class="medicamentos-secao-topo">

        <div>
          <h3>
            <span aria-hidden="true">
              ${iconeSituacao(situacao)}
            </span>

            ${escaparHtml(titulo)}
          </h3>

          <p>
            ${escaparHtml(descricao)}
          </p>
        </div>

        <span class="medicamentos-secao-contador">
          ${itens.length}
        </span>

      </div>


      <div class="medicamentos-lista">

        ${
          itens.length
            ? itens
                .map(
                  criarHtmlLembrete
                )
                .join("")
            : criarHtmlVazio(
                `Nenhum item em ${titulo}`,
                "Os lembretes aparecerão aqui automaticamente conforme a data de compra."
              )
        }

      </div>

    </section>
  `;
}


// ==========================================
// Renderizar histórico
// ==========================================

function renderizarHistorico() {
  const area =
    el(
      "medicamentosConteudo"
    );

  if (!area) {
    return;
  }

  const itens =
    ordenarHistorico(
      historico
    );

  area.innerHTML = `
    <section
      class="
        medicamentos-secao
        secao-historico
      "
    >

      <div class="medicamentos-secao-topo">

        <div>
          <h3>
            <span aria-hidden="true">
              🕘
            </span>

            Histórico
          </h3>

          <p>
            Compras de medicamentos já registradas.
          </p>
        </div>

        <span class="medicamentos-secao-contador">
          ${itens.length}
        </span>

      </div>


      <div class="medicamentos-historico-lista">

        ${
          itens.length
            ? itens
                .map(
                  criarHtmlHistorico
                )
                .join("")
            : criarHtmlVazio(
                "Histórico vazio",
                "Quando você marcar Já comprei, o registro aparecerá aqui."
              )
        }

      </div>

    </section>
  `;
}


// ==========================================
// Renderizar lembretes
// ==========================================

function renderizarLembretes() {
  const area =
    el(
      "medicamentosConteudo"
    );

  if (!area) {
    return;
  }

  const ativos =
    lembretes.filter(
      (lembrete) =>
        lembrete.ativo !== false
    );

  if (
    filtroAtual ===
    "historico"
  ) {
    renderizarHistorico();

    return;
  }

  const comprarAgora =
    ativos.filter(
      (lembrete) =>
        classificarLembrete(
          lembrete
        ) ===
        "comprar-agora"
    );

  const emBreve =
    ativos.filter(
      (lembrete) =>
        classificarLembrete(
          lembrete
        ) ===
        "em-breve"
    );

  const proximos =
    ativos.filter(
      (lembrete) =>
        classificarLembrete(
          lembrete
        ) ===
        "proximos"
    );

  if (
    filtroAtual ===
    "todos"
  ) {
    if (!ativos.length) {
      area.innerHTML =
        criarHtmlVazio(
          "Nenhum lembrete cadastrado",
          "Cadastre o primeiro medicamento para acompanhar a próxima compra.",
          true
        );

      return;
    }

    area.innerHTML = [
      criarHtmlSecao({
        situacao:
          "comprar-agora",

        titulo:
          "Comprar agora",

        descricao:
          "Medicamentos na data de compra ou atrasados.",

        lista:
          comprarAgora
      }),

      criarHtmlSecao({
        situacao:
          "em-breve",

        titulo:
          "Em breve",

        descricao:
          "Medicamentos dentro do período de aviso.",

        lista:
          emBreve
      }),

      criarHtmlSecao({
        situacao:
          "proximos",

        titulo:
          "Próximos",

        descricao:
          "Medicamentos que ainda estão fora do período de aviso.",

        lista:
          proximos
      })
    ].join("");

    return;
  }

  const configuracoes = {
    "comprar-agora": {
      titulo:
        "Comprar agora",

      descricao:
        "Medicamentos na data de compra ou atrasados.",

      lista:
        comprarAgora
    },

    "em-breve": {
      titulo:
        "Em breve",

      descricao:
        "Medicamentos dentro do período de aviso.",

      lista:
        emBreve
    },

    proximos: {
      titulo:
        "Próximos",

      descricao:
        "Medicamentos que ainda estão fora do período de aviso.",

      lista:
        proximos
    }
  };

  const configuracao =
    configuracoes[filtroAtual] ||
    configuracoes.proximos;

  area.innerHTML =
    criarHtmlSecao({
      situacao:
        filtroAtual,

      ...configuracao
    });
}


// ==========================================
// Atualizar botões dos filtros
// ==========================================

function atualizarFiltros() {
  document
    .querySelectorAll(
      "[data-filtro-medicamento]"
    )
    .forEach((botao) => {
      const ativo =
        botao.dataset
          .filtroMedicamento ===
        filtroAtual;

      botao.classList.toggle(
        "ativo",
        ativo
      );

      botao.setAttribute(
        "aria-current",
        ativo
          ? "page"
          : "false"
      );
    });
}


function atualizarSubtitulo() {
  // O cabeçalho foi simplificado e não exibe o nome da família.
}


function renderizarTudo() {
  atualizarIndicador();
  atualizarFiltros();
  atualizarSubtitulo();
  renderizarLembretes();
}


// ==========================================
// Listeners do Firestore
// ==========================================

function pararListeners() {
  if (
    typeof unsubscribeLembretes ===
    "function"
  ) {
    unsubscribeLembretes();
  }

  if (
    typeof unsubscribeHistorico ===
    "function"
  ) {
    unsubscribeHistorico();
  }

  unsubscribeLembretes =
    null;

  unsubscribeHistorico =
    null;

  lembretes =
    [];

  historico =
    [];

  renderizarTudo();
}


function iniciarListeners() {
  if (!familiaIdAtual) {
    return;
  }

  pararListeners();

  unsubscribeLembretes =
    onSnapshot(
      collection(
        db,
        "familias",
        familiaIdAtual,
        "lembretesMedicamentos"
      ),

      (snapshot) => {
        lembretes =
          snapshot.docs
            .map(
              (registro) => ({
                id:
                  registro.id,

                ...registro.data()
              })
            )
            .filter(
              (lembrete) =>
                lembrete.ativo !==
                false
            );

        renderizarTudo();
      },

      async (erro) => {
        console.error(
          "Erro ao carregar lembretes de medicamentos:",
          erro
        );

        await avisar(
          "Erro ao carregar medicamentos",
          "Não foi possível carregar os lembretes. Atualize a tela e tente novamente.",
          "warning"
        );
      }
    );

  unsubscribeHistorico =
    onSnapshot(
      colecaoHistorico(),

      (snapshot) => {
        historico =
          snapshot.docs.map(
            (registro) => ({
              id:
                registro.id,

              ...registro.data()
            })
          );

        renderizarTudo();
      },

      async (erro) => {
        console.error(
          "Erro ao carregar histórico de medicamentos:",
          erro
        );

        await avisar(
          "Erro ao carregar histórico",
          "Não foi possível carregar o histórico de compras.",
          "warning"
        );
      }
    );
}


// ==========================================
// Contexto do ListaLar
// ==========================================

async function obterFamiliaDiretamente() {
  if (!usuarioAtual) {
    return "";
  }

  try {
    const usuarioSnap =
      await getDoc(
        doc(
          db,
          "usuarios",
          usuarioAtual.uid
        )
      );

    if (
      !usuarioSnap.exists()
    ) {
      return "";
    }

    return (
      usuarioSnap
        .data()
        .familiaId ||
      ""
    );
  } catch (erro) {
    console.warn(
      "Medicamentos: não foi possível obter a família diretamente.",
      erro
    );

    return "";
  }
}


async function sincronizarContexto(
  detalhe = null
) {
  const api =
    window.ListaLarTarefas;

  const liberado =
    typeof detalhe?.liberado ===
      "boolean"
      ? detalhe.liberado
      : typeof api?.estaLiberado ===
          "function"
        ? api.estaLiberado()
        : false;

  let familiaId =
    detalhe?.familiaId ||
    (
      typeof api?.obterFamiliaId ===
      "function"
        ? api.obterFamiliaId()
        : ""
    );

  if (
    !familiaId &&
    liberado
  ) {
    familiaId =
      await obterFamiliaDiretamente();
  }

  const nomeFamilia =
    typeof api?.obterNomeFamilia ===
      "function"
      ? api.obterNomeFamilia()
      : "";

  criarIndicadorMedicamentos();
  criarTelaMedicamentos();

  if (
    !usuarioAtual ||
    !liberado ||
    !familiaId
  ) {
    definirVisibilidadeModulo(
      false
    );

    if (!liberado) {
      pararListeners();

      familiaIdAtual =
        "";

      familiaNomeAtual =
        "";
    }

    return false;
  }

  definirVisibilidadeModulo(
    true
  );

  const familiaMudou =
    familiaIdAtual !==
    familiaId;

  familiaIdAtual =
    familiaId;

  familiaNomeAtual =
    nomeFamilia ||
    "Minha família";

  atualizarMembrosPelaApi();
  atualizarSubtitulo();

  if (
    familiaMudou ||
    !unsubscribeLembretes ||
    !unsubscribeHistorico
  ) {
    iniciarListeners();
  } else {
    renderizarTudo();
  }

  return true;
}


function aguardarContexto() {
  if (contextoEmEspera) {
    return;
  }

  contextoEmEspera =
    true;

  let tentativas =
    0;

  const intervalo =
    window.setInterval(
      async () => {
        tentativas +=
          1;

        const pronto =
          await sincronizarContexto();

        if (
          pronto ||
          tentativas >= 120
        ) {
          window.clearInterval(
            intervalo
          );

          contextoEmEspera =
            false;
        }
      },
      250
    );
}


// ==========================================
// Eventos dos cartões
// ==========================================

function localizarLembreteNoElemento(
  elemento
) {
  const cartao =
    elemento.closest(
      "[data-lembrete-id]"
    );

  if (!cartao) {
    return null;
  }

  return (
    lembretes.find(
      (lembrete) =>
        lembrete.id ===
        cartao.dataset
          .lembreteId
    ) ||
    null
  );
}


async function tratarCliqueConteudo(
  evento
) {
  const botao =
    evento.target.closest(
      "[data-acao-medicamento]"
    );

  if (!botao) {
    return;
  }

  const acao =
    botao.dataset
      .acaoMedicamento;

  if (acao === "novo") {
    abrirFormulario();

    return;
  }

  const lembrete =
    localizarLembreteNoElemento(
      botao
    );

  if (!lembrete) {
    return;
  }

  if (acao === "editar") {
    abrirFormulario(
      lembrete
    );

    return;
  }

  if (acao === "excluir") {
    await excluirLembrete(
      lembrete
    );

    return;
  }

  if (acao === "comprou") {
    await registrarCompra(
      lembrete
    );
  }
}


// ==========================================
// Configuração dos eventos
// ==========================================

function configurarEventos() {
  if (eventosConfigurados) {
    return;
  }

  el("tarefasMedicamentosCard")
    ?.addEventListener(
      "click",
      abrirTelaMedicamentos
    );

  el("btnVoltarMedicamentos")
    ?.addEventListener(
      "click",
      voltarParaTarefas
    );

  el("btnNovoMedicamento")
    ?.addEventListener(
      "click",
      () => abrirFormulario()
    );

  el("btnFecharFormularioMedicamento")
    ?.addEventListener(
      "click",
      fecharFormulario
    );

  el("btnCancelarMedicamento")
    ?.addEventListener(
      "click",
      fecharFormulario
    );

  el("formularioMedicamento")
    ?.addEventListener(
      "submit",
      salvarLembrete
    );

  el("medicamentosFiltros")
    ?.addEventListener(
      "click",
      (evento) => {
        const botao =
          evento.target.closest(
            "[data-filtro-medicamento]"
          );

        if (!botao) {
          return;
        }

        filtroAtual =
          botao.dataset
            .filtroMedicamento ||
          "todos";

        atualizarFiltros();
        renderizarLembretes();
      }
    );

  el("medicamentosConteudo")
    ?.addEventListener(
      "click",
      tratarCliqueConteudo
    );

  document.addEventListener(
    "keydown",
    (evento) => {
      if (
        evento.key !==
        "Escape"
      ) {
        return;
      }

      const formulario =
        el(
          "formularioMedicamento"
        );

      if (
        formulario &&
        !formulario.hidden
      ) {
        fecharFormulario();

        return;
      }

      if (
        el("medicamentos")
          ?.classList.contains(
            "active"
          )
      ) {
        voltarParaTarefas();
      }
    }
  );

  eventosConfigurados =
    true;
}


// ==========================================
// Estilos do módulo
// ==========================================

function criarEstilos() {
  if (
    el("medicamentosEstilos")
  ) {
    return;
  }

  const estilo =
    document.createElement(
      "style"
    );

  estilo.id =
    "medicamentosEstilos";

  estilo.textContent = `

    /* ======================================
       Quatro indicadores em Tarefas
       ====================================== */

    #tarefasResumo.medicamentos-instalado {
      grid-template-columns:
        repeat(
          4,
          minmax(0, 1fr)
        ) !important;
    }

    #tarefasMedicamentosCard {
      appearance: none;
      -webkit-appearance: none;
      width: 100%;
      margin: 0;
      font: inherit;
      cursor: pointer;

      transition:
        transform 0.16s ease,
        box-shadow 0.16s ease,
        border-color 0.16s ease,
        background 0.16s ease;

      -webkit-tap-highlight-color:
        transparent;

      border-color:
        #bfdbfe !important;

      background:
        #eff6ff !important;
    }

    #tarefasMedicamentosCard strong {
      color:
        #2563eb !important;
    }

    #tarefasMedicamentosCard.tem-atencao {
      border-color:
        #60a5fa !important;

      background:
        #dbeafe !important;
    }

    #tarefasMedicamentosCard.tem-atencao strong {
      color:
        #1d4ed8 !important;
    }

    #tarefasMedicamentosCard:hover {
      transform:
        translateY(-1px);

      border-color:
        #93c5fd !important;

      box-shadow:
        0 7px 18px
        rgba(37, 99, 235, 0.12);
    }

    #tarefasMedicamentosCard:active {
      transform:
        translateY(0)
        scale(0.99);
    }

    #tarefasMedicamentosCard:focus-visible {
      outline:
        3px solid
        rgba(37, 99, 235, 0.28);

      outline-offset:
        2px;
    }


    /* ======================================
       Tela principal
       ====================================== */

    .medicamentos-screen {
      width: 100%;
      max-width: 100%;
      padding-bottom: 110px;
    }

    .medicamentos-container {
      width: 100%;
      max-width: 1120px;
      margin: 0 auto;
      box-sizing: border-box;
      container-type: inline-size;
    }


    /* ======================================
       Cabeçalho
       ====================================== */

    .medicamentos-cabecalho {
      margin-bottom: 10px;
      padding: 12px;
      border-radius: 16px;

      background:
        linear-gradient(
          135deg,
          #2563eb 0%,
          #3b82f6 55%,
          #60a5fa 100%
        );

      color: #ffffff;

      box-shadow:
        0 8px 22px
        rgba(37, 99, 235, 0.18);
    }

    .medicamentos-cabecalho-superior {
      display: grid;

      grid-template-columns:
        auto
        minmax(0, 1fr)
        auto;

      align-items: center;
      gap: 10px;
    }

    .medicamentos-btn-voltar {
      width: 40px;
      height: 40px;

      display: inline-flex;
      align-items: center;
      justify-content: center;

      border:
        1px solid
        rgba(255, 255, 255, 0.42);

      border-radius: 12px;

      background:
        rgba(255, 255, 255, 0.14);

      color: #ffffff;
      font: inherit;
      font-size: 30px;
      font-weight: 500;
      line-height: 1;
      cursor: pointer;

      -webkit-tap-highlight-color:
        transparent;
    }

    .medicamentos-btn-voltar:hover {
      background:
        rgba(255, 255, 255, 0.22);
    }

    .medicamentos-titulo-area {
      min-width: 0;
      display: block;
    }

    .medicamentos-titulo-area h2 {
      margin: 0;
      color: #ffffff;

      font-size:
        clamp(
          1.05rem,
          2.6vw,
          1.42rem
        );

      line-height: 1.2;
      overflow-wrap: normal;
      word-break: normal;
    }

    .medicamentos-btn-novo {
      min-height: 40px;
      padding: 8px 13px;
      border: 0;
      border-radius: 12px;
      background: #ffffff;
      color: #1d4ed8;
      font: inherit;
      font-size: 0.8rem;
      font-weight: 800;
      white-space: nowrap;
      cursor: pointer;

      box-shadow:
        0 8px 20px
        rgba(30, 64, 175, 0.18);

      -webkit-tap-highlight-color:
        transparent;
    }

    .medicamentos-btn-novo:hover {
      background: #eff6ff;
    }


    /* ======================================
       Filtros
       ====================================== */

    .medicamentos-filtros {
      display: flex;
      align-items: center;
      gap: 8px;

      margin-bottom: 14px;
      padding: 5px;
      overflow-x: auto;

      border:
        1px solid
        #e2e8f0;

      border-radius: 16px;
      background: #ffffff;

      box-shadow:
        0 5px 16px
        rgba(15, 23, 42, 0.06);

      scrollbar-width: none;
    }

    .medicamentos-filtros::-webkit-scrollbar {
      display: none;
    }

    .medicamentos-filtro {
      min-height: 38px;
      flex: 0 0 auto;

      padding: 8px 13px;
      border: 0;
      border-radius: 11px;

      background: transparent;
      color: #64748b;

      font: inherit;
      font-size: 0.85rem;
      font-weight: 750;
      white-space: nowrap;
      cursor: pointer;

      -webkit-tap-highlight-color:
        transparent;
    }

    .medicamentos-filtro:hover {
      background: #f1f5f9;
      color: #334155;
    }

    .medicamentos-filtro.ativo {
      background: #2563eb;
      color: #ffffff;

      box-shadow:
        0 5px 14px
        rgba(37, 99, 235, 0.24);
    }


    /* ======================================
       Foco dos botões
       ====================================== */

    .medicamentos-btn-voltar:focus-visible,
    .medicamentos-btn-novo:focus-visible,
    .medicamentos-filtro:focus-visible,
    .medicamento-acao:focus-visible,
    .medicamentos-btn-salvar:focus-visible,
    .medicamentos-btn-secundario:focus-visible,
    .medicamentos-btn-fechar:focus-visible,
    .medicamentos-vazio-botao:focus-visible {
      outline:
        3px solid
        rgba(37, 99, 235, 0.28);

      outline-offset:
        2px;
    }


    /* ======================================
       Formulário
       ====================================== */

    .medicamentos-formulario {
      width: 100%;
      margin-bottom: 16px;
      padding: 15px;

      border:
        1px solid
        #bfdbfe;

      border-radius: 20px;
      background: #eff6ff;

      box-shadow:
        0 10px 28px
        rgba(37, 99, 235, 0.10);

      box-sizing: border-box;
    }

    .medicamentos-formulario[hidden] {
      display: none !important;
    }

    .medicamentos-formulario-topo {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 12px;
    }

    .medicamentos-formulario-topo > div {
      display: flex;
      align-items: center;
      gap: 0;

      color: #1e293b;
      font-size: 1.08rem;
    }

    .medicamentos-btn-fechar {
      width: 36px;
      height: 36px;

      display: inline-flex;
      align-items: center;
      justify-content: center;

      border: 0;
      border-radius: 11px;

      background: #dbeafe;
      color: #1e40af;

      font: inherit;
      font-size: 24px;
      line-height: 1;
      cursor: pointer;
    }

    .medicamentos-grid-duas-colunas {
      display: grid;

      grid-template-columns:
        repeat(
          2,
          minmax(0, 1fr)
        );

      gap: 12px;
    }

    .medicamentos-grid-tres-colunas {
      display: grid;

      grid-template-columns:
        repeat(
          3,
          minmax(0, 1fr)
        );

      gap: 12px;
    }

    .medicamentos-campo {
      min-width: 0;
      margin-bottom: 13px;
    }

    .medicamentos-campo label {
      display: block;
      margin-bottom: 6px;

      color: #334155;
      font-size: 0.82rem;
      font-weight: 750;
    }

    .medicamentos-campo input,
    .medicamentos-campo select,
    .medicamentos-campo textarea {
      width: 100%;
      min-height: 43px;
      padding: 10px 12px;

      border:
        1px solid
        #cbd5e1;

      border-radius: 12px;
      background: #ffffff;
      color: #1e293b;

      font: inherit;
      font-size: 0.92rem;

      box-sizing: border-box;
      outline: none;
    }

    .medicamentos-campo textarea {
      min-height: 92px;
      resize: vertical;
    }

    .medicamentos-campo input:focus,
    .medicamentos-campo select:focus,
    .medicamentos-campo textarea:focus {
      border-color: #60a5fa;

      box-shadow:
        0 0 0 3px
        rgba(59, 130, 246, 0.15);
    }

    .medicamentos-formulario-acoes {
      display: flex;
      justify-content: flex-end;
      gap: 10px;
      margin-top: 2px;
    }

    .medicamentos-btn-secundario,
    .medicamentos-btn-salvar {
      min-height: 43px;
      padding: 10px 17px;
      border-radius: 12px;
      font: inherit;
      font-weight: 800;
      cursor: pointer;
    }

    .medicamentos-btn-secundario {
      border:
        1px solid
        #cbd5e1;

      background: #ffffff;
      color: #475569;
    }

    .medicamentos-btn-salvar {
      border:
        1px solid
        #2563eb;

      background: #2563eb;
      color: #ffffff;
    }

    .medicamentos-btn-salvar:hover {
      background: #1d4ed8;
    }

    .medicamentos-btn-salvar:disabled,
    .medicamentos-btn-secundario:disabled {
      opacity: 0.65;
      cursor: wait;
    }


    /* ======================================
       Seções
       ====================================== */

    .medicamentos-conteudo {
      display: grid;
      gap: 16px;
    }

    .medicamentos-secao {
      overflow: hidden;

      border:
        1px solid
        #e2e8f0;

      border-radius: 20px;
      background: #ffffff;

      box-shadow:
        0 8px 24px
        rgba(15, 23, 42, 0.07);
    }

    .medicamentos-secao-topo {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 12px;

      padding: 15px 17px;

      border-bottom:
        1px solid
        #e2e8f0;

      background: #f8fafc;
    }

    .medicamentos-secao-topo h3 {
      display: flex;
      align-items: center;
      gap: 7px;

      margin: 0;
      color: #1e293b;
      font-size: 1rem;
    }

    .medicamentos-secao-topo p {
      margin: 4px 0 0;
      color: #64748b;
      font-size: 0.8rem;
      line-height: 1.35;
    }

    .medicamentos-secao-contador {
      min-width: 30px;
      height: 30px;

      display: inline-flex;
      align-items: center;
      justify-content: center;

      border-radius: 10px;
      background: #e2e8f0;
      color: #334155;

      font-size: 0.82rem;
      font-weight: 850;
    }


    /* Comprar agora */

    .secao-comprar-agora
    .medicamentos-secao-topo {
      background: #fff1f2;
      border-bottom-color: #fecdd3;
    }

    .secao-comprar-agora
    .medicamentos-secao-contador {
      background: #fee2e2;
      color: #b91c1c;
    }


    /* Em breve */

    .secao-em-breve
    .medicamentos-secao-topo {
      background: #fffbeb;
      border-bottom-color: #fde68a;
    }

    .secao-em-breve
    .medicamentos-secao-contador {
      background: #fef3c7;
      color: #b45309;
    }


    /* Próximos */

    .secao-proximos
    .medicamentos-secao-topo {
      background: #eff6ff;
      border-bottom-color: #bfdbfe;
    }

    .secao-proximos
    .medicamentos-secao-contador {
      background: #dbeafe;
      color: #1d4ed8;
    }


    /* Histórico */

    .secao-historico
    .medicamentos-secao-topo {
      background: #f0fdf4;
      border-bottom-color: #bbf7d0;
    }

    .secao-historico
    .medicamentos-secao-contador {
      background: #dcfce7;
      color: #15803d;
    }


    /* ======================================
       Lista e cartões
       ====================================== */

    .medicamentos-lista,
    .medicamentos-historico-lista {
      display: grid;
      gap: 12px;
      padding: 14px;
    }

    .medicamento-card {
      position: relative;
      overflow: hidden;
      padding: 15px;

      border:
        1px solid
        #e2e8f0;

      border-left-width: 5px;
      border-radius: 17px;
      background: #ffffff;

      box-shadow:
        0 5px 16px
        rgba(15, 23, 42, 0.06);
    }

    .medicamento-card.status-comprar-agora {
      border-left-color: #ef4444;
    }

    .medicamento-card.status-em-breve {
      border-left-color: #f59e0b;
    }

    .medicamento-card.status-proximos {
      border-left-color: #3b82f6;
    }

    .medicamento-card-topo-harmonico {
      display: grid;

      grid-template-columns:
        minmax(0, 1fr)
        auto;

      align-items: start;
      gap: 10px;
    }

    .medicamento-titulo {
      min-width: 0;
    }

    .medicamento-titulo-harmonico h3 {
      margin: 0 0 7px;
      overflow-wrap: anywhere;
      color: #1e293b;
      font-size: 1.04rem;
      line-height: 1.25;
    }

    .medicamento-linha-pessoa {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 6px 8px;

      color: #64748b;
      font-size: 0.77rem;
      line-height: 1.35;
    }

    .medicamento-linha-pessoa > span:first-child {
      min-width: 0;
      overflow-wrap: anywhere;
    }

    .medicamento-linha-pessoa > span:first-child strong {
      color: #334155;
      font-weight: 800;
    }

    .medicamento-situacao,
    .medicamento-prioridade {
      display: inline-flex;
      align-items: center;
      gap: 4px;

      min-height: 25px;
      padding: 4px 8px;
      border-radius: 999px;

      font-size: 0.68rem;
      font-weight: 850;
      line-height: 1;
    }

    .medicamento-situacao-principal {
      flex: 0 0 auto;
      justify-content: center;
      white-space: nowrap;
    }

    .status-comprar-agora
    .medicamento-situacao {
      background: #fee2e2;
      color: #b91c1c;
    }

    .status-em-breve
    .medicamento-situacao {
      background: #fef3c7;
      color: #b45309;
    }

    .status-proximos
    .medicamento-situacao {
      background: #dbeafe;
      color: #1d4ed8;
    }

    .medicamento-prioridade.prioridade-alta {
      background: #ffe4e6;
      color: #be123c;
    }

    .medicamento-prioridade.prioridade-media {
      background: #fef3c7;
      color: #a16207;
    }

    .medicamento-prioridade.prioridade-baixa {
      background: #dcfce7;
      color: #15803d;
    }


    /* ======================================
       Detalhes harmonizados
       ====================================== */

    .medicamento-detalhes-harmonicos {
      display: grid;

      grid-template-columns:
        minmax(0, 1.35fr)
        repeat(
          2,
          minmax(0, 1fr)
        );

      gap: 8px;
      margin-top: 12px;
    }

    .medicamento-detalhes-harmonicos
    .medicamento-detalhe {
      min-width: 0;
      display: block;
      min-height: 68px;
      padding: 10px;
      border-radius: 12px;
      background: #f8fafc;
    }

    .medicamento-detalhes-harmonicos
    .medicamento-detalhe small,
    .medicamento-detalhes-harmonicos
    .medicamento-detalhe strong {
      display: block;
      overflow-wrap: anywhere;
    }

    .medicamento-detalhes-harmonicos
    .medicamento-detalhe small {
      margin-bottom: 5px;
      color: #64748b;
      font-size: 0.65rem;
      font-weight: 700;
    }

    .medicamento-detalhes-harmonicos
    .medicamento-detalhe strong {
      color: #334155;
      font-size: 0.78rem;
      line-height: 1.35;
    }

    .medicamento-detalhe-apoio {
      display: inline-flex;
      align-items: center;

      margin-top: 5px;
      padding: 3px 6px;
      border-radius: 999px;

      font-size: 0.62rem;
      font-weight: 800;
      line-height: 1.2;
    }

    .medicamento-detalhe-apoio.status-comprar-agora {
      background: #fee2e2;
      color: #b91c1c;
    }

    .medicamento-detalhe-apoio.status-em-breve {
      background: #fef3c7;
      color: #b45309;
    }

    .medicamento-detalhe-apoio.status-proximos {
      background: #dbeafe;
      color: #1d4ed8;
    }

    .medicamento-observacao {
      display: block;
      margin-top: 9px;
      padding: 9px 10px;

      border-radius: 12px;
      background: #f8fafc;
      color: #475569;
    }

    .medicamento-observacao strong {
      display: block;
      margin-bottom: 3px;
      color: #64748b;
      font-size: 0.65rem;
    }

    .medicamento-observacao p {
      margin: 0;
      overflow-wrap: anywhere;
      font-size: 0.79rem;
      line-height: 1.4;
    }


    /* ======================================
       Ações
       ====================================== */

    .medicamento-acoes {
      display: grid;

      grid-template-columns:
        minmax(0, 1.3fr)
        minmax(0, 0.85fr)
        minmax(0, 0.85fr);

      gap: 7px;
      margin-top: 13px;
      padding-top: 12px;

      border-top:
        1px solid
        #e2e8f0;
    }

    .medicamento-acao {
      width: 100%;
      min-width: 0;
      min-height: 36px;
      padding: 8px 11px;

      border:
        1px solid
        transparent;

      border-radius: 10px;

      font: inherit;
      font-size: 0.75rem;
      font-weight: 800;
      cursor: pointer;

      -webkit-tap-highlight-color:
        transparent;
    }

    .medicamento-acao.comprou {
      margin-right: 0;
      border-color: #86efac;
      background: #dcfce7;
      color: #15803d;
    }

    .medicamento-acao.editar {
      border-color: #bfdbfe;
      background: #eff6ff;
      color: #1d4ed8;
    }

    .medicamento-acao.excluir {
      border-color: #fecaca;
      background: #fff1f2;
      color: #b91c1c;
    }

    .medicamento-acao:hover {
      filter: brightness(0.98);
    }

    .medicamento-acao:disabled {
      opacity: 0.6;
      cursor: wait;
    }


    /* ======================================
       Histórico
       ====================================== */

    .medicamento-historico-card {
      display: flex;
      align-items: flex-start;
      gap: 11px;

      padding: 14px;

      border:
        1px solid
        #bbf7d0;

      border-radius: 16px;
      background: #f0fdf4;
    }

    .medicamento-historico-icone {
      width: 38px;
      height: 38px;
      flex: 0 0 auto;

      display: inline-flex;
      align-items: center;
      justify-content: center;

      border-radius: 50%;
      background: #22c55e;
      color: #ffffff;

      font-size: 20px;
      font-weight: 900;
    }

    .medicamento-historico-conteudo {
      min-width: 0;
      flex: 1;
    }

    .medicamento-historico-topo {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 10px;
    }

    .medicamento-historico-topo h3 {
      margin: 0 0 3px;
      overflow-wrap: anywhere;
      color: #166534;
      font-size: 0.97rem;
    }

    .medicamento-historico-topo div > span {
      color: #4b7b5b;
      font-size: 0.75rem;
    }

    .medicamento-historico-data {
      flex: 0 0 auto;
      padding: 5px 8px;
      border-radius: 9px;
      background: #dcfce7;
      color: #166534;
      font-size: 0.68rem;
      font-weight: 800;
    }

    .medicamento-historico-informacoes {
      display: flex;
      flex-wrap: wrap;
      gap: 7px 12px;

      margin-top: 9px;

      color: #3f6f50;
      font-size: 0.72rem;
      line-height: 1.35;
    }


    /* ======================================
       Estado vazio
       ====================================== */

    .medicamentos-vazio {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;

      min-height: 150px;
      padding: 24px;

      text-align: center;
      box-sizing: border-box;
    }

    .medicamentos-vazio-icone {
      width: 52px;
      height: 52px;

      display: inline-flex;
      align-items: center;
      justify-content: center;

      margin-bottom: 10px;
      border-radius: 16px;
      background: #eff6ff;

      font-size: 27px;
    }

    .medicamentos-vazio strong {
      color: #334155;
      font-size: 0.94rem;
    }

    .medicamentos-vazio p {
      max-width: 440px;
      margin: 7px 0 0;

      color: #64748b;
      font-size: 0.8rem;
      line-height: 1.45;
    }

    .medicamentos-vazio-botao {
      min-height: 39px;
      margin-top: 13px;
      padding: 8px 13px;

      border: 0;
      border-radius: 11px;
      background: #2563eb;
      color: #ffffff;

      font: inherit;
      font-size: 0.8rem;
      font-weight: 800;
      cursor: pointer;
    }


    /* ======================================
       Tema escuro
       ====================================== */

    body.tema-escuro
    #tarefasMedicamentosCard,
    html[data-theme="dark"]
    #tarefasMedicamentosCard {
      border-color:
        #1e40af !important;

      background:
        #172554 !important;
    }

    body.tema-escuro
    #tarefasMedicamentosCard strong,
    html[data-theme="dark"]
    #tarefasMedicamentosCard strong {
      color:
        #93c5fd !important;
    }

    body.tema-escuro
    .medicamentos-filtros,
    body.tema-escuro
    .medicamentos-secao,
    body.tema-escuro
    .medicamento-card,
    html[data-theme="dark"]
    .medicamentos-filtros,
    html[data-theme="dark"]
    .medicamentos-secao,
    html[data-theme="dark"]
    .medicamento-card {
      border-color: #334155;
      background: #111827;
    }

    body.tema-escuro
    .medicamentos-formulario,
    html[data-theme="dark"]
    .medicamentos-formulario {
      border-color: #1e40af;
      background: #172554;
    }

    body.tema-escuro
    .medicamentos-campo input,
    body.tema-escuro
    .medicamentos-campo select,
    body.tema-escuro
    .medicamentos-campo textarea,
    html[data-theme="dark"]
    .medicamentos-campo input,
    html[data-theme="dark"]
    .medicamentos-campo select,
    html[data-theme="dark"]
    .medicamentos-campo textarea {
      border-color: #475569;
      background: #0f172a;
      color: #f8fafc;
    }

    body.tema-escuro
    .medicamentos-formulario-topo > div,
    body.tema-escuro
    .medicamentos-campo label,
    body.tema-escuro
    .medicamentos-secao-topo h3,
    body.tema-escuro
    .medicamento-titulo h3,
    html[data-theme="dark"]
    .medicamentos-formulario-topo > div,
    html[data-theme="dark"]
    .medicamentos-campo label,
    html[data-theme="dark"]
    .medicamentos-secao-topo h3,
    html[data-theme="dark"]
    .medicamento-titulo h3 {
      color: #f1f5f9;
    }

    body.tema-escuro
    .medicamento-detalhe,
    body.tema-escuro
    .medicamento-observacao,
    html[data-theme="dark"]
    .medicamento-detalhe,
    html[data-theme="dark"]
    .medicamento-observacao {
      background: #0f172a;
    }

    body.tema-escuro
    .medicamento-detalhe strong,
    body.tema-escuro
    .medicamento-observacao,
    html[data-theme="dark"]
    .medicamento-detalhe strong,
    html[data-theme="dark"]
    .medicamento-observacao {
      color: #cbd5e1;
    }

    body.tema-escuro
    .medicamento-linha-pessoa,
    html[data-theme="dark"]
    .medicamento-linha-pessoa {
      color: #94a3b8;
    }

    body.tema-escuro
    .medicamento-linha-pessoa > span:first-child strong,
    html[data-theme="dark"]
    .medicamento-linha-pessoa > span:first-child strong {
      color: #e2e8f0;
    }

    body.tema-escuro
    .medicamento-observacao strong,
    html[data-theme="dark"]
    .medicamento-observacao strong {
      color: #94a3b8;
    }


    /* ======================================
       Tablet
       ====================================== */

    @media (max-width: 820px) {

      .medicamentos-grid-tres-colunas {
        grid-template-columns:
          repeat(
            2,
            minmax(0, 1fr)
          );
      }

    }


    /* ======================================
       Área estreita
       ====================================== */

    @container (max-width: 620px) {

      .medicamentos-cabecalho-superior {
        grid-template-columns:
          auto
          minmax(0, 1fr);

        align-items: center;
        gap: 10px;
      }

      .medicamentos-btn-novo {
        grid-column:
          1 / -1;

        width: 100%;
        justify-self: stretch;
        margin-top: 2px;
      }

    }


    /* ======================================
       Celular
       ====================================== */

    @media (max-width: 600px) {

      #tarefasResumo.medicamentos-instalado {
        gap: 5px !important;
      }

      #tarefasResumo.medicamentos-instalado
      .mini-card {
        min-height:
          48px !important;

        padding:
          6px 2px !important;

        border-radius:
          10px !important;
      }

      #tarefasResumo.medicamentos-instalado
      .mini-card strong {
        margin-bottom:
          1px !important;

        font-size:
          1rem !important;
      }

      #tarefasResumo.medicamentos-instalado
      .mini-card span {
        font-size:
          0.61rem !important;

        letter-spacing:
          -0.01em;
      }

      .medicamentos-screen {
        padding-bottom: 100px;
      }

      .medicamentos-cabecalho {
        padding: 11px;
      }

      .medicamentos-titulo-area h2 {
        font-size: 1.04rem;
      }

      .medicamentos-filtros {
        gap: 5px;
        margin-bottom: 10px;
        padding: 4px;
        border-radius: 13px;
      }

      .medicamentos-filtro {
        min-height: 34px;
        padding: 7px 10px;
        border-radius: 9px;
        font-size: 0.72rem;
      }

      .medicamentos-formulario {
        margin-bottom: 12px;
        padding: 13px;
        border-radius: 16px;
      }

      .medicamentos-grid-duas-colunas,
      .medicamentos-grid-tres-colunas {
        grid-template-columns:
          1fr;

        gap: 0;
      }

      .medicamentos-formulario-acoes {
        display: grid;

        grid-template-columns:
          1fr
          1fr;

        gap: 8px;
      }

      .medicamentos-btn-secundario,
      .medicamentos-btn-salvar {
        width: 100%;
        min-width: 0;
        padding-right: 8px;
        padding-left: 8px;
        font-size: 0.78rem;
      }

      .medicamentos-conteudo {
        gap: 12px;
      }

      .medicamentos-secao {
        border-radius: 16px;
      }

      .medicamentos-secao-topo {
        padding: 12px;
      }

      .medicamentos-secao-topo h3 {
        font-size: 0.9rem;
      }

      .medicamentos-secao-topo p {
        font-size: 0.7rem;
      }

      .medicamentos-lista,
      .medicamentos-historico-lista {
        gap: 9px;
        padding: 10px;
      }

      .medicamento-card {
        padding: 12px;
        border-radius: 14px;
      }

      .medicamento-card-topo-harmonico {
        grid-template-columns:
          minmax(0, 1fr)
          auto;

        gap: 7px;
      }

      .medicamento-situacao-principal {
        min-height: 22px;
        padding: 4px 7px;
        font-size: 0.59rem;
      }

      .medicamento-linha-pessoa {
        display: grid;
        justify-items: start;
        gap: 5px;
        font-size: 0.7rem;
      }

      .medicamento-detalhes-harmonicos {
        grid-template-columns:
          repeat(
            2,
            minmax(0, 1fr)
          );

        gap: 6px;
      }

      .medicamento-detalhe-principal {
        grid-column:
          1 / -1;
      }

      .medicamento-detalhes-harmonicos
      .medicamento-detalhe {
        min-height: 0;
        padding: 8px;
      }

      .medicamento-observacao {
        margin-top: 8px;
        padding: 8px;
      }

      .medicamento-observacao p {
        font-size: 0.7rem;
      }

      .medicamento-acoes {
        grid-template-columns:
          minmax(0, 1.25fr)
          minmax(0, 0.8fr)
          minmax(0, 0.8fr);

        gap: 5px;
        margin-top: 10px;
        padding-top: 9px;
      }

      .medicamento-acao {
        min-height: 34px;
        padding: 6px 4px;
        font-size: 0.63rem;
      }

      .medicamento-historico-card {
        gap: 8px;
        padding: 11px;
        border-radius: 13px;
      }

      .medicamento-historico-icone {
        width: 32px;
        height: 32px;
        font-size: 17px;
      }

      .medicamento-historico-topo {
        display: block;
      }

      .medicamento-historico-topo h3 {
        font-size: 0.85rem;
      }

      .medicamento-historico-data {
        display: inline-flex;
        margin-top: 7px;
      }

      .medicamento-historico-informacoes {
        display: grid;
        gap: 5px;
        font-size: 0.65rem;
      }

      .medicamentos-vazio {
        min-height: 130px;
        padding: 20px 13px;
      }

    }


    /* ======================================
       Celulares menores
       ====================================== */

    @media (max-width: 380px) {

      #tarefasResumo.medicamentos-instalado {
        gap: 3px !important;
      }

      #tarefasResumo.medicamentos-instalado
      .mini-card {
        min-height:
          45px !important;

        padding:
          5px 1px !important;
      }

      #tarefasResumo.medicamentos-instalado
      .mini-card strong {
        font-size:
          0.93rem !important;
      }

      #tarefasResumo.medicamentos-instalado
      .mini-card span {
        font-size:
          0.56rem !important;
      }

      .medicamento-card-topo-harmonico {
        grid-template-columns:
          minmax(0, 1fr)
          auto;
      }

      .medicamento-acoes {
        grid-template-columns:
          1fr
          1fr;
      }

      .medicamento-acao.comprou {
        grid-column:
          1 / -1;
      }

    }


    @media (prefers-reduced-motion: reduce) {

      #tarefasMedicamentosCard {
        transition: none;
      }

      #tarefasMedicamentosCard:hover {
        transform: none;
      }

    }
  `;

  document.head.appendChild(
    estilo
  );
}


// ==========================================
// Instalação da estrutura
// ==========================================

function instalarEstrutura() {
  criarEstilos();

  const indicadorCriado =
    criarIndicadorMedicamentos();

  const telaCriada =
    criarTelaMedicamentos();

  if (
    !indicadorCriado ||
    !telaCriada
  ) {
    return false;
  }

  if (!estruturaInstalada) {
    configurarEventos();

    estruturaInstalada =
      true;
  }

  return true;
}


function garantirEstrutura() {
  if (instalarEstrutura()) {
    return;
  }

  let tentativas =
    0;

  const intervalo =
    window.setInterval(
      () => {
        tentativas +=
          1;

        const instalada =
          instalarEstrutura();

        if (
          instalada ||
          tentativas >= 150
        ) {
          window.clearInterval(
            intervalo
          );

          if (!instalada) {
            console.error(
              "Medicamentos: não foi possível localizar a tela Tarefas ou main.app."
            );
          }
        }
      },
      100
    );
}


// ==========================================
// API pública
// ==========================================

window.ListaLarMedicamentos = {
  abrir:
    abrirTelaMedicamentos,

  novo() {
    abrirTelaMedicamentos();
    abrirFormulario();
  },

  obterLembretes() {
    return lembretes.map(
      (item) => ({
        ...item
      })
    );
  },

  obterHistorico() {
    return historico.map(
      (item) => ({
        ...item
      })
    );
  },

  obterQuantidadeAtencao() {
    return lembretes.filter(
      (lembrete) => {
        const situacao =
          classificarLembrete(
            lembrete
          );

        return (
          situacao ===
            "comprar-agora" ||
          situacao ===
            "em-breve"
        );
      }
    ).length;
  },

  atualizar() {
    return sincronizarContexto();
  }
};


// ==========================================
// Inicialização
// ==========================================

function iniciar() {
  garantirEstrutura();

  window.addEventListener(
    "listalar:tarefas-pronto",
    (evento) => {
      garantirEstrutura();

      sincronizarContexto(
        evento.detail ||
        null
      );
    }
  );

  onAuthStateChanged(
    auth,
    async (usuario) => {
      usuarioAtual =
        usuario ||
        null;

      if (!usuarioAtual) {
        pararListeners();

        familiaIdAtual =
          "";

        familiaNomeAtual =
          "";

        membros =
          [];

        definirVisibilidadeModulo(
          false
        );

        fecharFormulario();

        return;
      }

      garantirEstrutura();

      const sincronizado =
        await sincronizarContexto();

      if (!sincronizado) {
        aguardarContexto();
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
