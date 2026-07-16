// ============================================================
// ListaLar - controle-precos.js
// Versão 1.0.1
//
// Primeira etapa do Controle de Preços.
//
// Funções desta versão:
// - cria o botão 💰 ao lado de Pendentes;
// - controle desativado por padrão;
// - ativação salva para toda a família;
// - adiciona preço unitário somente na Lista;
// - calcula subtotal por produto;
// - calcula o total atual da compra;
// - preserva o valor durante atualizações da tela;
// - salva o preço no Firebase ao sair do campo;
// - acompanha alterações de quantidade;
// - não altera a lógica atual de finalizar compra;
// - não altera o estoque;
// - ainda não integra preço ao áudio.
// ============================================================

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
  doc,
  getDoc,
  setDoc,
  onSnapshot,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";


const PRECO_ESTADO = {
  db: null,
  auth: null,
  usuario: null,
  familiaId: null,

  ativo: false,
  carregado: false,
  salvandoConfiguracao: false,

  unsubscribeFamilia: null,
  observadorLista: null,

  precosDigitados: new Map(),
  instalandoCampos: false
};


function precoElemento(id) {
  return document.getElementById(id);
}


function precoNumeroSeguro(
  valor,
  padrao = 0
) {
  if (
    valor === null ||
    valor === undefined ||
    valor === ""
  ) {
    return padrao;
  }

  let texto = String(valor)
    .trim()
    .replace(/\s/g, "")
    .replace(/^R\$/i, "");

  if (
    texto.includes(",") &&
    texto.includes(".")
  ) {
    texto = texto
      .replace(/\./g, "")
      .replace(",", ".");
  } else {
    texto = texto.replace(",", ".");
  }

  const numero = Number(texto);

  return Number.isFinite(numero)
    ? numero
    : padrao;
}


function precoArredondar(valor) {
  const numero =
    precoNumeroSeguro(valor, 0);

  return Math.round(
    (numero + Number.EPSILON) * 100
  ) / 100;
}


function precoFormatarMoeda(valor) {
  return precoArredondar(valor)
    .toLocaleString(
      "pt-BR",
      {
        style: "currency",
        currency: "BRL"
      }
    );
}


function precoFormatarCampo(valor) {
  const numero =
    precoArredondar(valor);

  if (numero <= 0) {
    return "";
  }

  return numero.toLocaleString(
    "pt-BR",
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }
  );
}


function precoCriarEstilos() {
  if (
    precoElemento(
      "controlePrecosCss"
    )
  ) {
    return;
  }

  const estilo =
    document.createElement("style");

  estilo.id =
    "controlePrecosCss";

  estilo.textContent = `
    #lista .summary.controle-precos-resumo {
      grid-template-columns:
        repeat(4, minmax(0, 1fr));
    }

    .controle-precos-botao {
      width: 100%;
      min-width: 0;
      min-height: 58px;
      padding: 8px 4px;
      border: 1px solid var(--borda, #dbeafe);
      border-radius: 15px;
      background: #f8fafc;
      color: var(--azul1, #2563eb);
      text-align: center;
      cursor: pointer;
      font-family: inherit;
      box-shadow: none;
      transition:
        background 0.18s ease,
        border-color 0.18s ease,
        transform 0.12s ease;
    }

    .controle-precos-botao:active {
      transform: scale(0.97);
    }

    .controle-precos-botao strong {
      display: block;
      color: var(--azul1, #2563eb);
      font-size: 21px;
      line-height: 1;
      font-weight: 900;
    }

    .controle-precos-botao span {
      display: block;
      margin-top: 5px;
      color: var(--cinza, #64748b);
      font-size: 10px;
      line-height: 1;
      font-weight: 900;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .controle-precos-botao.ativo {
      border-color: #86efac;
      background: #dcfce7;
    }

    .controle-precos-botao.ativo strong {
      color: #166534;
    }

    .controle-precos-botao.ativo span {
      color: #166534;
    }

    .controle-precos-botao.carregando {
      opacity: 0.55;
      cursor: wait;
    }

    .controle-precos-area {
      margin-top: 9px;
      padding: 10px;
      border: 1px solid #bbf7d0;
      border-radius: 15px;
      background: #f0fdf4;
    }

    .controle-precos-grade {
      display: grid;
      grid-template-columns:
        minmax(0, 1fr)
        minmax(105px, 0.78fr);
      gap: 8px;
      align-items: end;
    }

    .controle-precos-campo label,
    .controle-precos-subtotal label {
      display: block;
      margin-bottom: 5px;
      color: #64748b;
      font-size: 10px;
      font-weight: 900;
    }

    .controle-precos-input-wrapper {
      position: relative;
    }

    .controle-precos-prefixo {
      position: absolute;
      left: 11px;
      top: 50%;
      z-index: 1;
      color: #475569;
      font-size: 13px;
      font-weight: 900;
      transform: translateY(-50%);
      pointer-events: none;
    }

    .controle-precos-input {
      width: 100%;
      min-height: 42px;
      padding:
        9px 10px
        9px 33px !important;
      border: 2px solid #bbf7d0 !important;
      border-radius: 12px !important;
      background: #ffffff !important;
      color: #172033;
      font-size: 16px !important;
      font-weight: 900 !important;
      text-align: right;
      box-sizing: border-box;
    }

    .controle-precos-input:focus {
      border-color:
        var(--verde, #16a34a) !important;
      box-shadow:
        0 0 0 3px
        rgba(22, 163, 74, 0.10);
    }

    .controle-precos-subtotal-valor {
      min-height: 42px;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 7px;
      border-radius: 12px;
      background: #dcfce7;
      color: #166534;
      text-align: center;
      font-size: 14px;
      font-weight: 900;
      line-height: 1.15;
    }

    .controle-precos-total {
      display: none;
      margin-top: 10px;
      padding: 14px;
      border: 1px solid #86efac;
      border-radius: 17px;
      background: linear-gradient(
        135deg,
        #dcfce7,
        #f0fdf4
      );
    }

    .controle-precos-total.ativo {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    }

    .controle-precos-total-texto {
      min-width: 0;
    }

    .controle-precos-total-texto strong {
      display: block;
      color: #166534;
      font-size: 14px;
      font-weight: 900;
    }

    .controle-precos-total-texto span {
      display: block;
      margin-top: 3px;
      color: #15803d;
      font-size: 10px;
      font-weight: 800;
    }

    .controle-precos-total-valor {
      flex: 0 0 auto;
      color: #166534;
      font-size: 21px;
      font-weight: 900;
      white-space: nowrap;
    }

    @media (max-width: 380px) {
      #lista .summary.controle-precos-resumo {
        gap: 5px;
      }

      .controle-precos-botao {
        padding-left: 2px;
        padding-right: 2px;
      }

      .controle-precos-botao strong {
        font-size: 19px;
      }

      .controle-precos-botao span {
        font-size: 9px;
      }

      .controle-precos-grade {
        grid-template-columns:
          minmax(0, 1fr)
          100px;
      }

      .controle-precos-total {
        padding: 12px;
      }

      .controle-precos-total-valor {
        font-size: 18px;
      }
    }
  `;

  document.head.appendChild(
    estilo
  );
}


async function precoAguardarFirebase(
  limiteMs = 10000
) {
  const inicio = Date.now();

  while (
    Date.now() - inicio <
    limiteMs
  ) {
    if (getApps().length > 0) {
      return getApp();
    }

    await new Promise(
      (resolve) => {
        window.setTimeout(
          resolve,
          100
        );
      }
    );
  }

  throw new Error(
    "FIREBASE_NAO_INICIALIZADO"
  );
}


async function precoAguardarUsuario(
  auth,
  limiteMs = 10000
) {
  if (auth.currentUser) {
    return auth.currentUser;
  }

  return new Promise(
    (resolve, reject) => {
      let encerrado = false;
      let cancelar = () => {};

      const limite =
        window.setTimeout(
          () => {
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
          },
          limiteMs
        );

      cancelar =
        onAuthStateChanged(
          auth,
          (usuario) => {
            if (
              encerrado ||
              !usuario
            ) {
              return;
            }

            encerrado = true;

            window.clearTimeout(
              limite
            );

            cancelar();
            resolve(usuario);
          },
          (erro) => {
            if (encerrado) {
              return;
            }

            encerrado = true;

            window.clearTimeout(
              limite
            );

            cancelar();
            reject(erro);
          }
        );
    }
  );
}


async function precoObterContexto() {
  if (
    PRECO_ESTADO.db &&
    PRECO_ESTADO.usuario &&
    PRECO_ESTADO.familiaId
  ) {
    return PRECO_ESTADO;
  }

  const app =
    await precoAguardarFirebase();

  const auth =
    getAuth(app);

  const db =
    getFirestore(app);

  const usuario =
    await precoAguardarUsuario(
      auth
    );

  const usuarioSnap =
    await getDoc(
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

  PRECO_ESTADO.db = db;
  PRECO_ESTADO.auth = auth;
  PRECO_ESTADO.usuario =
    usuario;
  PRECO_ESTADO.familiaId =
    familiaId;

  return PRECO_ESTADO;
}


function precoReferenciaFamilia() {
  if (
    !PRECO_ESTADO.db ||
    !PRECO_ESTADO.familiaId
  ) {
    return null;
  }

  return doc(
    PRECO_ESTADO.db,
    "familias",
    PRECO_ESTADO.familiaId
  );
}


function precoReferenciaProduto(
  produtoId
) {
  if (
    !PRECO_ESTADO.db ||
    !PRECO_ESTADO.familiaId ||
    !produtoId
  ) {
    return null;
  }

  return doc(
    PRECO_ESTADO.db,
    "familias",
    PRECO_ESTADO.familiaId,
    "produtos",
    produtoId
  );
}


function precoObterIdProdutoDoCard(
  card
) {
  if (!card) {
    return "";
  }

  const check =
    card.querySelector(
      ".check[onclick]"
    );

  const onclick =
    check?.getAttribute(
      "onclick"
    ) || "";

  const resultado =
    onclick.match(
      /alternarComprado\(['"]([^'"]+)['"]\)/
    );

  return resultado?.[1] || "";
}


function precoObterQuantidadeDoCard(
  card
) {
  const elementoQuantidade =
    card?.querySelector(
      ".comprado-num"
    );

  return Math.max(
    0,
    precoNumeroSeguro(
      elementoQuantidade?.textContent,
      0
    )
  );
}


function precoObterValorInput(
  card
) {
  const input =
    card?.querySelector(
      ".controle-precos-input"
    );

  return Math.max(
    0,
    precoNumeroSeguro(
      input?.value,
      0
    )
  );
}


function precoCalcularSubtotalCard(
  card
) {
  const quantidade =
    precoObterQuantidadeDoCard(
      card
    );

  const precoUnitario =
    precoObterValorInput(
      card
    );

  return precoArredondar(
    quantidade * precoUnitario
  );
}


function precoAtualizarSubtotalCard(
  card
) {
  if (!card) {
    return;
  }

  const subtotal =
    precoCalcularSubtotalCard(
      card
    );

  const subtotalElemento =
    card.querySelector(
      ".controle-precos-subtotal-valor"
    );

  if (subtotalElemento) {
    subtotalElemento.textContent =
      precoFormatarMoeda(
        subtotal
      );
  }

  card.dataset.precoSubtotal =
    String(subtotal);
}


function precoCalcularTotal() {
  let total = 0;

  document
    .querySelectorAll(
      "#listaCompras .buy-item"
    )
    .forEach((card) => {
      total +=
        precoCalcularSubtotalCard(
          card
        );
    });

  return precoArredondar(total);
}


function precoAtualizarTotal() {
  const total =
    precoCalcularTotal();

  const valor =
    precoElemento(
      "controlePrecosTotalValor"
    );

  if (valor) {
    valor.textContent =
      precoFormatarMoeda(total);
  }

  const botaoTexto =
    precoElemento(
      "controlePrecosBotaoTexto"
    );

  if (
    botaoTexto &&
    PRECO_ESTADO.ativo
  ) {
    botaoTexto.textContent =
      total > 0
        ? precoFormatarMoeda(total)
        : "Ativo";
  }

  window.dispatchEvent(
    new CustomEvent(
      "listalar:precos-total-alterado",
      {
        detail: {
          total
        }
      }
    )
  );
}


function precoAtualizarTodosCalculos() {
  document
    .querySelectorAll(
      "#listaCompras .buy-item"
    )
    .forEach((card) => {
      precoAtualizarSubtotalCard(
        card
      );
    });

  precoAtualizarTotal();
}


function precoCriarBotao() {
  const resumo =
    document.querySelector(
      "#lista .summary"
    );

  if (!resumo) {
    return false;
  }

  resumo.classList.add(
    "controle-precos-resumo"
  );

  if (
    precoElemento(
      "controlePrecosBotao"
    )
  ) {
    return true;
  }

  const botao =
    document.createElement(
      "button"
    );

  botao.id =
    "controlePrecosBotao";

  botao.type = "button";

  botao.className =
    "controle-precos-botao";

  botao.title =
    "Ativar ou desativar controle de preços";

  botao.setAttribute(
    "aria-label",
    "Controle de preços"
  );

  botao.innerHTML = `
    <strong>💰</strong>

    <span id="controlePrecosBotaoTexto">
      OFF
    </span>
  `;

  botao.addEventListener(
    "click",
    precoAlternarAtivacao
  );

  resumo.appendChild(botao);

  precoAtualizarBotao();

  return true;
}


function precoCriarResumoTotal() {
  const lista =
    precoElemento("lista");

  if (!lista) {
    return false;
  }

  if (
    precoElemento(
      "controlePrecosTotal"
    )
  ) {
    return true;
  }

  const listaCompras =
    precoElemento("listaCompras");

  if (!listaCompras) {
    return false;
  }

  const total =
    document.createElement(
      "div"
    );

  total.id =
    "controlePrecosTotal";

  total.className =
    "controle-precos-total";

  total.innerHTML = `
    <div class="controle-precos-total-texto">
      <strong>
        Total atual da compra
      </strong>

      <span>
        Quantidade comprada × preço unitário
      </span>
    </div>

    <div
      id="controlePrecosTotalValor"
      class="controle-precos-total-valor"
    >
      R$ 0,00
    </div>
  `;

  listaCompras.insertAdjacentElement(
    "afterend",
    total
  );

  return true;
}


function precoAtualizarBotao() {
  const botao =
    precoElemento(
      "controlePrecosBotao"
    );

  const texto =
    precoElemento(
      "controlePrecosBotaoTexto"
    );

  if (!botao || !texto) {
    return;
  }

  botao.classList.toggle(
    "ativo",
    PRECO_ESTADO.ativo
  );

  botao.classList.toggle(
    "carregando",
    !PRECO_ESTADO.carregado ||
    PRECO_ESTADO
      .salvandoConfiguracao
  );

  botao.disabled =
    !PRECO_ESTADO.carregado ||
    PRECO_ESTADO
      .salvandoConfiguracao;

  if (
    PRECO_ESTADO
      .salvandoConfiguracao
  ) {
    texto.textContent =
      "Salvando";
    return;
  }

  if (!PRECO_ESTADO.ativo) {
    texto.textContent = "OFF";
    return;
  }

  const total =
    precoCalcularTotal();

  texto.textContent =
    total > 0
      ? precoFormatarMoeda(total)
      : "Ativo";
}


function precoAtualizarVisibilidade() {
  document
    .querySelectorAll(
      "#listaCompras .controle-precos-area"
    )
    .forEach((area) => {
      area.style.display =
        PRECO_ESTADO.ativo
          ? ""
          : "none";
    });

  const total =
    precoElemento(
      "controlePrecosTotal"
    );

  total?.classList.toggle(
    "ativo",
    PRECO_ESTADO.ativo
  );

  precoAtualizarBotao();

  if (PRECO_ESTADO.ativo) {
    precoAtualizarTodosCalculos();
  }
}


function precoObterPrecoInicial(
  card,
  produtoId
) {
  const precoEmMemoria =
    PRECO_ESTADO
      .precosDigitados
      .get(produtoId);

  if (
    precoEmMemoria !== undefined
  ) {
    return Math.max(
      0,
      precoNumeroSeguro(
        precoEmMemoria,
        0
      )
    );
  }

  const precoDoCard =
    precoNumeroSeguro(
      card.dataset
        .precoCompraAtual,
      0
    );

  if (precoDoCard > 0) {
    PRECO_ESTADO
      .precosDigitados
      .set(
        produtoId,
        precoDoCard
      );

    return precoDoCard;
  }

  const precoDoInputAntigo =
    precoNumeroSeguro(
      card.querySelector(
        ".controle-precos-input"
      )?.value,
      0
    );

  return Math.max(
    precoDoInputAntigo,
    0
  );
}


async function precoSalvarPrecoProduto(
  produtoId,
  valor
) {
  const referencia =
    precoReferenciaProduto(
      produtoId
    );

  if (!referencia) {
    return;
  }

  const precoUnitario =
    precoArredondar(
      Math.max(
        0,
        precoNumeroSeguro(
          valor,
          0
        )
      )
    );

  try {
    await setDoc(
      referencia,
      {
        precoCompraAtual:
          precoUnitario,

        precoCompraAtualizadoEm:
          serverTimestamp(),

        precoCompraAtualizadoPor:
          PRECO_ESTADO.usuario?.uid ||
          ""
      },
      {
        merge: true
      }
    );
  } catch (erro) {
    console.error(
      "ListaLar Preços: erro ao salvar preço:",
      erro
    );

    if (
      typeof window.mostrarMensagem ===
      "function"
    ) {
      await window.mostrarMensagem({
        titulo:
          "Preço não salvo",

        texto:
          "O valor foi calculado na tela, mas não foi possível salvá-lo.",

        tipo:
          "warning"
      });
    }
  }
}


function precoInstalarCampoNoCard(
  card
) {
  if (
    !card ||
    card.querySelector(
      ".controle-precos-area"
    )
  ) {
    return;
  }

  const produtoId =
    precoObterIdProdutoDoCard(
      card
    );

  if (!produtoId) {
    return;
  }

  const controleQuantidade =
    card.querySelector(
      ".comprado-controle"
    );

  if (!controleQuantidade) {
    return;
  }

  const area =
    document.createElement(
      "div"
    );

  area.className =
    "controle-precos-area";

  area.dataset.produtoId =
    produtoId;

  area.innerHTML = `
    <div class="controle-precos-grade">
      <div class="controle-precos-campo">
        <label>
          Preço unitário
        </label>

        <div class="controle-precos-input-wrapper">
          <span class="controle-precos-prefixo">
            R$
          </span>

          <input
            type="text"
            inputmode="decimal"
            autocomplete="off"
            class="controle-precos-input"
            aria-label="Preço unitário"
            placeholder="0,00"
          >
        </div>
      </div>

      <div class="controle-precos-subtotal">
        <label>
          Subtotal
        </label>

        <div class="controle-precos-subtotal-valor">
          R$ 0,00
        </div>
      </div>
    </div>
  `;

  controleQuantidade.insertAdjacentElement(
    "afterend",
    area
  );

  const input =
    area.querySelector(
      ".controle-precos-input"
    );

  const precoInicial =
    precoObterPrecoInicial(
      card,
      produtoId
    );

  PRECO_ESTADO
    .precosDigitados
    .set(
      produtoId,
      precoInicial
    );

  input.value =
    precoFormatarCampo(
      precoInicial
    );

  input.addEventListener(
    "focus",
    () => {
      const numero =
        precoNumeroSeguro(
          input.value,
          0
        );

      input.value =
        numero > 0
          ? String(numero)
              .replace(".", ",")
          : "";
    }
  );

  input.addEventListener(
    "input",
    () => {
      const valor =
        Math.max(
          0,
          precoNumeroSeguro(
            input.value,
            0
          )
        );

      card.dataset
        .precoCompraAtual =
        String(valor);

      PRECO_ESTADO
        .precosDigitados
        .set(
          produtoId,
          valor
        );

      precoAtualizarSubtotalCard(
        card
      );

      precoAtualizarTotal();
    }
  );

  input.addEventListener(
    "blur",
    async () => {
      const valor =
        Math.max(
          0,
          precoNumeroSeguro(
            input.value,
            0
          )
        );

      PRECO_ESTADO
        .precosDigitados
        .set(
          produtoId,
          valor
        );

      card.dataset
        .precoCompraAtual =
        String(valor);

      input.value =
        precoFormatarCampo(
          valor
        );

      precoAtualizarSubtotalCard(
        card
      );

      precoAtualizarTotal();

      await precoSalvarPrecoProduto(
        produtoId,
        valor
      );
    }
  );

  area.style.display =
    PRECO_ESTADO.ativo
      ? ""
      : "none";

  precoAtualizarSubtotalCard(
    card
  );
}


function precoInstalarCamposLista() {
  if (
    PRECO_ESTADO.instalandoCampos
  ) {
    return;
  }

  PRECO_ESTADO.instalandoCampos =
    true;

  try {
    document
      .querySelectorAll(
        "#listaCompras .buy-item"
      )
      .forEach((card) => {
        precoInstalarCampoNoCard(
          card
        );
      });

    precoAtualizarVisibilidade();
  } finally {
    PRECO_ESTADO.instalandoCampos =
      false;
  }
}


function precoObservarLista() {
  const area =
    precoElemento(
      "listaCompras"
    );

  if (
    !area ||
    PRECO_ESTADO.observadorLista
  ) {
    return Boolean(area);
  }

  PRECO_ESTADO.observadorLista =
    new MutationObserver(
      () => {
        window.requestAnimationFrame(
          () => {
            precoInstalarCamposLista();
            precoAtualizarTodosCalculos();
          }
        );
      }
    );

  PRECO_ESTADO
    .observadorLista
    .observe(
      area,
      {
        childList: true,
        subtree: true,
        characterData: true
      }
    );

  return true;
}


async function precoConfirmarAtivacao() {
  if (
    typeof window.confirmarAcao ===
    "function"
  ) {
    return window.confirmarAcao({
      titulo:
        "Ativar controle de preços",

      texto:
        "Essa função é opcional.\n\n" +
        "Ao ativar, os campos de preço aparecerão somente na Lista de Compras e o total será calculado durante a compra.",

      tipo:
        "warning",

      confirmarTexto:
        "Ativar",

      cancelarTexto:
        "Cancelar",

      confirmarClasse:
        "success"
    });
  }

  return window.confirm(
    "Ativar o Controle de Preços?\n\n" +
    "Os campos aparecerão somente na Lista de Compras."
  );
}


async function precoConfirmarDesativacao() {
  if (
    typeof window.confirmarAcao ===
    "function"
  ) {
    return window.confirmarAcao({
      titulo:
        "Desativar controle de preços",

      texto:
        "Os campos de preço serão ocultados.\n\n" +
        "Os valores já informados não serão excluídos.",

      tipo:
        "warning",

      confirmarTexto:
        "Desativar",

      cancelarTexto:
        "Continuar usando",

      confirmarClasse:
        "danger"
    });
  }

  return window.confirm(
    "Deseja desativar o Controle de Preços?"
  );
}


async function precoSalvarConfiguracao(
  ativo
) {
  const referencia =
    precoReferenciaFamilia();

  if (!referencia) {
    throw new Error(
      "FAMILIA_NAO_IDENTIFICADA"
    );
  }

  await setDoc(
    referencia,
    {
      controlarPrecos:
        Boolean(ativo),

      controlePrecosAtualizadoEm:
        serverTimestamp(),

      controlePrecosAtualizadoPor:
        PRECO_ESTADO.usuario?.uid ||
        ""
    },
    {
      merge: true
    }
  );
}


async function precoAlternarAtivacao() {
  if (
    !PRECO_ESTADO.carregado ||
    PRECO_ESTADO
      .salvandoConfiguracao
  ) {
    return;
  }

  const novoEstado =
    !PRECO_ESTADO.ativo;

  const confirmado =
    novoEstado
      ? await precoConfirmarAtivacao()
      : await precoConfirmarDesativacao();

  if (!confirmado) {
    return;
  }

  PRECO_ESTADO
    .salvandoConfiguracao =
    true;

  precoAtualizarBotao();

  try {
    await precoSalvarConfiguracao(
      novoEstado
    );

    PRECO_ESTADO.ativo =
      novoEstado;

    precoAtualizarVisibilidade();

    if (
      typeof window.mostrarMensagem ===
      "function"
    ) {
      await window.mostrarMensagem({
        titulo:
          novoEstado
            ? "Controle de preços ativado"
            : "Controle de preços desativado",

        texto:
          novoEstado
            ? "Agora você pode informar os preços dos produtos na Lista de Compras."
            : "A Lista voltou ao modo simples, sem campos de preço.",

        tipo:
          novoEstado
            ? "success"
            : "info"
      });
    }
  } catch (erro) {
    console.error(
      "ListaLar Preços: erro ao alterar configuração:",
      erro
    );

    if (
      typeof window.mostrarMensagem ===
      "function"
    ) {
      await window.mostrarMensagem({
        titulo:
          "Configuração não salva",

        texto:
          "Não foi possível alterar o Controle de Preços. Verifique sua conexão e as permissões do Firebase.",

        tipo:
          "danger"
      });
    }
  } finally {
    PRECO_ESTADO
      .salvandoConfiguracao =
      false;

    precoAtualizarBotao();
  }
}


function precoEscutarConfiguracaoFamilia() {
  const referencia =
    precoReferenciaFamilia();

  if (!referencia) {
    return;
  }

  if (
    PRECO_ESTADO
      .unsubscribeFamilia
  ) {
    PRECO_ESTADO
      .unsubscribeFamilia();
  }

  PRECO_ESTADO
    .unsubscribeFamilia =
    onSnapshot(
      referencia,
      (snap) => {
        PRECO_ESTADO.ativo =
          snap.exists() &&
          snap.data()
            ?.controlarPrecos ===
            true;

        PRECO_ESTADO.carregado =
          true;

        precoAtualizarVisibilidade();
        precoInstalarCamposLista();
      },
      (erro) => {
        console.error(
          "ListaLar Preços: erro ao acompanhar configuração:",
          erro
        );

        PRECO_ESTADO.ativo =
          false;

        PRECO_ESTADO.carregado =
          true;

        precoAtualizarVisibilidade();
      }
    );
}


function precoExporApiPublica() {
  window.ListaLarPrecos =
    Object.freeze({
      estaAtivo() {
        return PRECO_ESTADO.ativo;
      },

      obterTotalAtual() {
        return precoCalcularTotal();
      },

      recalcular() {
        precoAtualizarTodosCalculos();

        return precoCalcularTotal();
      },

      obterItens() {
        return Array.from(
          document.querySelectorAll(
            "#listaCompras .buy-item"
          )
        ).map((card) => {
          const produtoId =
            precoObterIdProdutoDoCard(
              card
            );

          const nome =
            card.querySelector(
              ".item-name"
            )?.textContent
              ?.replace(/^✅\s*/, "")
              .trim() || "";

          const quantidade =
            precoObterQuantidadeDoCard(
              card
            );

          const precoUnitario =
            precoObterValorInput(
              card
            );

          const subtotal =
            precoCalcularSubtotalCard(
              card
            );

          return {
            produtoId,
            nome,
            quantidade,
            precoUnitario,
            subtotal
          };
        });
      }
    });
}


async function precoInstalar() {
  try {
    precoCriarEstilos();

    let tentativas = 0;

    const aguardarTela = () => {
      tentativas += 1;

      const botaoOk =
        precoCriarBotao();

      const totalOk =
        precoCriarResumoTotal();

      const listaOk =
        precoObservarLista();

      precoInstalarCamposLista();

      if (
        (!botaoOk ||
          !totalOk ||
          !listaOk) &&
        tentativas < 100
      ) {
        window.setTimeout(
          aguardarTela,
          150
        );
      }
    };

    aguardarTela();

    await precoObterContexto();

    precoEscutarConfiguracaoFamilia();

    precoExporApiPublica();
  } catch (erro) {
    console.error(
      "ListaLar Preços: erro durante a instalação:",
      erro
    );

    const botao =
      precoElemento(
        "controlePrecosBotao"
      );

    if (botao) {
      botao.disabled = true;
      botao.title =
        "Controle de preços indisponível";
    }
  }
}


window.addEventListener(
  "beforeunload",
  () => {
    if (
      PRECO_ESTADO
        .unsubscribeFamilia
    ) {
      PRECO_ESTADO
        .unsubscribeFamilia();
    }

    if (
      PRECO_ESTADO
        .observadorLista
    ) {
      PRECO_ESTADO
        .observadorLista
        .disconnect();
    }

    PRECO_ESTADO
      .precosDigitados
      .clear();
  }
);


if (
  document.readyState ===
  "loading"
) {
  document.addEventListener(
    "DOMContentLoaded",
    precoInstalar,
    {
      once: true
    }
  );
} else {
  precoInstalar();
}
