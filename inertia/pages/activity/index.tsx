import { Head, router, usePage } from '@inertiajs/react'
import { useState } from 'react'
import { DashboardLayout } from '@/components/dashboard/layout'
import { PageHeader } from '@/components/dashboard/page_header'
import { StatusBadge } from '@/components/farm/status-badge'
import { SyncIndicator } from '@/components/farm/sync-indicator'
import { AppCard } from '@/components/ui/app-card'
import { Button } from '@/components/ui/button'
import { FormField } from '@/components/ui/form_field'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { formatDateTime, formatNumber } from '@/lib/farm-api'

interface ActivityEntry {
  id: string
  action: string
  entity: string
  entityId: string | null
  quantity: number | null
  note: string | null
  recordedAt: string
  user?: { fullName?: string | null; email?: string | null } | null
}

interface ActivityMeta {
  total: number
  perPage: number
  currentPage: number
  lastPage: number
}

interface ActivityPageProps {
  entries: ActivityEntry[]
  meta: ActivityMeta
  filters: {
    userId?: string
    entity?: string
    action?: string
    from?: string
    to?: string
    page?: number
    perPage?: number
  }
  farmRole: string
  ownOnly: boolean
}

const ENTITY_OPTIONS = ['all', 'bird', 'egg', 'feed', 'order', 'user', 'settings'] as const

export default function ActivityPage() {
  const { props } = usePage<ActivityPageProps>()
  const { entries, meta, filters, ownOnly } = props
  const [entity, setEntity] = useState(filters.entity || 'all')
  const [action, setAction] = useState(filters.action || '')
  const [from, setFrom] = useState(filters.from || '')
  const [to, setTo] = useState(filters.to || '')

  function applyFilters(page?: number) {
    const params: Record<string, string> = {}
    if (entity && entity !== 'all') params.entity = entity
    if (action.trim()) params.action = action.trim()
    if (from) params.from = from
    if (to) params.to = to
    if (page && page > 1) params.page = String(page)
    router.get('/activity', params, { preserveState: true, replace: true })
  }

  return (
    <DashboardLayout>
      <Head title='Activity' />
      <div className='space-y-6 pb-20 md:pb-0'>
        <PageHeader
          title='Activity'
          description={
            ownOnly ? 'Your farm activity log.' : 'Who changed what and when across the farm.'
          }
          actions={<SyncIndicator />}
        />

        <AppCard title='Filters'>
          <form
            className='grid gap-3 sm:grid-cols-2 lg:grid-cols-5'
            onSubmit={(e) => {
              e.preventDefault()
              applyFilters()
            }}>
            <FormField label='Entity'>
              <Select value={entity} onValueChange={(v) => setEntity(v || 'all')}>
                <SelectTrigger className='min-h-11 w-full h-auto'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ENTITY_OPTIONS.map((opt) => (
                    <SelectItem key={opt} value={opt}>
                      {opt === 'all' ? 'All' : opt.charAt(0).toUpperCase() + opt.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
            <FormField label='Action'>
              <Input
                className='min-h-11'
                value={action}
                onChange={(e) => setAction(e.target.value)}
                placeholder='e.g. order.create'
              />
            </FormField>
            <FormField label='From'>
              <Input
                type='date'
                className='min-h-11'
                value={from}
                onChange={(e) => setFrom(e.target.value)}
              />
            </FormField>
            <FormField label='To'>
              <Input
                type='date'
                className='min-h-11'
                value={to}
                onChange={(e) => setTo(e.target.value)}
              />
            </FormField>
            <div className='flex items-end'>
              <Button type='submit' className='min-h-11 w-full'>
                Apply
              </Button>
            </div>
          </form>
        </AppCard>

        <AppCard title='Log' description={`${formatNumber(meta?.total ?? entries.length)} entries`}>
          {entries.length === 0 ? (
            <p className='text-sm text-muted-foreground'>No activity for these filters.</p>
          ) : (
            <div className='overflow-x-auto'>
              <table className='w-full min-w-[640px] text-sm'>
                <thead>
                  <tr className='border-b border-border text-left text-muted-foreground'>
                    <th className='pb-2 pr-3 font-medium'>When</th>
                    <th className='pb-2 pr-3 font-medium'>Who</th>
                    <th className='pb-2 pr-3 font-medium'>Action</th>
                    <th className='pb-2 pr-3 font-medium'>Entity</th>
                    <th className='pb-2 pr-3 font-medium'>Qty</th>
                    <th className='pb-2 font-medium'>Note</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((row) => (
                    <tr key={row.id} className='border-b border-border/70'>
                      <td className='py-3 pr-3 text-muted-foreground whitespace-nowrap'>
                        {formatDateTime(row.recordedAt)}
                      </td>
                      <td className='py-3 pr-3'>{row.user?.fullName || row.user?.email || '—'}</td>
                      <td className='py-3 pr-3'>
                        <StatusBadge status='info' tone='info' label={row.action} />
                      </td>
                      <td className='py-3 pr-3 capitalize'>
                        {row.entity}
                        {row.entityId ? (
                          <span className='block text-xs text-muted-foreground truncate max-w-[120px]'>
                            {row.entityId}
                          </span>
                        ) : null}
                      </td>
                      <td className='py-3 pr-3'>
                        {row.quantity != null ? formatNumber(row.quantity) : '—'}
                      </td>
                      <td className='py-3 text-muted-foreground'>{row.note || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {(meta?.lastPage ?? 1) > 1 && (
            <div className='mt-4 flex items-center justify-between gap-2'>
              <Button
                variant='outline'
                className='min-h-11'
                disabled={(meta.currentPage ?? 1) <= 1}
                onClick={() => applyFilters((meta.currentPage ?? 1) - 1)}>
                Previous
              </Button>
              <span className='text-sm text-muted-foreground'>
                Page {meta.currentPage} of {meta.lastPage}
              </span>
              <Button
                variant='outline'
                className='min-h-11'
                disabled={(meta.currentPage ?? 1) >= meta.lastPage}
                onClick={() => applyFilters((meta.currentPage ?? 1) + 1)}>
                Next
              </Button>
            </div>
          )}
        </AppCard>
      </div>
    </DashboardLayout>
  )
}
