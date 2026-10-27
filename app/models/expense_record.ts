import { belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import type { DateTime } from 'luxon'
import SuperBaseModel from './super_base.js'
import User from './user.js'
import Workspace from './workspace.js'

export const EXPENSE_CATEGORIES = [
  'feed',
  'medication',
  'labour',
  'transport',
  'utilities',
  'equipment',
  'housing',
  'packaging',
  'marketing',
  'other',
] as const

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number]

export default class ExpenseRecord extends SuperBaseModel {
  static table = 'expense_records'

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare workspaceId: string

  @column()
  declare userId: string

  @column()
  declare category: ExpenseCategory

  @column()
  declare customType: string | null

  @column()
  declare amount: number

  @column()
  declare note: string | null

  @column()
  declare clientEntryId: string | null

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
