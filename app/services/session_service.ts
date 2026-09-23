import type { DateTime as DateTimeType } from 'luxon'
import { DateTime } from 'luxon'
import SessionDevice from '#models/session_device'
import { parseUserAgent } from '#utils/user_agent_parser'

export interface CreateSessionOptions {
  deviceSessionId?: string
  userId: string
  ipAddress: string | null
  userAgent: string | null
  lastActivity: DateTimeType
}

export interface UpdateActivityOptions {
  userId: string
  ipAddress: string | null
  userAgent: string | null
}

export class SessionService {
  /**
   * Create or update a session for a user on login
   */
  async createOrUpdateSession(options: CreateSessionOptions): Promise<SessionDevice> {
    const { deviceSessionId, userId, ipAddress, userAgent, lastActivity } = options
    const { browser, os, deviceType } = parseUserAgent(userAgent)

    if (deviceSessionId) {
      const existingById = await SessionDevice.query()
        .where('id', deviceSessionId)
        .where('user_id', userId)
        .first()

      if (existingById) {
        existingById.merge({
          lastActivity,
          ipAddress,
          userAgent,
          browser,
          os,
          deviceType,
        })
        await existingById.save()
        return existingById
      }

      const created = await SessionDevice.create({
        id: deviceSessionId,
        userId,
        ipAddress,
        userAgent,
        browser,
        os,
        deviceType,
        isCurrent: false,
        lastActivity,
      })

      return created
    }

    // Fallback: Find existing session with same IP + user agent (legacy behavior)
    const query = SessionDevice.query().where('user_id', userId)

    if (ipAddress) query.where('ip_address', ipAddress)
    else query.whereNull('ip_address')

    if (userAgent) query.where('user_agent', userAgent)
    else query.whereNull('user_agent')

    const existingSession = await query.first()
    if (existingSession) {
      existingSession.merge({ lastActivity, ipAddress, userAgent, browser, os, deviceType })
      await existingSession.save()
      return existingSession
    }

    return await SessionDevice.create({
      userId,
      ipAddress,
      userAgent,
      browser,
      os,
      deviceType,
      isCurrent: false,
      lastActivity,
    })
  }

  /**
   * Update the last activity timestamp for a session by id
   */
  async updateActivityById(sessionId: string, userId: string): Promise<void> {
    const session = await SessionDevice.query()
      .where('id', sessionId)
      .where('user_id', userId)
      .first()

    if (!session) return
    session.lastActivity = DateTime.now()
    await session.save()
  }

  async sessionExists(sessionId: string, userId: string): Promise<boolean> {
    const row = await SessionDevice.query().where('id', sessionId).where('user_id', userId).first()
    return Boolean(row)
  }

  /**
   * Update the last activity timestamp for the current session (legacy)
   */
  async updateActivity(options: UpdateActivityOptions): Promise<void> {
    const { userId, ipAddress, userAgent } = options

    const query = SessionDevice.query().where('user_id', userId).where('is_current', true)

    if (ipAddress) query.where('ip_address', ipAddress)
    else query.whereNull('ip_address')

    if (userAgent) query.where('user_agent', userAgent)
    else query.whereNull('user_agent')

    const session = await query.first()
    if (!session) return

    session.lastActivity = DateTime.now()
    await session.save()
  }

  /**
   * Get all sessions for a user
   */
  async getUserSessions(userId: string): Promise<SessionDevice[]> {
    return SessionDevice.query()
      .where('user_id', userId)
      .orderBy('last_activity', 'desc')
      .orderBy('created_at', 'desc')
  }

  /**
   * Revoke a specific session
   */
  async revokeSession(sessionId: string, userId: string): Promise<void> {
    const session = await SessionDevice.query()
      .where('id', sessionId)
      .where('user_id', userId)
      .firstOrFail()

    await session.delete()
  }

  /**
   * Revoke all sessions except the current one
   */
  async revokeAllSessionsExcept(userId: string, keepSessionId: string): Promise<number> {
    const result = await SessionDevice.query()
      .where('user_id', userId)
      .whereNot('id', keepSessionId)
      .delete()

    return result[0] || 0
  }

  /**
   * Revoke all sessions including the current one
   */
  async revokeAllSessionsIncludingCurrent(userId: string): Promise<number> {
    const result = await SessionDevice.query().where('user_id', userId).delete()
    return result[0] || 0
  }

  /**
   * Get the current session for a user
   */
  async getCurrentSession(userId: string): Promise<SessionDevice | null> {
    return SessionDevice.query().where('user_id', userId).where('is_current', true).first()
  }

  /**
   * Clean up expired sessions (older than specified days)
   */
  async cleanupExpiredSessions(daysOld: number = 30): Promise<number> {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - daysOld)

    const result = await SessionDevice.query()
      .where('last_activity', '<', cutoffDate.toISOString())
      .where('is_current', false)
      .delete()

    return result[0] || 0
  }
}

const sessionService = new SessionService()

export default sessionService
