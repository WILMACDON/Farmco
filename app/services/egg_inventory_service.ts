import { Exception } from '@adonisjs/core/exceptions'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'
import EggRecord from '#models/egg_record'
import type { EggSize } from '#models/egg_stock'
import EggStock from '#models/egg_stock'
import activityLogService from '#services/activity_log_service'
import FarmCacheService from '#services/farm_cache_service'
import type { Transaction } from '#types/extra'

export interface EggSizeStock {
  size: EggSize
  quantityEggs: number
  crates: number
  loose: number
}

export interface EggStockSnapshot {
  sizes: EggSizeStock[]
  totalEggs: number
  eggsPerCrate: number
}

export interface EggRecordRow {
  id: string
  size: EggSize
  direction: 'add' | 'remove'
  quantityEggs: number
  reason: string | null
  note: string | null
  orderId: string | null
  needsReview: boolean
  recordedAt: string
  userId: string
  userName: string | null
}

export interface EggMovementInput {
  size: EggSize
  direction: 'add' | 'remove'
  quantityEggs: number
  reason?: string
  note?: string
  orderId?: string | null
  clientEntryId?: string
  recordedAt?: string
}

const EGG_SIZES: EggSize[] = ['small', 'medium', 'large']

function toNumber(value: number | string): number {
  return typeof value === 'string' ? Number(value) : value
}

export function cratesAndLooseToEggs(crates: number, loose: number, eggsPerCrate: number): number {
  return crates * eggsPerCrate + loose
}

export function eggsToCratesAndLoose(eggs: number, eggsPerCrate: number) {
  const safePerCrate = eggsPerCrate > 0 ? eggsPerCrate : 30
  return {
    crates: Math.floor(eggs / safePerCrate),
    loose: eggs % safePerCrate,
  }
}

function parseRecordedAt(value?: string): DateTime {
  if (!value) return DateTime.now()
  const parsed = DateTime.fromISO(value)
  if (!parsed.isValid) throw new Exception('Invalid recordedAt', { status: 422 })
  return parsed
}

function serializeRecord(record: EggRecord): EggRecordRow {
  return {
    id: record.id,
    size: record.size,
    direction: record.direction,
    quantityEggs: record.quantityEggs,
    reason: record.reason,
    note: record.note,
    orderId: record.orderId,
    needsReview: record.needsReview,
    recordedAt: record.recordedAt.toISO()!,
    userId: record.userId,
    userName: record.user?.fullName ?? null,
  }
}

export class EggInventoryService {
  cratesAndLooseToEggs = cratesAndLooseToEggs
  eggsToCratesAndLoose = eggsToCratesAndLoose

  async getStock(workspaceId: string, eggsPerCrate = 30): Promise<EggStockSnapshot> {
    return FarmCacheService.getOrSet(
      FarmCacheService.keys.eggsStock(workspaceId),
      async () => this.loadStock(workspaceId, eggsPerCrate),
      FarmCacheService.ttl.stock,
    )
  }

  async loadStock(
    workspaceId: string,
    eggsPerCrate = 30,
    trx?: Transaction,
  ): Promise<EggStockSnapshot> {
    const rows = await EggStock.query(trx ? { client: trx } : undefined).where(
      'workspace_id',
      workspaceId,
    )
    const bySize = new Map(rows.map((row) => [row.size, toNumber(row.quantityEggs)]))
    const sizes: EggSizeStock[] = EGG_SIZES.map((size) => {
      const quantityEggs = bySize.get(size) ?? 0
      const { crates, loose } = eggsToCratesAndLoose(quantityEggs, eggsPerCrate)
      return { size, quantityEggs, crates, loose }
    })

    return {
      sizes,
      totalEggs: sizes.reduce((sum, s) => sum + s.quantityEggs, 0),
      eggsPerCrate,
    }
  }

  async getRecentRecords(workspaceId: string, limit = 20): Promise<EggRecordRow[]> {
    const rows = await EggRecord.query()
      .where('workspace_id', workspaceId)
      .preload('user')
      .orderBy('recorded_at', 'desc')
      .limit(limit)
    return rows.map(serializeRecord)
  }

  async recordMovement(
    workspaceId: string,
    userId: string,
    payload: EggMovementInput,
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
    payload: EggMovementInput,
  ): Promise<{ recordId: string; created: boolean; needsReview: boolean }> {
    const existing = await EggRecord.query()
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
    size: EggSize
    quantityEggs: number
    note?: string | null
    clientEntryId?: string | null
    recordedAt?: DateTime
  }) {
    return this.applyMovement(
      options.workspaceId,
      options.userId,
      {
        size: options.size,
        direction: 'add',
        quantityEggs: options.quantityEggs,
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
    size: EggSize
    quantityEggs: number
    reason: string
    note?: string | null
    orderId?: string | null
    clientEntryId?: string | null
    recordedAt?: DateTime
    allowNeedsReview?: boolean
  }) {
    return this.applyMovement(
      options.workspaceId,
      options.userId,
      {
        size: options.size,
        direction: 'remove',
        quantityEggs: options.quantityEggs,
        reason: options.reason,
        note: options.note ?? undefined,
        orderId: options.orderId,
        clientEntryId: options.clientEntryId ?? undefined,
        recordedAt: options.recordedAt?.toISO() ?? undefined,
      },
      { allowNeedsReview: options.allowNeedsReview ?? false },
    )
  }

  async sellForOrder(
    workspaceId: string,
    orderId: string,
    items: Array<{ size: EggSize; crates: number }>,
    eggsPerCrate: number,
    userId: string,
    options: { recordedAt?: DateTime; trx?: Transaction } = {},
  ): Promise<EggRecord[]> {
    const recordedAt = options.recordedAt ?? DateTime.now()
    const ownTrx = !options.trx
    const trx = options.trx ?? (await db.transaction())

    try {
      const records: EggRecord[] = []
      for (const item of items) {
        if (!Number.isInteger(item.crates) || item.crates <= 0) {
          throw new Exception('Order item crates must be a positive integer', { status: 422 })
        }
        const quantityEggs = cratesAndLooseToEggs(item.crates, 0, eggsPerCrate)
        const record = await this.removeWithinTransaction({
          workspaceId,
          userId,
          size: item.size,
          quantityEggs,
          reason: 'sold',
          note: `Order ${orderId}`,
          orderId,
          clientEntryId: null,
          recordedAt,
          allowNeedsReview: false,
          trx,
        })
        records.push(record)
      }
      if (ownTrx) {
        await trx.commit()
        await FarmCacheService.invalidateAfterStockChange(workspaceId)
      }
      return records
    } catch (error) {
      if (ownTrx) await trx.rollback()
      throw error
    }
  }

  async checkStockForItems(
    workspaceId: string,
    items: Array<{ size: EggSize; crates: number }>,
    eggsPerCrate: number,
  ) {
    const snapshot = await this.loadStock(workspaceId, eggsPerCrate)
    const shortfalls: Array<{ size: EggSize; needed: number; available: number }> = []
    for (const item of items) {
      const needed = cratesAndLooseToEggs(item.crates, 0, eggsPerCrate)
      const available = snapshot.sizes.find((s) => s.size === item.size)?.quantityEggs ?? 0
      if (available < needed) shortfalls.push({ size: item.size, needed, available })
    }
    return { ok: shortfalls.length === 0, shortfalls }
  }

  async resolveNeedsReview(
    workspaceId: string,
    userId: string,
    recordId: string,
    resolution: 'accept' | 'correct' | 'reject',
    correction?: Record<string, unknown>,
    reason?: string,
  ): Promise<void> {
    const record = await EggRecord.query()
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
        action: `egg.${resolution}_review`,
        entity: 'egg',
        entityId: record.id,
        before: { needsReview: true, quantityEggs: record.quantityEggs },
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
    payload: EggMovementInput,
    options: { allowNeedsReview: boolean },
  ): Promise<EggRecord> {
    if (!Number.isInteger(payload.quantityEggs) || payload.quantityEggs <= 0) {
      throw new Exception('quantityEggs must be a positive integer', { status: 422 })
    }

    if (payload.clientEntryId) {
      const existing = await EggRecord.query()
        .where('workspace_id', workspaceId)
        .where('client_entry_id', payload.clientEntryId)
        .first()
      if (existing) return existing
    }

    const recordedAt = parseRecordedAt(payload.recordedAt)

    if (payload.direction === 'add') {
      const trx = await db.transaction()
      try {
        const stock = await this.lockOrCreateStock(workspaceId, payload.size, trx)
        const before = toNumber(stock.quantityEggs)
        stock.quantityEggs = before + payload.quantityEggs
        await stock.useTransaction(trx).save()

        const record = await EggRecord.create(
          {
            workspaceId,
            userId,
            size: payload.size,
            direction: 'add',
            quantityEggs: payload.quantityEggs,
            reason: null,
            note: payload.note ?? null,
            orderId: null,
            clientEntryId: payload.clientEntryId ?? null,
            needsReview: false,
            recordedAt,
          },
          { client: trx },
        )

        await activityLogService.log({
          workspaceId,
          userId,
          action: 'egg.add',
          entity: 'egg',
          entityId: record.id,
          before: { size: payload.size, quantityEggs: before },
          after: { size: payload.size, quantityEggs: stock.quantityEggs },
          quantity: payload.quantityEggs,
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

    if (!payload.orderId && !payload.reason?.trim()) {
      throw new Exception('Reason is required when removing eggs without an order', {
        status: 422,
      })
    }

    const trx = await db.transaction()
    try {
      const record = await this.removeWithinTransaction({
        workspaceId,
        userId,
        size: payload.size,
        quantityEggs: payload.quantityEggs,
        reason: payload.reason ?? null,
        note: payload.note ?? null,
        orderId: payload.orderId ?? null,
        clientEntryId: payload.clientEntryId ?? null,
        recordedAt,
        allowNeedsReview: options.allowNeedsReview,
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

  private async removeWithinTransaction(options: {
    workspaceId: string
    userId: string
    size: EggSize
    quantityEggs: number
    reason: string | null
    note: string | null
    orderId: string | null
    clientEntryId: string | null
    recordedAt: DateTime
    allowNeedsReview: boolean
    trx: Transaction
  }): Promise<EggRecord> {
    const {
      workspaceId,
      userId,
      size,
      quantityEggs,
      reason,
      note,
      orderId,
      clientEntryId,
      recordedAt,
      allowNeedsReview,
      trx,
    } = options

    const stock = await this.lockOrCreateStock(workspaceId, size, trx)
    const before = toNumber(stock.quantityEggs)
    let needsReview = false
    let after = before - quantityEggs

    if (after < 0) {
      if (!allowNeedsReview) {
        throw new Exception(
          `Insufficient ${size} eggs: have ${before}, tried to remove ${quantityEggs}`,
          { status: 422 },
        )
      }
      needsReview = true
      after = 0
    }

    stock.quantityEggs = after
    await stock.useTransaction(trx).save()

    const record = await EggRecord.create(
      {
        workspaceId,
        userId,
        size,
        direction: 'remove',
        quantityEggs,
        reason,
        note,
        orderId,
        clientEntryId,
        needsReview,
        recordedAt,
      },
      { client: trx },
    )

    await activityLogService.log({
      workspaceId,
      userId,
      action: orderId ? 'egg.sold' : 'egg.remove',
      entity: 'egg',
      entityId: record.id,
      before: { size, quantityEggs: before },
      after: { size, quantityEggs: after, needsReview, orderId },
      quantity: quantityEggs,
      note: note ?? reason,
      recordedAt,
      trx,
    })

    return record
  }

  private async lockOrCreateStock(
    workspaceId: string,
    size: EggSize,
    trx: Transaction,
  ): Promise<EggStock> {
    let stock = await EggStock.query({ client: trx })
      .where('workspace_id', workspaceId)
      .where('size', size)
      .forUpdate()
      .first()

    if (!stock) {
      stock = await EggStock.create({ workspaceId, size, quantityEggs: 0 }, { client: trx })
      stock = await EggStock.query({ client: trx }).where('id', stock.id).forUpdate().firstOrFail()
    }
    return stock
  }
}

const eggInventoryService = new EggInventoryService()
export default eggInventoryService
