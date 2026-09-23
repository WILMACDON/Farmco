import {
  DiskSpaceCheck,
  HealthChecks,
  MemoryHeapCheck,
  MemoryRSSCheck,
} from '@adonisjs/core/health'
import { DbCheck, DbConnectionCountCheck } from '@adonisjs/lucid/database'
import db from '@adonisjs/lucid/services/db'
import { RedisCheck } from '@adonisjs/redis'
import redis from '@adonisjs/redis/services/main'
import env from '#start/env'

const isTest = env.get('NODE_ENV') === 'test'

const baseChecks = [
  new DiskSpaceCheck().failWhenExceeds(99),
  new MemoryHeapCheck(),
  ...(isTest ? [] : [new DbCheck(db.connection('sqlite'))]),
  new DbCheck(db.connection('postgres')),
  new DbConnectionCountCheck(db.connection()),
  new MemoryRSSCheck().warnWhenExceeds('600 mb').failWhenExceeds('800 mb'),
]

const redisChecks =
  !isTest && env.get('CACHE_STORE') !== 'memoryOnly'
    ? [new RedisCheck(redis.connection('main'))]
    : []

export const healthChecks = new HealthChecks().register([...baseChecks, ...redisChecks])
