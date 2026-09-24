import { Head, usePage } from '@inertiajs/react'
import { ArrowRightLeft, Minus, Plus } from 'lucide-react'
import { useState } from 'react'
import { DashboardLayout } from '@/components/dashboard/layout'
import { PageHeader } from '@/components/dashboard/page_header'
import { EntryMenu } from '@/components/farm/entry-menu'
import { StatusBadge } from '@/components/farm/status-badge'
import { SyncIndicator } from '@/components/farm/sync-indicator'
import { AppCard } from '@/components/ui/app-card'
import { BaseModal } from '@/components/ui/base-modal'
import { FormField } from '@/components/ui/form_field'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { SimpleGrid } from '@/components/ui/simplegrid'
import { StatCard } from '@/components/ui/stat-card'
import { Textarea } from '@/components/ui/textarea'
import { farmMutate, formatBirdBucket, formatDateTime, formatNumber } from '@/lib/farm-api'

type BirdHealth = 'well' | 'sick'
type BirdProduction = 'laying' | 'non_laying' | 'chick'
type Direction = 'add' | 'remove' | 'move'

interface BirdBucket {
  health: BirdHealth | null
  production: BirdProduction
  bucketKey: string
  count: number
}

interface BirdStock {
  buckets: BirdBucket[]
  total: number
}

interface BirdRecordRow {
  id: string
  direction: Direction
  health: BirdHealth | null
  production: BirdProduction
  toHealth: BirdHealth | null
  toProduction: BirdProduction | null
  quantity: number
  reason: string | null
  note: string | null
  needsReview: boolean
  recordedAt: string
  user?: { fullName?: string | null; email?: string | null } | null
}

interface BirdsPageProps {
  stock: BirdStock
  recentRecords: BirdRecordRow[]
  farmRole: string
}

const emptyForm = {
  health: 'well' as BirdHealth | '',
  production: 'laying' as BirdProduction,
  toHealth: 'well' as BirdHealth | '',
  toProduction: 'laying' as BirdProduction,
  quantity: '1',
  reason: '',
  note: '',
}

const entryMeta: Record<
  Direction,
  { title: string; description: string; primaryText: string; success: (qty: number) => string }
> = {
  add: {
    title: 'Add birds',
    description: 'Record new birds into a flock category.',
    primaryText: 'Save addition',
    success: (qty) => `${qty} birds added.`,
  },
  remove: {
    title: 'Remove birds',
    description: 'Record birds leaving the flock (sold, died, culled…).',
    primaryText: 'Save removal',
    success: (qty) => `${qty} birds removed.`,
  },
  move: {
    title: 'Move birds',
    description: 'Move birds between categories or health states.',
    primaryText: 'Save move',
    success: (qty) => `${qty} birds moved.`,
  },
}

export default function BirdsPage() {
  const { props } = usePage<BirdsPageProps>()
  const { stock, recentRecords } = props
  const [activeEntry, setActiveEntry] = useState<Direction | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [isSaving, setIsSaving] = useState(false)

  function openEntry(direction: Direction) {
    setForm(emptyForm)
    setActiveEntry(direction)
  }

  function closeEntry() {
    setActiveEntry(null)
    setForm(emptyForm)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!activeEntry) return

    const quantity = Number(form.quantity)
    if (!Number.isInteger(quantity) || quantity < 1) return

    const payload: Record<string, unknown> = {
      direction: activeEntry,
      production: form.production,
      quantity,
      note: form.note.trim() || null,
    }

    if (form.production !== 'chick') {
      payload.health = form.health || null
    } else {
      payload.health = null
    }

    if (activeEntry === 'remove') {
      if (!form.reason.trim()) return
      payload.reason = form.reason.trim()
    }

    if (activeEntry === 'move') {
      payload.toProduction = form.toProduction
      payload.toHealth = form.toProduction === 'chick' ? null : form.toHealth || null
    }

    setIsSaving(true)
    const ok = await farmMutate({
      path: '/farm/birds',
      data: payload,
      offlineType: 'birds',
      successMessage: entryMeta[activeEntry].success(quantity),
      errorFallback: 'Unable to record bird movement.',
    })
    setIsSaving(false)
    if (ok) closeEntry()
  }

  const meta = activeEntry ? entryMeta[activeEntry] : null

  return (
    <DashboardLayout>
      <Head title='Birds' />
      <div className='space-y-6 pb-20 md:pb-0'>
        <PageHeader
          title='Birds'
          description='Track flock counts, health, and movements.'
          actions={
            <>
              <EntryMenu
                items={[
                  {
                    id: 'add',
                    label: 'Add birds',
                    description: 'New arrivals into a category',
                    icon: Plus,
                  },
                  {
                    id: 'remove',
                    label: 'Remove birds',
                    description: 'Sold, died, or culled',
                    icon: Minus,
                  },
                  {
                    id: 'move',
                    label: 'Move birds',
                    description: 'Between category or health',
                    icon: ArrowRightLeft,
                  },
                ]}
                onSelect={(id) => openEntry(id as Direction)}
              />
              <SyncIndicator />
            </>
          }
        />

        <StatCard title='Total birds' value={formatNumber(stock.total)} />

        <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing={4}>
          {stock.buckets.length === 0 ? (
            <AppCard title='No stock yet'>
              <p className='text-sm text-muted-foreground'>Add birds to start the ledger.</p>
            </AppCard>
          ) : (
            stock.buckets.map((bucket) => (
              <AppCard
                key={bucket.bucketKey}
                title={formatBirdBucket(bucket.health, bucket.production)}>
                <p className='font-display text-[34px] font-bold leading-none'>
                  {formatNumber(bucket.count)}
                </p>
                {bucket.health && (
                  <div className='mt-3'>
                    <StatusBadge status={bucket.health} />
                  </div>
                )}
              </AppCard>
            ))
          )}
        </SimpleGrid>

        <AppCard title='Recent records' description='Who changed what and when.'>
          {recentRecords.length === 0 ? (
            <p className='text-sm text-muted-foreground'>No bird movements yet.</p>
          ) : (
            <div className='overflow-x-auto'>
              <table className='w-full min-w-[560px] text-sm'>
                <thead>
                  <tr className='border-b border-border text-left text-muted-foreground'>
                    <th className='pb-2 pr-3 font-medium'>When</th>
                    <th className='pb-2 pr-3 font-medium'>Action</th>
                    <th className='pb-2 pr-3 font-medium'>Detail</th>
                    <th className='pb-2 pr-3 font-medium'>Qty</th>
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
                        <StatusBadge status={row.direction} />
                        {row.needsReview && (
                          <span className='ml-2'>
                            <StatusBadge status='needs_review' label='Needs review' />
                          </span>
                        )}
                      </td>
                      <td className='py-3 pr-3'>
                        {formatBirdBucket(row.health, row.production)}
                        {row.direction === 'move' && row.toProduction
                          ? ` → ${formatBirdBucket(row.toHealth, row.toProduction)}`
                          : ''}
                        {row.reason ? ` · ${row.reason}` : ''}
                      </td>
                      <td className='py-3 pr-3 font-medium'>{row.quantity}</td>
                      <td className='py-3 text-muted-foreground'>
                        {row.user?.fullName || row.user?.email || '—'}
                      </td>
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
        title={meta?.title ?? 'Record movement'}
        description={meta?.description}
        primaryText={meta?.primaryText ?? 'Save'}
        secondaryText='Cancel'
        isLoading={isSaving}
        className='max-w-lg'>
        <form onSubmit={handleSubmit} className='space-y-4'>
          <div className='grid gap-4 sm:grid-cols-2'>
            <FormField label='Category' required>
              <Select
                value={form.production}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, production: (v || 'laying') as BirdProduction }))
                }>
                <SelectTrigger className='min-h-11 w-full h-auto'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='laying'>Laying</SelectItem>
                  <SelectItem value='non_laying'>Non-laying</SelectItem>
                  <SelectItem value='chick'>Chick</SelectItem>
                </SelectContent>
              </Select>
            </FormField>

            {form.production !== 'chick' && (
              <FormField label='Health' required>
                <Select
                  value={form.health}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, health: (v || 'well') as BirdHealth }))
                  }>
                  <SelectTrigger className='min-h-11 w-full h-auto'>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='well'>Well</SelectItem>
                    <SelectItem value='sick'>Sick</SelectItem>
                  </SelectContent>
                </Select>
              </FormField>
            )}

            {activeEntry === 'move' && (
              <>
                <FormField label='Move to category' required>
                  <Select
                    value={form.toProduction}
                    onValueChange={(v) =>
                      setForm((f) => ({
                        ...f,
                        toProduction: (v || 'laying') as BirdProduction,
                      }))
                    }>
                    <SelectTrigger className='min-h-11 w-full h-auto'>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='laying'>Laying</SelectItem>
                      <SelectItem value='non_laying'>Non-laying</SelectItem>
                      <SelectItem value='chick'>Chick</SelectItem>
                    </SelectContent>
                  </Select>
                </FormField>
                {form.toProduction !== 'chick' && (
                  <FormField label='Move to health' required>
                    <Select
                      value={form.toHealth}
                      onValueChange={(v) =>
                        setForm((f) => ({ ...f, toHealth: (v || 'well') as BirdHealth }))
                      }>
                      <SelectTrigger className='min-h-11 w-full h-auto'>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value='well'>Well</SelectItem>
                        <SelectItem value='sick'>Sick</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormField>
                )}
              </>
            )}

            <FormField label='Quantity' required>
              <Input
                type='number'
                min={1}
                step={1}
                className='min-h-11'
                value={form.quantity}
                onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))}
                required
              />
            </FormField>

            {activeEntry === 'remove' && (
              <FormField label='Reason' required>
                <Input
                  className='min-h-11'
                  value={form.reason}
                  onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
                  placeholder='Sold, died, culled…'
                  required
                />
              </FormField>
            )}
          </div>

          <FormField label='Note'>
            <Textarea
              value={form.note}
              onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
              placeholder='Optional detail'
              rows={2}
            />
          </FormField>
        </form>
      </BaseModal>
    </DashboardLayout>
  )
}
