import db from '@adonisjs/lucid/services/db'
import type { ApiClient, ApiRequest } from '@japa/api-client'
import { DateTime } from 'luxon'

import User from '#models/user'
import Workspace from '#models/workspace'
import type { WorkspaceRole } from '#models/workspace_member'
import WorkspaceMember from '#models/workspace_member'

const SKIP_TRUNCATE_TABLES = new Set(['adonis_schema', 'adonis_schema_versions'])

/**
 * Wipe all application tables. Uses a single CASCADE truncate to avoid
 * Postgres deadlocks from Lucid's parallel per-table db:truncate.
 */
export async function resetDatabase() {
  const client = db.connection()
  const tables = (await client.getAllTables(['public'])).filter(
    (table) => !SKIP_TRUNCATE_TABLES.has(table),
  )
  if (tables.length === 0) return

  const list = tables.map((t) => `"${t}"`).join(', ')
  await db.rawQuery(`TRUNCATE ${list} RESTART IDENTITY CASCADE`)
}

export interface CreateOwnerOptions {
  email: string
  password: string
  fullName?: string
  workspaceName?: string
  eggsPerCrate?: number
  lowFeedThreshold?: number
}

export async function createOwnerWithWorkspace(options: CreateOwnerOptions) {
  const {
    email,
    password,
    fullName = 'Farm Owner',
    workspaceName = 'Test Farm',
    eggsPerCrate = 30,
    lowFeedThreshold = 5,
  } = options

  const user = await User.create({
    email: email.toLowerCase().trim(),
    password,
    fullName,
    role: 'normal_user',
    status: 'active',
    mustChangePassword: false,
    provider: 'local',
    emailVerified: true,
    emailVerifiedAt: DateTime.now(),
    lastLoginAt: DateTime.now(),
  })

  const workspace = await Workspace.create({
    name: workspaceName,
    createdByUserId: user.id,
    eggsPerCrate,
    lowFeedThreshold,
  })

  const membership = await WorkspaceMember.create({
    workspaceId: workspace.id,
    userId: user.id,
    role: 'owner',
  })

  return { user, workspace, membership }
}

export interface CreateMemberOptions {
  workspaceId: string
  role: Extract<WorkspaceRole, 'admin' | 'member'>
  email: string
  password: string
  createdByUserId: string
  fullName?: string
}

export async function createMember(options: CreateMemberOptions) {
  const {
    workspaceId,
    role,
    email,
    password,
    createdByUserId,
    fullName = email.split('@')[0],
  } = options

  const user = await User.create({
    email: email.toLowerCase().trim(),
    password,
    fullName,
    role: 'normal_user',
    status: 'active',
    mustChangePassword: false,
    createdByUserId,
    provider: 'local',
    emailVerified: true,
    emailVerifiedAt: DateTime.now(),
    lastLoginAt: DateTime.now(),
  })

  const membership = await WorkspaceMember.create({
    workspaceId,
    userId: user.id,
    role,
  })

  return { user, membership }
}

/**
 * Authenticate via POST /api/v1/auth/login (session cookies persist on the client).
 */
export async function login(client: ApiClient, email: string, password: string) {
  const response = await client.post('/api/v1/auth/login').json({ email, password }).withCsrfToken()

  return { client, response }
}

/**
 * Select a workspace on the session (optionally after logging in).
 */
export async function setWorkspaceSession(
  client: ApiClient,
  workspaceId: string,
  credentials?: { email: string; password: string },
) {
  if (credentials) {
    await login(client, credentials.email, credentials.password)
  }

  const response = await client
    .post('/api/v1/workspaces/switch')
    .json({ workspaceId })
    .withCsrfToken()

  return { client, response }
}

/**
 * Login and select the workspace in one step.
 */
export async function loginWithWorkspace(
  client: ApiClient,
  email: string,
  password: string,
  workspaceId: string,
) {
  const { response } = await login(client, email, password)
  if (response.status() >= 400) {
    throw new Error(
      `Login failed for ${email}: ${response.status()} ${JSON.stringify(response.body())}`,
    )
  }
  await client.post('/api/v1/workspaces/switch').json({ workspaceId }).withCsrfToken()
  return client
}

/**
 * Attach auth + workspace session to a single API request.
 */
export function asFarmUser(request: ApiRequest, user: User, workspaceId: string) {
  return request.loginAs(user).withSession({ currentWorkspaceId: workspaceId })
}
