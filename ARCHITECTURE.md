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

## 8. Fidelidade ao Figma e desvios

**O que segue o layout à risca** (frames desktop 1440 e mobile 414 em `Figma_files/`):

- **Tipografia:** **Roboto Mono** (a família usada nos frames), self-hosted via `@fontsource-variable/roboto-mono` (eixo de peso variável, `font-display: swap`, sem CDN). Títulos do hero em caixa alta bold; preços em bold âmbar; zero cortado (`font-feature-settings: 'zero'`) como nos valores em ETH.
- **Tokens:** paleta medida por amostragem de pixels (`#140D0A` fundo, `#241612` painéis, `#38220F` faixas, `#D28A4C` CTA, `#E89B55` preços e ativos, `#F5F1EB`/`#CFB28C`/`#B39463` textos). Geometria: painéis retos, controles com raio de 4px, artes com 12–16px, pílulas nas edições e steppers. Tudo em `src/index.css` (`@theme`).
- **Telas desktop:** header com navegação central e sublinhado ativo; catálogo com sidebar (coleções com contagem, faixa de preço com dois controles e "Aplicar", raridade, rede), card "NFT em destaque", abas "Todos / Novos lançamentos / Em alta", "Ordenar por", paginação numerada, banners editoriais e "Diário da Cunhagem"; rodapé com as três colunas, newsletter, faixa da marca e colunas de links; detalhe com miniaturas verticais, edições em pílula, stepper âmbar, COMPRAR/Favoritar, metadados, compartilhamento, abas e "Mais desta coleção"; carrinho em tabela + "Resumo da carteira"; pagamento com "Perfil do colecionador" em duas colunas + "Seus NFTs" + "Carteira e rede"; confirmação como cartão central standalone com envelope "THANK YOU" e faixa âmbar; Login/Cadastro como painel com abas "Entrar | Criar conta" sobre o hero; Perfil/Carteiras com a sidebar "Meu perfil".
- **Telas mobile:** barra de busca + botão de filtros, hero em cartão, grade de 2 colunas, barra de navegação inferior com ação central; detalhe com imagem no topo e barra de compra fixa ("Comprar NFT" em gradiente); carrinho em cartões com resumo em painel; "Pagamento com carteira"; Login/Cadastro empilhados com a marca no topo. Os CTAs mobile usam o gradiente horizontal `#D28A4C → #B77743` do layout; os desktop são chapados.
- **Movimento:** entrada escalonada dos cards, elevação + zoom da arte no hover, ações rápidas no card (carrinho, favoritar, ver), sublinhado animado de navegação/abas, contador do carrinho e coração com "pop", rotação dos destaques do hero (pausa no hover/foco), envelope flutuando na confirmação. Tudo é desligado com `prefers-reduced-motion`. Animações de entrada nunca são aplicadas ao elemento de LCP (o Lighthouse ignora elementos com opacidade 0).

**Desvios conscientes:**

- **Contrato do colecionador:** o frame de pagamento tem Nome de exibição, Nome de usuário, E-mail, Rede e Observação, além de campos de carteira (endereço, tipo, ENS, código de indicação). Os dados do colecionador seguem o frame (`CollectorInfo = { fullName, username, email, note? }`); os campos de carteira são cobertos pela seleção das **carteiras cadastradas** (requisito do README), em vez de serem redigitados a cada compra. "Código de indicação" não tem regra de negócio no enunciado e foi omitido.
- **Login/Cadastro:** o frame repete o catálogo inteiro sob o painel; a entrega mostra o painel sobre o hero (como no frame) sem duplicar o catálogo, evitando conteúdo e requisições redundantes. Rótulos visíveis acima dos campos no cadastro (o frame usa só placeholder) por acessibilidade.
- **Login social:** os botões Google/Facebook existem como no layout, mas avisam que não estão disponíveis na simulação — nenhuma ação fora do escopo finge sucesso. O mesmo vale para "Esqueceu a senha?", newsletter, redes sociais e páginas editoriais.
- **Botão "Adicionar ao carrinho" no detalhe desktop:** o frame tem só COMPRAR (vai ao carrinho); foi acrescentado um botão de ícone para adicionar sem sair da página (equivalente ao botão de carrinho do frame mobile).
- **Telas sem frame mobile** (Confirmação, Perfil, Carteiras): seguem o padrão das demais — barra de topo com voltar, conteúdo empilhado, abas em pílula no lugar da sidebar.
- **Tablet (768px):** sem frame; header desktop, filtros em gaveta lateral, grade de 3 colunas.
- **Imagens de NFTs:** o Figma contém 4 artes (Emerald Ape, Sage Nomad, Ivory Baron e Golden Beat), repetidas entre os cards. Para dar variedade visual aos 36 NFTs do catálogo — e tornar busca, filtros e paginação distinguíveis a olho — foram usadas 12 artes **geradas localmente** no mesmo estilo (retrato ilustrado sobre fundo pastel), em `public/nfts/`, distribuídas deterministicamente (WebP 1024px/q80, ~1MB no total).
- **Formato de valores:** ETH em pt-BR (`1,19 ETH`), coerente com o restante da interface em português; o frame usa ponto decimal.
- **Logotipo:** wordmark "KURIO" em texto, como nos frames (não há arquivo vetorial no Figma exportado).

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

Mediana de 3 medições por página/perfil, contra o build otimizado (`vite build` + `vite preview`), cenário padrão dos mocks, Chromium instalado pelo Playwright, Lighthouse 13 (`scripts/lighthouse.mjs`). Perfil **mobile**: padrão do Lighthouse (Moto G Power emulado, 4× CPU, rede 4G lenta, `simulate`). Perfil **desktop**: preset oficial `--preset=desktop` importado do próprio pacote (`lighthouse/core/config/desktop-config.js`). Relatórios HTML/JSON versionados em `public/reports/lighthouse/` (publicados em `/reports/lighthouse/` na demo) e `summary.json` com as medianas.

| Página | Perfil | Perf | A11y | BP | SEO | LCP | CLS | TBT |
|---|---|---|---|---|---|---|---|---|
| `/` | mobile | 75 | 100 | 100 | 100 | 4,89s | 0,026 | 316ms |
| `/` | desktop | 98 | 100 | 100 | 100 | 1,07s | 0,001 | 7ms |
| `/nft/nft-001` | mobile | 71 | 100 | 100 | 100 | 4,91s | 0,000 | 355ms |
| `/nft/nft-001` | desktop | 99 | 100 | 100 | 100 | 1,02s | 0,001 | 0ms |

**Metas:** Acessibilidade ≥ 95 ✓ (100 em tudo) · Boas práticas ≥ 95 ✓ · SEO ≥ 90 ✓ (100) · Performance ≥ 90 ✓ no desktop (98/99), ✗ no mobile (75/71).

**O que mudou nesta rodada (causas encontradas nos relatórios, não ajustes de pontuação):**

1. **Perfil desktop do script estava errado:** não definia `throttling` e herdava a rede lenta + CPU 4× do mobile, com throttling real — por isso o "desktop" pontuava abaixo do mobile (26–40). Agora usa o preset oficial do Lighthouse.
2. **Primeiro paint não espera o backend simulado:** antes, `main.tsx` aguardava baixar e iniciar o MSW (~470KB) para renderizar qualquer coisa. Agora o app renderiza imediatamente e só as requisições REST aguardam o sinal `mocksReady` (interceptor do Axios, `src/lib/mocks-ready.ts`); o chunk do MSW recebe `modulepreload` no HTML (plugin em `vite.config.ts`) e baixa em paralelo com o bundle principal; o log do MSW por requisição foi desligado (`quiet`).
3. **LCP sem remontagem:** a arte do hero não é mais recriada quando os dados chegam (contêiner estável, `key` pelo `src`); o card prioritário do catálogo entra sem animação de opacidade; o preload da arte tem `fetchpriority=high`.
4. **CLS do detalhe (0,173 → 0,001):** o rodapé aparecia dentro da dobra enquanto o skeleton era curto e era empurrado quando o conteúdo chegava; o `<main>` agora ocupa ao menos a altura da tela.
5. **Acessibilidade 97 → 100:** alvos de toque de 24px nos indicadores de carrossel e na faixa de preço; nome acessível do card em destaque igual ao texto visível. **SEO 92 → 100:** `robots.txt`.

**Por que o mobile fica abaixo de 90 (análise):** nas duas páginas o elemento de LCP no mobile é a primeira imagem de conteúdo que depende de dados — o primeiro card do catálogo (161px, maior que a arte do hero no layout mobile do Figma) e a arte do detalhe. A imagem em si já está em cache (pré-carregada; *resource load* ≈ 15ms); o tempo está em **element render delay**: os dados só existem depois que o service worker do MSW é instalado e ativado e a primeira consulta responde, tudo sob CPU 4× e rede 4G lenta simuladas. FCP é 0,9s e CLS ≈ 0 — a casca da página pinta cedo; o custo restante é o **backend rodando no próprio navegador**, exigido pelo desafio (mocks na camada de rede + Socket.IO simulado). Com backend real (`VITE_ENABLE_MOCKS=false`) o chunk do MSW e o registro do service worker deixam de existir. Não alteramos o layout do Figma para trocar o elemento de LCP nem simplificamos a página para a auditoria.

## 12. Regressão visual cross-platform

As baselines visuais (Playwright) são geradas no Windows e o CI executa em Linux: a rasterização do texto (Roboto Mono self-hosted) difere ~1% dos pixels entre sistemas, mesmo com a mesma fonte embutida. Os testes visuais usam `maxDiffPixelRatio: 0.02` (2%) — tolera essa variância de antialiasing e continua reprovando regressões estruturais (layout quebrado, cor trocada, elemento ausente), que movem dezenas de % dos pixels. Medido nos runs de CI: 0,4–0,8% dos pixels diferem entre Windows e Linux (margem de ~2,5× para o limite). Se uma mudança de layout levar uma página para fora da tolerância, o workflow `CI` pode ser disparado manualmente com `update_snapshots=true`: ele regera as baselines no Linux e as publica como artefato `visual-baselines`. Regeneração local: `npm run test:visual:update`; baseline por plataforma é evitada por `snapshotPathTemplate` fixo (`e2e/snapshots/{arg}`).
