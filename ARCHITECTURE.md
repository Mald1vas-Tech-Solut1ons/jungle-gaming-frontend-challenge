# Arquitetura — Jungle Marketplace

Este documento registra as decisões de arquitetura da entrega, com contexto, trade-offs e limitações. Complementa o [README.md](./README.md) (contratos, comandos e cenários).

## 1. Mocks como backend da demo (MSW na camada de rede)

**Contexto:** o enunciado exige que o produto funcione integralmente para avaliação sem depender de um backend real, e que os cenários de falha sejam reproduzíveis por qualquer pessoa.

**Decisão:** o MSW v2 intercepta HTTP **na camada de rede** (service worker em `public/mockServiceWorker.js`), não via wrapper de módulos. O código de produção (`src/hooks`, `src/lib/api.ts`) chama `/api/...` normalmente — não sabe que o servidor é simulado. Isso preserva o Axios real, timeouts, retries e códigos de status verdadeiros, e permite desligar os mocks apenas trocando `VITE_ENABLE_MOCKS=false` sem tocar em código de negócio.

O backend simulado é um sistema completo e consistente em `src/mocks/`:

- **Contratos compartilhados** (`src/api/contracts.ts`): tipos REST, erros (`ApiErrorBody`) e eventos Socket.IO declarados uma única vez, usados pelo app e pelos handlers — o compilador garante que o mock implementa exatamente o que o app consome.
- **Estado único** (`src/mocks/db.ts`): catálogo, usuários, sessões, favoritos, carrinhos, carteiras, pedidos e registros de idempotência, persistidos em `localStorage` (`mock:db`, schema versionado; estado corrompido → reseed).
- **Determinismo** (`src/mocks/fixtures.ts`): 36 NFTs gerados por PRNG semeado (mulberry32), preços como inteiros de milésimos (sem drift de float), epoch fixo de fixtures, nenhum `Math.random()`/`Date.now()` nos dados — baselines visuais e testes são reproduzíveis.
- **Mutação com persistência** (`mutate()`), re-hidratação do carrinho a cada leitura (nomes/preços/estoque denormalizados sempre frescos) e `resetDb()` que restaura o estado conhecido.

**Trade-offs:** custo de manter um "backend" paralelo ao app (mitigado pelos contratos compartilhados e pelo porte pequeno); comportamento do service worker em alguns browsers (o header `Service-Worker-Allowed` no `vercel.json` resolve o registro na raiz em produção).

**Limitações:** estado **por aba** (não há broadcast entre abas — cada aba tem seu worker e seu banco); reset manual via painel/API; sem clock real (expirações usam `Date.now()`, controlável por `page.clock` nos testes); sem concorrência multi-cliente.

## 2. Socket.IO simulado com `@mswjs/socket.io-binding`

**Contexto:** o enunciado pede tempo real (preço/estoque mudando durante a navegação e o checkout). Sem backend, era preciso simular o protocolo, não apenas o efeito.

**Decisão:** o app usa o **`socket.io-client` real** com transporte `websocket` apontando para `VITE_SOCKET_URL`; o MSW intercepta o handshake WebSocket (`ws.link`) e o `@mswjs/socket.io-binding` fala Engine.IO/Socket.IO do lado do servidor (`src/mocks/realtime.ts`). O cliente implementa autenticação de conexão (`session.auth {token}`), deduplicação por `eventId`, ordenação por `version` e reconciliação — tudo exercitável de verdade, inclusive quedas de conexão.

**Limitações:** apenas transporte `websocket` (sem polling fallback); servidor por aba; ping Engine.IO a cada 20 s.

## 3. Envelope de eventos: dedup, versão e reconciliação pós-reconexão

**Contexto:** redes de tempo real entregam duplicatas e eventos fora de ordem; desconexões criam lacunas. O cliente precisa convergir para o estado do servidor sem regressões visíveis.

**Decisão** (`src/lib/socket.ts`):

- Todo evento carrega `eventId` (identidade estável) e `version` (versão monotônica do recurso após a mutação), além de `resource {kind, id}`.
- **Dedup:** um `Set` de `eventId` vistos (janela de 300) descarta duplicatas exatas — o endpoint `POST /api/__mock/realtime/replay` reenvia o último evento para provar isso.
- **Ordem:** eventos com `version <=` a última conhecida para o recurso são ignorados (sem regressão) — `POST /api/__mock/realtime/stale` emite um evento com versão antiga e payload mentiroso (preço 999 ETH) que a UI deve ignorar.
- **Reconciliação:** em **toda (re)conexão**, o cliente invalida as consultas ativas (`nfts`, `nft`, `cart`, `quote`, `orders`, `order`) e revalida via REST. O REST é a fonte da verdade; o socket é acelerador. Lacunas de eventos durante a queda são cobertas pelo refetch.
- **Aplicação no cache:** eventos atualizam o cache do TanStack Query em lugar (`setQueryData` — sem flicker) e invalidam derivados (carrinho e cotação derivam de preço/disponibilidade; pedidos confirmados removem itens do carrinho no mock).

**Trade-offs:** invalidar-e-refetch é mais simples que sequenciamento de eventos por stream; custo de uma revalidação por reconexão (aceitável).

## 4. Idempotência de pedidos e recuperação pós-timeout

**Contexto:** o enunciado pede proteção contra clique duplo e tratamento de timeout na criação do pedido — onde um retry ingênuo poderia cobrar duas vezes.

**Decisão** (`src/hooks/use-order.ts` + handler `commerce.ts`):

- `POST /api/orders` exige header `Idempotency-Key`. O servidor grava `{key, userId, requestHash, orderId}`; mesma chave + mesmo conteúdo (`hash` de quoteFingerprint, carteira, rede e colecionador) → devolve o pedido existente (`200`); mesma chave com conteúdo diferente → `409 IDEMPOTENCY_CONFLICT`.
- O cliente gera **uma chave por tentativa de checkout** (`crypto.randomUUID()`, mantida em ref) e absorve cliques repetidos com o estado `submitting`.
- O cenário `order-timeout` explora a janela real: o servidor cria o pedido e segura a resposta por 15 s, o cliente estoura o timeout de 8 s e entra em `pending-recovery`; o botão **"Verificar status"** reenvia **a mesma chave** e recupera o pedido já criado — nunca um duplicado.
- Mutations nunca retryam sozinhas (Query retry 0; retry do Axios restrito a GET). Recuperação é sempre explícita.
- O pedido nasce `pending` e é liquidado pela simulação em ~2,5 s (`confirmed`, ou `rejected` no cenário `payment-rejected`), com evento `order.updated`; pendentes são retomados após refresh. `POST /api/__mock/orders/:id/settle` permite liquidação manual nos testes.

**Trade-offs:** a tabela de idempotência cresce com pedidos (irrelevante na simulação; em produção, expiração por TTL). A recuperação exige guardar payload + chave em refs (memória) — aceitável para a duração do checkout.

## 5. Valores ETH como strings + decimal.js

**Contexto:** dinheiro em `number` (IEEE-754) acumula erro (0,1 + 0,2) e arredondamentos não auditáveis; contratos reais usam precisão arbitrária.

**Decisão:** todo valor monetário trafega como **string decimal** (`EthString` no contrato) e toda aritmética usa `decimal.js` (precisão 40, `ROUND_HALF_UP`) — subtotal, desconto, taxa e total calculados no servidor simulado (`computeQuote`) e apenas formatados no cliente (`formatEth`: até 4 casas, 8 para valores < 0,0001). Preços de fixtures são gerados como inteiros de milésimos para evitar drift já na origem. Quantidades são sempre inteiras.

**Trade-offs:** verbosidade (converter para exibir/calcular) em troca de correção e de compatibilidade com APIs reais que serializam valores como strings.

## 6. TanStack Router: estado na URL e guards

**Contexto:** filtros, ordenação, busca e paginação do catálogo devem sobreviver a refresh, voltar/avançar do navegador e compartilhamento de link.

**Decisão:**

- Router **file-based** com code-splitting automático (`src/routes/*`, `routeTree.gen.ts`); `defaultPreload: 'intent'` (pré-carrega na intenção de navegação), `defaultPreloadStaleTime` 10 s e `scrollRestoration`.
- **Estado do catálogo na URL** (query params → `NftListParams` → chave de query do TanStack Query): a URL é a fonte da verdade da navegação; o hook `useNftList` usa `placeholderData` para manter a página anterior visível entre trocas (sem flicker, útil no cenário `variable`).
- **Guards `beforeLoad`** nas rotas protegidas (`/checkout`, `/profile`, `/wallets`, `/orders/*`): sem sessão → redirect para `/login` preservando o destino; checkout sem carrinho → volta ao carrinho. Erros 401 `SESSION_EXPIRED` durante navegação/checkout passam pelo barramento de sessão e levam ao login preservando o contexto.
- Página 404 global (`NotFoundPage`) para rotas inexistentes; 404 de recurso (NFT/pedido inexistente) é estado de erro tipado da query (`retry: false` para não repetir 404).

## 7. Política de cache e invalidação

**Decisão** (`src/lib/query-client.ts`):

| Parâmetro | Valor | Por quê |
|---|---|---|
| `staleTime` | 30 s (padrão) | Catálogo muda pouco; eventos de socket invalidam antes. Carrinho 0 s (sempre fresco); sessão 5 min |
| `gcTime` | 5 min | Descartar dados fora de uso sem estourar memória |
| `refetchOnWindowFocus` | true | Reconciliação barata ao voltar para a aba |
| retry de queries | máx. 2, só erros retryáveis | 4xx nunca repete; backoff 250 ms·2ⁿ + jitter (teto 2 s) |
| retry de mutations | 0 | Recuperação explícita (idempotência ou ação do usuário) |
| Axios | retry apenas GET (2×), backoff 400 ms·2ⁿ + jitter; timeout 10 s / 8 s (pedidos) | GET é idempotente; POST de pedido tem idempotência própria |

- **Favoritos otimistas:** `onMutate` aplica o toggle, `onError` faz rollback para o snapshot anterior (exercitado pelo cenário `favorite-fail`), `onSettled` revalida.
- **Invalidação por evento:** `nft.updated` atualiza detalhe e listas em lugar e invalida `cart`/`quote`; `order.updated` atualiza o pedido e invalida `orders`/`cart`.
- **Isolamento por usuário:** logout remove queries privadas (`cart`, `orders`, `order`, `me`, `wallets`, `favorites`, `quote`) — dados de um usuário nunca vazam para o próximo. No mock, pedidos alheios respondem `404` (não `403`) para não revelar existência, e eventos de pedido só chegam a conexões autenticadas do dono.

## 8. Desvios do Figma

- **Fontes:** o design usa fontes proprietárias; a entrega usa **Space Mono** e **Press Start 2P** self-hosted via `@fontsource` (sem CDN, sem flash de fonte não estilizada) — mesma família visual, licença aberta.
- **Imagens de NFTs:** o Figma não fornece os ativos; as 12 imagens foram **geradas localmente** em `public/nfts/` (formato quadrado, tema de macacos digitais) e cicladas deterministicamente entre os 36 NFTs (4 por NFT na galeria do detalhe).
- **Páginas editoriais** do Figma fora do escopo funcional (sobre, blog etc.): quando referenciadas, exibem toast explicativo em vez de rota morta.

## 9. Decisões de UX

- **Toasts (sonner, `richColors`)**: feedback de sucesso/erro de mutations e de eventos de tempo real (`RealtimeToasts` transforma `nft.updated`/`order.updated` em avisos — sonner anuncia via live region, cobrindo a acessibilidade da mudança).
- **Skeletons com shimmer** em todas as cargas de dados (exercitados pelo cenário `slow`); estados de erro com **retry** explícito; estado vazio dedicado (cenário `empty`).
- **Focus management**: diálogos/folhas (Radix) restauram foco e travam scroll; navegação por teclado completa; `aria-label`s e `data-testid`s estáveis nos pontos de avaliação (`header-cart`, `scenario-panel-open`, etc.).
- Temas e textos 100% pt-BR; `<html lang="pt-BR">`; rotas com título e meta description definidos.

## 10. Limitações conhecidas e o que mudaria em produção

| Hoje (simulação) | Em produção |
|---|---|
| Backend MSW em localStorage, por aba | API real (REST + WebSocket autenticado), estado no servidor |
| Token fictício, sessão 30 min, senha hash SHA-256 no mock | JWT/refresh tokens, OAuth, bcrypt/argon2, rate limiting |
| MetaMask simulada (`connect` fake) | Carteira real (window.ethereum / WalletConnect), assinatura de transação |
| Liquidação de pedido por timer (2,5 s) | Webhook/polling de confirmação on-chain, fila de pagamento |
| Idempotência em memória | Tabela com TTL e constraint única |
| Eventos por aba, um "servidor" por cliente | Multi-tenant com namespaces/rooms, replay de eventos por cursor |
| Catálogo fixo de 36 itens, paginação em memória | Busca server-side, índices, paginação por cursor |
| Cupons/taxas hardcoded | Dinâmico no backend |
| pt-BR fixo | i18n |
| Lighthouse/E2E manual | CI (Playwright + Lighthouse CI por PR) |

O desenho de contratos (strings para ETH, envelope de eventos com `eventId`/`version`, idempotência no servidor) foi feito para migrar a um backend real **sem mudar o código do app** — basta apontar `VITE_ENABLE_MOCKS=false` e um `VITE_SOCKET_URL` real.
