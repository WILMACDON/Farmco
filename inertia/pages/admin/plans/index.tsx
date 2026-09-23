import { Head, Link, router } from '@inertiajs/react'
import { Plus, Trash2 } from 'lucide-react'
import type { PaginatedResponse } from '#types/extra'
import { type Column, DataTable } from '@/components/dashboard/data-table'
import { DashboardLayout } from '@/components/dashboard/layout'
import { AppCard } from '@/components/ui/app-card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { HStack } from '@/components/ui/hstack'

interface Plan {
  id: string
  name: string
  description: string | null
  priceMonthly: number
  priceYearly: number
  isActive: boolean
  isRecommended: boolean
  created_at: string
}

const handleDelete = (id: string) => {
  if (confirm('Are you sure you want to delete this plan?')) {
    router.delete(`/admin/plans/${id}`)
  }
}

const columns: Column<Plan>[] = [
  {
    key: 'name',
    header: 'Name',
    cell: (row: Plan) => (
      <div>
        <div className='font-medium'>{row.name}</div>
        {row.description && <div className='text-xs text-muted-foreground'>{row.description}</div>}
      </div>
    ),
  },
  {
    key: 'priceMonthly',
    header: 'Monthly Price',
    cell: (row: Plan) => <span>${row.priceMonthly}</span>,
  },
  {
    key: 'priceYearly',
    header: 'Yearly Price',
    cell: (row: Plan) => <span>${row.priceYearly}</span>,
  },
  {
    key: 'isActive',
    header: 'Status',
    cell: (row: Plan) => (
      <div className='flex gap-2'>
        <Badge variant={row.isActive ? 'default' : 'secondary'}>
          {row.isActive ? 'Active' : 'Inactive'}
        </Badge>
        {row.isRecommended && (
          <Badge variant='outline' className='border-primary text-primary'>
            Recommended
          </Badge>
        )}
      </div>
    ),
  },
  {
    key: 'actions',
    header: '',
    cell: (row: Plan) => (
      <div className='flex items-center gap-2'>
        <Button variant='ghost' size='sm' asChild>
          <Link href={`/admin/plans/${row.id}/edit`}>Edit</Link>
        </Button>
        <Button
          variant='ghost'
          size='sm'
          className='text-destructive hover:text-destructive hover:bg-destructive/10'
          onClick={() => handleDelete(row.id)}>
          <Trash2 className='h-4 w-4' />
        </Button>
      </div>
    ),
  },
]

export default function PlansIndex({ plans }: { plans: PaginatedResponse<Plan> }) {
  return (
    <DashboardLayout>
      <Head title='Plans' />
      <div className='space-y-6'>
        <HStack justify='between' align='center'>
          <div>
            <h1 className='text-3xl font-bold tracking-tight'>Plans</h1>
            <p className='text-muted-foreground'>Manage subscription plans.</p>
          </div>
          <Button asChild>
            <Link href='/admin/plans/create'>
              <Plus className='mr-2 h-4 w-4' />
              Create Plan
            </Link>
          </Button>
        </HStack>

        <AppCard title='All Plans' description='List of all subscription plans'>
          <DataTable columns={columns} data={plans.data} emptyMessage='No plans found.' />
        </AppCard>
      </div>
    </DashboardLayout>
  )
}
