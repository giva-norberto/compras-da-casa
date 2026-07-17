/**
 * ============================================================================
 * LISTALAR - NOTIFICAÇÕES ADMINISTRATIVAS
 * Arquivo: functions/notificacoes-admin.js
 *
 * RESPONSABILIDADES:
 *
 * 1. registrarDispositivoAdmin
 *    - Recebe o token FCM enviado pelo navegador.
 *    - Confirma que o usuário possui adminSistema === true.
 *    - Salva o aparelho em:
 *
 *      usuarios/{uid}/dispositivosNotificacao/{tokenHash}
 *
 * 2. notificarNovaFamiliaAdmin
 *    - Detecta a criação de:
 *
 *      familias/{familiaId}
 *
 *    - Localiza todos os administradores do sistema.
 *    - Localiza os aparelhos ativos desses administradores.
 *    - Envia uma notificação pelo Firebase Cloud Messaging.
 *
 * SEGURANÇA:
 * - O navegador nunca envia notificações diretamente.
 * - O token só é registrado após validação no servidor.
 * - Somente contas com adminSistema === true recebem notificações.
 * ============================================================================
 */

const crypto = require("crypto");

const {
  onCall,
  HttpsError,
} = require("firebase-functions/v2/https");

const {
  onDocumentCreated,
} = require("firebase-functions/v2/firestore");

const logger = require("firebase-functions/logger");

const {
  getApps,
  initializeApp,
} = require("firebase-admin/app");

const {
  getFirestore,
  FieldValue,
} = require("firebase-admin/firestore");

const {
  getMessaging,
} = require("firebase-admin/messaging");

// ============================================================================
// INICIALIZAÇÃO
// ============================================================================

if (getApps().length === 0) {
  initializeApp();
}

const db = getFirestore();
const messagingAdmin = getMessaging();

// ============================================================================
// CONFIGURAÇÕES
// ============================================================================

const REGIAO_FUNCOES =
  "southamerica-east1";

const COLECAO_DISPOSITIVOS =
  "dispositivosNotificacao";

const URL_ADMIN =
  "https://compras-da-casa.web.app/admin.html";

const URL_ICONE =
  "https://compras-da-casa.web.app/icon-192.png";

const LIMITE_ENVIO_MULTICAST = 500;
const LIMITE_OPERACOES_BATCH = 400;

// ============================================================================
// UTILIDADES
// ============================================================================

/**
 * Transforma um valor em texto seguro e limita o tamanho.
 *
 * @param {unknown} valor
 * @param {number} tamanhoMaximo
 * @return {string}
 */
function textoSeguro(
  valor,
  tamanhoMaximo = 500,
) {
  return String(valor || "")
      .trim()
      .slice(0, tamanhoMaximo);
}

/**
 * Divide uma lista em blocos menores.
 *
 * @param {Array} lista
 * @param {number} tamanho
 * @return {Array<Array>}
 */
function dividirEmBlocos(
  lista,
  tamanho,
) {
  const blocos = [];

  for (
    let indice = 0;
    indice < lista.length;
    indice += tamanho
  ) {
    blocos.push(
        lista.slice(
            indice,
            indice + tamanho,
        ),
    );
  }

  return blocos;
}

/**
 * Cria um identificador seguro a partir do token FCM.
 *
 * O token não será usado diretamente como nome do documento.
 *
 * @param {string} token
 * @return {string}
 */
function gerarHashToken(token) {
  return crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");
}

/**
 * Valida o token FCM recebido.
 *
 * @param {unknown} valor
 * @return {string}
 */
function validarToken(valor) {
  const token = textoSeguro(
      valor,
      4096,
  );

  if (!token) {
    throw new HttpsError(
        "invalid-argument",
        "O token do aparelho não foi informado.",
    );
  }

  if (token.length < 20) {
    throw new HttpsError(
        "invalid-argument",
        "O token do aparelho é inválido.",
    );
  }

  return token;
}

/**
 * Confirma que o usuário autenticado é administrador do sistema.
 *
 * @param {string} uid
 * @return {Promise<Object>}
 */
async function validarAdministradorSistema(uid) {
  const usuarioRef = db
      .collection("usuarios")
      .doc(uid);

  const usuarioSnap =
    await usuarioRef.get();

  if (!usuarioSnap.exists) {
    throw new HttpsError(
        "permission-denied",
        "O cadastro administrativo não foi localizado.",
    );
  }

  const usuario =
    usuarioSnap.data() || {};

  if (usuario.adminSistema !== true) {
    throw new HttpsError(
        "permission-denied",
        "Somente o administrador do sistema pode registrar este aparelho.",
    );
  }

  return {
    referencia: usuarioRef,
    dados: usuario,
  };
}

/**
 * Identifica erros que significam que o token FCM
 * não pode mais ser utilizado.
 *
 * @param {string} codigoErro
 * @return {boolean}
 */
function tokenDefinitivamenteInvalido(
  codigoErro,
) {
  return [
    "messaging/registration-token-not-registered",
    "messaging/invalid-registration-token",
  ].includes(codigoErro);
}

/**
 * Remove referências duplicadas.
 *
 * @param {Array<FirebaseFirestore.DocumentReference>} referencias
 * @return {Array<FirebaseFirestore.DocumentReference>}
 */
function removerReferenciasDuplicadas(
  referencias,
) {
  const mapa = new Map();

  referencias.forEach((referencia) => {
    if (!referencia?.path) {
      return;
    }

    mapa.set(
        referencia.path,
        referencia,
    );
  });

  return Array.from(
      mapa.values(),
  );
}

/**
 * Desativa aparelhos cujo token não é mais aceito pelo FCM.
 *
 * @param {Array<FirebaseFirestore.DocumentReference>} referencias
 * @return {Promise<void>}
 */
async function desativarDispositivosInvalidos(
  referencias,
) {
  const referenciasUnicas =
    removerReferenciasDuplicadas(
        referencias,
    );

  if (referenciasUnicas.length === 0) {
    return;
  }

  const blocos = dividirEmBlocos(
      referenciasUnicas,
      LIMITE_OPERACOES_BATCH,
  );

  for (const bloco of blocos) {
    const batch = db.batch();

    bloco.forEach((referencia) => {
      batch.set(
          referencia,
          {
            ativo: false,

            motivoDesativacao:
              "Token FCM inválido ou não registrado.",

            desativadoEm:
              FieldValue.serverTimestamp(),

            atualizadoEm:
              FieldValue.serverTimestamp(),
          },
          {
            merge: true,
          },
      );
    });

    await batch.commit();
  }
}

// ============================================================================
// FUNÇÃO CALLABLE: REGISTRAR APARELHO ADMINISTRATIVO
// ============================================================================

const registrarDispositivoAdmin = onCall(
    {
      region: REGIAO_FUNCOES,
      timeoutSeconds: 60,
      memory: "256MiB",
      maxInstances: 5,

      /*
       * O App Check poderá ser tornado obrigatório
       * depois que estiver configurado no ListaLar.
       */
      enforceAppCheck: false,
    },
    async (request) => {
      const uidAdministrador =
        request.auth?.uid || "";

      if (!uidAdministrador) {
        throw new HttpsError(
            "unauthenticated",
            "É necessário estar autenticado.",
        );
      }

      const administrador =
        await validarAdministradorSistema(
            uidAdministrador,
        );

      const token = validarToken(
          request.data?.token,
      );

      const tokenHash =
        gerarHashToken(token);

      const dispositivoRef =
        administrador.referencia
            .collection(
                COLECAO_DISPOSITIVOS,
            )
            .doc(tokenHash);

      const plataforma = textoSeguro(
          request.data?.plataforma,
          80,
      );

      const navegador = textoSeguro(
          request.data?.navegador,
          100,
      );

      const idioma = textoSeguro(
          request.data?.idioma,
          30,
      );

      const fusoHorario = textoSeguro(
          request.data?.fusoHorario,
          100,
      );

      const userAgent = textoSeguro(
          request.data?.userAgent,
          500,
      );

      const origem = textoSeguro(
          request.data?.origem,
          200,
      );

      const pagina = textoSeguro(
          request.data?.pagina,
          200,
      );

      const pwaInstalado =
        request.data?.pwaInstalado === true;

      try {
        await db.runTransaction(
            async (transacao) => {
              const dispositivoSnap =
                await transacao.get(
                    dispositivoRef,
                );

              const dadosDispositivo = {
                uid: uidAdministrador,

                token,

                tokenHash,

                ativo: true,

                plataforma,

                navegador,

                idioma,

                fusoHorario,

                pwaInstalado,

                userAgent,

                origem,

                pagina,

                ultimoRegistroEm:
                  FieldValue.serverTimestamp(),

                atualizadoEm:
                  FieldValue.serverTimestamp(),
              };

              if (!dispositivoSnap.exists) {
                dadosDispositivo.criadoEm =
                  FieldValue.serverTimestamp();
              }

              transacao.set(
                  dispositivoRef,
                  dadosDispositivo,
                  {
                    merge: true,
                  },
              );
            },
        );

        logger.info(
            "Aparelho administrativo registrado para notificações.",
            {
              uidAdministrador,
              tokenHash,
              plataforma,
              navegador,
              pwaInstalado,
            },
        );

        return {
          sucesso: true,

          dispositivoId: tokenHash,

          mensagem:
            "Notificações ativadas neste aparelho.",
        };
      } catch (erro) {
        logger.error(
            "Erro ao registrar aparelho administrativo.",
            {
              uidAdministrador,
              tokenHash,
              codigo: erro?.code || "",
              mensagem:
                erro?.message || String(erro),
            },
        );

        if (erro instanceof HttpsError) {
          throw erro;
        }

        throw new HttpsError(
            "internal",
            "Não foi possível registrar este aparelho.",
        );
      }
    },
);

// ============================================================================
// LOCALIZAÇÃO DOS APARELHOS ADMINISTRATIVOS
// ============================================================================

/**
 * Localiza administradores do sistema e seus aparelhos ativos.
 *
 * A função não confia somente na existência do token.
 * Ela primeiro consulta usuarios onde adminSistema === true.
 *
 * @return {Promise<Object>}
 */
async function localizarDispositivosAdministrativos() {
  const administradoresSnap = await db
      .collection("usuarios")
      .where(
          "adminSistema",
          "==",
          true,
      )
      .get();

  const mapaTokens = new Map();

  await Promise.all(
      administradoresSnap.docs.map(
          async (administradorSnap) => {
            const dispositivosSnap =
              await administradorSnap.ref
                  .collection(
                      COLECAO_DISPOSITIVOS,
                  )
                  .where(
                      "ativo",
                      "==",
                      true,
                  )
                  .get();

            dispositivosSnap.docs.forEach(
                (dispositivoSnap) => {
                  const dispositivo =
                    dispositivoSnap.data() || {};

                  const token = textoSeguro(
                      dispositivo.token,
                      4096,
                  );

                  if (!token) {
                    return;
                  }

                  if (!mapaTokens.has(token)) {
                    mapaTokens.set(
                        token,
                        {
                          token,
                          referencias: [],
                        },
                    );
                  }

                  mapaTokens
                      .get(token)
                      .referencias
                      .push(
                          dispositivoSnap.ref,
                      );
                },
            );
          },
      ),
  );

  return {
    quantidadeAdministradores:
      administradoresSnap.size,

    dispositivos:
      Array.from(
          mapaTokens.values(),
      ),
  };
}

// ============================================================================
// FUNÇÃO DO FIRESTORE: NOVA FAMÍLIA
// ============================================================================

const notificarNovaFamiliaAdmin =
  onDocumentCreated(
      {
        document:
          "familias/{familiaId}",

        region:
          REGIAO_FUNCOES,

        timeoutSeconds: 120,

        memory: "256MiB",

        maxInstances: 5,

        /*
         * Evita repetições automáticas ilimitadas.
         * Erros continuarão registrados nos logs.
         */
        retry: false,
      },
      async (event) => {
        const familiaSnap =
          event.data;

        if (!familiaSnap) {
          logger.warn(
              "Evento de nova família sem documento.",
              {
                familiaId:
                  event.params?.familiaId || "",
              },
          );

          return null;
        }

        const familia =
          familiaSnap.data() || {};

        const familiaId = textoSeguro(
            event.params?.familiaId ||
            familiaSnap.id,
            150,
        );

        const nomeFamilia =
          textoSeguro(
              familia.nome ||
              familia.nomeFamilia ||
              familia.titulo,
              100,
          ) ||
          "Nova família";

        const nomeAdministradorFamilia =
          textoSeguro(
              familia.donoNome ||
              familia.administradorNome ||
              familia.criadaPorNome,
              100,
          );

        const titulo =
          "Nova família cadastrada";

        let corpo =
          `A família "${nomeFamilia}" ` +
          "acabou de entrar no ListaLar.";

        if (nomeAdministradorFamilia) {
          corpo =
            `A família "${nomeFamilia}", ` +
            `de ${nomeAdministradorFamilia}, ` +
            "acabou de entrar no ListaLar.";
        }

        try {
          const localizacao =
            await localizarDispositivosAdministrativos();

          const dispositivos =
            localizacao.dispositivos;

          if (dispositivos.length === 0) {
            logger.info(
                "Nova família criada, mas não existem aparelhos administrativos ativos.",
                {
                  familiaId,
                  nomeFamilia,

                  quantidadeAdministradores:
                    localizacao
                        .quantidadeAdministradores,
                },
            );

            await familiaSnap.ref.set(
                {
                  notificacaoAdminStatus:
                    "sem_dispositivos",

                  notificacaoAdminProcessadaEm:
                    FieldValue.serverTimestamp(),
                },
                {
                  merge: true,
                },
            );

            return null;
          }

          const blocos = dividirEmBlocos(
              dispositivos,
              LIMITE_ENVIO_MULTICAST,
          );

          let totalSucesso = 0;
          let totalFalha = 0;

          const referenciasInvalidas = [];

          for (const bloco of blocos) {
            const tokens = bloco.map(
                (dispositivo) =>
                  dispositivo.token,
            );

            const mensagem = {
              tokens,

              notification: {
                title: titulo,
                body: corpo,
              },

              data: {
                tipo:
                  "nova_familia",

                familiaId,

                nomeFamilia,

                destino:
                  "/admin.html",
              },

              webpush: {
                headers: {
                  Urgency: "high",
                  TTL: "86400",
                },

                notification: {
                  title: titulo,

                  body: corpo,

                  icon:
                    URL_ICONE,

                  badge:
                    URL_ICONE,

                  tag:
                    `nova-familia-${familiaId}`,

                  renotify: false,

                  requireInteraction:
                    false,

                  data: {
                    tipo:
                      "nova_familia",

                    familiaId,

                    destino:
                      URL_ADMIN,
                  },
                },

                fcmOptions: {
                  link:
                    URL_ADMIN,
                },
              },
            };

            const resposta =
              await messagingAdmin
                  .sendEachForMulticast(
                      mensagem,
                  );

            totalSucesso +=
              resposta.successCount;

            totalFalha +=
              resposta.failureCount;

            resposta.responses.forEach(
                (
                    resultado,
                    indice,
                ) => {
                  if (resultado.success) {
                    return;
                  }

                  const codigoErro =
                    resultado.error?.code || "";

                  logger.warn(
                      "Falha ao enviar notificação para um aparelho.",
                      {
                        familiaId,
                        codigoErro,
                      },
                  );

                  if (
                    tokenDefinitivamenteInvalido(
                        codigoErro,
                    )
                  ) {
                    referenciasInvalidas.push(
                        ...bloco[indice]
                            .referencias,
                    );
                  }
                },
            );
          }

          await desativarDispositivosInvalidos(
              referenciasInvalidas,
          );

          await familiaSnap.ref.set(
              {
                notificacaoAdminStatus:
                  totalSucesso > 0
                    ? "enviada"
                    : "falha",

                notificacaoAdminEnviadaEm:
                  FieldValue.serverTimestamp(),

                notificacaoAdminSucessos:
                  totalSucesso,

                notificacaoAdminFalhas:
                  totalFalha,

                notificacaoAdminDispositivos:
                  dispositivos.length,
              },
              {
                merge: true,
              },
          );

          logger.info(
              "Notificação de nova família processada.",
              {
                familiaId,
                nomeFamilia,

                quantidadeAdministradores:
                  localizacao
                      .quantidadeAdministradores,

                dispositivos:
                  dispositivos.length,

                totalSucesso,

                totalFalha,

                tokensDesativados:
                  referenciasInvalidas.length,
              },
          );

          return null;
        } catch (erro) {
          logger.error(
              "Erro ao notificar nova família.",
              {
                familiaId,
                nomeFamilia,
                codigo: erro?.code || "",
                mensagem:
                  erro?.message || String(erro),
              },
          );

          await familiaSnap.ref.set(
              {
                notificacaoAdminStatus:
                  "erro",

                notificacaoAdminErro:
                  textoSeguro(
                      erro?.message ||
                      String(erro),
                      500,
                  ),

                notificacaoAdminErroEm:
                  FieldValue.serverTimestamp(),
              },
              {
                merge: true,
              },
          );

          throw erro;
        }
      },
  );

// ============================================================================
// EXPORTAÇÕES
// ============================================================================

module.exports = {
  registrarDispositivoAdmin,
  notificarNovaFamiliaAdmin,
};
