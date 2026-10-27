import app from '@adonisjs/core/services/app'
import { defineConfig, transports } from '@adonisjs/mail'
import env from '#start/env'

const mailConfig = defineConfig({
  default: app.inProduction ? 'resend' : 'smtp',
  from: env.get('FROM_EMAIL'),
  replyTo: env.get('REPLY_TO_EMAIL'),

  /**
   * The mailers object can be used to configure multiple mailers
   * each using a different transport or same transport with different
   * options.
   */
  mailers: {
    resend: transports.resend({
      key: env.get('RESEND_API_KEY') ?? '',
      baseUrl: 'https://api.resend.com',
    }),

    smtp: transports.smtp({
      host: env.get('SMTP_HOST') as string,
      port: env.get('SMTP_PORT'),
      /**
       * Uncomment the auth block if your SMTP
       * server needs authentication
       */
      auth: {
        type: 'login',
        user: env.get('SMTP_USERNAME') as string,
        pass: env.get('SMTP_PASSWORD') as string,
      },
    }),
  },
})

export default mailConfig

declare module '@adonisjs/mail/types' {
  export interface MailersList extends InferMailers<typeof mailConfig> {}
}
