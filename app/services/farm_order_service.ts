import { Exception } from '@adonisjs/core/exceptions'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'
import BirdRecord from '#models/bird_record'
import EggRecord from '#models/egg_record'
import type { EggSize } from '#models/egg_stock'
import type { FarmOrderStatus, OrderRecurringInterval } from '#models/farm_order'
import FarmOrder from '#models/farm_order'
import FeedRecord from '#models/feed_record'
import OrderItem from '#models/order_item'
import Workspace from '#models/workspace'
import activityLogService from '#services/activity_log_service'
import eggInventoryService from '#services/egg_inventory_service'
import FarmCacheService from '#services/farm_cache_service'
import type { Transaction } from '#types/extra'
import { formatOrderRef } from '#utils/order_ref'
import type { FarmRole } from '#utils/farm_permissions'

export interface CreateOrderInput {
  customerName: string
  contact?: string | null
  orderDate?: string
  deliveryDate?: string | null
  recurringInterval?: OrderRecurringInterval | null
  items: Array<{ size: EggSize; crates: number }>
  clientEntryId?: string
}

export interface OrderListFilters {
  status?: FarmOrderStatus
  search?: string
  from?: string
  to?: string
  page?: number
  perPage?: number
}

function parseOptionalDate(value?: string | null): DateTime | null {
  if (!value) return null
  // Accept date-only (yyyy-MM-dd) or full ISO
  const parsed = value.length <= 10 ? DateTime.fromISO(value, { zone: 'utc' }).startOf('day') : DateTime.fromISO(value)
  if (!parsed.isValid) throw new Exception('Invalid date', { status: 422 })
  return parsed
}

function advanceDueDate(base: DateTime, interval: OrderRecurringInterval): DateTime {
  if (interval === 'weekly') return base.plus({ weeks: 1 })
  if (interval === 'biweekly') return base.plus({ weeks: 2 })
  return base.plus({ months: 1 })
}

export class FarmOrderService {
  /** Next ORD-n for a workspace; caller must hold a transaction. */
  private async allocateOrderNumber(workspaceId: string, trx: Transaction) {
    await Workspace.query({ client: trx }).where('id', workspaceId).forUpdate().firstOrFail()
    const result = await db
      .from('orders')
      .useTransaction(trx)
      .where('workspace_id', workspaceId)
      .max('order_number as max')
      .first()
    return Number(result?.max ?? 0) + 1
  }
  async list(workspaceId: string, filters: OrderListFilters = {}, _farmRole?: FarmRole) {
    const query = FarmOrder.query()
      .where('workspace_id', workspaceId)
      .preload('items')
      .preload('creator')
      .preload('approver')
      .orderBy('order_date', 'desc')

    if (filters.status) query.where('status', filters.status)

    const from = parseOptionalDate(filters.from)
    const to = parseOptionalDate(filters.to)
    if (from) query.where('order_date', '>=', from.toSQL()!)
    if (to) query.where('order_date', '<=', to.toSQL()!)

    if (filters.search) {
      const term = filters.search.trim()
      const ordMatch = term.match(/^(?:ORD-?)?(\d+)$/i)
      query.where((q) => {
        q.whereILike('customer_name', `%${term}%`).orWhereILike('id', `%${term}%`)
        if (ordMatch) q.orWhere('order_number', Number(ordMatch[1]))
      })
    }

    const page = await query.paginate(filters.page ?? 1, filters.perPage ?? 25)
    const json = page.toJSON()
    return { orders: json.data, meta: json.meta }
  }

  async create(
    workspaceId: string,
    userId: string,
    payload: CreateOrderInput,
    _farmRole?: FarmRole,
  ): Promise<FarmOrder> {
    if (!payload.customerName?.trim()) {
      throw new Exception('Customer name is required', { status: 422 })
    }
    if (!payload.items?.length) {
      throw new Exception('Order must include at least one item', { status: 422 })
    }
    for (const item of payload.items) {
      if (!Number.isInteger(item.crates) || item.crates <= 0) {
        throw new Exception('Each order item must have a positive crate count', { status: 422 })
      }
    }

    if (payload.clientEntryId) {
      const existing = await FarmOrder.query()
        .where('workspace_id', workspaceId)
        .where('client_entry_id', payload.clientEntryId)
        .preload('items')
        .first()
      if (existing) return existing
    }

    const orderDate = parseOptionalDate(payload.orderDate) ?? DateTime.now()
    const deliveryDate = parseOptionalDate(payload.deliveryDate ?? null)
    const recurringInterval = payload.recurringInterval ?? null
    const trx = await db.transaction()

    try {
      const orderNumber = await this.allocateOrderNumber(workspaceId, trx)
      const order = await FarmOrder.create(
        {
          workspaceId,
          orderNumber,
          customerName: payload.customerName.trim(),
          contact: payload.contact ?? null,
          status: 'pending',
          createdBy: userId,
          approvedBy: null,
          orderDate,
          deliveryDate,
          recurringInterval,
          soldAt: null,
          clientEntryId: payload.clientEntryId ?? null,
        },
        { client: trx },
      )

      await OrderItem.createMany(
        payload.items.map((item) => ({
          orderId: order.id,
          size: item.size,
          crates: item.crates,
        })),
        { client: trx },
      )

      await activityLogService.log({
        workspaceId,
        userId,
        action: 'order.create',
        entity: 'order',
        entityId: order.id,
        before: null,
        after: {
          status: 'pending',
          orderNumber,
          orderRef: formatOrderRef(orderNumber),
          customerName: order.customerName,
          items: payload.items,
          deliveryDate: deliveryDate?.toISO() ?? null,
          recurringInterval,
        },
        quantity: payload.items.reduce((sum, i) => sum + i.crates, 0),
        recordedAt: orderDate,
        trx,
      })

      await trx.commit()
      await FarmCacheService.invalidateAfterOrderChange(workspaceId)
      await order.load('items')
      return order
    } catch (error) {
      await trx.rollback()
      throw error
    }
  }

  async syncEntry(
    workspaceId: string,
    userId: string,
    clientEntryId: string,
    payload: CreateOrderInput,
    farmRole?: FarmRole,
  ): Promise<{ orderId: string; created: boolean }> {
    const existing = await FarmOrder.query()
      .where('workspace_id', workspaceId)
      .where('client_entry_id', clientEntryId)
      .first()
    if (existing) return { orderId: existing.id, created: false }

    const order = await this.create(workspaceId, userId, { ...payload, clientEntryId }, farmRole)
    return { orderId: order.id, created: true }
  }

  async update(
    workspaceId: string,
    userId: string,
    orderId: string,
    payload: {
      customerName: string
      contact?: string | null
      deliveryDate?: string | null
      recurringInterval?: OrderRecurringInterval | null
      items: Array<{ size: EggSize; crates: number }>
    },
  ): Promise<FarmOrder> {
    if (!payload.customerName?.trim()) {
      throw new Exception('Customer name is required', { status: 422 })
    }
    if (!payload.items?.length) {
      throw new Exception('Order must include at least one item', { status: 422 })
    }
    for (const item of payload.items) {
      if (!Number.isInteger(item.crates) || item.crates <= 0) {
        throw new Exception('Each order item must have a positive crate count', { status: 422 })
      }
    }

    const deliveryDate = parseOptionalDate(payload.deliveryDate ?? null)
    const recurringInterval = payload.recurringInterval ?? null
    const trx = await db.transaction()

    try {
      const order = await FarmOrder.query({ client: trx })
        .where('workspace_id', workspaceId)
        .where('id', orderId)
        .forUpdate()
        .firstOrFail()

      await order.load('items')

      if (order.status !== 'pending' && order.status !== 'approved') {
        throw new Exception(`Cannot edit order in status ${order.status}`, { status: 422 })
      }

      const before = {
        customerName: order.customerName,
        contact: order.contact,
        deliveryDate: order.deliveryDate?.toISO() ?? null,
        recurringInterval: order.recurringInterval,
        items: order.items.map((item) => ({ size: item.size, crates: item.crates })),
      }

      order.customerName = payload.customerName.trim()
      order.contact = payload.contact ?? null
      order.deliveryDate = deliveryDate
      order.recurringInterval = recurringInterval
      await order.useTransaction(trx).save()

      await OrderItem.query({ client: trx }).where('order_id', order.id).delete()
      await OrderItem.createMany(
        payload.items.map((item) => ({
          orderId: order.id,
          size: item.size,
          crates: item.crates,
        })),
        { client: trx },
      )

      await activityLogService.log({
        workspaceId,
        userId,
        action: 'order.update',
        entity: 'order',
        entityId: order.id,
        before,
        after: {
          customerName: order.customerName,
          contact: order.contact,
          deliveryDate: order.deliveryDate?.toISO() ?? null,
          recurringInterval: order.recurringInterval,
          items: payload.items,
        },
        quantity: payload.items.reduce((sum, i) => sum + i.crates, 0),
        recordedAt: DateTime.now(),
        trx,
      })

      await trx.commit()
      await FarmCacheService.invalidateAfterOrderChange(workspaceId)
      await order.load('items')
      return order
    } catch (error) {
      await trx.rollback()
      throw error
    }
  }

  async approve(workspaceId: string, userId: string, orderId: string): Promise<FarmOrder> {
    const trx = await db.transaction()
    try {
      const order = await FarmOrder.query({ client: trx })
        .where('workspace_id', workspaceId)
        .where('id', orderId)
        .forUpdate()
        .firstOrFail()

      if (order.status !== 'pending') {
        throw new Exception(`Cannot approve order in status ${order.status}`, { status: 422 })
      }

      const before = { status: order.status }
      order.status = 'approved'
      order.approvedBy = userId
      await order.useTransaction(trx).save()

      await activityLogService.log({
        workspaceId,
        userId,
        action: 'order.approve',
        entity: 'order',
        entityId: order.id,
        before,
        after: { status: order.status, approvedBy: userId },
        recordedAt: DateTime.now(),
        trx,
      })

      await trx.commit()
      await FarmCacheService.invalidateAfterOrderChange(workspaceId)
      await order.load('items')
      return order
    } catch (error) {
      await trx.rollback()
      throw error
    }
  }

  async cancel(workspaceId: string, userId: string, orderId: string): Promise<FarmOrder> {
    const trx = await db.transaction()
    try {
      const order = await FarmOrder.query({ client: trx })
        .where('workspace_id', workspaceId)
        .where('id', orderId)
        .forUpdate()
        .firstOrFail()

      if (order.status === 'sold' || order.status === 'cancelled') {
        throw new Exception(`Cannot cancel order in status ${order.status}`, { status: 422 })
      }

      const before = { status: order.status }
      order.status = 'cancelled'
      await order.useTransaction(trx).save()

      await activityLogService.log({
        workspaceId,
        userId,
        action: 'order.cancel',
        entity: 'order',
        entityId: order.id,
        before,
        after: { status: order.status },
        recordedAt: DateTime.now(),
        trx,
      })

      await trx.commit()
      await FarmCacheService.invalidateAfterOrderChange(workspaceId)
      await order.load('items')
      return order
    } catch (error) {
      await trx.rollback()
      throw error
    }
  }

  async markSold(workspaceId: string, userId: string, orderId: string): Promise<FarmOrder> {
    const workspace = await Workspace.findOrFail(workspaceId)
    const eggsPerCrate = workspace.eggsPerCrate ?? 30
    const trx = await db.transaction()

    try {
      const order = await FarmOrder.query({ client: trx })
        .where('workspace_id', workspaceId)
        .where('id', orderId)
        .forUpdate()
        .firstOrFail()

      await order.load('items')

      if (order.status !== 'approved' && order.status !== 'pending') {
        throw new Exception(`Cannot mark sold when order is ${order.status}`, { status: 422 })
      }

      const items = order.items.map((item) => ({ size: item.size, crates: item.crates }))
      const check = await eggInventoryService.checkStockForItems(workspaceId, items, eggsPerCrate)
      if (!check.ok) {
        const detail = check.shortfalls
          .map((s) => `${s.size}: need ${s.needed}, have ${s.available}`)
          .join('; ')
        throw new Exception(`Insufficient egg stock to mark order sold (${detail})`, {
          status: 422,
        })
      }

      const before = { status: order.status }
      const soldAt = DateTime.now()

      if (order.status === 'pending') {
        order.status = 'approved'
        order.approvedBy = userId
      }

      await eggInventoryService.sellForOrder(workspaceId, order.id, items, eggsPerCrate, userId, {
        recordedAt: soldAt,
        trx,
      })

      order.status = 'sold'
      order.soldAt = soldAt
      await order.useTransaction(trx).save()

      await activityLogService.log({
        workspaceId,
        userId,
        action: 'order.sold',
        entity: 'order',
        entityId: order.id,
        before,
        after: { status: 'sold', soldAt: soldAt.toISO(), items },
        quantity: items.reduce((sum, i) => sum + i.crates, 0),
        recordedAt: soldAt,
        trx,
      })

      if (order.recurringInterval) {
        const baseDue = order.deliveryDate ?? soldAt
        const nextDue = advanceDueDate(baseDue, order.recurringInterval)
        const nextOrderNumber = await this.allocateOrderNumber(workspaceId, trx)
        const nextOrder = await FarmOrder.create(
          {
            workspaceId,
            orderNumber: nextOrderNumber,
            customerName: order.customerName,
            contact: order.contact,
            status: 'pending',
            createdBy: userId,
            approvedBy: null,
            orderDate: soldAt,
            deliveryDate: nextDue,
            recurringInterval: order.recurringInterval,
            soldAt: null,
            clientEntryId: null,
          },
          { client: trx },
        )

        await OrderItem.createMany(
          items.map((item) => ({
            orderId: nextOrder.id,
            size: item.size,
            crates: item.crates,
          })),
          { client: trx },
        )

        await activityLogService.log({
          workspaceId,
          userId,
          action: 'order.create',
          entity: 'order',
          entityId: nextOrder.id,
          before: null,
          after: {
            status: 'pending',
            orderNumber: nextOrderNumber,
            orderRef: formatOrderRef(nextOrderNumber),
            customerName: nextOrder.customerName,
            items,
            deliveryDate: nextDue.toISO(),
            recurringInterval: order.recurringInterval,
            spawnedFrom: order.id,
            spawnedFromRef: formatOrderRef(order.orderNumber),
          },
          quantity: items.reduce((sum, i) => sum + i.crates, 0),
          recordedAt: soldAt,
          note: `Recurring ${order.recurringInterval} order from ${formatOrderRef(order.orderNumber)}`,
          trx,
        })
      }

      await trx.commit()
      await FarmCacheService.invalidateAfterOrderChange(workspaceId)
      await FarmCacheService.invalidateAfterStockChange(workspaceId)
      await order.load('items')
      return order
    } catch (error) {
      await trx.rollback()
      throw error
    }
  }

  async pendingCount(workspaceId: string): Promise<number> {
    return FarmCacheService.getOrSet(
      FarmCacheService.keys.pendingOrdersCount(workspaceId),
      async () => {
        const row = await FarmOrder.query()
          .where('workspace_id', workspaceId)
          .where('status', 'pending')
          .count('* as total')
          .first()
        return Number(row?.$extras.total ?? 0)
      },
      FarmCacheService.ttl.pendingOrders,
    )
  }

  /** Orders still open: pending approval or approved but not yet sold/cancelled. */
  async openCount(workspaceId: string): Promise<number> {
    const row = await FarmOrder.query()
      .where('workspace_id', workspaceId)
      .whereIn('status', ['pending', 'approved'])
      .count('* as total')
      .first()
    return Number(row?.$extras.total ?? 0)
  }

  async countPending(workspaceId: string): Promise<number> {
    return this.pendingCount(workspaceId)
  }

  async countNeedsReview(workspaceId: string): Promise<number> {
    const [birds, eggs, feed] = await Promise.all([
      BirdRecord.query()
        .where('workspace_id', workspaceId)
        .where('needs_review', true)
        .count('* as total')
        .first(),
      EggRecord.query()
        .where('workspace_id', workspaceId)
        .where('needs_review', true)
        .count('* as total')
        .first(),
      FeedRecord.query()
        .where('workspace_id', workspaceId)
        .where('needs_review', true)
        .count('* as total')
        .first(),
    ])

    return (
      Number(birds?.$extras.total ?? 0) +
      Number(eggs?.$extras.total ?? 0) +
      Number(feed?.$extras.total ?? 0)
    )
  }
}

const farmOrderService = new FarmOrderService()
export default farmOrderService
