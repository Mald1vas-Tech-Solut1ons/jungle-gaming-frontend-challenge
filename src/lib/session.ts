/**
 * Sessão simulada: token fictício em localStorage (API mock, sem backend real)
 * e identificador estável do carrinho de visitante.
 *
 * Um pequeno barramento (`onSessionChange` / `onSessionExpired`) desacopla o
 * estado da sessão do React: o cliente Axios, o Socket.IO e as rotas protegidas
 * observam o mesmo ciclo de vida e reagem em conjunto.
 */

const TOKEN_KEY = 'auth.token'
const GUEST_KEY = 'guest.cart-id'

export type SessionListener = (token: string | null) => void
export type SessionExpiredListener = () => void

const sessionListeners = new Set<SessionListener>()
const expiredListeners = new Set<SessionExpiredListener>()

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function setSession(token: string | null) {
  if (token) localStorage.setItem(TOKEN_KEY, token)
  else localStorage.removeItem(TOKEN_KEY)
  for (const cb of sessionListeners) cb(token)
}

/** Sessão expirada detectada por qualquer transporte (REST ou socket). */
export function notifySessionExpired() {
  setSession(null)
  for (const cb of expiredListeners) cb()
}

export function onSessionChange(cb: SessionListener): () => void {
  sessionListeners.add(cb)
  return () => sessionListeners.delete(cb)
}

export function onSessionExpired(cb: SessionExpiredListener): () => void {
  expiredListeners.add(cb)
  return () => expiredListeners.delete(cb)
}

/** Id estável do carrinho de visitante (mergeado na autenticação). */
export function getGuestCartId(): string {
  let id = localStorage.getItem(GUEST_KEY)
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem(GUEST_KEY, id)
  }
  return id
}

export function clearGuestCartId() {
  localStorage.removeItem(GUEST_KEY)
}
