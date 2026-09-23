import type { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'
import type BirdRecord from '#models/bird_record'
import birdInventoryService from '#services/bird_inventory_service'
import { isFarmContext, requireFarmContext } from '#utils/farm_context'
import { birdMovementValidator, parseOptionalDateTime } from '#validators/farm'

export default class BirdsController {
  async index(ctx: HttpContext) {
    const farm = await requireFarmContext(ctx)
    if (!isFarmContext(farm)) return farm.errorResponse

    const [stock, recentRecords] = await Promise.all([
      birdInventoryService.getStock(farm.workspaceId),
      birdInventoryService.listRecent(farm.workspaceId),
    ])

    return ctx.inertia.render('birds/index', {
      stock,
      recentRecords: recentRecords.map((r) => r.serialize()),
      farmRole: farm.farmRole,
    })
  }

  async store(ctx: HttpContext) {
    const farm = await requireFarmContext(ctx)
    if (!isFarmContext(farm)) return farm.errorResponse

    const payload = await ctx.request.validateUsing(birdMovementValidator)

    try {
      const recordedAt = parseOptionalDateTime(payload.recordedAt) ?? DateTime.now()
      const base = {
        workspaceId: farm.workspaceId,
        userId: farm.user.id,
        health: payload.health ?? null,
        production: payload.production,
        quantity: payload.quantity,
        note: payload.note ?? null,
        clientEntryId: payload.clientEntryId ?? null,
        recordedAt,
        allowNeedsReview: payload.allowNeedsReview ?? false,
      }

      let record: BirdRecord
      if (payload.direction === 'add') {
        record = await birdInventoryService.add(base)
      } else if (payload.direction === 'remove') {
        if (!payload.reason) {
          return ctx.response.badRequest({ error: 'A reason is required when removing birds.' })
        }
        record = await birdInventoryService.remove({ ...base, reason: payload.reason })
      } else {
        if (!payload.toProduction) {
          return ctx.response.badRequest({
            error: 'Destination category is required when moving birds.',
          })
        }
        record = await birdInventoryService.move({
          ...base,
          toHealth: payload.toHealth ?? null,
          toProduction: payload.toProduction,
        })
      }

      return ctx.response.created({
        message: 'Bird movement recorded.',
        data: { record: record.serialize() },
      })
    } catch (error: unknown) {
      const err = error as { message?: string }
      return ctx.response.badRequest({
        error: err.message || 'Unable to record bird movement.',
      })
    }
  }
}
