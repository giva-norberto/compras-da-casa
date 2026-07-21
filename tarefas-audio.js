// ==========================================
// ListaLar - Áudio para Tarefas
// Arquivo: tarefas-audio.js
// Versão: 1.1.0
// ==========================================


// ==========================================
// Estado do módulo
// ==========================================

let reconhecimentoTarefas = null;
let ouvindoTarefas = false;
let botaoAudioTarefas = null;

const SpeechRecognition =
  window.SpeechRecognition ||
  window.webkitSpeechRecognition;


// ==========================================
// Utilidades
// ==========================================

function audioTarefasElemento(id) {
  return document.getElementById(id);
}


function audioTarefasNormalizar(texto) {
  return String(texto || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[.,;:!?]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}


function audioTarefasCapitalizar(texto) {
  const valor = String(texto || "").trim();

  if (!valor) {
    return "";
  }

  return (
    valor.charAt(0).toUpperCase() +
    valor.slice(1)
  );
}


function audioTarefasDataIso(data) {
  const ano = data.getFullYear();

  const mes = String(
    data.getMonth() + 1
  ).padStart(2, "0");

  const dia = String(
    data.getDate()
  ).padStart(2, "0");

  return `${ano}-${mes}-${dia}`;
}


function audioTarefasAdicionarDias(
  data,
  quantidade
) {
  const novaData = new Date(data);

  novaData.setHours(0, 0, 0, 0);

  novaData.setDate(
    novaData.getDate() +
    quantidade
  );

  return novaData;
}


function audioTarefasProximoDiaSemana(
  diaSemana
) {
  const hoje = new Date();

  hoje.setHours(0, 0, 0, 0);

  const diaAtual =
    hoje.getDay();

  let diferenca =
    diaSemana - diaAtual;

  if (diferenca <= 0) {
    diferenca += 7;
  }

  return audioTarefasAdicionarDias(
    hoje,
    diferenca
  );
}


async function audioTarefasAvisar(
  titulo,
  texto,
  tipo = "info"
) {
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


// ==========================================
// Leitura de prioridade
// ==========================================

function audioTarefasExtrairPrioridade(
  texto
) {
  const normalizado =
    audioTarefasNormalizar(texto);

  if (
    normalizado.includes(
      "prioridade alta"
    ) ||
    normalizado.includes(
      "urgente"
    )
  ) {
    return "alta";
  }

  if (
    normalizado.includes(
      "prioridade baixa"
    )
  ) {
    return "baixa";
  }

  if (
    normalizado.includes(
      "prioridade media"
    )
  ) {
    return "media";
  }

  return "media";
}


// ==========================================
// Leitura de prazo
// ==========================================

function audioTarefasExtrairPrazo(
  texto
) {
  const normalizado =
    audioTarefasNormalizar(texto);

  const hoje = new Date();

  hoje.setHours(0, 0, 0, 0);


  /*
   * A verificação de "depois de amanhã"
   * precisa acontecer antes de "amanhã",
   * porque a frase também contém a palavra
   * "amanhã".
   */
  if (
    normalizado.includes(
      "depois de amanha"
    )
  ) {
    return audioTarefasDataIso(
      audioTarefasAdicionarDias(
        hoje,
        2
      )
    );
  }


  if (
    normalizado.includes(
      "amanha"
    )
  ) {
    return audioTarefasDataIso(
      audioTarefasAdicionarDias(
        hoje,
        1
      )
    );
  }


  if (
    normalizado.includes(
      "hoje"
    )
  ) {
    return audioTarefasDataIso(
      hoje
    );
  }


  const diasSemana = [
    {
      nomes: [
        "domingo"
      ],
      numero: 0
    },
    {
      nomes: [
        "segunda feira",
        "segunda"
      ],
      numero: 1
    },
    {
      nomes: [
        "terca feira",
        "terca"
      ],
      numero: 2
    },
    {
      nomes: [
        "quarta feira",
        "quarta"
      ],
      numero: 3
    },
    {
      nomes: [
        "quinta feira",
        "quinta"
      ],
      numero: 4
    },
    {
      nomes: [
        "sexta feira",
        "sexta"
      ],
      numero: 5
    },
    {
      nomes: [
        "sabado"
      ],
      numero: 6
    }
  ];


  for (
    const dia of diasSemana
  ) {
    const encontrou =
      dia.nomes.some((nome) => {
        return normalizado.includes(
          nome
        );
      });

    if (encontrou) {
      return audioTarefasDataIso(
        audioTarefasProximoDiaSemana(
          dia.numero
        )
      );
    }
  }


  const padraoData =
    normalizado.match(
      /\b(\d{1,2})\s*(?:de|\/|-)\s*(\d{1,2})(?:\s*(?:de|\/|-)\s*(\d{2,4}))?\b/
    );


  if (padraoData) {
    const dia =
      Number(padraoData[1]);

    const mes =
      Number(padraoData[2]);

    let ano =
      padraoData[3]
        ? Number(padraoData[3])
        : hoje.getFullYear();


    if (ano < 100) {
      ano += 2000;
    }


    const data =
      new Date(
        ano,
        mes - 1,
        dia
      );


    const dataValida =
      data.getFullYear() === ano &&
      data.getMonth() === mes - 1 &&
      data.getDate() === dia;


    if (dataValida) {
      return audioTarefasDataIso(
        data
      );
    }
  }


  return "";
}


// ==========================================
// Leitura do responsável
// ==========================================

function audioTarefasExtrairResponsavel(
  texto,
  membros
) {
  const normalizado =
    audioTarefasNormalizar(texto);

  if (
    !Array.isArray(membros) ||
    membros.length === 0
  ) {
    return {
      uid: "",
      nome: ""
    };
  }


  const membrosOrdenados =
    [...membros].sort((a, b) => {
      const nomeA =
        String(
          a.nome ||
          a.displayName ||
          a.email ||
          ""
        );

      const nomeB =
        String(
          b.nome ||
          b.displayName ||
          b.email ||
          ""
        );

      return (
        nomeB.length -
        nomeA.length
      );
    });


  for (
    const membro of membrosOrdenados
  ) {
    const nome =
      membro.nome ||
      membro.displayName ||
      membro.email ||
      "";

    const nomeNormalizado =
      audioTarefasNormalizar(nome);

    if (
      !nomeNormalizado
    ) {
      continue;
    }


    const primeiroNome =
      nomeNormalizado
        .split(" ")
        .filter(Boolean)[0] || "";


    const encontrouNomeCompleto =
      normalizado.includes(
        nomeNormalizado
      );


    const encontrouPrimeiroNome =
      primeiroNome.length >= 3 &&
      new RegExp(
        `\\b${primeiroNome}\\b`,
        "i"
      ).test(normalizado);


    if (
      encontrouNomeCompleto ||
      encontrouPrimeiroNome
    ) {
      return {
        uid:
          membro.uid ||
          membro.id ||
          "",

        nome
      };
    }
  }


  return {
    uid: "",
    nome: ""
  };
}


// ==========================================
// Limpeza do título
// ==========================================

function audioTarefasLimparTitulo(
  texto,
  responsavelNome
) {
  let titulo =
    audioTarefasNormalizar(texto);


  const iniciosRemovidos = [
    "criar uma tarefa",
    "criar tarefa",
    "adicionar uma tarefa",
    "adicionar tarefa",
    "nova tarefa",
    "anotar tarefa",
    "incluir tarefa",
    "cadastrar tarefa"
  ];


  for (
    const inicio of iniciosRemovidos
  ) {
    if (
      titulo.startsWith(inicio)
    ) {
      titulo =
        titulo
          .slice(inicio.length)
          .trim();

      break;
    }
  }


  const trechosRemovidos = [
    "prioridade alta",
    "prioridade media",
    "prioridade baixa",
    "urgente",
    "para depois de amanha",
    "depois de amanha",
    "para amanha",
    "amanha",
    "para hoje",
    "hoje",
    "na segunda feira",
    "na segunda",
    "para segunda feira",
    "para segunda",
    "na terca feira",
    "na terca",
    "para terca feira",
    "para terca",
    "na quarta feira",
    "na quarta",
    "para quarta feira",
    "para quarta",
    "na quinta feira",
    "na quinta",
    "para quinta feira",
    "para quinta",
    "na sexta feira",
    "na sexta",
    "para sexta feira",
    "para sexta",
    "no sabado",
    "para sabado",
    "no domingo",
    "para domingo"
  ];


  for (
    const trecho of trechosRemovidos
  ) {
    titulo =
      titulo.replace(
        new RegExp(
          `\\b${trecho}\\b`,
          "gi"
        ),
        " "
      );
  }


  if (responsavelNome) {
    const nomeNormalizado =
      audioTarefasNormalizar(
        responsavelNome
      );

    const primeiroNome =
      nomeNormalizado
        .split(" ")
        .filter(Boolean)[0] || "";


    if (nomeNormalizado) {
      titulo =
        titulo.replace(
          new RegExp(
            `\\bpara\\s+${nomeNormalizado}\\b`,
            "gi"
          ),
          " "
        );

      titulo =
        titulo.replace(
          new RegExp(
            `\\bresponsavel\\s+${nomeNormalizado}\\b`,
            "gi"
          ),
          " "
        );
    }


    if (
      primeiroNome.length >= 3
    ) {
      titulo =
        titulo.replace(
          new RegExp(
            `\\bpara\\s+${primeiroNome}\\b`,
            "gi"
          ),
          " "
        );

      titulo =
        titulo.replace(
          new RegExp(
            `\\bresponsavel\\s+${primeiroNome}\\b`,
            "gi"
          ),
          " "
        );
    }
  }


  titulo =
    titulo
      .replace(
        /\b(?:para|com prazo|prazo|responsavel)\b\s*$/gi,
        ""
      )
      .replace(
        /\s+/g,
        " "
      )
      .trim();


  return audioTarefasCapitalizar(
    titulo
  );
}


// ==========================================
// Interpretação do comando
// ==========================================

function audioTarefasInterpretar(
  texto
) {
  const api =
    window.ListaLarTarefas;


  const membros =
    typeof api?.obterMembros ===
      "function"
      ? api.obterMembros()
      : [];


  const responsavel =
    audioTarefasExtrairResponsavel(
      texto,
      membros
    );


  const prioridade =
    audioTarefasExtrairPrioridade(
      texto
    );


  const prazo =
    audioTarefasExtrairPrazo(
      texto
    );


  const titulo =
    audioTarefasLimparTitulo(
      texto,
      responsavel.nome
    );


  return {
    titulo,
    responsavelUid:
      responsavel.uid,
    prazo,
    prioridade,
    observacao: ""
  };
}


// ==========================================
// Resultado do reconhecimento
// ==========================================

async function audioTarefasProcessarResultado(
  texto
) {
  const api =
    window.ListaLarTarefas;


  if (
    !api ||
    typeof api.abrirNovaTarefa !==
      "function"
  ) {
    await audioTarefasAvisar(
      "Tarefas ainda não carregadas",
      "Aguarde alguns segundos e tente novamente.",
      "warning"
    );

    return;
  }


  if (
    typeof api.estaLiberado ===
      "function" &&
    !api.estaLiberado()
  ) {
    await audioTarefasAvisar(
      "Módulo indisponível",
      "O módulo Tarefas ainda não está liberado para esta família.",
      "warning"
    );

    return;
  }


  const dados =
    audioTarefasInterpretar(
      texto
    );


  if (!dados.titulo) {
    await audioTarefasAvisar(
      "Não entendi a tarefa",
      `Fale, por exemplo: "Criar tarefa comprar pão para amanhã".`,
      "warning"
    );

    return;
  }


  api.abrirNovaTarefa(
    dados
  );
}


// ==========================================
// Botão de áudio
// ==========================================

function audioTarefasCriarBotao() {
  const botaoExistente =
    audioTarefasElemento(
      "btnAudioTarefas"
    );


  if (botaoExistente) {
    botaoAudioTarefas =
      botaoExistente;

    return true;
  }


  const botaoNova =
    audioTarefasElemento(
      "btnNovaTarefa"
    );


  if (!botaoNova) {
    return false;
  }


  const paiBotaoNova =
    botaoNova.parentElement;


  if (!paiBotaoNova) {
    return false;
  }


  const areaBotoes =
    document.createElement(
      "div"
    );


  areaBotoes.id =
    "tarefasAcoesCabecalho";


  const botaoAudio =
    document.createElement(
      "button"
    );


  botaoAudio.id =
    "btnAudioTarefas";


  botaoAudio.type =
    "button";


  botaoAudio.className =
    "btn btn-primary tarefas-btn-audio";


  botaoAudio.setAttribute(
    "aria-label",
    "Criar tarefa por áudio"
  );


  botaoAudio.setAttribute(
    "title",
    "Criar tarefa por áudio"
  );


  botaoAudio.innerHTML = `
    <span
      class="tarefas-audio-icone"
      aria-hidden="true"
    >
      🎤
    </span>

    <span class="tarefas-audio-texto">
      Áudio
    </span>
  `;


  paiBotaoNova.insertBefore(
    areaBotoes,
    botaoNova
  );


  areaBotoes.appendChild(
    botaoAudio
  );


  areaBotoes.appendChild(
    botaoNova
  );


  botaoAudio.addEventListener(
    "click",
    audioTarefasAlternar
  );


  botaoAudioTarefas =
    botaoAudio;


  return true;
}


// ==========================================
// Janela "Ouvindo..."
// ==========================================

function audioTarefasCriarModalOuvindo() {
  if (
    audioTarefasElemento(
      "audioTarefasOverlay"
    )
  ) {
    return;
  }


  const overlay =
    document.createElement(
      "div"
    );


  overlay.id =
    "audioTarefasOverlay";


  overlay.className =
    "audio-tarefas-overlay";


  overlay.setAttribute(
    "aria-hidden",
    "true"
  );


  overlay.innerHTML = `
    <div
      class="audio-tarefas-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="audioTarefasTitulo"
      aria-describedby="audioTarefasDescricao"
    >
      <div class="audio-tarefas-pulso">
        <div class="audio-tarefas-circulo">
          <span
            class="audio-tarefas-modal-icone"
            aria-hidden="true"
          >
            🎤
          </span>
        </div>
      </div>

      <h2 id="audioTarefasTitulo">
        Ouvindo...
      </h2>

      <p id="audioTarefasDescricao">
        Fale naturalmente a tarefa, o responsável,
        o prazo e a prioridade.
      </p>

      <button
        id="btnPararAudioTarefas"
        type="button"
        class="audio-tarefas-parar"
      >
        Parar
      </button>
    </div>
  `;


  document.body.appendChild(
    overlay
  );


  const botaoParar =
    audioTarefasElemento(
      "btnPararAudioTarefas"
    );


  botaoParar?.addEventListener(
    "click",
    () => {
      if (
        reconhecimentoTarefas &&
        ouvindoTarefas
      ) {
        reconhecimentoTarefas.abort();

        return;
      }

      audioTarefasOcultarModal();
    }
  );
}


function audioTarefasMostrarModal() {
  audioTarefasCriarModalOuvindo();


  const overlay =
    audioTarefasElemento(
      "audioTarefasOverlay"
    );


  if (!overlay) {
    return;
  }


  overlay.classList.add(
    "visivel"
  );


  overlay.setAttribute(
    "aria-hidden",
    "false"
  );


  document.body.classList.add(
    "audio-tarefas-modal-aberto"
  );


  window.setTimeout(() => {
    audioTarefasElemento(
      "btnPararAudioTarefas"
    )?.focus();
  }, 50);
}


function audioTarefasOcultarModal() {
  const overlay =
    audioTarefasElemento(
      "audioTarefasOverlay"
    );


  if (!overlay) {
    return;
  }


  overlay.classList.remove(
    "visivel"
  );


  overlay.setAttribute(
    "aria-hidden",
    "true"
  );


  document.body.classList.remove(
    "audio-tarefas-modal-aberto"
  );
}


// ==========================================
// Aparência do botão
// ==========================================

function audioTarefasAtualizarBotao() {
  if (!botaoAudioTarefas) {
    return;
  }


  botaoAudioTarefas.disabled =
    false;


  botaoAudioTarefas.classList.toggle(
    "ouvindo",
    ouvindoTarefas
  );


  botaoAudioTarefas.innerHTML = `
    <span
      class="tarefas-audio-icone"
      aria-hidden="true"
    >
      🎤
    </span>

    <span class="tarefas-audio-texto">
      ${ouvindoTarefas ? "Ouvindo" : "Áudio"}
    </span>
  `;
}


// ==========================================
// Reconhecimento de voz
// ==========================================

function audioTarefasPrepararReconhecimento() {
  if (!SpeechRecognition) {
    return false;
  }


  reconhecimentoTarefas =
    new SpeechRecognition();


  reconhecimentoTarefas.lang =
    "pt-BR";


  reconhecimentoTarefas.continuous =
    false;


  reconhecimentoTarefas.interimResults =
    false;


  reconhecimentoTarefas.maxAlternatives =
    3;


  reconhecimentoTarefas.onstart =
    () => {
      ouvindoTarefas = true;

      audioTarefasAtualizarBotao();

      audioTarefasMostrarModal();
    };


  reconhecimentoTarefas.onend =
    () => {
      ouvindoTarefas = false;

      audioTarefasAtualizarBotao();

      audioTarefasOcultarModal();
    };


  reconhecimentoTarefas.onerror =
    async (evento) => {
      ouvindoTarefas = false;

      audioTarefasAtualizarBotao();

      audioTarefasOcultarModal();


      const errosIgnorados = [
        "aborted",
        "no-speech"
      ];


      if (
        errosIgnorados.includes(
          evento.error
        )
      ) {
        return;
      }


      let mensagem =
        "Não foi possível usar o microfone.";


      if (
        evento.error ===
        "not-allowed"
      ) {
        mensagem =
          "A permissão do microfone foi negada. Autorize o microfone nas configurações do navegador.";
      }


      if (
        evento.error ===
        "audio-capture"
      ) {
        mensagem =
          "Nenhum microfone foi encontrado neste aparelho.";
      }


      if (
        evento.error ===
        "network"
      ) {
        mensagem =
          "O reconhecimento de voz precisa de conexão com a internet.";
      }


      await audioTarefasAvisar(
        "Áudio indisponível",
        mensagem,
        "warning"
      );
    };


  reconhecimentoTarefas.onresult =
    async (evento) => {
      const resultados =
        evento.results?.[0];


      if (!resultados) {
        audioTarefasOcultarModal();

        return;
      }


      const alternativas =
        Array.from(resultados);


      const alternativa =
        alternativas
          .map((item) => ({
            texto:
              item.transcript || "",

            confianca:
              Number(
                item.confidence || 0
              )
          }))
          .sort((a, b) => {
            return (
              b.confianca -
              a.confianca
            );
          })[0];


      const texto =
        alternativa?.texto?.trim() ||
        "";


      if (!texto) {
        audioTarefasOcultarModal();

        await audioTarefasAvisar(
          "Não entendi",
          "Fale novamente de forma mais próxima ao celular.",
          "warning"
        );

        return;
      }


      /*
       * A janela é fechada antes da abertura
       * do formulário da nova tarefa.
       */
      audioTarefasOcultarModal();


      await audioTarefasProcessarResultado(
        texto
      );
    };


  return true;
}


async function audioTarefasAlternar() {
  if (!SpeechRecognition) {
    await audioTarefasAvisar(
      "Áudio não suportado",
      "Este navegador não oferece reconhecimento de voz. No iPhone, use o Safari e mantenha o sistema atualizado.",
      "warning"
    );

    return;
  }


  if (
    !reconhecimentoTarefas &&
    !audioTarefasPrepararReconhecimento()
  ) {
    return;
  }


  if (ouvindoTarefas) {
    try {
      reconhecimentoTarefas.abort();

    } catch (erro) {
      console.warn(
        "ListaLar Tarefas Áudio:",
        erro
      );

      ouvindoTarefas = false;

      audioTarefasAtualizarBotao();

      audioTarefasOcultarModal();
    }

    return;
  }


  try {
    reconhecimentoTarefas.start();

  } catch (erro) {
    console.warn(
      "ListaLar Tarefas Áudio:",
      erro
    );

    ouvindoTarefas = false;

    audioTarefasAtualizarBotao();

    audioTarefasOcultarModal();
  }
}


// ==========================================
// Estilos complementares
// ==========================================

function audioTarefasCriarEstilos() {
  if (
    audioTarefasElemento(
      "tarefasAudioEstilos"
    )
  ) {
    return;
  }


  const estilo =
    document.createElement(
      "style"
    );


  estilo.id =
    "tarefasAudioEstilos";


  estilo.textContent = `
    #tarefasAcoesCabecalho {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 8px;
      flex-wrap: wrap;
    }

    #btnAudioTarefas {
      min-width: 72px;
      min-height: 44px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      white-space: nowrap;
    }

    #btnAudioTarefas .tarefas-audio-icone {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 24px;
      line-height: 1;
    }

    #btnAudioTarefas.ouvindo {
      animation: tarefasAudioBotaoPulsar 1s infinite;
    }

    @keyframes tarefasAudioBotaoPulsar {
      0% {
        transform: scale(1);
      }

      50% {
        transform: scale(1.04);
      }

      100% {
        transform: scale(1);
      }
    }

    body.audio-tarefas-modal-aberto {
      overflow: hidden;
    }

    .audio-tarefas-overlay {
      position: fixed;
      inset: 0;
      z-index: 99999;
      display: flex;
      align-items: center;
      justify-content: center;
      padding:
        max(20px, env(safe-area-inset-top))
        20px
        max(20px, env(safe-area-inset-bottom));
      background: rgba(22, 35, 54, 0.66);
      backdrop-filter: blur(6px);
      -webkit-backdrop-filter: blur(6px);
      opacity: 0;
      visibility: hidden;
      pointer-events: none;
      transition:
        opacity 0.18s ease,
        visibility 0.18s ease;
    }

    .audio-tarefas-overlay.visivel {
      opacity: 1;
      visibility: visible;
      pointer-events: auto;
    }

    .audio-tarefas-modal {
      width: min(100%, 440px);
      border-radius: 28px;
      background: #ffffff;
      padding: 30px 24px 26px;
      box-sizing: border-box;
      box-shadow:
        0 24px 70px rgba(10, 24, 45, 0.28);
      text-align: center;
      transform: translateY(12px) scale(0.98);
      transition: transform 0.18s ease;
    }

    .audio-tarefas-overlay.visivel
    .audio-tarefas-modal {
      transform: translateY(0) scale(1);
    }

    .audio-tarefas-pulso {
      width: 132px;
      height: 132px;
      margin: 0 auto 8px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(255, 116, 116, 0.10);
      animation:
        audioTarefasModalPulsar
        1.35s
        infinite
        ease-in-out;
    }

    .audio-tarefas-circulo {
      width: 102px;
      height: 102px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(255, 116, 116, 0.14);
    }

    .audio-tarefas-modal-icone {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 54px;
      line-height: 1;
    }

    .audio-tarefas-modal h2 {
      margin: 4px 0 12px;
      color: #172235;
      font-size: clamp(32px, 8vw, 42px);
      font-weight: 800;
      line-height: 1.08;
    }

    .audio-tarefas-modal p {
      max-width: 340px;
      margin: 0 auto 24px;
      color: #63728a;
      font-size: clamp(18px, 4.8vw, 22px);
      font-weight: 650;
      line-height: 1.42;
    }

    .audio-tarefas-parar {
      width: 100%;
      min-height: 58px;
      border: 0;
      border-radius: 18px;
      background: #ffe1e1;
      color: #b32323;
      font: inherit;
      font-size: 20px;
      font-weight: 800;
      cursor: pointer;
      -webkit-tap-highlight-color: transparent;
    }

    .audio-tarefas-parar:hover {
      background: #ffd7d7;
    }

    .audio-tarefas-parar:active {
      transform: scale(0.99);
    }

    .audio-tarefas-parar:focus-visible {
      outline: 3px solid rgba(35, 119, 255, 0.35);
      outline-offset: 3px;
    }

    @keyframes audioTarefasModalPulsar {
      0%,
      100% {
        transform: scale(1);
      }

      50% {
        transform: scale(1.05);
      }
    }

    @media (max-width: 520px) {
      #tarefasAcoesCabecalho {
        gap: 6px;
      }

      #btnAudioTarefas {
        min-width: 64px;
        padding-left: 12px;
        padding-right: 12px;
      }

      #btnNovaTarefa {
        padding-left: 12px;
        padding-right: 12px;
      }

      .tarefas-audio-texto {
        display: none;
      }

      .audio-tarefas-modal {
        border-radius: 26px;
        padding: 28px 22px 24px;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      #btnAudioTarefas.ouvindo,
      .audio-tarefas-pulso {
        animation: none;
      }

      .audio-tarefas-overlay,
      .audio-tarefas-modal {
        transition: none;
      }
    }
  `;


  document.head.appendChild(
    estilo
  );
}


// ==========================================
// Inicialização
// ==========================================

function audioTarefasInstalar() {
  audioTarefasCriarEstilos();

  audioTarefasCriarModalOuvindo();


  let tentativas = 0;


  const intervalo =
    window.setInterval(() => {
      tentativas += 1;


      const instalado =
        audioTarefasCriarBotao();


      if (
        instalado ||
        tentativas >= 50
      ) {
        window.clearInterval(
          intervalo
        );
      }
    }, 100);
}


if (
  document.readyState ===
  "loading"
) {
  document.addEventListener(
    "DOMContentLoaded",
    audioTarefasInstalar,
    {
      once: true
    }
  );

} else {
  audioTarefasInstalar();
}
