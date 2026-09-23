import type { HttpContext } from '@adonisjs/core/http'
import type { FarmOrderStatus } from '#models/farm_order'
import farmOrderService from '#services/farm_order_service'
import { isFarmContext, requireFarmContext } from '#utils/farm_context'
import { canApproveOrders } from '#utils/farm_permissions'
import { createOrderValidator, orderListFilterValidator, updateOrderValidator } from '#validators/farm'

export default class FarmOrdersController {
  async index(ctx: HttpContext) {
    const farm = await requireFarmContext(ctx)
    if (!isFarmContext(farm)) return farm.errorResponse

    const filters = await ctx.request.validateUsing(orderListFilterValidator, {
      data: ctx.request.qs(),
    })

    // Hide sold/cancelled from workers server-side
    let status: FarmOrderStatus | undefined = filters.status
    if (farm.farmRole === 'worker') {
      if (filters.status === 'sold' || filters.status === 'cancelled') {
        status = undefined
      }
    }

    const { orders, meta } = await farmOrderService.list(
      farm.workspaceId,
      {
        status,
        search: filters.search ?? filters.customer,
        from: filters.from,
        to: filters.to,
        page: filters.page,
        perPage: filters.perPage,
      },
      farm.farmRole,
    )

    const visibleOrders =
      farm.farmRole === 'worker'
        ? orders.filter((o) => {
            const statusValue = (o as { status?: string }).status
            return statusValue === 'pending' || statusValue === 'approved'
          })
        : orders

    return ctx.inertia.render('orders/index', {
      orders: visibleOrders,
      meta,
      filters,
      farmRole: farm.farmRole,
      canApprove: canApproveOrders(farm.membershipRole),
    })
  }

  async store(ctx: HttpContext) {
    const farm = await requireFarmContext(ctx)
    if (!isFarmContext(farm)) return farm.errorResponse

    const payload = await ctx.request.validateUsing(createOrderValidator)

    try {
      const order = await farmOrderService.create(
        farm.workspaceId,
        farm.user.id,
        {
          customerName: payload.customerName,
          contact: payload.contact,
          items: payload.items,
          orderDate: payload.orderDate,
          deliveryDate: payload.deliveryDate,
          recurringInterval: payload.recurringInterval ?? null,
          clientEntryId: payload.clientEntryId,
        },
        farm.farmRole,
      )

      return ctx.response.created({
        message: 'Order created.',
        data: { order: order.serialize() },
      })
    } catch (error: unknown) {
      const err = error as { message?: string; status?: number }
      return ctx.response.status(err.status ?? 400).json({
        error: err.message || 'Unable to create order.',
      })
    }
  }

  async update(ctx: HttpContext) {
    const farm = await requireFarmContext(ctx)
    if (!isFarmContext(farm)) return farm.errorResponse

    const payload = await ctx.request.validateUsing(updateOrderValidator)

    try {
      const order = await farmOrderService.update(
        farm.workspaceId,
        farm.user.id,
        ctx.request.param('id'),
        {
          customerName: payload.customerName,
          contact: payload.contact,
          deliveryDate: payload.deliveryDate,
          recurringInterval: payload.recurringInterval ?? null,
          items: payload.items,
        },
      )

      return ctx.response.ok({
        message: 'Order updated.',
        data: { order: order.serialize() },
      })
    } catch (error: unknown) {
      const err = error as { message?: string; status?: number }
      return ctx.response.status(err.status ?? 400).json({
        error: err.message || 'Unable to update order.',
      })
    }
  }

  async approve(ctx: HttpContext) {
    const farm = await requireFarmContext(ctx)
    if (!isFarmContext(farm)) return farm.errorResponse

    if (!canApproveOrders(farm.membershipRole)) {
      return ctx.response.forbidden({ error: 'You do not have permission to approve orders.' })
    }

    try {
      const order = await farmOrderService.approve(
        farm.workspaceId,
        farm.user.id,
        ctx.request.param('id'),
      )
      return ctx.response.ok({ message: 'Order approved.', data: { order: order.serialize() } })
    } catch (error: unknown) {
      const err = error as { message?: string; status?: number }
      return ctx.response.status(err.status ?? 400).json({
        error: err.message || 'Unable to approve order.',
      })
    }
  }

  async cancel(ctx: HttpContext) {
    const farm = await requireFarmContext(ctx)
    if (!isFarmContext(farm)) return farm.errorResponse

    if (!canApproveOrders(farm.membershipRole)) {
      return ctx.response.forbidden({ error: 'You do not have permission to cancel orders.' })
    }

    try {
      const order = await farmOrderService.cancel(
        farm.workspaceId,
        farm.user.id,
        ctx.request.param('id'),
      )
      return ctx.response.ok({ message: 'Order cancelled.', data: { order: order.serialize() } })
    } catch (error: unknown) {
      const err = error as { message?: string; status?: number }
      return ctx.response.status(err.status ?? 400).json({
        error: err.message || 'Unable to cancel order.',
      })
    }
  }

  async markSold(ctx: HttpContext) {
    const farm = await requireFarmContext(ctx)
    if (!isFarmContext(farm)) return farm.errorResponse

    if (!canApproveOrders(farm.membershipRole)) {
      return ctx.response.forbidden({ error: 'You do not have permission to mark orders as sold.' })
    }

    try {
      const order = await farmOrderService.markSold(
        farm.workspaceId,
        farm.user.id,
        ctx.request.param('id'),
      )
      return ctx.response.ok({
        message: 'Order marked as sold.',
        data: { order: order.serialize() },
      })
    } catch (error: unknown) {
      const err = error as { message?: string; status?: number }
      return ctx.response.status(err.status ?? 400).json({
        error: err.message || 'Unable to mark order as sold.',
      })
    }
  }
}
