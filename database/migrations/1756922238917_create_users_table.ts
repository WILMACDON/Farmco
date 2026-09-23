import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'users'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.string('id').defaultTo(this.raw('nanoid()')).primary().unique().notNullable()
      table.string('full_name').nullable()
      table.string('email').notNullable().unique()
      table.string('password').nullable()
      table.string('role').notNullable().defaultTo('normal_user')
      table.json('avatar').nullable()
      table.json('google_data').nullable()
      table.enum('provider', ['local', 'google', 'github']).defaultTo('local').notNullable()
      table.string('token').nullable()
      table.string('pending_email').nullable()
      table.string('email_change_token', 32).nullable()
      table.json('settings').nullable()
      table.timestamp('last_login_at')
      table.boolean('email_verified').defaultTo(false).notNullable()
      table.dateTime('email_verified_at').nullable()
      table.boolean('two_factor_enabled').defaultTo(false)
      table.string('two_factor_secret').nullable()
      table.string('two_factor_recovery_codes', 1000).nullable()
      table.timestamp('created_at')
      table.timestamp('updated_at')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
