import { render } from '@react-email/components'

import mailer from '#services/email_service'
import env from '#start/env'

const NO_REPLY_EMAIL = env.get('NO_REPLY_EMAIL', 'noreply@farmco.app')
const FROM_EMAIL = env.get('FROM_EMAIL', 'hello@farmco.app')

mailer.on({
  type: 'simple-send',
  handler: async (message, data) => {
    const { email, subject, replyTo, from } = data
    const SimpleSend = await import('#emails/simple-send').then((m) => m.default)
    const html = await render(SimpleSend(data))
    message
      .from(from ?? '')
      .subject(subject)
      .to(email)
      .html(html)
      .replyTo(replyTo ?? '')
    return { html }
  },
})

mailer.on({
  type: 'verify-email',
  handler: async (message, data) => {
    const VerifyEmail = await import('#emails/verify-email').then((m) => m.default)
    const html = await render(VerifyEmail(data))

    message
      .from(NO_REPLY_EMAIL)
      .subject('Verify Your Email Address')
      .to(data.email)
      .html(html)
      .replyTo(FROM_EMAIL)
    return { html }
  },
})

mailer.on({
  type: 'forgot-password',
  handler: async (message, data) => {
    const ForgotPassword = await import('#emails/forgot-password').then((m) => m.default)
    const html = await render(ForgotPassword(data))
    message
      .from(NO_REPLY_EMAIL)
      .subject('Reset Your Password')
      .to(data.email)
      .html(html)
      .replyTo(FROM_EMAIL)
    return { html }
  },
})

mailer.on({
  type: 'reset-password',
  handler: async (message, data) => {
    const ResetPassword = await import('#emails/reset-password').then((m) => m.default)
    const html = await render(ResetPassword(data))
    message
      .from(NO_REPLY_EMAIL)
      .subject('Password Reset Successful')
      .to(data.email)
      .html(html)
      .replyTo(FROM_EMAIL)
    return { html }
  },
})

mailer.on({
  type: 'verify-email-change',
  handler: async (message, data) => {
    const VerifyEmailChange = await import('#emails/verify-email-change').then((m) => m.default)
    const html = await render(VerifyEmailChange(data))

    message
      .from(NO_REPLY_EMAIL)
      .subject('Confirm Your New Email Address')
      .to(data.email)
      .html(html)
      .replyTo(FROM_EMAIL)
    return { html }
  },
})

mailer.on({
  type: 'welcome',
  handler: async (message, data) => {
    const Welcome = await import('#emails/welcome').then((m) => m.default)
    const html = await render(Welcome(data))
    message
      .from(NO_REPLY_EMAIL)
      .subject('Welcome to Farmco')
      .to(data.email)
      .html(html)
      .replyTo(FROM_EMAIL)
    return { html }
  },
})

mailer.on({
  type: 'contact-form',
  handler: async (message, data) => {
    const ContactForm = await import('#emails/contact-form').then((m) => m.default)
    const html = await render(ContactForm(data))
    message
      .from(NO_REPLY_EMAIL)
      .subject(`Contact Form: ${data.subject}`)
      .to(FROM_EMAIL)
      .html(html)
      .replyTo(data.email)
    return { html }
  },
})

mailer.on({
  type: 'goodbye',
  handler: async (message, data) => {
    const Goodbye = await import('#emails/goodbye').then((m) => m.default)
    const html = await render(Goodbye(data))
    message
      .from(NO_REPLY_EMAIL)
      .subject("We're Sorry to See You Go")
      .to(data.email)
      .html(html)
      .replyTo(FROM_EMAIL)
    return { html }
  },
})

mailer.on({
  type: 'password-changed',
  handler: async (message, data) => {
    const PasswordChanged = await import('#emails/password-changed').then((m) => m.default)
    const html = await render(PasswordChanged(data))
    message
      .from(NO_REPLY_EMAIL)
      .subject('Password Changed Successfully')
      .to(data.email)
      .html(html)
      .replyTo(FROM_EMAIL)
    return { html }
  },
})

mailer.on({
  type: 'workspace-invite',
  handler: async (message, data) => {
    const WorkspaceInvite = await import('#emails/workspace-invite').then((m) => m.default)
    const html = await render(WorkspaceInvite(data))
    message
      .from(NO_REPLY_EMAIL)
      .subject(`You've been invited to join ${data.workspaceName}`)
      .to(data.email)
      .html(html)
      .replyTo(FROM_EMAIL)
    return { html }
  },
})

mailer.on({
  type: 'workspace-joined',
  handler: async (message, data) => {
    const WorkspaceJoined = await import('#emails/workspace-joined').then((m) => m.default)
    const html = await render(WorkspaceJoined(data))
    message
      .from(NO_REPLY_EMAIL)
      .subject(`${data.joinedUserName} joined ${data.workspaceName}`)
      .to(data.email)
      .html(html)
      .replyTo(FROM_EMAIL)
    return { html }
  },
})
