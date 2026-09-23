import { compose } from '@adonisjs/core/helpers'
import { column } from '@adonisjs/lucid/orm'
import { Auditable } from '@stouder-io/adonis-auditing'
import type { DateTime } from 'luxon'
import SuperBaseModel from './super_base.js'

export default class Plan extends compose(SuperBaseModel, Auditable) {
  @column({ isPrimary: true })
  declare id: string

  @column()
  declare name: string

  @column()
  declare description: string | null

  @column()
  declare priceMonthly: number

  @column()
  declare priceYearly: number

  @column()
  declare currency: 'usd' | 'gbp' | 'eur'

  @column()
  declare stripePriceIdMonthly: string

  @column()
  declare stripePriceIdYearly: string

  @column()
  declare stripeProductId: string | null

  @column({
    prepare: (value: string[]) => JSON.stringify(value),
    // consume: (value: string) => JSON.parse(value),
  })
  declare features: string[] | null

  @column()
  declare isActive: boolean

  @column()
  declare isRecommended: boolean

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null
}
