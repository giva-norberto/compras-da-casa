// ==========================================
// ListaLar - Lembretes de Medicamentos
// Arquivo: tarefas-medicamentos.js
// Versão: 1.2.0
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
// Configuração
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
// Estado
// ==========================================

let usuarioAtual = null;
let familiaIdAtual = "";
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
// Utilidades
// ==========================================

const el = (id) => document.getElementById(id);


function escaparHtml(valor) {
  return String(valor ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}


function formatarNomePessoa(valor) {
  const texto = String(valor ?? "")
    .trim()
    .replace(/\s+/g, " ");

  if (!texto) {
    return "";
  }

  const conectivos = new Set([
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
    alta:
      "Alta",

    media:
      "Média",

    baixa:
      "Baixa"
  }[prioridade] ||
  "Média";
}


function pesoPrioridade(
  prioridade
) {
  return {
    alta:
      1,

    media:
      2,

    baixa:
      3
  }[prioridade] ||
  4;
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
    return "";
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
        : ""
    );

  return formatarNomePessoa(
    nome
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
// Situação automática
// ==========================================

function obterSituacaoLembrete(
  lembrete
) {
  const proximaCompra =
    isoParaData(
      lembrete.proximaCompra
    );

  if (!proximaCompra) {
    return {
      codigo:
        "programado",

      texto:
        "",

      pendente:
        false,

      dias:
        null
    };
  }

  const hoje =
    hojeSemHora();

  const dias =
    diferencaDias(
      hoje,
      proximaCompra
    );

  const diasAntes =
    normalizarNumero(
      lembrete.avisarDiasAntes,
      0,
      365,
      5
    );

  if (dias < 0) {
    const atraso =
      Math.abs(dias);

    return {
      codigo:
        "atrasado",

      texto:
        atraso === 1
          ? "Atrasado 1 dia"
          : `Atrasado ${atraso} dias`,

      pendente:
        true,

      dias
    };
  }

  if (dias === 0) {
    return {
      codigo:
        "hoje",

      texto:
        "Comprar hoje",

      pendente:
        true,

      dias
    };
  }

  if (dias <= diasAntes) {
    return {
      codigo:
        "pendente",

      texto:
        "Pendente",

      pendente:
        true,

      dias
    };
  }

  return {
    codigo:
      "programado",

    texto:
      "",

    pendente:
      false,

    dias
  };
}


function classificarLembrete(
  lembrete
) {
  const situacao =
    obterSituacaoLembrete(
      lembrete
    );

  if (
    situacao.codigo ===
      "atrasado" ||
    situacao.codigo ===
      "hoje"
  ) {
    return "comprar-agora";
  }

  if (
    situacao.codigo ===
    "pendente"
  ) {
    return "em-breve";
  }

  return "proximos";
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
      "Abrir medicamentos"
    );

    indicador.setAttribute(
      "title",
      "Abrir medicamentos"
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
      (lembrete) =>
        lembrete.ativo !== false &&
        obterSituacaoLembrete(
          lembrete
        ).pendente
    ).length;

  quantidade.textContent =
    String(
      precisamAtencao
    );

  indicador.classList.toggle(
    "tem-atencao",
    precisamAtencao > 0
  );

  indicador.setAttribute(
    "aria-label",
    precisamAtencao > 0
      ? `Abrir medicamentos. ${precisamAtencao} pendência${
          precisamAtencao === 1
            ? ""
            : "s"
        }.`
      : "Abrir medicamentos. Nenhuma pendência."
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
// Tela
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

          <h2>
            Lembretes de medicamentos
          </h2>

          <button
            id="btnNovoMedicamento"
            type="button"
            class="medicamentos-btn-novo"
          >
            Adicionar medicamento
          </button>

        </div>

      </header>


      <nav
        id="medicamentosFiltros"
        class="medicamentos-filtros"
        aria-label="Filtros dos medicamentos"
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
          data-filtro-medicamento="pendentes"
        >
          Pendentes
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

          <strong
            id="tituloFormularioMedicamento"
          >
            Adicionar medicamento
          </strong>

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
              placeholder="Digite o nome da pessoa"
              autocomplete="off"
              required
            >

            <datalist
              id="medicamentoPessoasSugestoes"
            ></datalist>

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
            rows="2"
            maxlength="500"
            placeholder="Ex.: Caixa com 30 comprimidos"
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
            Salvar medicamento
          </button>

        </div>

      </form>


      <div
        id="medicamentosConteudo"
        class="medicamentos-conteudo"
        aria-live="polite"
      ></div>

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
      "Os dados ainda estão sendo carregados.",
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
    top:
      0,

    behavior:
      "auto"
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
    top:
      0,

    behavior:
      "auto"
  });
}


// ==========================================
// Pessoas
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
      membros =
        lista;
    }
  }

  preencherPessoas();
}


function preencherPessoas() {
  const sugestoes =
    el(
      "medicamentoPessoasSugestoes"
    );

  if (!sugestoes) {
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
        usuarioAtual.email ||
        ""
    });
  }

  const nomesUnicos =
    new Map();

  pessoas
    .filter(
      (membro) =>
        membro.ativo !==
        false
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
        !nomesUnicos.has(
          chave
        )
      ) {
        nomesUnicos.set(
          chave,
          nome
        );
      }
    });

  sugestoes.innerHTML =
    [...nomesUnicos.values()]
      .sort(
        (a, b) =>
          a.localeCompare(
            b,
            "pt-BR"
          )
      )
      .map(
        (nome) =>
          `<option value="${escaparHtml(nome)}"></option>`
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
      "Adicionar medicamento";
  }

  if (botaoSalvar) {
    botaoSalvar.textContent =
      "Salvar medicamento";
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
            lembrete.avisarDiasAntes,
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
            lembrete.repeticaoDias,
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
        "Editar medicamento";
    }

    if (botaoSalvar) {
      botaoSalvar.textContent =
        "Salvar alterações";
    }
  }

  formulario.hidden =
    false;

  window.setTimeout(
    () => {
      formulario.scrollIntoView({
        behavior:
          "smooth",

        block:
          "start"
      });

      el("medicamentoNome")
        ?.focus();
    },
    50
  );
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


function validarDados(
  dados
) {
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
    dados.avisarDiasAntes <
      0 ||
    dados.avisarDiasAntes >
      365
  ) {
    return "Informe os dias de antecedência entre 0 e 365.";
  }

  if (
    dados.repeticaoDias <
      1 ||
    dados.repeticaoDias >
      3650
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
      "Aguarde o carregamento e tente novamente.",
      "warning"
    );

    return;
  }

  const dados =
    obterDadosFormulario();

  const erroValidacao =
    validarDados(
      dados
    );

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

  const editando =
    Boolean(
      lembreteEdicaoId
    );

  if (botao) {
    botao.disabled =
      true;

    botao.textContent =
      "Salvando...";
  }

  try {
    if (editando) {
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
        "Medicamento atualizado",
        "As alterações foram concluídas.",
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
        "Medicamento adicionado",
        "O medicamento foi incluído.",
        "success"
      );
    }

    fecharFormulario();
  } catch (erro) {
    console.error(
      "Erro ao salvar medicamento:",
      erro
    );

    await avisar(
      "Não foi possível salvar",
      "Tente novamente em alguns instantes.",
      "warning"
    );
  } finally {
    salvandoLembrete =
      false;

    if (botao) {
      botao.disabled =
        false;

      botao.textContent =
        editando
          ? "Salvar alterações"
          : "Salvar medicamento";
    }
  }
}


// ==========================================
// Referências de dados
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
// Excluir
// ==========================================

async function excluirLembrete(
  lembrete
) {
  const aceitou =
    await confirmar({
      titulo:
        "Excluir medicamento",

      texto:
        `Deseja excluir “${
          lembrete.medicamento ||
          "Medicamento"
        }”? O histórico existente será mantido.`,

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
      "Medicamento excluído",
      "O medicamento foi removido.",
      "success"
    );
  } catch (erro) {
    console.error(
      "Erro ao excluir medicamento:",
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
// Já comprei
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

  const novaProximaCompraIso =
    dataParaIso(
      adicionarDias(
        dataCompra,
        repeticaoDias
      )
    );

  const aceitou =
    await confirmar({
      titulo:
        "Confirmar compra",

      texto:
        `Confirmar a compra de “${
          lembrete.medicamento ||
          "Medicamento"
        }” hoje? A próxima compra será em ${
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
      writeBatch(
        db
      );

    const historicoRef =
      doc(
        colecaoHistorico()
      );

    const paraNome =
      formatarNomePessoa(
        lembrete.paraNome ||
        obterNomePessoaPorUid(
          lembrete.paraUid ||
          ""
        )
      ) ||
      "Não informado";

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

        paraNome,

        prioridade:
          lembrete.prioridade ||
          "media",

        observacao:
          lembrete.observacao ||
          "",

        repeticaoDias,

        avisarDiasAntes:
          normalizarNumero(
            lembrete.avisarDiasAntes,
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
      `Próxima compra: ${
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
      "Não foi possível concluir. Tente novamente.",
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
      const situacaoA =
        obterSituacaoLembrete(
          a
        );

      const situacaoB =
        obterSituacaoLembrete(
          b
        );

      if (
        situacaoA.pendente !==
        situacaoB.pendente
      ) {
        return situacaoA.pendente
          ? -1
          : 1;
      }

      const dataA =
        a.proximaCompra ||
        "9999-12-31";

      const dataB =
        b.proximaCompra ||
        "9999-12-31";

      const comparacaoData =
        String(
          dataA
        ).localeCompare(
          String(
            dataB
          )
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
        String(
          dataB
        ).localeCompare(
          String(
            dataA
          )
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
// Linha compacta do medicamento
// ==========================================

function criarHtmlLembrete(
  lembrete
) {
  const situacao =
    obterSituacaoLembrete(
      lembrete
    );

  const prioridade =
    lembrete.prioridade ||
    "media";

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

  const statusHtml =
    situacao.pendente
      ? `
          <span
            class="
              medicamento-status
              status-${escaparHtml(
                situacao.codigo
              )}
            "
          >
            ${escaparHtml(
              situacao.texto
            )}
          </span>
        `
      : "";

  const observacaoHtml =
    lembrete.observacao
      ? `
          <div class="medicamento-observacao">
            ${escaparHtml(
              lembrete.observacao
            )}
          </div>
        `
      : "";

  return `
    <article
      class="
        medicamento-item
        ${
          situacao.pendente
            ? "tem-pendencia"
            : ""
        }
        prioridade-${escaparHtml(
          prioridade
        )}
      "
      data-lembrete-id="${escaparHtml(
        lembrete.id
      )}"
    >

      <div class="medicamento-item-principal">

        <div class="medicamento-item-textos">

          <div class="medicamento-item-titulo">

            <strong>
              ${escaparHtml(
                lembrete.medicamento ||
                "Medicamento"
              )}
            </strong>

            ${statusHtml}

          </div>


          <div class="medicamento-item-meta">

            <span>
              Para:
              <b>
                ${escaparHtml(
                  nomePessoa
                )}
              </b>
            </span>

            <span>
              Compra:
              <b>
                ${escaparHtml(
                  formatarData(
                    lembrete.proximaCompra
                  )
                )}
              </b>
            </span>

            <span>
              Repete:
              <b>
                ${repeticaoDias}
                dia${
                  repeticaoDias === 1
                    ? ""
                    : "s"
                }
              </b>
            </span>

            <span
              class="
                medicamento-prioridade-texto
                prioridade-${escaparHtml(
                  prioridade
                )}
              "
            >
              Prioridade:
              <b>
                ${escaparHtml(
                  rotuloPrioridade(
                    prioridade
                  )
                )}
              </b>
            </span>

          </div>


          ${observacaoHtml}

        </div>


        <div class="medicamento-acoes">

          <button
            type="button"
            class="medicamento-acao comprou"
            data-acao-medicamento="comprou"
            ${
              registrando
                ? "disabled"
                : ""
            }
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
            ${
              registrando
                ? "disabled"
                : ""
            }
          >
            Editar
          </button>

          <button
            type="button"
            class="medicamento-acao excluir"
            data-acao-medicamento="excluir"
            ${
              registrando
                ? "disabled"
                : ""
            }
          >
            Excluir
          </button>

        </div>

      </div>

    </article>
  `;
}


// ==========================================
// Linha compacta do histórico
// ==========================================

function criarHtmlHistorico(
  item
) {
  const repeticaoDias =
    normalizarNumero(
      item.repeticaoDias,
      1,
      3650,
      30
    );

  return `
    <article class="medicamento-historico-item">

      <div class="medicamento-historico-titulo">

        <strong>
          ${escaparHtml(
            item.medicamento ||
            "Medicamento"
          )}
        </strong>

        <span>
          Comprado em
          ${escaparHtml(
            formatarData(
              item.dataCompra
            )
          )}
        </span>

      </div>


      <div class="medicamento-historico-meta">

        <span>
          Para:
          <b>
            ${escaparHtml(
              formatarNomePessoa(
                item.paraNome ||
                "Não informado"
              )
            )}
          </b>
        </span>

        <span>
          Próxima:
          <b>
            ${escaparHtml(
              formatarData(
                item.proximaCompraCalculada
              )
            )}
          </b>
        </span>

        <span>
          Repetição:
          <b>
            ${repeticaoDias}
            dia${
              repeticaoDias === 1
                ? ""
                : "s"
            }
          </b>
        </span>

      </div>

    </article>
  `;
}


// ==========================================
// Renderização
// ==========================================

function renderizarLembretes() {
  const area =
    el(
      "medicamentosConteudo"
    );

  if (!area) {
    return;
  }

  if (
    filtroAtual ===
    "historico"
  ) {
    const itens =
      ordenarHistorico(
        historico
      );

    area.innerHTML =
      itens.length
        ? `
            <div class="medicamentos-lista-compacta">

              ${
                itens
                  .map(
                    criarHtmlHistorico
                  )
                  .join("")
              }

            </div>
          `
        : "";

    return;
  }

  const ativos =
    lembretes.filter(
      (lembrete) =>
        lembrete.ativo !==
        false
    );

  const lista =
    filtroAtual ===
    "pendentes"
      ? ativos.filter(
          (lembrete) =>
            obterSituacaoLembrete(
              lembrete
            ).pendente
        )
      : ativos;

  const itens =
    ordenarLembretes(
      lista
    );

  area.innerHTML =
    itens.length
      ? `
          <div class="medicamentos-lista-compacta">

            ${
              itens
                .map(
                  criarHtmlLembrete
                )
                .join("")
            }

          </div>
        `
      : "";
}


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


function renderizarTudo() {
  atualizarIndicador();
  atualizarFiltros();
  renderizarLembretes();
}


// ==========================================
// Carregamento dos dados
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
          "Erro ao carregar medicamentos:",
          erro
        );

        await avisar(
          "Não foi possível carregar",
          "Atualize a tela e tente novamente.",
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
          "Erro ao carregar histórico:",
          erro
        );

        await avisar(
          "Não foi possível carregar",
          "O histórico não pôde ser exibido agora.",
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
      "Medicamentos: não foi possível obter a família.",
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

  atualizarMembrosPelaApi();

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
          tentativas >=
            120
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
// Eventos
// ==========================================

function localizarLembreteNoElemento(
  elemento
) {
  const item =
    elemento.closest(
      "[data-lembrete-id]"
    );

  if (!item) {
    return null;
  }

  return (
    lembretes.find(
      (lembrete) =>
        lembrete.id ===
        item.dataset
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

  const lembrete =
    localizarLembreteNoElemento(
      botao
    );

  if (!lembrete) {
    return;
  }

  if (
    acao ===
    "editar"
  ) {
    abrirFormulario(
      lembrete
    );

    return;
  }

  if (
    acao ===
    "excluir"
  ) {
    await excluirLembrete(
      lembrete
    );

    return;
  }

  if (
    acao ===
    "comprou"
  ) {
    await registrarCompra(
      lembrete
    );
  }
}


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
      () =>
        abrirFormulario()
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

        renderizarTudo();
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
// Estilos
// ==========================================

function criarEstilos() {
  if (el("medicamentosEstilos")) {
    return;
  }

  const estilo =
    document.createElement("style");

  estilo.id =
    "medicamentosEstilos";

  estilo.textContent = `

    /* ======================================
       Indicador Remédios na tela Tarefas
       ====================================== */

    #tarefasResumo.medicamentos-instalado {
      grid-template-columns:
        repeat(4, minmax(0, 1fr))
        !important;
    }

    #tarefasMedicamentosCard {
      appearance: none;
      -webkit-appearance: none;

      width: 100%;
      margin: 0;

      border-color:
        #93c5fd !important;

      background:
        linear-gradient(
          145deg,
          #eff6ff,
          #dbeafe
        ) !important;

      font: inherit;
      cursor: pointer;

      transition:
        transform 0.16s ease,
        box-shadow 0.16s ease,
        border-color 0.16s ease;

      -webkit-tap-highlight-color:
        transparent;
    }

    #tarefasMedicamentosCard strong {
      color:
        #2563eb !important;
    }

    #tarefasMedicamentosCard.tem-atencao {
      border-color:
        #3b82f6 !important;

      background:
        linear-gradient(
          145deg,
          #dbeafe,
          #bfdbfe
        ) !important;

      box-shadow:
        0 4px 12px
        rgba(37, 99, 235, 0.12);
    }

    #tarefasMedicamentosCard:hover {
      transform:
        translateY(-1px);

      box-shadow:
        0 7px 16px
        rgba(37, 99, 235, 0.15);
    }


    /* ======================================
       Tela
       ====================================== */

    .medicamentos-screen {
      width: 100%;
      max-width: 100%;
      padding-bottom: 110px;
    }

    .medicamentos-container {
      width: 100%;
      max-width: 1120px;

      margin:
        0 auto;

      box-sizing:
        border-box;

      container-type:
        inline-size;
    }


    /* ======================================
       Cabeçalho
       ====================================== */

    .medicamentos-cabecalho {
      margin-bottom: 9px;
      padding: 11px;

      border-radius: 15px;

      color:
        #ffffff;

      background:
        linear-gradient(
          135deg,
          #2563eb 0%,
          #3b82f6 55%,
          #06b6d4 100%
        );

      box-shadow:
        0 8px 20px
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

    .medicamentos-cabecalho h2 {
      min-width: 0;
      margin: 0;

      color:
        #ffffff;

      font-size:
        clamp(
          1rem,
          2.5vw,
          1.35rem
        );

      line-height: 1.2;
    }

    .medicamentos-btn-voltar {
      width: 38px;
      height: 38px;

      display: inline-flex;
      align-items: center;
      justify-content: center;

      border:
        1px solid
        rgba(255, 255, 255, 0.45);

      border-radius: 11px;

      background:
        rgba(255, 255, 255, 0.15);

      color:
        #ffffff;

      font: inherit;
      font-size: 29px;
      line-height: 1;

      cursor: pointer;

      transition:
        background 0.16s ease,
        transform 0.16s ease;
    }

    .medicamentos-btn-voltar:hover {
      background:
        rgba(255, 255, 255, 0.24);

      transform:
        translateX(-1px);
    }

    .medicamentos-btn-novo {
      min-height: 38px;

      padding:
        7px 12px;

      border: 0;
      border-radius: 11px;

      background:
        linear-gradient(
          135deg,
          #ffffff,
          #eff6ff
        );

      color:
        #1d4ed8;

      font: inherit;
      font-size: 0.78rem;
      font-weight: 800;

      white-space: nowrap;
      cursor: pointer;

      box-shadow:
        0 4px 12px
        rgba(30, 64, 175, 0.14);

      transition:
        transform 0.16s ease,
        box-shadow 0.16s ease;
    }

    .medicamentos-btn-novo:hover {
      transform:
        translateY(-1px);

      box-shadow:
        0 6px 15px
        rgba(30, 64, 175, 0.18);
    }


    /* ======================================
       Filtros
       ====================================== */

    .medicamentos-filtros {
      display: inline-flex;
      align-items: center;
      gap: 4px;

      margin-bottom: 10px;
      padding: 3px;

      border:
        1px solid
        #dbe4f0;

      border-radius: 11px;

      background:
        #ffffff;

      box-shadow:
        0 3px 10px
        rgba(15, 23, 42, 0.05);
    }

    .medicamentos-filtro {
      min-height: 32px;

      padding:
        6px 11px;

      border: 0;
      border-radius: 8px;

      background:
        transparent;

      color:
        #64748b;

      font: inherit;
      font-size: 0.75rem;
      font-weight: 750;

      cursor: pointer;

      transition:
        background 0.16s ease,
        color 0.16s ease,
        box-shadow 0.16s ease;
    }

    .medicamentos-filtro:hover {
      background:
        #eff6ff;

      color:
        #2563eb;
    }

    .medicamentos-filtro.ativo {
      background:
        linear-gradient(
          135deg,
          #2563eb,
          #3b82f6
        );

      color:
        #ffffff;

      box-shadow:
        0 4px 10px
        rgba(37, 99, 235, 0.22);
    }


    /* ======================================
       Formulário
       ====================================== */

    .medicamentos-formulario {
      width: 100%;

      margin-bottom: 12px;
      padding: 14px;

      border:
        1px solid
        #bfdbfe;

      border-radius: 16px;

      background:
        linear-gradient(
          145deg,
          #eff6ff,
          #f8fbff
        );

      box-shadow:
        0 7px 18px
        rgba(37, 99, 235, 0.09);

      box-sizing:
        border-box;
    }

    .medicamentos-formulario[hidden] {
      display:
        none !important;
    }

    .medicamentos-formulario-topo {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;

      margin-bottom: 11px;

      color:
        #1e293b;

      font-size: 1rem;
    }

    .medicamentos-formulario-topo strong {
      color:
        #1e40af;
    }

    .medicamentos-btn-fechar {
      width: 34px;
      height: 34px;

      display: inline-flex;
      align-items: center;
      justify-content: center;

      border: 0;
      border-radius: 10px;

      background:
        #dbeafe;

      color:
        #1e40af;

      font: inherit;
      font-size: 22px;

      cursor: pointer;
    }

    .medicamentos-btn-fechar:hover {
      background:
        #bfdbfe;
    }

    .medicamentos-grid-duas-colunas,
    .medicamentos-grid-tres-colunas {
      display: grid;
      gap: 10px;
    }

    .medicamentos-grid-duas-colunas {
      grid-template-columns:
        repeat(2, minmax(0, 1fr));
    }

    .medicamentos-grid-tres-colunas {
      grid-template-columns:
        repeat(3, minmax(0, 1fr));
    }

    .medicamentos-campo {
      min-width: 0;
      margin-bottom: 11px;
    }

    .medicamentos-campo label {
      display: block;
      margin-bottom: 5px;

      color:
        #334155;

      font-size: 0.78rem;
      font-weight: 750;
    }

    .medicamentos-campo input,
    .medicamentos-campo select,
    .medicamentos-campo textarea {
      width: 100%;
      min-height: 41px;

      padding:
        9px 11px;

      border:
        1px solid
        #cbd5e1;

      border-radius: 10px;

      background:
        #ffffff;

      color:
        #1e293b;

      font: inherit;
      font-size: 0.88rem;

      box-sizing:
        border-box;

      outline: none;

      transition:
        border-color 0.16s ease,
        box-shadow 0.16s ease;
    }

    .medicamentos-campo textarea {
      min-height: 70px;
      resize: vertical;
    }

    .medicamentos-campo input:focus,
    .medicamentos-campo select:focus,
    .medicamentos-campo textarea:focus {
      border-color:
        #3b82f6;

      box-shadow:
        0 0 0 3px
        rgba(59, 130, 246, 0.14);
    }

    .medicamentos-formulario-acoes {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
    }

    .medicamentos-btn-secundario,
    .medicamentos-btn-salvar {
      min-height: 40px;

      padding:
        8px 14px;

      border-radius: 10px;

      font: inherit;
      font-size: 0.8rem;
      font-weight: 800;

      cursor: pointer;
    }

    .medicamentos-btn-secundario {
      border:
        1px solid
        #cbd5e1;

      background:
        #ffffff;

      color:
        #475569;
    }

    .medicamentos-btn-salvar {
      border:
        1px solid
        #2563eb;

      background:
        linear-gradient(
          135deg,
          #2563eb,
          #3b82f6
        );

      color:
        #ffffff;

      box-shadow:
        0 4px 10px
        rgba(37, 99, 235, 0.18);
    }

    .medicamentos-btn-salvar:hover {
      background:
        linear-gradient(
          135deg,
          #1d4ed8,
          #2563eb
        );
    }


    /* ======================================
       Lista compacta
       ====================================== */

    .medicamentos-conteudo {
      width: 100%;
    }

    .medicamentos-lista-compacta {
      overflow: hidden;

      border:
        1px solid
        #dbe4f0;

      border-radius: 14px;

      background:
        #ffffff;

      box-shadow:
        0 8px 22px
        rgba(37, 99, 235, 0.08);
    }

    .medicamento-item,
    .medicamento-historico-item {
      position: relative;

      padding:
        11px 12px;

      border-bottom:
        1px solid
        #e2e8f0;

      background:
        #ffffff;
    }

    .medicamento-item {
      border-left:
        4px solid
        #3b82f6;

      transition:
        background 0.16s ease,
        border-color 0.16s ease,
        box-shadow 0.16s ease,
        transform 0.16s ease;
    }

    .medicamento-item:hover {
      background:
        #f8fbff;

      box-shadow:
        inset 0 0 0 1px
        rgba(59, 130, 246, 0.08);

      transform:
        translateY(-1px);
    }

    .medicamento-item:last-child,
    .medicamento-historico-item:last-child {
      border-bottom: 0;
    }


    /* Medicamento normal */

    .medicamento-item:not(.tem-pendencia) {
      background:
        linear-gradient(
          90deg,
          #f8fbff 0%,
          #ffffff 28%
        );
    }


    /* Pendente */

    .medicamento-item.tem-pendencia {
      border-left-color:
        #f59e0b;

      background:
        linear-gradient(
          90deg,
          #fffbeb 0%,
          #ffffff 32%
        );
    }


    /* Comprar hoje ou atrasado */

    .medicamento-item.tem-pendencia:has(.status-hoje),
    .medicamento-item.tem-pendencia:has(.status-atrasado) {
      border-left-color:
        #ef4444;

      background:
        linear-gradient(
          90deg,
          #fff1f2 0%,
          #ffffff 32%
        );
    }


    /* Etiquetas de situação */

    .medicamento-item.tem-pendencia
    .status-hoje,
    .medicamento-item.tem-pendencia
    .status-atrasado {
      border:
        1px solid
        #fecaca;

      background:
        #fee2e2;

      color:
        #b91c1c;

      box-shadow:
        0 2px 6px
        rgba(239, 68, 68, 0.12);
    }

    .medicamento-item.tem-pendencia
    .status-pendente {
      border:
        1px solid
        #fde68a;

      background:
        #fef3c7;

      color:
        #a16207;

      box-shadow:
        0 2px 6px
        rgba(245, 158, 11, 0.12);
    }

    .medicamento-item-principal {
      display: grid;

      grid-template-columns:
        minmax(0, 1fr)
        auto;

      align-items: center;
      gap: 12px;
    }

    .medicamento-item-textos {
      min-width: 0;
    }

    .medicamento-item-titulo {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 6px;

      min-width: 0;
    }

    .medicamento-item-titulo > strong {
      min-width: 0;

      overflow-wrap:
        anywhere;

      color:
        #0f172a;

      font-size: 0.96rem;
      font-weight: 850;
      line-height: 1.25;
    }

    .medicamento-status {
      display: inline-flex;
      align-items: center;

      min-height: 21px;

      padding:
        3px 7px;

      border-radius: 999px;

      font-size: 0.61rem;
      font-weight: 850;

      white-space: nowrap;
    }


    /* ======================================
       Informações do medicamento
       ====================================== */

    .medicamento-item-meta,
    .medicamento-historico-meta {
      display: flex;
      align-items: center;
      flex-wrap: wrap;

      gap:
        3px 10px;

      margin-top: 5px;

      color:
        #64748b;

      font-size: 0.69rem;
      line-height: 1.35;
    }

    .medicamento-item-meta b,
    .medicamento-historico-meta b {
      color:
        #334155;

      font-weight: 800;
    }

    .medicamento-item-meta span:nth-child(1) b {
      color:
        #2563eb;
    }

    .medicamento-item-meta span:nth-child(2) b {
      color:
        #0f766e;
    }

    .medicamento-item-meta span:nth-child(3) b {
      color:
        #7c3aed;
    }

    .medicamento-prioridade-texto.prioridade-alta b {
      color:
        #dc2626;
    }

    .medicamento-prioridade-texto.prioridade-media b {
      color:
        #d97706;
    }

    .medicamento-prioridade-texto.prioridade-baixa b {
      color:
        #16a34a;
    }

    .medicamento-observacao {
      margin-top: 5px;

      overflow: hidden;

      color:
        #64748b;

      font-size: 0.67rem;
      line-height: 1.35;

      text-overflow: ellipsis;
      white-space: nowrap;
    }


    /* ======================================
       Botões de ação
       ====================================== */

    .medicamento-acoes {
      display: inline-flex;
      align-items: center;
      gap: 5px;
    }

    .medicamento-acao {
      min-height: 31px;

      padding:
        6px 9px;

      border:
        1px solid
        transparent;

      border-radius: 8px;

      background:
        transparent;

      font: inherit;
      font-size: 0.68rem;
      font-weight: 800;

      cursor: pointer;
      white-space: nowrap;

      transition:
        background 0.16s ease,
        border-color 0.16s ease,
        color 0.16s ease,
        box-shadow 0.16s ease,
        transform 0.16s ease;
    }

    .medicamento-acao:hover {
      transform:
        translateY(-1px);
    }

    .medicamento-acao.comprou {
      border-color:
        #4ade80;

      background:
        linear-gradient(
          135deg,
          #dcfce7,
          #bbf7d0
        );

      color:
        #15803d;

      box-shadow:
        0 3px 9px
        rgba(34, 197, 94, 0.16);
    }

    .medicamento-acao.comprou:hover {
      border-color:
        #22c55e;

      background:
        linear-gradient(
          135deg,
          #bbf7d0,
          #86efac
        );

      box-shadow:
        0 5px 12px
        rgba(34, 197, 94, 0.2);
    }

    .medicamento-acao.editar {
      border-color:
        #bfdbfe;

      background:
        #eff6ff;

      color:
        #2563eb;
    }

    .medicamento-acao.editar:hover {
      border-color:
        #93c5fd;

      background:
        #dbeafe;
    }

    .medicamento-acao.excluir {
      border-color:
        #fecaca;

      background:
        #fff1f2;

      color:
        #b91c1c;
    }

    .medicamento-acao.excluir:hover {
      border-color:
        #fca5a5;

      background:
        #ffe4e6;
    }

    .medicamento-acao:disabled {
      opacity: 0.6;
      cursor: wait;
      transform: none;
    }


    /* ======================================
       Histórico compacto
       ====================================== */

    .medicamento-historico-item {
      border-left:
        4px solid
        #22c55e;

      background:
        linear-gradient(
          90deg,
          #f0fdf4 0%,
          #ffffff 28%
        );
    }

    .medicamento-historico-titulo {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
    }

    .medicamento-historico-titulo strong {
      min-width: 0;

      overflow-wrap:
        anywhere;

      color:
        #14532d;

      font-size: 0.88rem;
    }

    .medicamento-historico-titulo > span {
      flex:
        0 0 auto;

      padding:
        3px 7px;

      border-radius:
        999px;

      background:
        #dcfce7;

      color:
        #15803d;

      font-size: 0.65rem;
      font-weight: 800;
    }


    /* ======================================
       Foco
       ====================================== */

    .medicamentos-btn-voltar:focus-visible,
    .medicamentos-btn-novo:focus-visible,
    .medicamentos-filtro:focus-visible,
    .medicamento-acao:focus-visible,
    .medicamentos-btn-salvar:focus-visible,
    .medicamentos-btn-secundario:focus-visible,
    .medicamentos-btn-fechar:focus-visible {
      outline:
        3px solid
        rgba(37, 99, 235, 0.25);

      outline-offset: 2px;
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
        linear-gradient(
          145deg,
          #172554,
          #1e3a8a
        ) !important;
    }

    body.tema-escuro
    #tarefasMedicamentosCard strong,
    html[data-theme="dark"]
    #tarefasMedicamentosCard strong {
      color:
        #bfdbfe !important;
    }

    body.tema-escuro
    .medicamentos-filtros,
    body.tema-escuro
    .medicamentos-lista-compacta,
    body.tema-escuro
    .medicamento-item,
    body.tema-escuro
    .medicamento-historico-item,
    html[data-theme="dark"]
    .medicamentos-filtros,
    html[data-theme="dark"]
    .medicamentos-lista-compacta,
    html[data-theme="dark"]
    .medicamento-item,
    html[data-theme="dark"]
    .medicamento-historico-item {
      border-color:
        #334155;

      background:
        #111827;
    }

    body.tema-escuro
    .medicamento-item,
    html[data-theme="dark"]
    .medicamento-item {
      border-left-color:
        #60a5fa;

      background:
        linear-gradient(
          90deg,
          #172033,
          #111827
        );
    }

    body.tema-escuro
    .medicamento-item.tem-pendencia,
    html[data-theme="dark"]
    .medicamento-item.tem-pendencia {
      border-left-color:
        #f59e0b;

      background:
        linear-gradient(
          90deg,
          #29200d,
          #111827
        );
    }

    body.tema-escuro
    .medicamento-item.tem-pendencia:has(.status-hoje),
    body.tema-escuro
    .medicamento-item.tem-pendencia:has(.status-atrasado),
    html[data-theme="dark"]
    .medicamento-item.tem-pendencia:has(.status-hoje),
    html[data-theme="dark"]
    .medicamento-item.tem-pendencia:has(.status-atrasado) {
      border-left-color:
        #ef4444;

      background:
        linear-gradient(
          90deg,
          #2c1517,
          #111827
        );
    }

    body.tema-escuro
    .medicamento-historico-item,
    html[data-theme="dark"]
    .medicamento-historico-item {
      border-left-color:
        #22c55e;

      background:
        linear-gradient(
          90deg,
          #10241a,
          #111827
        );
    }

    body.tema-escuro
    .medicamentos-formulario,
    html[data-theme="dark"]
    .medicamentos-formulario {
      border-color:
        #1e40af;

      background:
        linear-gradient(
          145deg,
          #172554,
          #111827
        );
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
      border-color:
        #475569;

      background:
        #0f172a;

      color:
        #f8fafc;
    }

    body.tema-escuro
    .medicamentos-formulario-topo,
    body.tema-escuro
    .medicamentos-campo label,
    body.tema-escuro
    .medicamento-item-titulo > strong,
    body.tema-escuro
    .medicamento-historico-titulo strong,
    html[data-theme="dark"]
    .medicamentos-formulario-topo,
    html[data-theme="dark"]
    .medicamentos-campo label,
    html[data-theme="dark"]
    .medicamento-item-titulo > strong,
    html[data-theme="dark"]
    .medicamento-historico-titulo strong {
      color:
        #f1f5f9;
    }

    body.tema-escuro
    .medicamento-item-meta,
    body.tema-escuro
    .medicamento-historico-meta,
    body.tema-escuro
    .medicamento-observacao,
    html[data-theme="dark"]
    .medicamento-item-meta,
    html[data-theme="dark"]
    .medicamento-historico-meta,
    html[data-theme="dark"]
    .medicamento-observacao {
      color:
        #94a3b8;
    }

    body.tema-escuro
    .medicamento-item-meta b,
    body.tema-escuro
    .medicamento-historico-meta b,
    html[data-theme="dark"]
    .medicamento-item-meta b,
    html[data-theme="dark"]
    .medicamento-historico-meta b {
      color:
        #cbd5e1;
    }


    /* ======================================
       Área estreita
       ====================================== */

    @container (max-width: 620px) {

      .medicamentos-cabecalho-superior {
        grid-template-columns:
          auto
          minmax(0, 1fr);
      }

      .medicamentos-btn-novo {
        grid-column:
          1 / -1;

        width: 100%;
      }

    }


    /* ======================================
       Celular
       ====================================== */

    @media (max-width: 600px) {

      #tarefasResumo.medicamentos-instalado {
        gap:
          5px !important;
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
        font-size:
          1rem !important;
      }

      #tarefasResumo.medicamentos-instalado
      .mini-card span {
        font-size:
          0.61rem !important;
      }

      .medicamentos-screen {
        padding-bottom: 100px;
      }

      .medicamentos-filtros {
        width: 100%;

        display: grid;

        grid-template-columns:
          repeat(3, minmax(0, 1fr));

        box-sizing:
          border-box;
      }

      .medicamentos-filtro {
        width: 100%;
        min-width: 0;

        padding-right: 5px;
        padding-left: 5px;

        font-size: 0.7rem;
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
      }

      .medicamentos-btn-secundario,
      .medicamentos-btn-salvar {
        width: 100%;
        min-width: 0;

        padding-right: 7px;
        padding-left: 7px;
      }

      .medicamento-item-principal {
        grid-template-columns:
          1fr;

        gap: 8px;
      }

      .medicamento-acoes {
        justify-content:
          flex-start;
      }

      .medicamento-acao.comprou {
        flex:
          1 1 auto;
      }

      .medicamento-historico-titulo {
        display: block;
      }

      .medicamento-historico-titulo > span {
        display: inline-flex;
        margin-top: 4px;
      }

    }


    /* ======================================
       Celulares menores
       ====================================== */

    @media (max-width: 380px) {

      #tarefasResumo.medicamentos-instalado {
        gap:
          3px !important;
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

      .medicamento-acoes {
        display: grid;

        grid-template-columns:
          1fr
          1fr;
      }

      .medicamento-acao.comprou {
        grid-column:
          1 / -1;
      }

    }


    /* ======================================
       Redução de movimentos
       ====================================== */

    @media (prefers-reduced-motion: reduce) {

      #tarefasMedicamentosCard,
      .medicamento-item,
      .medicamento-acao,
      .medicamentos-btn-novo,
      .medicamentos-btn-voltar {
        transition: none;
      }

      #tarefasMedicamentosCard:hover,
      .medicamento-item:hover,
      .medicamento-acao:hover,
      .medicamentos-btn-novo:hover,
      .medicamentos-btn-voltar:hover {
        transform: none;
      }

    }
  `;

  document.head.appendChild(
    estilo
  );
}

// ==========================================
// Instalação
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
          tentativas >=
            150
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
      (lembrete) =>
        lembrete.ativo !==
          false &&
        obterSituacaoLembrete(
          lembrete
        ).pendente
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
      once:
        true
    }
  );
} else {
  iniciar();
}
