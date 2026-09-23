import { useCallback, useEffect, useState } from 'react'
import { farmPost } from '@/lib/farm-api'
import {
  countOfflineQueue,
  enqueueOfflineEntry,
  type OfflineEntryType,
  subscribeOfflineQueue,
  syncOfflineQueue,
  warnBeforeLogoutIfUnsynced,
} from '@/lib/offline/queue'

export function useOfflineQueue() {
  const [waitingCount, setWaitingCount] = useState(0)
  const [isOnline, setIsOnline] = useState(
    typeof navigator === 'undefined' ? true : navigator.onLine,
  )
  const [isSyncing, setIsSyncing] = useState(false)

  const refresh = useCallback(async () => {
    try {
      setWaitingCount(await countOfflineQueue())
    } catch {
      setWaitingCount(0)
    }
  }, [])

  const syncNow = useCallback(async () => {
    if (!navigator.onLine) return { synced: 0, failed: 0 }
    setIsSyncing(true)
    try {
      const result = await syncOfflineQueue(async (body) => {
        const res = await farmPost<{
          results?: Array<{ clientEntryId: string; ok: boolean; error?: string }>
          data?: { results?: Array<{ clientEntryId: string; ok: boolean; error?: string }> }
        }>('/farm/sync', body)
        return { results: res.results ?? res.data?.results ?? [] }
      })
      await refresh()
      return result
    } finally {
      setIsSyncing(false)
    }
  }, [refresh])

  const enqueue = useCallback(
    async (type: OfflineEntryType, payload: Record<string, unknown>) => {
      const entry = await enqueueOfflineEntry(type, payload)
      await refresh()
      if (navigator.onLine) void syncNow()
      return entry
    },
    [refresh, syncNow],
  )

  const confirmLogout = useCallback(async () => {
    const count = await countOfflineQueue()
    return warnBeforeLogoutIfUnsynced(count)
  }, [])

  useEffect(() => {
    void refresh()
    return subscribeOfflineQueue(() => {
      void refresh()
    })
  }, [refresh])

  useEffect(() => {
    function onOnline() {
      setIsOnline(true)
      void syncNow()
    }
    function onOffline() {
      setIsOnline(false)
    }
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    return () => {
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
    }
  }, [syncNow])

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      void navigator.serviceWorker.register('/sw.js').then((registration) => {
        void registration.update()
      }).catch(() => undefined)
    }
  }, [])

  return {
    waitingCount,
    isOnline,
    isSyncing,
    enqueue,
    syncNow,
    refresh,
    confirmLogout,
  }
}
