import { Head, router } from '@inertiajs/react'
import { Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { DashboardLayout } from '@/components/dashboard/layout'
import { PageHeader } from '@/components/dashboard/page_header'
import { StatusBadge } from '@/components/farm/status-badge'
import { SyncIndicator } from '@/components/farm/sync-indicator'
import { AppCard } from '@/components/ui/app-card'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { FormField } from '@/components/ui/form_field'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { farmMutate, formatDateTime, formatEggSize, formatNumber } from '@/lib/farm-api'

type OrderStatus = 'pending' | 'approved' | 'sold' | 'cancelled'
type EggSize = 'small' | 'medium' | 'large'

interface OrderItem {
  id?: string
  size: EggSize
  crates: number
}

interface FarmOrder {
  id: string
  customerName: string
  contact: string | null
  status: OrderStatus
  orderDate: string
  deliveryDate: string | null
  soldAt: string | null
  items?: OrderItem[]
  creator?: { fullName?: string | null; email?: string | null } | null
}

interface OrdersMeta {
  total: number
  perPage: number
  currentPage: number
  lastPage: number
}

interface OrdersPageProps {
  orders: FarmOrder[]
  meta: OrdersMeta
  filters: {
    status?: OrderStatus
    search?: string
    customer?: string
    from?: string
    to?: string
    page?: number
    perPage?: number
  }
  farmRole: string
  canApprove: boolean
}

interface DraftItem {
  size: EggSize
  crates: string
}

export default function OrdersPage({
  orders,
  meta,
  filters,
  canApprove,
  farmRole,
}: OrdersPageProps) {
  const [search, setSearch] = useState(filters.search || filters.customer || '')
  const [status, setStatus] = useState<string>(filters.status || 'all')
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [customerName, setCustomerName] = useState('')
  const [contact, setContact] = useState('')
  const [items, setItems] = useState<DraftItem[]>([{ size: 'large', crates: '1' }])
  const [isSaving, setIsSaving] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)

  function applyFilters(next?: { status?: string; search?: string; page?: number }) {
    const params: Record<string, string> = {}
    const nextStatus = next?.status ?? status
    const nextSearch = next?.search ?? search
    if (nextStatus && nextStatus !== 'all') params.status = nextStatus
    if (nextSearch.trim()) params.search = nextSearch.trim()
    if (next?.page && next.page > 1) params.page = String(next.page)
    router.get('/orders', params, { preserveState: true, replace: true })
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    const parsedItems = items
      .map((item) => ({ size: item.size, crates: Number(item.crates) }))
      .filter((item) => Number.isInteger(item.crates) && item.crates > 0)
    if (!customerName.trim() || parsedItems.length === 0) return

    setIsSaving(true)
    const ok = await farmMutate({
      path: '/farm/orders',
      data: {
        customerName: customerName.trim(),
        contact: contact.trim() || null,
        items: parsedItems,
      },
      offlineType: 'orders',
      successMessage: 'Order created.',
      errorFallback: 'Unable to create order.',
    })
    setIsSaving(false)
    if (ok) {
      setIsCreateOpen(false)
      setCustomerName('')
      setContact('')
      setItems([{ size: 'large', crates: '1' }])
    }
  }

  async function runOrderAction(orderId: string, action: 'approve' | 'cancel' | 'sold') {
    setBusyId(orderId)
    await farmMutate({
      path: `/farm/orders/${orderId}/${action}`,
      successMessage:
        action === 'approve'
          ? 'Order approved.'
          : action === 'cancel'
            ? 'Order cancelled.'
            : 'Order marked as sold.',
      errorFallback: 'Unable to update order.',
    })
    setBusyId(null)
  }

  const statusOptions =
    farmRole === 'worker'
      ? (['all', 'pending', 'approved'] as const)
      : (['all', 'pending', 'approved', 'sold', 'cancelled'] as const)

  return (
    <DashboardLayout>
      <Head title='Orders' />
      <div className='space-y-6 pb-20 md:pb-0'>
        <PageHeader
          title='Orders'
          description='Customer egg orders and fulfilment.'
          actions={
            <div className='flex flex-wrap items-center gap-2'>
              <SyncIndicator />
              <Button
                size='lg'
                className='min-h-11'
                leftIcon={<Plus className='h-4 w-4' />}
                onClick={() => setIsCreateOpen(true)}>
                New order
              </Button>
            </div>
          }
        />

        <AppCard title='Filters'>
          <form
            className='flex flex-col gap-3 sm:flex-row sm:items-end'
            onSubmit={(e) => {
              e.preventDefault()
              applyFilters()
            }}>
            <FormField label='Search' className='flex-1'>
              <Input
                className='min-h-11'
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder='Customer name'
              />
            </FormField>
            <FormField label='Status' className='sm:w-44'>
              <Select
                value={status}
                onValueChange={(v) => {
                  const next = v || 'all'
                  setStatus(next)
                  applyFilters({ status: next })
                }}>
                <SelectTrigger className='min-h-11 w-full h-auto'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((opt) => (
                    <SelectItem key={opt} value={opt}>
                      {opt === 'all' ? 'All' : opt.charAt(0).toUpperCase() + opt.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
            <Button type='submit' variant='outline' className='min-h-11'>
              Apply
            </Button>
          </form>
        </AppCard>

        <AppCard title='Orders' description={`${formatNumber(meta?.total ?? orders.length)} total`}>
          {orders.length === 0 ? (
            <p className='text-sm text-muted-foreground'>No orders match these filters.</p>
          ) : (
            <div className='space-y-4'>
              {orders.map((order) => {
                const crates = (order.items ?? []).reduce((sum, i) => sum + i.crates, 0)
                return (
                  <div
                    key={order.id}
                    className='rounded-[var(--radius-card)] border border-border p-4'>
                    <div className='flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between'>
                      <div className='space-y-1'>
                        <div className='flex flex-wrap items-center gap-2'>
                          <p className='font-medium'>{order.customerName}</p>
                          <StatusBadge status={order.status} />
                        </div>
                        <p className='text-sm text-muted-foreground'>
                          {formatDateTime(order.orderDate)}
                          {order.contact ? ` · ${order.contact}` : ''}
                          {` · ${formatNumber(crates)} crates`}
                        </p>
                        <p className='text-sm'>
                          {(order.items ?? [])
                            .map((i) => `${formatEggSize(i.size)} × ${i.crates}`)
                            .join(' · ') || 'No items'}
                        </p>
                      </div>
                      {canApprove && (
                        <div className='flex flex-wrap gap-2'>
                          {order.status === 'pending' && (
                            <>
                              <Button
                                className='min-h-11'
                                isLoading={busyId === order.id}
                                onClick={() => runOrderAction(order.id, 'approve')}>
                                Approve
                              </Button>
                              <Button
                                variant='outline'
                                className='min-h-11'
                                disabled={busyId === order.id}
                                onClick={() => runOrderAction(order.id, 'cancel')}>
                                Cancel
                              </Button>
                            </>
                          )}
                          {order.status === 'approved' && (
                            <>
                              <Button
                                className='min-h-11 bg-accent text-accent-foreground hover:bg-accent/90'
                                isLoading={busyId === order.id}
                                onClick={() => runOrderAction(order.id, 'sold')}>
                                Mark sold
                              </Button>
                              <Button
                                variant='outline'
                                className='min-h-11'
                                disabled={busyId === order.id}
                                onClick={() => runOrderAction(order.id, 'cancel')}>
                                Cancel
                              </Button>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {(meta?.lastPage ?? 1) > 1 && (
            <div className='mt-4 flex items-center justify-between gap-2'>
              <Button
                variant='outline'
                className='min-h-11'
                disabled={(meta.currentPage ?? 1) <= 1}
                onClick={() => applyFilters({ page: (meta.currentPage ?? 1) - 1 })}>
                Previous
              </Button>
              <span className='text-sm text-muted-foreground'>
                Page {meta.currentPage} of {meta.lastPage}
              </span>
              <Button
                variant='outline'
                className='min-h-11'
                disabled={(meta.currentPage ?? 1) >= meta.lastPage}
                onClick={() => applyFilters({ page: (meta.currentPage ?? 1) + 1 })}>
                Next
              </Button>
            </div>
          )}
        </AppCard>
      </div>

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className='max-w-lg'>
          <DialogHeader>
            <DialogTitle>New order</DialogTitle>
            <DialogDescription>Create a pending egg order for a customer.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className='space-y-4'>
            <FormField label='Customer name' required>
              <Input
                className='min-h-11'
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                required
              />
            </FormField>
            <FormField label='Contact'>
              <Input
                className='min-h-11'
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                placeholder='Phone or note'
              />
            </FormField>
            <div className='space-y-3'>
              <p className='text-sm font-medium'>Items</p>
              {items.map((item, index) => (
                <div key={`${item.size}-${index}`} className='flex gap-2'>
                  <Select
                    value={item.size}
                    onValueChange={(v) =>
                      setItems((prev) =>
                        prev.map((row, i) =>
                          i === index ? { ...row, size: (v || 'large') as EggSize } : row,
                        ),
                      )
                    }>
                    <SelectTrigger className='min-h-11 w-32 h-auto'>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='small'>Small</SelectItem>
                      <SelectItem value='medium'>Medium</SelectItem>
                      <SelectItem value='large'>Large</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    type='number'
                    min={1}
                    className='min-h-11'
                    value={item.crates}
                    onChange={(e) =>
                      setItems((prev) =>
                        prev.map((row, i) =>
                          i === index ? { ...row, crates: e.target.value } : row,
                        ),
                      )
                    }
                    placeholder='Crates'
                    required
                  />
                  {items.length > 1 && (
                    <Button
                      type='button'
                      variant='ghost'
                      size='icon'
                      className='min-h-11 min-w-11'
                      aria-label='Remove item'
                      onClick={() => setItems((prev) => prev.filter((_, i) => i !== index))}>
                      <Trash2 className='h-4 w-4' />
                    </Button>
                  )}
                </div>
              ))}
              <Button
                type='button'
                variant='outline'
                className='min-h-11'
                onClick={() => setItems((prev) => [...prev, { size: 'large', crates: '1' }])}>
                Add size
              </Button>
            </div>
            <DialogFooter>
              <Button
                type='button'
                variant='outline'
                className='min-h-11'
                onClick={() => setIsCreateOpen(false)}>
                Cancel
              </Button>
              <Button type='submit' className='min-h-11' isLoading={isSaving}>
                Create order
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  )
}
