import type { HttpContext } from '@adonisjs/core/http'
import logger from '@adonisjs/core/services/logger'
import DevEmailStore from '#services/dev_email_store'
import env from '#start/env'

/**
 * Controller for viewing cached emails in development.
 */
export default class DevEmailsController {
  /**
   * Development-only Inertia inbox page.
   */
  public async page({ inertia, response }: HttpContext) {
    if (env.get('NODE_ENV') !== 'development') {
      return response.notFound()
    }

    return inertia.render('dev/emails')
  }

  /**
   * List all cached emails
   */
  public async index({ response }: HttpContext) {
    if (env.get('NODE_ENV') !== 'development') {
      return response.forbidden({ error: 'This endpoint is only available in development' })
    }

    try {
      const emails = await DevEmailStore.list()

      return response.ok({
        total: emails.length,
        emails: emails.map((email) => ({
          id: email.id,
          type: email.type,
          subject: email.logInfo?.subject || (email.data?.subject as string | undefined),
          to: email.logInfo?.to || (email.data?.email as string | undefined),
          timestamp: email.createdAt,
          failed: email.failed || false,
        })),
      })
    } catch (error) {
      logger.error('Error retrieving cached emails:', error)
      return response.internalServerError({ error: 'Failed to retrieve emails' })
    }
  }

  /**
   * Get a specific email by ID.
   */
  public async show({ params, response }: HttpContext) {
    if (env.get('NODE_ENV') !== 'development') {
      return response.forbidden({ error: 'This endpoint is only available in development' })
    }

    try {
      const { id } = params
      const email = await DevEmailStore.get(id)

      if (!email) {
        return response.notFound({ error: 'Email not found' })
      }

      const rawData = email.data ?? {}
      const logInfo = email.logInfo ?? {}

      const body =
        typeof email.renderedHtml === 'string'
          ? email.renderedHtml
          : typeof rawData.body === 'string'
            ? rawData.body
            : undefined

      const data: Record<string, unknown> = {
        ...rawData,
        subject: rawData.subject ?? logInfo.subject,
        email: rawData.email ?? logInfo.to,
        body,
      }

      return response.ok({
        id: email.id,
        type: email.type,
        data,
        logInfo: {
          type: logInfo.type,
          from: logInfo.from,
          replyTo: logInfo.replyTo,
          to: logInfo.to,
          subject: logInfo.subject,
        },
        timestamp: email.timestamp ?? email.createdAt,
        createdAt: email.createdAt,
        ...(email.failed === true && { failed: true }),
        ...(typeof email.error === 'string' && { error: email.error }),
      })
    } catch (error) {
      logger.error('Error retrieving email:', error)
      return response.internalServerError({ error: 'Failed to retrieve email' })
    }
  }

  /**
   * Clear all cached emails
   */
  public async destroy({ response }: HttpContext) {
    if (env.get('NODE_ENV') !== 'development') {
      return response.forbidden({ error: 'This endpoint is only available in development' })
    }

    try {
      const cleared = await DevEmailStore.clear()
      logger.info('All cached emails cleared')
      return response.ok({ message: `Cleared ${cleared} emails` })
    } catch (error) {
      logger.error('Error clearing cached emails:', error)
      return response.internalServerError({ error: 'Failed to clear emails' })
    }
  }
}
