import { randomUUID } from 'node:crypto'
import type { HttpContext } from '@adonisjs/core/http'
import emitter from '@adonisjs/core/services/emitter'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'
import { appUrl } from '#emails/global'
import PasswordReset from '#models/password_reset'
import Plan from '#models/plan'
import User from '#models/user'
import { generateShortId } from '#services/app.functions'
import sessionService from '#services/session_service'
import stripeService from '#services/stripe_service'
import workspaceService from '#services/workspace_service'
import env from '#start/env'
import {
  createUserValidator,
  forgotPasswordValidator,
  loginValidator,
  resetPasswordValidator,
} from '#validators/auth'

export default class AuthController {
  async signUp({ request, response, logger, auth }: HttpContext) {
    const trx = await db.transaction()
    try {
      const { confirmPassword, planId, frequency, organizationName, ...body } =
        await request.validateUsing(createUserValidator)

      const findUser = await User.query({ client: trx }).where({ email: body.email }).first()

      if (findUser) {
        await trx.rollback()
        return response.conflict({ error: 'User already exists' })
      }

      // Create email verification token
      const token = generateShortId(32)
      const user = await User.create({ ...body, token }, { client: trx })

      await trx.commit()

      logger.info(`User created: ${body.fullName}`)
      emitter.emit('user:created', { user, token })

      // Log the user in so they are authenticated when they return from Stripe
      if (planId && frequency) {
        await auth.use('web').login(user)
      }

      const workspace = await workspaceService.createWorkspace({
        name: organizationName,
        userId: user.id,
      })

      // Handle subscription if planId is present
      if (planId && frequency) {
        const plan = await Plan.findOrFail(planId)

        const customer = await stripeService.createCustomer({
          email: user.email,
          name: user.fullName || workspace.name,
          metadata: {
            workspaceId: workspace.id,
          },
        })

        await workspace.merge({ stripeCustomerId: customer.id }).save()

        const priceId = (
          frequency === 'yearly' ? plan.stripePriceIdYearly : plan.stripePriceIdMonthly
        ) as string

        if (!priceId) {
          throw new Error('Price ID not found for plan')
        }

        const successUrl = `${env.get('APP_URL')}/billing?success=true&session_id={CHECKOUT_SESSION_ID}`
        const cancelUrl = `${env.get('APP_URL')}/billing?canceled=true`

        const checkoutSession = await stripeService.createCheckoutSession({
          customerId: customer.id,
          priceId: priceId,
          successUrl,
          cancelUrl,
          clientReferenceId: workspace.id,
          metadata: {
            workspaceId: workspace.id,
            planId: plan.id,
            interval: frequency,
          },
        })

        if (checkoutSession.url) {
          // Automatically log the user in
          await auth.use('web').login(user)

          return response.created({
            message: 'User created successfully. Redirecting to checkout...',
            checkoutUrl: checkoutSession.url,
          })
        }
      }

      return response.created({
        message: 'User created successfully. Please check your email to verify your account.',
      })
    } catch (e) {
      await trx.rollback()
      logger.error(e)
      throw e
    }
  }

  async login({ request, response, auth, session }: HttpContext) {
    const { email, password, remember } = await request.validateUsing(loginValidator)
    const now = DateTime.now()

    const user = await User.verifyCredentials(email, password)

    if (user.status === 'inactive') {
      return response.forbidden({ error: 'This account is inactive.' })
    }

    await auth.use('web').login(user, remember)
    await user.merge({ lastLoginAt: now }).save()
    // Create or update session
    const deviceSessionId = randomUUID()
    session.put('deviceSessionId', deviceSessionId)

    await sessionService.createOrUpdateSession({
      deviceSessionId,
      userId: user.id,
      ipAddress: request.ip(),
      userAgent: request.header('user-agent') || null,
      lastActivity: now,
    })

    if (user.mustChangePassword) {
      session.flash('mustChangePassword', true)
      return response.ok({
        message: 'Login successful. Please update your password.',
        data: {
          user,
          mustChangePassword: true,
          redirectTo: '/settings?tab=password',
        },
      })
    }

    return response.ok({
      message: 'Login successful',
      data: {
        user,
        redirectTo: user.role === 'admin' ? '/admin' : '/dashboard',
      },
    })
  }

  /**
   * Web login (Inertia form POST). Same as login but redirects in one response
   * so the session cookie is set before any follow-up request — avoids double login.
   */
  async loginWeb({ request, response, auth, session }: HttpContext) {
    try {
      const { email, password, remember, referrer } = await request.validateUsing(loginValidator)
      const now = DateTime.now()
      const user = await User.verifyCredentials(email, password)

      if (user.status === 'inactive') {
        session.flash('error', { message: 'This account is inactive.' })
        return response.redirect().status(303).toPath('/login')
      }

      await auth.use('web').login(user, remember)
      await user.merge({ lastLoginAt: now }).save()

      const deviceSessionId = randomUUID()
      session.put('deviceSessionId', deviceSessionId)
      await sessionService.createOrUpdateSession({
        deviceSessionId,
        userId: user.id,
        ipAddress: request.ip(),
        userAgent: request.header('user-agent') || null,
        lastActivity: now,
      })

      if (user.mustChangePassword) {
        session.flash('mustChangePassword', true)
        return response.redirect().status(303).toPath('/settings?tab=password')
      }

      const redirectTo =
        referrer?.startsWith('/') && !referrer.startsWith('//')
          ? referrer
          : user.role === 'admin'
            ? '/admin'
            : '/dashboard'
      return response.redirect().status(303).toPath(redirectTo)
    } catch {
      response.badRequest({ error: 'Invalid email or password.' })
    }
  }

  async logout({ auth, response, session }: HttpContext) {
    const user = auth.user
    const deviceSessionId = session.get('deviceSessionId') as string | undefined
    if (user && deviceSessionId) {
      await sessionService.revokeSession(deviceSessionId, user.id)
    }
    session.forget('deviceSessionId')
    await auth.use('web').logout()

    return response.redirect('/')
  }

  async stopImpersonating({ session, auth, response }: HttpContext) {
    const originalUserId = session.get('impersonatingFromUserId')
    if (!originalUserId) {
      return response.redirect('/dashboard')
    }

    const originalUser = await User.find(originalUserId)
    if (!originalUser) {
      // Fallback: clear session and logout
      session.forget('impersonatingFromUserId')
      await auth.use('web').logout()
      return response.redirect('/login')
    }

    await auth.use('web').login(originalUser)
    session.forget('impersonatingFromUserId')
    session.forget('deviceSessionId')
    session.forget('currentWorkspaceId')

    return response.redirect('/admin/users')
  }

  async forgotPassword({ request, response, logger, mailer }: HttpContext) {
    const { email } = await request.validateUsing(forgotPasswordValidator)
    const token = generateShortId(20) // Generate a unique token
    const expiresAt = DateTime.now().plus({ hours: 1 }) // Set the expiration date to 1 hour from now
    const user = await User.findBy('email', email)

    if (!user) {
      return response.badRequest({ error: "There's no account with this email" })
    }

    // Save the token to the password_resets table
    await PasswordReset.create({
      userId: user?.id,
      email,
      token,
      expiresAt,
    })

    // Send an email to the user with a link to reset their password
    try {
      await mailer.send('forgot-password', {
        email: user.email,
        fullName: user.fullName || 'User',
        token,
      })

      return response.ok({ message: 'Password reset email sent.' })
    } catch (error) {
      logger.error('Error sending password reset email', error)
      return response.internalServerError({
        error: 'Error sending password reset email',
      })
    }
  }

  async resetPassword(ctx: HttpContext) {
    const { request, response } = ctx
    const { newPassword, token } = await request.validateUsing(resetPasswordValidator)
    const resetRequest = await PasswordReset.findBy('token', token)

    if (!resetRequest) {
      return response.badRequest({
        error:
          'The reset token provided is invalid or has expired. Request another password reset.',
      })
    }
    const now = DateTime.now()
    const expiresAt = resetRequest.expiresAt
    if (!expiresAt || expiresAt.toMillis() < now.toMillis()) {
      return response.badRequest({
        error: 'Token has expired. Request another password reset',
      })
    }

    const user = await User.findOrFail(resetRequest.userId)
    user.password = newPassword
    await user.save()
    await resetRequest.delete()

    try {
      await ctx.mailer.send('reset-password', {
        email: user.email,
        fullName: user.fullName || 'user',
      })
    } catch {
      // Email is best-effort; password was already updated
    }

    return response.ok({
      message: 'Password reset successful. We will log you out of all previous sessions',
    })
  }

  async verifyEmail({ request, response, now, logger }: HttpContext) {
    const token = request.qs().token
    logger.info(`Verifying email with token: ${token}`)

    if (!token) {
      logger.warn('Email verification attempted without token')
      return response.badRequest({ error: 'Verification token is required' })
    }

    const user = await User.findByOrFail('token', token)
    logger.info('User found', { userId: user.id, email: user.email })

    if (user.emailVerified) {
      logger.info('Email verification attempted for already verified user', { userId: user.id })
      return response.badRequest({ error: 'Email is already verified.' })
    }

    await user.merge({ emailVerified: true, emailVerifiedAt: now, token: null }).save()

    logger.info('Email verified successfully', { userId: user.id, email: user.email })

    return response.ok({ message: 'Email verified successfully' })
  }

  async resendVerificationEmail({ auth, response, logger, mailer }: HttpContext) {
    const user = auth.getUserOrFail()

    if (user.emailVerified) {
      return response.badRequest({ error: 'Email is already verified' })
    }

    // Generate new verification token
    const token = generateShortId(32)
    await user.merge({ token }).save()

    try {
      const verificationUrl = `${appUrl}/verify-email?token=${token}`
      await mailer.send('verify-email', {
        email: user.email,
        fullName: user.fullName || 'User',
        url: verificationUrl,
      })

      return response.ok({ message: 'Verification email sent successfully' })
    } catch (error) {
      logger.error('Error sending verification email', error)
      return response.internalServerError({
        error: 'Error sending verification email',
      })
    }
  }

  async verifyEmailChange({ request, response, logger }: HttpContext) {
    const token = request.qs().token
    logger.info(`Verifying email change with token: ${token}`)

    if (!token) {
      logger.warn('Email change verification attempted without token')
      return response.badRequest({ error: 'Verification token is required' })
    }

    const user = await User.findByOrFail('emailChangeToken', token)
    logger.info('User found for email change', { userId: user.id, pendingEmail: user.pendingEmail })

    if (!user.pendingEmail) {
      logger.warn('Email change verification attempted but no pending email', { userId: user.id })
      return response.badRequest({ error: 'No pending email change found.' })
    }

    // Check if the pending email is already taken by another user
    const existingUser = await User.findBy('email', user.pendingEmail)
    if (existingUser && existingUser.id !== user.id) {
      return response.conflict({ error: 'This email address is already in use.' })
    }

    // Update email and clear pending fields
    await user
      .merge({
        email: user.pendingEmail,
        pendingEmail: null,
        emailChangeToken: null,
        // Email remains verified since the user already verified their original email
      })
      .save()

    logger.info('Email change verified successfully', {
      userId: user.id,
      oldEmail: user.email,
      newEmail: user.pendingEmail,
    })

    return response.ok({ message: 'Email address changed successfully' })
  }
}
