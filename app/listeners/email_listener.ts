import logger from '@adonisjs/core/services/logger'
import type { EventsList } from '@adonisjs/core/types'
import DevEmailStore from '#services/dev_email_store'
import env from '#start/env'

/**
 * Captures sent/failed emails in Redis for the development inbox.
 */
export default class EmailListener {
  public async handleEmailSent(emailData: EventsList['email:sent']) {
    if (env.get('NODE_ENV') !== 'development') return

    try {
      const timestamp = Date.now()
      const emailId = `email_${timestamp}_${Math.random().toString(36).substring(2, 9)}`

      await DevEmailStore.save({
        id: emailId,
        type: String(emailData.type),
        data: emailData.data as Record<string, unknown>,
        logInfo: emailData.logInfo,
        timestamp: emailData.timestamp,
        createdAt: emailData.timestamp,
        ...(emailData.renderedHtml && { renderedHtml: emailData.renderedHtml }),
      })

      logger.debug(`Email saved to cache: ${emailId}`, {
        type: emailData.type,
        to: emailData.logInfo?.to,
      })
    } catch (error) {
      logger.error('Failed to save email to cache:', error)
    }
  }

  public async handleEmailFailed(emailData: EventsList['email:failed']) {
    if (env.get('NODE_ENV') !== 'development') return

    try {
      const timestamp = Date.now()
      const emailId = `failed_email_${timestamp}_${Math.random().toString(36).substring(2, 9)}`

      await DevEmailStore.save({
        id: emailId,
        type: String(emailData.type),
        data: emailData.data as Record<string, unknown>,
        logInfo: emailData.logInfo,
        timestamp: emailData.timestamp,
        createdAt: emailData.timestamp,
        failed: true,
        error: emailData.error,
        ...(emailData.renderedHtml && { renderedHtml: emailData.renderedHtml }),
      })

      logger.debug(`Failed email saved to cache: ${emailId}`, {
        type: emailData.type,
        error: emailData.error,
      })
    } catch (error) {
      logger.error('Failed to save failed email to cache:', error)
    }
  }
}
