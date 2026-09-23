import cache from '@adonisjs/cache/services/main'

const TTL = {
  stock: '5m',
  dashboard: '2m',
  settings: '30m',
  stats: '10m',
  pendingOrders: '2m',
} as const

export type FarmCacheNamespace =
  | 'stock:birds'
  | 'stock:eggs'
  | 'stock:feed'
  | 'dashboard'
  | 'settings'
  | 'stats'
  | 'pending_orders_count'

function orgKey(orgId: string, suffix: string) {
  return `org:${orgId}:${suffix}`
}

const keys = {
  birdsStock: (orgId: string) => orgKey(orgId, 'stock:birds'),
  eggsStock: (orgId: string) => orgKey(orgId, 'stock:eggs'),
  feedStock: (orgId: string) => orgKey(orgId, 'stock:feed'),
  dashboard: (orgId: string) => orgKey(orgId, 'dashboard'),
  settings: (orgId: string) => orgKey(orgId, 'settings'),
  stats: (orgId: string, range: string) => orgKey(orgId, `stats:${range}`),
  pendingOrdersCount: (orgId: string) => orgKey(orgId, 'pending_orders_count'),
}

async function forget(key: string) {
  await cache.delete({ key })
}

async function forgetMany(keyList: string[]) {
  await Promise.all(keyList.map((key) => cache.delete({ key })))
}

async function invalidateStatsNamespace(orgId: string) {
  const presets = ['7d', '30d', 'custom']
  await forgetMany(presets.map((range) => keys.stats(orgId, range)))
}

export default class FarmCacheService {
  static keys = keys

  static ttl = TTL

  static async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    ttl: string = TTL.dashboard,
  ): Promise<T> {
    return cache.getOrSet({
      key,
      factory,
      ttl,
    })
  }

  static forget = forget

  static forgetMany = forgetMany

  /** Bust stock, dashboard, stats, and pending-order counters after inventory/order writes */
  static async invalidateAfterStockChange(orgId: string) {
    await forgetMany([
      keys.birdsStock(orgId),
      keys.eggsStock(orgId),
      keys.feedStock(orgId),
      keys.dashboard(orgId),
      keys.pendingOrdersCount(orgId),
    ])
    await invalidateStatsNamespace(orgId)
  }

  static async invalidateAfterOrderChange(orgId: string) {
    await forgetMany([keys.eggsStock(orgId), keys.dashboard(orgId), keys.pendingOrdersCount(orgId)])
    await invalidateStatsNamespace(orgId)
  }

  static async invalidateSettings(orgId: string) {
    await forget(keys.settings(orgId))
    await forget(keys.dashboard(orgId))
  }

  /**
   * Stats keys include a range suffix; delete known presets plus rely on short TTL.
   * Full prefix scan can be added later if Redis SCAN is needed.
   */
  static invalidateStatsNamespace = invalidateStatsNamespace
}
