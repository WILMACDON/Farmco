import { belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import type { DateTime } from 'luxon'
import type { EggSize } from './egg_stock.js'
import FarmOrder from './farm_order.js'
import SuperBaseModel from './super_base.js'

export default class OrderItem extends SuperBaseModel {
  static table = 'order_items'

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare orderId: string

  @column()
  declare size: EggSize

  @column()
  declare crates: number

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null

  @belongsTo(() => FarmOrder, { foreignKey: 'orderId' })
  declare order: BelongsTo<typeof FarmOrder>
}
