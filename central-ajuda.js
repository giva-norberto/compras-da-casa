// ============================================================
// ListaLar - central-ajuda.js
//
// Central de Ajuda independente.
// Não altera a lógica do index.html.
// Cria:
// - botão flutuante de ajuda;
// - categorias clicáveis;
// - instruções das principais funções;
// - orientações para Android e iPhone;
// - configuração do microfone no iPhone;
// - acesso ao WhatsApp de suporte.
// ============================================================

const CENTRAL_AJUDA = {
  aberta: false,
  categoriaAtual: null
};


const AJUDA_CATEGORIAS = [
  {
    id: "primeiros-passos",
    icone: "🚀",
    titulo: "Primeiros passos",
    descricao: "Conta, login e início de utilização.",
    conteudo: `
      <h3>🚀 Primeiros passos</h3>

      <p>
        O ListaLar ajuda sua família a organizar a lista de compras
        e o estoque doméstico em um único lugar.
      </p>

      <h4>1. Entrar no aplicativo</h4>

      <p>
        Toque em <strong>Entrar com Google</strong> e selecione sua
        conta.
      </p>

      <h4>2. Criar ou entrar em uma família</h4>

      <p>
        No primeiro acesso, você poderá criar sua própria família ou
        entrar por meio de um convite recebido.
      </p>

      <h4>3. Começar a usar</h4>

      <p>
        Depois do login, você poderá cadastrar produtos, criar a lista
        de compras, controlar o estoque e compartilhar tudo com sua
        família.
      </p>
    `
  },

  {
    id: "lista-compras",
    icone: "🛒",
    titulo: "Lista de compras",
    descricao: "Adicionar, editar e concluir compras.",
    conteudo: `
      <h3>🛒 Lista de compras</h3>

      <h4>Adicionar um produto</h4>

      <p>
        Digite o nome do produto, informe a quantidade e toque em
        <strong>Incluir na lista</strong>.
      </p>

      <h4>Adicionar por voz</h4>

      <p>
        Toque no botão de microfone ao lado de
        <strong>Incluir na lista</strong> e fale os produtos
        naturalmente.
      </p>

      <h4>Editar um produto</h4>

      <p>
        Utilize os controles disponíveis no item para ajustar a
        quantidade ou os dados do produto.
      </p>

      <h4>Remover um produto</h4>

      <p>
        Toque na opção de excluir do item que deseja retirar da lista.
      </p>

      <h4>Finalizar a compra</h4>

      <p>
        Marque os produtos comprados e finalize a compra. O ListaLar
        poderá atualizar o estoque com as quantidades adquiridas.
      </p>
    `
  },

  {
    id: "comandos-voz",
    icone: "🎤",
    titulo: "Comandos por voz",
    descricao: "Crie listas e atualize o estoque falando.",
    conteudo: `
      <h3>🎤 Comandos por voz</h3>

      <p>
        Toque no microfone e fale naturalmente. O ListaLar identifica
        os produtos, quantidades e unidades.
      </p>

      <h4>Exemplos para a lista</h4>

      <div class="central-ajuda-exemplos">
        <p>“Comprar dois feijões e um arroz.”</p>
        <p>“Colocar leite, café e açúcar na lista.”</p>
        <p>“Preciso de três macarrões e dois detergentes.”</p>
      </div>

      <h4>Exemplos para o estoque</h4>

      <div class="central-ajuda-exemplos">
        <p>“Tenho cinco leites.”</p>
        <p>“Cadastrar dois feijões e três açúcares.”</p>
        <p>“Acabou o café.”</p>
      </div>

      <h4>Revisão antes de salvar</h4>

      <p>
        Depois do reconhecimento, confira os produtos, quantidades e
        unidades. Você pode corrigir qualquer informação antes de
        salvar.
      </p>

      <div class="central-ajuda-aviso">
        Fale de forma clara e faça uma pequena pausa entre os produtos
        quando necessário.
      </div>
    `
  },

  {
    id: "estoque",
    icone: "📦",
    titulo: "Estoque doméstico",
    descricao: "Quantidades atuais, mínimas e lista automática.",
    conteudo: `
      <h3>📦 Estoque doméstico</h3>

      <h4>Quantidade atual</h4>

      <p>
        Informe quanto existe de cada produto em sua casa.
      </p>

      <h4>Estoque mínimo</h4>

      <p>
        O estoque mínimo representa a quantidade que você deseja
        manter disponível.
      </p>

      <h4>Lista automática</h4>

      <p>
        Quando a quantidade atual fica abaixo do mínimo definido, o
        ListaLar pode sugerir automaticamente a quantidade necessária
        para reposição.
      </p>

      <h4>Atualizar por voz</h4>

      <p>
        Toque no microfone ao lado de
        <strong>Atualizar Estoque</strong> e informe os produtos e as
        quantidades.
      </p>
    `
  },

  {
    id: "familia",
    icone: "👨‍👩‍👧",
    titulo: "Minha família",
    descricao: "Convites e compartilhamento em tempo real.",
    conteudo: `
      <h3>👨‍👩‍👧 Minha família</h3>

      <p>
        Todos os integrantes da família podem acompanhar a mesma lista
        e o mesmo estoque.
      </p>

      <h4>Convidar uma pessoa</h4>

      <p>
        Abra a área <strong>Minha Família</strong>, gere o convite e
        compartilhe o link pelo WhatsApp ou outro aplicativo.
      </p>

      <h4>Entrar por convite</h4>

      <p>
        A pessoa convidada deve abrir o link e entrar com sua conta
        Google.
      </p>

      <h4>Sincronização</h4>

      <p>
        As alterações realizadas por um integrante aparecem para os
        demais em tempo real.
      </p>

      <div class="central-ajuda-aviso">
        Os familiares convidados utilizam a família compartilhada sem
        cobrança individual.
      </div>
    `
  },

  {
    id: "instalacao",
    icone: "📱",
    titulo: "Instalar no celular",
    descricao: "Use o ListaLar como um aplicativo.",
    conteudo: `
      <h3>📱 Instalar no celular</h3>

      <h4>Android</h4>

      <ol>
        <li>Abra o ListaLar no navegador Chrome.</li>
        <li>Abra o menu do navegador.</li>
        <li>Toque em <strong>Instalar aplicativo</strong> ou
          <strong>Adicionar à tela inicial</strong>.</li>
        <li>Confirme a instalação.</li>
      </ol>

      <h4>iPhone</h4>

      <ol>
        <li>Abra o ListaLar no Safari.</li>
        <li>Toque no botão de compartilhamento.</li>
        <li>Escolha <strong>Adicionar à Tela de Início</strong>.</li>
        <li>Confirme tocando em <strong>Adicionar</strong>.</li>
      </ol>

      <p>
        Depois disso, o ícone do ListaLar aparecerá junto aos seus
        outros aplicativos.
      </p>
    `
  },

  {
    id: "iphone-microfone",
    icone: "🍎",
    titulo: "Microfone no iPhone",
    descricao: "Evite pedidos repetidos de permissão.",
    conteudo: `
      <h3>🍎 Configurar o microfone no iPhone</h3>

      <p>
        Caso o iPhone solicite autorização para o microfone toda vez
        que o ListaLar for aberto, faça esta configuração:
      </p>

      <ol>
        <li>Abra os <strong>Ajustes</strong> do iPhone.</li>
        <li>Entre em <strong>Apps</strong>.</li>
        <li>Selecione <strong>Safari</strong>.</li>
        <li>Toque em <strong>Microfone</strong>.</li>
        <li>Selecione <strong>Permitir</strong>.</li>
      </ol>

      <div class="central-ajuda-destaque">
        Caminho:
        <strong>
          Ajustes → Apps → Safari → Microfone → Permitir
        </strong>
      </div>

      <p>
        Após essa alteração, o ListaLar poderá utilizar o microfone
        sem solicitar a mesma autorização repetidamente.
      </p>
    `
  },

  {
    id: "atualizacoes",
    icone: "🔄",
    titulo: "Atualizações",
    descricao: "Como receber as novas versões.",
    conteudo: `
      <h3>🔄 Atualizações do ListaLar</h3>

      <p>
        O ListaLar verifica periodicamente se existe uma nova versão
        disponível.
      </p>

      <p>
        Quando uma atualização for identificada, siga a orientação
        mostrada na tela para carregar a versão mais recente.
      </p>

      <h4>Não é necessário reinstalar</h4>

      <p>
        Na maioria das atualizações, você não precisa excluir ou
        instalar novamente o aplicativo.
      </p>

      <div class="central-ajuda-aviso">
        Mantenha conexão com a internet durante a atualização.
      </div>
    `
  },

  {
    id: "perguntas",
    icone: "❓",
    titulo: "Perguntas frequentes",
    descricao: "Respostas rápidas sobre o ListaLar.",
    conteudo: `
      <h3>❓ Perguntas frequentes</h3>

      <h4>O ListaLar é gratuito?</h4>

      <p>
        O aplicativo está disponível gratuitamente durante sua fase
        Beta.
      </p>

      <h4>Preciso instalar?</h4>

      <p>
        Não. Você pode usar pelo navegador ou instalar na tela inicial
        para ter uma experiência semelhante à de um aplicativo.
      </p>

      <h4>Minha família precisa criar outra lista?</h4>

      <p>
        Não. Ao entrar pelo convite, todos passam a utilizar a mesma
        lista e o mesmo estoque.
      </p>

      <h4>Posso cadastrar produtos novos pelo áudio?</h4>

      <p>
        Sim. Depois do reconhecimento, o produto novo será identificado
        na tela de revisão antes de ser salvo.
      </p>

      <h4>O que acontece se o áudio entender algo errado?</h4>

      <p>
        Você pode editar o nome, a quantidade e a unidade antes de
        confirmar.
      </p>

      <h4>Meus dados ficam sincronizados?</h4>

      <p>
        Sim. As informações ficam sincronizadas entre os integrantes
        da mesma família.
      </p>
    `
  }
];


function centralAjudaElemento(id) {
  return document.getElementById(id);
}


function centralAjudaCriarEstilos() {
  if (centralAjudaElemento("centralAjudaCss")) {
    return;
  }

  const estilo = document.createElement("style");

  estilo.id = "centralAjudaCss";

  estilo.textContent = `
    .central-ajuda-botao {
      position: fixed;
      right: 16px;
      bottom: calc(88px + env(safe-area-inset-bottom, 0px));
      z-index: 9000;
      width: 52px;
      height: 52px;
      padding: 0;
      display: grid;
      place-items: center;
      border: 0;
      border-radius: 50%;
      background: linear-gradient(135deg, #2563eb, #06b6d4);
      color: #ffffff;
      font-size: 25px;
      font-weight: 900;
      cursor: pointer;
      box-shadow: 0 10px 25px rgba(37, 99, 235, 0.30);
      -webkit-tap-highlight-color: transparent;
    }

    .central-ajuda-botao:active {
      transform: scale(0.96);
    }

    .central-ajuda-fundo {
      position: fixed;
      inset: 0;
      z-index: 10000;
      display: none;
      align-items: flex-end;
      justify-content: center;
      padding: 0;
      background: rgba(15, 23, 42, 0.62);
      backdrop-filter: blur(5px);
    }

    .central-ajuda-fundo.aberto {
      display: flex;
    }

    .central-ajuda-painel {
      width: 100%;
      max-width: 620px;
      max-height: 94vh;
      max-height: 94dvh;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      border-radius: 25px 25px 0 0;
      background: #f8fafc;
      color: #172033;
      box-shadow: 0 -20px 60px rgba(15, 23, 42, 0.30);
    }

    .central-ajuda-topo {
      flex: 0 0 auto;
      padding: 18px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      color: #ffffff;
      background: linear-gradient(135deg, #2563eb, #06b6d4);
    }

    .central-ajuda-topo-texto {
      min-width: 0;
    }

    .central-ajuda-topo h2 {
      margin: 0;
      font-size: 21px;
      font-weight: 900;
    }

    .central-ajuda-topo p {
      margin: 4px 0 0;
      color: rgba(255, 255, 255, 0.90);
      font-size: 12px;
      font-weight: 700;
    }

    .central-ajuda-fechar {
      width: 40px;
      height: 40px;
      flex: 0 0 40px;
      padding: 0;
      border: 1px solid rgba(255, 255, 255, 0.45);
      border-radius: 13px;
      background: rgba(255, 255, 255, 0.14);
      color: #ffffff;
      font-size: 24px;
      font-weight: 900;
      cursor: pointer;
    }

    .central-ajuda-corpo {
      min-height: 0;
      flex: 1 1 auto;
      padding: 15px;
      overflow-y: auto;
      overscroll-behavior: contain;
    }

    .central-ajuda-inicio {
      display: block;
    }

    .central-ajuda-inicio.oculto {
      display: none;
    }

    .central-ajuda-introducao {
      margin-bottom: 13px;
      padding: 15px;
      border: 1px solid #bfdbfe;
      border-radius: 17px;
      background: #eff6ff;
    }

    .central-ajuda-introducao strong {
      display: block;
      color: #1d4ed8;
      font-size: 15px;
    }

    .central-ajuda-introducao p {
      margin: 5px 0 0;
      color: #475569;
      font-size: 13px;
      font-weight: 700;
      line-height: 1.45;
    }

    .central-ajuda-busca {
      width: 100%;
      min-height: 48px;
      margin-bottom: 13px;
      padding: 0 14px;
      border: 2px solid #dbeafe;
      border-radius: 14px;
      outline: none;
      background: #ffffff;
      color: #172033;
      font-size: 14px;
      font-weight: 700;
      box-sizing: border-box;
    }

    .central-ajuda-busca:focus {
      border-color: #2563eb;
      box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.10);
    }

    .central-ajuda-categorias {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 10px;
    }

    .central-ajuda-categoria {
      min-width: 0;
      min-height: 105px;
      padding: 14px;
      display: flex;
      align-items: flex-start;
      gap: 11px;
      border: 1px solid #dbeafe;
      border-radius: 17px;
      background: #ffffff;
      color: #172033;
      text-align: left;
      cursor: pointer;
      box-shadow: 0 5px 14px rgba(15, 23, 42, 0.06);
    }

    .central-ajuda-categoria:active {
      transform: scale(0.985);
    }

    .central-ajuda-categoria-icone {
      width: 42px;
      height: 42px;
      flex: 0 0 42px;
      display: grid;
      place-items: center;
      border-radius: 14px;
      background: #eff6ff;
      font-size: 21px;
    }

    .central-ajuda-categoria-texto {
      min-width: 0;
    }

    .central-ajuda-categoria strong {
      display: block;
      font-size: 13px;
      font-weight: 900;
      line-height: 1.25;
    }

    .central-ajuda-categoria span {
      display: block;
      margin-top: 5px;
      color: #64748b;
      font-size: 11px;
      font-weight: 700;
      line-height: 1.35;
    }

    .central-ajuda-sem-resultado {
      grid-column: 1 / -1;
      padding: 25px;
      border: 1px dashed #bfdbfe;
      border-radius: 16px;
      color: #64748b;
      text-align: center;
      font-size: 13px;
      font-weight: 800;
    }

    .central-ajuda-detalhe {
      display: none;
    }

    .central-ajuda-detalhe.aberto {
      display: block;
    }

    .central-ajuda-voltar {
      min-height: 42px;
      margin-bottom: 12px;
      padding: 8px 13px;
      border: 0;
      border-radius: 12px;
      background: #e0e7ff;
      color: #3730a3;
      font-size: 13px;
      font-weight: 900;
      cursor: pointer;
    }

    .central-ajuda-conteudo {
      padding: 17px;
      border: 1px solid #dbeafe;
      border-radius: 18px;
      background: #ffffff;
      box-shadow: 0 5px 14px rgba(15, 23, 42, 0.05);
    }

    .central-ajuda-conteudo h3 {
      margin: 0 0 15px;
      color: #1e3a8a;
      font-size: 21px;
      font-weight: 900;
    }

    .central-ajuda-conteudo h4 {
      margin: 17px 0 6px;
      color: #172033;
      font-size: 15px;
      font-weight: 900;
    }

    .central-ajuda-conteudo p {
      margin: 0 0 10px;
      color: #475569;
      font-size: 14px;
      font-weight: 600;
      line-height: 1.55;
    }

    .central-ajuda-conteudo ol,
    .central-ajuda-conteudo ul {
      margin: 8px 0 13px;
      padding-left: 22px;
      color: #475569;
      font-size: 14px;
      font-weight: 600;
      line-height: 1.55;
    }

    .central-ajuda-conteudo li {
      margin-bottom: 7px;
    }

    .central-ajuda-exemplos {
      display: grid;
      gap: 8px;
      margin: 8px 0 14px;
    }

    .central-ajuda-exemplos p {
      margin: 0;
      padding: 11px;
      border-left: 4px solid #2563eb;
      border-radius: 0 12px 12px 0;
      background: #eff6ff;
      color: #1e3a8a;
      font-weight: 800;
    }

    .central-ajuda-aviso,
    .central-ajuda-destaque {
      margin-top: 14px;
      padding: 13px;
      border-radius: 14px;
      font-size: 13px;
      font-weight: 800;
      line-height: 1.45;
    }

    .central-ajuda-aviso {
      border: 1px solid #fde68a;
      background: #fef3c7;
      color: #92400e;
    }

    .central-ajuda-destaque {
      border: 1px solid #86efac;
      background: #dcfce7;
      color: #166534;
    }

    .central-ajuda-rodape {
      flex: 0 0 auto;
      padding: 12px 15px calc(12px + env(safe-area-inset-bottom, 0px));
      border-top: 1px solid #dbeafe;
      background: #ffffff;
    }

    .central-ajuda-whatsapp {
      width: 100%;
      min-height: 48px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      border: 0;
      border-radius: 15px;
      background: #16a34a;
      color: #ffffff;
      text-decoration: none;
      font-size: 14px;
      font-weight: 900;
    }

    @media (min-width: 700px) {
      .central-ajuda-fundo {
        align-items: center;
        padding: 18px;
      }

      .central-ajuda-painel {
        max-height: min(760px, calc(100vh - 36px));
        border-radius: 25px;
      }

      .central-ajuda-botao {
        bottom: 24px;
      }
    }

    @media (max-width: 430px) {
      .central-ajuda-categorias {
        grid-template-columns: 1fr;
      }

      .central-ajuda-categoria {
        min-height: auto;
      }
    }
  `;

  document.head.appendChild(estilo);
}


function centralAjudaCriarInterface() {
  if (centralAjudaElemento("centralAjudaFundo")) {
    return;
  }

  const botao = document.createElement("button");

  botao.id = "centralAjudaBotao";
  botao.type = "button";
  botao.className = "central-ajuda-botao";
  botao.textContent = "?";
  botao.title = "Central de Ajuda";
  botao.setAttribute(
    "aria-label",
    "Abrir Central de Ajuda"
  );

  botao.addEventListener(
    "click",
    centralAjudaAbrir
  );

  document.body.appendChild(botao);

  const fundo = document.createElement("div");

  fundo.id = "centralAjudaFundo";
  fundo.className = "central-ajuda-fundo";

  fundo.innerHTML = `
    <section
      class="central-ajuda-painel"
      role="dialog"
      aria-modal="true"
      aria-labelledby="centralAjudaTitulo"
    >
      <header class="central-ajuda-topo">
        <div class="central-ajuda-topo-texto">
          <h2 id="centralAjudaTitulo">
            ❓ Central de Ajuda
          </h2>

          <p>
            Aprenda a utilizar todas as funções do ListaLar.
          </p>
        </div>

        <button
          id="centralAjudaFechar"
          class="central-ajuda-fechar"
          type="button"
          aria-label="Fechar Central de Ajuda"
        >
          ×
        </button>
      </header>

      <main class="central-ajuda-corpo">
        <div
          id="centralAjudaInicio"
          class="central-ajuda-inicio"
        >
          <div class="central-ajuda-introducao">
            <strong>Como podemos ajudar?</strong>

            <p>
              Escolha uma função abaixo ou pesquise pelo assunto.
            </p>
          </div>

          <input
            id="centralAjudaBusca"
            class="central-ajuda-busca"
            type="search"
            placeholder="🔎 Buscar na ajuda"
            autocomplete="off"
          >

          <div
            id="centralAjudaCategorias"
            class="central-ajuda-categorias"
          ></div>
        </div>

        <div
          id="centralAjudaDetalhe"
          class="central-ajuda-detalhe"
        >
          <button
            id="centralAjudaVoltar"
            class="central-ajuda-voltar"
            type="button"
          >
            ← Voltar para os assuntos
          </button>

          <article
            id="centralAjudaConteudo"
            class="central-ajuda-conteudo"
          ></article>
        </div>
      </main>

      <footer class="central-ajuda-rodape">
        <a
          class="central-ajuda-whatsapp"
          href="https://wa.me/5531982967250?text=Olá!%20Preciso%20de%20ajuda%20com%20o%20ListaLar."
          target="_blank"
          rel="noopener noreferrer"
        >
          💬 Falar com o suporte
        </a>
      </footer>
    </section>
  `;

  document.body.appendChild(fundo);

  centralAjudaElemento("centralAjudaFechar")
    .addEventListener(
      "click",
      centralAjudaFechar
    );

  centralAjudaElemento("centralAjudaVoltar")
    .addEventListener(
      "click",
      centralAjudaMostrarInicio
    );

  centralAjudaElemento("centralAjudaBusca")
    .addEventListener(
      "input",
      (evento) => {
        centralAjudaRenderizarCategorias(
          evento.target.value
        );
      }
    );

  fundo.addEventListener(
    "click",
    (evento) => {
      if (evento.target === fundo) {
        centralAjudaFechar();
      }
    }
  );

  document.addEventListener(
    "keydown",
    (evento) => {
      if (
        evento.key === "Escape" &&
        CENTRAL_AJUDA.aberta
      ) {
        centralAjudaFechar();
      }
    }
  );

  centralAjudaRenderizarCategorias();
}


function centralAjudaNormalizarTexto(texto) {
  return String(texto || "")
    .toLocaleLowerCase("pt-BR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}


function centralAjudaRenderizarCategorias(
  busca = ""
) {
  const area = centralAjudaElemento(
    "centralAjudaCategorias"
  );

  if (!area) {
    return;
  }

  const termo = centralAjudaNormalizarTexto(busca);

  const categoriasFiltradas =
    AJUDA_CATEGORIAS.filter((categoria) => {
      if (!termo) {
        return true;
      }

      const conteudoPesquisa =
        centralAjudaNormalizarTexto(
          `${categoria.titulo}
           ${categoria.descricao}
           ${categoria.conteudo}`
        );

      return conteudoPesquisa.includes(termo);
    });

  if (categoriasFiltradas.length === 0) {
    area.innerHTML = `
      <div class="central-ajuda-sem-resultado">
        Nenhum assunto encontrado.
      </div>
    `;

    return;
  }

  area.innerHTML = categoriasFiltradas
    .map(
      (categoria) => `
        <button
          type="button"
          class="central-ajuda-categoria"
          data-ajuda-categoria="${categoria.id}"
        >
          <span class="central-ajuda-categoria-icone">
            ${categoria.icone}
          </span>

          <span class="central-ajuda-categoria-texto">
            <strong>
              ${categoria.titulo}
            </strong>

            <span>
              ${categoria.descricao}
            </span>
          </span>
        </button>
      `
    )
    .join("");

  area
    .querySelectorAll("[data-ajuda-categoria]")
    .forEach((botaoCategoria) => {
      botaoCategoria.addEventListener(
        "click",
        () => {
          centralAjudaAbrirCategoria(
            botaoCategoria.dataset.ajudaCategoria
          );
        }
      );
    });
}


function centralAjudaAbrirCategoria(idCategoria) {
  const categoria = AJUDA_CATEGORIAS.find(
    (item) => item.id === idCategoria
  );

  if (!categoria) {
    return;
  }

  CENTRAL_AJUDA.categoriaAtual = idCategoria;

  const inicio = centralAjudaElemento(
    "centralAjudaInicio"
  );

  const detalhe = centralAjudaElemento(
    "centralAjudaDetalhe"
  );

  const conteudo = centralAjudaElemento(
    "centralAjudaConteudo"
  );

  inicio?.classList.add("oculto");
  detalhe?.classList.add("aberto");

  if (conteudo) {
    conteudo.innerHTML = categoria.conteudo;
  }

  const corpo = detalhe?.closest(
    ".central-ajuda-corpo"
  );

  if (corpo) {
    corpo.scrollTop = 0;
  }
}


function centralAjudaMostrarInicio() {
  CENTRAL_AJUDA.categoriaAtual = null;

  centralAjudaElemento("centralAjudaInicio")
    ?.classList.remove("oculto");

  centralAjudaElemento("centralAjudaDetalhe")
    ?.classList.remove("aberto");

  const busca = centralAjudaElemento(
    "centralAjudaBusca"
  );

  if (busca) {
    busca.value = "";
  }

  centralAjudaRenderizarCategorias();

  const corpo = centralAjudaElemento(
    "centralAjudaInicio"
  )?.closest(".central-ajuda-corpo");

  if (corpo) {
    corpo.scrollTop = 0;
  }
}


function centralAjudaAbrir(
  categoriaInicial = null
) {
  const fundo = centralAjudaElemento(
    "centralAjudaFundo"
  );

  if (!fundo) {
    return;
  }

  CENTRAL_AJUDA.aberta = true;

  fundo.classList.add("aberto");

  document.body.style.overflow = "hidden";

  if (categoriaInicial) {
    centralAjudaAbrirCategoria(
      categoriaInicial
    );
  } else {
    centralAjudaMostrarInicio();
  }
}


function centralAjudaFechar() {
  CENTRAL_AJUDA.aberta = false;

  centralAjudaElemento("centralAjudaFundo")
    ?.classList.remove("aberto");

  document.body.style.overflow = "";
}


function centralAjudaInstalar() {
  centralAjudaCriarEstilos();
  centralAjudaCriarInterface();
}


window.abrirCentralAjuda = (
  categoria = null
) => {
  centralAjudaAbrir(categoria);
};


window.fecharCentralAjuda = () => {
  centralAjudaFechar();
};


window.ListaLarAjuda = Object.freeze({
  abrir: centralAjudaAbrir,
  fechar: centralAjudaFechar,
  abrirCategoria: centralAjudaAbrirCategoria,
  instalar: centralAjudaInstalar
});


if (document.readyState === "loading") {
  document.addEventListener(
    "DOMContentLoaded",
    centralAjudaInstalar,
    {
      once: true
    }
  );
} else {
  centralAjudaInstalar();
}
