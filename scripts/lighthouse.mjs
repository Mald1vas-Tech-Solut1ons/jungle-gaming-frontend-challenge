/**
 * Auditoria Lighthouse da demo (roda na página real com mocks — sem trapaça).
 *
 * - Páginas: `/` e `/nft/nft-001` (SPA servida em produção via `vite preview`).
 * - Perfis: mobile (390×844, throttling simulado) e desktop.
 * - 3 medições por página/perfil → mediana por categoria (Performance,
 *   Accessibility, Best Practices, SEO) + LCP/CLS/TBT.
 * - Saída: `public/reports/lighthouse/<page>-<perfil>-<n>.{html,json}` +
 *   `summary.json` com as medianas (publicados por link na demo).
 *
 * Usa o executável do Chromium instalado pelo Playwright
 * (`npx playwright install chromium`).
 */
import { spawn } from 'node:child_process'
import { existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import lighthouse from 'lighthouse'
import { launch } from 'chrome-launcher'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const OUT_DIR = join(ROOT, 'public', 'reports', 'lighthouse')
const BASE_URL = process.env.LH_BASE_URL ?? 'http://localhost:4173'
const PORT = 4173
const RUNS = 3

const PAGES = [
  { name: 'home', path: '/' },
  { name: 'nft-detail', path: '/nft/nft-001' },
]

const PROFILES = {
  mobile: {
    formFactor: 'mobile',
    screenEmulation: { mobile: true, width: 390, height: 844, deviceScaleFactor: 3, disabled: false },
    throttlingMethod: 'simulate',
  },
  desktop: {
    formFactor: 'desktop',
    screenEmulation: { mobile: false, width: 1350, height: 940, deviceScaleFactor: 1, disabled: true },
    // Throttling real via CDP (padrão do Lighthouse CLI para desktop): o modo
    // 'simulate' (Lantern) superestima o LCP quando o app intercepta a rede
    // com service worker (mocks MSW) — medido: LCP observado 1,4s vs 5,3s
    // simulado na mesma execução.
    throttlingMethod: 'devtools',
  },
}

// ---------------- Executável do Chromium (Playwright) ----------------

function findPlaywrightChrome() {
  const base = join(homedir(), 'AppData', 'Local', 'ms-playwright')
  if (!existsSync(base)) return null
  let best = null
  let bestTime = 0
  for (const entry of readdirSync(base)) {
    if (!entry.startsWith('chromium')) continue
    for (const sub of ['chrome-win', 'chrome-win64']) {
      const exe = join(base, entry, sub, 'chrome.exe')
      if (!existsSync(exe)) continue
      const mtime = statSync(exe).mtimeMs
      if (mtime > bestTime) {
        best = exe
        bestTime = mtime
      }
    }
  }
  return best
}

// ---------------- Servidor de preview ----------------

async function ensureServer() {
  try {
    const res = await fetch(`${BASE_URL}/`, { signal: AbortSignal.timeout(2000) })
    if (res.ok) {
      console.log(`✓ Servidor já rodando em ${BASE_URL}`)
      return null
    }
  } catch {
    /* servidor não está de pé */
  }
  console.log(`▶ Iniciando vite preview na porta ${PORT}…`)
  const child = spawn('npm', ['run', 'preview', '--', '--port', String(PORT), '--strictPort'], {
    cwd: ROOT,
    shell: process.platform === 'win32',
    stdio: 'ignore',
  })
  const deadline = Date.now() + 60_000
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${BASE_URL}/`, { signal: AbortSignal.timeout(1500) })
      if (res.ok) {
        console.log('✓ Servidor pronto.')
        return child
      }
    } catch {
      /* tenta de novo */
    }
    await new Promise((r) => setTimeout(r, 500))
  }
  child.kill()
  throw new Error(`Servidor não subiu em ${BASE_URL} em 60s. Rode \`npm run build\` antes.`)
}

// ---------------- Medições ----------------

function median(values) {
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

const CATEGORY_IDS = ['performance', 'accessibility', 'best-practices', 'seo']
const METRIC_AUDITS = {
  lcp: 'largest-contentful-paint',
  cls: 'cumulative-layout-shift',
  tbt: 'total-blocking-time',
}

function summarize(lhr) {
  const categories = {}
  for (const id of CATEGORY_IDS) {
    const cat = lhr.categories[id]
    categories[id] = Math.round((cat?.score ?? 0) * 100)
  }
  const metrics = {}
  for (const [key, auditId] of Object.entries(METRIC_AUDITS)) {
    metrics[key] = lhr.audits[auditId]?.numericValue ?? null
  }
  return { categories, metrics }
}

function slugFor(pageName) {
  return pageName
}

async function auditOnce(chrome, page, profileId) {
  const flags = {
    port: chrome.port,
    output: ['json', 'html'],
    onlyCategories: [...CATEGORY_IDS],
    logLevel: 'error',
    ...PROFILES[profileId],
  }
  const runnerResult = await lighthouse(`${BASE_URL}${page.path}`, flags)
  if (!runnerResult) throw new Error('Lighthouse não retornou resultado.')
  return runnerResult
}

// ---------------- Main ----------------

const chromePath = findPlaywrightChrome()
if (!chromePath) {
  console.error('✗ Chromium do Playwright não encontrado. Rode: npx playwright install chromium')
  process.exit(1)
}
console.log(`Chromium: ${chromePath}`)

mkdirSync(OUT_DIR, { recursive: true })

const server = await ensureServer()
let chrome = null
const summary = { generatedAt: new Date().toISOString(), baseUrl: BASE_URL, runs: RUNS, pages: {} }

try {
  chrome = await launch({
    chromePath,
    chromeFlags: ['--headless=new', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage'],
  })
  console.log(`Chrome pronto na porta ${chrome.port}\n`)

  for (const page of PAGES) {
    summary.pages[page.path] = {}
    for (const [profileId] of Object.entries(PROFILES)) {
      const collected = { categories: {}, metrics: {} }
      const reportList = []
      for (let run = 1; run <= RUNS; run++) {
        process.stdout.write(`▶ ${page.path} [${profileId}] ${run}/${RUNS} … `)
        const started = Date.now()
        const result = await auditOnce(chrome, page, profileId)
        const lhr = result.lhr
        const s = summarize(lhr)
        for (const id of CATEGORY_IDS) (collected.categories[id] ??= []).push(s.categories[id])
        for (const key of Object.keys(METRIC_AUDITS)) (collected.metrics[key] ??= []).push(s.metrics[key])

        const baseName = `${slugFor(page.name)}-${profileId}-${run}`
        writeFileSync(join(OUT_DIR, `${baseName}.json`), result.report[0])
        writeFileSync(join(OUT_DIR, `${baseName}.html`), result.report[1])
        reportList.push(baseName)
        console.log(`${Math.round((Date.now() - started) / 1000)}s · perf=${s.categories.performance}`)
      }

      const medians = {}
      for (const id of CATEGORY_IDS) medians[id] = Math.round(median(collected.categories[id]))
      for (const key of Object.keys(METRIC_AUDITS)) medians[key] = median(collected.metrics[key].filter((v) => v !== null))
      summary.pages[page.path][profileId] = { medians, reports: reportList }
    }
  }

  writeFileSync(join(OUT_DIR, 'summary.json'), `${JSON.stringify(summary, null, 2)}\n`)
} finally {
  try {
    if (chrome) await chrome.kill()
  } catch {
    /* encerramento best-effort */
  }
  if (server) server.kill()
}

// ---------------- Relatório final ----------------

console.log('\n========== MEDIANAS (3 medições por página/perfil) ==========')
for (const page of PAGES) {
  for (const profileId of Object.keys(PROFILES)) {
    const { medians } = summary.pages[page.path][profileId]
    const row = [
      page.path.padEnd(14),
      profileId.padEnd(8),
      `Perf ${String(medians.performance).padStart(3)}`,
      `A11y ${String(medians.accessibility).padStart(3)}`,
      `BP ${String(medians['best-practices']).padStart(3)}`,
      `SEO ${String(medians.seo).padStart(3)}`,
      `LCP ${medians.lcp != null ? `${(medians.lcp / 1000).toFixed(2)}s` : 'n/a'}`,
      `CLS ${medians.cls != null ? medians.cls.toFixed(3) : 'n/a'}`,
      `TBT ${medians.tbt != null ? `${Math.round(medians.tbt)}ms` : 'n/a'}`,
    ].join('  ')
    console.log(row)
  }
}
console.log(`\nRelatórios: ${OUT_DIR}`)

// Metas do desafio — falha o script se uma mediana ficar abaixo da meta
const GOALS = { performance: 90, accessibility: 95, 'best-practices': 95, seo: 90 }
let failed = false
for (const page of PAGES) {
  for (const profileId of Object.keys(PROFILES)) {
    const { medians } = summary.pages[page.path][profileId]
    for (const [cat, goal] of Object.entries(GOALS)) {
      if (medians[cat] < goal) {
        console.error(`✗ ${page.path} [${profileId}] ${cat}: ${medians[cat]} < meta ${goal}`)
        failed = true
      }
    }
  }
}
if (failed) {
  console.error('\nMetas de Lighthouse não atingidas — veja acima.')
  process.exit(1)
}
console.log('\n✓ Todas as metas de Lighthouse atingidas.')
