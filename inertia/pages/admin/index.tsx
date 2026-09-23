import type { PaginatedResponse } from '#types/extra'
import { DataTable, type Column } from '@/components/dashboard/data-table'
import { DashboardLayout } from '@/components/dashboard/layout'
import { AppCard } from '@/components/ui/app-card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { HStack } from '@/components/ui/hstack'
import { SimpleGrid } from '@/components/ui/simplegrid'
import { StatCard } from '@/components/ui/stat-card'
import { timeAgo } from '@/lib/date'
import type { SharedProps } from '@adonisjs/inertia/types'
import { Head, Link } from '@inertiajs/react'
import { Activity, Users } from 'lucide-react'

type ActivityRow = {
  id: string
  event: string
  auditable_type: string
  auditable_id: string
  user_id: string | null
  user_email: string | null
  user_full_name: string | null
  created_at: string | null
}

const activityColumns: Column<ActivityRow>[] = [
  {
    key: 'event',
    header: 'Event',
    cell: (row: ActivityRow) => <Badge variant="secondary">{row.event}</Badge>,
  },
  {
    key: 'auditable_type',
    header: 'Type',
    cell: (row: ActivityRow) => <div className="text-muted-foreground">{row.auditable_type}</div>,
  },
  {
    key: 'user',
    header: 'User',
    cell: (row: ActivityRow) => <div className="text-muted-foreground">{row.user_full_name}</div>,
  },
  {
    key: 'created_at',
    header: 'When',
    cell: (row: ActivityRow) => (
      <div className="text-right text-muted-foreground">
        {row.created_at ? timeAgo(row.created_at) : '—'}
      </div>
    ),
  },
]

interface AdminIndexProps extends SharedProps {
  stats: {
    totalUsers: number
    totalActivity: number
  }
  activities: PaginatedResponse<ActivityRow>
}

export default function AdminIndex({ stats, activities }: AdminIndexProps) {
  return (
    <DashboardLayout>
      <Head title='Admin' />
      <div className='space-y-6'>
        <HStack justify='between' align='center' className='flex-col sm:flex-row gap-4'>
          <div>
            <h1 className='text-3xl font-bold tracking-tight'>Overview</h1>
            <p className='text-muted-foreground'>Manage users and monitor platform activity.</p>
          </div>
          <Button asChild>
            <Link href='/admin/users'>View users</Link>
          </Button>
        </HStack>

        <SimpleGrid cols={{ base: 1, md: 2 }} spacing={6}>
          <StatCard
            title='Total users'
            value={stats.totalUsers}
            description='All accounts in the system.'
            icon={Users}
          />
          <StatCard
            title='Total activity'
            value={stats.totalActivity}
            description='All audit events recorded.'
            icon={Activity}
          />
        </SimpleGrid>

        <AppCard title='Recent activity' description='Latest audit events across the platform.'>
          <DataTable
            columns={activityColumns}
            data={activities.data}
            emptyMessage='No activity yet.'
          />
          <HStack justify='between' align='center' className='mt-4'>
            <div className='text-sm text-muted-foreground'>
              Page {activities.meta.currentPage} of {activities.meta.lastPage}
            </div>
            <Button variant='outline' asChild>
              <Link href='/admin/users'>Manage users</Link>
            </Button>
          </HStack>
        </AppCard>
      </div>
    </DashboardLayout>
  )
}
