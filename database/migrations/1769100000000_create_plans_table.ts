import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'plans'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.string('id').defaultTo(this.raw('nanoid()')).primary().unique().notNullable()
      table.string('name').notNullable()
      table.string('description').nullable()
      table.decimal('price_monthly', 10, 2).notNullable()
      table.decimal('price_yearly', 10, 2).notNullable() // 20% discount logic will be handled when seeding/creating
      table.string('stripe_price_id_monthly').nullable()
      table.string('stripe_price_id_yearly').nullable()
      table.string('stripe_product_id').nullable()
      table.json('features').nullable() // Array of feature strings
      table.boolean('is_active').defaultTo(true)

      // Added from later migrations
      table.enum('currency', ['usd', 'gbp', 'eur']).defaultTo('usd').notNullable()
      table.boolean('is_recommended').defaultTo(false)

      table.timestamp('created_at')
      table.timestamp('updated_at')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
