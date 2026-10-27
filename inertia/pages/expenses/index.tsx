import { Head, router, usePage } from '@inertiajs/react'
import { Download, Plus } from 'lucide-react'
import { useState } from 'react'
import { DashboardLayout } from '@/components/dashboard/layout'
import { PageHeader } from '@/components/dashboard/page_header'
import { SyncIndicator } from '@/components/farm/sync-indicator'
import { AppCard } from '@/components/ui/app-card'
import { BaseModal } from '@/components/ui/base-modal'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
import { farmMutate, formatDateTime, formatNaira, formatNumber } from '@/lib/farm-api'
import { cn } from '@/lib/utils'

type ExpenseCategory =
  | 'feed'
  | 'medication'
  | 'labour'
  | 'transport'
  | 'utilities'
  | 'equipment'
  | 'housing'
  | 'packaging'
  | 'marketing'
  | 'other'

const CATEGORY_OPTIONS: Array<{ value: ExpenseCategory; label: string }> = [
  { value: 'feed', label: 'Feed' },
  { value: 'medication', label: 'Medication' },
  { value: 'labour', label: 'Labour' },
  { value: 'transport', label: 'Transport' },
  { value: 'utilities', label: 'Utilities' },
  { value: 'equipment', label: 'Equipment' },
  { value: 'housing', label: 'Housing' },
  { value: 'packaging', label: 'Packaging' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'other', label: 'Other' },
]

interface ExpenseRecordRow {
  id: string
  category: ExpenseCategory
  customType: string | null
  typeLabel: string
  amount: number
  note: string | null
  recordedAt: string
  userName: string | null
}

interface ExpenseSummary {
  totalAmount: number
  count: number
  averageDaily: number | null
  topCategory: { category: ExpenseCategory; label: string; amount: number } | null
  byCategory: Array<{ category: ExpenseCategory; label: string; amount: number; count: number }>
  range: { preset: string; from: string; to: string }
}

interface ExpensesPageProps {
  summary: ExpenseSummary
  records: ExpenseRecordRow[]
  filters: { range?: string; from?: string; to?: string }
  farmRole: string
}

function SimpleBar({ label, value, max }: { label: string; value: number; max: number }) {
  const width = max > 0 ? Math.max(4, Math.round((value / max) * 100)) : 0
  return (
    <div className='space-y-1'>
      <div className='flex items-center justify-between text-sm'>
        <span>{label}</span>
        <span className='font-medium'>{formatNaira(value)}</span>
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

function exportUrl(format: 'csv' | 'pdf', range: string) {
  const params = new URLSearchParams({ format, range })
  return `/api/v1/farm/expenses/export?${params.toString()}`
}

export default function ExpensesPage() {
  const { props } = usePage<ExpensesPageProps>()
  const { summary, records, filters } = props
  const range = filters.range || '7d'

  const [isFormOpen, setIsFormOpen] = useState(false)
  const [category, setCategory] = useState<ExpenseCategory>('feed')
  const [customType, setCustomType] = useState('')
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  function resetForm() {
    setCategory('feed')
    setCustomType('')
    setAmount('')
    setNote('')
  }

  function openForm() {
    resetForm()
    setIsFormOpen(true)
  }

  function closeForm() {
    setIsFormOpen(false)
    resetForm()
  }

  function setRange(next: string) {
    router.get('/expenses', { range: next }, { preserveState: true, replace: true })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const amountNum = Number(amount)
    if (!amountNum || amountNum < 0.01) return
    if (category === 'other' && !customType.trim()) return

    setIsSaving(true)
    const ok = await farmMutate({
      path: '/farm/expenses',
      data: {
        category,
        customType: category === 'other' ? customType.trim() : null,
        amount: amountNum,
        note: note.trim() || null,
      },
      offlineType: 'expenses',
      successMessage: 'Expense recorded.',
      errorFallback: 'Unable to record expense.',
    })
    setIsSaving(false)
    if (ok) closeForm()
  }

  const categoryMax = Math.max(1, ...summary.byCategory.map((c) => c.amount))

  return (
    <DashboardLayout>
      <Head title='Expenses' />
      <div className='space-y-6 pb-20 md:pb-0'>
        <PageHeader
          title='Expenses'
          description='Track farm costs in naira and download period reports.'
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
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant='outline' className='min-h-11'>
                    <Download className='mr-2 h-4 w-4' />
                    Download
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align='end'>
                  <DropdownMenuItem asChild>
                    <a href={exportUrl('csv', range)}>CSV spreadsheet</a>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <a href={exportUrl('pdf', range)}>PDF report</a>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button className='min-h-11' onClick={openForm}>
                <Plus className='mr-2 h-4 w-4' />
                Add expense
              </Button>
            </div>
          }
        />

        <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing={4}>
          <StatCard title='Total spent' value={formatNaira(summary.totalAmount)} />
          <StatCard title='Entries' value={formatNumber(summary.count)} />
          <StatCard
            title='Daily average'
            value={summary.averageDaily != null ? formatNaira(summary.averageDaily) : '—'}
          />
          <StatCard title='Top category' value={summary.topCategory?.label ?? '—'}>
            {summary.topCategory ? (
              <p className='mt-2 text-sm text-muted-foreground'>
                {formatNaira(summary.topCategory.amount)}
              </p>
            ) : null}
          </StatCard>
        </SimpleGrid>

        <SimpleGrid cols={{ base: 1, md: 2 }} spacing={4}>
          <AppCard title='Spend by type'>
            {summary.byCategory.length === 0 ? (
              <p className='text-sm text-muted-foreground'>No expenses in this period.</p>
            ) : (
              <div className='space-y-3'>
                {summary.byCategory.map((item) => (
                  <SimpleBar
                    key={item.category}
                    label={item.label}
                    value={item.amount}
                    max={categoryMax}
                  />
                ))}
              </div>
            )}
          </AppCard>

          <AppCard title='Period'>
            <p className='text-sm text-muted-foreground'>
              Showing expenses from {summary.range.from} to {summary.range.to}.
            </p>
          </AppCard>
        </SimpleGrid>

        <AppCard title='Expense records'>
          {records.length === 0 ? (
            <p className='text-sm text-muted-foreground'>No expenses recorded for this period.</p>
          ) : (
            <div className='overflow-x-auto'>
              <table className='w-full min-w-[560px] text-sm'>
                <thead>
                  <tr className='border-b border-border text-left text-muted-foreground'>
                    <th className='pb-2 pr-3 font-medium'>When</th>
                    <th className='pb-2 pr-3 font-medium'>Type</th>
                    <th className='pb-2 pr-3 font-medium'>Amount</th>
                    <th className='pb-2 pr-3 font-medium'>Note</th>
                    <th className='pb-2 font-medium'>By</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((row) => (
                    <tr key={row.id} className='border-b border-border/70'>
                      <td className='py-3 pr-3 text-muted-foreground'>
                        {formatDateTime(row.recordedAt)}
                      </td>
                      <td className='py-3 pr-3 font-medium'>{row.typeLabel}</td>
                      <td className='py-3 pr-3 font-medium'>{formatNaira(row.amount)}</td>
                      <td className='py-3 pr-3 text-muted-foreground'>{row.note || '—'}</td>
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
        open={isFormOpen}
        onOpenChange={(open) => {
          if (!open) closeForm()
        }}
        title='Add expense'
        description='Record a farm cost in naira.'
        primaryText='Save expense'
        secondaryText='Cancel'
        isLoading={isSaving}
        className='max-w-md'>
        <form onSubmit={handleSubmit} className='space-y-4'>
          <FormField label='Type' required>
            <Select
              value={category}
              onValueChange={(v) => setCategory((v || 'feed') as ExpenseCategory)}>
              <SelectTrigger className='min-h-11 w-full h-auto'>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORY_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>

          {category === 'other' && (
            <FormField label='Custom type' required>
              <Input
                className='min-h-11'
                value={customType}
                onChange={(e) => setCustomType(e.target.value)}
                placeholder='e.g. Security, Vet visit'
                required
              />
            </FormField>
          )}

          <FormField label='Amount (₦)' required>
            <Input
              type='number'
              min={0.01}
              step='0.01'
              className='min-h-11'
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder='0.00'
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
