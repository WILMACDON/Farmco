import cache from '@adonisjs/cache/services/main'
import { test } from '@japa/runner'
import FarmCacheService from '#services/farm_cache_service'

test.group('FarmCacheService', () => {
  test('getOrSet returns factory value and caches it', async ({ assert }) => {
    const orgId = 'test-org-cache'
    const key = FarmCacheService.keys.dashboard(orgId)
    await FarmCacheService.forget(key)

    let calls = 0
    const first = await FarmCacheService.getOrSet(key, async () => {
      calls++
      return { birds: 10 }
    })
    const second = await FarmCacheService.getOrSet(key, async () => {
      calls++
      return { birds: 99 }
    })

    assert.deepEqual(first, { birds: 10 })
    assert.deepEqual(second, { birds: 10 })
    assert.equal(calls, 1)

    await FarmCacheService.forget(key)
  })

  test('invalidateAfterStockChange removes stock and dashboard keys', async ({ assert }) => {
    const orgId = 'test-org-invalidate'
    const birdKey = FarmCacheService.keys.birdsStock(orgId)
    const dashKey = FarmCacheService.keys.dashboard(orgId)

    await cache.set({ key: birdKey, value: { count: 5 }, ttl: '5m' })
    await cache.set({ key: dashKey, value: { ok: true }, ttl: '2m' })

    await FarmCacheService.invalidateAfterStockChange(orgId)

    assert.isUndefined(await cache.get({ key: birdKey }))
    assert.isUndefined(await cache.get({ key: dashKey }))
  })
})
