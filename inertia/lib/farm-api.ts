import { router } from '@inertiajs/react'
import axios from 'axios'
import { toast } from 'sonner'
import { type ServerErrorResponse, serverErrorResponder } from '@/lib/error'
import api from '@/lib/http'
import { enqueueOfflineEntry, type OfflineEntryType } from '@/lib/offline/queue'

function readXsrfToken() {
  if (typeof document === 'undefined') return null
  const match = document.cookie.match(/(?:^|; )XSRF-TOKEN=([^;]*)/)
  return match ? decodeURIComponent(match[1]) : null
}

axios.interceptors.request.use((config) => {
  const token = readXsrfToken()
  if (token) config.headers.set('X-XSRF-TOKEN', token)
  return config
})

type ApiMethod = 'get' | 'post' | 'put' | 'delete'

async function farmRequest<T>(method: ApiMethod, path: string, data?: unknown): Promise<T> {
  const url = path as never
  if (method === 'get') {
    const res = await api.get<T>(url)
    return res.data
  }
  if (method === 'post') {
    const res = await api.post<T>(url, data)
    return res.data
  }
  if (method === 'put') {
    const res = await api.put<T>(url, data)
    return res.data
  }
  const res = await api.delete<T>(url)
  return res.data
}

export async function farmGet<T>(path: string): Promise<T> {
  return farmRequest<T>('get', path)
}

export async function farmPost<T>(path: string, data?: unknown): Promise<T> {
  return farmRequest<T>('post', path, data)
}

export async function farmPut<T>(path: string, data?: unknown): Promise<T> {
  return farmRequest<T>('put', path, data)
}

export function farmErrorMessage(err: unknown, fallback = 'Something went wrong.') {
  return serverErrorResponder(err as ServerErrorResponse) || fallback
}

export async function farmMutate<T>(options: {
  path: string
  method?: 'post' | 'put'
  data?: unknown
  successMessage?: string
  errorFallback?: string
  reload?: boolean
  offlineType?: OfflineEntryType
}): Promise<T | null | { queued: true }> {
  const {
    path,
    method = 'post',
    data,
    successMessage,
    errorFallback,
    reload = true,
    offlineType,
  } = options

  if (typeof navigator !== 'undefined' && !navigator.onLine && offlineType) {
    await enqueueOfflineEntry(offlineType, {
      ...(typeof data === 'object' && data ? (data as Record<string, unknown>) : {}),
      clientEntryId: crypto.randomUUID(),
      recordedAt: new Date().toISOString(),
    })
    toast.success('Saved offline. Waiting to sync.')
    return { queued: true }
  }

  try {
    const result = method === 'put' ? await farmPut<T>(path, data) : await farmPost<T>(path, data)
    if (successMessage) toast.success(successMessage)
    if (reload) router.reload()
    return result
  } catch (err) {
    toast.error(farmErrorMessage(err, errorFallback))
    return null
  }
}

export function formatBirdBucket(health: string | null | undefined, production: string) {
  const prod =
    production === 'non_laying'
      ? 'Non-laying'
      : production === 'chick'
        ? 'Chick'
        : production.charAt(0).toUpperCase() + production.slice(1)
  if (production === 'chick' || !health) return prod
  const healthLabel = health.charAt(0).toUpperCase() + health.slice(1)
  return `${healthLabel} · ${prod}`
}

export function formatEggSize(size: string) {
  return size.charAt(0).toUpperCase() + size.slice(1)
}

export function formatDateTime(value: string | null | undefined) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function formatDate(value: string | null | undefined) {
  if (!value) return '—'
  const date = new Date(value.length <= 10 ? `${value}T12:00:00` : value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function formatNumber(value: number | null | undefined, digits = 0) {
  if (value == null || Number.isNaN(value)) return '—'
  return value.toLocaleString(undefined, {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits > 0 ? Math.min(digits, 1) : 0,
  })
}
