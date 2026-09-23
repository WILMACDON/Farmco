import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'session_devices'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.string('id').defaultTo(this.raw('nanoid()')).primary().unique().notNullable()
      table
        .string('user_id')
        .notNullable()
        .index()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE')

      table.string('ip_address', 45).nullable()
      table.text('user_agent').nullable()
      table.string('device_type').nullable()
      table.string('browser').nullable()
      table.string('os').nullable()
      table.string('location').nullable()

      table.boolean('is_current').defaultTo(false)

      table.timestamp('last_activity').notNullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
