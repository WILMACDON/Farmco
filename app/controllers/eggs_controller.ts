import type { HttpContext } from '@adonisjs/core/http'
import Workspace from '#models/workspace'
import eggInventoryService, { cratesAndLooseToEggs } from '#services/egg_inventory_service'
import { isFarmContext, requireFarmContext } from '#utils/farm_context'
import { eggMovementValidator } from '#validators/farm'

function resolveEggQuantity(
  payload: {
    quantityEggs?: number
    crates?: number
    loose?: number
  },
  eggsPerCrate: number,
): number {
  if (payload.quantityEggs != null) return payload.quantityEggs
  return cratesAndLooseToEggs(payload.crates ?? 0, payload.loose ?? 0, eggsPerCrate)
}

export default class EggsController {
  async index(ctx: HttpContext) {
    const farm = await requireFarmContext(ctx)
    if (!isFarmContext(farm)) return farm.errorResponse

    const workspace = await Workspace.findOrFail(farm.workspaceId)
    const [stock, recentRecords] = await Promise.all([
      eggInventoryService.getStock(farm.workspaceId, workspace.eggsPerCrate),
      eggInventoryService.getRecentRecords(farm.workspaceId),
    ])

    return ctx.inertia.render('eggs/index', {
      stock,
      recentRecords,
      eggsPerCrate: workspace.eggsPerCrate,
      farmRole: farm.farmRole,
    })
  }

  async store(ctx: HttpContext) {
    const farm = await requireFarmContext(ctx)
    if (!isFarmContext(farm)) return farm.errorResponse

    const payload = await ctx.request.validateUsing(eggMovementValidator)
    const workspace = await Workspace.findOrFail(farm.workspaceId)

    try {
      const quantityEggs = resolveEggQuantity(payload, workspace.eggsPerCrate)
      if (!quantityEggs || quantityEggs < 1) {
        return ctx.response.badRequest({
          error: 'Provide quantityEggs or crates/loose greater than zero.',
        })
      }

      if (payload.direction === 'remove' && !payload.reason && !payload.orderId) {
        return ctx.response.badRequest({ error: 'A reason is required when removing eggs.' })
      }

      const result = await eggInventoryService.recordMovement(farm.workspaceId, farm.user.id, {
        size: payload.size,
        direction: payload.direction,
        quantityEggs,
        reason: payload.reason,
        note: payload.note ?? undefined,
        orderId: payload.orderId,
        clientEntryId: payload.clientEntryId,
        recordedAt: payload.recordedAt,
      })

      return ctx.response.created({
        message: 'Egg movement recorded.',
        data: result,
      })
    } catch (error: unknown) {
      const err = error as { message?: string; status?: number }
      return ctx.response.status(err.status ?? 400).json({
        error: err.message || 'Unable to record egg movement.',
      })
    }
  }
}
