import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv, type Plugin } from 'vite'

/**
 * O backend simulado (MSW + fixtures + Socket.IO) é carregado por import
 * dinâmico depois do primeiro paint. Sem ajuda, o navegador só descobre esse
 * chunk quando o app já executou; com `modulepreload` no HTML, o download
 * corre em paralelo com o bundle principal e os dados chegam mais cedo.
 */
function preloadMockBackend(enabled: boolean): Plugin {
  return {
    name: 'kurio:preload-mock-backend',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler(_html, ctx) {
        if (!enabled || !ctx.bundle) return
        const entry = Object.values(ctx.bundle).find(
          (chunk) => chunk.type === 'chunk' && chunk.facadeModuleId?.replaceAll('\\', '/').endsWith('/src/mocks/browser.ts'),
        )
        if (!entry || entry.type !== 'chunk') return
        return [entry.fileName, ...entry.imports].map((file) => ({
          tag: 'link',
          attrs: { rel: 'modulepreload', crossorigin: '', href: `/${file}` },
          injectTo: 'head' as const,
        }))
      },
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_')
  const mocksEnabled = env.VITE_ENABLE_MOCKS !== 'false'
  return {
    plugins: [tanstackRouter({ target: 'react', autoCodeSplitting: true }), react(), tailwindcss(), preloadMockBackend(mocksEnabled)],
    resolve: {
      alias: { '@': path.resolve(__dirname, './src') },
    },
  }
})
