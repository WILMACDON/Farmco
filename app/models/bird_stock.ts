import { belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import type { DateTime } from 'luxon'
import SuperBaseModel from './super_base.js'
import Workspace from './workspace.js'

export type BirdHealth = 'well' | 'sick'
export type BirdProduction = 'laying' | 'non_laying' | 'chick'

export default class BirdStock extends SuperBaseModel {
  static table = 'bird_stocks'

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare workspaceId: string

  @column()
  declare health: BirdHealth | null

  @column()
  declare production: BirdProduction

  @column()
  declare bucketKey: string

  @column()
  declare count: number

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null

  @belongsTo(() => Workspace)
  declare workspace: BelongsTo<typeof Workspace>
}
