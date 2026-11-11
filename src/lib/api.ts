import axios, { AxiosError, type AxiosRequestConfig, type InternalAxiosRequestConfig } from 'axios'
import type { ApiErrorBody, ApiErrorCode } from '@/api/contracts'
import { mocksReady } from './mocks-ready'
import { getGuestCartId, getToken, notifySessionExpired } from './session'

/**
 * Cliente HTTP único da aplicação (Axios). Toda chamada REST passa por aqui.
 *
 * Política de transporte:
 *  - injeta `Authorization` (sessão simulada) e `X-Guest-Cart-Id` (visitante);
 *  - erros normalizados em `ApiError` com `code`/`fields` tipados dos contratos;
 *  - sessão expirada propaga para o barramento de sessão (limpa token e caches);
 *  - retries APENAS em GET idempotente, com espera crescente (backoff) + jitter,
 *    e apenas para falhas de rede/timeout/5xx transitório. Mutations nunca
 *    repetem sozinhas — pedidos usam idempotência explícita (ver hooks de order).
 */

export const API_TIMEOUT_MS = 10_000
export const ORDER_CREATE_TIMEOUT_MS = 8_000

export type RetryableErrorCode = 'NETWORK' | 'TIMEOUT' | 'TRANSIENT_FAILURE' | 'INTERNAL_ERROR'

export class ApiError extends Error {
  readonly status: number
  readonly code: ApiErrorCode | RetryableErrorCode
  readonly fields?: Record<string, string>
  readonly details?: unknown

  constructor(status: number, code: ApiErrorCode | RetryableErrorCode, message: string, fields?: Record<string, string>, details?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.fields = fields
    this.details = details
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError
}

export function isRetryable(error: unknown): boolean {
  if (!(error instanceof ApiError)) return true // erros de rede/timeout são retryable por padrão
  return error.code === 'TRANSIENT_FAILURE' || error.code === 'INTERNAL_ERROR' || error.code === 'NETWORK' || error.code === 'TIMEOUT'
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

function toApiError(error: AxiosError): ApiError {
  const status = error.response?.status ?? 0
  const data = error.response?.data as ApiErrorBody | undefined
  if (data && typeof data === 'object' && 'error' in data && typeof data.error === 'object') {
    const { code, message, fields, details } = data.error
    return new ApiError(status, code, message, fields, details)
  }
  if (error.code === 'ECONNABORTED') return new ApiError(408, 'TIMEOUT', 'A requisição demorou demais. Tente novamente.')
  if (!error.response) return new ApiError(0, 'NETWORK', 'Sem conexão com o servidor. Verifique sua rede.')
  return new ApiError(status, 'INTERNAL_ERROR', 'Algo deu errado. Tente novamente.')
}

export const api = axios.create({
  baseURL: '/api',
  timeout: API_TIMEOUT_MS,
})

api.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  // O app pinta antes do backend simulado subir; requisições esperam o MSW.
  // (O timeout do Axios só começa a contar no envio, depois desta espera.)
  await mocksReady
  const token = getToken()
  if (token) config.headers.set('Authorization', `Bearer ${token}`)
  else {
    config.headers.set('X-Guest-Cart-Id', getGuestCartId())
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const config = error.config as (InternalAxiosRequestConfig & { _retryCount?: number; skipRetry?: boolean }) | undefined
    const apiError = toApiError(error)

    if (apiError.code === 'SESSION_EXPIRED') {
      notifySessionExpired()
    }

    // Retry com espera crescente apenas para GET idempotente e erros retryable.
    const method = (config?.method ?? 'get').toLowerCase()
    const attempt = config?._retryCount ?? 0
    if (method === 'get' && !config?.skipRetry && attempt < 2 && isRetryable(apiError)) {
      config!._retryCount = attempt + 1
      const backoff = 400 * 2 ** attempt + Math.random() * 200
      await sleep(backoff)
      return api.request(config as AxiosRequestConfig)
    }

    return Promise.reject(apiError)
  },
)

/** Normaliza qualquer erro de transporte para `ApiError`. */
export function normalizeError(error: unknown): ApiError {
  return error instanceof ApiError ? error : toApiError(error as AxiosError)
}
