// ============================================================
// ListaLar - lista-audio.js
// Entrada por voz para Lista de Compras e Estoque
//
// No final do index.html, antes de </body>, carregue:
// <script type="module" src="./lista-audio.js"></script>
// ============================================================

import { obterUnidadePadrao } from "./unidades-produtos.js";

import {
  getApp,
  getApps
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";

import {
  getAuth,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
  getFirestore,
  collection,
  doc,
  addDoc,
  setDoc,
  getDoc,
  getDocs,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const ReconhecimentoVoz =
  window.SpeechRecognition ||
  window.webkitSpeechRecognition ||
  null;

const estado = {
  modo: "lista",
  reconhecimento: null,
  ouvindo: false
};

const UNIDADES = [
  { valor: "un", nome: "Unidade" },
  { valor: "kg", nome: "Quilograma (kg)" },
  { valor: "g", nome: "Grama (g)" },
  { valor: "L", nome: "Litro (L)" },
  { valor: "ml", nome: "Mililitro (ml)" },
  { valor: "pct", nome: "Pacote" },
  { valor: "cx", nome: "Caixa" },
  { valor: "bdj", nome: "Bandeja" },
  { valor: "mç", nome: "Maço" },
  { valor: "lata", nome: "Lata" },
  { valor: "vd", nome: "Vidro/Pote" }
];

const ALIASES_UNIDADE = [
  {
    regex: /\b(quilo|quilos|quilograma|quilogramas|kg)\b/i,
    valor: "kg"
  },
  {
    regex: /\b(grama|gramas)\b/i,
    valor: "g"
  },
  {
    regex: /\b(litro|litros)\b/i,
    valor: "L"
  },
  {
    regex: /\b(mililitro|mililitros|ml)\b/i,
    valor: "ml"
  },
  {
    regex: /\b(pacote|pacotes|pct)\b/i,
    valor: "pct"
  },
  {
    regex: /\b(caixa|caixas|cx)\b/i,
    valor: "cx"
  },
  {
    regex: /\b(bandeja|bandejas)\b/i,
    valor: "bdj"
  },
  {
    regex: /\b(maço|maços|maco|macos)\b/i,
    valor: "mç"
  },
  {
    regex: /\b(lata|latas)\b/i,
    valor: "lata"
  },
  {
    regex: /\b(vidro|vidros|pote|potes)\b/i,
    valor: "vd"
  },
  {
    regex: /\b(unidade|unidades|un)\b/i,
    valor: "un"
  }
];

const NUMEROS = new Map([
  ["zero", 0],
  ["um", 1],
  ["uma", 1],
  ["dois", 2],
  ["duas", 2],
  ["tres", 3],
  ["quatro", 4],
  ["cinco", 5],
  ["seis", 6],
  ["sete", 7],
  ["oito", 8],
  ["nove", 9],
  ["dez", 10],
  ["onze", 11],
  ["doze", 12],
  ["treze", 13],
  ["quatorze", 14],
  ["catorze", 14],
  ["quinze", 15],
  ["dezesseis", 16],
  ["dezessete", 17],
  ["dezoito", 18],
  ["dezenove", 19],
  ["vinte", 20],
  ["trinta", 30],
  ["quarenta", 40],
  ["cinquenta", 50],
  ["sessenta", 60],
  ["setenta", 70],
  ["oitenta", 80],
  ["noventa", 90],
  ["cem", 100]
]);

function normalizar(texto) {
  return String(texto || "")
    .trim()
    .toLocaleLowerCase("pt-BR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N},.\s-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function numeroSeguro(valor, padrao = 0) {
  const numero = Number(String(valor ?? "").replace(",", "."));
  return Number.isFinite(numero) ? numero : padrao;
}

function formatarProduto(nome) {
  const texto = String(nome || "")
    .replace(/\s+/g, " ")
    .replace(/^[,.;:\-\s]+|[,.;:\-\s]+$/g, "")
    .trim();

  if (!texto) {
    return "";
  }

  return (
    texto.charAt(0).toLocaleUpperCase("pt-BR") +
    texto.slice(1)
  );
}

function localizarNumero(texto) {
  const original = String(texto || "");
  const limpo = normalizar(original);

  const meiaDuzia = limpo.match(/\bmeia duzia\b/);

  if (meiaDuzia) {
    return {
      valor: 6,
      trecho: meiaDuzia[0]
    };
  }

  const duzia = limpo.match(/\b(uma duzia|duzia)\b/);

  if (duzia) {
    return {
      valor: 12,
      trecho: duzia[0]
    };
  }

  const digitado = original.match(/\b\d+(?:[.,]\d+)?\b/);

  if (digitado) {
    return {
      valor: numeroSeguro(digitado[0], null),
      trecho: digitado[0]
    };
  }

  const palavras = limpo.split(/\s+/);

  for (let i = 0; i < palavras.length; i += 1) {
    if (!NUMEROS.has(palavras[i])) {
      continue;
    }

    let valor = NUMEROS.get(palavras[i]);
    let trecho = palavras[i];

    if (
      palavras[i + 1] === "e" &&
      NUMEROS.has(palavras[i + 2])
    ) {
      valor += NUMEROS.get(palavras[i + 2]);
      trecho += ` e ${palavras[i + 2]}`;
    }

    return {
      valor,
      trecho
    };
  }

  return null;
}

function localizarUnidade(texto) {
  for (const item of ALIASES_UNIDADE) {
    const resultado = String(texto || "").match(item.regex);

    if (resultado) {
      return {
        valor: item.valor,
        trecho: resultado[0]
      };
    }
  }

  return null;
}

function detectarModo(texto, modoPadrao) {
  const limpo = normalizar(texto);

  if (
    /\b(estoque|inventario|tenho|temos|em casa|disponivel)\b/.test(
      limpo
    )
  ) {
    return "estoque";
  }

  if (
    /\b(lista|comprar|compras|mercado|supermercado)\b/.test(
      limpo
    )
  ) {
    return "lista";
  }

  return modoPadrao === "estoque" ? "estoque" : "lista";
}

function extrairMinimo(texto) {
  const resultado = String(texto || "").match(
    /\b(?:estoque\s+)?m[ií]nimo(?:\s+de|\s+igual\s+a)?\s+([^,.;]+)/i
  );

  if (!resultado) {
    return null;
  }

  const numero = localizarNumero(resultado[1]);

  if (!numero) {
    return null;
  }

  return {
    valor: Math.max(0, numero.valor),
    trecho: resultado[0]
  };
}

function removerTrecho(texto, trecho) {
  if (!trecho) {
    return texto;
  }

  const seguro = String(trecho).replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&"
  );

  return String(texto).replace(
    new RegExp(seguro, "i"),
    " "
  );
}

function limparNomeProduto(texto) {
  let produto = String(texto || "");

  const remover = [
    /\b(adicionar|adicione|colocar|coloque|incluir|inclua)\b/gi,
    /\b(registrar|registre|atualizar|atualize|criar|crie)\b/gi,
    /\b(eu\s+)?tenho\b/gi,
    /\b(na|no|para a|para o|pra a|pra o)\s+(minha\s+)?lista\b/gi,
    /\b(na|no|para a|para o|pra a|pra o)\s+(meu\s+)?estoque\b/gi,
    /\b(lista de compras|lista|estoque|inventario)\b/gi,
    /\b(compras|compra|mercado|supermercado)\b/gi,
    /\b(quantidade|qtd|atual|disponivel)\b/gi
  ];

  for (const expressao of remover) {
    produto = produto.replace(expressao, " ");
  }

  produto = produto
    .replace(/^\s*(de|do|da|dos|das)\b/gi, " ")
    .replace(/\b(de|do|da|dos|das)\s*$/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

  return formatarProduto(produto);
}

function interpretarComando(
  texto,
  modoPadrao = "lista"
) {
  const original = String(texto || "").trim();

  if (!original) {
    throw new Error("COMANDO_VAZIO");
  }

  const modo = detectarModo(original, modoPadrao);
  const minimo = extrairMinimo(original);

  let restante = original;

  if (minimo) {
    restante = removerTrecho(
      restante,
      minimo.trecho
    );
  }

  const quantidade = localizarNumero(restante);
  const unidade = localizarUnidade(restante);

  if (quantidade) {
    restante = removerTrecho(
      restante,
      quantidade.trecho
    );
  }

  if (unidade) {
    restante = removerTrecho(
      restante,
      unidade.trecho
    );
  }

  const produto = limparNomeProduto(restante);

  if (!produto) {
    throw new Error("PRODUTO_NAO_IDENTIFICADO");
  }

  return {
    modo,
    produto,
    quantidade: Math.max(
      0,
      quantidade?.valor ??
        (modo === "lista" ? 1 : 0)
    ),
    unidade:
      unidade?.valor ||
      obterUnidadePadrao(produto) ||
      "un",
    minimo: minimo?.valor ?? null
  };
}

function elemento(id) {
  return document.getElementById(id);
}

function criarEstilos() {
  if (elemento("listalar-audio-css")) {
    return;
  }

  const style = document.createElement("style");

  style.id = "listalar-audio-css";

  style.textContent = `
    .listalar-audio-botao {
      width: 100%;
      margin-top: 9px;
      padding: 13px 14px;
      border: 0;
      border-radius: 14px;
      background: linear-gradient(
        135deg,
        #2563eb,
        #06b6d4
      );
      color: #fff;
      font-size: 15px;
      font-weight: 900;
      cursor: pointer;
      box-shadow:
        0 8px 18px rgba(37, 99, 235, .18);
    }

    .listalar-audio-fundo {
      position: fixed;
      inset: 0;
      z-index: 99999;
      display: none;
      align-items: center;
      justify-content: center;
      padding: 16px;
      background: rgba(15, 23, 42, .62);
      backdrop-filter: blur(5px);
    }

    .listalar-audio-fundo.aberto {
      display: flex;
    }

    .listalar-audio-modal {
      width: min(100%, 480px);
      max-height: calc(100vh - 32px);
      overflow-y: auto;
      padding: 18px;
      border-radius: 22px;
      background: #fff;
      color: #172033;
      box-shadow:
        0 24px 60px rgba(15, 23, 42, .3);
    }

    .listalar-audio-topo {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 12px;
    }

    .listalar-audio-topo h2 {
      margin: 0;
      font-size: 21px;
      font-weight: 900;
    }

    .listalar-audio-topo p {
      margin: 4px 0 0;
      color: #64748b;
      font-size: 12px;
      font-weight: 700;
      line-height: 1.4;
    }

    .listalar-audio-fechar {
      width: 38px;
      height: 38px;
      flex: 0 0 auto;
      border: 0;
      border-radius: 12px;
      background: #eef2ff;
      color: #334155;
      font-size: 22px;
      font-weight: 900;
      cursor: pointer;
    }

    .listalar-audio-ouvir {
      width: 100%;
      min-height: 58px;
      margin-bottom: 10px;
      border: 0;
      border-radius: 16px;
      background: linear-gradient(
        135deg,
        #2563eb,
        #06b6d4
      );
      color: #fff;
      font-size: 17px;
      font-weight: 900;
      cursor: pointer;
    }

    .listalar-audio-ouvir.ouvindo {
      background: linear-gradient(
        135deg,
        #dc2626,
        #f97316
      );
      animation: listalarAudioPulso 1.1s infinite;
    }

    @keyframes listalarAudioPulso {
      0%,
      100% {
        transform: scale(1);
      }

      50% {
        transform: scale(1.015);
      }
    }

    .listalar-audio-status {
      margin-bottom: 10px;
      padding: 10px 12px;
      border-radius: 14px;
      background: #eff6ff;
      color: #1d4ed8;
      font-size: 12px;
      font-weight: 800;
      line-height: 1.4;
    }

    .listalar-audio-comando {
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 8px;
      margin-bottom: 12px;
    }

    .listalar-audio-comando input,
    .listalar-audio-campo input,
    .listalar-audio-campo select {
      width: 100%;
      min-width: 0;
      padding: 12px 10px;
      border: 2px solid #dbeafe;
      border-radius: 13px;
      background: #fff;
      color: #172033;
      font-size: 15px;
      font-weight: 800;
      outline: none;
      box-sizing: border-box;
    }

    .listalar-audio-comando input:focus,
    .listalar-audio-campo input:focus,
    .listalar-audio-campo select:focus {
      border-color: #2563eb;
    }

    .listalar-audio-interpretar {
      padding: 0 14px;
      border: 0;
      border-radius: 13px;
      background: #e0e7ff;
      color: #3730a3;
      font-weight: 900;
      cursor: pointer;
    }

    .listalar-audio-grade {
      display: grid;
      grid-template-columns: 1fr 115px;
      gap: 9px;
      padding: 12px;
      border: 1px solid #dbeafe;
      border-radius: 16px;
      background: #f8fafc;
    }

    .listalar-audio-campo-produto {
      grid-column: 1 / -1;
    }

    .listalar-audio-campo label {
      display: block;
      margin-bottom: 5px;
      color: #64748b;
      font-size: 11px;
      font-weight: 900;
    }

    .listalar-audio-minimo.oculto {
      display: none;
    }

    .listalar-audio-acoes {
      display: grid;
      grid-template-columns: 1fr 1.4fr;
      gap: 8px;
      margin-top: 13px;
    }

    .listalar-audio-acoes button {
      padding: 14px 10px;
      border: 0;
      border-radius: 14px;
      font-size: 15px;
      font-weight: 900;
      cursor: pointer;
    }

    .listalar-audio-cancelar {
      background: #fee2e2;
      color: #b91c1c;
    }

    .listalar-audio-salvar {
      background: #16a34a;
      color: #fff;
    }

    .listalar-audio-salvar:disabled {
      opacity: .55;
      cursor: not-allowed;
    }

    @media (max-width: 390px) {
      .listalar-audio-grade,
      .listalar-audio-comando {
        grid-template-columns: 1fr;
      }

      .listalar-audio-campo-produto {
        grid-column: auto;
      }

      .listalar-audio-interpretar {
        min-height: 44px;
      }
    }
  `;

  document.head.appendChild(style);
}

function criarModal() {
  if (elemento("listalarAudioFundo")) {
    return;
  }

  const fundo = document.createElement("div");

  fundo.id = "listalarAudioFundo";
  fundo.className = "listalar-audio-fundo";

  fundo.innerHTML = `
    <div class="listalar-audio-modal">
      <div class="listalar-audio-topo">
        <div>
          <h2 id="listalarAudioTitulo">
            Adicionar por áudio
          </h2>

          <p id="listalarAudioDescricao">
            Fale o produto e a quantidade.
          </p>
        </div>

        <button
          id="listalarAudioFechar"
          class="listalar-audio-fechar"
          type="button"
          aria-label="Fechar"
        >
          ×
        </button>
      </div>

      <button
        id="listalarAudioOuvir"
        class="listalar-audio-ouvir"
        type="button"
      >
        🎤 Falar agora
      </button>

      <div
        id="listalarAudioStatus"
        class="listalar-audio-status"
      >
        Exemplo: “Adicionar dois litros de leite na lista”.
      </div>

      <div class="listalar-audio-comando">
        <input
          id="listalarAudioTexto"
          type="text"
          autocomplete="off"
          placeholder="Ou digite o comando aqui"
        >

        <button
          id="listalarAudioInterpretar"
          class="listalar-audio-interpretar"
          type="button"
        >
          Interpretar
        </button>
      </div>

      <div class="listalar-audio-grade">
        <div
          class="
            listalar-audio-campo
            listalar-audio-campo-produto
          "
        >
          <label for="listalarAudioProduto">
            Produto
          </label>

          <input
            id="listalarAudioProduto"
            type="text"
            autocomplete="off"
            placeholder="Nome do produto"
          >
        </div>

        <div class="listalar-audio-campo">
          <label for="listalarAudioQuantidade">
            Quantidade
          </label>

          <input
            id="listalarAudioQuantidade"
            type="number"
            min="0"
            step="0.1"
            value="1"
          >
        </div>

        <div class="listalar-audio-campo">
          <label for="listalarAudioUnidade">
            Unidade
          </label>

          <select id="listalarAudioUnidade">
            ${UNIDADES.map(
              (unidade) => `
                <option value="${unidade.valor}">
                  ${unidade.nome}
                </option>
              `
            ).join("")}
          </select>
        </div>

        <div
          id="listalarAudioMinimoCampo"
          class="
            listalar-audio-campo
            listalar-audio-minimo
            oculto
          "
        >
          <label for="listalarAudioMinimo">
            Estoque mínimo
          </label>

          <input
            id="listalarAudioMinimo"
            type="number"
            min="0"
            step="0.1"
            placeholder="Manter atual"
          >
        </div>
      </div>

      <div class="listalar-audio-acoes">
        <button
          id="listalarAudioCancelar"
          class="listalar-audio-cancelar"
          type="button"
        >
          Cancelar
        </button>

        <button
          id="listalarAudioSalvar"
          class="listalar-audio-salvar"
          type="button"
        >
          Salvar
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(fundo);

  elemento("listalarAudioFechar").addEventListener(
    "click",
    fecharModal
  );

  elemento("listalarAudioCancelar").addEventListener(
    "click",
    fecharModal
  );

  elemento("listalarAudioOuvir").addEventListener(
    "click",
    iniciarReconhecimento
  );

  elemento("listalarAudioInterpretar").addEventListener(
    "click",
    interpretarCampo
  );

  elemento("listalarAudioSalvar").addEventListener(
    "click",
    salvar
  );

  elemento("listalarAudioTexto").addEventListener(
    "keydown",
    (evento) => {
      if (evento.key === "Enter") {
        evento.preventDefault();
        interpretarCampo();
      }
    }
  );

  fundo.addEventListener("click", (evento) => {
    if (evento.target === fundo) {
      fecharModal();
    }
  });
}

function mostrarStatus(
  texto,
  tipo = "info"
) {
  const status = elemento("listalarAudioStatus");

  if (!status) {
    return;
  }

  const estilos = {
    info: ["#eff6ff", "#1d4ed8"],
    sucesso: ["#dcfce7", "#166534"],
    alerta: ["#fef3c7", "#92400e"],
    erro: ["#fee2e2", "#b91c1c"]
  };

  const [fundo, cor] =
    estilos[tipo] || estilos.info;

  status.textContent = texto;
  status.style.background = fundo;
  status.style.color = cor;
}

function atualizarModal() {
  const estoque = estado.modo === "estoque";

  elemento("listalarAudioTitulo").textContent =
    estoque
      ? "Atualizar estoque por áudio"
      : "Adicionar à lista por áudio";

  elemento("listalarAudioDescricao").textContent =
    estoque
      ? "Informe o produto e a quantidade disponível."
      : "Informe o produto e a quantidade que deseja comprar.";

  elemento("listalarAudioSalvar").textContent =
    estoque
      ? "Salvar no estoque"
      : "Adicionar à lista";

  elemento(
    "listalarAudioMinimoCampo"
  ).classList.toggle(
    "oculto",
    !estoque
  );

  mostrarStatus(
    estoque
      ? "Exemplo: “Tenho cinco quilos de arroz, estoque mínimo dois”."
      : "Exemplo: “Adicionar dois litros de leite na lista”."
  );
}

function limparFormulario() {
  elemento("listalarAudioTexto").value = "";
  elemento("listalarAudioProduto").value = "";

  elemento("listalarAudioQuantidade").value =
    estado.modo === "lista" ? "1" : "0";

  elemento("listalarAudioUnidade").value = "un";
  elemento("listalarAudioMinimo").value = "";
}

function abrirModal(modo = "lista") {
  criarEstilos();
  criarModal();

  estado.modo =
    modo === "estoque" ? "estoque" : "lista";

  pararReconhecimento();
  limparFormulario();
  atualizarModal();

  elemento("listalarAudioFundo").classList.add(
    "aberto"
  );

  setTimeout(() => {
    elemento("listalarAudioOuvir")?.focus();
  }, 0);
}

function fecharModal() {
  pararReconhecimento();

  elemento(
    "listalarAudioFundo"
  )?.classList.remove("aberto");
}

function atualizarBotaoMicrofone(ouvindo) {
  estado.ouvindo = ouvindo;

  const botao = elemento("listalarAudioOuvir");

  if (!botao) {
    return;
  }

  botao.classList.toggle(
    "ouvindo",
    ouvindo
  );

  botao.textContent = ouvindo
    ? "🔴 Ouvindo... fale agora"
    : "🎤 Falar agora";
}

function pararReconhecimento() {
  if (
    estado.reconhecimento &&
    estado.ouvindo
  ) {
    try {
      estado.reconhecimento.stop();
    } catch {
      // O navegador já encerrou o reconhecimento.
    }
  }

  atualizarBotaoMicrofone(false);
}

function iniciarReconhecimento() {
  if (!ReconhecimentoVoz) {
    mostrarStatus(
      "Este navegador não possui reconhecimento de voz. Digite o comando abaixo.",
      "alerta"
    );

    elemento("listalarAudioTexto")?.focus();
    return;
  }

  pararReconhecimento();

  const reconhecimento =
    new ReconhecimentoVoz();

  estado.reconhecimento = reconhecimento;

  reconhecimento.lang = "pt-BR";
  reconhecimento.continuous = false;
  reconhecimento.interimResults = false;
  reconhecimento.maxAlternatives = 3;

  reconhecimento.onstart = () => {
    atualizarBotaoMicrofone(true);

    mostrarStatus(
      "Estou ouvindo. Fale o produto e a quantidade.",
      "alerta"
    );
  };

  reconhecimento.onresult = (evento) => {
    const alternativas = Array.from(
      evento.results?.[0] || []
    );

    const melhor = alternativas.sort(
      (a, b) =>
        (b.confidence || 0) -
        (a.confidence || 0)
    )[0];

    const texto = String(
      melhor?.transcript || ""
    ).trim();

    if (!texto) {
      mostrarStatus(
        "Não consegui entender. Tente novamente.",
        "erro"
      );
      return;
    }

    elemento("listalarAudioTexto").value =
      texto;

    interpretarEPreencher(texto);
  };

  reconhecimento.onerror = (evento) => {
    atualizarBotaoMicrofone(false);

    const mensagens = {
      "not-allowed":
        "O acesso ao microfone foi bloqueado. Libere a permissão no navegador.",

      "service-not-allowed":
        "O serviço de voz não está permitido neste navegador.",

      "no-speech":
        "Nenhuma fala foi identificada. Tente novamente.",

      "audio-capture":
        "Não foi possível acessar o microfone.",

      network:
        "O reconhecimento de voz encontrou um problema de conexão."
    };

    mostrarStatus(
      mensagens[evento.error] ||
        "Não foi possível reconhecer a fala.",
      "erro"
    );
  };

  reconhecimento.onend = () => {
    atualizarBotaoMicrofone(false);
  };

  try {
    reconhecimento.start();
  } catch (erro) {
    console.error(
      "ListaLar Áudio: erro ao iniciar o microfone:",
      erro
    );

    atualizarBotaoMicrofone(false);

    mostrarStatus(
      "Não foi possível iniciar o microfone.",
      "erro"
    );
  }
}

function preencherFormulario(resultado) {
  estado.modo = resultado.modo;

  atualizarModal();

  elemento("listalarAudioProduto").value =
    resultado.produto;

  elemento("listalarAudioQuantidade").value =
    String(resultado.quantidade);

  elemento("listalarAudioUnidade").value =
    UNIDADES.some(
      (item) =>
        item.valor === resultado.unidade
    )
      ? resultado.unidade
      : "un";

  elemento("listalarAudioMinimo").value =
    resultado.minimo === null
      ? ""
      : String(resultado.minimo);

  const destino =
    resultado.modo === "estoque"
      ? "estoque"
      : "lista de compras";

  mostrarStatus(
    `Entendi: ${resultado.quantidade} ${resultado.unidade} de ${resultado.produto} para ${destino}. Revise antes de salvar.`,
    "sucesso"
  );
}

function interpretarEPreencher(texto) {
  try {
    preencherFormulario(
      interpretarComando(
        texto,
        estado.modo
      )
    );
  } catch (erro) {
    if (erro.message === "COMANDO_VAZIO") {
      mostrarStatus(
        "Fale ou digite um comando antes de interpretar.",
        "alerta"
      );
      return;
    }

    if (
      erro.message ===
      "PRODUTO_NAO_IDENTIFICADO"
    ) {
      mostrarStatus(
        "Não consegui identificar o produto. Tente novamente.",
        "erro"
      );
      return;
    }

    console.error(
      "ListaLar Áudio: erro ao interpretar:",
      erro
    );

    mostrarStatus(
      "Não foi possível interpretar o comando.",
      "erro"
    );
  }
}

function interpretarCampo() {
  interpretarEPreencher(
    elemento("listalarAudioTexto")?.value ||
      ""
  );
}

async function aguardarFirebase(
  limiteMs = 8000
) {
  const inicio = Date.now();

  while (Date.now() - inicio < limiteMs) {
    if (getApps().length > 0) {
      return getApp();
    }

    await new Promise((resolve) => {
      setTimeout(resolve, 80);
    });
  }

  throw new Error(
    "FIREBASE_NAO_INICIALIZADO"
  );
}

async function aguardarUsuario(
  auth,
  limiteMs = 8000
) {
  if (auth.currentUser) {
    return auth.currentUser;
  }

  return new Promise(
    (resolve, reject) => {
      let finalizado = false;
      let cancelar = () => {};

      const limite = setTimeout(() => {
        if (finalizado) {
          return;
        }

        finalizado = true;
        cancelar();

        reject(
          new Error(
            "USUARIO_NAO_AUTENTICADO"
          )
        );
      }, limiteMs);

      cancelar = onAuthStateChanged(
        auth,
        (usuario) => {
          if (
            finalizado ||
            !usuario
          ) {
            return;
          }

          finalizado = true;

          clearTimeout(limite);
          cancelar();
          resolve(usuario);
        },
        (erro) => {
          if (finalizado) {
            return;
          }

          finalizado = true;

          clearTimeout(limite);
          cancelar();
          reject(erro);
        }
      );
    }
  );
}

async function obterContextoFirebase() {
  const app = await aguardarFirebase();
  const auth = getAuth(app);
  const db = getFirestore(app);
  const usuario = await aguardarUsuario(auth);

  const usuarioSnap = await getDoc(
    doc(
      db,
      "usuarios",
      usuario.uid
    )
  );

  if (!usuarioSnap.exists()) {
    throw new Error(
      "USUARIO_SEM_CADASTRO"
    );
  }

  const familiaId =
    usuarioSnap.data()?.familiaId;

  if (!familiaId) {
    throw new Error(
      "FAMILIA_NAO_IDENTIFICADA"
    );
  }

  return {
    db,
    usuario,
    familiaId,

    produtosRef: collection(
      db,
      "familias",
      familiaId,
      "produtos"
    )
  };
}

async function encontrarProduto(
  produtosRef,
  nome
) {
  const nomeNormalizado =
    normalizar(nome);

  const produtosSnap =
    await getDocs(produtosRef);

  let encontrado = null;

  produtosSnap.forEach(
    (produtoDoc) => {
      if (encontrado) {
        return;
      }

      const dados =
        produtoDoc.data();

      if (
        normalizar(dados?.nome) ===
        nomeNormalizado
      ) {
        encontrado = {
          id: produtoDoc.id,
          ...dados
        };
      }
    }
  );

  return encontrado;
}

async function salvarNaLista(
  contexto,
  dados
) {
  const existente =
    await encontrarProduto(
      contexto.produtosRef,
      dados.produto
    );

  const quantidade = Math.max(
    1,
    numeroSeguro(
      dados.quantidade,
      1
    )
  );

  const unidade =
    dados.unidade ||
    existente?.unidade ||
    obterUnidadePadrao(
      dados.produto
    ) ||
    "un";

  if (existente) {
    await setDoc(
      doc(
        contexto.produtosRef,
        existente.id
      ),
      {
        unidade,
        manualLista: true,
        qtdManual: quantidade,
        qtdComprada: quantidade,
        comprado: false,
        atualizadoEm:
          serverTimestamp()
      },
      {
        merge: true
      }
    );

    return {
      nome:
        existente.nome ||
        dados.produto,

      quantidade,
      unidade
    };
  }

  await addDoc(
    contexto.produtosRef,
    {
      nome: dados.produto,
      unidade,
      estoque: 0,
      minimo: 0,
      comprado: false,
      qtdComprada: quantidade,
      qtdManual: quantidade,
      manualLista: true,
      listaAutomatica: false,
      historico: 0,
      criadoEm:
        serverTimestamp(),
      atualizadoEm:
        serverTimestamp()
    }
  );

  return {
    nome: dados.produto,
    quantidade,
    unidade
  };
}

async function salvarNoEstoque(
  contexto,
  dados
) {
  const existente =
    await encontrarProduto(
      contexto.produtosRef,
      dados.produto
    );

  const quantidade = Math.max(
    0,
    numeroSeguro(
      dados.quantidade,
      0
    )
  );

  const minimo =
    dados.minimo === null ||
    dados.minimo === undefined ||
    dados.minimo === ""
      ? null
      : Math.max(
          0,
          numeroSeguro(
            dados.minimo,
            0
          )
        );

  const unidade =
    dados.unidade ||
    existente?.unidade ||
    obterUnidadePadrao(
      dados.produto
    ) ||
    "un";

  if (existente) {
    const atualizacao = {
      nome:
        existente.nome ||
        dados.produto,

      unidade,
      estoque: quantidade,
      atualizadoEm:
        serverTimestamp()
    };

    if (minimo !== null) {
      atualizacao.minimo =
        minimo;
    }

    await setDoc(
      doc(
        contexto.produtosRef,
        existente.id
      ),
      atualizacao,
      {
        merge: true
      }
    );

    return {
      nome:
        existente.nome ||
        dados.produto,

      quantidade,
      unidade
    };
  }

  await addDoc(
    contexto.produtosRef,
    {
      nome: dados.produto,
      unidade,
      estoque: quantidade,
      minimo: minimo ?? 1,
      comprado: false,
      qtdComprada: 0,
      qtdManual: 0,
      manualLista: false,
      listaAutomatica: false,
      historico: 0,
      criadoEm:
        serverTimestamp(),
      atualizadoEm:
        serverTimestamp()
    }
  );

  return {
    nome: dados.produto,
    quantidade,
    unidade
  };
}

async function exibirMensagem({
  titulo,
  texto,
  tipo = "info"
}) {
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

function lerFormulario() {
  const produto = formatarProduto(
    elemento(
      "listalarAudioProduto"
    )?.value
  );

  if (!produto) {
    throw new Error(
      "PRODUTO_NAO_INFORMADO"
    );
  }

  const quantidade = numeroSeguro(
    elemento(
      "listalarAudioQuantidade"
    )?.value,

    estado.modo === "lista"
      ? 1
      : 0
  );

  const unidade =
    elemento(
      "listalarAudioUnidade"
    )?.value ||
    obterUnidadePadrao(produto) ||
    "un";

  const minimoTexto =
    elemento(
      "listalarAudioMinimo"
    )?.value ?? "";

  return {
    modo: estado.modo,
    produto,

    quantidade:
      estado.modo === "lista"
        ? Math.max(
            1,
            quantidade
          )
        : Math.max(
            0,
            quantidade
          ),

    unidade,

    minimo:
      minimoTexto === ""
        ? null
        : Math.max(
            0,
            numeroSeguro(
              minimoTexto,
              0
            )
          )
  };
}

async function salvar() {
  const botao = elemento(
    "listalarAudioSalvar"
  );

  try {
    const dados =
      lerFormulario();

    botao.disabled = true;
    botao.textContent =
      "Salvando...";

    mostrarStatus(
      "Salvando os dados da família...",
      "info"
    );

    const contexto =
      await obterContextoFirebase();

    const resultado =
      dados.modo === "estoque"
        ? await salvarNoEstoque(
            contexto,
            dados
          )
        : await salvarNaLista(
            contexto,
            dados
          );

    fecharModal();

    if (
      typeof window.abrirTela ===
      "function"
    ) {
      await window.abrirTela(
        dados.modo === "estoque"
          ? "estoque"
          : "lista"
      );
    }

    const destino =
      dados.modo === "estoque"
        ? "estoque"
        : "lista de compras";

    await exibirMensagem({
      titulo:
        dados.modo === "estoque"
          ? "Estoque atualizado"
          : "Item adicionado",

      texto:
        `${resultado.nome}: ` +
        `${resultado.quantidade} ` +
        `${resultado.unidade} ` +
        `salvo no ${destino}.`,

      tipo: "success"
    });
  } catch (erro) {
    console.error(
      "ListaLar Áudio: erro ao salvar:",
      erro
    );

    const mensagens = {
      PRODUTO_NAO_INFORMADO:
        "Informe o nome do produto.",

      FIREBASE_NAO_INICIALIZADO:
        "O ListaLar ainda não terminou de carregar.",

      USUARIO_NAO_AUTENTICADO:
        "Entre com sua conta Google antes de usar o áudio.",

      USUARIO_SEM_CADASTRO:
        "Não foi possível localizar o cadastro do usuário.",

      FAMILIA_NAO_IDENTIFICADA:
        "Não foi possível identificar a família.",

      "permission-denied":
        "Sua conta não tem permissão para alterar esta família."
    };

    const texto =
      mensagens[erro.message] ||
      mensagens[erro.code] ||
      "Não foi possível salvar o produto.";

    mostrarStatus(
      texto,
      "erro"
    );

    await exibirMensagem({
      titulo:
        "Não foi possível salvar",

      texto,
      tipo: "danger"
    });
  } finally {
    if (botao) {
      botao.disabled = false;

      botao.textContent =
        estado.modo === "estoque"
          ? "Salvar no estoque"
          : "Adicionar à lista";
    }
  }
}

function criarBotao(
  id,
  texto,
  modo
) {
  if (elemento(id)) {
    return null;
  }

  const botao =
    document.createElement(
      "button"
    );

  botao.id = id;
  botao.type = "button";
  botao.className =
    "listalar-audio-botao";
  botao.textContent = texto;

  botao.addEventListener(
    "click",
    () => abrirModal(modo)
  );

  return botao;
}

function instalarBotaoLista() {
  if (
    elemento(
      "listalarAudioBotaoLista"
    )
  ) {
    return true;
  }

  const area =
    document.querySelector(
      "#lista .manual-box"
    ) ||
    document.querySelector(
      ".manual-box"
    ) ||
    document.querySelector(
      "#lista"
    );

  if (!area) {
    return false;
  }

  const botao = criarBotao(
    "listalarAudioBotaoLista",
    "🎤 Adicionar por áudio",
    "lista"
  );

  if (botao) {
    area.appendChild(botao);
  }

  return true;
}

function instalarBotaoEstoque() {
  if (
    elemento(
      "listalarAudioBotaoEstoque"
    )
  ) {
    return true;
  }

  const tela =
    elemento("estoque");

  if (!tela) {
    return false;
  }

  const area =
    tela.querySelector(
      ".inventory-bar"
    ) ||
    tela.querySelector(
      ".card"
    ) ||
    tela;

  const botao = criarBotao(
    "listalarAudioBotaoEstoque",
    "🎤 Atualizar estoque por áudio",
    "estoque"
  );

  if (botao) {
    area.insertBefore(
      botao,
      area.firstChild
    );
  }

  return true;
}

function instalarListaAudio() {
  criarEstilos();
  criarModal();

  let tentativas = 0;

  const tentar = () => {
    tentativas += 1;

    const listaOk =
      instalarBotaoLista();

    const estoqueOk =
      instalarBotaoEstoque();

    if (
      (!listaOk || !estoqueOk) &&
      tentativas < 40
    ) {
      setTimeout(
        tentar,
        250
      );
    }
  };

  tentar();
}

window.abrirAudioLista = () => {
  abrirModal("lista");
};

window.abrirAudioEstoque = () => {
  abrirModal("estoque");
};

window.ListaLarAudio =
  Object.freeze({
    abrirLista:
      window.abrirAudioLista,

    abrirEstoque:
      window.abrirAudioEstoque,

    interpretar:
      interpretarComando,

    instalar:
      instalarListaAudio
  });

if (
  document.readyState ===
  "loading"
) {
  document.addEventListener(
    "DOMContentLoaded",
    instalarListaAudio,
    {
      once: true
    }
  );
} else {
  instalarListaAudio();
}
