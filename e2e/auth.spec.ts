import { expect, test } from '@playwright/test'
import { addItemToCartApi, isLoggedIn, login, logout, setScenario, setup, USERS } from './helpers'

/**
 * Área 3: cadastro, login, expiração de sessão, logout e troca de usuário
 * (isolamento de dados privados entre contas).
 */

test.beforeEach(async ({ page }) => {
  await setup(page)
})

test('cadastro cria a conta e autentica; validações exibem erros associados', async ({ page }) => {
  await page.goto('/register')

  // Enviar vazio: erros de validação visíveis
  await page.getByTestId('register-submit').click()
  await expect(page.getByText('Informe seu nome (mín. 2 caracteres).')).toBeVisible()
  await expect(page.getByText('Informe seu e-mail.')).toBeVisible()

  // Senhas divergentes
  await page.getByTestId('register-name').fill('Carla Testadora')
  await page.getByTestId('register-email').fill('carla@jungle.test')
  await page.getByTestId('register-password').fill('Senha@123')
  await page.getByTestId('register-confirm').fill('Senha@456')
  await page.getByTestId('register-submit').click()
  await expect(page.getByText('As senhas não coincidem.')).toBeVisible()

  // Cadastro válido → autenticada e na raiz
  await page.getByTestId('register-confirm').fill('Senha@123')
  await page.getByTestId('register-submit').click()
  await expect(page).toHaveURL(/\/$/)
  await expect(page.getByTestId('header-logout')).toBeVisible()
  expect(await isLoggedIn(page)).toBe(true)

  // E-mail já cadastrado → erro por campo
  await logout(page)
  await page.goto('/register')
  await page.getByTestId('register-name').fill('Outra Pessoa')
  await page.getByTestId('register-email').fill('carla@jungle.test')
  await page.getByTestId('register-password').fill('Senha@123')
  await page.getByTestId('register-confirm').fill('Senha@123')
  await page.getByTestId('register-submit').click()
  await expect(page.getByText('Este e-mail já está cadastrado.')).toBeVisible()
})

test('login válido entra na conta; credenciais erradas exibem alerta', async ({ page }) => {
  await page.goto('/login')

  // Erro: senha incorreta
  await page.getByTestId('login-email').fill(USERS.ana.email)
  await page.getByTestId('login-password').fill('senha-errada')
  await page.getByTestId('login-submit').click()
  await expect(page.getByText('E-mail ou senha incorretos.')).toBeVisible()

  // Validação de campos vazios
  await page.getByTestId('login-email').fill('')
  await page.getByTestId('login-password').fill('')
  await page.getByTestId('login-submit').click()
  await expect(page.getByText('Informe seu e-mail.')).toBeVisible()
  await expect(page.getByText('Informe sua senha.')).toBeVisible()

  // Sucesso
  await login(page, USERS.ana.email, USERS.ana.password)
  expect(await isLoggedIn(page)).toBe(true)

  // Visitante tentando acessar /profile é redirecionado ao login após logout
  await logout(page)
  await page.goto('/profile')
  await expect(page).toHaveURL(/\/login/)
})

test('expiração de sessão: próxima requisição autenticada encerra a sessão e o retorno preserva o contexto', async ({ page }) => {
  await login(page, USERS.ana.email, USERS.ana.password)

  // Ativa o cenário: a primeira requisição autenticada (o carrinho do header,
  // disparado no carregamento da página) recebe 401 SESSION_EXPIRED → token
  // limpo + redirect automático para o login preservando a rota original.
  await setScenario(page, 'session-expired')
  await page.goto('/nft/nft-001')

  await expect(page).toHaveURL(/\/login/, { timeout: 15_000 })
  expect(await isLoggedIn(page)).toBe(false)
  await expect(page.getByTestId('header-login')).toBeVisible()

  const redirect = await page.evaluate(() => new URLSearchParams(window.location.search).get('redirect'))
  expect(redirect).toContain('/nft/nft-001')

  // Reautentica e RETOMA o fluxo de onde parou (contexto preservado)
  await page.getByTestId('login-email').fill(USERS.ana.email)
  await page.getByTestId('login-password').fill(USERS.ana.password)
  await page.getByTestId('login-submit').click()
  await expect(page).toHaveURL(/\/nft\/nft-001/, { timeout: 15_000 })
  await expect(page.getByTestId('nft-title')).toBeVisible()

  // Rota protegida continua redirecionando para o login quando visitante
  await page.getByTestId('header-logout').click()
  await page.goto('/profile')
  await expect(page).toHaveURL(/\/login/)
})

test('logout limpa dados privados: carrinho de Ana não aparece para Bruno', async ({ page }) => {
  await login(page, USERS.ana.email, USERS.ana.password)
  await addItemToCartApi(page, 'nft-001')
  await page.reload() // revalida o carrinho no cache do app (badge do header)
  await expect(page.getByTestId('cart-count')).toHaveText('1')

  await logout(page)
  await expect(page.getByTestId('cart-count')).toHaveCount(0)

  // Bruno entra: carrinho vazio (sem vazar o carrinho de Ana)
  await login(page, USERS.bruno.email, USERS.bruno.password)
  await expect(page.getByTestId('cart-count')).toHaveCount(0)
  await page.goto('/cart')
  await expect(page.getByTestId('cart-empty')).toBeVisible()

  // Voltando a Ana, o carrinho dela segue preservado (dado do usuário, não global)
  await logout(page)
  await login(page, USERS.ana.email, USERS.ana.password)
  await expect(page.getByTestId('cart-count')).toHaveText('1')
})
