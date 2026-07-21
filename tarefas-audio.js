// ==========================================
// ListaLar - Áudio para Tarefas
// Arquivo: tarefas-audio.js
// Versão: 1.0.0
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


  if (
    normalizado.includes(
      "hoje"
    )
  ) {
    return audioTarefasDataIso(
      hoje
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


  const diasSemana = [
    {
      nomes: [
        "domingo"
      ],
      numero: 0
    },
    {
      nomes: [
        "segunda",
        "segunda feira"
      ],
      numero: 1
    },
    {
      nomes: [
        "terca",
        "terca feira"
      ],
      numero: 2
    },
    {
      nomes: [
        "quarta",
        "quarta feira"
      ],
      numero: 3
    },
    {
      nomes: [
        "quinta",
        "quinta feira"
      ],
      numero: 4
    },
    {
      nomes: [
        "sexta",
        "sexta feira"
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
    "para hoje",
    "hoje",
    "para amanha",
    "amanha",
    "para depois de amanha",
    "depois de amanha",
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
  if (
    audioTarefasElemento(
      "btnAudioTarefas"
    )
  ) {
    botaoAudioTarefas =
      audioTarefasElemento(
        "btnAudioTarefas"
      );

    return true;
  }


  const botaoNova =
    audioTarefasElemento(
      "btnNovaTarefa"
    );


  if (!botaoNova) {
    return false;
  }


  const areaBotoes =
    document.createElement(
      "div"
    );


  areaBotoes.id =
    "tarefasAcoesCabecalho";


  areaBotoes.style.display =
    "flex";


  areaBotoes.style.alignItems =
    "center";


  areaBotoes.style.gap =
    "8px";


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
      aria-hidden="true"
      style="
        font-size: 20px;
        line-height: 1;
      "
    >
      🎙️
    </span>

    <span class="tarefas-audio-texto">
      Áudio
    </span>
  `;


  botaoNova.parentElement.insertBefore(
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
// Aparência do botão
// ==========================================

function audioTarefasAtualizarBotao() {
  if (!botaoAudioTarefas) {
    return;
  }


  if (ouvindoTarefas) {
    botaoAudioTarefas.disabled =
      false;

    botaoAudioTarefas.classList.add(
      "ouvindo"
    );

    botaoAudioTarefas.innerHTML = `
      <span
        aria-hidden="true"
        style="
          font-size: 20px;
          line-height: 1;
        "
      >
        ⏹️
      </span>

      <span class="tarefas-audio-texto">
        Parar
      </span>
    `;

    return;
  }


  botaoAudioTarefas.disabled =
    false;


  botaoAudioTarefas.classList.remove(
    "ouvindo"
  );


  botaoAudioTarefas.innerHTML = `
    <span
      aria-hidden="true"
      style="
        font-size: 20px;
        line-height: 1;
      "
    >
      🎙️
    </span>

    <span class="tarefas-audio-texto">
      Áudio
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
    };


  reconhecimentoTarefas.onend =
    () => {
      ouvindoTarefas = false;

      audioTarefasAtualizarBotao();
    };


  reconhecimentoTarefas.onerror =
    async (evento) => {
      ouvindoTarefas = false;

      audioTarefasAtualizarBotao();


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
        await audioTarefasAvisar(
          "Não entendi",
          "Fale novamente de forma mais próxima ao celular.",
          "warning"
        );

        return;
      }


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
    reconhecimentoTarefas.abort();

    return;
  }


  try {
    reconhecimentoTarefas.start();

  } catch (erro) {
    console.warn(
      "ListaLar Tarefas Áudio:",
      erro
    );
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
      min-height: 44px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      white-space: nowrap;
    }

    #btnAudioTarefas.ouvindo {
      animation: tarefasAudioPulsar 1s infinite;
    }

    @keyframes tarefasAudioPulsar {
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

    @media (max-width: 520px) {
      #tarefasAcoesCabecalho {
        gap: 6px;
      }

      #btnAudioTarefas,
      #btnNovaTarefa {
        padding-left: 12px;
        padding-right: 12px;
      }

      .tarefas-audio-texto {
        display: none;
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
