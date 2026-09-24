import { Head, router, usePage } from '@inertiajs/react'
import { Copy, UserPlus } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { DashboardLayout } from '@/components/dashboard/layout'
import { PageHeader } from '@/components/dashboard/page_header'
import { StatusBadge } from '@/components/farm/status-badge'
import { SyncIndicator } from '@/components/farm/sync-indicator'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
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
import { SimpleGrid } from '@/components/ui/simplegrid'
import { StatCard } from '@/components/ui/stat-card'
import {
  farmErrorMessage,
  farmGet,
  farmMutate,
  farmPost,
  farmPut,
  formatDateTime,
  formatNumber,
} from '@/lib/farm-api'

type FarmRoleInvite = 'manager' | 'worker'

interface MemberRow {
  id: string
  userId: string
  role: string
  farmRole: string
  createdAt: string
  user: {
    id: string
    fullName: string | null
    email: string | null
    status: string
    mustChangePassword?: boolean
  } | null
}

interface InvitationRow {
  id: string
  email: string
  role: string
  createdAt: string | null
  invitedBy: string | null
}

interface UsersPageProps {
  members: MemberRow[]
  invitations: InvitationRow[]
  farmRole: string
  canInviteManager: boolean
}

interface OrgSettings {
  eggsPerCrate: number
  lowFeedThreshold: number
}

export default function UsersPage() {
  const { props } = usePage<UsersPageProps>()
  const { members, invitations, farmRole, canInviteManager } = props

  const [isInviteOpen, setIsInviteOpen] = useState(false)
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<FarmRoleInvite>('worker')
  const [isSaving, setIsSaving] = useState(false)
  const [tempPassword, setTempPassword] = useState<string | null>(null)
  const [busyUserId, setBusyUserId] = useState<string | null>(null)

  const [eggsPerCrate, setEggsPerCrate] = useState('30')
  const [lowFeedThreshold, setLowFeedThreshold] = useState('5')
  const [isSavingSettings, setIsSavingSettings] = useState(false)

  useEffect(() => {
    if (farmRole !== 'owner') return
    let cancelled = false
    farmGet<{ data: { settings: OrgSettings } }>('/farm/settings')
      .then((res) => {
        if (cancelled) return
        const next = res.data.settings
        setEggsPerCrate(String(next.eggsPerCrate))
        setLowFeedThreshold(String(next.lowFeedThreshold))
      })
      .catch(() => {
        /* settings stay unavailable */
      })
    return () => {
      cancelled = true
    }
  }, [farmRole])

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    if (!fullName.trim() || !email.trim()) return
    setIsSaving(true)
    try {
      const result = await farmPost<{
        message?: string
        data?: { temporaryPassword?: string }
      }>('/farm/users/invite', {
        fullName: fullName.trim(),
        email: email.trim().toLowerCase(),
        role,
      })
      setTempPassword(result.data?.temporaryPassword ?? null)
      setIsInviteOpen(false)
      setFullName('')
      setEmail('')
      setRole('worker')
      toast.success('User created. Share the temporary password once.')
      router.reload({ preserveState: true })
    } catch (err) {
      toast.error(farmErrorMessage(err, 'Unable to create user.'))
    } finally {
      setIsSaving(false)
    }
  }

  async function handleDeactivate(userId: string) {
    setBusyUserId(userId)
    await farmMutate({
      path: '/farm/users/deactivate',
      data: { userId },
      successMessage: 'User deactivated.',
      errorFallback: 'Unable to deactivate user.',
    })
    setBusyUserId(null)
  }

  async function handleReactivate(userId: string) {
    setBusyUserId(userId)
    await farmMutate({
      path: '/farm/users/reactivate',
      data: { userId },
      successMessage: 'User reactivated.',
      errorFallback: 'Unable to reactivate user.',
    })
    setBusyUserId(null)
  }

  async function handleSaveSettings(e: React.FormEvent) {
    e.preventDefault()
    const eggs = Number(eggsPerCrate)
    const threshold = Number(lowFeedThreshold)
    if (!Number.isInteger(eggs) || eggs < 1 || threshold < 0) return
    setIsSavingSettings(true)
    try {
      const res = await farmPut<{
        message?: string
        data?: { settings: OrgSettings }
      }>('/farm/settings', {
        eggsPerCrate: eggs,
        lowFeedThreshold: threshold,
      })
      if (res.data?.settings) {
        setEggsPerCrate(String(res.data.settings.eggsPerCrate))
        setLowFeedThreshold(String(res.data.settings.lowFeedThreshold))
        toast.success(res.message || 'Organization settings updated.')
      } else {
        toast.success(res.message || 'Organization settings updated.')
      }
    } catch (err) {
      toast.error(farmErrorMessage(err, 'Unable to update settings.'))
    } finally {
      setIsSavingSettings(false)
    }
  }

  async function copyTempPassword() {
    if (!tempPassword) return
    try {
      await navigator.clipboard.writeText(tempPassword)
      toast.success('Password copied.')
    } catch {
      toast.error('Could not copy. Select and copy it manually.')
    }
  }

  const activeMembers = members.filter((m) => m.user?.status === 'active')
  const deactivatedMembers = members.filter((m) => m.user?.status !== 'active')

  return (
    <DashboardLayout>
      <Head title='Users' />
      <div className='space-y-6 pb-20 md:pb-0'>
        <PageHeader
          title='Users'
          description='Invite workers and managers. Temporary passwords show once.'
          actions={
            <div className='flex flex-wrap items-center gap-2'>
              <SyncIndicator />
              <Button
                size='lg'
                className='min-h-11'
                leftIcon={<UserPlus className='h-4 w-4' />}
                onClick={() => setIsInviteOpen(true)}>
                Add user
              </Button>
            </div>
          }
        />

        {tempPassword && (
          <Alert className='border-accent/40 bg-[color-mix(in_oklab,var(--accent)_14%,transparent)]'>
            <AlertTitle>Temporary password</AlertTitle>
            <AlertDescription className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
              <span>
                Share this once with the new user:{' '}
                <code className='rounded bg-muted px-2 py-1 font-mono text-sm'>{tempPassword}</code>
              </span>
              <div className='flex gap-2'>
                <Button
                  type='button'
                  variant='outline'
                  className='min-h-11'
                  leftIcon={<Copy className='h-4 w-4' />}
                  onClick={copyTempPassword}>
                  Copy
                </Button>
                <Button
                  type='button'
                  variant='ghost'
                  className='min-h-11'
                  onClick={() => setTempPassword(null)}>
                  Dismiss
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

        <SimpleGrid cols={{ base: 1, sm: 3 }} spacing={4}>
          <StatCard title='Team' value={formatNumber(activeMembers.length)} />
          <StatCard title='Deactivated' value={formatNumber(deactivatedMembers.length)} />
          <StatCard title='Pending invites' value={formatNumber(invitations.length)} />
        </SimpleGrid>

        <SimpleGrid cols={{ base: 1, lg: 2 }} spacing={4}>
          <AppCard title='Team' description={`${activeMembers.length} active`}>
            {activeMembers.length === 0 ? (
              <p className='text-sm text-muted-foreground'>No active team members.</p>
            ) : (
              <div className='overflow-x-auto'>
                <table className='w-full min-w-[480px] text-sm'>
                  <thead>
                    <tr className='border-b border-border text-left text-muted-foreground'>
                      <th className='pb-2 pr-3 font-medium'>Name</th>
                      <th className='pb-2 pr-3 font-medium'>Email</th>
                      <th className='pb-2 pr-3 font-medium'>Role</th>
                      <th className='pb-2 font-medium'>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeMembers.map((member) => {
                      const isOwner = member.farmRole === 'owner'
                      return (
                        <tr key={member.id} className='border-b border-border/70'>
                          <td className='py-3 pr-3 font-medium'>{member.user?.fullName || '—'}</td>
                          <td className='py-3 pr-3'>{member.user?.email || '—'}</td>
                          <td className='py-3 pr-3'>
                            <StatusBadge status={member.farmRole} />
                          </td>
                          <td className='py-3'>
                            {!isOwner && (
                              <Button
                                variant='outline'
                                className='min-h-11'
                                isLoading={busyUserId === member.userId}
                                onClick={() => handleDeactivate(member.userId)}>
                                Deactivate
                              </Button>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </AppCard>

          <AppCard
            title='Deactivated'
            description={
              deactivatedMembers.length === 0
                ? 'Kept for activity history'
                : `${deactivatedMembers.length} inactive · kept for history`
            }>
            {deactivatedMembers.length === 0 ? (
              <p className='text-sm text-muted-foreground'>No deactivated users.</p>
            ) : (
              <div className='overflow-x-auto'>
                <table className='w-full min-w-[480px] text-sm'>
                  <thead>
                    <tr className='border-b border-border text-left text-muted-foreground'>
                      <th className='pb-2 pr-3 font-medium'>Name</th>
                      <th className='pb-2 pr-3 font-medium'>Email</th>
                      <th className='pb-2 pr-3 font-medium'>Role</th>
                      <th className='pb-2 font-medium'>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {deactivatedMembers.map((member) => (
                      <tr key={member.id} className='border-b border-border/70 text-muted-foreground'>
                        <td className='py-3 pr-3 font-medium text-foreground'>
                          {member.user?.fullName || '—'}
                        </td>
                        <td className='py-3 pr-3'>{member.user?.email || '—'}</td>
                        <td className='py-3 pr-3'>
                          <StatusBadge status={member.farmRole} />
                        </td>
                        <td className='py-3'>
                          <Button
                            variant='outline'
                            className='min-h-11'
                            isLoading={busyUserId === member.userId}
                            onClick={() => handleReactivate(member.userId)}>
                            Reactivate
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </AppCard>
        </SimpleGrid>

        {invitations.length > 0 && (
          <AppCard title='Pending invitations'>
            <div className='overflow-x-auto'>
              <table className='w-full min-w-[480px] text-sm'>
                <thead>
                  <tr className='border-b border-border text-left text-muted-foreground'>
                    <th className='pb-2 pr-3 font-medium'>Email</th>
                    <th className='pb-2 pr-3 font-medium'>Role</th>
                    <th className='pb-2 pr-3 font-medium'>Invited by</th>
                    <th className='pb-2 font-medium'>Sent</th>
                  </tr>
                </thead>
                <tbody>
                  {invitations.map((inv) => (
                    <tr key={inv.id} className='border-b border-border/70'>
                      <td className='py-3 pr-3'>{inv.email}</td>
                      <td className='py-3 pr-3'>
                        <StatusBadge status={inv.role} />
                      </td>
                      <td className='py-3 pr-3 text-muted-foreground'>{inv.invitedBy || '—'}</td>
                      <td className='py-3 text-muted-foreground'>
                        {formatDateTime(inv.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </AppCard>
        )}

        {farmRole === 'owner' && (
          <AppCard
            title='Organization settings'
            description='Eggs per crate and low-feed alert threshold.'>
            <form onSubmit={handleSaveSettings} className='grid max-w-lg gap-4 sm:grid-cols-2'>
              <FormField label='Eggs per crate' required>
                <Input
                  type='number'
                  min={1}
                  max={100}
                  className='min-h-11'
                  value={eggsPerCrate}
                  onChange={(e) => setEggsPerCrate(e.target.value)}
                  required
                />
              </FormField>
              <FormField label='Low feed threshold (bags)' required>
                <Input
                  type='number'
                  min={0}
                  step='any'
                  className='min-h-11'
                  value={lowFeedThreshold}
                  onChange={(e) => setLowFeedThreshold(e.target.value)}
                  required
                />
              </FormField>
              <div className='sm:col-span-2'>
                <Button type='submit' className='min-h-11' isLoading={isSavingSettings}>
                  Save settings
                </Button>
              </div>
            </form>
          </AppCard>
        )}
      </div>

      <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add user</DialogTitle>
            <DialogDescription>
              Creates an account with a temporary password you can share once.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleInvite} className='space-y-4'>
            <FormField label='Full name' required>
              <Input
                className='min-h-11'
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </FormField>
            <FormField label='Email' required>
              <Input
                type='email'
                className='min-h-11'
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </FormField>
            <FormField label='Role' required>
              <Select
                value={role}
                onValueChange={(v) => setRole((v || 'worker') as FarmRoleInvite)}>
                <SelectTrigger className='min-h-11 w-full h-auto'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='worker'>Worker</SelectItem>
                  {canInviteManager && <SelectItem value='manager'>Manager</SelectItem>}
                </SelectContent>
              </Select>
            </FormField>
            <DialogFooter>
              <Button
                type='button'
                variant='outline'
                className='min-h-11'
                onClick={() => setIsInviteOpen(false)}>
                Cancel
              </Button>
              <Button type='submit' className='min-h-11' isLoading={isSaving}>
                Create user
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  )
}
