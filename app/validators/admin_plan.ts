import vine from '@vinejs/vine'

export const createPlanValidator = vine.compile(
  vine.object({
    name: vine.string().trim().minLength(1),
    description: vine.string().optional().nullable(),
    priceMonthly: vine.number().min(0),
    priceYearly: vine.number().min(0),
    currency: vine.enum(['usd', 'gbp', 'eur']).optional(),
    stripePriceIdMonthly: vine.string().optional().nullable(),
    stripePriceIdYearly: vine.string().optional().nullable(),
    stripeProductId: vine.string().optional().nullable(),
    features: vine.array(vine.string()).optional().nullable(),
    isActive: vine.boolean().optional(),
    isRecommended: vine.boolean().optional(),
  }),
)

export const updatePlanValidator = vine.compile(
  vine.object({
    name: vine.string().trim().minLength(1).optional(),
    description: vine.string().optional().nullable(),
    priceMonthly: vine.number().min(0).optional(),
    priceYearly: vine.number().min(0).optional(),
    currency: vine.enum(['usd', 'gbp', 'eur']).optional(),
    stripePriceIdMonthly: vine.string().optional(),
    stripePriceIdYearly: vine.string().optional(),
    stripeProductId: vine.string().optional().nullable(),
    features: vine.array(vine.string()).optional().nullable(),
    isActive: vine.boolean().optional(),
    isRecommended: vine.boolean().optional(),
  }),
)
