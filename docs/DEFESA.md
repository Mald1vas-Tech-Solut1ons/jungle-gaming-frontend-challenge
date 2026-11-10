# Guia de Defesa — Jungle Marketplace

Roteiro de preparação para a entrevista oral. Respostas curtas, baseadas no código real, com evidências para citar (`arquivo:linha`). Linguagem simples e direta — o objetivo é demonstrar que cada decisão tem motivo e trade-off.

## Perguntas prováveis

### 1. "Por que TanStack Query?"

Cache de servidor não é estado de componente. O Query centraliza fetching, cache, retry e invalidação: `staleTime` de 30 s com eventos de socket invalidando antes disso, `refetchOnWindowFocus`, retry só para erros retryáveis (4xx nunca repete) e mutations com retry 0. Eu atualizo o cache **em lugar** quando chega evento (`setQueryData`) e invalido derivados (carrinho/cotação) — nada de estado duplicado em Redux/contexto. Trocar de usuário vira remoção seletiva de queries, não reset manual de estado.

Evidência: `src/lib/query-client.ts:20-33`, `src/lib/socket.ts:59-86`, `src/lib/socket.ts:154-160`.

### 2. "Por que idempotência? E como funciona a recuperação pós-timeout?"

Na criação de pedido, retry ingênuo pode duplicar cobrança. O servidor exige `Idempotency-Key`: grava chave + hash do conteúdo + pedido. Mesma chave e mesmo conteúdo → devolve o pedido existente; chave reusada com conteúdo diferente → `409 IDEMPOTENCY_CONFLICT`. No cliente, uma chave (UUID) é gerada por tentativa de checkout e mantida em ref; cliques repetidos são absorvidos pelo estado `submitting`. Se a resposta estoura o timeout (8 s) mas o pedido foi criado, o botão "Verificar status" reenvia **a mesma chave** e recupera o pedido — nunca um duplicado. O cenário `order-timeout` demonstra isso de ponta a ponta: o mock cria o pedido e segura a resposta por 15 s.

Evidência: `src/hooks/use-order.ts:91-131` (submit) e `:136-171` (recover); `src/mocks/handlers/commerce.ts:273-285` e `:395-397`.

### 3. "Como o tempo real reconcilia com o REST?"

O socket acelera, o REST é a fonte da verdade. Eventos carregam `eventId` e `version`: duplicatas exatas são descartadas por um set de ids vistos, e eventos com versão ≤ conhecida são ignorados (sem regressão). Na (re)conexão eu invalido as consultas ativas e revalido via REST — qualquer evento perdido durante a queda é coberto pelo refetch. Os endpoints de controle `replay` e `stale` provam a dedup e a rejeição de eventos antigos; `drop` prova a reconexão.

Evidência: `src/lib/socket.ts:44-56` (dedup/versão), `:117-121` (reconciliação), `:128-146` (ciclo de conexão); `src/mocks/realtime.ts:76-104` (emissão com envelope).

### 4. "Por que strings para ETH em vez de number?"

IEEE-754 acumula erro em aritmética decimal (0,1 + 0,2 ≠ 0,3) e arredondamentos não são auditáveis. Tudo trafega como string decimal e a aritmética usa `decimal.js` (precisão 40, half-up): subtotal, desconto, taxa e total são calculados no servidor simulado e só formatados no cliente (`formatEth`, até 4 casas, 8 para valores < 0,0001). Até as fixtures geram preços como inteiros de milésimos para evitar drift na origem. Bônus: é o formato que APIs reais (web3) usam — migração sem mudança de contrato.

Evidência: `src/api/contracts.ts:6` (EthString), `src/lib/money.ts:4-29`, `src/mocks/fixtures.ts:33-38`, `src/mocks/support.ts:129-165`.

### 5. "O que faria diferente em produção?"

O desenho foi feito para migrar sem tocar no app: desligar mocks (`VITE_ENABLE_MOCKS=false`) e apontar um socket real. Em produção: backend real com persistência no servidor (hoje o estado é por aba em localStorage), JWT/refresh em vez de token fictício, carteira real (MetaMask/assinatura de transação) em vez de `connect` simulado, liquidação por webhook on-chain em vez de timer de 2,5 s, tabela de idempotência com TTL, busca server-side (hoje 36 itens paginados em memória), rate limiting, i18n e CI com Playwright + Lighthouse por PR. Limitações honestas estão listadas em `ARCHITECTURE.md` §10.

### 6. "Como os mocks garantem cenários determinísticos?"

Três camadas: (1) **dados determinísticos** — PRNG semeado (mulberry32), epoch fixo, sem `Math.random()`/`Date.now()` nas fixtures; (2) **cenários explícitos** — 13 modos selecionáveis por URL, painel ou `POST /api/__mock/scenario`, com contadores "uma vez" (`once`) para falhas que devem ocorrer em um único ponto; (3) **estado resetável** — banco em localStorage com schema versionado e `resetDb()` que restaura o estado conhecido; baselines visuais e testes partem sempre do mesmo mundo. Os testes controlam o relógio (`page.clock`) para expirações.

Evidência: `src/mocks/fixtures.ts:8,21-31`, `src/mocks/scenarios.ts:10-24,61-65`, `src/mocks/db.ts:89-110`, `src/mocks/db.ts:132-134`.

### 7. "Por que o carrinho do visitante é mergeado no login?"

Porque perder itens ao autenticar é uma quebra de UX clássica. O visitante tem um id estável (`guest.cart-id` → header `X-Guest-Cart-Id`) e o login chama `POST /api/cart/merge`, que combina itens respeitando `maxPerOrder`/disponibilidade, devolve avisos se algo for ajustado e descarta o carrinho guest. Se a rede falhar no merge, o fluxo segue com aviso (best-effort), sem bloquear o login.

Evidência: `src/hooks/use-session.ts:42-56`, `src/mocks/handlers/commerce.ts:197-227`, `src/lib/session.ts:46-53`.

### 8. "Como você garante acessibilidade?"

Navegação completa por teclado (Radix dialogs/selects restauram foco e travam scroll), `aria-label`s e hierarquia semântica (main com id de destino de skip, nav rotulada), feedback de tempo real anunciado por live region via toasts (sonner), estados de loading/erro/vazio comunicados por texto, contraste do tema escuro conforme o design, `<html lang="pt-BR">`. As metas do Lighthouse são exigência minha de entrega: A11y ≥ 95. Testes específicos de teclado/foco/validação estão na área 11 da suíte.

Evidência: `src/routes/__root.tsx:24-31`, `src/components/layout/header.tsx:26-57`, `src/components/layout/realtime-toasts.tsx:6-22`, `index.html:2`.

### 9. "Como o clique duplo e o pagamento recusado são tratados?"

Clique duplo: estado `submitting` absorve repetições + idempotência no servidor (pergunta 2). Pagamento recusado: o pedido nasce `pending` e a liquidação pode terminar `rejected` (cenário `payment-rejected`) — o evento `order.updated` atualiza a tela, mostra o motivo e o mock **devolve o estoque reservado**, evitando item fantasma esgotado. O usuário vê o status real no recibo/meus pedidos.

Evidência: `src/mocks/handlers/commerce.ts:98-110` (devolução de estoque), `src/lib/socket.ts:95-100` (toast por status).

### 10. "Por que MSW e não um json-server/fake API?"

Porque o enunciado pede cenários de falha de rede, tempo real e determinismo para testes. MSW intercepta na **camada de rede**: o Axios real (com timeouts e retries) e o `socket.io-client` real funcionam sem nenhum fork de código — inclusive o WebSocket simulado pelo binding. Um fake API não cobre offline/timeout/socket; e, com contratos compartilhados, o mock implementa exatamente o que o app consome (checado pelo compilador).

Evidência: `src/mocks/browser.ts:13-28`, `src/mocks/realtime.ts:12-14`, `src/api/contracts.ts`.

## O que NÃO dizer

- **Não** diga que existe backend real, JWT real ou carteira real — é uma **simulação completa** no navegador (token fictício em `localStorage`, MetaMask fake). Assumir isso na defesa é o erro mais comum.
- **Não** diga que valores monetários usam `number` em lugar nenhum do fluxo (exibição converte string → decimal → formatação).
- **Não** diga que a suíte E2E e o Lighthouse já estão com resultados rodados se ainda não estiverem — os comandos existem no `package.json`; a implementação dos specs/script é a próxima onda. Diga a verdade com o plano na mão.
- **Não** diga que o tempo real é um servidor Socket.IO de verdade — o `@mswjs/socket.io-binding` fala o protocolo dentro da aba; só transporte `websocket`, estado por aba.
- **Não** diga que o carrinho sobrevive a limpeza de `localStorage` ou que funciona entre abas — persistência é por aba.
- **Não** diga que favoritos/pedidos de um usuário são protegidos por autorização real no servidor — o isolamento é simulado (404 para pedido alheio, eventos privados por `userId` na conexão).
- **Não** diga que o design usa as fontes exatas do Figma — Space Mono/Press Start 2P são a adaptação self-hosted documentada em `ARCHITECTURE.md` §8.
- **Não** diga que as imagens dos NFTs vieram do Figma — foram geradas localmente em `public/nfts/`.

## Evidências rápidas (mapa arquivo:linha)

| Tema | Onde |
|---|---|
| Contratos REST + eventos | `src/api/contracts.ts` |
| Política de cache | `src/lib/query-client.ts:20-33` |
| Retry/timeout HTTP | `src/lib/api.ts:17-18,85-96` |
| Dedup/versão/reconciliação | `src/lib/socket.ts:44-56,117-121` |
| Idempotência (cliente) | `src/hooks/use-order.ts:91-171` |
| Idempotência (servidor) | `src/mocks/handlers/commerce.ts:273-285` |
| 13 cenários | `src/mocks/scenarios.ts:10-24` |
| Socket simulado | `src/mocks/realtime.ts:37-69` |
| Fixtures determinísticas | `src/mocks/fixtures.ts:8,21-41` |
| Sessão/barramento | `src/lib/session.ts:19-43` |
| Merge de carrinho | `src/hooks/use-session.ts:42-56`; `src/mocks/handlers/commerce.ts:197-227` |
| Dinheiro (decimal.js) | `src/lib/money.ts:4-34`; `src/mocks/support.ts:129-165` |
| Painel de simulação | `src/components/layout/scenario-panel.tsx` |
| Deploy SPA | `vercel.json` |
