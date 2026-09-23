import { Head, Link, usePage } from '@inertiajs/react'
import { AlertTriangle, Bird, Egg, Package, Wheat } from 'lucide-react'
import { DashboardLayout } from '@/components/dashboard/layout'
import { PageHeader } from '@/components/dashboard/page_header'
import { SyncIndicator } from '@/components/farm/sync-indicator'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { AppCard } from '@/components/ui/app-card'
import { buttonVariants } from '@/components/ui/button'
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

interface EggSizeRow {
  size: string
  quantityEggs: number
  crates: number
  loose: number
}

interface DashboardSnapshot {
  birdsTotal: number
  birdsByBucket: BirdBucket[]
  eggsTotal: number
  eggsBySize: EggSizeRow[]
  feedBags: number
  feedEstimatedDaysLeft: number | null
  pendingOrders: number
  openOrders: number
  needsReviewCount: number
  alerts: {
    lowFeed: boolean
    needsReview: boolean
  }
  lowFeedThreshold: number
  workspaceName: string
}

interface DashboardProps {
  snapshot: DashboardSnapshot
  farmRole: string
  workspaceName?: string
}

const quickActions = [
  { title: 'Record eggs', href: '/eggs', icon: Egg, accent: true },
  { title: 'Record feed', href: '/feed', icon: Wheat },
  { title: 'Add bird update', href: '/birds', icon: Bird },
  { title: 'New order', href: '/orders', icon: Package },
]

export default function Dashboard() {
  const { props } = usePage<DashboardProps>()
  const snapshot = props.snapshot
  const name = props.workspaceName || snapshot.workspaceName || 'the farm'

  const feedHint =
    snapshot.feedEstimatedDaysLeft != null
      ? `About ${formatNumber(snapshot.feedEstimatedDaysLeft, 1)} days left`
      : `Threshold ${formatNumber(snapshot.lowFeedThreshold)} bags`

  return (
    <DashboardLayout>
      <Head title='Dashboard' />
      <div className='space-y-6 animate-fade-in-up pb-20 md:pb-0'>
        <PageHeader
          title='Today on the farm'
          description={`Live snapshot for ${name}.`}
          actions={<SyncIndicator />}
        />

        {(snapshot.alerts.lowFeed || snapshot.alerts.needsReview) && (
          <div className='space-y-3'>
            {snapshot.alerts.lowFeed && (
              <Alert className='border-accent/40 bg-[color-mix(in_oklab,var(--accent)_14%,transparent)]'>
                <AlertTriangle className='h-4 w-4 text-accent-foreground' />
                <AlertTitle>Feed is running low</AlertTitle>
                <AlertDescription>
                  {formatNumber(snapshot.feedBags, 1)} bags left (threshold{' '}
                  {formatNumber(snapshot.lowFeedThreshold)}). Add feed when you can.
                </AlertDescription>
              </Alert>
            )}
            {snapshot.alerts.needsReview && (
              <Alert>
                <AlertTriangle className='h-4 w-4' />
                <AlertTitle>Entries need review</AlertTitle>
                <AlertDescription>
                  {snapshot.needsReviewCount}{' '}
                  {snapshot.needsReviewCount === 1 ? 'entry needs' : 'entries need'} a manager look.
                  Check Activity for details.
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        <SimpleGrid cols={{ base: 1, md: 2, lg: 4 }} spacing={4}>
          <StatCard title='Birds' value={formatNumber(snapshot.birdsTotal)} icon={Bird}>
            <p className='mt-2 text-xs text-muted-foreground'>
              {snapshot.birdsByBucket
                .filter((b) => b.count > 0)
                .slice(0, 2)
                .map((b) => `${formatBirdBucket(b.health, b.production)} ${b.count}`)
                .join(' · ') || 'No birds recorded yet'}
            </p>
          </StatCard>
          <StatCard title='Eggs in stock' value={formatNumber(snapshot.eggsTotal)} icon={Egg}>
            <p className='mt-2 text-xs text-muted-foreground'>
              {snapshot.eggsBySize
                .filter((s) => s.quantityEggs > 0)
                .map((s) => `${s.size}: ${s.crates}c + ${s.loose}`)
                .join(' · ') || 'No eggs in stock'}
            </p>
          </StatCard>
          <StatCard title='Feed left' value={formatNumber(snapshot.feedBags, 1)} icon={Wheat}>
            <p className='mt-2 text-xs text-muted-foreground'>{feedHint}</p>
          </StatCard>
          <StatCard title='Open orders' value={formatNumber(snapshot.openOrders)} icon={Package}>
            <p className='mt-2 text-xs text-muted-foreground'>
              {snapshot.pendingOrders > 0
                ? `${formatNumber(snapshot.pendingOrders)} waiting for approval`
                : 'Pending and approved, not yet sold'}
            </p>
          </StatCard>
        </SimpleGrid>

        <AppCard title='Quick actions' description='Common entries in a few taps.'>
          <div className='flex flex-wrap gap-3'>
            {quickActions.map((action) => {
              const Icon = action.icon
              return (
                <Link
                  key={action.href}
                  href={action.href}
                  className={cn(
                    buttonVariants({
                      variant: action.accent ? 'default' : 'outline',
                      size: 'lg',
                    }),
                    'min-h-11 gap-2',
                    action.accent && 'bg-accent text-accent-foreground hover:bg-accent/90',
                  )}>
                  <Icon className='h-4 w-4' />
                  {action.title}
                </Link>
              )
            })}
          </div>
        </AppCard>
      </div>
    </DashboardLayout>
  )
}
