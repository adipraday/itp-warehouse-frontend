import type { ApiErrorBody } from '../types/common'
import { ApiError } from './errors'
import * as authStore from '../auth/authStore'

const BASE_URL = import.meta.env.VITE_API_BASE_URL as string
const API_URL = `${BASE_URL}/api`

export async function getHealth(): Promise<{ status: string }> {
  const res = await fetch(`${BASE_URL}/health`)
  const json = await res.json()
  return json.data
}

interface RequestOptions {
  params?: Record<string, string | number | boolean | undefined | null>
  idempotencyKey?: string
  signal?: AbortSignal
}

function buildUrl(path: string, params?: RequestOptions['params']): string {
  // Base eksplisit karena API_URL boleh relatif (mis. "/api" saat pakai Vite dev proxy).
  const url = new URL(`${API_URL}${path}`, window.location.origin)
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.set(key, String(value))
      }
    }
  }
  return url.toString()
}

async function request<T>(
  path: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  body?: unknown,
  options?: RequestOptions,
  isRetryAfterRefresh = false,
): Promise<T> {
  // Import item (§25 frontend-integration-guide.md, 2026-09-14) kirim `multipart/form-data`,
  // bukan JSON — JANGAN set `Content-Type` manual buat `FormData` (browser yang nentuin
  // boundary-nya sendiri; kalau di-override manual, boundary-nya hilang dan backend gak bisa
  // parse body-nya sama sekali).
  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData
  const headers: Record<string, string> = {}
  if (body !== undefined && !isFormData) {
    headers['Content-Type'] = 'application/json'
  }
  if (options?.idempotencyKey) {
    headers['Idempotency-Key'] = options.idempotencyKey
  }
  const token = authStore.getAccessToken()
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const res = await fetch(buildUrl(path, options?.params), {
    method,
    headers,
    body: body !== undefined ? (isFormData ? (body as FormData) : JSON.stringify(body)) : undefined,
    signal: options?.signal,
  })

  const json = res.status === 204 ? null : await res.json().catch(() => null)

  if (!res.ok || json?.error) {
    const errorBody: ApiErrorBody = json?.error ?? {
      code: 'UNKNOWN_ERROR',
      message: `Request gagal dengan status ${res.status}`,
      details: [],
    }

    // Token expired/invalid — coba refresh sekali lalu retry request yang sama. Kalau refresh-nya
    // sendiri gagal, authStore.refreshAccessToken() sudah clearSession() (memicu redirect ke
    // /login lewat RequireAuth), request ini tetap lempar error 401 aslinya ke pemanggil.
    if (res.status === 401 && !isRetryAfterRefresh) {
      try {
        await authStore.refreshAccessToken()
        return request<T>(path, method, body, options, true)
      } catch {
        throw new ApiError(errorBody, res.status)
      }
    }

    // Staff (staff-gudang/kasir-sales/purchasing/finance) yang belum di-assign ke warehouse
    // mana pun kena ini di SEMUA endpoint /api/* selain /me/access-status (§17
    // frontend-integration-guide.md) — bisa muncul kapan saja mid-session (mis. admin baru cabut
    // assignment terakhirnya), bukan cuma pas login. Redirect keras (bukan cuma lempar error ke
    // pemanggil) karena tidak ada satu pun halaman lain yang punya data buat ditampilkan sampai
    // di-assign ulang — sama sifatnya kayak sesi tidak valid, cuma bukan soal auth.
    if (errorBody.code === 'WAREHOUSE_ACCESS_NOT_CONFIGURED' && window.location.pathname !== '/access-notice') {
      window.location.href = '/access-notice'
    }

    throw new ApiError(errorBody, res.status)
  }

  return json as T
}

export function apiGet<T>(path: string, params?: RequestOptions['params'], signal?: AbortSignal) {
  return request<T>(path, 'GET', undefined, { params, signal })
}

export function apiPost<T>(path: string, body?: unknown, options?: { idempotencyKey?: string }) {
  return request<T>(path, 'POST', body, options)
}

export function apiPut<T>(path: string, body?: unknown) {
  return request<T>(path, 'PUT', body)
}

export function apiDelete<T>(path: string) {
  return request<T>(path, 'DELETE')
}

// Download template & export item (§26 frontend-integration-guide.md, 2026-09-14) — response-nya
// file beneran (`Content-Disposition: attachment`), bukan JSON, jadi tidak bisa lewat `request()`
// generik di atas (yang selalu `res.json()`). Duplikasi kecil logic 401-refresh-retry & error
// parsing di sini sengaja — mencoba nyatuin ke `request()` bakal bikin fungsi itu harus tahu
// "kadang parse JSON, kadang tidak", lebih ribet daripada duplikasi ~15 baris ini.
export async function apiGetBlob(
  path: string,
  params?: RequestOptions['params'],
  isRetryAfterRefresh = false,
): Promise<{ blob: Blob; filename: string | null }> {
  const headers: Record<string, string> = {}
  const token = authStore.getAccessToken()
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const res = await fetch(buildUrl(path, params), { method: 'GET', headers })

  if (!res.ok) {
    const json = await res.json().catch(() => null)
    const errorBody: ApiErrorBody = json?.error ?? {
      code: 'UNKNOWN_ERROR',
      message: `Request gagal dengan status ${res.status}`,
      details: [],
    }

    if (res.status === 401 && !isRetryAfterRefresh) {
      try {
        await authStore.refreshAccessToken()
        return apiGetBlob(path, params, true)
      } catch {
        throw new ApiError(errorBody, res.status)
      }
    }

    throw new ApiError(errorBody, res.status)
  }

  const blob = await res.blob()
  // `Content-Disposition: attachment; filename="items-export.csv"` — ambil nama file dari sini
  // kalau backend ngirim, biar konsisten sama nama yang backend maksud (bukan ditebak frontend).
  const disposition = res.headers.get('Content-Disposition')
  const match = disposition?.match(/filename="?([^";]+)"?/)
  return { blob, filename: match ? match[1] : null }
}
