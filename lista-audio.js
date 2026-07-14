// ============================================================
// ListaLar - lista-audio.js
// Versão com:
// - microfone pequeno ao lado dos botões principais;
// - reconhecimento antes da abertura do modal;
// - vários produtos por comando;
// - frases naturais;
// - apoio dos produtos já cadastrados da família.
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


const ESTADO = {
  modo: "lista",
  reconhecimento: null,
  ouvindo: false,
  itens: [],
  produtosCadastrados: [],
  contextoFirebase: null,
  carregandoContexto: false
};


const UNIDADES = [
  {
    valor: "un",
    nome: "Unidade"
  },
  {
    valor: "kg",
    nome: "Quilograma (kg)"
  },
  {
    valor: "g",
    nome: "Grama (g)"
  },
  {
    valor: "L",
    nome: "Litro (L)"
  },
  {
    valor: "ml",
    nome: "Mililitro (ml)"
  },
  {
    valor: "pct",
    nome: "Pacote"
  },
  {
    valor: "cx",
    nome: "Caixa"
  },
  {
    valor: "bdj",
    nome: "Bandeja"
  },
  {
    valor: "mç",
    nome: "Maço"
  },
  {
    valor: "lata",
    nome: "Lata"
  },
  {
    valor: "vd",
    nome: "Vidro/Pote"
  }
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


const PALAVRAS_NUMERO = Array.from(
  NUMEROS.keys()
).join("|");


function elemento(id) {
  return document.getElementById(id);
}


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


function escaparHtml(valor) {
  return String(valor ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
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


function singularizarProduto(nome) {
  let produto = String(nome || "")
    .replace(/\s+\be\b\s*$/i, "")
    .trim();

  const normalizado = normalizarTexto(produto);

  const EXCECOES = {
    feijoes: "Feijão",
    feijao: "Feijão",
    paes: "Pão",
    pao: "Pão",
    acucares: "Açúcar",
    acucar: "Açúcar",
    cafes: "Café",
    cafe: "Café",
    arrozes: "Arroz",
    arroz: "Arroz",
    macarroes: "Macarrão",
    macarrao: "Macarrão",
    leites: "Leite",
    leite: "Leite",
    manteigas: "Manteiga",
    manteiga: "Manteiga",
    farinhas: "Farinha",
    farinha: "Farinha",
    detergentes: "Detergente",
    detergente: "Detergente",
    sabonetes: "Sabonete",
    sabonete: "Sabonete",
    oleos: "Óleo",
    oleo: "Óleo",
    ovos: "Ovos"
  };

  if (EXCECOES[normalizado]) {
    return EXCECOES[normalizado];
  }

  if (
    normalizado.endsWith("s") &&
    normalizado.length > 4
  ) {
    produto = produto.slice(0, -1);
  }

  return formatarNomeProduto(produto);
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

    if (!NUMEROS.has(palavra)) {
      continue;
    }

    let valor = NUMEROS.get(palavra);
    let trecho = palavra;

    if (
      palavras[indice + 1] === "e" &&
      NUMEROS.has(palavras[indice + 2])
    ) {
      valor += NUMEROS.get(
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
  for (const unidade of ALIASES_UNIDADE) {
    const resultado = String(texto || "").match(
      unidade.regex
    );

    if (resultado) {
      return {
        valor: unidade.valor,
        trecho: resultado[0]
      };
    }
  }

  return null;
}


function detectarModo(texto, modoPadrao) {
  const normalizado = normalizarTexto(texto);

  if (
    /\b(estoque|inventario|tenho|temos|comprei|recebi|entrou|disponivel|disponiveis)\b/.test(
      normalizado
    )
  ) {
    return "estoque";
  }

  if (
    /\b(lista|comprar|compre|preciso|faltando|mercado|supermercado)\b/.test(
      normalizado
    )
  ) {
    return "lista";
  }

  return modoPadrao === "estoque"
    ? "estoque"
    : "lista";
}


function fraseIndicaEstoqueZero(texto) {
  const normalizado = normalizarTexto(texto);

  return (
    /\b(acabou|zerou|sem|nao tem|nao temos|faltou)\b/.test(
      normalizado
    )
  );
}


function limparFraseNatural(texto) {
  let limpo = String(texto || "");

  const EXPRESSOES_INICIAIS = [
    /^\s*voc[eê]\s+pode\s+/i,
    /^\s*pode\s+/i,
    /^\s*por\s+favor\s+/i,
    /^\s*ser[aá]\s+que\s+pode\s+/i,
    /^\s*tem\s+como\s+/i,
    /^\s*eu\s+quero\s+/i,
    /^\s*quero\s+/i,
    /^\s*eu\s+gostaria\s+de\s+/i,
    /^\s*gostaria\s+de\s+/i,
    /^\s*eu\s+preciso\s+de\s+/i,
    /^\s*preciso\s+de\s+/i,
    /^\s*estou\s+precisando\s+de\s+/i,
    /^\s*a\s+gente\s+precisa\s+de\s+/i,
    /^\s*n[oó]s\s+precisamos\s+de\s+/i,
    /^\s*lembra\s+de\s+/i,
    /^\s*lembre\s+de\s+/i,
    /^\s*amor\s*,?\s*/i,
    /^\s*chat\s*,?\s*/i,
    /^\s*lista\s*lar\s*,?\s*/i
  ];

  for (const expressao of EXPRESSOES_INICIAIS) {
    limpo = limpo.replace(expressao, " ");
  }

  limpo = limpo
    .replace(
      /^\s*(adicionar|adicione|adiciona|acrescentar|acrescente|acrescenta|colocar|coloque|coloca|incluir|inclua|inclui|comprar|compre|compra|cadastrar|cadastre|cadastra|registrar|registre|registra|atualizar|atualize|atualiza)\b/i,
      " "
    )
    .replace(
      /^\s*(tenho|temos|comprei|recebi)\b/i,
      " "
    )
    .replace(
      /^\s*(acabou|zerou|estamos sem|estou sem)\b/i,
      " "
    )
    .replace(
      /\b(na|no|para a|para o|pra a|pra o)\s+(minha\s+)?lista(?:\s+de\s+compras)?\b/gi,
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
    .replace(
      /\b(por favor|por gentileza)\b/gi,
      " "
    )
    .replace(/\s+/g, " ")
    .trim();

  return limpo;
}


function separarPorQuantidades(texto) {
  const marcadorNumero =
    `(?:\\d+(?:[.,]\\d+)?|${PALAVRAS_NUMERO}|meia duzia|uma duzia|duzia)`;

  const regex = new RegExp(
    `(?=\\b${marcadorNumero}\\b)`,
    "gi"
  );

  const partes = normalizarTexto(texto)
    .split(regex)
    .map((parte) => parte.trim())
    .filter(Boolean);

  return partes.length > 1
    ? partes
    : [];
}


function separarPorConectores(texto) {
  return String(texto || "")
    .replace(/\s*,\s*/g, "|||")
    .replace(/\s*;\s*/g, "|||")
    .replace(
      /\s+\b(e|mais|tambem|também|depois|junto com)\b\s+/gi,
      "|||"
    )
    .split("|||")
    .map((parte) => parte.trim())
    .filter(Boolean);
}


function procurarProdutoCadastrado(nome) {
  const procurado = normalizarTexto(nome);

  return ESTADO.produtosCadastrados.find(
    (produto) =>
      normalizarTexto(produto.nome) === procurado
  ) || null;
}


function separarUsandoProdutosCadastrados(texto) {
  const fraseNormalizada = normalizarTexto(texto);

  if (
    !fraseNormalizada ||
    ESTADO.produtosCadastrados.length === 0
  ) {
    return [];
  }

  const produtosOrdenados = [
    ...ESTADO.produtosCadastrados
  ].sort(
    (a, b) =>
      normalizarTexto(b.nome).length -
      normalizarTexto(a.nome).length
  );

  const encontrados = [];

  for (const produto of produtosOrdenados) {
    const nomeNormalizado = normalizarTexto(
      produto.nome
    );

    const regex = new RegExp(
      `\\b${nomeNormalizado.replace(
        /[.*+?^${}()|[\]\\]/g,
        "\\$&"
      )}s?\\b`,
      "i"
    );

    const resultado = fraseNormalizada.match(regex);

    if (!resultado) {
      continue;
    }

    encontrados.push({
      produto,
      indice: resultado.index ?? 0,
      trecho: resultado[0]
    });
  }

  encontrados.sort(
    (a, b) => a.indice - b.indice
  );

  const semSobreposicao = [];

  for (const encontrado of encontrados) {
    const inicio = encontrado.indice;
    const fim =
      inicio + encontrado.trecho.length;

    const sobrepoe = semSobreposicao.some(
      (item) =>
        inicio < item.fim &&
        fim > item.inicio
    );

    if (!sobrepoe) {
      semSobreposicao.push({
        ...encontrado,
        inicio,
        fim
      });
    }
  }

  if (semSobreposicao.length < 2) {
    return [];
  }

  return semSobreposicao.map(
    (item) => item.produto.nome
  );
}


function dividirItens(texto) {
  const limpo = limparFraseNatural(texto);

  const porQuantidade =
    separarPorQuantidades(limpo);

  if (porQuantidade.length > 1) {
    return porQuantidade.flatMap(
      separarPorConectores
    );
  }

  const porConectores =
    separarPorConectores(limpo);

  if (porConectores.length > 1) {
    const resultado = [];

    for (const parte of porConectores) {
      const porCadastro =
        separarUsandoProdutosCadastrados(parte);

      if (porCadastro.length > 1) {
        resultado.push(...porCadastro);
      } else {
        resultado.push(parte);
      }
    }

    return resultado;
  }

  const porCadastro =
    separarUsandoProdutosCadastrados(limpo);

  if (porCadastro.length > 1) {
    return porCadastro;
  }

  return [limpo];
}


function interpretarItem(
  texto,
  modo,
  estoqueZero
) {
  let restante = String(texto || "")
    .replace(
      /^\s*(e|mais|tambem|também|depois)\b/i,
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
      /^\s*(de|do|da|dos|das)\b/i,
      " "
    )
    .replace(
      /\b(de|do|da|dos|das)\s*$/i,
      " "
    )
    .replace(/\s+\be\b\s*$/i, " ")
    .replace(/\s+/g, " ")
    .trim();

  let produto = singularizarProduto(restante);

  if (!produto) {
    return null;
  }

  const cadastrado =
    procurarProdutoCadastrado(produto);

  if (cadastrado) {
    produto = cadastrado.nome;
  }

  let quantidade;

  if (quantidadeEncontrada) {
    quantidade = quantidadeEncontrada.valor;
  } else if (
    modo === "estoque" &&
    estoqueZero
  ) {
    quantidade = 0;
  } else {
    quantidade = 1;
  }

  const unidade =
    unidadeEncontrada?.valor ||
    cadastrado?.unidade ||
    obterUnidadePadrao(produto) ||
    "un";

  return {
    produto,
    quantidade: Math.max(0, quantidade),
    unidade,
    minimo:
      cadastrado?.minimo ?? null
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

  const estoqueZero =
    fraseIndicaEstoqueZero(original);

  const partes = dividirItens(original);

  const itens = partes
    .map((parte) =>
      interpretarItem(
        parte,
        modo,
        estoqueZero
      )
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


function criarEstilos() {
  if (elemento("listalar-audio-css")) {
    return;
  }

  const estilo = document.createElement("style");

  estilo.id = "listalar-audio-css";

  estilo.textContent = `
    .listalar-acao-com-audio {
      display: grid !important;
      grid-template-columns: minmax(0, 1fr) 58px;
      align-items: stretch;
      gap: 9px;
      width: 100%;
    }

    .listalar-acao-com-audio > button:not(
      .listalar-audio-microfone
    ) {
      width: 100% !important;
      min-width: 0;
      margin: 0 !important;
    }

    .listalar-audio-microfone {
      width: 58px;
      min-width: 58px;
      height: 100%;
      min-height: 48px;
      margin: 0 !important;
      padding: 0;
      border: none;
      border-radius: 14px;
      background: linear-gradient(
        135deg,
        #2563eb,
        #06b6d4
      );
      color: #ffffff;
      font-size: 24px;
      font-weight: 900;
      cursor: pointer;
      box-shadow:
        0 7px 15px rgba(37, 99, 235, 0.2);
    }

    .listalar-audio-microfone.ouvindo {
      background: linear-gradient(
        135deg,
        #dc2626,
        #f97316
      );
      animation:
        listalarMicrofonePulso 1.05s infinite;
    }

    @keyframes listalarMicrofonePulso {
      0%,
      100% {
        transform: scale(1);
      }

      50% {
        transform: scale(1.07);
      }
    }

    .listalar-audio-ouvindo-fundo {
      position: fixed;
      inset: 0;
      z-index: 99998;
      display: none;
      align-items: center;
      justify-content: center;
      padding: 18px;
      background: rgba(15, 23, 42, 0.58);
      backdrop-filter: blur(5px);
    }

    .listalar-audio-ouvindo-fundo.aberto {
      display: flex;
    }

    .listalar-audio-ouvindo-card {
      width: min(100%, 360px);
      padding: 28px 20px;
      border-radius: 24px;
      background: #ffffff;
      color: #172033;
      text-align: center;
      box-shadow:
        0 24px 60px rgba(15, 23, 42, 0.3);
    }

    .listalar-audio-ouvindo-icone {
      width: 82px;
      height: 82px;
      display: grid;
      place-items: center;
      margin: 0 auto 14px;
      border-radius: 50%;
      background: #fee2e2;
      font-size: 38px;
      animation:
        listalarOuvindoPulso 1.05s infinite;
    }

    @keyframes listalarOuvindoPulso {
      0%,
      100% {
        box-shadow:
          0 0 0 0 rgba(220, 38, 38, 0.22);
      }

      50% {
        box-shadow:
          0 0 0 18px rgba(220, 38, 38, 0);
      }
    }

    .listalar-audio-ouvindo-card h3 {
      margin: 0;
      font-size: 23px;
      font-weight: 900;
    }

    .listalar-audio-ouvindo-card p {
      margin: 8px 0 17px;
      color: #64748b;
      font-size: 14px;
      font-weight: 700;
      line-height: 1.45;
    }

    .listalar-audio-parar {
      width: 100%;
      padding: 13px;
      border: none;
      border-radius: 14px;
      background: #fee2e2;
      color: #b91c1c;
      font-size: 15px;
      font-weight: 900;
      cursor: pointer;
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

    .listalar-audio-status {
      margin-bottom: 10px;
      padding: 10px 12px;
      border-radius: 14px;
      background: #dcfce7;
      color: #166534;
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

    .listalar-audio-salvar:disabled {
      opacity: 0.55;
      cursor: not-allowed;
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


function criarTelaOuvindo() {
  if (elemento("listalarAudioOuvindoFundo")) {
    return;
  }

  const fundo = document.createElement("div");

  fundo.id = "listalarAudioOuvindoFundo";
  fundo.className =
    "listalar-audio-ouvindo-fundo";

  fundo.innerHTML = `
    <div class="listalar-audio-ouvindo-card">
      <div class="listalar-audio-ouvindo-icone">
        🎤
      </div>

      <h3>Ouvindo...</h3>

      <p>
        Fale naturalmente os produtos e as quantidades.
      </p>

      <button
        id="listalarAudioParar"
        class="listalar-audio-parar"
        type="button"
      >
        Parar
      </button>
    </div>
  `;

  document.body.appendChild(fundo);

  elemento("listalarAudioParar")
    .addEventListener(
      "click",
      pararReconhecimento
    );
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
            Revisar produtos
          </h2>

          <p id="listalarAudioDescricao">
            Confira os itens antes de salvar.
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

      <div
        id="listalarAudioStatus"
        class="listalar-audio-status"
      >
        Revise os produtos identificados.
      </div>

      <div class="listalar-audio-comando">
        <input
          id="listalarAudioTexto"
          type="text"
          autocomplete="off"
          placeholder="Frase reconhecida"
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
      ></div>

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

  elemento("listalarAudioFechar")
    .addEventListener(
      "click",
      fecharModal
    );

  elemento("listalarAudioCancelar")
    .addEventListener(
      "click",
      fecharModal
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


function mostrarStatus(texto, tipo = "sucesso") {
  const status = elemento(
    "listalarAudioStatus"
  );

  if (!status) {
    return;
  }

  const ESTILOS = {
    sucesso: [
      "#dcfce7",
      "#166534"
    ],
    alerta: [
      "#fef3c7",
      "#92400e"
    ],
    erro: [
      "#fee2e2",
      "#b91c1c"
    ],
    info: [
      "#eff6ff",
      "#1d4ed8"
    ]
  };

  const [fundo, cor] =
    ESTILOS[tipo] ||
    ESTILOS.info;

  status.textContent = texto;
  status.style.background = fundo;
  status.style.color = cor;
}


function atualizarModalModo() {
  const estoque =
    ESTADO.modo === "estoque";

  elemento("listalarAudioTitulo").textContent =
    estoque
      ? "Revisar atualização do estoque"
      : "Revisar lista de compras";

  elemento("listalarAudioDescricao").textContent =
    estoque
      ? "Confira as quantidades disponíveis."
      : "Confira os produtos antes de adicionar.";

  elemento("listalarAudioSalvar").textContent =
    estoque
      ? "Salvar produtos no estoque"
      : "Adicionar produtos à lista";
}


function renderizarItens() {
  const area = elemento(
    "listalarAudioItens"
  );

  area.innerHTML = ESTADO.itens
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
          <div
            class="
              listalar-audio-campo
              listalar-audio-campo-produto
            "
          >
            <label>Produto</label>

            <input
              type="text"
              data-campo-produto="${indice}"
              value="${escaparHtml(item.produto)}"
            >
          </div>

          <div class="listalar-audio-campo">
            <label>Quantidade</label>

            <input
              type="number"
              min="0"
              step="0.1"
              data-campo-quantidade="${indice}"
              value="${item.quantidade}"
            >
          </div>

          <div class="listalar-audio-campo">
            <label>Unidade</label>

            <select
              data-campo-unidade="${indice}"
            >
              ${UNIDADES.map(
                (unidade) => `
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
                `
              ).join("")}
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

          ESTADO.itens.splice(
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
    ESTADO.itens.length;

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


function abrirModalComResultado(
  texto,
  resultado
) {
  ESTADO.modo = resultado.modo;
  ESTADO.itens = resultado.itens;

  elemento("listalarAudioTexto").value =
    texto;

  atualizarModalModo();
  renderizarItens();
  atualizarResumo();

  elemento("listalarAudioFundo")
    .classList.add("aberto");
}


function fecharModal() {
  elemento("listalarAudioFundo")
    ?.classList.remove("aberto");
}


function interpretarTexto(texto) {
  try {
    const resultado =
      interpretarComandoMultiplo(
        texto,
        ESTADO.modo
      );

    abrirModalComResultado(
      texto,
      resultado
    );
  } catch (erro) {
    console.error(
      "ListaLar Áudio: erro ao interpretar:",
      erro
    );

    window.alert(
      erro.message === "COMANDO_VAZIO"
        ? "Fale ou digite um comando."
        : "Não consegui identificar os produtos. Tente falar novamente."
    );
  }
}


function interpretarCampoTexto() {
  const texto =
    elemento("listalarAudioTexto").value;

  try {
    const resultado =
      interpretarComandoMultiplo(
        texto,
        ESTADO.modo
      );

    ESTADO.modo = resultado.modo;
    ESTADO.itens = resultado.itens;

    atualizarModalModo();
    renderizarItens();
    atualizarResumo();
  } catch (erro) {
    mostrarStatus(
      "Não consegui identificar os produtos.",
      "erro"
    );
  }
}


function atualizarBotoesMicrofone(ouvindo) {
  ESTADO.ouvindo = ouvindo;

  document
    .querySelectorAll(
      ".listalar-audio-microfone"
    )
    .forEach((botao) => {
      botao.classList.toggle(
        "ouvindo",
        ouvindo &&
        botao.dataset.modoAudio ===
          ESTADO.modo
      );

      botao.textContent =
        ouvindo &&
        botao.dataset.modoAudio ===
          ESTADO.modo
          ? "🔴"
          : "🎤";
    });
}


function mostrarTelaOuvindo() {
  elemento("listalarAudioOuvindoFundo")
    .classList.add("aberto");
}


function esconderTelaOuvindo() {
  elemento("listalarAudioOuvindoFundo")
    .classList.remove("aberto");
}


function pararReconhecimento() {
  if (
    ESTADO.reconhecimento &&
    ESTADO.ouvindo
  ) {
    try {
      ESTADO.reconhecimento.stop();
    } catch {
      // O navegador já encerrou o reconhecimento.
    }
  }

  atualizarBotoesMicrofone(false);
  esconderTelaOuvindo();
}


async function iniciarReconhecimento(modo) {
  ESTADO.modo =
    modo === "estoque"
      ? "estoque"
      : "lista";

  if (!SpeechRecognition) {
    window.alert(
      "Este navegador não oferece reconhecimento de voz."
    );

    return;
  }

  pararReconhecimento();

  await carregarContextoProdutos();

  const reconhecimento =
    new SpeechRecognition();

  ESTADO.reconhecimento =
    reconhecimento;

  reconhecimento.lang = "pt-BR";
  reconhecimento.continuous = false;
  reconhecimento.interimResults = false;
  reconhecimento.maxAlternatives = 3;

  reconhecimento.onstart = () => {
    atualizarBotoesMicrofone(true);
    mostrarTelaOuvindo();
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

    esconderTelaOuvindo();

    if (!texto) {
      window.alert(
        "Não consegui entender. Tente novamente."
      );

      return;
    }

    interpretarTexto(texto);
  };

  reconhecimento.onerror = (evento) => {
    atualizarBotoesMicrofone(false);
    esconderTelaOuvindo();

    const MENSAGENS = {
      "not-allowed":
        "O acesso ao microfone foi bloqueado. Libere a permissão no navegador.",

      "service-not-allowed":
        "O serviço de voz não está permitido neste navegador.",

      "no-speech":
        "Nenhuma fala foi identificada. Tente novamente.",

      "audio-capture":
        "Não foi possível acessar o microfone.",

      network:
        "O reconhecimento encontrou um problema de conexão."
    };

    if (evento.error !== "aborted") {
      window.alert(
        MENSAGENS[evento.error] ||
        "Não foi possível reconhecer a fala."
      );
    }
  };

  reconhecimento.onend = () => {
    atualizarBotoesMicrofone(false);
    esconderTelaOuvindo();
  };

  try {
    reconhecimento.start();
  } catch (erro) {
    console.error(
      "ListaLar Áudio: erro ao iniciar:",
      erro
    );

    atualizarBotoesMicrofone(false);
    esconderTelaOuvindo();

    window.alert(
      "Não foi possível iniciar o microfone."
    );
  }
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
      window.setTimeout(resolve, 80);
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

      const limite = window.setTimeout(
        () => {
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
        },
        limiteMs
      );

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
          window.clearTimeout(limite);
          cancelar();

          resolve(usuario);
        },
        (erro) => {
          if (finalizado) {
            return;
          }

          finalizado = true;
          window.clearTimeout(limite);
          cancelar();

          reject(erro);
        }
      );
    }
  );
}


async function obterContextoFirebase() {
  if (ESTADO.contextoFirebase) {
    return ESTADO.contextoFirebase;
  }

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

  ESTADO.contextoFirebase = {
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

  return ESTADO.contextoFirebase;
}


async function carregarContextoProdutos() {
  if (ESTADO.carregandoContexto) {
    return;
  }

  ESTADO.carregandoContexto = true;

  try {
    const contexto =
      await obterContextoFirebase();

    const produtosSnap =
      await getDocs(
        contexto.produtosRef
      );

    ESTADO.produtosCadastrados =
      produtosSnap.docs.map(
        (produtoDoc) => ({
          id: produtoDoc.id,
          ...produtoDoc.data()
        })
      );
  } catch (erro) {
    console.warn(
      "ListaLar Áudio: não foi possível carregar os produtos cadastrados:",
      erro
    );

    ESTADO.produtosCadastrados = [];
  } finally {
    ESTADO.carregandoContexto = false;
  }
}


async function encontrarProduto(
  produtosRef,
  nome
) {
  const nomeNormalizado =
    normalizarTexto(nome);

  const produtoEmMemoria =
    ESTADO.produtosCadastrados.find(
      (produto) =>
        normalizarTexto(produto.nome) ===
        nomeNormalizado
    );

  if (produtoEmMemoria) {
    return produtoEmMemoria;
  }

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
  return ESTADO.itens
    .map((item, indice) => {
      const produto =
        formatarNomeProduto(
          document.querySelector(
            `[data-campo-produto="${indice}"]`
          )?.value
        );

      const quantidade =
        numeroSeguro(
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
          ESTADO.modo === "lista"
            ? Math.max(1, quantidade)
            : Math.max(0, quantidade),
        unidade
      };
    })
    .filter(
      (item) => item.produto
    );
}


async function salvarTodosItens() {
  const botao = elemento(
    "listalarAudioSalvar"
  );

  try {
    const itens =
      lerItensRevisados();

    if (itens.length === 0) {
      mostrarStatus(
        "Nenhum produto para salvar.",
        "erro"
      );

      return;
    }

    botao.disabled = true;
    botao.textContent =
      "Salvando...";

    const contexto =
      await obterContextoFirebase();

    for (const item of itens) {
      if (ESTADO.modo === "estoque") {
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

    ESTADO.produtosCadastrados = [];
    ESTADO.contextoFirebase = null;

    fecharModal();

    if (
      typeof window.abrirTela ===
      "function"
    ) {
      await window.abrirTela(
        ESTADO.modo === "estoque"
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
        titulo:
          ESTADO.modo === "estoque"
            ? "Estoque atualizado"
            : "Produtos adicionados",
        texto: mensagem,
        tipo: "success"
      });
    } else {
      window.alert(mensagem);
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


function normalizarTextoBotao(botao) {
  return normalizarTexto(
    botao.textContent ||
    botao.innerText ||
    ""
  );
}


function encontrarBotaoPorTexto(
  tela,
  expressoes
) {
  if (!tela) {
    return null;
  }

  const botoes = Array.from(
    tela.querySelectorAll(
      "button, a.btn, .btn"
    )
  );

  return botoes.find((botao) => {
    const texto =
      normalizarTextoBotao(botao);

    return expressoes.some(
      (expressao) =>
        expressao.test(texto)
    );
  }) || null;
}


function instalarMicrofoneAoLado(
  botaoPrincipal,
  modo,
  idMicrofone
) {
  if (
    !botaoPrincipal ||
    elemento(idMicrofone)
  ) {
    return Boolean(
      elemento(idMicrofone)
    );
  }

  const paiOriginal =
    botaoPrincipal.parentElement;

  if (!paiOriginal) {
    return false;
  }

  let grupo =
    botaoPrincipal.closest(
      ".listalar-acao-com-audio"
    );

  if (!grupo) {
    grupo =
      document.createElement("div");

    grupo.className =
      "listalar-acao-com-audio";

    paiOriginal.insertBefore(
      grupo,
      botaoPrincipal
    );

    grupo.appendChild(
      botaoPrincipal
    );
  }

  const microfone =
    document.createElement("button");

  microfone.id = idMicrofone;
  microfone.type = "button";
  microfone.className =
    "listalar-audio-microfone";
  microfone.dataset.modoAudio = modo;
  microfone.textContent = "🎤";
  microfone.title =
    modo === "estoque"
      ? "Atualizar estoque por áudio"
      : "Adicionar produtos por áudio";

  microfone.setAttribute(
    "aria-label",
    microfone.title
  );

  microfone.addEventListener(
    "click",
    () => iniciarReconhecimento(modo)
  );

  grupo.appendChild(microfone);

  return true;
}


function instalarMicrofoneLista() {
  if (
    elemento(
      "listalarAudioMicrofoneLista"
    )
  ) {
    return true;
  }

  const telaLista =
    elemento("lista") ||
    document.querySelector(
      '[data-tela="lista"]'
    );

  const botaoPrincipal =
    encontrarBotaoPorTexto(
      telaLista || document,
      [
        /^atualizar lista$/,
        /^atualizar$/,
        /^salvar lista$/,
        /^adicionar item$/,
        /^adicionar produto$/
      ]
    );

  return instalarMicrofoneAoLado(
    botaoPrincipal,
    "lista",
    "listalarAudioMicrofoneLista"
  );
}


function instalarMicrofoneEstoque() {
  if (
    elemento(
      "listalarAudioMicrofoneEstoque"
    )
  ) {
    return true;
  }

  const telaEstoque =
    elemento("estoque") ||
    document.querySelector(
      '[data-tela="estoque"]'
    );

  const botaoPrincipal =
    encontrarBotaoPorTexto(
      telaEstoque || document,
      [
        /^atualizar estoque$/,
        /^atualizar$/,
        /^salvar estoque$/,
        /^salvar alterações$/,
        /^salvar alteracoes$/
      ]
    );

  return instalarMicrofoneAoLado(
    botaoPrincipal,
    "estoque",
    "listalarAudioMicrofoneEstoque"
  );
}


function removerBotoesAntigos() {
  [
    "listalarAudioBotaoLista",
    "listalarAudioBotaoEstoque"
  ].forEach((id) => {
    elemento(id)?.remove();
  });

  document
    .querySelectorAll(
      ".listalar-audio-botao"
    )
    .forEach((botao) => {
      botao.remove();
    });
}


function instalarListaAudio() {
  criarEstilos();
  criarTelaOuvindo();
  criarModal();
  removerBotoesAntigos();

  let tentativas = 0;

  const tentarInstalar = () => {
    tentativas += 1;

    removerBotoesAntigos();

    const listaOk =
      instalarMicrofoneLista();

    const estoqueOk =
      instalarMicrofoneEstoque();

    if (
      (!listaOk || !estoqueOk) &&
      tentativas < 80
    ) {
      window.setTimeout(
        tentarInstalar,
        250
      );
    }
  };

  tentarInstalar();

  const observador =
    new MutationObserver(() => {
      removerBotoesAntigos();
      instalarMicrofoneLista();
      instalarMicrofoneEstoque();
    });

  observador.observe(
    document.body,
    {
      childList: true,
      subtree: true
    }
  );
}


window.abrirAudioLista = () => {
  iniciarReconhecimento("lista");
};


window.abrirAudioEstoque = () => {
  iniciarReconhecimento("estoque");
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


if (
  document.readyState === "loading"
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
