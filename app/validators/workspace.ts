import vine from '@vinejs/vine'

export const createWorkspaceValidator = vine.compile(
  vine.object({
    name: vine.string().trim().minLength(2).maxLength(255),
  }),
)

export const updateWorkspaceValidator = vine.compile(
  vine.object({
    name: vine.string().trim().minLength(2).maxLength(255),
  }),
)

export const inviteToWorkspaceValidator = vine.compile(
  vine.object({
    email: vine.string().toLowerCase().trim().email(),
    role: vine.enum(['admin', 'member']).optional(),
  }),
)

export const acceptWorkspaceInviteGuestValidator = vine.compile(
  vine.object({
    token: vine.string().trim(),
    fullName: vine.string().trim().minLength(2).maxLength(255),
    password: vine.string().minLength(8),
    confirmPassword: vine.string().confirmed({ confirmationField: 'password' }),
  }),
)

export const acceptWorkspaceInviteAuthedValidator = vine.compile(
  vine.object({
    token: vine.string().trim(),
  }),
)
