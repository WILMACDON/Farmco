import redis from '@adonisjs/redis/services/main'

const LIST_KEY = 'dev:emails:list'
const ONE_DAY_SECONDS = 86_400
const MAX_EMAILS = 100

export interface DevEmailRecord {
  id: string
  type: string
  data: Record<string, unknown>
  logInfo: {
    type?: string
    from?: string
    replyTo?: string
    to?: string
    subject?: string
  }
  timestamp: string
  createdAt: string
  renderedHtml?: string
  failed?: boolean
  error?: string
}

function emailKey(id: string) {
  return `dev:emails:${id}`
}

async function setJson(key: string, value: unknown, ttlSeconds = ONE_DAY_SECONDS) {
  await redis.set(key, JSON.stringify(value), 'EX', ttlSeconds)
}

async function getJson<T>(key: string, defaultValue: T | null = null): Promise<T | null> {
  const value = await redis.get(key)
  if (value === null) return defaultValue
  try {
    return JSON.parse(value) as T
  } catch {
    return defaultValue
  }
}

export default class DevEmailStore {
  static async save(record: DevEmailRecord) {
    await setJson(emailKey(record.id), record)

    const existing = (await getJson<DevEmailRecord[]>(LIST_KEY, [])) ?? []
    const withoutDuplicate = existing.filter((email) => email.id !== record.id)
    withoutDuplicate.push(record)

    const sorted = withoutDuplicate
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, MAX_EMAILS)

    await setJson(LIST_KEY, sorted)
  }

  static async list(): Promise<DevEmailRecord[]> {
    return (await getJson<DevEmailRecord[]>(LIST_KEY, [])) ?? []
  }

  static async get(id: string): Promise<DevEmailRecord | null> {
    return getJson<DevEmailRecord>(emailKey(id))
  }

  static async clear(): Promise<number> {
    const emails = await DevEmailStore.list()
    const keys = emails.map((email) => emailKey(email.id))
    if (keys.length > 0) await redis.del(...keys)
    await redis.del(LIST_KEY)
    return keys.length
  }
}
