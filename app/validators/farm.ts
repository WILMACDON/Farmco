import vine from '@vinejs/vine'
import { DateTime } from 'luxon'

const optionalClientEntryId = vine.string().trim().minLength(1).maxLength(64).optional()
const optionalNote = vine.string().trim().maxLength(2000).optional().nullable()

const birdHealth = vine.enum(['well', 'sick'] as const)
const birdProduction = vine.enum(['laying', 'non_laying', 'chick'] as const)
const eggSize = vine.enum(['small', 'medium', 'large'] as const)

export const birdMovementValidator = vine.compile(
  vine.object({
    direction: vine.enum(['add', 'remove', 'move'] as const),
    health: birdHealth.clone().optional().nullable(),
    production: birdProduction.clone(),
    toHealth: birdHealth.clone().optional().nullable(),
    toProduction: birdProduction.clone().optional().nullable(),
    quantity: vine.number().withoutDecimals().min(1),
    reason: vine.string().trim().minLength(1).maxLength(255).optional(),
    note: optionalNote.clone(),
    clientEntryId: optionalClientEntryId.clone(),
    recordedAt: vine.string().trim().optional(),
    allowNeedsReview: vine.boolean().optional(),
  }),
)

export const eggMovementValidator = vine.compile(
  vine.object({
    size: eggSize.clone(),
    direction: vine.enum(['add', 'remove'] as const),
    quantityEggs: vine.number().withoutDecimals().min(1).optional(),
    crates: vine.number().withoutDecimals().min(0).optional(),
    loose: vine.number().withoutDecimals().min(0).optional(),
    reason: vine.string().trim().minLength(1).maxLength(255).optional(),
    note: optionalNote.clone(),
    orderId: vine.string().trim().optional().nullable(),
    clientEntryId: optionalClientEntryId.clone(),
    recordedAt: vine.string().trim().optional(),
    allowNeedsReview: vine.boolean().optional(),
  }),
)

export const feedMovementValidator = vine.compile(
  vine.object({
    direction: vine.enum(['add', 'remove'] as const),
    bags: vine.number().min(0.001),
    note: optionalNote.clone(),
    clientEntryId: optionalClientEntryId.clone(),
    recordedAt: vine.string().trim().optional(),
    allowNeedsReview: vine.boolean().optional(),
  }),
)

export const createOrderValidator = vine.compile(
  vine.object({
    customerName: vine.string().trim().minLength(1).maxLength(255),
    contact: vine.string().trim().maxLength(255).optional().nullable(),
    orderDate: vine.string().trim().optional(),
    deliveryDate: vine.string().trim().optional().nullable(),
    recurringInterval: vine.enum(['weekly', 'biweekly', 'monthly'] as const).optional().nullable(),
    items: vine
      .array(
        vine.object({
          size: eggSize.clone(),
          crates: vine.number().withoutDecimals().min(1),
        }),
      )
      .minLength(1),
    clientEntryId: optionalClientEntryId.clone(),
  }),
)

export const updateOrderValidator = vine.compile(
  vine.object({
    customerName: vine.string().trim().minLength(1).maxLength(255),
    contact: vine.string().trim().maxLength(255).optional().nullable(),
    deliveryDate: vine.string().trim().optional().nullable(),
    recurringInterval: vine.enum(['weekly', 'biweekly', 'monthly'] as const).optional().nullable(),
    items: vine
      .array(
        vine.object({
          size: eggSize.clone(),
          crates: vine.number().withoutDecimals().min(1),
        }),
      )
      .minLength(1),
  }),
)

export const orderListFilterValidator = vine.compile(
  vine.object({
    status: vine.enum(['pending', 'approved', 'sold', 'cancelled'] as const).optional(),
    search: vine.string().trim().maxLength(255).optional(),
    customer: vine.string().trim().maxLength(255).optional(),
    from: vine.string().trim().optional(),
    to: vine.string().trim().optional(),
    page: vine.number().withoutDecimals().min(1).optional(),
    perPage: vine.number().withoutDecimals().min(1).max(100).optional(),
  }),
)

export const inviteFarmUserValidator = vine.compile(
  vine.object({
    email: vine.string().toLowerCase().trim().email(),
    fullName: vine.string().trim().minLength(1).maxLength(255),
    role: vine.enum(['manager', 'worker'] as const),
  }),
)

export const deactivateFarmUserValidator = vine.compile(
  vine.object({
    userId: vine.string().trim().minLength(1),
  }),
)

export const reactivateFarmUserValidator = vine.compile(
  vine.object({
    userId: vine.string().trim().minLength(1),
  }),
)

export const orgSettingsValidator = vine.compile(
  vine.object({
    eggsPerCrate: vine.number().withoutDecimals().min(1).max(100),
    lowFeedThreshold: vine.number().min(0),
  }),
)

export const activityFilterValidator = vine.compile(
  vine.object({
    userId: vine.string().trim().optional(),
    entity: vine.string().trim().maxLength(64).optional(),
    action: vine.string().trim().maxLength(64).optional(),
    from: vine.string().trim().optional(),
    to: vine.string().trim().optional(),
    page: vine.number().withoutDecimals().min(1).optional(),
    perPage: vine.number().withoutDecimals().min(1).max(100).optional(),
  }),
)

export const statsFilterValidator = vine.compile(
  vine.object({
    range: vine.enum(['7d', '30d', 'custom'] as const).optional(),
    from: vine.string().trim().optional(),
    to: vine.string().trim().optional(),
  }),
)

export const farmSyncValidator = vine.compile(
  vine.object({
    entries: vine
      .array(
        vine.object({
          type: vine.enum(['birds', 'eggs', 'feed', 'orders'] as const),
          clientEntryId: vine.string().trim().minLength(1).maxLength(64),
          payload: vine.any(),
        }),
      )
      .minLength(1)
      .maxLength(100),
  }),
)

export const resolveNeedsReviewValidator = vine.compile(
  vine.object({
    entity: vine.enum(['birds', 'eggs', 'feed'] as const),
    recordId: vine.string().trim().minLength(1),
    resolution: vine.enum(['accept', 'correct', 'reject'] as const),
    correction: vine.any().optional(),
    reason: vine.string().trim().minLength(1).maxLength(500).optional(),
  }),
)

export function parseOptionalDateTime(value?: string | null): DateTime | undefined {
  if (!value) return undefined
  const parsed = DateTime.fromISO(value)
  if (!parsed.isValid) throw new Error(`Invalid date: ${value}`)
  return parsed
}
