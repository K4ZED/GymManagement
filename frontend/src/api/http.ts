// Klien HTTP ke backend sesuai API_CONTRACT.md
import type { Paged } from '@/types'

const BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? '/api'
export const TOKEN_KEY = 'gym.token'

export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public status = 0,
    public details?: { path: string; message: string }[],
  ) {
    super(message)
  }
}

export const tokenStore = {
  get(): string | null {
    try {
      return localStorage.getItem(TOKEN_KEY)
    } catch {
      return null
    }
  },
  set(v: string | null) {
    try {
      if (v) localStorage.setItem(TOKEN_KEY, v)
      else localStorage.removeItem(TOKEN_KEY)
    } catch {
      /* storage tidak tersedia */
    }
  },
}

/** Dipanggil saat backend membalas 401 (token kedaluwarsa) */
let onUnauthorized: () => void = () => {}
export const setUnauthorizedHandler = (fn: () => void) => {
  onUnauthorized = fn
}

type Query = Record<string, string | number | boolean | undefined | null>

export function qs(params?: Query) {
  if (!params) return ''
  const entries = Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '')
  const s = new URLSearchParams(entries.map(([k, v]) => [k, String(v)])).toString()
  return s ? `?${s}` : ''
}

async function raw(method: string, path: string, body?: unknown) {
  const token = tokenStore.get()
  let res: Response
  try {
    res = await fetch(BASE + path, {
      method,
      headers: {
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch {
    throw new ApiError('NETWORK_ERROR', 'Network error')
  }
  const json = res.status === 204 ? {} : await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = json?.error ?? {}
    if (res.status === 401 && path !== '/auth/login') onUnauthorized()
    throw new ApiError(err.code ?? 'HTTP_ERROR', err.message ?? res.statusText, res.status, err.details)
  }
  return json
}

export const http = {
  get: async <T>(path: string, params?: Query): Promise<T> => (await raw('GET', path + qs(params))).data,
  page: async <T>(path: string, params?: Query): Promise<Paged<T>> => {
    const json = await raw('GET', path + qs(params))
    return { data: json.data, meta: json.meta }
  },
  post: async <T>(path: string, body?: unknown): Promise<T> => (await raw('POST', path, body ?? {})).data,
  patch: async <T>(path: string, body: unknown): Promise<T> => (await raw('PATCH', path, body)).data,
  del: async <T>(path: string): Promise<T> => (await raw('DELETE', path)).data,
}
