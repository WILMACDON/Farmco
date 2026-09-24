import { Head, usePage } from '@inertiajs/react'
import { Egg, Minus } from 'lucide-react'
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
import { farmMutate, formatDateTime, formatEggSize, formatNumber } from '@/lib/farm-api'

type EggSize = 'small' | 'medium' | 'large'
type Direction = 'add' | 'remove'

interface EggSizeStock {
  size: EggSize
  quantityEggs: number
  crates: number
  loose: number
}

interface EggStock {
  sizes: EggSizeStock[]
  totalEggs: number
  eggsPerCrate: number
}

interface EggRecordRow {
  id: string
  size: EggSize
  direction: Direction
  quantityEggs: number
  reason: string | null
  note: string | null
  needsReview: boolean
  recordedAt: string
  userName: string | null
}

interface EggsPageProps {
  stock: EggStock
  recentRecords: EggRecordRow[]
  eggsPerCrate: number
  farmRole: string
}

const entryMeta: Record<
  Direction,
  { title: string; description: string; primaryText: string }
> = {
  add: {
    title: 'Collect eggs',
    description: 'Record eggs collected by size using crates and loose.',
    primaryText: 'Save collection',
  },
  remove: {
    title: 'Remove eggs',
    description: 'Record eggs leaving stock (broken, spoiled, sold…).',
    primaryText: 'Save removal',
  },
}

export default function EggsPage() {
  const { props } = usePage<EggsPageProps>()
  const { stock, recentRecords, eggsPerCrate } = props
  const [activeEntry, setActiveEntry] = useState<Direction | null>(null)
  const [size, setSize] = useState<EggSize>('large')
  const [crates, setCrates] = useState('0')
  const [loose, setLoose] = useState('0')
  const [reason, setReason] = useState('')
  const [note, setNote] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  function resetForm() {
    setSize('large')
    setCrates('0')
    setLoose('0')
    setReason('')
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

    const cratesNum = Number(crates) || 0
    const looseNum = Number(loose) || 0
    if (cratesNum < 0 || looseNum < 0 || (cratesNum === 0 && looseNum === 0)) return
    if (activeEntry === 'remove' && !reason.trim()) return

    setIsSaving(true)
    const ok = await farmMutate({
      path: '/farm/eggs',
      data: {
        size,
        direction: activeEntry,
        crates: cratesNum,
        loose: looseNum,
        reason: activeEntry === 'remove' ? reason.trim() : undefined,
        note: note.trim() || null,
      },
      offlineType: 'eggs',
      successMessage:
        activeEntry === 'add'
          ? `${formatEggSize(size)} eggs collected.`
          : `${formatEggSize(size)} eggs removed.`,
      errorFallback: 'Unable to record egg movement.',
    })
    setIsSaving(false)
    if (ok) closeEntry()
  }

  const meta = activeEntry ? entryMeta[activeEntry] : null

  return (
    <DashboardLayout>
      <Head title='Eggs' />
      <div className='space-y-6 pb-20 md:pb-0'>
        <PageHeader
          title='Eggs'
          description={`Stock by size. ${eggsPerCrate} eggs per crate.`}
          actions={
            <>
              <EntryMenu
                items={[
                  {
                    id: 'add',
                    label: 'Collect eggs',
                    description: 'Add crates and loose by size',
                    icon: Egg,
                  },
                  {
                    id: 'remove',
                    label: 'Remove eggs',
                    description: 'Broken, spoiled, or sold',
                    icon: Minus,
                  },
                ]}
                onSelect={(id) => openEntry(id as Direction)}
              />
              <SyncIndicator />
            </>
          }
        />

        <StatCard title='Total eggs' value={formatNumber(stock.totalEggs)} />

        <SimpleGrid cols={{ base: 1, sm: 3 }} spacing={4}>
          {stock.sizes.map((row) => (
            <AppCard key={row.size} title={formatEggSize(row.size)}>
              <p className='font-display text-[34px] font-bold leading-none'>
                {formatNumber(row.quantityEggs)}
              </p>
              <p className='mt-2 text-sm text-muted-foreground'>
                {formatNumber(row.crates)} crates · {formatNumber(row.loose)} loose
              </p>
            </AppCard>
          ))}
        </SimpleGrid>

        <AppCard title='Recent records'>
          {recentRecords.length === 0 ? (
            <p className='text-sm text-muted-foreground'>No egg movements yet.</p>
          ) : (
            <div className='overflow-x-auto'>
              <table className='w-full min-w-[560px] text-sm'>
                <thead>
                  <tr className='border-b border-border text-left text-muted-foreground'>
                    <th className='pb-2 pr-3 font-medium'>When</th>
                    <th className='pb-2 pr-3 font-medium'>Action</th>
                    <th className='pb-2 pr-3 font-medium'>Size</th>
                    <th className='pb-2 pr-3 font-medium'>Eggs</th>
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
                          label={row.direction === 'add' ? 'Collected' : 'Removed'}
                        />
                        {row.needsReview && (
                          <span className='ml-2'>
                            <StatusBadge status='needs_review' label='Needs review' />
                          </span>
                        )}
                      </td>
                      <td className='py-3 pr-3'>{formatEggSize(row.size)}</td>
                      <td className='py-3 pr-3 font-medium'>
                        {row.quantityEggs}
                        {row.reason ? ` · ${row.reason}` : ''}
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
        title={meta?.title ?? 'Record eggs'}
        description={meta?.description}
        primaryText={meta?.primaryText ?? 'Save'}
        secondaryText='Cancel'
        isLoading={isSaving}
        className='max-w-lg'>
        <form onSubmit={handleSubmit} className='space-y-4'>
          <div className='grid gap-4 sm:grid-cols-2'>
            <FormField label='Size' required>
              <Select value={size} onValueChange={(v) => setSize((v || 'large') as EggSize)}>
                <SelectTrigger className='min-h-11 w-full h-auto'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='small'>Small</SelectItem>
                  <SelectItem value='medium'>Medium</SelectItem>
                  <SelectItem value='large'>Large</SelectItem>
                </SelectContent>
              </Select>
            </FormField>
            <FormField label='Crates'>
              <Input
                type='number'
                min={0}
                step={1}
                className='min-h-11'
                value={crates}
                onChange={(e) => setCrates(e.target.value)}
              />
            </FormField>
            <FormField label='Loose eggs'>
              <Input
                type='number'
                min={0}
                step={1}
                className='min-h-11'
                value={loose}
                onChange={(e) => setLoose(e.target.value)}
              />
            </FormField>
            {activeEntry === 'remove' && (
              <FormField label='Reason' required>
                <Input
                  className='min-h-11'
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder='Broken, spoiled, sold…'
                  required
                />
              </FormField>
            )}
          </div>
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
