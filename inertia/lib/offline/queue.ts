/** Offline entry queue using IndexedDB. Survives browser restarts. */

const DB_NAME = 'farmco-offline'
const DB_VERSION = 1
const STORE = 'queue'

export type OfflineEntryType = 'birds' | 'eggs' | 'feed' | 'orders'

export interface OfflineQueueEntry {
  id: string
  type: OfflineEntryType
  payload: Record<string, unknown>
  recordedAt: string
  createdAt: string
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id' })
      }
    }
  })
}

function uuid() {
  return crypto.randomUUID()
}

export async function enqueueOfflineEntry(
  type: OfflineEntryType,
  payload: Record<string, unknown>,
): Promise<OfflineQueueEntry> {
  const recordedAt =
    typeof payload.recordedAt === 'string' ? payload.recordedAt : new Date().toISOString()
  const entry: OfflineQueueEntry = {
    id: uuid(),
    type,
    payload: { ...payload, recordedAt, clientEntryId: payload.clientEntryId ?? uuid() },
    recordedAt,
    createdAt: new Date().toISOString(),
  }

  const db = await openDb()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).put(entry)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
  db.close()
  notifyQueueChanged()
  return entry
}

export async function listOfflineQueue(): Promise<OfflineQueueEntry[]> {
  const db = await openDb()
  const entries = await new Promise<OfflineQueueEntry[]>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly')
    const req = tx.objectStore(STORE).getAll()
    req.onsuccess = () => resolve(req.result as OfflineQueueEntry[])
    req.onerror = () => reject(req.error)
  })
  db.close()
  return entries.sort((a, b) => a.createdAt.localeCompare(b.createdAt))
}

export async function countOfflineQueue(): Promise<number> {
  const entries = await listOfflineQueue()
  return entries.length
}

export async function removeOfflineEntries(ids: string[]): Promise<void> {
  if (!ids.length) return
  const db = await openDb()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    const store = tx.objectStore(STORE)
    for (const id of ids) store.delete(id)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
  db.close()
  notifyQueueChanged()
}

export async function clearOfflineQueue(): Promise<void> {
  const db = await openDb()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).clear()
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
  db.close()
  notifyQueueChanged()
}

const LISTENERS = new Set<() => void>()

export function subscribeOfflineQueue(listener: () => void) {
  LISTENERS.add(listener)
  return () => LISTENERS.delete(listener)
}

function notifyQueueChanged() {
  for (const listener of LISTENERS) listener()
}

export interface SyncResultItem {
  clientEntryId: string
  ok: boolean
  error?: string
}

/** POST queued entries to /api/v1/farm/sync and remove confirmed ones. */
export async function syncOfflineQueue(
  postSync: (body: {
    entries: Array<{
      clientEntryId: string
      type: OfflineEntryType
      payload: Record<string, unknown>
    }>
  }) => Promise<{ results: SyncResultItem[] }>,
): Promise<{ synced: number; failed: number }> {
  const queue = await listOfflineQueue()
  if (!queue.length) return { synced: 0, failed: 0 }

  const entries = queue.map((item) => ({
    clientEntryId: String(item.payload.clientEntryId ?? item.id),
    type: item.type,
    payload: item.payload,
  }))

  const { results } = await postSync({ entries })
  const okIds: string[] = []
  let failed = 0

  for (const item of queue) {
    const clientId = String(item.payload.clientEntryId ?? item.id)
    const result = results.find((r) => r.clientEntryId === clientId)
    if (result?.ok) okIds.push(item.id)
    else failed += 1
  }

  await removeOfflineEntries(okIds)
  return { synced: okIds.length, failed }
}

export function warnBeforeLogoutIfUnsynced(waitingCount: number): boolean {
  if (waitingCount <= 0) return true
  return window.confirm(
    `You have ${waitingCount} entr${waitingCount === 1 ? 'y' : 'ies'} waiting to sync. Sync before logging out? Click Cancel to stay.`,
  )
}
