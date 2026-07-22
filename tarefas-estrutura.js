// ==========================================
// ListaLar - Estrutura do Módulo Tarefas
// Arquivo: tarefas-estrutura.js
// Versão: 1.0.0
// ==========================================

(function () {
  "use strict";

  const el = (id) => document.getElementById(id);

  function criarTelaTarefas() {
    if (el("tarefas")) return true;

    const areaPrincipal = document.querySelector("main.app");

    if (!areaPrincipal) return false;

    const secao = document.createElement("section");

    secao.id = "tarefas";
    secao.className = "screen";

    secao.innerHTML = `
      <div class="card tarefas-card-principal">
        <div class="title-row tarefas-cabecalho">
          <div>
            <h2 class="title">Tarefas</h2>

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

        <div
          id="tarefasResumo"
          class="summary"
        >
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
              placeholder="Ex.: Organizar o quarto"
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
              <label for="tarefaPrazo">
                Prazo
              </label>

              <input
                id="tarefaPrazo"
                name="tarefaPrazo"
                type="date"
              >
            </div>
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

          <div class="tarefas-campo">
            <label for="tarefaObservacao">
              Observação
            </label>

            <textarea
              id="tarefaObservacao"
              name="tarefaObservacao"
              rows="3"
              maxlength="500"
              placeholder="Informações adicionais"
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
              type="button"
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
      areaPrincipal.querySelector(".footer");

    if (rodape) {
      areaPrincipal.insertBefore(
        secao,
        rodape
      );
    } else {
      areaPrincipal.appendChild(secao);
    }

    return true;
  }

  function criarBotaoTarefas() {
    if (el("tab-tarefas")) return true;

    const menuInferior =
      document.querySelector(".bottom-nav");

    if (!menuInferior) return false;

    const botao =
      document.createElement("button");

    botao.id = "tab-tarefas";
    botao.className = "tab";
    botao.type = "button";
    botao.hidden = true;
    botao.style.display = "none";

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
      botaoAdmin.parentElement === menuInferior
    ) {
      menuInferior.insertBefore(
        botao,
        botaoAdmin
      );
    } else {
      menuInferior.appendChild(botao);
    }

    return true;
  }

  function ajustarMenu() {
    const menu =
      document.querySelector(".bottom-nav");

    if (!menu) return;

    const quantidade = [
      ...menu.querySelectorAll(".tab")
    ].filter(
      (botao) =>
        !botao.hidden &&
        botao.style.display !== "none"
    ).length;

    menu.style.gridTemplateColumns =
      `repeat(${Math.max(
        quantidade,
        1
      )}, minmax(0, 1fr))`;
  }

  function obterLiberacaoAtual() {
    return (
      typeof window.ListaLarTarefas
        ?.estaLiberado === "function" &&
      window.ListaLarTarefas
        .estaLiberado() === true
    );
  }

  function definirBotaoVisivel(
    liberado
  ) {
    criarBotaoTarefas();

    const botao =
      el("tab-tarefas");

    if (!botao) return;

    botao.hidden =
      liberado !== true;

    botao.style.display =
      liberado === true
        ? ""
        : "none";

    ajustarMenu();
  }

  function abrirTelaTarefas() {
    if (!obterLiberacaoAtual()) return;

    if (
      typeof window.abrirTela ===
      "function"
    ) {
      window.abrirTela("tarefas");
      return;
    }

    document
      .querySelectorAll(".screen")
      .forEach((tela) => {
        tela.classList.remove("active");
      });

    document
      .querySelectorAll(".tab")
      .forEach((aba) => {
        aba.classList.remove("active");
      });

    el("tarefas")
      ?.classList.add("active");

    el("tab-tarefas")
      ?.classList.add("active");

    window.scrollTo({
      top: 0,
      behavior: "auto"
    });
  }

  document.addEventListener(
    "click",
    (evento) => {
      const botao =
        evento.target.closest(
          "#tab-tarefas"
        );

      if (!botao) return;

      abrirTelaTarefas();
    }
  );

  window.addEventListener(
    "listalar:tarefas-pronto",
    (evento) => {
      definirBotaoVisivel(
        evento.detail?.liberado === true
      );
    }
  );

  function garantirEstrutura() {
    criarTelaTarefas();
    criarBotaoTarefas();

    definirBotaoVisivel(
      obterLiberacaoAtual()
    );
  }

  const observador =
    new MutationObserver(() => {
      const semTela =
        !el("tarefas");

      const semBotao =
        !el("tab-tarefas");

      if (semTela || semBotao) {
        garantirEstrutura();
        return;
      }

      definirBotaoVisivel(
        obterLiberacaoAtual()
      );
    });

  function iniciar() {
    garantirEstrutura();

    observador.observe(
      document.body,
      {
        childList: true,
        subtree: true
      }
    );
  }

  if (
    document.readyState === "loading"
  ) {
    document.addEventListener(
      "DOMContentLoaded",
      iniciar,
      { once: true }
    );
  } else {
    iniciar();
  }
})();
