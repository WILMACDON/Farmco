import { type Attachment, attachmentManager } from '@jrmc/adonis-attachment'
import { DateTime } from 'luxon'
import User from '#models/user'
import type { GitHubAuthUser, GoogleUser } from '#types/oauth-user'
import { generateShortId } from './app.functions.js'

export class OauthService {
  // Your code here
  public async createOrLoginWithGoogle(gUser: GoogleUser) {
    const newPassword = generateShortId(12)

    const newUser = await User.firstOrCreate(
      { email: gUser.email },
      {
        fullName: gUser.name,
        email: gUser.email,
        password: newPassword,
        provider: 'google',
        token: gUser.token.idToken,
        emailVerified: true,
        emailVerifiedAt: DateTime.now(),
        avatar: gUser.avatarUrl
          ? ((await attachmentManager.createFromUrl(new URL(gUser.avatarUrl))) as Attachment)
          : null,
      },
    )

    return newUser
  }

  public async createOrLoginWithGithub(gUser: Partial<GitHubAuthUser>) {
    const newPassword = generateShortId(12)

    const newUser = await User.firstOrCreate(
      { email: gUser.email },
      {
        fullName: gUser.name,
        email: gUser.email,
        password: newPassword,
        provider: 'github',
        token: gUser.token?.token,
        emailVerified: true,
        emailVerifiedAt: DateTime.now(),
        avatar: gUser.avatarUrl
          ? ((await attachmentManager.createFromUrl(new URL(gUser.avatarUrl))) as Attachment)
          : null,
      },
    )

    return newUser
  }
}
