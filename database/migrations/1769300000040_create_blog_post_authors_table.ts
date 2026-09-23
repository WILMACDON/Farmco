import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'blog_post_authors'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.string('id').defaultTo(this.raw('nanoid()')).primary().unique().notNullable()

      table
        .string('blog_post_id')
        .references('id')
        .inTable('blog_posts')
        .onDelete('CASCADE')
        .index()
      table
        .string('blog_author_id')
        .references('id')
        .inTable('blog_authors')
        .onDelete('CASCADE')
        .index()

      table.timestamp('created_at')
      table.timestamp('updated_at')

      table.unique(['blog_post_id', 'blog_author_id'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
