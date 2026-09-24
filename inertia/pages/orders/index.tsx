import { Head, router } from '@inertiajs/react'
import { Check, EllipsisVertical, Pencil, Plus, ShoppingBag, Trash2, X } from 'lucide-react'
import { useState } from 'react'
import { DashboardLayout } from '@/components/dashboard/layout'
import { PageHeader } from '@/components/dashboard/page_header'
import { StatusBadge } from '@/components/farm/status-badge'
import { SyncIndicator } from '@/components/farm/sync-indicator'
import { AppCard } from '@/components/ui/app-card'
import { Button } from '@/components/ui/button'
import { DatePicker } from '@/components/ui/date-picker'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
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
import {
  farmMutate,
  formatDate,
  formatDateTime,
  formatEggSize,
  formatNumber,
  formatOrderRef,
} from '@/lib/farm-api'

type OrderStatus = 'pending' | 'approved' | 'sold' | 'cancelled'
type EggSize = 'small' | 'medium' | 'large'
type RecurringInterval = 'weekly' | 'biweekly' | 'monthly'

interface OrderItem {
  id?: string
  size: EggSize
  crates: number
}

interface FarmOrder {
  id: string
  orderNumber: number
  customerName: string
  contact: string | null
  status: OrderStatus
  orderDate: string
  deliveryDate: string | null
  recurringInterval: RecurringInterval | null
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

const emptyDraft: DraftItem[] = [{ size: 'large', crates: '1' }]

const recurringLabels: Record<RecurringInterval, string> = {
  weekly: 'Weekly',
  biweekly: 'Every 2 weeks',
  monthly: 'Monthly',
}

function canEditOrder(status: OrderStatus) {
  return status === 'pending' || status === 'approved'
}

function toDateInputValue(value: string | null | undefined) {
  if (!value) return ''
  if (value.length >= 10) return value.slice(0, 10)
  return value
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
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingOrder, setEditingOrder] = useState<FarmOrder | null>(null)
  const [customerName, setCustomerName] = useState('')
  const [contact, setContact] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [recurring, setRecurring] = useState<string>('none')
  const [items, setItems] = useState<DraftItem[]>(emptyDraft)
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

  function openCreate() {
    setEditingOrder(null)
    setCustomerName('')
    setContact('')
    setDueDate('')
    setRecurring('none')
    setItems(emptyDraft)
    setIsFormOpen(true)
  }

  function openEdit(order: FarmOrder) {
    setEditingOrder(order)
    setCustomerName(order.customerName)
    setContact(order.contact || '')
    setDueDate(toDateInputValue(order.deliveryDate))
    setRecurring(order.recurringInterval || 'none')
    setItems(
      (order.items ?? []).length > 0
        ? (order.items ?? []).map((item) => ({ size: item.size, crates: String(item.crates) }))
        : emptyDraft,
    )
    setIsFormOpen(true)
  }

  function closeForm() {
    setIsFormOpen(false)
    setEditingOrder(null)
    setCustomerName('')
    setContact('')
    setDueDate('')
    setRecurring('none')
    setItems(emptyDraft)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const parsedItems = items
      .map((item) => ({ size: item.size, crates: Number(item.crates) }))
      .filter((item) => Number.isInteger(item.crates) && item.crates > 0)
    if (!customerName.trim() || parsedItems.length === 0) return

    setIsSaving(true)
    const payload = {
      customerName: customerName.trim(),
      contact: contact.trim() || null,
      deliveryDate: dueDate.trim() || null,
      recurringInterval: recurring === 'none' ? null : (recurring as RecurringInterval),
      items: parsedItems,
    }

    const ok = editingOrder
      ? await farmMutate({
          path: `/farm/orders/${editingOrder.id}`,
          method: 'put',
          data: payload,
          successMessage: 'Order updated.',
          errorFallback: 'Unable to update order.',
        })
      : await farmMutate({
          path: '/farm/orders',
          data: payload,
          offlineType: 'orders',
          successMessage: 'Order created.',
          errorFallback: 'Unable to create order.',
        })

    setIsSaving(false)
    if (ok) closeForm()
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
                onClick={openCreate}>
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
                placeholder='Customer or ORD-12'
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
            <div className='overflow-x-auto'>
              <table className='w-full min-w-[800px] text-sm'>
                <thead>
                  <tr className='border-b border-border text-left text-muted-foreground'>
                    <th className='pb-2 pr-3 font-medium'>Order</th>
                    <th className='pb-2 pr-3 font-medium'>Customer</th>
                    <th className='pb-2 pr-3 font-medium'>Status</th>
                    <th className='pb-2 pr-3 font-medium'>Items</th>
                    <th className='pb-2 pr-3 font-medium'>Crates</th>
                    <th className='pb-2 pr-3 font-medium'>Ordered</th>
                    <th className='pb-2 pr-3 font-medium'>Due</th>
                    <th className='pb-2 w-12 font-medium'>
                      <span className='sr-only'>Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => {
                    const crates = (order.items ?? []).reduce((sum, i) => sum + i.crates, 0)
                    const editable = canEditOrder(order.status)
                    const canApprovePending = canApprove && order.status === 'pending'
                    const canMarkSold = canApprove && order.status === 'approved'
                    const canCancel =
                      canApprove && (order.status === 'pending' || order.status === 'approved')
                    const hasActions = editable || canApprovePending || canMarkSold || canCancel
                    const isBusy = busyId === order.id

                    return (
                      <tr key={order.id} className='border-b border-border/70 align-middle'>
                        <td className='py-3 pr-3 whitespace-nowrap'>
                          <span className='font-display font-semibold text-primary'>
                            {formatOrderRef(order.orderNumber)}
                          </span>
                          {order.recurringInterval ? (
                            <span className='mt-1 block text-xs text-muted-foreground'>
                              {recurringLabels[order.recurringInterval]}
                            </span>
                          ) : null}
                        </td>
                        <td className='py-3 pr-3'>
                          <span className='font-medium'>{order.customerName}</span>
                          {order.contact ? (
                            <span className='mt-1 block text-xs text-muted-foreground'>
                              {order.contact}
                            </span>
                          ) : null}
                        </td>
                        <td className='py-3 pr-3'>
                          <StatusBadge status={order.status} />
                        </td>
                        <td className='py-3 pr-3 max-w-[200px]'>
                          {(order.items ?? [])
                            .map((i) => `${formatEggSize(i.size)} × ${i.crates}`)
                            .join(', ') || '—'}
                        </td>
                        <td className='py-3 pr-3 whitespace-nowrap'>{formatNumber(crates)}</td>
                        <td className='py-3 pr-3 text-muted-foreground whitespace-nowrap'>
                          {formatDateTime(order.orderDate)}
                        </td>
                        <td className='py-3 pr-3 text-muted-foreground whitespace-nowrap'>
                          {order.deliveryDate ? formatDate(order.deliveryDate) : '—'}
                        </td>
                        <td className='py-3'>
                          {hasActions ? (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant='ghost'
                                  size='icon'
                                  className='min-h-11 min-w-11'
                                  disabled={isBusy}
                                  aria-label={`Actions for ${formatOrderRef(order.orderNumber)}`}>
                                  <EllipsisVertical className='h-4 w-4' />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align='end' className='min-w-44'>
                                {editable && (
                                  <DropdownMenuItem
                                    className='cursor-pointer gap-2'
                                    disabled={isBusy}
                                    onClick={() => openEdit(order)}>
                                    <Pencil className='size-4' />
                                    Edit
                                  </DropdownMenuItem>
                                )}
                                {canApprovePending && (
                                  <DropdownMenuItem
                                    className='cursor-pointer gap-2'
                                    disabled={isBusy}
                                    onClick={() => runOrderAction(order.id, 'approve')}>
                                    <Check className='size-4' />
                                    Approve
                                  </DropdownMenuItem>
                                )}
                                {canMarkSold && (
                                  <DropdownMenuItem
                                    className='cursor-pointer gap-2'
                                    disabled={isBusy}
                                    onClick={() => runOrderAction(order.id, 'sold')}>
                                    <ShoppingBag className='size-4' />
                                    Mark sold
                                  </DropdownMenuItem>
                                )}
                                {canCancel && (
                                  <>
                                    {(editable || canApprovePending || canMarkSold) && (
                                      <DropdownMenuSeparator />
                                    )}
                                    <DropdownMenuItem
                                      variant='destructive'
                                      className='cursor-pointer gap-2'
                                      disabled={isBusy}
                                      onClick={() => runOrderAction(order.id, 'cancel')}>
                                      <X className='size-4' />
                                      Cancel
                                    </DropdownMenuItem>
                                  </>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          ) : (
                            <span className='text-muted-foreground'>—</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
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

      <Dialog
        open={isFormOpen}
        onOpenChange={(open) => {
          if (!open) closeForm()
          else setIsFormOpen(true)
        }}>
        <DialogContent className='max-w-lg'>
          <DialogHeader>
            <DialogTitle>{editingOrder ? 'Edit order' : 'New order'}</DialogTitle>
            <DialogDescription>
              {editingOrder
                ? 'Update customer details, due date, or egg sizes before the order is sold.'
                : 'Create a pending egg order. Add an optional due date or make it recurring.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className='space-y-4'>
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
            <div className='grid gap-4 sm:grid-cols-2'>
              <FormField label='Due date'>
                <DatePicker
                  value={dueDate || null}
                  onChange={(value) => setDueDate(value)}
                  clearable
                  placeholder='Optional'
                  buttonClassName='min-h-11'
                />
              </FormField>
              <FormField label='Recurring'>
                <Select value={recurring} onValueChange={(v) => setRecurring(v || 'none')}>
                  <SelectTrigger className='min-h-11 w-full h-auto'>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='none'>Does not repeat</SelectItem>
                    <SelectItem value='weekly'>Weekly</SelectItem>
                    <SelectItem value='biweekly'>Every 2 weeks</SelectItem>
                    <SelectItem value='monthly'>Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </FormField>
            </div>
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
              <Button type='button' variant='outline' className='min-h-11' onClick={closeForm}>
                Cancel
              </Button>
              <Button type='submit' className='min-h-11' isLoading={isSaving}>
                {editingOrder ? 'Save changes' : 'Create order'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  )
}
