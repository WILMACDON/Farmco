import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'
import BirdRecord from '#models/bird_record'
import type { BirdHealth, BirdProduction } from '#models/bird_stock'
import BirdStock from '#models/bird_stock'
import activityLogService from '#services/activity_log_service'
import FarmCacheService from '#services/farm_cache_service'
import type { Transaction } from '#types/extra'

export interface BirdBucketSnapshot {
  health: BirdHealth | null
  production: BirdProduction
  bucketKey: string
  count: number
}

export interface BirdStockSnapshot {
  buckets: BirdBucketSnapshot[]
  total: number
}

export interface BirdMutationBase {
  workspaceId: string
  userId: string
  health?: BirdHealth | null
  production: BirdProduction
  quantity: number
  reason?: string | null
  note?: string | null
  clientEntryId?: string | null
  recordedAt?: DateTime
  allowNeedsReview?: boolean
}

export function birdBucketKey(
  health: BirdHealth | null | undefined,
  production: BirdProduction,
): string {
  return `${health ?? 'none'}:${production}`
}

function assertQuantity(quantity: number) {
  if (!Number.isInteger(quantity) || quantity <= 0) {
    throw new Error('Quantity must be a positive integer')
  }
}

function normalizeHealth(
  health: BirdHealth | null | undefined,
  production: BirdProduction,
): BirdHealth | null {
  if (production === 'chick') return null
  if (!health) throw new Error('Health is required for adult birds')
  return health
}

export class BirdInventoryService {
  async getStock(workspaceId: string): Promise<BirdStockSnapshot> {
    return FarmCacheService.getOrSet(
      FarmCacheService.keys.birdsStock(workspaceId),
      async () => this.loadStock(workspaceId),
      FarmCacheService.ttl.stock,
    )
  }

  async loadStock(workspaceId: string, trx?: Transaction): Promise<BirdStockSnapshot> {
    const rows = await BirdStock.query(trx ? { client: trx } : undefined)
      .where('workspace_id', workspaceId)
      .orderBy('bucket_key', 'asc')

    const buckets = rows.map((row) => ({
      health: row.health,
      production: row.production,
      bucketKey: row.bucketKey,
      count: row.count,
    }))

    return {
      buckets,
      total: buckets.reduce((sum, b) => sum + b.count, 0),
    }
  }

  async listRecent(workspaceId: string, limit = 20) {
    return BirdRecord.query()
      .where('workspace_id', workspaceId)
      .preload('user')
      .orderBy('recorded_at', 'desc')
      .limit(limit)
  }

  async add(options: BirdMutationBase): Promise<BirdRecord> {
    assertQuantity(options.quantity)
    const {
      workspaceId,
      userId,
      production,
      quantity,
      note = null,
      clientEntryId = null,
      recordedAt = DateTime.now(),
    } = options
    const health = normalizeHealth(options.health, production)

    const existing = await this.findByClientEntryId(workspaceId, clientEntryId)
    if (existing) return existing

    const bucketKey = birdBucketKey(health, production)
    const trx = await db.transaction()
    try {
      const stock = await this.lockOrCreateStock(workspaceId, health, production, bucketKey, trx)
      const before = stock.count
      stock.count = before + quantity
      await stock.useTransaction(trx).save()

      const record = await BirdRecord.create(
        {
          workspaceId,
          userId,
          direction: 'add',
          health: production === 'chick' ? null : health,
          production,
          toHealth: null,
          toProduction: null,
          quantity,
          reason: null,
          note,
          clientEntryId,
          needsReview: false,
          recordedAt,
        },
        { client: trx },
      )

      await activityLogService.log({
        workspaceId,
        userId,
        action: 'bird.add',
        entity: 'bird',
        entityId: record.id,
        before: { bucketKey, count: before },
        after: { bucketKey, count: stock.count },
        quantity,
        note,
        recordedAt,
        trx,
      })

      await trx.commit()
      await FarmCacheService.invalidateAfterStockChange(workspaceId)
      return record
    } catch (error) {
      await trx.rollback()
      throw error
    }
  }

  async remove(options: BirdMutationBase & { reason: string }): Promise<BirdRecord> {
    assertQuantity(options.quantity)
    const {
      workspaceId,
      userId,
      production,
      quantity,
      reason,
      note = null,
      clientEntryId = null,
      recordedAt = DateTime.now(),
      allowNeedsReview = false,
    } = options
    const health = normalizeHealth(options.health, production)

    if (!reason?.trim()) throw new Error('Reason is required when removing birds')

    const existing = await this.findByClientEntryId(workspaceId, clientEntryId)
    if (existing) return existing

    const bucketKey = birdBucketKey(health, production)
    const trx = await db.transaction()
    try {
      const stock = await this.lockOrCreateStock(workspaceId, health, production, bucketKey, trx)
      const before = stock.count
      let needsReview = false
      let after = before - quantity

      if (after < 0) {
        if (!allowNeedsReview) {
          throw new Error(
            `Insufficient birds in ${bucketKey}: have ${before}, tried to remove ${quantity}`,
          )
        }
        needsReview = true
        after = 0
      }

      stock.count = after
      await stock.useTransaction(trx).save()

      const record = await BirdRecord.create(
        {
          workspaceId,
          userId,
          direction: 'remove',
          health: production === 'chick' ? null : health,
          production,
          toHealth: null,
          toProduction: null,
          quantity,
          reason,
          note,
          clientEntryId,
          needsReview,
          recordedAt,
        },
        { client: trx },
      )

      await activityLogService.log({
        workspaceId,
        userId,
        action: 'bird.remove',
        entity: 'bird',
        entityId: record.id,
        before: { bucketKey, count: before },
        after: { bucketKey, count: after, needsReview },
        quantity,
        note: note ?? reason,
        recordedAt,
        trx,
      })

      await trx.commit()
      await FarmCacheService.invalidateAfterStockChange(workspaceId)
      return record
    } catch (error) {
      await trx.rollback()
      throw error
    }
  }

  async move(
    options: BirdMutationBase & {
      toHealth?: BirdHealth | null
      toProduction: BirdProduction
    },
  ): Promise<BirdRecord> {
    assertQuantity(options.quantity)
    const {
      workspaceId,
      userId,
      production,
      toProduction,
      quantity,
      note = null,
      clientEntryId = null,
      recordedAt = DateTime.now(),
      allowNeedsReview = false,
    } = options
    const health = normalizeHealth(options.health, production)
    const toHealth = normalizeHealth(options.toHealth, toProduction)

    const existing = await this.findByClientEntryId(workspaceId, clientEntryId)
    if (existing) return existing

    const fromKey = birdBucketKey(health, production)
    const toKey = birdBucketKey(toHealth, toProduction)
    if (fromKey === toKey) throw new Error('Source and destination categories must differ')

    const trx = await db.transaction()
    try {
      const fromStock = await this.lockOrCreateStock(workspaceId, health, production, fromKey, trx)
      const toStock = await this.lockOrCreateStock(workspaceId, toHealth, toProduction, toKey, trx)

      const beforeFrom = fromStock.count
      let needsReview = false
      let afterFrom = beforeFrom - quantity

      if (afterFrom < 0) {
        if (!allowNeedsReview) {
          throw new Error(
            `Insufficient birds in ${fromKey}: have ${beforeFrom}, tried to move ${quantity}`,
          )
        }
        needsReview = true
        afterFrom = 0
      }

      const beforeTo = toStock.count
      const moved = needsReview ? beforeFrom : quantity
      fromStock.count = afterFrom
      toStock.count = beforeTo + moved
      await fromStock.useTransaction(trx).save()
      await toStock.useTransaction(trx).save()

      const record = await BirdRecord.create(
        {
          workspaceId,
          userId,
          direction: 'move',
          health: production === 'chick' ? null : health,
          production,
          toHealth: toProduction === 'chick' ? null : toHealth,
          toProduction,
          quantity,
          reason: null,
          note,
          clientEntryId,
          needsReview,
          recordedAt,
        },
        { client: trx },
      )

      await activityLogService.log({
        workspaceId,
        userId,
        action: 'bird.move',
        entity: 'bird',
        entityId: record.id,
        before: { fromKey, count: beforeFrom, toKey, toCount: beforeTo },
        after: {
          fromKey,
          count: afterFrom,
          toKey,
          toCount: toStock.count,
          needsReview,
        },
        quantity,
        note,
        recordedAt,
        trx,
      })

      await trx.commit()
      await FarmCacheService.invalidateAfterStockChange(workspaceId)
      return record
    } catch (error) {
      await trx.rollback()
      throw error
    }
  }

  async countNeedsReview(workspaceId: string): Promise<number> {
    const row = await BirdRecord.query()
      .where('workspace_id', workspaceId)
      .where('needs_review', true)
      .count('* as total')
      .first()
    return Number(row?.$extras.total ?? 0)
  }

  async resolveNeedsReview(options: {
    workspaceId: string
    userId: string
    recordId: string
    resolution: 'accept' | 'correct' | 'reject'
    reason?: string
    correction?: {
      quantity?: number
      health?: BirdHealth | null
      production?: BirdProduction
      toHealth?: BirdHealth | null
      toProduction?: BirdProduction | null
    }
  }): Promise<BirdRecord> {
    const { workspaceId, userId, recordId, resolution, reason, correction } = options
    const record = await BirdRecord.query()
      .where('workspace_id', workspaceId)
      .where('id', recordId)
      .firstOrFail()

    if (!record.needsReview) throw new Error('Record does not need review')

    if (resolution === 'accept' || resolution === 'reject') {
      record.needsReview = false
      if (reason) record.note = [record.note, reason].filter(Boolean).join(' — ')
      await record.save()
      await activityLogService.log({
        workspaceId,
        userId,
        action: `bird.review.${resolution}`,
        entity: 'bird',
        entityId: record.id,
        before: { needsReview: true },
        after: { needsReview: false, resolution },
        note: reason ?? null,
        recordedAt: DateTime.now(),
      })
      await FarmCacheService.invalidateAfterStockChange(workspaceId)
      return record
    }

    // correct: clear flag and re-apply with correction payload via a new movement
    record.needsReview = false
    await record.save()

    if (record.direction === 'add') {
      return this.add({
        workspaceId,
        userId,
        health: correction?.health ?? record.health,
        production: correction?.production ?? record.production,
        quantity: correction?.quantity ?? record.quantity,
        note: reason ?? `Correction of ${record.id}`,
        recordedAt: DateTime.now(),
      })
    }

    if (record.direction === 'remove') {
      return this.remove({
        workspaceId,
        userId,
        health: correction?.health ?? record.health,
        production: correction?.production ?? record.production,
        quantity: correction?.quantity ?? record.quantity,
        reason: reason ?? record.reason ?? 'correction',
        note: `Correction of ${record.id}`,
        recordedAt: DateTime.now(),
      })
    }

    return this.move({
      workspaceId,
      userId,
      health: correction?.health ?? record.health,
      production: correction?.production ?? record.production,
      toHealth: correction?.toHealth ?? record.toHealth,
      toProduction: correction?.toProduction ?? record.toProduction!,
      quantity: correction?.quantity ?? record.quantity,
      note: reason ?? `Correction of ${record.id}`,
      recordedAt: DateTime.now(),
    })
  }

  private async findByClientEntryId(
    workspaceId: string,
    clientEntryId: string | null | undefined,
  ): Promise<BirdRecord | null> {
    if (!clientEntryId) return null
    return BirdRecord.query()
      .where('workspace_id', workspaceId)
      .where('client_entry_id', clientEntryId)
      .first()
  }

  private async lockOrCreateStock(
    workspaceId: string,
    health: BirdHealth | null | undefined,
    production: BirdProduction,
    bucketKey: string,
    trx: Transaction,
  ): Promise<BirdStock> {
    let stock = await BirdStock.query({ client: trx })
      .where('workspace_id', workspaceId)
      .where('bucket_key', bucketKey)
      .forUpdate()
      .first()

    if (!stock) {
      stock = await BirdStock.create(
        {
          workspaceId,
          health: production === 'chick' ? null : (health ?? null),
          production,
          bucketKey,
          count: 0,
        },
        { client: trx },
      )
      stock = await BirdStock.query({ client: trx }).where('id', stock.id).forUpdate().firstOrFail()
    }

    return stock
  }
}

const birdInventoryService = new BirdInventoryService()
export default birdInventoryService
