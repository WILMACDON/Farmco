import { Head, router, usePage } from '@inertiajs/react'
import { DashboardLayout } from '@/components/dashboard/layout'
import { PageHeader } from '@/components/dashboard/page_header'
import { SyncIndicator } from '@/components/farm/sync-indicator'
import { AppCard } from '@/components/ui/app-card'
import { Button } from '@/components/ui/button'
import { SimpleGrid } from '@/components/ui/simplegrid'
import { StatCard } from '@/components/ui/stat-card'
import { formatBirdBucket, formatNumber } from '@/lib/farm-api'
import { cn } from '@/lib/utils'

interface BirdBucket {
  health: string | null
  production: string
  bucketKey: string
  count: number
}

interface FarmStats {
  range: { preset: string; from: string | null; to: string | null }
  birds: {
    total: number
    byBucket: BirdBucket[]
    mortality: number
    mortalityRate: number | null
    removed: number
  }
  eggs: {
    collected: number
    bySize: Record<string, number>
    brokenSpoiled: number
    brokenSpoiledRate: number | null
    layingRate: number | null
    layingBirds: number
  }
  feed: {
    bags: number
    used: number
    averageDailyUsage: number | null
    daysLeft: number | null
    feedPerBird: number | null
    isLow: boolean
  }
  orders: {
    byStatus: Record<string, number>
    cratesSold: number
    fulfilmentRate: number | null
    pendingCount: number
  }
  limited: boolean
  activity?: {
    ownEntries?: number
    entriesPerUser?: Array<{ userId: string; count: number }>
  }
}

interface StatsPageProps {
  stats: FarmStats
  filters: { range?: string; from?: string; to?: string }
  farmRole: string
  limited: boolean
}

function pct(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return '—'
  return `${(value * 100).toFixed(0)}%`
}

function SimpleBar({ label, value, max }: { label: string; value: number; max: number }) {
  const width = max > 0 ? Math.max(4, Math.round((value / max) * 100)) : 0
  return (
    <div className='space-y-1'>
      <div className='flex items-center justify-between text-sm'>
        <span>{label}</span>
        <span className='font-medium'>{formatNumber(value)}</span>
      </div>
      <div className='h-2.5 overflow-hidden rounded-full bg-muted'>
        <div
          className='h-full rounded-full bg-primary transition-all'
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  )
}

export default function StatsPage() {
  const { props } = usePage<StatsPageProps>()
  const { stats, filters, limited } = props
  const range = filters.range || '7d'

  function setRange(next: string) {
    router.get('/stats', { range: next }, { preserveState: true, replace: true })
  }

  const eggSizeEntries = Object.entries(stats.eggs.bySize || {})
  const eggMax = Math.max(1, ...eggSizeEntries.map(([, v]) => v))
  const orderEntries = Object.entries(stats.orders.byStatus || {})
  const orderMax = Math.max(1, ...orderEntries.map(([, v]) => v))
  const bucketEntries = (stats.birds.byBucket || []).filter((b) => b.count > 0)
  const bucketMax = Math.max(1, ...bucketEntries.map((b) => b.count))

  return (
    <DashboardLayout>
      <Head title='Statistics' />
      <div className='space-y-6 pb-20 md:pb-0'>
        <PageHeader
          title='Statistics'
          description={
            limited
              ? 'Your summary for the selected range.'
              : 'Farm-wide metrics for the selected range.'
          }
          actions={
            <div className='flex flex-wrap items-center gap-2'>
              <SyncIndicator />
              {(['7d', '30d'] as const).map((opt) => (
                <Button
                  key={opt}
                  variant={range === opt ? 'default' : 'outline'}
                  className={cn('min-h-11', range === opt && 'bg-primary')}
                  onClick={() => setRange(opt)}>
                  {opt === '7d' ? '7 days' : '30 days'}
                </Button>
              ))}
            </div>
          }
        />

        <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing={4}>
          <StatCard title='Birds' value={formatNumber(stats.birds.total)} />
          <StatCard title='Eggs collected' value={formatNumber(stats.eggs.collected)} />
          <StatCard title='Feed used' value={formatNumber(stats.feed.used, 1)} />
          <StatCard title='Crates sold' value={formatNumber(stats.orders.cratesSold)} />
        </SimpleGrid>

        <SimpleGrid cols={{ base: 1, md: 2 }} spacing={4}>
          <AppCard title='Birds by category'>
            {bucketEntries.length === 0 ? (
              <p className='text-sm text-muted-foreground'>No bird stock in this snapshot.</p>
            ) : (
              <div className='space-y-3'>
                {bucketEntries.map((b) => (
                  <SimpleBar
                    key={b.bucketKey}
                    label={formatBirdBucket(b.health, b.production)}
                    value={b.count}
                    max={bucketMax}
                  />
                ))}
              </div>
            )}
            <p className='mt-4 text-sm text-muted-foreground'>
              Mortality {formatNumber(stats.birds.mortality)} · rate{' '}
              {pct(stats.birds.mortalityRate)}
            </p>
          </AppCard>

          <AppCard title='Eggs by size'>
            {eggSizeEntries.length === 0 ? (
              <p className='text-sm text-muted-foreground'>No collections in this range.</p>
            ) : (
              <div className='space-y-3'>
                {eggSizeEntries.map(([size, count]) => (
                  <SimpleBar
                    key={size}
                    label={size.charAt(0).toUpperCase() + size.slice(1)}
                    value={count}
                    max={eggMax}
                  />
                ))}
              </div>
            )}
            <p className='mt-4 text-sm text-muted-foreground'>
              Broken/spoiled {formatNumber(stats.eggs.brokenSpoiled)} · laying rate{' '}
              {stats.eggs.layingRate != null ? formatNumber(stats.eggs.layingRate, 2) : '—'}{' '}
              eggs/bird/day
            </p>
          </AppCard>

          <AppCard title='Orders'>
            <div className='space-y-3'>
              {orderEntries.map(([status, count]) => (
                <SimpleBar
                  key={status}
                  label={status.charAt(0).toUpperCase() + status.slice(1)}
                  value={count}
                  max={orderMax}
                />
              ))}
            </div>
            <p className='mt-4 text-sm text-muted-foreground'>
              Fulfilment {pct(stats.orders.fulfilmentRate)} · pending{' '}
              {formatNumber(stats.orders.pendingCount)}
            </p>
          </AppCard>

          <AppCard title='Feed & activity'>
            <SimpleGrid cols={{ base: 2 }} spacing={3}>
              <div>
                <p className='text-xs text-muted-foreground'>Bags left</p>
                <p className='font-display text-2xl font-bold'>
                  {formatNumber(stats.feed.bags, 1)}
                </p>
              </div>
              <div>
                <p className='text-xs text-muted-foreground'>Days left</p>
                <p className='font-display text-2xl font-bold'>
                  {stats.feed.daysLeft != null ? formatNumber(stats.feed.daysLeft, 1) : '—'}
                </p>
              </div>
              <div>
                <p className='text-xs text-muted-foreground'>Feed / bird</p>
                <p className='font-display text-2xl font-bold'>
                  {stats.feed.feedPerBird != null ? formatNumber(stats.feed.feedPerBird, 2) : '—'}
                </p>
              </div>
              <div>
                <p className='text-xs text-muted-foreground'>Activity</p>
                <p className='font-display text-2xl font-bold'>
                  {limited
                    ? formatNumber(stats.activity?.ownEntries ?? 0)
                    : formatNumber(
                        (stats.activity?.entriesPerUser ?? []).reduce((s, r) => s + r.count, 0),
                      )}
                </p>
              </div>
            </SimpleGrid>
          </AppCard>
        </SimpleGrid>
      </div>
    </DashboardLayout>
  )
}
