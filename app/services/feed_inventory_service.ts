import { Exception } from '@adonisjs/core/exceptions'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'
import FeedRecord from '#models/feed_record'
import FeedStock from '#models/feed_stock'
import activityLogService from '#services/activity_log_service'
import FarmCacheService from '#services/farm_cache_service'
import type { Transaction } from '#types/extra'

export interface FeedStockSnapshot {
  bags: number
  averageDailyUsage: number | null
  daysLeft: number | null
  estimatedDaysLeft: number | null
  isLow: boolean
}

export interface FeedRecordRow {
  id: string
  direction: 'add' | 'remove'
  bags: number
  note: string | null
  needsReview: boolean
  recordedAt: string
  userId: string
  userName: string | null
}

export interface FeedMovementInput {
  direction: 'add' | 'remove'
  bags: number
  note?: string
  clientEntryId?: string
  recordedAt?: string
}

const USAGE_LOOKBACK_DAYS = 14

function toNumber(value: number | string): number {
  return typeof value === 'string' ? Number(value) : value
}

function parseRecordedAt(value?: string): DateTime {
  if (!value) return DateTime.now()
  const parsed = DateTime.fromISO(value)
  if (!parsed.isValid) throw new Exception('Invalid recordedAt', { status: 422 })
  return parsed
}

function serializeRecord(record: FeedRecord): FeedRecordRow {
  return {
    id: record.id,
    direction: record.direction,
    bags: toNumber(record.bags),
    note: record.note,
    needsReview: record.needsReview,
    recordedAt: record.recordedAt.toISO()!,
    userId: record.userId,
    userName: record.user?.fullName ?? null,
  }
}

export class FeedInventoryService {
  async getStock(workspaceId: string, lowFeedThreshold = 5): Promise<FeedStockSnapshot> {
    return FarmCacheService.getOrSet(
      FarmCacheService.keys.feedStock(workspaceId),
      async () => this.loadStock(workspaceId, lowFeedThreshold),
      FarmCacheService.ttl.stock,
    )
  }

  async loadStock(
    workspaceId: string,
    lowFeedThreshold = 5,
    trx?: Transaction,
  ): Promise<FeedStockSnapshot> {
    const stock = await FeedStock.query(trx ? { client: trx } : undefined)
      .where('workspace_id', workspaceId)
      .first()

    const bags = stock ? toNumber(stock.bags) : 0
    const averageDailyUsage = await this.averageDailyUsage(workspaceId, USAGE_LOOKBACK_DAYS)
    const daysLeft = averageDailyUsage && averageDailyUsage > 0 ? bags / averageDailyUsage : null

    return {
      bags,
      averageDailyUsage,
      daysLeft,
      estimatedDaysLeft: daysLeft,
      isLow: bags < lowFeedThreshold,
    }
  }

  async getRecentRecords(workspaceId: string, limit = 20): Promise<FeedRecordRow[]> {
    const rows = await FeedRecord.query()
      .where('workspace_id', workspaceId)
      .preload('user')
      .orderBy('recorded_at', 'desc')
      .limit(limit)
    return rows.map(serializeRecord)
  }

  async recordMovement(
    workspaceId: string,
    userId: string,
    payload: FeedMovementInput,
  ): Promise<{ recordId: string; needsReview: boolean }> {
    const record = await this.applyMovement(workspaceId, userId, payload, {
      allowNeedsReview: false,
    })
    return { recordId: record.id, needsReview: record.needsReview }
  }

  async syncEntry(
    workspaceId: string,
    userId: string,
    clientEntryId: string,
    payload: FeedMovementInput,
  ): Promise<{ recordId: string; created: boolean; needsReview: boolean }> {
    const existing = await FeedRecord.query()
      .where('workspace_id', workspaceId)
      .where('client_entry_id', clientEntryId)
      .first()
    if (existing) {
      return { recordId: existing.id, created: false, needsReview: existing.needsReview }
    }
    const record = await this.applyMovement(
      workspaceId,
      userId,
      { ...payload, clientEntryId },
      { allowNeedsReview: true },
    )
    return { recordId: record.id, created: true, needsReview: record.needsReview }
  }

  async add(options: {
    workspaceId: string
    userId: string
    bags: number
    note?: string | null
    clientEntryId?: string | null
    recordedAt?: DateTime
  }) {
    return this.applyMovement(
      options.workspaceId,
      options.userId,
      {
        direction: 'add',
        bags: options.bags,
        note: options.note ?? undefined,
        clientEntryId: options.clientEntryId ?? undefined,
        recordedAt: options.recordedAt?.toISO() ?? undefined,
      },
      { allowNeedsReview: false },
    )
  }

  async remove(options: {
    workspaceId: string
    userId: string
    bags: number
    note?: string | null
    clientEntryId?: string | null
    recordedAt?: DateTime
    allowNeedsReview?: boolean
  }) {
    return this.applyMovement(
      options.workspaceId,
      options.userId,
      {
        direction: 'remove',
        bags: options.bags,
        note: options.note ?? undefined,
        clientEntryId: options.clientEntryId ?? undefined,
        recordedAt: options.recordedAt?.toISO() ?? undefined,
      },
      { allowNeedsReview: options.allowNeedsReview ?? false },
    )
  }

  async averageDailyUsage(
    workspaceId: string,
    lookbackDays = USAGE_LOOKBACK_DAYS,
  ): Promise<number | null> {
    const from = DateTime.now().minus({ days: lookbackDays })
    const rows = await FeedRecord.query()
      .where('workspace_id', workspaceId)
      .where('direction', 'remove')
      .where('recorded_at', '>=', from.toSQL()!)
      .where('needs_review', false)

    if (rows.length === 0) return null
    const totalRemoved = rows.reduce((sum, row) => sum + toNumber(row.bags), 0)
    return totalRemoved / lookbackDays
  }

  async estimateDaysLeft(workspaceId: string): Promise<number | null> {
    const snapshot = await this.loadStock(workspaceId)
    return snapshot.daysLeft
  }

  async resolveNeedsReview(
    workspaceId: string,
    userId: string,
    recordId: string,
    resolution: 'accept' | 'correct' | 'reject',
    correction?: Record<string, unknown>,
    reason?: string,
  ): Promise<void> {
    const record = await FeedRecord.query()
      .where('workspace_id', workspaceId)
      .where('id', recordId)
      .firstOrFail()

    if (!record.needsReview) {
      throw new Exception('Record does not need review', { status: 422 })
    }

    const trx = await db.transaction()
    try {
      await activityLogService.log({
        workspaceId,
        userId,
        action: `feed.${resolution}_review`,
        entity: 'feed',
        entityId: record.id,
        before: { needsReview: true, bags: toNumber(record.bags) },
        after: { needsReview: false, resolution, correction: correction ?? null },
        note: reason ?? null,
        recordedAt: DateTime.now(),
        trx,
      })

      record.useTransaction(trx)
      record.needsReview = false
      if (resolution === 'correct' && reason) {
        record.note = [record.note, `Corrected: ${reason}`].filter(Boolean).join(' | ')
      }
      await record.save()
      await trx.commit()
      await FarmCacheService.invalidateAfterStockChange(workspaceId)
    } catch (error) {
      await trx.rollback()
      throw error
    }
  }

  private async applyMovement(
    workspaceId: string,
    userId: string,
    payload: FeedMovementInput,
    options: { allowNeedsReview: boolean },
  ): Promise<FeedRecord> {
    if (typeof payload.bags !== 'number' || Number.isNaN(payload.bags) || payload.bags <= 0) {
      throw new Exception('Bags must be a positive number', { status: 422 })
    }

    if (payload.clientEntryId) {
      const existing = await FeedRecord.query()
        .where('workspace_id', workspaceId)
        .where('client_entry_id', payload.clientEntryId)
        .first()
      if (existing) return existing
    }

    const recordedAt = parseRecordedAt(payload.recordedAt)
    const trx = await db.transaction()

    try {
      const stock = await this.lockOrCreateStock(workspaceId, trx)
      const before = toNumber(stock.bags)
      let needsReview = false
      let after = before

      if (payload.direction === 'add') {
        after = before + payload.bags
      } else {
        after = before - payload.bags
        if (after < 0) {
          if (!options.allowNeedsReview) {
            throw new Exception(
              `Insufficient feed: have ${before} bags, tried to remove ${payload.bags}`,
              { status: 422 },
            )
          }
          needsReview = true
          after = 0
        }
      }

      stock.bags = after
      await stock.useTransaction(trx).save()

      const record = await FeedRecord.create(
        {
          workspaceId,
          userId,
          direction: payload.direction,
          bags: payload.bags,
          note: payload.note ?? null,
          clientEntryId: payload.clientEntryId ?? null,
          needsReview,
          recordedAt,
        },
        { client: trx },
      )

      await activityLogService.log({
        workspaceId,
        userId,
        action: `feed.${payload.direction}`,
        entity: 'feed',
        entityId: record.id,
        before: { bags: before },
        after: { bags: after, needsReview },
        quantity: payload.bags,
        note: payload.note ?? null,
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

  private async lockOrCreateStock(workspaceId: string, trx: Transaction): Promise<FeedStock> {
    let stock = await FeedStock.query({ client: trx })
      .where('workspace_id', workspaceId)
      .forUpdate()
      .first()

    if (!stock) {
      stock = await FeedStock.create({ workspaceId, bags: 0 }, { client: trx })
      stock = await FeedStock.query({ client: trx }).where('id', stock.id).forUpdate().firstOrFail()
    }
    return stock
  }
}

const feedInventoryService = new FeedInventoryService()
export default feedInventoryService
