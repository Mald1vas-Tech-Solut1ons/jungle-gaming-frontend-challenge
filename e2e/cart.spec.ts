import { expect, test } from '@playwright/test'
import { addItemToCartApi, login, parseEth, setup, toast, USERS } from './helpers'

/**
 * Área 5: carrinho — quantidades (limites de maxPerOrder/disponibilidade),
 * remoção, cupons, persistência após refresh e migração guest→login.
 */

test.beforeEach(async ({ page }) => {
  await setup(page)
})

test('quantidades: stepper respeita o máximo por pedido (maxPerOrder)', async ({ page }) => {
  await addItemToCartApi(page, 'nft-001') // edição 1/50: máx. 5 por pedido
  await page.goto('/cart')
  await expect(page.getByTestId('cart-item')).toHaveCount(1)

  const input = page.getByTestId('cart-qty-input')
  const plus = page.getByTestId('cart-qty-plus')
  await expect(input).toHaveValue('1')

  await plus.click()
  await expect(input).toHaveValue('2')
  await expect(page.getByTestId('cart-subtotal')).toBeVisible()

  // Sobe até o limite (5): o botão de aumentar desabilita
  for (let i = 0; i < 3; i++) await plus.click()
  await expect(input).toHaveValue('5')
  await expect(plus).toBeDisabled()

  // Digitar acima do limite é ignorado (nenhuma mudança)
  await input.fill('99')
  await input.press('Enter')
  await expect(input).toHaveValue('5')

  // Diminuir funciona e desabilita em 1
  const minus = page.getByTestId('cart-qty-minus')
  for (let i = 0; i < 4; i++) await minus.click()
  await expect(input).toHaveValue('1')
  await expect(minus).toBeDisabled()
})

test('remoção de item esvazia o carrinho', async ({ page }) => {
  await addItemToCartApi(page, 'nft-001')
  await page.goto('/cart')
  await expect(page.getByTestId('cart-item')).toHaveCount(1)
  await expect(page.getByTestId('cart-count')).toHaveText('1')

  await page.getByTestId('cart-remove').click()
  await expect(page.getByTestId('cart-empty')).toBeVisible()
  await expect(page.getByTestId('cart-count')).toHaveCount(0)
})

test('cupom: JUNGLE10 aplica desconto; EXPIRED5 e inválido falham com toast', async ({ page }) => {
  await addItemToCartApi(page, 'nft-001')
  await page.goto('/cart')
  await expect(page.getByTestId('cart-subtotal')).toBeVisible()

  // Cupom válido
  await page.getByTestId('coupon-input').fill('jungle10')
  await page.getByTestId('coupon-apply').click()
  await expect(toast(page, 'Cupom aplicado.')).toBeVisible()

  // Totais vêm da cotação (API) — espera o recálculo assentar
  const subtotal = parseEth(await page.getByTestId('cart-subtotal').textContent())
  await expect(async () => {
    const discount = parseEth(await page.getByTestId('cart-discount').textContent())
    const total = parseEth(await page.getByTestId('cart-total').textContent())
    expect(Math.abs(discount)).toBeCloseTo(subtotal * 0.1, 4)
    expect(total).toBeCloseTo(subtotal + discount + 0.0042, 4)
  }).toPass({ timeout: 8000 })

  // Remover cupom volta ao total cheio
  await page.getByTestId('coupon-remove').click()
  await expect(async () => {
    const full = parseEth(await page.getByTestId('cart-total').textContent())
    expect(full).toBeCloseTo(subtotal + 0.0042, 4)
  }).toPass({ timeout: 8000 })

  // Cupom expirado
  await page.getByTestId('coupon-input').fill('EXPIRED5')
  await page.getByTestId('coupon-apply').click()
  await expect(toast(page, 'Este cupom expirou.')).toBeVisible()

  // Cupom inválido
  await page.getByTestId('coupon-input').fill('NAOEXISTE')
  await page.getByTestId('coupon-apply').click()
  await expect(toast(page, 'Cupom inválido.')).toBeVisible()
})

test('carrinho de visitante persiste após refresh', async ({ page }) => {
  await addItemToCartApi(page, 'nft-001')
  await page.goto('/cart')
  await expect(page.getByTestId('cart-item')).toHaveCount(1)

  await page.reload()
  await expect(page.getByTestId('cart-item')).toHaveCount(1)
  await expect(page.getByTestId('cart-qty-input')).toHaveValue('1')
})

test('migração guest→login: itens do visitante são preservados ao autenticar', async ({ page }) => {
  await addItemToCartApi(page, 'nft-001')
  await addItemToCartApi(page, 'nft-002')
  await page.goto('/cart')
  await expect(page.getByTestId('cart-item')).toHaveCount(2)

  await login(page, USERS.ana.email, USERS.ana.password)
  await expect(page.getByTestId('cart-count')).toHaveText('2')
  await page.goto('/cart')
  await expect(page.getByTestId('cart-item')).toHaveCount(2)
  const names = await page.locator('[data-testid="cart-item"] a').allTextContents()
  expect(names.join('|')).toContain('Golden Nomad') // nft-001
  expect(names.join('|')).toContain('Emerald Vessel') // nft-002
})
