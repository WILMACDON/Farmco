import { Head } from '@inertiajs/react'
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Database,
  HardDrive,
  Server,
  XCircle,
} from 'lucide-react'
import { PublicLayout } from '@/components/layouts/public'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { SimpleGrid } from '@/components/ui/simplegrid'
import { StatCard } from '@/components/ui/stat-card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'

interface Check {
  name: string
  isCached: boolean
  message: string
  status: 'ok' | 'warning' | 'error'
  finishedAt: string
  meta?: any
}

interface HealthReport {
  isHealthy: boolean
  status: 'ok' | 'warning' | 'error'
  finishedAt: string
  debugInfo: {
    pid: number
    ppid: number
    platform: string
    uptime: number
    version: string
  }
  checks: Check[]
}

interface StatusPageProps {
  status: HealthReport
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'ok':
      return 'bg-green-500/10 text-green-500 hover:bg-green-500/20 border-green-500/20'
    case 'warning':
      return 'bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20 border-yellow-500/20'
    case 'error':
      return 'bg-red-500/10 text-red-500 hover:bg-red-500/20 border-red-500/20'
    default:
      return 'bg-gray-500/10 text-gray-500 hover:bg-gray-500/20 border-gray-500/20'
  }
}

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'ok':
      return <CheckCircle2 className='h-4 w-4' />
    case 'warning':
      return <AlertTriangle className='h-4 w-4' />
    case 'error':
      return <XCircle className='h-4 w-4' />
    default:
      return <Activity className='h-4 w-4' />
  }
}

const getPlatformName = (platform: string) => {
  switch (platform) {
    case 'darwin':
      return 'macOS'
    case 'win32':
      return 'Windows'
    case 'linux':
      return 'Linux'
    default:
      return platform
  }
}

const formatUptime = (seconds: number) => {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  return `${hours}h ${minutes}m`
}

export default function StatusPage({ status }: StatusPageProps) {
  return (
    <PublicLayout>
      <Head title='System Status' />

      <div className='container mx-auto py-10 max-w-5xl space-y-8'>
        <div className='flex items-center justify-between'>
          <div>
            <h1 className='text-3xl font-bold tracking-tight'>System Status</h1>
            <p className='text-muted-foreground mt-2'>
              Current system health and performance metrics
            </p>
          </div>
          <Badge
            variant='outline'
            className={cn('px-4 py-2 text-sm gap-2', getStatusColor(status.status))}>
            {getStatusIcon(status.status)}
            {status.status.toUpperCase()}
          </Badge>
        </div>

        <SimpleGrid cols={{ base: 1, md: 2, lg: 4 }} spacing={4}>
          <StatCard
            title='Uptime'
            icon={Activity}
            value={formatUptime(status.debugInfo.uptime)}
            description={`Process ID: ${status.debugInfo.pid}`}
          />

          <StatCard
            title='Platform'
            icon={Server}
            value={<span className='capitalize'>{getPlatformName(status.debugInfo.platform)}</span>}
            description={status.debugInfo.version}
          />

          <StatCard
            title='Last Updated'
            icon={Activity}
            value={new Date(status.finishedAt).toLocaleTimeString()}
            description={new Date(status.finishedAt).toLocaleDateString()}
          />

          <StatCard
            title='Healthy Checks'
            icon={CheckCircle2}
            value={`${status.checks.filter((c) => c.status === 'ok').length} / ${status.checks.length}`}
            description='Total checks performed'
          />
        </SimpleGrid>

        <Card>
          <CardHeader>
            <CardTitle>Health Checks Details</CardTitle>
            <CardDescription>Detailed status of all system components</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Component</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Message</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {status.checks.map((check, _index) => (
                  <TableRow key={check.name}>
                    <TableCell className='font-medium'>
                      <div className='flex items-center gap-2'>
                        {check.name.includes('Database') ? (
                          <Database className='h-4 w-4 text-muted-foreground' />
                        ) : check.name.includes('Disk') ? (
                          <HardDrive className='h-4 w-4 text-muted-foreground' />
                        ) : (
                          <Activity className='h-4 w-4 text-muted-foreground' />
                        )}
                        {check.name}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant='outline'
                        className={cn('gap-1', getStatusColor(check.status))}>
                        {getStatusIcon(check.status)}
                        {check.status}
                      </Badge>
                    </TableCell>
                    <TableCell className='text-muted-foreground'>
                      {check.message}
                      {check.meta?.error && (
                        <div className='text-xs text-red-500 mt-1 font-mono'>
                          {check.meta.error.message || JSON.stringify(check.meta.error)}
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </PublicLayout>
  )
}
