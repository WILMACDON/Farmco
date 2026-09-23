import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'audits'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.string('id').defaultTo(this.raw('nanoid()')).primary().unique().notNullable()

      table.text('user_type').nullable()
      table.string('user_id').nullable()

      table.text('event').notNullable()

      table.text('auditable_type').notNullable()
      table.string('auditable_id').notNullable()

      table.jsonb('old_values').nullable()
      table.jsonb('new_values').nullable()

      table.jsonb('metadata').nullable()

      table.timestamp('created_at')
      table.timestamp('updated_at')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
