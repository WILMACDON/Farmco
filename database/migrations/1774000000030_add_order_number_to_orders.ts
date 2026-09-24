import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'orders'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.integer('order_number').unsigned().nullable()
    })

    this.defer(async (db) => {
      await db.rawQuery(`
        WITH numbered AS (
          SELECT
            id,
            ROW_NUMBER() OVER (
              PARTITION BY workspace_id
              ORDER BY created_at ASC, id ASC
            )::int AS rn
          FROM orders
        )
        UPDATE orders
        SET order_number = numbered.rn
        FROM numbered
        WHERE orders.id = numbered.id
      `)
    })

    this.schema.alterTable(this.tableName, (table) => {
      table.integer('order_number').unsigned().notNullable().alter()
      table.unique(['workspace_id', 'order_number'])
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropUnique(['workspace_id', 'order_number'])
      table.dropColumn('order_number')
    })
  }
}
