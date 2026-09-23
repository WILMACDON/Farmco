import { belongsTo, column, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import type { DateTime } from 'luxon'
import OrderItem from './order_item.js'
import SuperBaseModel from './super_base.js'
import User from './user.js'
import Workspace from './workspace.js'

export type FarmOrderStatus = 'pending' | 'approved' | 'sold' | 'cancelled'

export default class FarmOrder extends SuperBaseModel {
  static table = 'orders'

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare workspaceId: string

  @column()
  declare customerName: string

  @column()
  declare contact: string | null

  @column()
  declare status: FarmOrderStatus

  @column()
  declare createdBy: string

  @column()
  declare approvedBy: string | null

  @column.dateTime()
  declare orderDate: DateTime

  @column.dateTime()
  declare deliveryDate: DateTime | null

  @column.dateTime()
  declare soldAt: DateTime | null

  @column()
  declare clientEntryId: string | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null

  @belongsTo(() => Workspace)
  declare workspace: BelongsTo<typeof Workspace>

  @belongsTo(() => User, { foreignKey: 'createdBy' })
  declare creator: BelongsTo<typeof User>

  @belongsTo(() => User, { foreignKey: 'approvedBy' })
  declare approver: BelongsTo<typeof User>

  @hasMany(() => OrderItem, { foreignKey: 'orderId' })
  declare items: HasMany<typeof OrderItem>
}
