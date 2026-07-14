// ============================================================
// ListaLar - lista-audio.js
// Reconhecimento de voz para lista e estoque
// Suporta um ou vários produtos na mesma frase
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


const SpeechRecognition =
  window.SpeechRecognition ||
  window.webkitSpeechRecognition ||
  null;


const estadoAudio = {
  modo: "lista",
  reconhecimento: null,
  ouvindo: false,
  itens: []
};


const unidadesDisponiveis = [
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


const aliasesUnidades = [
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


const numerosPorExtenso = new Map([
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


const palavrasNumero = Array.from(
  numerosPorExtenso.keys()
).join("|");


function normalizarTexto(texto) {
  return String(texto || "")
    .trim()
    .toLocaleLowerCase("pt-BR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N},.;\s-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}


function numeroSeguro(valor, padrao = 0) {
  const numero = Number(
    String(valor ?? "").replace(",", ".")
  );

  return Number.isFinite(numero)
    ? numero
    : padrao;
}


function formatarNomeProduto(nome) {
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


function singularizarProduto(nome) {
  let produto = String(nome || "").trim();

  const excecoes = {
    feijoes: "feijão",
    feijao: "feijão",
    paes: "pão",
    acucares: "açúcar",
    acucar: "açúcar",
    cafes: "café",
    cafe: "café",
    arrozes: "arroz",
    macarroes: "macarrão",
    macarrao: "macarrão",
    leites: "leite",
    manteigas: "manteiga",
    farinhas: "farinha",
    detergentes: "detergente",
    sabonetes: "sabonete",
    ovos: "ovos"
  };

  const normalizado = normalizarTexto(produto);

  if (excecoes[normalizado]) {
    return formatarNomeProduto(
      excecoes[normalizado]
    );
  }

  if (
    normalizado.endsWith("s") &&
    normalizado.length > 3
  ) {
    produto = produto.slice(0, -1);
  }

  return formatarNomeProduto(produto);
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


function localizarNumero(texto) {
  const original = String(texto || "");
  const normalizado = normalizarTexto(original);

  const meiaDuzia = normalizado.match(
    /\bmeia duzia\b/
  );

  if (meiaDuzia) {
    return {
      valor: 6,
      trecho: meiaDuzia[0]
    };
  }

  const duzia = normalizado.match(
    /\b(uma duzia|duzia)\b/
  );

  if (duzia) {
    return {
      valor: 12,
      trecho: duzia[0]
    };
  }

  const numeroDigitado = original.match(
    /\b\d+(?:[.,]\d+)?\b/
  );

  if (numeroDigitado) {
    return {
      valor: numeroSeguro(
        numeroDigitado[0],
        null
      ),
      trecho: numeroDigitado[0]
    };
  }

  const palavras = normalizado.split(/\s+/);

  for (
    let indice = 0;
    indice < palavras.length;
    indice += 1
  ) {
    const palavra = palavras[indice];

    if (!numerosPorExtenso.has(palavra)) {
      continue;
    }

    let valor = numerosPorExtenso.get(palavra);
    let trecho = palavra;

    if (
      palavras[indice + 1] === "e" &&
      numerosPorExtenso.has(
        palavras[indice + 2]
      )
    ) {
      valor += numerosPorExtenso.get(
        palavras[indice + 2]
      );

      trecho += ` e ${palavras[indice + 2]}`;
    }

    return {
      valor,
      trecho
    };
  }

  return null;
}


function localizarUnidade(texto) {
  for (const item of aliasesUnidades) {
    const resultado = String(texto || "").match(
      item.regex
    );

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
  const normalizado = normalizarTexto(texto);

  if (
    /\b(estoque|inventario|tenho|temos|em casa|disponivel)\b/.test(
      normalizado
    )
  ) {
    return "estoque";
  }

  if (
    /\b(lista|comprar|compras|mercado|supermercado)\b/.test(
      normalizado
    )
  ) {
    return "lista";
  }

  return modoPadrao === "estoque"
    ? "estoque"
    : "lista";
}


function removerComandosIniciais(texto) {
  return String(texto || "")
    .replace(
      /^\s*(adicionar|adicione|adiciona|acrescentar|acrescente|acrescenta|colocar|coloque|coloca|incluir|inclua|inclui|comprar|compre|compra|cadastrar|cadastre|cadastra|registrar|registre|registra|atualizar|atualize|atualiza)\b/gi,
      " "
    )
    .replace(
      /\b(na|no|para a|para o|pra a|pra o)\s+(minha\s+)?lista\b/gi,
      " "
    )
    .replace(
      /\b(na|no|para a|para o|pra a|pra o)\s+(meu\s+)?estoque\b/gi,
      " "
    )
    .replace(
      /\b(lista de compras|lista|estoque|inventario)\b/gi,
      " "
    )
    .replace(/\s+/g, " ")
    .trim();
}


function separarPorQuantidades(texto) {
  const normalizado = normalizarTexto(texto);

  const marcadorNumero =
    `(?:\\d+(?:[.,]\\d+)?|${palavrasNumero}|meia duzia|uma duzia|duzia)`;

  const regex = new RegExp(
    `(?=\\b${marcadorNumero}\\b)`,
    "gi"
  );

  const partes = normalizado
    .split(regex)
    .map((parte) => parte.trim())
    .filter(Boolean);

  if (partes.length > 1) {
    return partes;
  }

  return [];
}


function separarPorConectores(texto) {
  return String(texto || "")
    .replace(/\s*,\s*/g, "|||")
    .replace(/\s*;\s*/g, "|||")
    .replace(
      /\s+\b(e|mais|tambem|também|depois)\b\s+/gi,
      "|||"
    )
    .split("|||")
    .map((parte) => parte.trim())
    .filter(Boolean);
}


function dividirItens(texto) {
  const textoLimpo = removerComandosIniciais(texto);

  const partesPorQuantidade =
    separarPorQuantidades(textoLimpo);

  if (partesPorQuantidade.length > 1) {
    return partesPorQuantidade.flatMap(
      (parte) => separarPorConectores(parte)
    );
  }

  const partesPorConector =
    separarPorConectores(textoLimpo);

  if (partesPorConector.length > 0) {
    return partesPorConector;
  }

  return [textoLimpo];
}


function interpretarItem(texto, modo) {
  let restante = String(texto || "").trim();

  restante = restante
    .replace(
      /^\s*(e|mais|tambem|também|depois)\b/gi,
      " "
    )
    .replace(/\s+/g, " ")
    .trim();

  const quantidadeEncontrada =
    localizarNumero(restante);

  if (quantidadeEncontrada) {
    restante = removerTrecho(
      restante,
      quantidadeEncontrada.trecho
    );
  }

  const unidadeEncontrada =
    localizarUnidade(restante);

  if (unidadeEncontrada) {
    restante = removerTrecho(
      restante,
      unidadeEncontrada.trecho
    );
  }

  restante = restante
    .replace(
      /^\s*(de|do|da|dos|das)\b/gi,
      " "
    )
    .replace(
      /\b(de|do|da|dos|das)\s*$/gi,
      " "
    )
    .replace(/\s+/g, " ")
    .trim();

  const produto = singularizarProduto(restante);

  if (!produto) {
    return null;
  }

  const quantidade =
    quantidadeEncontrada?.valor ??
    (modo === "lista" ? 1 : 0);

  const unidade =
    unidadeEncontrada?.valor ||
    obterUnidadePadrao(produto) ||
    "un";

  return {
    produto,
    quantidade: Math.max(0, quantidade),
    unidade,
    minimo: null
  };
}


function interpretarComandoMultiplo(
  texto,
  modoPadrao = "lista"
) {
  const original = String(texto || "").trim();

  if (!original) {
    throw new Error("COMANDO_VAZIO");
  }

  const modo = detectarModo(
    original,
    modoPadrao
  );

  const partes = dividirItens(original);

  const itens = partes
    .map((parte) =>
      interpretarItem(parte, modo)
    )
    .filter(Boolean);

  if (itens.length === 0) {
    throw new Error(
      "PRODUTO_NAO_IDENTIFICADO"
    );
  }

  return {
    modo,
    itens
  };
}


function elemento(id) {
  return document.getElementById(id);
}


function escaparHtml(valor) {
  return String(valor ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}


function criarEstilos() {
  if (elemento("listalar-audio-css")) {
    return;
  }

  const estilo = document.createElement("style");

  estilo.id = "listalar-audio-css";

  estilo.textContent = `
    .listalar-audio-botao {
      width: 100%;
      margin-top: 9px;
      padding: 13px 14px;
      border: none;
      border-radius: 14px;
      background: linear-gradient(
        135deg,
        #2563eb,
        #06b6d4
      );
      color: #ffffff;
      font-size: 15px;
      font-weight: 900;
      cursor: pointer;
      box-shadow:
        0 8px 18px rgba(37, 99, 235, 0.18);
    }

    .listalar-audio-fundo {
      position: fixed;
      inset: 0;
      z-index: 99999;
      display: none;
      align-items: center;
      justify-content: center;
      padding: 16px;
      background: rgba(15, 23, 42, 0.62);
      backdrop-filter: blur(5px);
    }

    .listalar-audio-fundo.aberto {
      display: flex;
    }

    .listalar-audio-modal {
      width: min(100%, 500px);
      max-height: calc(100vh - 30px);
      overflow-y: auto;
      padding: 18px;
      border-radius: 22px;
      background: #ffffff;
      color: #172033;
      box-shadow:
        0 24px 60px rgba(15, 23, 42, 0.3);
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
      border: none;
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
      border: none;
      border-radius: 16px;
      background: linear-gradient(
        135deg,
        #2563eb,
        #06b6d4
      );
      color: #ffffff;
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

    .listalar-audio-comando input {
      width: 100%;
      min-width: 0;
      padding: 12px;
      border: 2px solid #dbeafe;
      border-radius: 13px;
      color: #172033;
      font-size: 15px;
      font-weight: 800;
      box-sizing: border-box;
    }

    .listalar-audio-interpretar {
      padding: 0 14px;
      border: none;
      border-radius: 13px;
      background: #e0e7ff;
      color: #3730a3;
      font-weight: 900;
      cursor: pointer;
    }

    .listalar-audio-itens {
      display: grid;
      gap: 10px;
    }

    .listalar-audio-item {
      padding: 12px;
      border: 1px solid #dbeafe;
      border-radius: 16px;
      background: #f8fafc;
    }

    .listalar-audio-item-topo {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      margin-bottom: 8px;
    }

    .listalar-audio-item-topo strong {
      color: #1e3a8a;
      font-size: 13px;
    }

    .listalar-audio-remover {
      width: 32px;
      height: 32px;
      border: none;
      border-radius: 10px;
      background: #fee2e2;
      color: #b91c1c;
      font-size: 18px;
      font-weight: 900;
      cursor: pointer;
    }

    .listalar-audio-grade {
      display: grid;
      grid-template-columns: 1fr 95px 120px;
      gap: 8px;
    }

    .listalar-audio-campo label {
      display: block;
      margin-bottom: 5px;
      color: #64748b;
      font-size: 10px;
      font-weight: 900;
    }

    .listalar-audio-campo input,
    .listalar-audio-campo select {
      width: 100%;
      min-width: 0;
      padding: 10px;
      border: 2px solid #dbeafe;
      border-radius: 12px;
      background: #ffffff;
      color: #172033;
      font-size: 14px;
      font-weight: 800;
      box-sizing: border-box;
    }

    .listalar-audio-acoes {
      display: grid;
      grid-template-columns: 1fr 1.5fr;
      gap: 8px;
      margin-top: 13px;
    }

    .listalar-audio-acoes button {
      padding: 14px 10px;
      border: none;
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
      color: #ffffff;
    }

    .listalar-audio-vazio {
      padding: 18px;
      border: 2px dashed #cbd5e1;
      border-radius: 15px;
      color: #64748b;
      text-align: center;
      font-size: 13px;
      font-weight: 800;
    }

    @media (max-width: 430px) {
      .listalar-audio-comando {
        grid-template-columns: 1fr;
      }

      .listalar-audio-interpretar {
        min-height: 44px;
      }

      .listalar-audio-grade {
        grid-template-columns: 1fr 95px;
      }

      .listalar-audio-campo-produto {
        grid-column: 1 / -1;
      }
    }
  `;

  document.head.appendChild(estilo);
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
            Adicionar à lista por áudio
          </h2>

          <p id="listalarAudioDescricao">
            Fale um ou vários produtos.
          </p>
        </div>

        <button
          id="listalarAudioFechar"
          class="listalar-audio-fechar"
          type="button"
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
        Exemplo: “Comprar dois feijões, duas manteigas e dois açúcares”.
      </div>

      <div class="listalar-audio-comando">
        <input
          id="listalarAudioTexto"
          type="text"
          autocomplete="off"
          placeholder="Ou digite o comando"
        >

        <button
          id="listalarAudioInterpretar"
          class="listalar-audio-interpretar"
          type="button"
        >
          Interpretar
        </button>
      </div>

      <div
        id="listalarAudioItens"
        class="listalar-audio-itens"
      >
        <div class="listalar-audio-vazio">
          Fale ou digite os produtos.
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
          Adicionar à lista
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(fundo);

  elemento("listalarAudioFechar")
    .addEventListener(
      "click",
      fecharModalAudio
    );

  elemento("listalarAudioCancelar")
    .addEventListener(
      "click",
      fecharModalAudio
    );

  elemento("listalarAudioOuvir")
    .addEventListener(
      "click",
      iniciarReconhecimento
    );

  elemento("listalarAudioInterpretar")
    .addEventListener(
      "click",
      interpretarCampoTexto
    );

  elemento("listalarAudioSalvar")
    .addEventListener(
      "click",
      salvarTodosItens
    );

  elemento("listalarAudioTexto")
    .addEventListener(
      "keydown",
      (evento) => {
        if (evento.key === "Enter") {
          evento.preventDefault();
          interpretarCampoTexto();
        }
      }
    );
}


function mostrarStatus(texto, tipo = "info") {
  const status = elemento(
    "listalarAudioStatus"
  );

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


function atualizarModalModo() {
  const estoque =
    estadoAudio.modo === "estoque";

  elemento("listalarAudioTitulo").textContent =
    estoque
      ? "Atualizar estoque por áudio"
      : "Adicionar à lista por áudio";

  elemento("listalarAudioDescricao").textContent =
    estoque
      ? "Fale os produtos e as quantidades disponíveis."
      : "Fale um ou vários produtos.";

  elemento("listalarAudioSalvar").textContent =
    estoque
      ? "Salvar produtos no estoque"
      : "Adicionar produtos à lista";
}


function renderizarItens() {
  const area = elemento(
    "listalarAudioItens"
  );

  if (estadoAudio.itens.length === 0) {
    area.innerHTML = `
      <div class="listalar-audio-vazio">
        Fale ou digite os produtos.
      </div>
    `;

    return;
  }

  area.innerHTML = estadoAudio.itens
    .map((item, indice) => `
      <div class="listalar-audio-item">
        <div class="listalar-audio-item-topo">
          <strong>
            Produto ${indice + 1}
          </strong>

          <button
            type="button"
            class="listalar-audio-remover"
            data-remover-item="${indice}"
          >
            ×
          </button>
        </div>

        <div class="listalar-audio-grade">
          <div class="listalar-audio-campo listalar-audio-campo-produto">
            <label>
              Produto
            </label>

            <input
              type="text"
              data-campo-produto="${indice}"
              value="${escaparHtml(item.produto)}"
            >
          </div>

          <div class="listalar-audio-campo">
            <label>
              Quantidade
            </label>

            <input
              type="number"
              min="0"
              step="0.1"
              data-campo-quantidade="${indice}"
              value="${item.quantidade}"
            >
          </div>

          <div class="listalar-audio-campo">
            <label>
              Unidade
            </label>

            <select
              data-campo-unidade="${indice}"
            >
              ${unidadesDisponiveis
                .map((unidade) => `
                  <option
                    value="${unidade.valor}"
                    ${
                      unidade.valor === item.unidade
                        ? "selected"
                        : ""
                    }
                  >
                    ${unidade.nome}
                  </option>
                `)
                .join("")}
            </select>
          </div>
        </div>
      </div>
    `)
    .join("");

  area
    .querySelectorAll("[data-remover-item]")
    .forEach((botao) => {
      botao.addEventListener(
        "click",
        () => {
          const indice = Number(
            botao.dataset.removerItem
          );

          estadoAudio.itens.splice(
            indice,
            1
          );

          renderizarItens();
          atualizarResumo();
        }
      );
    });
}


function atualizarResumo() {
  const quantidade =
    estadoAudio.itens.length;

  if (quantidade === 0) {
    mostrarStatus(
      "Nenhum produto identificado.",
      "alerta"
    );

    return;
  }

  mostrarStatus(
    quantidade === 1
      ? "Entendi 1 produto. Revise antes de salvar."
      : `Entendi ${quantidade} produtos. Revise antes de salvar.`,
    "sucesso"
  );
}


function interpretarTexto(texto) {
  try {
    const resultado =
      interpretarComandoMultiplo(
        texto,
        estadoAudio.modo
      );

    estadoAudio.modo = resultado.modo;
    estadoAudio.itens = resultado.itens;

    atualizarModalModo();
    renderizarItens();
    atualizarResumo();
  } catch (erro) {
    console.error(
      "ListaLar Áudio: erro ao interpretar:",
      erro
    );

    mostrarStatus(
      erro.message === "COMANDO_VAZIO"
        ? "Fale ou digite um comando."
        : "Não consegui identificar os produtos.",
      "erro"
    );
  }
}


function interpretarCampoTexto() {
  interpretarTexto(
    elemento("listalarAudioTexto").value
  );
}


function atualizarBotaoMicrofone(ouvindo) {
  estadoAudio.ouvindo = ouvindo;

  const botao = elemento(
    "listalarAudioOuvir"
  );

  botao.classList.toggle(
    "ouvindo",
    ouvindo
  );

  botao.textContent = ouvindo
    ? "🔴 Ouvindo..."
    : "🎤 Falar agora";
}


function pararReconhecimento() {
  if (
    estadoAudio.reconhecimento &&
    estadoAudio.ouvindo
  ) {
    try {
      estadoAudio.reconhecimento.stop();
    } catch {
      // Reconhecimento já encerrado.
    }
  }

  atualizarBotaoMicrofone(false);
}


function iniciarReconhecimento() {
  if (!SpeechRecognition) {
    mostrarStatus(
      "Este navegador não aceita reconhecimento de voz. Digite o comando.",
      "alerta"
    );

    return;
  }

  pararReconhecimento();

  const reconhecimento =
    new SpeechRecognition();

  estadoAudio.reconhecimento =
    reconhecimento;

  reconhecimento.lang = "pt-BR";
  reconhecimento.continuous = false;
  reconhecimento.interimResults = false;
  reconhecimento.maxAlternatives = 3;

  reconhecimento.onstart = () => {
    atualizarBotaoMicrofone(true);

    mostrarStatus(
      "Estou ouvindo. Fale os produtos.",
      "alerta"
    );
  };

  reconhecimento.onresult = (evento) => {
    const texto = String(
      evento.results?.[0]?.[0]?.transcript ||
      ""
    ).trim();

    elemento("listalarAudioTexto").value =
      texto;

    interpretarTexto(texto);
  };

  reconhecimento.onerror = (evento) => {
    atualizarBotaoMicrofone(false);

    const mensagens = {
      "not-allowed":
        "O acesso ao microfone foi bloqueado.",
      "no-speech":
        "Nenhuma fala foi identificada.",
      "audio-capture":
        "Não foi possível acessar o microfone.",
      network:
        "Problema de conexão no reconhecimento."
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

  reconhecimento.start();
}


function abrirModalAudio(modo = "lista") {
  estadoAudio.modo =
    modo === "estoque"
      ? "estoque"
      : "lista";

  estadoAudio.itens = [];

  elemento("listalarAudioTexto").value =
    "";

  atualizarModalModo();
  renderizarItens();

  elemento("listalarAudioFundo")
    .classList.add("aberto");
}


function fecharModalAudio() {
  pararReconhecimento();

  elemento("listalarAudioFundo")
    .classList.remove("aberto");
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
      let encerrado = false;
      let cancelar = () => {};

      const tempo = setTimeout(() => {
        if (encerrado) {
          return;
        }

        encerrado = true;
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
          if (encerrado || !usuario) {
            return;
          }

          encerrado = true;
          clearTimeout(tempo);
          cancelar();
          resolve(usuario);
        },
        reject
      );
    }
  );
}


async function obterContextoFirebase() {
  const app = await aguardarFirebase();
  const auth = getAuth(app);
  const db = getFirestore(app);

  const usuario = await aguardarUsuario(
    auth
  );

  const usuarioSnap = await getDoc(
    doc(db, "usuarios", usuario.uid)
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
    normalizarTexto(nome);

  const produtosSnap =
    await getDocs(produtosRef);

  let encontrado = null;

  produtosSnap.forEach(
    (produtoDoc) => {
      if (encontrado) {
        return;
      }

      const dados = produtoDoc.data();

      if (
        normalizarTexto(dados.nome) ===
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


async function salvarItemLista(
  contexto,
  item
) {
  const existente =
    await encontrarProduto(
      contexto.produtosRef,
      item.produto
    );

  if (existente) {
    await setDoc(
      doc(
        contexto.produtosRef,
        existente.id
      ),
      {
        unidade: item.unidade,
        manualLista: true,
        qtdManual: item.quantidade,
        qtdComprada: item.quantidade,
        comprado: false,
        atualizadoEm:
          serverTimestamp()
      },
      {
        merge: true
      }
    );

    return;
  }

  await addDoc(
    contexto.produtosRef,
    {
      nome: item.produto,
      unidade: item.unidade,
      estoque: 0,
      minimo: 0,
      comprado: false,
      qtdComprada: item.quantidade,
      qtdManual: item.quantidade,
      manualLista: true,
      listaAutomatica: false,
      historico: 0,
      criadoEm:
        serverTimestamp(),
      atualizadoEm:
        serverTimestamp()
    }
  );
}


async function salvarItemEstoque(
  contexto,
  item
) {
  const existente =
    await encontrarProduto(
      contexto.produtosRef,
      item.produto
    );

  if (existente) {
    await setDoc(
      doc(
        contexto.produtosRef,
        existente.id
      ),
      {
        unidade: item.unidade,
        estoque: item.quantidade,
        atualizadoEm:
          serverTimestamp()
      },
      {
        merge: true
      }
    );

    return;
  }

  await addDoc(
    contexto.produtosRef,
    {
      nome: item.produto,
      unidade: item.unidade,
      estoque: item.quantidade,
      minimo: 1,
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
}


function lerItensRevisados() {
  return estadoAudio.itens
    .map((item, indice) => {
      const produto = formatarNomeProduto(
        document.querySelector(
          `[data-campo-produto="${indice}"]`
        )?.value
      );

      const quantidade = numeroSeguro(
        document.querySelector(
          `[data-campo-quantidade="${indice}"]`
        )?.value,
        1
      );

      const unidade =
        document.querySelector(
          `[data-campo-unidade="${indice}"]`
        )?.value || "un";

      return {
        produto,
        quantidade:
          estadoAudio.modo === "lista"
            ? Math.max(1, quantidade)
            : Math.max(0, quantidade),
        unidade
      };
    })
    .filter((item) => item.produto);
}


async function salvarTodosItens() {
  const botao = elemento(
    "listalarAudioSalvar"
  );

  try {
    const itens = lerItensRevisados();

    if (itens.length === 0) {
      mostrarStatus(
        "Nenhum produto para salvar.",
        "erro"
      );

      return;
    }

    botao.disabled = true;
    botao.textContent = "Salvando...";

    const contexto =
      await obterContextoFirebase();

    for (const item of itens) {
      if (estadoAudio.modo === "estoque") {
        await salvarItemEstoque(
          contexto,
          item
        );
      } else {
        await salvarItemLista(
          contexto,
          item
        );
      }
    }

    fecharModalAudio();

    if (
      typeof window.abrirTela ===
      "function"
    ) {
      await window.abrirTela(
        estadoAudio.modo === "estoque"
          ? "estoque"
          : "lista"
      );
    }

    const mensagem =
      itens.length === 1
        ? "1 produto salvo com sucesso."
        : `${itens.length} produtos salvos com sucesso.`;

    if (
      typeof window.mostrarMensagem ===
      "function"
    ) {
      await window.mostrarMensagem({
        titulo: "Produtos adicionados",
        texto: mensagem,
        tipo: "success"
      });
    } else {
      alert(mensagem);
    }
  } catch (erro) {
    console.error(
      "ListaLar Áudio: erro ao salvar:",
      erro
    );

    mostrarStatus(
      "Não foi possível salvar os produtos.",
      "erro"
    );
  } finally {
    botao.disabled = false;

    atualizarModalModo();
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
    document.createElement("button");

  botao.id = id;
  botao.type = "button";
  botao.className =
    "listalar-audio-botao";
  botao.textContent = texto;

  botao.addEventListener(
    "click",
    () => abrirModalAudio(modo)
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
    elemento("lista");

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

  const tela = elemento("estoque");

  if (!tela) {
    return false;
  }

  const area =
    tela.querySelector(
      ".inventory-bar"
    ) ||
    tela.querySelector(".card") ||
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

  const tentarInstalar = () => {
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
        tentarInstalar,
        250
      );
    }
  };

  tentarInstalar();
}


window.abrirAudioLista = () => {
  abrirModalAudio("lista");
};


window.abrirAudioEstoque = () => {
  abrirModalAudio("estoque");
};


window.ListaLarAudio = Object.freeze({
  abrirLista:
    window.abrirAudioLista,

  abrirEstoque:
    window.abrirAudioEstoque,

  interpretar:
    interpretarComandoMultiplo,

  instalar:
    instalarListaAudio
});


if (document.readyState === "loading") {
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
