import { DateTime } from 'luxon'
import ActivityLog from '#models/activity_log'
import BirdRecord from '#models/bird_record'
import EggRecord from '#models/egg_record'
import FarmOrder from '#models/farm_order'
import FeedRecord from '#models/feed_record'
import Workspace from '#models/workspace'
import birdInventoryService from '#services/bird_inventory_service'
import eggInventoryService from '#services/egg_inventory_service'
import FarmCacheService from '#services/farm_cache_service'
import farmOrderService from '#services/farm_order_service'
import feedInventoryService from '#services/feed_inventory_service'
import type { FarmRole } from '#utils/farm_permissions'
import { canViewFullStats } from '#utils/farm_permissions'

export type StatsRangePreset = '7d' | '30d' | 'custom'

export interface GetStatsOptions {
  range?: StatsRangePreset
  from?: string
  to?: string
  farmRole: FarmRole
  userId: string
}

function toNumber(value: number | string): number {
  return typeof value === 'string' ? Number(value) : value
}

function resolveRange(options: GetStatsOptions): {
  preset: StatsRangePreset
  from: DateTime
  to: DateTime
} {
  const to = options.to ? DateTime.fromISO(options.to).endOf('day') : DateTime.now().endOf('day')
  const range = options.range ?? '7d'

  if (range === 'custom' && options.from) {
    return {
      preset: 'custom',
      from: DateTime.fromISO(options.from).startOf('day'),
      to,
    }
  }
  if (range === '30d') {
    return { preset: '30d', from: to.minus({ days: 29 }).startOf('day'), to }
  }
  return { preset: '7d', from: to.minus({ days: 6 }).startOf('day'), to }
}

export class FarmStatsService {
  async getStats(workspaceId: string, options: GetStatsOptions) {
    const range = resolveRange(options)
    const fullAccess = canViewFullStats(options.farmRole)

    if (!fullAccess) {
      return this.computeMetrics(workspaceId, options, range, false)
    }

    return FarmCacheService.getOrSet(
      FarmCacheService.keys.stats(workspaceId, range.preset),
      async () => this.computeMetrics(workspaceId, options, range, true),
      FarmCacheService.ttl.stats,
    )
  }

  /** Alias used by domain-oriented callers */
  async getMetrics(options: {
    workspaceId: string
    role: 'owner' | 'admin' | 'member'
    userId: string
    range?: StatsRangePreset | { from: DateTime; to: DateTime }
  }) {
    const farmRole =
      options.role === 'owner' ? 'owner' : options.role === 'admin' ? 'manager' : 'worker'
    let range: StatsRangePreset | undefined
    let from: string | undefined
    let to: string | undefined
    if (typeof options.range === 'object' && options.range && 'from' in options.range) {
      range = 'custom'
      from = options.range.from.toISO() ?? undefined
      to = options.range.to.toISO() ?? undefined
    } else {
      range = options.range
    }
    return this.getStats(options.workspaceId, {
      range,
      from,
      to,
      farmRole,
      userId: options.userId,
    })
  }

  private async computeMetrics(
    workspaceId: string,
    options: GetStatsOptions,
    range: { preset: StatsRangePreset; from: DateTime; to: DateTime },
    fullAccess: boolean,
  ) {
    const workspace = await Workspace.findOrFail(workspaceId)
    const eggsPerCrate = workspace.eggsPerCrate ?? 30
    const lowFeedThreshold = toNumber(workspace.lowFeedThreshold)

    const [birds, eggs, feed, pendingOrders] = await Promise.all([
      birdInventoryService.loadStock(workspaceId),
      eggInventoryService.loadStock(workspaceId, eggsPerCrate),
      feedInventoryService.loadStock(workspaceId, lowFeedThreshold),
      farmOrderService.countPending(workspaceId),
    ])

    const birdRecords = await BirdRecord.query()
      .where('workspace_id', workspaceId)
      .where('recorded_at', '>=', range.from.toSQL()!)
      .where('recorded_at', '<=', range.to.toSQL()!)

    const mortality = birdRecords
      .filter(
        (r) =>
          r.direction === 'remove' &&
          r.reason &&
          ['died', 'dead', 'mortality', 'culled'].includes(r.reason.toLowerCase()),
      )
      .reduce((sum, r) => sum + r.quantity, 0)

    const birdsRemoved = birdRecords
      .filter((r) => r.direction === 'remove')
      .reduce((sum, r) => sum + r.quantity, 0)

    const eggRecords = await EggRecord.query()
      .where('workspace_id', workspaceId)
      .where('recorded_at', '>=', range.from.toSQL()!)
      .where('recorded_at', '<=', range.to.toSQL()!)

    const eggsCollected = eggRecords
      .filter((r) => r.direction === 'add')
      .reduce((sum, r) => sum + r.quantityEggs, 0)

    const eggsBySize: Record<string, number> = { small: 0, medium: 0, large: 0 }
    for (const r of eggRecords.filter((row) => row.direction === 'add')) {
      eggsBySize[r.size] = (eggsBySize[r.size] ?? 0) + r.quantityEggs
    }

    const eggsBrokenSpoiled = eggRecords
      .filter(
        (r) =>
          r.direction === 'remove' &&
          r.reason &&
          ['broken', 'spoiled'].includes(r.reason.toLowerCase()),
      )
      .reduce((sum, r) => sum + r.quantityEggs, 0)

    const wellLaying =
      birds.buckets.find((b: { bucketKey: string }) => b.bucketKey === 'well:laying')?.count ?? 0
    const sickLaying =
      birds.buckets.find((b: { bucketKey: string }) => b.bucketKey === 'sick:laying')?.count ?? 0
    const layingCount = wellLaying + sickLaying
    const daySpan = Math.max(1, Math.ceil(range.to.diff(range.from, 'days').days) || 1)
    const layingRate = layingCount > 0 ? eggsCollected / layingCount / daySpan : null

    const feedRemoved = await FeedRecord.query()
      .where('workspace_id', workspaceId)
      .where('direction', 'remove')
      .where('needs_review', false)
      .where('recorded_at', '>=', range.from.toSQL()!)
      .where('recorded_at', '<=', range.to.toSQL()!)

    const feedUsed = feedRemoved.reduce((sum, r) => sum + toNumber(r.bags), 0)
    const feedPerBird = birds.total > 0 ? feedUsed / birds.total : null

    const orders = await FarmOrder.query()
      .where('workspace_id', workspaceId)
      .where('order_date', '>=', range.from.toSQL()!)
      .where('order_date', '<=', range.to.toSQL()!)
      .preload('items')

    const ordersByStatus: Record<string, number> = {
      pending: 0,
      approved: 0,
      sold: 0,
      cancelled: 0,
    }
    let cratesSold = 0
    for (const order of orders) {
      ordersByStatus[order.status] = (ordersByStatus[order.status] ?? 0) + 1
      if (order.status === 'sold') {
        cratesSold += order.items.reduce((sum, item) => sum + item.crates, 0)
      }
    }
    const fulfilmentRate = orders.length > 0 ? (ordersByStatus.sold ?? 0) / orders.length : null

    const base = {
      range: {
        preset: range.preset,
        from: range.from.toISO(),
        to: range.to.toISO(),
      },
      role: options.farmRole,
      birds: {
        total: birds.total,
        byBucket: birds.buckets,
        mortality,
        mortalityRate: birdsRemoved > 0 ? mortality / birdsRemoved : null,
        removed: birdsRemoved,
      },
      eggs: {
        stock: eggs,
        collected: eggsCollected,
        bySize: eggsBySize,
        brokenSpoiled: eggsBrokenSpoiled,
        brokenSpoiledRate: eggsCollected > 0 ? eggsBrokenSpoiled / eggsCollected : null,
        layingRate,
        layingBirds: layingCount,
      },
      feed: {
        bags: feed.bags,
        used: feedUsed,
        averageDailyUsage: feed.averageDailyUsage,
        daysLeft: feed.daysLeft,
        feedPerBird,
        lowFeedThreshold,
        isLow: feed.isLow,
      },
      orders: {
        byStatus: ordersByStatus,
        cratesSold,
        fulfilmentRate,
        pendingCount: pendingOrders,
      },
    }

    if (!fullAccess) {
      const ownActivity = await ActivityLog.query()
        .where('workspace_id', workspaceId)
        .where('user_id', options.userId)
        .where('recorded_at', '>=', range.from.toSQL()!)
        .where('recorded_at', '<=', range.to.toSQL()!)
        .count('* as total')
        .first()

      return {
        ...base,
        limited: true as const,
        activity: {
          ownEntries: Number(ownActivity?.$extras.total ?? 0),
        },
      }
    }

    const activityRows = await ActivityLog.query()
      .where('workspace_id', workspaceId)
      .where('recorded_at', '>=', range.from.toSQL()!)
      .where('recorded_at', '<=', range.to.toSQL()!)
      .select('user_id')
      .count('* as total')
      .groupBy('user_id')

    return {
      ...base,
      limited: false as const,
      activity: {
        entriesPerUser: activityRows.map((row) => ({
          userId: row.userId,
          count: Number(row.$extras.total ?? 0),
        })),
      },
    }
  }
}

const farmStatsService = new FarmStatsService()
export default farmStatsService
