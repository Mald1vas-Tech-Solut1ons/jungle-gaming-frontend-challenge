import { defineConfig, devices } from '@playwright/test'

/**
 * Suíte E2E + regressão visual do Jungle Marketplace.
 *
 * O app roda 100% com mocks (MSW + Socket.IO simulado): o `webServer` serve o
 * build de produção (`dist/`) na porta 4173 — rode `npm run build` antes.
 * Cada teste ganha um contexto novo (localStorage limpo → cenário default) e
 * restaura o estado conhecido via `POST /api/__mock/reset` no beforeEach.
 */
/** Porta do preview usado nos testes (sobrescreva com E2E_PORT se a 4173 estiver ocupada). */
const PORT = Number(process.env.E2E_PORT ?? 4173)

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: [['html', { open: 'never' }], ['list']],
  timeout: 45_000,
  expect: { timeout: 12_000 },
  // Baselines independentes de plataforma (o CI roda em Linux; local em Windows)
  // — fontes são self-hosted via @fontsource, então os glifos são idênticos.
  snapshotPathTemplate: '{testDir}/snapshots/{arg}{ext}',

  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium-desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
      testMatch: /^(?!.*mobile\.spec\.ts$).*\.spec\.ts$/,
    },
    {
      name: 'chromium-mobile',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 390, height: 844 },
        hasTouch: true,
        deviceScaleFactor: 3,
      },
      testMatch: /mobile\.spec\.ts$/,
    },
  ],

  webServer: {
    command: `npm run preview -- --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
