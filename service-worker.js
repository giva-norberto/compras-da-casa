/**
 * ============================================================================
 * LISTALAR - SERVICE WORKER
 *
 * RESPONSABILIDADES:
 * - Controle de versão e cache da PWA.
 * - Atualização dos arquivos locais.
 * - Funcionamento offline básico.
 * - Carregamento do módulo separado de notificações administrativas.
 *
 * A lógica do Firebase Cloud Messaging fica em:
 * notificacoes-admin-sw.js
 * ============================================================================
 */

/*
 * Carrega o módulo separado responsável pelas notificações
 * administrativas em segundo plano.
 *
 * O try/catch evita que uma eventual falha nas notificações
 * impeça o funcionamento normal do cache e da PWA.
 */
try {
  importScripts('./notificacoes-admin-sw.js');
} catch (erro) {
  console.error(
    '[ListaLar] Não foi possível carregar o módulo de notificações:',
    erro
  );
}

const parametros =
  new URL(self.location.href).searchParams;

const VERSAO =
  parametros.get('v') || '1.0.0';

const CACHE_NAME =
  `listalar-${VERSAO}`;

const ARQUIVOS_ESTATICOS = [
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon.png',
  './favicon-32.png',
  './unidades-produtos.js',
  './pwa-update.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then(async (cache) => {
        await Promise.allSettled(
          ARQUIVOS_ESTATICOS.map((arquivo) =>
            cache.add(
              `${arquivo}?v=${encodeURIComponent(VERSAO)}`
            )
          )
        );
      })
  );

  /*
   * Não ativa automaticamente.
   * Só assume o controle quando o usuário
   * clicar em "Atualizar agora".
   */
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((chaves) =>
      Promise.all(
        chaves
          .filter((chave) =>
            chave.startsWith('listalar-')
          )
          .filter((chave) =>
            chave !== CACHE_NAME
          )
          .map((chave) =>
            caches.delete(chave)
          )
      )
    )
  );

  self.clients.claim();
});

async function buscarNaRedeEAtualizarCache(
  request
) {
  const resposta = await fetch(request);

  if (
    resposta &&
    resposta.ok &&
    request.method === 'GET' &&
    new URL(request.url).origin ===
      self.location.origin
  ) {
    const cache =
      await caches.open(CACHE_NAME);

    await cache.put(
      request,
      resposta.clone()
    );
  }

  return resposta;
}

self.addEventListener('fetch', (event) => {
  const request = event.request;

  if (request.method !== 'GET') {
    return;
  }

  const url = new URL(request.url);

  /*
   * Firebase, Google Login e serviços externos
   * não são interceptados.
   */
  if (url.origin !== self.location.origin) {
    return;
  }

  /*
   * Navegação:
   * tenta buscar a versão mais recente.
   */
  if (request.mode === 'navigate') {
    event.respondWith(
      buscarNaRedeEAtualizarCache(request)
        .catch(async () => {
          return (
            await caches.match(request) ||
            await caches.match('./index.html')
          );
        })
    );

    return;
  }

  /*
   * Arquivos locais:
   * rede primeiro, cache como contingência.
   */
  event.respondWith(
    buscarNaRedeEAtualizarCache(request)
      .catch(() =>
        caches.match(request)
      )
  );
});
