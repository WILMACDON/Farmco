import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.alterTable('users', (table) => {
      table.enum('status', ['active', 'inactive']).notNullable().defaultTo('active')
      table.boolean('must_change_password').notNullable().defaultTo(false)
      table
        .string('created_by_user_id')
        .nullable()
        .references('id')
        .inTable('users')
        .onDelete('SET NULL')
    })

    this.schema.alterTable('workspaces', (table) => {
      table.integer('eggs_per_crate').notNullable().defaultTo(30)
      table.decimal('low_feed_threshold', 10, 2).notNullable().defaultTo(5)
    })
  }

  async down() {
    this.schema.alterTable('users', (table) => {
      table.dropColumn('status')
      table.dropColumn('must_change_password')
      table.dropColumn('created_by_user_id')
    })

    this.schema.alterTable('workspaces', (table) => {
      table.dropColumn('eggs_per_crate')
      table.dropColumn('low_feed_threshold')
    })
  }
}
