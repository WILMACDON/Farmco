import { defineConfig } from '@adonisjs/redis'
import type { InferConnections } from '@adonisjs/redis/types'
import env from '#start/env'

const redisConfig = defineConfig({
  connection: 'main',
  connections: {
    main: {
      host: env.get('REDIS_HOST', '127.0.0.1'),
      port: env.get('REDIS_PORT', 6379),
      password: env.get('REDIS_PASSWORD', ''),
      db: 0,
      keyPrefix: 'farmco:',
      maxRetriesPerRequest: null,
      // Avoid fatal reconnect loops when Redis is down (e.g. local without Redis)
      retryStrategy(times) {
        if (times > 3) return null
        return Math.min(times * 200, 1000)
      },
      lazyConnect: true,
    },
  },
})

export default redisConfig

declare module '@adonisjs/redis/types' {
  export interface RedisConnections extends InferConnections<typeof redisConfig> {}
}
