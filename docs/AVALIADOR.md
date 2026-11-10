# Guia do Avaliador — Jungle Marketplace

Este guia mapeia os critérios de avaliação do enunciado para pontos concretos do site, testes automatizados e documentação. A suíte Playwright será implementada na próxima onda (os comandos já existem no `package.json`); a estrutura de specs descrita abaixo é a prevista para cada área.

## Critérios → onde ver → o que comprova

| Critério (peso) | Onde ver no site | Teste Playwright (previsto) | Documento de apoio |
|---|---|---|---|
| **Fidelidade visual e responsividade (20)** | Todas as rotas — layout do Figma em breakpoints mobile/tablet/desktop; tipografia Space Mono + Press Start 2P self-hosted; tema escuro; galeria e estados de UI | `e2e/visual.spec.ts` — regressão visual de início, detalhe, carrinho e pagamento com baselines versionadas | `ARCHITECTURE.md` §8 (desvios do Figma) |
| **Fluxos e UX (20)** | Catálogo (`/`): busca, filtros por categoria/raridade/chain, ordenação, paginação e histórico na URL; detalhe (`/nft/nft-001`); carrinho (`/cart`) com cupom; checkout (`/checkout`) até o recibo; login/cadastro; perfil; 404 em rota inexistente | `e2e/catalog.spec.ts`, `e2e/nft-detail.spec.ts`, `e2e/cart.spec.ts`, `e2e/checkout.spec.ts` | `README.md` (fluxos de falha), `ARCHITECTURE.md` §6 e §9 |
| **Integração e estado (15)** | Skeleton → dados → erro com retry; favoritos com atualização otimista + rollback (cenário `favorite-fail`); carrinho de visitante → merge no login; sessão persistente após refresh; troca de usuário sem vazamento de cache | `e2e/favorites.spec.ts`, `e2e/auth.spec.ts`, `e2e/cart.spec.ts` | `ARCHITECTURE.md` §7 (cache e isolamento por usuário) |
| **Tempo real (10)** | Preço/estoque mudam ao vivo no detalhe e no checkout; evento `order.updated` confirma/recusa o pedido em ~2,5 s; duplicatas e eventos antigos são ignorados; queda de conexão → reconexão + revalidação | `e2e/realtime.spec.ts`, `e2e/realtime-recovery.spec.ts` | `ARCHITECTURE.md` §2–§3; `README.md` (eventos Socket.IO) |
| **Mocking (10)** | Painel de Simulação (ícone de frasco, `data-testid="scenario-panel-open"`): 13 cenários, reset, evento duplicado/antigo, derrubar conexões, pedidos pendentes e conexões ativas; `?scenario=` na URL; API `/api/__mock/*` | `e2e/*.spec.ts` usam `POST /api/__mock/scenario` e `/reset` para determinismo | `README.md` (cenários, endpoints de controle) |
| **Testes (10)** | — | `npm run test:e2e` — 12 áreas do enunciado (ver seção Como rodar); relatório em `playwright-report/` | `README.md` §Testes |
| **Acessibilidade (5)** | Navegação 100% por teclado; foco restaurado em diálogos; `aria-label`/live regions (toasts anunciam mudanças de tempo real); estados de erro/loading comunicados; `<html lang="pt-BR">` | `e2e/a11y.spec.ts` — teclado, foco, validação | `ARCHITECTURE.md` §9; metas Lighthouse |
| **Performance (5)** | Code-splitting por rota; skeletons com shimmer; cache de 30 s com revalidação; `refetchOnWindowFocus`; sem CDN de fontes | `npm run audit:lighthouse` — metas Perf ≥ 90, A11y ≥ 95, BP ≥ 95, SEO ≥ 90 (3 medições, mediana) | `ARCHITECTURE.md` §7; `README.md` §Auditoria |
| **Arquitetura e documentação (5)** | — | — | Este guia + `README.md` + `ARCHITECTURE.md` + `docs/DEFESA.md` |
| **Total (100)** | | | |

## Roteiro de 10 minutos

Roteiro sugerido para avaliar o essencial. Credenciais: `ana@jungle.test` / `Senha@123`.

**1. Catálogo e detalhe (0–2 min)**
- Abra `/`: observe skeletons, depois o catálogo (36 NFTs).
- Teste filtros (categoria, raridade, chain), busca, ordenação e paginação — tudo reflete na URL; volte/avance no navegador.
- Abra um detalhe; acesse `/nft/nao-existe` → 404 com retorno ao início.

**2. Compra completa (2–4 min)**
- Sem login, adicione um item ao carrinho (badge no header). Entre como Ana → o carrinho do visitante é mesclado.
- No carrinho, aplique o cupom `JUNGLE10` (10%). Siga o checkout: cotação com taxa de rede → carteira MetaMask → dados do colecionador → enviar.
- O pedido nasce `pending` e é **confirmado em ~2,5 s** (toast via socket) → recibo com txHash e link do explorador (simulados).

**3. Falha 1 — timeout idempotente (4–6 min)**
- Painel de Simulação → cenário `order-timeout`. Repita o checkout: o envio estoura o timeout de 8 s, a UI avisa e oferece **"Verificar status"**.
- Clique: a mesma `Idempotency-Key` recupera **o mesmo pedido** — nenhuma duplicata. Verifique em Meus pedidos.

**4. Falha 2 — preço muda no checkout (6–8 min)**
- Painel → `price-change`. Novo checkout: o preço do 1º item sobe 10% e o servidor devolve `409 QUOTE_CHANGED` com a nova cotação → a UI pede nova confirmação → confirme e veja o pedido criado com os valores atualizados.
- (Alternativa: `payment-rejected` → pedido recusado com "saldo insuficiente" e estoque devolvido.)

**5. Tempo real e estado (8–10 min)**
- Cenário `default`. Painel → **"Evento duplicado"** (ignorado) e **"Evento antigo"** (ignorado — o preço falso de 999 ETH não aparece).
- **"Derrubar conexões"** → reconexão automática com revalidação REST.
- Finalize com **"Resetar dados"** para restaurar o estado inicial.

## Como rodar a suíte de testes

```bash
npm install
npx playwright install          # instala os navegadores (uma vez)
npm run test:e2e                # suíte completa → relatório HTML em playwright-report/
npm run test:e2e:ui             # modo interativo (debug)
npm run test:visual:update      # regenera baselines visuais após mudanças intencionais
npm run audit:lighthouse        # auditoria Lighthouse (metas na tabela acima)
```

Os testes usam os endpoints de controle (`POST /api/__mock/scenario`, `/api/__mock/reset`, `/api/__mock/orders/:id/settle`, `/api/__mock/realtime/*`) para garantir cenários determinísticos, e `page.clock` para expiração de sessão.
