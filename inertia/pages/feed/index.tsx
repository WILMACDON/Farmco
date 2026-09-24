import { Head, usePage } from '@inertiajs/react'
import { AlertTriangle, PackageMinus, PackagePlus } from 'lucide-react'
import { useState } from 'react'
import { DashboardLayout } from '@/components/dashboard/layout'
import { PageHeader } from '@/components/dashboard/page_header'
import { EntryMenu } from '@/components/farm/entry-menu'
import { StatusBadge } from '@/components/farm/status-badge'
import { SyncIndicator } from '@/components/farm/sync-indicator'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { AppCard } from '@/components/ui/app-card'
import { BaseModal } from '@/components/ui/base-modal'
import { FormField } from '@/components/ui/form_field'
import { Input } from '@/components/ui/input'
import { SimpleGrid } from '@/components/ui/simplegrid'
import { StatCard } from '@/components/ui/stat-card'
import { Textarea } from '@/components/ui/textarea'
import { farmMutate, formatDateTime, formatNumber } from '@/lib/farm-api'

type Direction = 'add' | 'remove'

interface FeedStock {
  bags: number
  averageDailyUsage: number | null
  daysLeft: number | null
  estimatedDaysLeft: number | null
  isLow: boolean
}

interface FeedRecordRow {
  id: string
  direction: Direction
  bags: number
  note: string | null
  needsReview: boolean
  recordedAt: string
  userName: string | null
}

interface FeedPageProps {
  stock: FeedStock
  recentRecords: FeedRecordRow[]
  farmRole: string
}

const entryMeta: Record<
  Direction,
  { title: string; description: string; primaryText: string; success: (bags: number) => string }
> = {
  add: {
    title: 'Add bags',
    description: 'Record a feed delivery or stock intake.',
    primaryText: 'Save delivery',
    success: (bags) => `${bags} bags added.`,
  },
  remove: {
    title: 'Use bags',
    description: 'Record bags used for feeding.',
    primaryText: 'Save usage',
    success: (bags) => `${bags} bags used.`,
  },
}

export default function FeedPage() {
  const { props } = usePage<FeedPageProps>()
  const { stock, recentRecords } = props
  const [activeEntry, setActiveEntry] = useState<Direction | null>(null)
  const [bags, setBags] = useState('1')
  const [note, setNote] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const daysLeft = stock.daysLeft ?? stock.estimatedDaysLeft

  function resetForm() {
    setBags('1')
    setNote('')
  }

  function openEntry(direction: Direction) {
    resetForm()
    setActiveEntry(direction)
  }

  function closeEntry() {
    setActiveEntry(null)
    resetForm()
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!activeEntry) return

    const bagsNum = Number(bags)
    if (!bagsNum || bagsNum <= 0) return

    setIsSaving(true)
    const ok = await farmMutate({
      path: '/farm/feed',
      data: {
        direction: activeEntry,
        bags: bagsNum,
        note: note.trim() || null,
      },
      offlineType: 'feed',
      successMessage: entryMeta[activeEntry].success(bagsNum),
      errorFallback: 'Unable to record feed movement.',
    })
    setIsSaving(false)
    if (ok) closeEntry()
  }

  const meta = activeEntry ? entryMeta[activeEntry] : null

  return (
    <DashboardLayout>
      <Head title='Feed' />
      <div className='space-y-6 pb-20 md:pb-0'>
        <PageHeader
          title='Feed'
          description='Bags on hand and daily use.'
          actions={
            <>
              <EntryMenu
                items={[
                  {
                    id: 'add',
                    label: 'Add bags',
                    description: 'Delivery or stock intake',
                    icon: PackagePlus,
                  },
                  {
                    id: 'remove',
                    label: 'Use bags',
                    description: 'Mark bags consumed',
                    icon: PackageMinus,
                  },
                ]}
                onSelect={(id) => openEntry(id as Direction)}
              />
              <SyncIndicator />
            </>
          }
        />

        {stock.isLow && (
          <Alert className='border-accent/40 bg-[color-mix(in_oklab,var(--accent)_14%,transparent)]'>
            <AlertTriangle className='h-4 w-4 text-accent-foreground' />
            <AlertTitle>Feed is running low</AlertTitle>
            <AlertDescription>
              {formatNumber(stock.bags, 1)} bags left. Plan a delivery soon.
            </AlertDescription>
          </Alert>
        )}

        <SimpleGrid cols={{ base: 1, sm: 3 }} spacing={4}>
          <StatCard title='Bags left' value={formatNumber(stock.bags, 1)} />
          <StatCard title='Days left' value={daysLeft != null ? formatNumber(daysLeft, 1) : '—'} />
          <StatCard
            title='Avg daily use'
            value={stock.averageDailyUsage != null ? formatNumber(stock.averageDailyUsage, 2) : '—'}
          />
        </SimpleGrid>

        <AppCard title='Recent records'>
          {recentRecords.length === 0 ? (
            <p className='text-sm text-muted-foreground'>No feed movements yet.</p>
          ) : (
            <div className='overflow-x-auto'>
              <table className='w-full min-w-[480px] text-sm'>
                <thead>
                  <tr className='border-b border-border text-left text-muted-foreground'>
                    <th className='pb-2 pr-3 font-medium'>When</th>
                    <th className='pb-2 pr-3 font-medium'>Action</th>
                    <th className='pb-2 pr-3 font-medium'>Bags</th>
                    <th className='pb-2 font-medium'>By</th>
                  </tr>
                </thead>
                <tbody>
                  {recentRecords.map((row) => (
                    <tr key={row.id} className='border-b border-border/70'>
                      <td className='py-3 pr-3 text-muted-foreground'>
                        {formatDateTime(row.recordedAt)}
                      </td>
                      <td className='py-3 pr-3'>
                        <StatusBadge
                          status={row.direction}
                          label={row.direction === 'add' ? 'Added' : 'Used'}
                        />
                        {row.needsReview && (
                          <span className='ml-2'>
                            <StatusBadge status='needs_review' label='Needs review' />
                          </span>
                        )}
                      </td>
                      <td className='py-3 pr-3 font-medium'>
                        {formatNumber(row.bags, 2)}
                        {row.note ? ` · ${row.note}` : ''}
                      </td>
                      <td className='py-3 text-muted-foreground'>{row.userName || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </AppCard>
      </div>

      <BaseModal
        open={activeEntry !== null}
        onOpenChange={(open) => {
          if (!open) closeEntry()
        }}
        title={meta?.title ?? 'Record feed'}
        description={meta?.description}
        primaryText={meta?.primaryText ?? 'Save'}
        secondaryText='Cancel'
        isLoading={isSaving}
        className='max-w-md'>
        <form onSubmit={handleSubmit} className='space-y-4'>
          <FormField label='Bags' required>
            <Input
              type='number'
              min={0.001}
              step='any'
              className='min-h-11'
              value={bags}
              onChange={(e) => setBags(e.target.value)}
              required
            />
          </FormField>
          <FormField label='Note'>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder='Optional detail'
              rows={2}
            />
          </FormField>
        </form>
      </BaseModal>
    </DashboardLayout>
  )
}
