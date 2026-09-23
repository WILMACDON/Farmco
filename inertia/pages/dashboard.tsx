import { ActivityLogs } from '@/components/dashboard/activity-logs'
import { DashboardLayout } from '@/components/dashboard/layout'
import { PageHeader } from '@/components/dashboard/page_header'
import { AppCard } from '@/components/ui/app-card'
import { Button } from '@/components/ui/button'
import { SimpleGrid } from '@/components/ui/simplegrid'
import { StatCard } from '@/components/ui/stat-card'
import { Head } from '@inertiajs/react'
import { Activity, ArrowUpRight, BarChart3, CreditCard, TrendingUp, Users } from 'lucide-react'

const stats = [
  {
    title: 'Total Revenue',
    value: '$45,231.89',
    change: '+20.1%',
    icon: CreditCard,
  },
  {
    title: 'Subscriptions',
    value: '+2,350',
    change: '+180.1%',
    icon: Users,
  },
  {
    title: 'Sales',
    value: '+12,234',
    change: '+19%',
    icon: BarChart3,
  },
  {
    title: 'Active Now',
    value: '+573',
    change: '+201',
    icon: Activity,
  },
]

export default function Dashboard() {
  return (
    <DashboardLayout>
      <Head title='Dashboard' />
      <div className='space-y-6'>
        <PageHeader
          title='Welcome back!'
          description="Here's what's happening with your business today."
          actions={<Button leftIcon={<TrendingUp className='h-4 w-4' />}>Download Report</Button>}
        />

        <SimpleGrid cols={{ base: 1, md: 2, lg: 4 }} spacing={4}>
          {stats.map((stat) => (
            <StatCard
              key={stat.title}
              title={stat.title}
              value={stat.value}
              icon={stat.icon}
            >
              <p className='text-xs text-muted-foreground flex items-center gap-1 mt-1'>
                <ArrowUpRight className='h-3 w-3 text-green-500' />
                <span className='text-green-500'>{stat.change}</span> from last month
              </p>
            </StatCard>
          ))}
        </SimpleGrid>

        <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-7'>
          <AppCard title='Overview' className='col-span-4'>
            <div className='h-[300px] flex items-center justify-center bg-muted/50 rounded-lg'>
              <div className='text-center text-muted-foreground'>
                <BarChart3 className='h-12 w-12 mx-auto mb-2 opacity-50' />
                <p>Chart placeholder</p>
              </div>
            </div>
          </AppCard>

          <ActivityLogs />
        </div>
      </div>
    </DashboardLayout>
  )
}
