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

- **Fontes:** o design usa sem serifa geométrica proprietária; a entrega usa **Montserrat** self-hosted via `@fontsource` (400–800, sem CDN, sem flash de fonte não estilizada) — aparência equivalente à medida nos frames exportados.
- **Identidade visual:** aplicada a paleta e a anatomia medidas por análise de pixels dos PNGs do Figma (fundo `#140D0A`, painéis `#241612`, CTA `#D28A4C`, acento de preços `#E89B55`, botões flat no desktop e gradiente horizontal `#CE874B→#B77743` nos CTAs mobile). O logotipo do Figma é reproduzido como wordmark "KURIO" em texto (sem o arquivo vetorial original).
- **Login/Cadastro:** o Figma mostra a seção de marketplace completa abaixo do formulário; a entrega mantém o formulário focado (decisão de UX) e omite a repetição do catálogo na mesma página.
- **Inputs:** o Figma alterna entre inputs com fill e transparentes; a entrega padroniza no estilo com fill (nota 10 do SPEC) por consistência e contraste.
- **Imagens de NFTs:** o Figma não fornece os ativos; as 12 imagens foram **geradas localmente** em `public/nfts/` (tema de macacos digitais) e cicladas deterministicamente entre os 36 NFTs (4 por NFT na galeria do detalhe). Convertidas para **WebP** (1024px, q80) — o catálogo caiu de 7,2MB para ~1MB.
- **Contagens da sidebar de filtros:** o Figma exibe contagens por coleção/rede; o contrato REST não expõe contagens por faceta, então a sidebar usa chips sem números (sem query extra por filtro).
- **Confirmação de pedido:** tela standalone (sem header/footer), como no Figma.
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

## 11. Resultados da auditoria Lighthouse

Mediana de 3 medições por página/perfil, contra o build otimizado (`vite build` + `vite preview`), cenário padrão dos mocks, Chromium instalado pelo Playwright. Relatórios HTML/JSON versionados em `public/reports/lighthouse/` (publicados em `/reports/lighthouse/` na demo) e `summary.json` com as medianas.

| Página | Perfil | Perf | A11y | BP | SEO | LCP | CLS | TBT |
|---|---|---|---|---|---|---|---|---|
| `/` | mobile | 72 | 100 | 100 | 92 | 1,01s | 0,01 | 1,36s |
| `/` | desktop | 26 | 100 | 100 | 92 | 9,31s | 0,00 | 1,36s |
| `/nft/nft-001` | mobile | 55 | 100 | 100 | 92 | 5,64s | 0,00 | 1,18s |
| `/nft/nft-001` | desktop | 26 | 100 | 100 | 92 | 10,15s | 0,00 | 1,16s |

**Metas:** Performance ≥ 90 ✗ · Acessibilidade ≥ 95 ✓ · Boas práticas ≥ 95 ✓ · SEO ≥ 90 ✓.

**Análise das metas não atingidas (Performance):**

1. **LCP simulado vs observado:** na execução sem throttling de rede/CPU, o LCP observado do desktop é **~1,4s** — os elementos críticos (mascote do hero, primeiro card) carregam com `fetchpriority=high` e imagens WebP de 40–80KB. Os valores de 5,6–10,2s aparecem **apenas sob throttling** (mobile: Lantern 4× CPU + 1,6Mbps; desktop: throttling real via CDP) e são dominados pelo **parse/execução do bundle do MSW + app no primeiro paint** (o backend da demo é o próprio cliente; o custo de script evaluation escala linearmente com a penalidade de CPU simulada, daí o desktop-devTools ser o pior caso).
2. **TBT ~1,2–1,4s:** principal contribuinte é o script evaluation do bundle de mocks (469KB min / ~172KB gzip — MSW, handlers, fixtures e o binding Socket.IO) + app (429KB min / ~135KB gzip). É o custo obrigatório da arquitetura exigida pelo desafio (mocks na camada de rede + Socket.IO simulado rodando no cliente); em produção com backend real, `VITE_ENABLE_MOCKS=false` elimina o chunk inteiro.
3. **CLS ~0** em todas as páginas/perfis (dimensões fixas nos cards, skeletons preservando layout) e **A11y 100** — as dimensões que dependem de engenharia estão no teto; a perda de Performance está concentrada na penalidade de CPU simulada sobre o código do backend simulado, não em carregamento de ativos.

**O que foi feito para mitigar (sem trapaça):** imagens WebP 1024px/q80 (7,2MB → ~1MB), `fetchpriority=high` + eager no primeiro conteúdo, preload do mascote no HTML, fontes self-hosted com `font-display: swap`, socket conectando em idle (não bloqueia o primeiro paint), AbortSignal em todas as queries. A auditoria roda sobre a página real com os mocks ativos — nenhuma simplificação exclusiva para pontuação.

## 12. Regressão visual cross-platform

As baselines visuais (Playwright) são geradas no Windows e o CI executa em Linux: a rasterização do texto (Montserrat self-hosted) difere ~1% dos pixels entre sistemas, mesmo com a mesma fonte embutida. Os testes visuais usam `maxDiffPixelRatio: 0.02` (2%) — tolera essa variância de antialiasing e continua reprovando regressões estruturais (layout quebrado, cor trocada, elemento ausente), que movem dezenas de % dos pixels. Regeneração: `npm run test:visual:update`; baseline por plataforma é evitada por `snapshotPathTemplate` fixo (`e2e/snapshots/{arg}`).
