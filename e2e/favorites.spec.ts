import { expect, test } from '@playwright/test'
import { login, setScenario, setup, toast, USERS } from './helpers'

/**
 * Área 4: favoritos — toggle com estado persistente, falha de mutation com
 * rollback otimista e recuperação, e redirecionamento de visitantes.
 */

test.beforeEach(async ({ page }) => {
  await setup(page)
})

test('favoritar e desfavoritar um NFT (estado persistente)', async ({ page }) => {
  await login(page, USERS.ana.email, USERS.ana.password)
  await page.goto('/nft/nft-001')

  const like = page.getByTestId('like-button')
  await expect(like).toHaveAttribute('aria-pressed', 'false')

  await like.click()
  await expect(like).toHaveAttribute('aria-pressed', 'true')

  // Aguarda o servidor persistir antes do reload (evita abortar a mutação em voo)
  await expect(async () => {
    const server = await page.evaluate(async () => {
      const token = localStorage.getItem('auth.token')!
      const res = await fetch('/api/favorites', { headers: { Authorization: `Bearer ${token}` } })
      return (await res.json()) as { nftIds: string[] }
    })
    expect(server.nftIds).toContain('nft-001')
  }).toPass({ timeout: 8000 })

  // Persiste após refresh (favoritos vêm da API)
  await page.reload()
  await expect(page.getByTestId('like-button')).toHaveAttribute('aria-pressed', 'true')

  // Desfavoritar
  await page.getByTestId('like-button').click()
  await expect(page.getByTestId('like-button')).toHaveAttribute('aria-pressed', 'false')
})

test('falha de mutation faz rollback e recuperação funciona após o default', async ({ page }) => {
  await login(page, USERS.ana.email, USERS.ana.password)
  await page.goto('/nft/nft-001')
  const like = page.getByTestId('like-button')

  // Cenário de falha: otimista acende e depois faz rollback com toast de erro
  await setScenario(page, 'favorite-fail')
  await like.click()
  await expect(toast(page, 'Não foi possível salvar o favorito.')).toBeVisible()
  await expect(like).toHaveAttribute('aria-pressed', 'false')

  // Volta ao default e repete: agora funciona
  await setScenario(page, 'default')
  await like.click()
  await expect(like).toHaveAttribute('aria-pressed', 'true')

  // Sem regressão: o estado gravado bate com a API
  const serverState = await page.evaluate(async () => {
    const token = localStorage.getItem('auth.token')!
    const res = await fetch('/api/favorites', { headers: { Authorization: `Bearer ${token}` } })
    return (await res.json()) as { nftIds: string[] }
  })
  expect(serverState.nftIds).toContain('nft-001')
})

test('visitante que tenta favoritar é levado ao login preservando o destino', async ({ page }) => {
  await page.goto('/nft/nft-001')
  await page.getByTestId('like-button').click()
  await expect(page).toHaveURL(/\/login/)
  await expect(page).toHaveURL(/redirect=%2Fnft%2Fnft-001/)
})
