import { belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import type { DateTime } from 'luxon'
import type { EggSize } from './egg_stock.js'
import FarmOrder from './farm_order.js'
import SuperBaseModel from './super_base.js'
import User from './user.js'
import Workspace from './workspace.js'

export type EggRecordDirection = 'add' | 'remove'

export default class EggRecord extends SuperBaseModel {
  static table = 'egg_records'

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare workspaceId: string

  @column()
  declare userId: string

  @column()
  declare size: EggSize

  @column()
  declare direction: EggRecordDirection

  @column()
  declare quantityEggs: number

  @column()
  declare reason: string | null

  @column()
  declare note: string | null

  @column()
  declare orderId: string | null

  @column()
  declare clientEntryId: string | null

  @column()
  declare needsReview: boolean

  @column.dateTime()
  declare recordedAt: DateTime

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null

  @belongsTo(() => Workspace)
  declare workspace: BelongsTo<typeof Workspace>

  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>

  @belongsTo(() => FarmOrder, { foreignKey: 'orderId' })
  declare order: BelongsTo<typeof FarmOrder>
}
