import { defineConfig, drivers, store } from '@adonisjs/cache'
import type { InferStores } from '@adonisjs/cache/types'
import env from '#start/env'

const useMemoryOnly = env.get('NODE_ENV') === 'test' || env.get('CACHE_STORE') === 'memoryOnly'

const cacheConfig = defineConfig({
  default: useMemoryOnly ? 'memoryOnly' : 'default',

  stores: {
    memoryOnly: store().useL1Layer(drivers.memory()),

    default: store()
      .useL1Layer(drivers.memory())
      .useL2Layer(
        drivers.redis({
          connectionName: 'main',
        }),
      )
      .useBus(
        drivers.redisBus({
          connectionName: 'main',
        }),
      ),
  },
})

export default cacheConfig

declare module '@adonisjs/cache/types' {
  interface CacheStores extends InferStores<typeof cacheConfig> {}
}
