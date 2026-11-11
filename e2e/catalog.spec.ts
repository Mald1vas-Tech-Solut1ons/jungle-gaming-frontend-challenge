import { expect, test, type Page } from '@playwright/test'
import { parseEth, searchParam, setScenario, setup, DEFAULT_LATENCY } from './helpers'

/**
 * Área 1: busca, filtros combinados, ordenação e paginação com estado na URL
 * (histórico/refresh). Área 2: acesso direto ao detalhe e 404. Área 12:
 * skeletons (slow), feedback de falha (offline/server-error) e recuperação.
 */

const PAGE_SIZE = 12

/** O hero também renderiza cards (`nft-card`) — escopo sempre no grid do catálogo. */
function grid(page: Page) {
  return page.getByTestId('nft-grid')
}

async function gridCardNames(page: Page): Promise<string[]> {
  return grid(page).getByTestId('nft-card-name').allTextContents()
}

async function gridCount(page: Page): Promise<number> {
  return grid(page).getByTestId('nft-card').count()
}

test.beforeEach(async ({ page }) => {
  await setup(page)
})

test('busca por texto reflete na URL e filtra o catálogo', async ({ page }) => {
  await page.getByTestId('search-input').fill('Cosmic')
  await expect(page).toHaveURL(/[?&]q=Cosmic/)
  // Debounce de 300ms aplica a busca
  await expect(async () => {
    const names = await gridCardNames(page)
    expect(names.length).toBe(3)
    for (const name of names) expect(name).toContain('Cosmic')
  }).toPass({ timeout: 8000 })

  // Limpar a busca volta ao catálogo completo (12 por página)
  await page.getByTestId('search-input').fill('')
  await expect(async () => {
    expect(await gridCount(page)).toBe(PAGE_SIZE)
  }).toPass({ timeout: 8000 })
})

test('filtros combinados (categoria + raridade + rede) na URL e no resultado', async ({ page }) => {
  await page.getByTestId('filter-category-gaming').click()
  await expect.poll(() => searchParam(page, 'category')).toEqual(['gaming'])
  await page.getByTestId('filter-rarity-legendary').click()
  await expect.poll(() => searchParam(page, 'rarity')).toEqual(['legendary'])
  await page.getByTestId('filter-chain-polygon').click()
  await expect.poll(() => searchParam(page, 'chain')).toEqual(['polygon'])

  // Confere os resultados contra a API (fonte da verdade)
  await expect(async () => {
    const expected = await page.evaluate(async () => {
      const res = await fetch('/api/nfts?category=gaming&rarity=legendary&chain=polygon&pageSize=48')
      const data = (await res.json()) as { items: { name: string }[] }
      return data.items.map((n) => n.name).sort()
    })
    const rendered = (await gridCardNames(page)).sort()
    expect(rendered).toEqual(expected)
    expect(rendered.length).toBeGreaterThan(0)
  }).toPass({ timeout: 8000 })

  // Todos os cards exibem o badge de raridade Lendário
  for (const card of await grid(page).getByTestId('nft-card').all()) {
    await expect(card).toContainText('Lendário')
  }

  // Limpar filtros restaura o estado
  await page.getByTestId('clear-filters').first().click()
  await expect(page).toHaveURL('http://localhost:4173/')
  await expect(async () => {
    expect(await gridCount(page)).toBe(PAGE_SIZE)
  }).toPass({ timeout: 8000 })
})

test('ordenação por preço crescente', async ({ page }) => {
  await page.getByTestId('sort-select').click()
  await page.getByRole('option', { name: 'Menor preço' }).click()
  await expect(page).toHaveURL(/[?&]sort=price_asc/)

  await expect(async () => {
    const cards = grid(page).getByTestId('nft-card')
    expect(await cards.count()).toBe(PAGE_SIZE)
    const prices: number[] = []
    for (const card of await cards.all()) {
      prices.push(parseEth(await card.locator('p.text-primary').textContent()))
    }
    for (let i = 1; i < prices.length; i++) expect(prices[i]).toBeGreaterThanOrEqual(prices[i - 1])
  }).toPass({ timeout: 8000 })
})

test('paginação navega entre as 3 páginas e corrige página fora do alcance', async ({ page }) => {
  await expect(page.getByTestId('page-indicator')).toHaveText('Página 1 de 3')
  await expect(page.getByTestId('pagination-prev')).toBeDisabled()

  await page.getByTestId('pagination-next').click()
  await expect(page).toHaveURL(/[?&]page=2/)
  await expect(page.getByTestId('page-indicator')).toHaveText('Página 2 de 3')

  await page.getByTestId('pagination-next').click()
  await expect(page.getByTestId('page-indicator')).toHaveText('Página 3 de 3')
  await expect(page.getByTestId('pagination-next')).toBeDisabled()

  // Acesso direto com página além do alcance: corrige para a primeira página
  await page.goto('/?page=99')
  await expect(page.getByTestId('page-indicator')).toHaveText('Página 1 de 3')
})

test('filtros sobrevivem a refresh e respondem ao histórico (voltar/avançar)', async ({ page }) => {
  await page.getByTestId('filter-category-sports').click()
  await expect.poll(() => searchParam(page, 'category')).toEqual(['sports'])
  // Nomes esperados direto da API (evita capturar o placeholder do grid)
  const expectedNames = await page.evaluate(async () => {
    const res = await fetch('/api/nfts?category=sports&pageSize=48')
    const data = (await res.json()) as { items: { name: string }[] }
    return data.items.map((n) => n.name).sort()
  })
  await expect(async () => {
    expect((await gridCardNames(page)).sort()).toEqual(expectedNames)
  }).toPass({ timeout: 8000 })

  // Refresh mantém o filtro (estado vem da URL)
  await page.reload()
  await expect(async () => {
    expect((await gridCardNames(page)).sort()).toEqual(expectedNames)
  }).toPass({ timeout: 8000 })

  // Voltar no histórico desfaz o filtro
  await page.goBack()
  await expect(page).toHaveURL('http://localhost:4173/')
  await expect(async () => {
    expect(await gridCount(page)).toBe(PAGE_SIZE)
  }).toPass({ timeout: 8000 })

  // Avançar reaplica o filtro
  await page.goForward()
  await expect(async () => {
    expect((await gridCardNames(page)).sort()).toEqual(expectedNames)
  }).toPass({ timeout: 8000 })
})

test('acesso direto ao detalhe do NFT', async ({ page }) => {
  await page.goto('/nft/nft-007')
  await expect(page.getByTestId('nft-title')).toBeVisible()
  const expectedName = await page.evaluate(async () => {
    const res = await fetch('/api/nfts/nft-007')
    const nft = (await res.json()) as { name: string }
    return nft.name
  })
  await expect(page.getByTestId('nft-title')).toHaveText(expectedName)
  await expect(page.getByTestId('gallery-main')).toBeVisible()
})

test('NFT inexistente exibe 404 amigável', async ({ page }) => {
  await page.goto('/nft/nft-999')
  await expect(page.getByText('NFT não encontrado')).toBeVisible()
  await expect(page.getByText('404')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Voltar ao início' })).toBeVisible()
})

test('rota inexistente exibe 404 global amigável', async ({ page }) => {
  await page.goto('/rota/que/nao/existe')
  await expect(page.getByText('Página não encontrada')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Voltar ao início' })).toBeVisible()
})

test('cenário slow: skeletons visíveis durante o carregamento', async ({ page }) => {
  await setScenario(page, 'slow')
  await page.goto('/?slow-load')

  // Enquanto carrega: grid marcado como ocupado + elementos .skeleton
  await expect(page.getByTestId('nft-grid')).toHaveAttribute('aria-busy', 'true', { timeout: 2000 })
  await expect(page.locator('.skeleton').first()).toBeVisible()

  // Depois de carregar (2,5s por requisição): cards reais, sem skeletons no grid
  await expect(page.getByTestId('nft-card').first()).toBeVisible({ timeout: 30_000 })
  await expect(page.getByTestId('nft-grid')).toHaveAttribute('aria-busy', 'false')
  expect(await gridCount(page)).toBe(PAGE_SIZE)
})

test('cenário offline: erro no detalhe com retry e recuperação do catálogo', async ({ page }) => {
  await setScenario(page, 'offline')
  await page.goto('/nft/nft-001')

  // Detalhe: falha na 1ª carga exibe o estado de erro com retry
  await expect(page.getByTestId('error-state')).toBeVisible({ timeout: 30_000 })
  await expect(page.getByTestId('retry-button')).toBeVisible()

  // Volta ao default e tenta de novo: detalhe carrega
  await setScenario(page, 'default')
  await page.getByTestId('retry-button').click()
  await expect(page.getByTestId('nft-title')).toBeVisible({ timeout: 15_000 })
})

test('cenário offline: catálogo com cache vazio exibe erro e retry recupera', async ({ page }) => {
  test.setTimeout(120_000)
  // Resultado vazio conhecido → o cache do catálogo fica com lista vazia
  await page.getByTestId('search-input').fill('zzzq-sem-resultado')
  await expect(page.getByTestId('empty-state')).toBeVisible({ timeout: 10_000 })

  // Troca o cenário pelo Painel de Simulação (invalida as consultas do catálogo):
  // a consulta falha e o app troca o estado vazio pelo erro com retry
  await page.getByTestId('scenario-panel-open').click()
  await page.getByTestId('scenario-select').click()
  await page.getByRole('option', { name: 'Sem conexão (falha de rede)' }).click()
  await expect(page.getByTestId('error-state')).toBeVisible({ timeout: 30_000 })
  await expect(page.getByTestId('retry-button')).toBeVisible()

  // Rede volta: retry recarrega e some o erro
  await setScenario(page, 'default')
  await page.getByTestId('retry-button').click()
  await expect(page.getByTestId('error-state')).toHaveCount(0)
  await expect(page.getByTestId('empty-state')).toBeVisible({ timeout: 15_000 })
  await page.getByTestId('clear-filters').first().click()
  await expect(async () => {
    expect(await gridCount(page)).toBe(PAGE_SIZE)
  }).toPass({ timeout: 8000 })
})

test('cenário server-error: feedback de falha no detalhe com retry', async ({ page }) => {
  await setScenario(page, 'server-error')
  await page.goto('/nft/nft-001')
  await expect(page.getByTestId('error-state')).toBeVisible({ timeout: 30_000 })
  await expect(page.getByTestId('error-state')).toContainText('Não foi possível carregar o NFT')

  // Retry no cenário default recupera o detalhe
  await setScenario(page, 'default')
  await page.getByTestId('retry-button').click()
  await expect(page.getByTestId('nft-title')).toBeVisible({ timeout: 15_000 })
})

test('cenário empty: estado vazio amigável', async ({ page }) => {
  await setScenario(page, 'empty')
  await page.goto('/?empty')
  await expect(page.getByTestId('empty-state')).toBeVisible({ timeout: 30_000 })
  await expect(page.getByTestId('empty-state')).toContainText('Nenhum NFT encontrado')
})

test('cenário variable: respostas fora de ordem não quebram o catálogo', async ({ page }) => {
  await setScenario(page, 'variable')
  await page.goto('/?variable')
  // Mesmo com latências alternadas, o grid termina estável com 12 cards
  await expect(grid(page).getByTestId('nft-card').first()).toBeVisible({ timeout: 30_000 })
  await page.waitForTimeout(2 * (1500 + 200) + DEFAULT_LATENCY + 500)
  expect(await gridCount(page)).toBe(PAGE_SIZE)
  // A primeira página é estável (sem trocas após o assentamento)
  const first = await grid(page).getByTestId('nft-card-name').first().textContent()
  await page.waitForTimeout(1000)
  expect(await grid(page).getByTestId('nft-card-name').first().textContent()).toBe(first)
})
