import { expect, test } from '@playwright/test'
import { addItemToCartApi, login, setup, USERS } from './helpers'

/**
 * Área 12 (extensão): resiliência do mock na URL publicada.
 *
 * O navegador encerra o service worker do MSW quando a aba fica em segundo
 * plano por tempo prolongado; ao voltar, a lista de clientes ativos fica vazia
 * e as chamadas `/api` escapam para o servidor real (Vercel) com 404 — o
 * carrinho quebra. A correção: reativar o worker no retorno da aba e, no
 * interceptor do Axios, detectar a resposta sem o envelope do mock, reativar e
 * tentar de novo (só GET idempotente).
 */
test('recupera o carrinho depois que o service worker do MSW é encerrado', async ({ page }) => {
  test.setTimeout(60_000)
  await setup(page)
  await login(page, USERS.ana.email, USERS.ana.password)
  await addItemToCartApi(page, 'nft-001')
  await page.goto('/cart')
  await expect(page.getByTestId('cart-item')).toHaveCount(1)

  // 1) Reproduz o erro: remove o registro do service worker (equivalente ao
  //    encerramento em segundo plano). O sinal real é o fetch deixar de ser
  //    interceptado — a referência `controller` pode persistir após unregister.
  await page.evaluate(async () => {
    const registrations = await navigator.serviceWorker.getRegistrations()
    await Promise.all(registrations.map((r) => r.unregister()))
  })

  // 2) Sem o worker, uma chamada a /api/cart cai no servidor real (404), não
  //    no mock. Poll porque o unregister é assíncrono no navegador.
  await expect
    .poll(async () => page.evaluate(async () => (await fetch('/api/cart')).status), { timeout: 10_000 })
    .not.toBe(200)

  // 3) Simula o retorno da aba: o listener reativa o worker e invalida as
  //    queries; o carrinho volta a responder.
  await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')))

  await expect(page.getByTestId('cart-item')).toHaveCount(1, { timeout: 20_000 })
  await expect(page.getByTestId('cart-total')).toBeVisible()

  // 4) O worker voltou a interceptar: /api/cart responde 200 do mock quando
  //    autenticado (espelha o interceptor do app).
  await expect
    .poll(
      async () =>
        page.evaluate(async () => {
          const token = localStorage.getItem('auth.token')
          const res = await fetch('/api/cart', { headers: token ? { Authorization: `Bearer ${token}` } : {} })
          return res.status
        }),
      { timeout: 15_000 },
    )
    .toBe(200)
})
