import type { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'
import Workspace from '#models/workspace'
import birdInventoryService from '#services/bird_inventory_service'
import eggInventoryService, { cratesAndLooseToEggs } from '#services/egg_inventory_service'
import farmOrderService from '#services/farm_order_service'
import feedInventoryService from '#services/feed_inventory_service'
import { isFarmContext, requireFarmContext } from '#utils/farm_context'
import { canCorrectEntries } from '#utils/farm_permissions'
import {
  farmSyncValidator,
  parseOptionalDateTime,
  resolveNeedsReviewValidator,
} from '#validators/farm'

export default class FarmSyncController {
  async sync(ctx: HttpContext) {
    const farm = await requireFarmContext(ctx)
    if (!isFarmContext(farm)) return farm.errorResponse

    const { entries } = await ctx.request.validateUsing(farmSyncValidator)
    const workspace = await Workspace.findOrFail(farm.workspaceId)
    const results: Array<{
      clientEntryId: string
      type: string
      ok: boolean
      created?: boolean
      needsReview?: boolean
      id?: string
      error?: string
    }> = []

    for (const entry of entries) {
      try {
        const payload = (entry.payload ?? {}) as Record<string, unknown>
        const recordedAt =
          parseOptionalDateTime(
            typeof payload.recordedAt === 'string' ? payload.recordedAt : undefined,
          ) ?? DateTime.now()

        if (entry.type === 'birds') {
          const direction = payload.direction as 'add' | 'remove' | 'move'
          const base = {
            workspaceId: farm.workspaceId,
            userId: farm.user.id,
            health: (payload.health as 'well' | 'sick' | null | undefined) ?? null,
            production: payload.production as 'laying' | 'non_laying' | 'chick',
            quantity: Number(payload.quantity),
            note: (payload.note as string | null | undefined) ?? null,
            clientEntryId: entry.clientEntryId,
            recordedAt,
            allowNeedsReview: true,
          }

          let record: Awaited<ReturnType<typeof birdInventoryService.add>>
          if (direction === 'add') {
            record = await birdInventoryService.add(base)
          } else if (direction === 'remove') {
            record = await birdInventoryService.remove({
              ...base,
              reason: String(payload.reason ?? 'offline_remove'),
            })
          } else {
            record = await birdInventoryService.move({
              ...base,
              toHealth: (payload.toHealth as 'well' | 'sick' | null | undefined) ?? null,
              toProduction: payload.toProduction as 'laying' | 'non_laying' | 'chick',
            })
          }

          results.push({
            clientEntryId: entry.clientEntryId,
            type: entry.type,
            ok: true,
            created: true,
            needsReview: record.needsReview,
            id: record.id,
          })
        } else if (entry.type === 'eggs') {
          const quantityEggs =
            payload.quantityEggs != null
              ? Number(payload.quantityEggs)
              : cratesAndLooseToEggs(
                  Number(payload.crates ?? 0),
                  Number(payload.loose ?? 0),
                  workspace.eggsPerCrate,
                )

          const result = await eggInventoryService.syncEntry(
            farm.workspaceId,
            farm.user.id,
            entry.clientEntryId,
            {
              size: payload.size as 'small' | 'medium' | 'large',
              direction: payload.direction as 'add' | 'remove',
              quantityEggs,
              reason: payload.reason as string | undefined,
              note: payload.note as string | undefined,
              orderId: (payload.orderId as string | null | undefined) ?? null,
              recordedAt: recordedAt.toISO() ?? undefined,
            },
          )

          results.push({
            clientEntryId: entry.clientEntryId,
            type: entry.type,
            ok: true,
            created: result.created,
            needsReview: result.needsReview,
            id: result.recordId,
          })
        } else if (entry.type === 'feed') {
          const result = await feedInventoryService.syncEntry(
            farm.workspaceId,
            farm.user.id,
            entry.clientEntryId,
            {
              direction: payload.direction as 'add' | 'remove',
              bags: Number(payload.bags),
              note: payload.note as string | undefined,
              recordedAt: recordedAt.toISO() ?? undefined,
            },
          )

          results.push({
            clientEntryId: entry.clientEntryId,
            type: entry.type,
            ok: true,
            created: result.created,
            needsReview: result.needsReview,
            id: result.recordId,
          })
        } else {
          const result = await farmOrderService.syncEntry(
            farm.workspaceId,
            farm.user.id,
            entry.clientEntryId,
            {
              customerName: String(payload.customerName ?? ''),
              contact: (payload.contact as string | null | undefined) ?? null,
              items:
                (payload.items as Array<{
                  size: 'small' | 'medium' | 'large'
                  crates: number
                }>) ?? [],
              orderDate: recordedAt.toISO() ?? undefined,
              deliveryDate: typeof payload.deliveryDate === 'string' ? payload.deliveryDate : null,
            },
            farm.farmRole,
          )

          results.push({
            clientEntryId: entry.clientEntryId,
            type: entry.type,
            ok: true,
            created: result.created,
            id: result.orderId,
          })
        }
      } catch (error: unknown) {
        const err = error as { message?: string }
        results.push({
          clientEntryId: entry.clientEntryId,
          type: entry.type,
          ok: false,
          error: err.message || 'Sync failed for this entry.',
        })
      }
    }

    return ctx.response.ok({ data: { results } })
  }

  async resolveNeedsReview(ctx: HttpContext) {
    const farm = await requireFarmContext(ctx)
    if (!isFarmContext(farm)) return farm.errorResponse

    if (!canCorrectEntries(farm.membershipRole)) {
      return ctx.response.forbidden({
        error: 'Only owners and managers can resolve needs-review entries.',
      })
    }

    const payload = await ctx.request.validateUsing(resolveNeedsReviewValidator)

    try {
      if (payload.entity === 'birds') {
        const record = await birdInventoryService.resolveNeedsReview({
          workspaceId: farm.workspaceId,
          userId: farm.user.id,
          recordId: payload.recordId,
          resolution: payload.resolution,
          reason: payload.reason,
          correction: payload.correction as
            | {
                quantity?: number
                health?: 'well' | 'sick' | null
                production?: 'laying' | 'non_laying' | 'chick'
                toHealth?: 'well' | 'sick' | null
                toProduction?: 'laying' | 'non_laying' | 'chick' | null
              }
            | undefined,
        })
        return ctx.response.ok({
          message: 'Needs-review entry resolved.',
          data: { record: record.serialize() },
        })
      }

      if (payload.entity === 'eggs') {
        await eggInventoryService.resolveNeedsReview(
          farm.workspaceId,
          farm.user.id,
          payload.recordId,
          payload.resolution,
          payload.correction as Record<string, unknown> | undefined,
          payload.reason,
        )
        return ctx.response.ok({ message: 'Needs-review entry resolved.' })
      }

      await feedInventoryService.resolveNeedsReview(
        farm.workspaceId,
        farm.user.id,
        payload.recordId,
        payload.resolution,
        payload.correction as Record<string, unknown> | undefined,
        payload.reason,
      )
      return ctx.response.ok({ message: 'Needs-review entry resolved.' })
    } catch (error: unknown) {
      const err = error as { message?: string; status?: number }
      return ctx.response.status(err.status ?? 400).json({
        error: err.message || 'Unable to resolve needs-review entry.',
      })
    }
  }
}
