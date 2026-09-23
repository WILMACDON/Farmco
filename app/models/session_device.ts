import { belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import type { DateTime } from 'luxon'
import SuperBaseModel from './super_base.js'
import User from './user.js'

export default class SessionDevice extends SuperBaseModel {
  static table = 'session_devices'

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare userId: string

  @column()
  declare ipAddress: string | null

  @column()
  declare userAgent: string | null

  @column()
  declare deviceType: string | null

  @column()
  declare browser: string | null

  @column()
  declare os: string | null

  @column()
  declare location: string | null

  @column()
  declare isCurrent: boolean

  @column.dateTime()
  declare lastActivity: DateTime

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null

  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>
}
