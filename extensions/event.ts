import type { Emails } from '@adonisjs/core/types'
import type User from '#models/user'

interface EmailEventLogInfo {
  type: keyof Emails
  from: string
  replyTo: string
  to?: string
  subject?: string
}

interface EmailSentPayload {
  type: keyof Emails
  data: Emails[keyof Emails]
  timestamp: string
  logInfo: EmailEventLogInfo
  /** Rendered HTML body for dev email viewer (development only) */
  renderedHtml?: string
}

interface EmailFailedPayload extends EmailSentPayload {
  error: string
}

declare module '@adonisjs/core/types' {
  interface EventsList {
    'user:created': {
      user: User
      token: string
    }
    'user:deleted': {
      user: User
    }
    'email:sent': EmailSentPayload
    'email:failed': EmailFailedPayload
  }
}
