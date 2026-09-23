import { belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import type { DateTime } from 'luxon'
import type { BirdHealth, BirdProduction } from './bird_stock.js'
import SuperBaseModel from './super_base.js'
import User from './user.js'
import Workspace from './workspace.js'

export type BirdRecordDirection = 'add' | 'remove' | 'move'

export default class BirdRecord extends SuperBaseModel {
  static table = 'bird_records'

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare workspaceId: string

  @column()
  declare userId: string

  @column()
  declare direction: BirdRecordDirection

  @column()
  declare health: BirdHealth | null

  @column()
  declare production: BirdProduction

  @column()
  declare toHealth: BirdHealth | null

  @column()
  declare toProduction: BirdProduction | null

  @column()
  declare quantity: number

  @column()
  declare reason: string | null

  @column()
  declare note: string | null

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
}
