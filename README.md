# Kurio Marketplace — Frontend Challenge

[![CI](https://github.com/Mald1vas-Tech-Solut1ons/jungle-gaming-frontend-challenge/actions/workflows/ci.yml/badge.svg)](https://github.com/Mald1vas-Tech-Solut1ons/jungle-gaming-frontend-challenge/actions/workflows/ci.yml)

![Kurio](public/logo.png)

Marketplace de NFTs desenvolvido como teste técnico frontend para a **Jungle Gaming**, seguindo o design do [Figma do desafio](https://www.figma.com/design/Ff0SksUi7UFtPWUO8kyNtw/Frontend-Challenge).

A entrega roda **100% no navegador**: o backend é uma simulação completa (MSW) com estado persistente, tempo real via Socket.IO simulado e 14 cenários de falha acionáveis sem tocar em código. A demo publicada usa os mocks como backend.

## Stack

| Camada | Tecnologia |
|---|---|
| UI | React 19 + TypeScript, Tailwind CSS v4, shadcn/ui (componentes adaptados em `src/components/ui`) |
| Roteamento | TanStack Router (file-based, code-splitting automático) |
| Estado do servidor | TanStack Query v5 |
| HTTP | Axios (cliente único em `src/lib/api.ts`) |
| Backend simulado | MSW v2 + `@mswjs/socket.io-binding` (WebSocket) |
| Tempo real | `socket.io-client` (transporte websocket interceptado pelo MSW) |
| Dinheiro | `decimal.js` (ETH como strings decimais) |
| Validação | zod |
| Build | Vite 8 |
| Qualidade | oxlint, Playwright e Lighthouse (suíte E2E/auditoria na próxima onda — comandos já presentes) |

Requisitos: **Node.js ≥ 20** (desenvolvido com Node 24) e **npm**.

## Setup

```bash
npm install
npm run dev
```

Abra `http://localhost:5173`. Os mocks ativam automaticamente na inicialização (`VITE_ENABLE_MOCKS` default `true`) — não é preciso subir nenhum servidor de API.

## Variáveis de ambiente

Copie `.env.example` para `.env` se precisar alterar valores. Padrões já funcionam.

| Variável | Padrão | Descrição |
|---|---|---|
| `VITE_ENABLE_MOCKS` | `true` | Ativa o backend simulado (MSW). A demo roda **sempre** com mocks — deixe `true`. Qualquer valor exceto a string `'false'` ativa. |
| `VITE_SOCKET_URL` | `wss://realtime.jungle.mock` | URL do socket de tempo real. Não é um servidor real — a conexão é interceptada pelo MSW (`src/mocks/realtime.ts`). |

## Credenciais fictícias

Contas de demonstração (sessão simulada — não há backend real):

| Usuário | E-mail | Senha | Carteiras |
|---|---|---|---|
| Ana Colecionadora | `ana@jungle.test` | `Senha@123` | MetaMask principal (`0x71C7656EC7ab88b098defB751B7401B5f6d8976F`, Ethereum) |
| Bruno Trader | `bruno@jungle.test` | `Senha@123` | nenhuma (use para testar cadastro de carteira) |

Cupons de teste:

| Cupom | Desconto | Observação |
|---|---|---|
| `JUNGLE10` | 10% | válido |
| `APE25` | 25% | válido |
| `EXPIRED5` | 5% | expirado (para testar o tratamento de erro) |

## Cenários de simulação

A loja reage a 14 cenários determinísticos de rede e negócio, selecionáveis de três formas:

1. **Query string** — `?scenario=<nome>` (ex.: `http://localhost:5173/?scenario=order-timeout`); o valor é persistido em `localStorage`.
2. **Painel de Simulação** — botão flutuante com ícone de frasco (canto inferior direito, `data-testid="scenario-panel-open"`). Permite trocar o cenário, **resetar dados**, reenviar **evento duplicado**, emitir **evento antigo**, **derrubar conexões** e ver pedidos pendentes/conexões ativas.
3. **API de controle** — `POST /api/__mock/scenario` com `{ "scenario": "<nome>" }` (usado pelos testes Playwright).

| Cenário | Comportamento |
|---|---|
| `default` | Sucesso com latência normal (120 ms fixos — estável para baselines) |
| `slow` | Rede lenta: 2,5 s por requisição (observe os skeletons) |
| `variable` | Latência alternada lento/rápido no catálogo → respostas podem chegar fora de ordem |
| `offline` | Toda requisição falha com erro de rede |
| `server-error` | Catálogo e detalhe retornam HTTP 500 |
| `empty` | Catálogo vazio |
| `session-expired` | A próxima requisição autenticada retorna `401 SESSION_EXPIRED` (uma vez) |
| `favorite-fail` | Mutations de favoritos falham com erro transitório (testa rollback otimista) |
| `price-change` | O preço do 1º item do carrinho sobe 10% durante o checkout (uma vez) |
| `sold-out` | A edição do 1º item esgota durante o checkout (uma vez) |
| `order-timeout` | A criação do pedido estoura o timeout do cliente — o pedido existe e é recuperável por idempotência |
| `payment-rejected` | O pagamento é recusado na liquidação do pedido |
| `wallet-refused` | A conexão da carteira é recusada (`403`) |
| `wallet-disconnect` | A carteira desconecta no momento do pagamento (`403`, uma vez) — reconecte e tente de novo |

Cenários marcados "uma vez" disparam apenas na primeira ocorrência dentro do cenário ativo; trocar de cenário (ou resetar) zera o contador.

**Reset do estado:** o backend simulado persiste em `localStorage` (`mock:db`) e sobrevive a refresh. Para restaurar o estado conhecido: botão **Resetar dados** no Painel de Simulação ou `POST /api/__mock/reset`.

## Comandos disponíveis

| Comando | O que faz |
|---|---|
| `npm run dev` | Servidor de desenvolvimento Vite (HMR) |
| `npm run build` | `tsc -b && vite build` — checagem de tipos + build de produção |
| `npm run typecheck` | Checagem de tipos (`tsc -b`) |
| `npm run lint` | Lint com oxlint |
| `npm run preview` | Serve o build de produção localmente |
| `npm run test:e2e` | Suíte Playwright (próxima onda — ver seção Testes) |
| `npm run test:e2e:ui` | Playwright em modo UI |
| `npm run test:visual:update` | Atualiza baselines visuais (`playwright test --update-snapshots`) |
| `npm run audit:lighthouse` | Auditoria Lighthouse (`node scripts/lighthouse.mjs` — próxima onda) |

## Reproduzindo fluxos de falha

Todos os fluxos abaixo partem de uma compra comum: entre como `ana@jungle.test` / `Senha@123`, adicione um item ao carrinho e vá para o checkout.

**Timeout na criação do pedido → recuperação idempotente (`order-timeout`)**
1. Painel de Simulação → cenário `order-timeout`.
2. Siga o checkout até enviar o pedido.
3. O servidor cria o pedido mas segura a resposta por 15 s; o cliente estoura o timeout de 8 s e avisa "O servidor demorou. Verificando o status do pedido…".
4. Clique em **Verificar status** — a mesma `Idempotency-Key` é reenviada e o mesmo pedido é devolvido (sem duplicar). Acompanhe a confirmação no recibo.

**Preço muda durante o checkout (`price-change`)**
1. Cenário `price-change`. 2. No checkout, ao criar o pedido, o preço do 1º item sobe 10% e o servidor responde `409 QUOTE_CHANGED` com a nova cotação (o evento `nft.updated` também chega via socket). 3. A UI exibe a nova cotação e pede nova confirmação — confirme e o pedido é criado com os valores atualizados.

**Edição esgota no checkout (`sold-out`)** — semelhante ao anterior: a resposta é `409 AVAILABILITY_CONFLICT` com a cotação atualizada; o item some da disponibilidade.

**Pagamento recusado (`payment-rejected`)** — crie um pedido com o cenário ativo: ele nasce `pending` e a liquidação automática (~2,5 s) o marca `rejected` com motivo "Pagamento recusado pela carteira (saldo insuficiente na simulação)." e devolve o estoque. Toast de erro chega via `order.updated`.

**Carteira recusada (`wallet-refused`)** — em Perfil/Carteiras, tente conectar: `403 FORBIDDEN` "A conexão foi recusada na carteira.".

**Sessão expirada (`session-expired`)** — ative o cenário e faça qualquer ação autenticada (favoritar, abrir perfil): o próximo request autenticado devolve `401 SESSION_EXPIRED`, a sessão local é limpa e você é redirecionado ao login preservando o contexto da navegação.

**Favorito com falha (`favorite-fail`)** — clique no coração: a UI atualiza otimista e, com a falha, faz rollback com toast de erro.

**Rede e erros gerais** — `offline` (toda requisição falha com erro de rede; estados de erro com retry), `server-error` (catálogo/detalhe 500), `empty` (estado vazio), `slow` (skeletons longos), `variable` (respostas fora de ordem no catálogo).

## Contratos REST

Tudo sob `/api`. Erros seguem o corpo `{ error: { code, message, fields?, details? } }` tipado em `src/api/contracts.ts`. Códigos: `VALIDATION_ERROR`, `UNAUTHENTICATED`, `SESSION_EXPIRED`, `FORBIDDEN`, `NOT_FOUND`, `CONFLICT`, `AVAILABILITY_CONFLICT`, `QUOTE_CHANGED`, `COUPON_INVALID`, `COUPON_EXPIRED`, `IDEMPOTENCY_CONFLICT`, `TRANSIENT_FAILURE`, `INTERNAL_ERROR`.

| Método | Path | Auth | Descrição |
|---|---|---|---|
| GET | `/api/nfts` | — | Catálogo paginado. Query: `q`, `category[]`, `rarity[]`, `chain[]` (valores separados por vírgula), `minPrice`, `maxPrice`, `featured`, `sort` (`recent\|price_asc\|price_desc\|popular\|name`), `page`, `pageSize` (1–48, padrão 12) |
| GET | `/api/nfts/:id` | — | Detalhe do NFT; `404 NOT_FOUND` |
| GET | `/api/favorites` | Bearer | Lista de ids favoritados |
| PUT | `/api/favorites/:nftId` | Bearer | Favorita (incrementa likes) |
| DELETE | `/api/favorites/:nftId` | Bearer | Desfavorita (decrementa likes) |
| GET | `/api/cart` | Visitante ou Bearer | Carrinho (itens hidratados com estado atual do catálogo) |
| POST | `/api/cart/items` | Visitante ou Bearer | Adiciona `{nftId, editionId, quantity}` (quantidade inteira ≥ 1; `409 AVAILABILITY_CONFLICT` se esgotado/acima do `maxPerOrder`) |
| PATCH | `/api/cart/items/:itemId` | Visitante ou Bearer | Define quantidade |
| DELETE | `/api/cart/items/:itemId` | Visitante ou Bearer | Remove item (limpa cupom se carrinho ficar vazio) |
| POST | `/api/cart/merge` | Bearer | Mescla carrinho do visitante (`{guestCartId}`) no do usuário; retorna `{cart, warnings}` e remove o carrinho guest |
| POST | `/api/cart/coupon` | Visitante ou Bearer | Aplica `{code}`; `COUPON_INVALID`/`COUPON_EXPIRED` |
| DELETE | `/api/cart/coupon` | Visitante ou Bearer | Remove cupom |
| POST | `/api/quote` | Visitante ou Bearer | Gera cotação `{network}`: subtotal, desconto, taxa de rede, total e `fingerprint`; expira em 5 min |
| POST | `/api/orders` | Bearer | Cria pedido. Exige header `Idempotency-Key` (`400` sem ele). Revalida e responde `409` com `details.quote` para `AVAILABILITY_CONFLICT`/`COUPON_EXPIRED`/`QUOTE_CHANGED`; mesma chave + mesmo conteúdo → mesmo pedido (`200`); chave reusada com conteúdo diferente → `409 IDEMPOTENCY_CONFLICT`. Reserva estoque e emite `nft.updated` |
| GET | `/api/orders/:id` | Bearer | Detalhe do pedido; `404` (não `403`) para pedidos de outros usuários |
| GET | `/api/orders?status=` | Bearer | Pedidos do usuário (opcionalmente filtrados por `status`) |
| POST | `/api/auth/register` | — | Cadastro `{name, email, password}` → `201` com sessão |
| POST | `/api/auth/login` | — | Login `{email, password}` → sessão com token fictício |
| GET | `/api/auth/session` | Bearer | Sessão atual (valida o token salvo) |
| POST | `/api/auth/logout` | — | Encerra a sessão (`204`) |
| GET | `/api/me` | Bearer | Perfil do usuário |
| PUT | `/api/me` | Bearer | Atualiza perfil (nome, username, e-mail, bio, avatar data-URL ≤ ~1 MB) |
| POST | `/api/me/password` | Bearer | Troca senha `{currentPassword, newPassword}` (`204`) |
| GET | `/api/wallets` | Bearer | Carteiras do usuário |
| POST | `/api/wallets` | Bearer | Cadastra carteira (máx. 2 por usuário — `409`); valida endereço `0x` + 40 hex |
| PUT | `/api/wallets/:id` | Bearer | Atualiza carteira (garante exatamente uma principal) |
| POST | `/api/wallets/:id/connect` | Bearer | Simula conexão da carteira (`403 FORBIDDEN` no cenário `wallet-refused`) |

**Endpoints de controle da simulação** (não fazem parte do domínio — são metadados de avaliação):

| Método | Path | Descrição |
|---|---|---|
| GET | `/api/__mock/scenario` | Cenário atual + lista de cenários |
| POST | `/api/__mock/scenario` | Seleciona cenário (`{scenario}`); `422` se desconhecido |
| POST | `/api/__mock/reset` | Restaura o estado inicial da simulação |
| POST | `/api/__mock/orders/:id/settle` | Liquida pedido manualmente (`{outcome?: 'confirmed'\|'rejected'}`); `404` se inexistente/já liquidado |
| POST | `/api/__mock/realtime/replay` | Reenvia o último evento (duplicata exata) |
| POST | `/api/__mock/realtime/stale` | Emite evento antigo para `{nftId}` (versão anterior) |
| POST | `/api/__mock/realtime/drop` | Derruba conexões; `{downMs?}` recusa reconexões por esse período |
| GET | `/api/__mock/state` | Cenário, pedidos (id/status) e conexões ativas |

## Eventos Socket.IO

Envelope único (tipado em `src/api/contracts.ts`): `{ eventId, type, resource: {kind, id}, version, userId?, emittedAt, payload }`.

| Direção | Evento | Payload | Observações |
|---|---|---|---|
| Servidor → cliente | `nft.updated` | `{ nft: {id, price, editions, version} }` | Broadcast a todas as conexões; `version` é a versão monotônica do recurso |
| Servidor → cliente | `order.updated` | `{ order }` (pedido completo) | Privado: enviado apenas a conexões autenticadas do dono do pedido (`userId` resolvido via `session.auth`) |
| Cliente → servidor | `session.auth` | `{ token }` | Autentica a conexão para roteamento de eventos privados; reemitido a cada mudança de sessão |
| Cliente → servidor | `order.subscribe` | `{ orderId }` | Tipado no contrato para assinatura explícita (o mock atual roteia por `userId`) |

**Transporte e limitações:** o mock intercepta a conexão WebSocket do `socket.io-client` real via `@mswjs/socket.io-binding` e fala Engine.IO/Socket.IO. Só o transporte `websocket` é suportado (sem polling); o estado da simulação é por aba (as conexões e o banco em memória não são compartilhados entre abas); o servidor envia ping Engine.IO a cada 20 s.

## Sessão e estado do carrinho

- **Sessão simulada:** token fictício em `localStorage` (`auth.token`), validado pela API mock com expiração de **30 min**. Não há backend nem JWT reais.
- **Carrinho de visitante:** id estável (`guest.cart-id`) enviado no header `X-Guest-Cart-Id`; funciona sem login.
- **Merge no login:** ao autenticar, `POST /api/cart/merge` move os itens do visitante para o carrinho do usuário (com avisos se algo for ajustado) e descarta o carrinho guest.
- **Expiração:** qualquer resposta `401 SESSION_EXPIRED` (tempo esgotado ou cenário `session-expired`) limpa o token, descarta o cache privado e leva ao login preservando o contexto da navegação/checkout via redirect.
- **Logout:** limpa token, `guest.cart-id` e o cache privado do usuário (isolamento entre usuários).

## Estratégia de cache e reconciliação REST ↔ Socket

- **TanStack Query:** `staleTime` 30 s (carrinho: 0 — sempre fresco; favoritos: 30 s; sessão: 5 min), `gcTime` 5 min, `refetchOnWindowFocus` ativo; retry (máx. 2, backoff exponencial com jitter) apenas para erros retryáveis — 4xx nunca repete. **Mutations nunca repetem sozinhas.**
- **Axios** (`src/lib/api.ts`): retry apenas em GET idempotente (2 tentativas, backoff 400 ms·2ⁿ + jitter) para rede/timeout/5xx transitório; timeout de 10 s (8 s na criação de pedido).
- **Eventos de socket** atualizam o cache em lugar (`setQueryData`, sem flicker) e invalidam derivados (carrinho, cotação); na (re)conexão, o cliente invalida as consultas ativas e revalida via REST — a rede é a fonte da verdade, o socket é acelerador.
- Detalhes e justificativas: [ARCHITECTURE.md](./ARCHITECTURE.md).

## Estrutura de pastas

```
├── public/               # mockServiceWorker.js, imagens de NFTs (/nfts/*.jpg), favicon
├── src/
│   ├── api/contracts.ts  # Tipos compartilhados REST + eventos (única fonte de verdade app ↔ mock)
│   ├── mocks/            # Backend simulado MSW
│   │   ├── handlers/     # catalog | commerce | account | control
│   │   ├── scenarios.ts  # 14 cenários de simulação
│   │   ├── realtime.ts   # Socket.IO simulado (@mswjs/socket.io-binding)
│   │   ├── db.ts         # Estado persistente (localStorage 'mock:db') + reset
│   │   ├── fixtures.ts   # Dados determinísticos (36 NFTs, usuários, cupons, taxas)
│   │   └── support.ts    # Auth, carrinho, cupons, cotação
│   ├── lib/              # api (Axios), query-client, socket, session, money (decimal.js), scenario, labels, utils
│   ├── hooks/            # use-nfts, use-cart, use-order, use-session, use-account
│   ├── components/ui/    # Componentes shadcn/ui adaptados (Button, Dialog, Skeleton…)
│   ├── components/layout/# Header, Footer, 404, Painel de Simulação, toasts de tempo real
│   └── routes/           # Rotas file-based: /, /nft/$nftId, /cart, /checkout, /orders/$orderId, /login, /register, /profile, /wallets
├── e2e/                  # Suíte Playwright (próxima onda — ver Testes)
├── scripts/lighthouse.mjs# Auditoria Lighthouse (próxima onda)
├── .env.example
└── vercel.json           # Deploy SPA + header para o service worker do MSW
```

Valores monetários (ETH) trafegam **sempre como strings decimais** com aritmética `decimal.js`; `formatEth` exibe até 4 casas (8 para valores < 0,0001), no formato pt-BR (`1.234,5678 ETH`). Quantidades são inteiras.

## Deploy (Vercel)

A demo publicada roda **com mocks ativos** — o backend é a própria simulação. `vercel.json`:

- rewrites SPA: `/((?!api/).*)` → `/index.html` (todas as rotas client-side funcionam em acesso direto);
- header `Service-Worker-Allowed: /` para `/mockServiceWorker.js` (o MSW registra o worker na raiz).

Build: `npm run build` (`tsc -b && vite build`).

## Testes

**Suíte Playwright (E2E + regressão visual)** — `e2e/*.spec.ts`, cobrindo as 12 áreas do enunciado: catálogo (busca, filtros, ordenação, paginação, histórico na URL); acesso direto ao detalhe + 404; cadastro, login, expiração, logout e troca de usuário; favoritos com falha e rollback; carrinho, cupom e persistência; compra completa até o recibo; falhas de pagamento, clique repetido e timeout idempotente; perfil, avatar, senha e carteiras; mudança de preço via socket no checkout; eventos duplicados/antigos e desconexão/reconexão; teclado, foco e validação; skeletons, erro e retry; regressão visual (início, detalhe, carrinho, pagamento) com baselines versionadas em `e2e/visual.spec.ts-snapshots/`.

- `npm run test:e2e` — roda a suíte completa (desktop 1440×900 + mobile 390×844).
- `npm run test:e2e:ui` — modo interativo (debug).
- `npm run test:visual:update` — regenera baselines visuais.
- Relatório HTML em `playwright-report/` após cada execução.
- **Relatório publicado por link**: uma cópia do relatório HTML fica em `/reports/playwright/` na demo (gerada pelo CI e committada após cada rodada).

## Auditoria Lighthouse

- `npm run audit:lighthouse` — auditoria de `/` e `/nft/nft-001` em perfis mobile e desktop, 3 medições por página/perfil, mediana por categoria. Metas: Performance ≥ 90, Acessibilidade ≥ 95, Boas práticas ≥ 95, SEO ≥ 90.
- Relatórios HTML/JSON versionados em `public/reports/lighthouse/` + `summary.json` com as medianas — **publicados por link** em `/reports/lighthouse/` na demo.

## Documentação complementar

- [ARCHITECTURE.md](./ARCHITECTURE.md) — decisões de arquitetura com contexto, trade-offs e limitações.
- [docs/AVALIADOR.md](./docs/AVALIADOR.md) — guia do avaliador (critérios → onde ver → teste que comprova) e roteiro de 10 minutos.
- [docs/DEFESA.md](./docs/DEFESA.md) — guia de defesa oral do candidato.
