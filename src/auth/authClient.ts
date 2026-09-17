import * as authStore from './authStore'
import { AuthApiError } from './authApi'

const AUTH_BASE_URL = import.meta.env.VITE_AUTH_API_URL as string

interface RequestOptions {
  params?: Record<string, string | number | boolean | undefined | null>
}

function buildUrl(path: string, params?: RequestOptions['params']): string {
  const url = new URL(`${AUTH_BASE_URL}${path}`)
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
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  body?: unknown,
  options?: RequestOptions,
  isRetryAfterRefresh = false,
): Promise<T> {
  const headers: Record<string, string> = {}
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json'
  }
  const token = authStore.getAccessToken()
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const res = await fetch(buildUrl(path, options?.params), {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  const json = res.status === 204 ? null : await res.json().catch(() => null)

  if (!res.ok || json?.success === false) {
    // Auth-backend SELALU strict-validate token (tidak ada mode hybrid seperti warehouse-backend)
    // — ini kesempatan pertama jalur refresh-retry benar-benar dites dengan token expired/invalid
    // sungguhan (lihat catatan Fase 12.1 di docs/progress-log.md soal jalur ini belum tereksekusi
    // sebelumnya karena AUTH_MODE=hybrid selalu lenient).
    if (res.status === 401 && !isRetryAfterRefresh) {
      try {
        await authStore.refreshAccessToken()
        return request<T>(path, method, body, options, true)
      } catch {
        const message = json?.message ?? `Request gagal dengan status ${res.status}`
        throw new AuthApiError(message, json?.code ?? 'UNAUTHORIZED', res.status)
      }
    }

    const message = json?.message ?? `Request gagal dengan status ${res.status}`
    const code = json?.code ?? 'AUTH_ERROR'
    throw new AuthApiError(message, code, res.status)
  }

  return json.data as T
}

export function authGet<T>(path: string, params?: RequestOptions['params']) {
  return request<T>(path, 'GET', undefined, { params })
}

export function authPost<T>(path: string, body?: unknown) {
  return request<T>(path, 'POST', body)
}

export function authPut<T>(path: string, body?: unknown) {
  return request<T>(path, 'PUT', body)
}

export function authPatch<T>(path: string, body?: unknown) {
  return request<T>(path, 'PATCH', body)
}

export function authDelete<T>(path: string) {
  return request<T>(path, 'DELETE')
}
