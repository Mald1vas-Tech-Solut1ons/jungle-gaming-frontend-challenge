import { useSyncExternalStore } from 'react'

/**
 * Sinal de "backend simulado pronto". O app renderiza imediatamente (hero e
 * layout pintam sem esperar o chunk do MSW) e só as requisições REST aguardam
 * este sinal — via interceptor do Axios. Com `VITE_ENABLE_MOCKS=false`, o
 * sinal é dado já no boot e nada espera.
 */

let ready = false
let resolveReady!: () => void
const listeners = new Set<() => void>()

export const mocksReady: Promise<void> = new Promise((resolve) => {
  resolveReady = resolve
})

export function markMocksReady() {
  if (ready) return
  ready = true
  resolveReady()
  listeners.forEach((listener) => listener())
}

export function useMocksReady(): boolean {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    () => ready,
    () => ready,
  )
}
