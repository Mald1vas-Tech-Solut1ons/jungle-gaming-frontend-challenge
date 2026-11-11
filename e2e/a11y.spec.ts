import { expect, test } from '@playwright/test'
import { addItemToCartApi, fillCollector, login, setup, USERS } from './helpers'

/**
 * Área 11: navegação por teclado (Tab/Enter), foco de diálogos e validação
 * de formulários com erros associados (aria-describedby/aria-invalid).
 */

test.beforeEach(async ({ page }) => {
  await setup(page)
})

test('teclado: catálogo → detalhe → carrinho usando Enter', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByTestId('nft-grid').getByTestId('nft-card').first()).toBeVisible()

  // Foca o primeiro card e ativa com Enter
  await page.locator('[data-testid="nft-grid"] [data-testid="nft-card"] a').first().focus()
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(/\/nft\/nft-\d+/)
  await expect(page.getByTestId('nft-title')).toBeVisible()

  // Adiciona ao carrinho via teclado
  await page.getByTestId('add-to-cart').focus()
  await page.keyboard.press('Enter')
  await expect(page.getByTestId('cart-count')).toHaveText('1')

  // Vai para o carrinho via teclado (link do header)
  await page.getByTestId('header-cart').focus()
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(/\/cart/)
  await expect(page.getByTestId('cart-item')).toHaveCount(1)
})

test('diálogo de carteira move o foco para o primeiro campo', async ({ page }) => {
  await login(page, USERS.bruno.email, USERS.bruno.password)
  await page.goto('/wallets')
  await page.getByTestId('wallet-add').click()

  // Radix Dialog: foco no primeiro campo do formulário
  await expect(page.getByTestId('wallet-label')).toBeFocused()

  // Fechar com Escape devolve o foco ao gatilho
  await page.keyboard.press('Escape')
  await expect(page.getByTestId('wallet-label')).toHaveCount(0)
})

test('validação do login: erros visíveis e associados via aria-describedby', async ({ page }) => {
  await page.goto('/login')
  await page.getByTestId('login-submit').click()

  const email = page.getByTestId('login-email')
  const password = page.getByTestId('login-password')
  await expect(email).toHaveAttribute('aria-invalid', 'true')
  await expect(email).toHaveAttribute('aria-describedby', 'login-email-error')
  await expect(page.locator('#login-email-error')).toBeVisible()
  await expect(page.locator('#login-email-error')).toHaveText('Informe seu e-mail.')
  await expect(password).toHaveAttribute('aria-describedby', 'login-password-error')
  await expect(page.locator('#login-password-error')).toBeVisible()

  // Corrigir o campo limpa o erro e a associação
  await email.fill(USERS.ana.email)
  await expect(email).not.toHaveAttribute('aria-invalid', 'true')
  await expect(page.locator('#login-email-error')).toHaveCount(0)
})

test('validação do checkout: campos do colecionador com erros associados', async ({ page }) => {
  await login(page, USERS.ana.email, USERS.ana.password)
  await addItemToCartApi(page, 'nft-001')
  await page.goto('/checkout')
  await expect(page.getByTestId('submit-order')).toBeEnabled()

  await page.getByTestId('submit-order').click()

  await expect(page.getByTestId('checkout-fullName')).toHaveAttribute('aria-invalid', 'true')
  await expect(page.getByTestId('checkout-fullName')).toHaveAttribute('aria-describedby', 'checkout-fullName-error')
  await expect(page.locator('#checkout-fullName-error')).toHaveText('Informe o nome completo.')
  await expect(page.locator('#checkout-email-error')).toHaveText('Informe um e-mail válido.')
  await expect(page.locator('#checkout-country-error')).toHaveText('Selecione o país.')

  // Preencher remove os erros e libera o envio
  await fillCollector(page)
  await expect(page.locator('#checkout-fullName-error')).toHaveCount(0)
})

test('carteira no checkout é selecionável por teclado (radio + Space)', async ({ page }) => {
  await login(page, USERS.ana.email, USERS.ana.password)
  await addItemToCartApi(page, 'nft-001')
  await page.goto('/checkout')
  await expect(page.getByTestId('checkout-wallet')).toHaveCount(1)

  const wallet = page.getByTestId('checkout-wallet')
  await expect(wallet).toHaveAttribute('aria-checked', 'true') // principal pré-selecionada
  await wallet.focus()
  await page.keyboard.press(' ')
  await expect(wallet).toContainText('Selecionada')
})
