// ============================================================
// ListaLar - central-ajuda.js
// Versão 2.0.0
//
// Central de Ajuda independente e completa.
// Mantém o botão flutuante já publicado.
// Não altera as regras nem as funções do index.html.
//
// Conteúdo incluído:
// - formas de uso: lista manual e lista automática;
// - primeiro acesso;
// - lista manual;
// - comandos por voz;
// - cadastro, pesquisa e atualização do estoque;
// - campos Atual, Mínimo e Comprar;
// - unidades de medida;
// - uso durante as compras;
// - finalizar e cancelar compra;
// - exclusão de produtos;
// - tela IA;
// - compartilhamento familiar;
// - instalação no Android e iPhone;
// - microfone no iPhone;
// - atualização do aplicativo;
// - ciclo automático;
// - perguntas frequentes;
// - suporte por WhatsApp.
// ============================================================

const CENTRAL_AJUDA = {
  aberta: false,
  categoriaAtual: null,
  overflowAnterior: "",
  elementoFocadoAnterior: null
};


const AJUDA_CATEGORIAS = [
  {
    id: "como-usar",
    icone: "🏠",
    titulo: "Como você pode usar",
    descricao: "Escolha entre lista manual, automática ou as duas.",
    conteudo: `
      <h3>🏠 Como você pode usar o ListaLar</h3>

      <p>
        O ListaLar permite escolher a forma mais simples ou mais
        completa de organizar as compras da sua casa.
      </p>

      <div class="central-ajuda-escolhas">
        <div class="central-ajuda-escolha">
          <strong>📝 Opção 1 — Lista Manual</strong>

          <p>
            Para quem deseja somente escrever o que precisa comprar,
            marcar os itens durante a compra e finalizar.
          </p>
        </div>

        <div class="central-ajuda-escolha">
          <strong>📦 Opção 2 — Lista Automática</strong>

          <p>
            Para quem deseja controlar o estoque da casa e deixar o
            ListaLar calcular automaticamente o que falta comprar.
          </p>
        </div>

        <div class="central-ajuda-escolha">
          <strong>🔄 Opção 3 — Usar as duas formas</strong>

          <p>
            Você também pode misturar produtos adicionados manualmente
            com produtos gerados pelo controle de estoque. Todos podem
            aparecer juntos na mesma lista.
          </p>
        </div>
      </div>

      <div class="central-ajuda-destaque">
        Você não é obrigado a controlar o estoque. É possível usar
        somente a Lista Manual.
      </div>
    `
  },

  {
    id: "primeiros-passos",
    icone: "🔐",
    titulo: "Primeiro acesso",
    descricao: "Login com Google, criação da família e início.",
    conteudo: `
      <h3>🔐 Primeiro acesso</h3>

      <div class="central-ajuda-passos">
        <div class="central-ajuda-passo">
          <span class="central-ajuda-passo-numero">1</span>

          <div>
            <strong>Entre com sua conta Google</strong>

            <p>
              Toque em <strong>Entrar com Google</strong> e escolha
              a conta que deseja utilizar.
            </p>
          </div>
        </div>

        <div class="central-ajuda-passo">
          <span class="central-ajuda-passo-numero">2</span>

          <div>
            <strong>Crie sua família</strong>

            <p>
              No primeiro acesso, informe um nome para o grupo
              familiar, como <strong>Família Silva</strong>.
            </p>
          </div>
        </div>

        <div class="central-ajuda-passo">
          <span class="central-ajuda-passo-numero">3</span>

          <div>
            <strong>Comece a organizar suas compras</strong>

            <p>
              Depois do login, você poderá criar a lista, cadastrar
              produtos, controlar o estoque e convidar familiares.
            </p>
          </div>
        </div>
      </div>

      <div class="central-ajuda-destaque">
        Depois do primeiro acesso, o ListaLar normalmente permanece
        conectado no mesmo navegador ou aplicativo instalado.
      </div>
    `
  },

  {
    id: "lista-manual",
    icone: "📝",
    titulo: "Lista Manual",
    descricao: "Adicione produtos sem precisar controlar estoque.",
    conteudo: `
      <h3>📝 Usar somente a Lista Manual</h3>

      <p>
        Não é obrigatório controlar o estoque. Você pode usar o
        ListaLar apenas como uma lista de compras compartilhada.
      </p>

      <div class="central-ajuda-passos">
        <div class="central-ajuda-passo">
          <span class="central-ajuda-passo-numero">1</span>

          <div>
            <strong>Abra a tela Lista</strong>

            <p>
              A tela Lista é a primeira tela exibida ao abrir o
              aplicativo.
            </p>
          </div>
        </div>

        <div class="central-ajuda-passo">
          <span class="central-ajuda-passo-numero">2</span>

          <div>
            <strong>Digite o produto</strong>

            <p>
              Use o campo <strong>Adicionar compra manual</strong>
              e informe o nome do produto.
            </p>
          </div>
        </div>

        <div class="central-ajuda-passo">
          <span class="central-ajuda-passo-numero">3</span>

          <div>
            <strong>Informe a quantidade</strong>

            <p>
              Escolha quanto deseja comprar e toque em
              <strong>Incluir na lista</strong>.
            </p>
          </div>
        </div>

        <div class="central-ajuda-passo">
          <span class="central-ajuda-passo-numero">4</span>

          <div>
            <strong>Marque durante a compra</strong>

            <p>
              No mercado, toque no quadrado ao lado do produto para
              marcar o item como <strong>OK</strong>.
            </p>
          </div>
        </div>
      </div>

      <div class="central-ajuda-aviso">
        Quando o produto já existe no estoque, o ListaLar reutiliza o
        cadastro existente. Ele também evita nomes duplicados por
        diferenças de letras maiúsculas, minúsculas ou acentos.
      </div>
    `
  },

  {
    id: "comandos-voz",
    icone: "🎤",
    titulo: "Comandos por voz",
    descricao: "Crie a lista e atualize o estoque falando.",
    conteudo: `
      <h3>🎤 Comandos por voz</h3>

      <p>
        Toque no botão do microfone e fale naturalmente. O ListaLar
        identifica produtos, quantidades e unidades de medida.
      </p>

      <h4>Adicionar produtos à lista</h4>

      <div class="central-ajuda-exemplos">
        <p>“Comprar dois feijões e um arroz.”</p>
        <p>“Adicionar leite, café e açúcar.”</p>
        <p>“Preciso de três macarrões e dois detergentes.”</p>
      </div>

      <h4>Atualizar produtos do estoque</h4>

      <div class="central-ajuda-exemplos">
        <p>“Tenho cinco leites.”</p>
        <p>“Cadastrar dois feijões e três açúcares.”</p>
        <p>“Acabou o café.”</p>
      </div>

      <h4>Revisar antes de salvar</h4>

      <p>
        Depois do reconhecimento, confira os produtos, quantidades e
        unidades. Você pode corrigir qualquer informação ou remover um
        item antes de confirmar.
      </p>

      <div class="central-ajuda-destaque">
        É possível falar vários produtos no mesmo comando. Fale de
        forma clara e faça uma pequena pausa entre eles quando
        necessário.
      </div>
    `
  },

  {
    id: "cadastrar-estoque",
    icone: "📦",
    titulo: "Cadastrar no Estoque",
    descricao: "Inclua os produtos controlados pela família.",
    conteudo: `
      <h3>📦 Cadastrar produtos no Estoque</h3>

      <p>
        A tela Estoque reúne todos os produtos controlados pela
        família.
      </p>

      <div class="central-ajuda-passos">
        <div class="central-ajuda-passo">
          <span class="central-ajuda-passo-numero">1</span>

          <div>
            <strong>Abra a aba Estoque</strong>

            <p>
              Toque no botão <strong>Estoque</strong> localizado na
              parte inferior da tela.
            </p>
          </div>
        </div>

        <div class="central-ajuda-passo">
          <span class="central-ajuda-passo-numero">2</span>

          <div>
            <strong>Digite o nome do produto</strong>

            <p>
              Use o campo <strong>Novo produto</strong> e toque em
              <strong>Adicionar</strong>.
            </p>
          </div>
        </div>

        <div class="central-ajuda-passo">
          <span class="central-ajuda-passo-numero">3</span>

          <div>
            <strong>Defina as quantidades</strong>

            <p>
              Depois, use <strong>Atualizar estoque</strong> para
              informar quanto existe em casa e quanto deseja manter.
            </p>
          </div>
        </div>
      </div>

      <div class="central-ajuda-aviso">
        Ao tentar cadastrar um nome que já existe, o ListaLar avisa
        que o produto já está cadastrado.
      </div>
    `
  },

  {
    id: "pesquisar",
    icone: "🔍",
    titulo: "Pesquisar produtos",
    descricao: "Encontre itens rapidamente nas telas do aplicativo.",
    conteudo: `
      <h3>🔍 Pesquisar produtos</h3>

      <p>
        As telas <strong>Lista</strong>, <strong>Estoque</strong> e
        <strong>IA</strong> possuem campo de pesquisa.
      </p>

      <ul class="central-ajuda-lista-check">
        <li>Digite uma parte do nome do produto.</li>
        <li>Os resultados são filtrados imediatamente.</li>
        <li>Não é necessário tocar em um botão de consulta.</li>
        <li>A pesquisa reconhece nomes mesmo sem acentos.</li>
      </ul>

      <div class="central-ajuda-exemplos">
        <p>Exemplo: digitar “acucar” encontra “Açúcar”.</p>
      </div>
    `
  },

  {
    id: "atualizar-estoque",
    icone: "🔄",
    titulo: "Atualizar o Estoque",
    descricao: "Confira quantidades e gere a lista automática.",
    conteudo: `
      <h3>🔄 Atualizar o Estoque</h3>

      <p>
        Esta função inicia um novo ciclo de conferência dos produtos
        existentes em casa.
      </p>

      <div class="central-ajuda-passos">
        <div class="central-ajuda-passo">
          <span class="central-ajuda-passo-numero">1</span>

          <div>
            <strong>Toque em Atualizar estoque</strong>

            <p>
              Os controles de quantidade ficarão disponíveis para
              edição.
            </p>
          </div>
        </div>

        <div class="central-ajuda-passo">
          <span class="central-ajuda-passo-numero">2</span>

          <div>
            <strong>Ajuste o campo Atual</strong>

            <p>
              Informe quanto daquele produto ainda existe em casa.
            </p>
          </div>
        </div>

        <div class="central-ajuda-passo">
          <span class="central-ajuda-passo-numero">3</span>

          <div>
            <strong>Defina o Mínimo</strong>

            <p>
              Informe a quantidade que deseja manter disponível.
            </p>
          </div>
        </div>

        <div class="central-ajuda-passo">
          <span class="central-ajuda-passo-numero">4</span>

          <div>
            <strong>Conclua a atualização</strong>

            <p>
              Toque em <strong>Concluir atualização</strong>. O
              ListaLar calculará o que precisa ser comprado.
            </p>
          </div>
        </div>
      </div>

      <div class="central-ajuda-exemplos">
        <p>
          Exemplo: Arroz com atual de 1 kg e mínimo de 3 kg.
          O ListaLar colocará 2 kg na lista de compras.
        </p>
      </div>
    `
  },

  {
    id: "campos-estoque",
    icone: "📊",
    titulo: "Campos do Estoque",
    descricao: "Entenda Atual, Mínimo e Comprar.",
    conteudo: `
      <h3>📊 Entenda os campos do Estoque</h3>

      <div class="central-ajuda-escolhas">
        <div class="central-ajuda-escolha">
          <strong>Atual</strong>

          <p>
            É a quantidade que realmente existe em casa naquele
            momento.
          </p>
        </div>

        <div class="central-ajuda-escolha">
          <strong>Mínimo</strong>

          <p>
            É a quantidade que você deseja manter disponível.
          </p>
        </div>

        <div class="central-ajuda-escolha">
          <strong>Comprar</strong>

          <p>
            É a diferença entre o mínimo desejado e o estoque atual.
          </p>
        </div>
      </div>

      <div class="central-ajuda-formula">
        Comprar = Mínimo − Atual
      </div>

      <div class="central-ajuda-destaque">
        Quando o estoque atual for igual ou maior que o mínimo, o
        produto não entra na lista automática.
      </div>
    `
  },

  {
    id: "unidades",
    icone: "📏",
    titulo: "Unidades de medida",
    descricao: "Use kg, L, un, pct, ml e outras unidades.",
    conteudo: `
      <h3>📏 Unidade de medida</h3>

      <p>
        Cada produto pode ser controlado com a unidade mais adequada.
      </p>

      <ul>
        <li><strong>Arroz:</strong> kg</li>
        <li><strong>Leite:</strong> L</li>
        <li><strong>Ovos:</strong> un</li>
        <li><strong>Papel higiênico:</strong> pct</li>
        <li><strong>Azeite:</strong> ml</li>
      </ul>

      <h4>Como alterar a unidade</h4>

      <ol>
        <li>Abra a tela <strong>Estoque</strong>.</li>
        <li>Toque em <strong>Atualizar estoque</strong>.</li>
        <li>Toque no botão que mostra a unidade do produto.</li>
        <li>Escolha a nova unidade.</li>
      </ol>

      <div class="central-ajuda-aviso">
        Alterar a unidade não converte automaticamente as quantidades.
        Confira o valor atual e o mínimo depois da mudança.
      </div>
    `
  },

  {
    id: "durante-compras",
    icone: "🛒",
    titulo: "Durante as compras",
    descricao: "Ajuste quantidades e marque os produtos como OK.",
    conteudo: `
      <h3>🛒 Durante as compras</h3>

      <div class="central-ajuda-passos">
        <div class="central-ajuda-passo">
          <span class="central-ajuda-passo-numero">1</span>

          <div>
            <strong>Abra a Lista</strong>

            <p>
              Veja todos os produtos manuais e automáticos que precisam
              ser comprados.
            </p>
          </div>
        </div>

        <div class="central-ajuda-passo">
          <span class="central-ajuda-passo-numero">2</span>

          <div>
            <strong>Confira a quantidade sugerida</strong>

            <p>
              O aplicativo mostra quanto comprar e qual unidade
              utilizar.
            </p>
          </div>
        </div>

        <div class="central-ajuda-passo">
          <span class="central-ajuda-passo-numero">3</span>

          <div>
            <strong>Ajuste a quantidade comprada</strong>

            <p>
              Use os botões de mais e menos caso tenha comprado uma
              quantidade diferente.
            </p>
          </div>
        </div>

        <div class="central-ajuda-passo">
          <span class="central-ajuda-passo-numero">4</span>

          <div>
            <strong>Marque como OK</strong>

            <p>
              Toque no quadrado ao lado do produto depois de colocá-lo
              no carrinho.
            </p>
          </div>
        </div>
      </div>
    `
  },

  {
    id: "finalizar-compra",
    icone: "✅",
    titulo: "Finalizar a compra",
    descricao: "Conclua os itens comprados e atualize o estoque.",
    conteudo: `
      <h3>✅ Finalizar a compra</h3>

      <p>
        Depois de concluir as compras, toque em
        <strong>Finalizar compra</strong>.
      </p>

      <ul class="central-ajuda-lista-check">
        <li>Somente os itens marcados como OK serão finalizados.</li>
        <li>A quantidade comprada será adicionada ao estoque.</li>
        <li>As marcações da compra serão limpas.</li>
        <li>Os itens concluídos sairão da lista daquele ciclo.</li>
      </ul>

      <div class="central-ajuda-destaque">
        Uma nova lista automática será criada somente quando você
        utilizar novamente a função Atualizar estoque.
      </div>
    `
  },

  {
    id: "cancelar-compra",
    icone: "❌",
    titulo: "Cancelar compra",
    descricao: "Desfaça as marcações sem alterar o estoque.",
    conteudo: `
      <h3>❌ Cancelar compra</h3>

      <p>
        O botão <strong>Cancelar compra</strong> limpa as marcações e
        as quantidades informadas durante a compra atual.
      </p>

      <ul>
        <li>Não altera o estoque.</li>
        <li>Não exclui os produtos da lista.</li>
        <li>A lista continuará disponível para uma nova tentativa.</li>
      </ul>

      <div class="central-ajuda-aviso">
        Use essa opção quando tiver marcado produtos ou alterado
        quantidades por engano.
      </div>
    `
  },

  {
    id: "excluir-produtos",
    icone: "🗑️",
    titulo: "Excluir produtos",
    descricao: "Remova um item que não será mais controlado.",
    conteudo: `
      <h3>🗑️ Excluir produtos</h3>

      <p>
        Na tela Estoque, cada produto possui a opção
        <strong>Excluir</strong>.
      </p>

      <ol>
        <li>Localize o produto.</li>
        <li>Toque em <strong>Excluir</strong>.</li>
        <li>Confirme a exclusão na mensagem exibida.</li>
      </ol>

      <div class="central-ajuda-aviso">
        A exclusão remove o produto do estoque da família. Utilize essa
        opção apenas quando o item não precisar mais ser controlado.
      </div>
    `
  },

  {
    id: "tela-ia",
    icone: "🤖",
    titulo: "Tela IA",
    descricao: "Consulte avisos e sugestões sobre os produtos.",
    conteudo: `
      <h3>🤖 Tela IA</h3>

      <p>
        A tela IA apresenta avisos rápidos sobre a situação dos
        produtos.
      </p>

      <ul class="central-ajuda-lista-check">
        <li>Produtos que precisam ser comprados.</li>
        <li>Produtos com estoque zerado.</li>
        <li>Produtos em excesso.</li>
        <li>Itens com consumo elevado.</li>
        <li>Sugestões para revisar o estoque mínimo.</li>
      </ul>

      <div class="central-ajuda-destaque">
        A IA utiliza os dados registrados nas compras para gerar
        informações mais úteis ao longo do tempo.
      </div>
    `
  },

  {
    id: "familia",
    icone: "👨‍👩‍👧‍👦",
    titulo: "Compartilhar com a família",
    descricao: "Convide familiares e sincronize tudo em tempo real.",
    conteudo: `
      <h3>👨‍👩‍👧‍👦 Compartilhar com a família</h3>

      <div class="central-ajuda-passos">
        <div class="central-ajuda-passo">
          <span class="central-ajuda-passo-numero">1</span>

          <div>
            <strong>Toque no botão da família</strong>

            <p>
              Ele fica no canto superior direito do aplicativo.
            </p>
          </div>
        </div>

        <div class="central-ajuda-passo">
          <span class="central-ajuda-passo-numero">2</span>

          <div>
            <strong>Compartilhe o convite</strong>

            <p>
              Escolha WhatsApp, mensagem, e-mail ou copie o link.
            </p>
          </div>
        </div>

        <div class="central-ajuda-passo">
          <span class="central-ajuda-passo-numero">3</span>

          <div>
            <strong>O familiar entra com o Google</strong>

            <p>
              Depois do login, ele passa a participar da mesma
              família.
            </p>
          </div>
        </div>
      </div>

      <div class="central-ajuda-destaque">
        Todos os membros utilizam a mesma lista e o mesmo estoque. As
        alterações aparecem para a família em tempo real.
      </div>
    `
  },

  {
    id: "instalacao",
    icone: "📱",
    titulo: "Instalar no celular",
    descricao: "Use o ListaLar como aplicativo no Android ou iPhone.",
    conteudo: `
      <h3>📱 Instalar no celular</h3>

      <h4>No iPhone</h4>

      <ol>
        <li>Abra o ListaLar no Safari.</li>
        <li>Toque no botão <strong>Compartilhar</strong>.</li>
        <li>Escolha <strong>Adicionar à Tela de Início</strong>.</li>
        <li>Confirme tocando em <strong>Adicionar</strong>.</li>
      </ol>

      <h4>No Android</h4>

      <ol>
        <li>Abra o ListaLar no Chrome.</li>
        <li>Abra o menu do navegador.</li>
        <li>
          Escolha <strong>Instalar app</strong> ou
          <strong>Adicionar à tela inicial</strong>.
        </li>
        <li>Confirme a instalação.</li>
      </ol>

      <div class="central-ajuda-destaque">
        Depois da instalação, o ícone do ListaLar aparecerá junto aos
        outros aplicativos do celular.
      </div>
    `
  },

  {
    id: "iphone-microfone",
    icone: "🍎",
    titulo: "Microfone no iPhone",
    descricao: "Configure a permissão para usar os comandos por voz.",
    conteudo: `
      <h3>🍎 Configurar o microfone no iPhone</h3>

      <p>
        Caso o iPhone solicite autorização para o microfone sempre que
        o ListaLar for aberto, faça esta configuração:
      </p>

      <ol>
        <li>Abra os <strong>Ajustes</strong> do iPhone.</li>
        <li>Entre em <strong>Apps</strong>.</li>
        <li>Selecione <strong>Safari</strong>.</li>
        <li>Toque em <strong>Microfone</strong>.</li>
        <li>Selecione <strong>Permitir</strong>.</li>
      </ol>

      <div class="central-ajuda-formula">
        Ajustes → Apps → Safari → Microfone → Permitir
      </div>

      <p>
        Depois dessa alteração, o ListaLar poderá utilizar o microfone
        sem solicitar a mesma autorização repetidamente.
      </p>
    `
  },

  {
    id: "atualizacoes",
    icone: "🔔",
    titulo: "Atualizar o aplicativo",
    descricao: "Receba novas versões sem reinstalar o ListaLar.",
    conteudo: `
      <h3>🔔 Atualizar o aplicativo</h3>

      <p>
        Quando houver uma nova versão, o ListaLar exibirá uma mensagem
        automaticamente.
      </p>

      <ol>
        <li>
          Aguarde a mensagem
          <strong>Nova versão disponível</strong>.
        </li>

        <li>Toque em <strong>Atualizar agora</strong>.</li>

        <li>O aplicativo recarregará sozinho.</li>
      </ol>

      <div class="central-ajuda-destaque">
        Não é necessário apagar, desinstalar ou adicionar novamente o
        aplicativo à tela inicial.
      </div>
    `
  },

  {
    id: "ciclo-automatico",
    icone: "🔁",
    titulo: "Ciclo automático",
    descricao: "Veja o fluxo completo entre estoque e compras.",
    conteudo: `
      <h3>🔁 Resumo do ciclo automático</h3>

      <div class="central-ajuda-fluxo">
        <span>Atualizar estoque</span>
        <b>↓</b>
        <span>Ajustar as quantidades atuais</span>
        <b>↓</b>
        <span>Concluir atualização</span>
        <b>↓</b>
        <span>Lista automática gerada</span>
        <b>↓</b>
        <span>Fazer as compras</span>
        <b>↓</b>
        <span>Finalizar compra</span>
        <b>↓</b>
        <span>Estoque atualizado</span>
      </div>

      <div class="central-ajuda-aviso">
        A lista automática é recalculada quando uma nova atualização
        do estoque é concluída.
      </div>
    `
  },

  {
    id: "perguntas",
    icone: "❓",
    titulo: "Perguntas frequentes",
    descricao: "Respostas rápidas sobre as principais funções.",
    conteudo: `
      <h3>❓ Perguntas frequentes</h3>

      <div class="central-ajuda-faq-item">
        <strong>Preciso usar o estoque?</strong>

        <p>
          Não. Você pode usar somente a Lista Manual.
        </p>
      </div>

      <div class="central-ajuda-faq-item">
        <strong>
          Posso usar a lista manual e o estoque juntos?
        </strong>

        <p>
          Sim. Itens manuais e automáticos podem aparecer na mesma
          lista.
        </p>
      </div>

      <div class="central-ajuda-faq-item">
        <strong>Quando a lista automática é criada?</strong>

        <p>
          Depois que você concluir uma atualização do estoque.
        </p>
      </div>

      <div class="central-ajuda-faq-item">
        <strong>O estoque é atualizado depois da compra?</strong>

        <p>
          Sim. A quantidade realmente comprada é adicionada ao estoque
          quando a compra é finalizada.
        </p>
      </div>

      <div class="central-ajuda-faq-item">
        <strong>Todos da família podem editar?</strong>

        <p>
          Sim. Os membros podem criar, editar e excluir produtos, além
          de atualizar a lista compartilhada.
        </p>
      </div>

      <div class="central-ajuda-faq-item">
        <strong>Preciso reinstalar após uma atualização?</strong>

        <p>
          Não. Basta tocar em <strong>Atualizar agora</strong> quando
          o aviso aparecer.
        </p>
      </div>

      <div class="central-ajuda-faq-item">
        <strong>Preciso instalar o ListaLar?</strong>

        <p>
          Não. Você pode utilizar pelo navegador ou instalar na tela
          inicial para ter uma experiência semelhante à de um
          aplicativo.
        </p>
      </div>

      <div class="central-ajuda-faq-item">
        <strong>Posso cadastrar produtos novos pelo áudio?</strong>

        <p>
          Sim. O produto será mostrado na revisão antes de ser salvo.
        </p>
      </div>

      <div class="central-ajuda-faq-item">
        <strong>
          O que acontece se o áudio entender algo errado?
        </strong>

        <p>
          Você pode corrigir o nome, a quantidade e a unidade antes de
          confirmar.
        </p>
      </div>

      <div class="central-ajuda-faq-item">
        <strong>Os dados ficam sincronizados?</strong>

        <p>
          Sim. As informações ficam sincronizadas entre os integrantes
          da mesma família.
        </p>
      </div>

      <div class="central-ajuda-faq-item">
        <strong>O ListaLar é gratuito?</strong>

        <p>
          O aplicativo está disponível gratuitamente durante a fase
          Beta.
        </p>
      </div>
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

    .central-ajuda-botao:hover {
      filter: brightness(1.04);
    }

    .central-ajuda-botao:active {
      transform: scale(0.96);
    }

    .central-ajuda-botao:focus-visible,
    .central-ajuda-fechar:focus-visible,
    .central-ajuda-voltar:focus-visible,
    .central-ajuda-categoria:focus-visible,
    .central-ajuda-whatsapp:focus-visible {
      outline: 3px solid rgba(37, 99, 235, 0.35);
      outline-offset: 3px;
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
      max-width: 680px;
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
      color: #ffffff;
      font-size: 21px;
      font-weight: 900;
    }

    .central-ajuda-topo p {
      margin: 4px 0 0;
      color: rgba(255, 255, 255, 0.92);
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
      scrollbar-gutter: stable;
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

    .central-ajuda-categoria:hover {
      border-color: #93c5fd;
      box-shadow: 0 8px 18px rgba(15, 23, 42, 0.09);
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

    .central-ajuda-lista-check {
      list-style: none;
      padding-left: 0 !important;
    }

    .central-ajuda-lista-check li {
      position: relative;
      padding-left: 25px;
    }

    .central-ajuda-lista-check li::before {
      content: "✓";
      position: absolute;
      left: 0;
      top: 0;
      color: #16a34a;
      font-weight: 900;
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

    .central-ajuda-escolhas {
      display: grid;
      gap: 10px;
      margin: 12px 0;
    }

    .central-ajuda-escolha {
      padding: 13px;
      border: 1px solid #dbeafe;
      border-radius: 15px;
      background: #f8fafc;
    }

    .central-ajuda-escolha strong {
      display: block;
      margin-bottom: 5px;
      color: #1d4ed8;
      font-size: 14px;
      font-weight: 900;
    }

    .central-ajuda-escolha p {
      margin: 0;
    }

    .central-ajuda-passos {
      display: grid;
      gap: 12px;
      margin: 12px 0;
    }

    .central-ajuda-passo {
      display: flex;
      align-items: flex-start;
      gap: 11px;
    }

    .central-ajuda-passo-numero {
      width: 31px;
      height: 31px;
      flex: 0 0 31px;
      display: grid;
      place-items: center;
      border-radius: 10px;
      background: linear-gradient(135deg, #2563eb, #06b6d4);
      color: #ffffff;
      font-size: 13px;
      font-weight: 900;
    }

    .central-ajuda-passo > div {
      min-width: 0;
      flex: 1 1 auto;
    }

    .central-ajuda-passo strong {
      display: block;
      margin-bottom: 3px;
      color: #172033;
      font-size: 14px;
      font-weight: 900;
    }

    .central-ajuda-passo p {
      margin: 0;
    }

    .central-ajuda-aviso,
    .central-ajuda-destaque,
    .central-ajuda-formula {
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

    .central-ajuda-formula {
      border: 1px solid #bfdbfe;
      background: #eff6ff;
      color: #1e3a8a;
      text-align: center;
      font-size: 14px;
    }

    .central-ajuda-fluxo {
      display: grid;
      justify-items: center;
      gap: 6px;
      margin: 13px 0;
      padding: 15px;
      border: 1px solid #dbeafe;
      border-radius: 16px;
      background: #f8fafc;
      color: #1d4ed8;
      text-align: center;
      font-size: 14px;
      font-weight: 900;
    }

    .central-ajuda-fluxo span {
      width: 100%;
      padding: 9px 11px;
      border-radius: 12px;
      background: #eff6ff;
    }

    .central-ajuda-fluxo b {
      color: #06b6d4;
      font-size: 18px;
    }

    .central-ajuda-faq-item {
      padding: 12px 0;
      border-bottom: 1px solid #dbeafe;
    }

    .central-ajuda-faq-item:last-child {
      border-bottom: 0;
    }

    .central-ajuda-faq-item strong {
      display: block;
      margin-bottom: 5px;
      color: #172033;
      font-size: 14px;
      font-weight: 900;
    }

    .central-ajuda-faq-item p {
      margin: 0;
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

    .central-ajuda-whatsapp:hover {
      filter: brightness(1.04);
    }

    @media (min-width: 700px) {
      .central-ajuda-fundo {
        align-items: center;
        padding: 18px;
      }

      .central-ajuda-painel {
        max-height: min(780px, calc(100vh - 36px));
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

      .central-ajuda-corpo {
        padding: 12px;
      }

      .central-ajuda-conteudo {
        padding: 15px;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .central-ajuda-botao,
      .central-ajuda-categoria {
        transition: none;
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
  botao.setAttribute("aria-label", "Abrir Central de Ajuda");

  botao.addEventListener("click", centralAjudaAbrir);

  document.body.appendChild(botao);

  const fundo = document.createElement("div");

  fundo.id = "centralAjudaFundo";
  fundo.className = "central-ajuda-fundo";
  fundo.setAttribute("aria-hidden", "true");

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
            aria-label="Buscar assunto na Central de Ajuda"
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
    ?.addEventListener(
      "click",
      centralAjudaFechar
    );

  centralAjudaElemento("centralAjudaVoltar")
    ?.addEventListener(
      "click",
      centralAjudaMostrarInicio
    );

  centralAjudaElemento("centralAjudaBusca")
    ?.addEventListener(
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
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
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

  const termo = centralAjudaNormalizarTexto(
    busca
  );

  const categoriasFiltradas =
    AJUDA_CATEGORIAS.filter(
      (categoria) => {
        if (!termo) {
          return true;
        }

        const conteudoPesquisa =
          centralAjudaNormalizarTexto(
            `${categoria.titulo}
             ${categoria.descricao}
             ${categoria.conteudo}`
          );

        return conteudoPesquisa.includes(
          termo
        );
      }
    );

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
    .querySelectorAll(
      "[data-ajuda-categoria]"
    )
    .forEach(
      (botaoCategoria) => {
        botaoCategoria.addEventListener(
          "click",
          () => {
            centralAjudaAbrirCategoria(
              botaoCategoria.dataset
                .ajudaCategoria
            );
          }
        );
      }
    );
}


function centralAjudaAbrirCategoria(
  idCategoria
) {
  const categoria = AJUDA_CATEGORIAS.find(
    (item) => item.id === idCategoria
  );

  if (!categoria) {
    return;
  }

  CENTRAL_AJUDA.categoriaAtual =
    idCategoria;

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
    conteudo.innerHTML =
      categoria.conteudo;
  }

  const corpo = detalhe?.closest(
    ".central-ajuda-corpo"
  );

  if (corpo) {
    corpo.scrollTop = 0;
  }

  centralAjudaElemento(
    "centralAjudaVoltar"
  )?.focus();
}


function centralAjudaMostrarInicio() {
  CENTRAL_AJUDA.categoriaAtual = null;

  centralAjudaElemento(
    "centralAjudaInicio"
  )?.classList.remove("oculto");

  centralAjudaElemento(
    "centralAjudaDetalhe"
  )?.classList.remove("aberto");

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

  if (CENTRAL_AJUDA.aberta) {
    busca?.focus();
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

  if (!CENTRAL_AJUDA.aberta) {
    CENTRAL_AJUDA.overflowAnterior =
      document.body.style.overflow;

    CENTRAL_AJUDA.elementoFocadoAnterior =
      document.activeElement;
  }

  CENTRAL_AJUDA.aberta = true;

  fundo.classList.add("aberto");

  fundo.setAttribute(
    "aria-hidden",
    "false"
  );

  document.body.style.overflow =
    "hidden";

  if (categoriaInicial) {
    centralAjudaAbrirCategoria(
      categoriaInicial
    );
  } else {
    centralAjudaMostrarInicio();
  }
}


function centralAjudaFechar() {
  if (!CENTRAL_AJUDA.aberta) {
    return;
  }

  CENTRAL_AJUDA.aberta = false;

  const fundo = centralAjudaElemento(
    "centralAjudaFundo"
  );

  fundo?.classList.remove("aberto");

  fundo?.setAttribute(
    "aria-hidden",
    "true"
  );

  document.body.style.overflow =
    CENTRAL_AJUDA.overflowAnterior;

  if (
    CENTRAL_AJUDA.elementoFocadoAnterior &&
    typeof CENTRAL_AJUDA
      .elementoFocadoAnterior.focus ===
      "function"
  ) {
    CENTRAL_AJUDA
      .elementoFocadoAnterior
      .focus();
  }
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
  abrirCategoria:
    centralAjudaAbrirCategoria,
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
