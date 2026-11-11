import { expect, test } from '@playwright/test'
import { addItemToCartApi, fillCollector, getState, login, logout, setScenario, setup, toast, USERS } from './helpers'

/**
 * Área 8: edição de perfil (nome/avatar persistem), troca de senha com
 * re-login, carteiras (criar, editar, regra de principal única, validações)
 * e conexão recusada (wallet-refused).
 */

const PNG_1PX = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64',
)

test.beforeEach(async ({ page }) => {
  await setup(page)
})

test('perfil: nome persiste após refresh; avatar é enviado e mantido', async ({ page }) => {
  await login(page, USERS.ana.email, USERS.ana.password)
  await page.goto('/profile')
  await expect(page.getByTestId('profile-name')).toHaveValue('Ana Colecionadora')

  // Validação: nome curto demais
  await page.getByTestId('profile-name').fill('A')
  await page.getByTestId('profile-save').click()
  await expect(page.getByText('Informe seu nome (mín. 2 caracteres).')).toBeVisible()

  // Nome novo + avatar
  await page.getByTestId('profile-name').fill('Ana Selva')
  await page.getByTestId('profile-avatar-input').setInputFiles({
    name: 'avatar.png',
    mimeType: 'image/png',
    buffer: PNG_1PX,
  })
  await page.getByTestId('profile-save').click()
  await expect(toast(page, 'Perfil atualizado.')).toBeVisible()

  // Persistência após refresh
  await page.reload()
  await expect(page.getByTestId('profile-name')).toHaveValue('Ana Selva')
  await expect(page.locator('main img[src^="data:image"]')).toBeVisible()
})

test('senha: troca e re-login com a nova senha', async ({ page }) => {
  await login(page, USERS.ana.email, USERS.ana.password)
  await page.goto('/profile')

  // Senha atual incorreta → erro no campo
  await page.getByTestId('password-current').fill('SenhaErrada1')
  await page.getByTestId('password-new').fill('NovaSenha@456')
  await page.getByTestId('password-confirm').fill('NovaSenha@456')
  await page.getByTestId('password-save').click()
  await expect(page.locator('#password-current-error')).toHaveText('Senha atual incorreta.')

  // Troca válida
  await page.getByTestId('password-current').fill('Senha@123')
  await page.getByTestId('password-save').click()
  await expect(toast(page, 'Senha alterada com sucesso.')).toBeVisible()

  // A senha antiga falha…
  await logout(page)
  await page.goto('/login')
  await page.getByTestId('login-email').fill(USERS.ana.email)
  await page.getByTestId('login-password').fill('Senha@123')
  await page.getByTestId('login-submit').click()
  await expect(page.getByText('E-mail ou senha incorretos.')).toBeVisible()

  // …e a nova funciona
  await page.getByTestId('login-email').fill(USERS.ana.email)
  await page.getByTestId('login-password').fill('NovaSenha@456')
  await page.getByTestId('login-submit').click()
  await expect(page).toHaveURL(/\/$/)
  await expect(page.getByTestId('header-logout')).toBeVisible()
})

test('carteiras: criar, validar endereço, editar e regra de principal única', async ({ page }) => {
  await login(page, USERS.bruno.email, USERS.bruno.password)
  await page.goto('/wallets')
  await expect(page.getByText('Nenhuma carteira cadastrada')).toBeVisible()

  // Criar 1ª carteira — validação de endereço inválido primeiro
  await page.getByText('Cadastrar primeira carteira').click()
  await page.getByTestId('wallet-label').fill('MetaMask pessoal')
  await page.getByTestId('wallet-address').fill('0xzzz')
  await page.getByTestId('wallet-save').click()
  await expect(page.getByText('Endereço inválido (0x + 40 caracteres hexadecimais).')).toBeVisible()
  await expect(page.getByTestId('wallet-address')).toHaveAttribute('aria-describedby', 'wallet-address-error')

  // Endereço válido + provider/rede → salva (principal automática)
  await page.getByTestId('wallet-address').fill('0x1111111111111111111111111111111111111111')
  await page.getByTestId('wallet-provider').click()
  await page.getByRole('option', { name: 'MetaMask' }).click()
  await page.getByTestId('wallet-network').click()
  await page.getByRole('option', { name: 'Ethereum' }).click()
  await page.getByTestId('wallet-save').click()
  await expect(toast(page, 'Carteira cadastrada.')).toBeVisible()
  await expect(page.getByTestId('wallet-card')).toHaveCount(1)
  await expect(page.getByTestId('wallet-card').first()).toContainText('Principal')

  // 2ª carteira
  await page.getByTestId('wallet-add').click()
  await page.getByTestId('wallet-label').fill('Coinbase reserva')
  await page.getByTestId('wallet-address').fill('0x2222222222222222222222222222222222222222')
  await page.getByTestId('wallet-provider').click()
  await page.getByRole('option', { name: 'Coinbase' }).click()
  await page.getByTestId('wallet-network').click()
  await page.getByRole('option', { name: 'Polygon' }).click()
  await page.getByTestId('wallet-save').click()
  await expect(page.getByTestId('wallet-card')).toHaveCount(2)

  // Limite de 2: aviso exibido (o botão permanece visível; o limite é validado no servidor)
  await expect(page.getByText(/Limite de 2 carteiras atingido/)).toBeVisible()

  // Editar a 1ª: troca o nome
  await page.getByTestId('wallet-edit').first().click()
  await page.getByTestId('wallet-label').fill('MetaMask principal editada')
  await page.getByTestId('wallet-save').click()
  await expect(toast(page, 'Carteira atualizada.')).toBeVisible()
  await expect(page.getByTestId('wallet-card').first()).toContainText('MetaMask principal editada')

  // Regra de principal única: marcar a 2ª como principal transfere o papel
  await page.getByTestId('wallet-edit').nth(1).click()
  await page.getByTestId('wallet-primary').click()
  await page.getByTestId('wallet-save').click()
  const cards = page.getByTestId('wallet-card')
  await expect(cards.nth(0)).toContainText('Secundária')
  await expect(cards.nth(1)).toContainText('Principal')

  // Persiste após refresh
  await page.reload()
  await expect(page.getByTestId('wallet-card')).toHaveCount(2)
  await expect(page.getByTestId('wallet-card').nth(1)).toContainText('Principal')
})

test('wallet-refused: conexão recusada exibe o motivo no toast', async ({ page }) => {
  await login(page, USERS.ana.email, USERS.ana.password)
  await page.goto('/wallets')
  await expect(page.getByTestId('wallet-card')).toHaveCount(1)

  await setScenario(page, 'wallet-refused')
  await page.getByTestId('wallet-connect').click()
  await expect(toast(page, 'A conexão foi recusada na carteira.')).toBeVisible()
})

test('wallet-disconnect: carteira desconecta no pagamento e a compra exige reconexão', async ({ page }) => {
  await login(page, USERS.ana.email, USERS.ana.password)
  await addItemToCartApi(page, 'nft-001')
  await page.goto('/checkout')
  await expect(page.getByTestId('checkout-fullName')).toBeVisible()
  await fillCollector(page)
  await expect(page.getByTestId('quote-total')).toBeVisible()

  // A carteira cai exatamente na hora de confirmar — pedido não é criado
  await setScenario(page, 'wallet-disconnect')
  await page.getByTestId('submit-order').click()
  await expect(toast(page, 'A carteira foi desconectada durante o pagamento.')).toBeVisible()
  await expect(page).toHaveURL(/\/checkout/)
  const state = await getState(page)
  expect(state.body.orders).toHaveLength(0)

  // Reconecta a carteira, volta ao cenário normal e a compra conclui
  await setScenario(page, 'default')
  await page.getByTestId('checkout-wallet-connect').click()
  await page.getByTestId('submit-order').click()
  await expect(page).toHaveURL(/\/orders\/ord-\d+/, { timeout: 15_000 })
  await expect(page.getByTestId('order-receipt')).toBeVisible({ timeout: 30_000 })
})
