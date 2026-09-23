import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'blog_post_tags'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.string('id').defaultTo(this.raw('nanoid()')).primary().unique().notNullable()

      table.string('blog_post_id').notNullable().index()
      table.string('blog_tag_id').notNullable().index()

      table.timestamp('created_at')
      table.timestamp('updated_at')

      table.unique(['blog_post_id', 'blog_tag_id'])
      table.foreign('blog_post_id').references('id').inTable('blog_posts').onDelete('CASCADE')
      table.foreign('blog_tag_id').references('id').inTable('blog_tags').onDelete('CASCADE')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
