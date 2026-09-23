import { Head, usePage } from '@inertiajs/react'
import { useQuery } from '@tanstack/react-query'
import { Building2, Crown, Mail, Shield, UserPlus, Users } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import type { RawUser, RawWorkspace } from '#types/model-types'
import type { Column } from '@/components/dashboard/data-table'
import { DataTable } from '@/components/dashboard/data-table'
import { DashboardLayout } from '@/components/dashboard/layout'
import { PageHeader } from '@/components/dashboard/page_header'
import { AppCard } from '@/components/ui/app-card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SimpleGrid } from '@/components/ui/simplegrid'
import { Stack } from '@/components/ui/stack'
import { StatCard } from '@/components/ui/stat-card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { type ServerErrorResponse, serverErrorResponder } from '@/lib/error'
import api from '@/lib/http'

interface MemberRow {
  id: string
  role: string
  createdAt: string
  fullName: string | null
  email: string | null
}

interface InvitationRow {
  id: string
  email: string
  role: string
  createdAt: string
  invitedBy: string | null
}

interface MembersResponse {
  data: {
    meta: { currentPage: number; perPage: number; total: number; lastPage: number }
    members: MemberRow[]
    invitations: InvitationRow[]
  }
}

const roleIcons: Record<string, React.ReactNode> = {
  owner: <Crown className='h-3 w-3' />,
  admin: <Shield className='h-3 w-3' />,
  member: <Users className='h-3 w-3' />,
}

const memberColumns: Column<MemberRow>[] = [
  {
    key: 'fullName',
    header: 'Name',
    cell: (row) => <div className='font-medium'>{row.fullName || '—'}</div>,
  },
  {
    key: 'email',
    header: 'Email',
  },
  {
    key: 'role',
    header: 'Role',
    cell: (row) => (
      <Badge variant='outline' className='capitalize gap-1'>
        {roleIcons[row.role]}
        {row.role}
      </Badge>
    ),
  },
  {
    key: 'createdAt',
    header: 'Joined',
    cell: (row) => (
      <div className='text-muted-foreground'>{new Date(row.createdAt).toLocaleDateString()}</div>
    ),
  },
]

const invitationColumns: Column<InvitationRow>[] = [
  {
    key: 'email',
    header: 'Email',
    cell: (row) => (
      <div className='flex items-center gap-2'>
        <Mail className='h-4 w-4 text-muted-foreground' />
        {row.email}
      </div>
    ),
  },
  {
    key: 'role',
    header: 'Role',
    cell: (row) => (
      <Badge variant='outline' className='capitalize'>
        {row.role}
      </Badge>
    ),
  },
  {
    key: 'invitedBy',
    header: 'Invited by',
    cell: (row) => <div className='text-muted-foreground'>{row.invitedBy || '—'}</div>,
  },
  {
    key: 'createdAt',
    header: 'Sent',
    cell: (row) => (
      <div className='text-muted-foreground'>{new Date(row.createdAt).toLocaleDateString()}</div>
    ),
  },
]

export default function WorkspacesIndex() {
  const page = usePage()
  const workspaces = (page.props.workspaces ?? []) as RawWorkspace[]
  const currentWorkspaceId = page.props.currentWorkspaceId as string | null
  const currentWorkspace = workspaces.find((w) => w.id === currentWorkspaceId) ?? workspaces[0]
  const user = page.props.user as RawUser | null

  const [search, setSearch] = useState('')
  const [isInviteOpen, setIsInviteOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<'member' | 'admin'>('member')
  const [isSending, setIsSending] = useState(false)

  const membersQuery = useQuery({
    queryKey: ['workspace-members', currentWorkspace?.id, search],
    queryFn: async () => {
      if (!currentWorkspace?.id) return null
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      const url = `/workspaces/${currentWorkspace.id}/members${params.toString() ? `?${params}` : ''}`
      const { data } = await api.get<MembersResponse>(url as Parameters<typeof api.get>[0])
      return data.data
    },
    enabled: Boolean(currentWorkspace?.id),
  })

  const members = membersQuery.data?.members ?? []
  const invitations = membersQuery.data?.invitations ?? []

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    if (!inviteEmail.trim() || !currentWorkspace?.id) return
    setIsSending(true)
    try {
      const url = `/workspaces/${currentWorkspace.id}/invitations`
      await api.post(url as Parameters<typeof api.post>[0], {
        email: inviteEmail.trim(),
        role: inviteRole,
      })
      toast.success(`Invitation sent to ${inviteEmail}`)
      setInviteEmail('')
      setIsInviteOpen(false)
      membersQuery.refetch()
    } catch (err) {
      toast.error(serverErrorResponder(err as ServerErrorResponse) || 'Failed to send invitation')
    } finally {
      setIsSending(false)
    }
  }

  if (!currentWorkspace) {
    return (
      <DashboardLayout>
        <Head title='Workspaces' />
        <div className='flex flex-col items-center justify-center py-20 text-center'>
          <Building2 className='h-12 w-12 text-muted-foreground mb-4' />
          <h2 className='text-xl font-semibold'>No workspace selected</h2>
          <p className='text-muted-foreground mt-1'>
            Use the workspace switcher in the sidebar to select or create a workspace.
          </p>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <Head title={currentWorkspace.name} />
      <div className='space-y-6'>
        <PageHeader
          title={currentWorkspace.name}
          description='Manage your workspace members and invitations.'
          actions={
            <Button
              leftIcon={<UserPlus className='h-4 w-4' />}
              onClick={() => setIsInviteOpen(true)}>
              Invite member
            </Button>
          }
        />

        <SimpleGrid cols={{ base: 1, sm: 3 }} spacing={4}>
          <StatCard title='Members' value={membersQuery.data?.meta.total ?? '—'} icon={Users} />
          <StatCard title='Pending invites' value={invitations.length} icon={Mail} />
          <StatCard
            title='Your role'
            value={
              <Badge variant='secondary' className='capitalize gap-1'>
                {roleIcons[members.find((m) => m.email === user?.email)?.role ?? '']}
                {members.find((m) => m.email === user?.email)?.role ?? '—'}
              </Badge>
            }
            icon={Shield}
          />
        </SimpleGrid>

        <Tabs defaultValue='members'>
          <TabsList>
            <TabsTrigger value='members'>Members</TabsTrigger>
            <TabsTrigger value='invitations'>
              Pending invitations
              {invitations.length > 0 && (
                <Badge variant='secondary' className='ml-2 h-5 min-w-5 px-1 text-[10px]'>
                  {invitations.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value='members' className='space-y-4'>
            <AppCard
              title='Team members'
              description={`${members.length} member${members.length !== 1 ? 's' : ''}`}>
              <DataTable
                columns={memberColumns}
                data={members}
                loading={membersQuery.isLoading}
                searchable
                searchPlaceholder='Search members…'
                searchValue={search}
                onSearchChange={setSearch}
                emptyMessage='No members found.'
                pagination={
                  membersQuery.data?.meta
                    ? {
                        page: membersQuery.data.meta.currentPage,
                        pageSize: membersQuery.data.meta.perPage,
                        total: membersQuery.data.meta.total,
                        onPageChange: () => {},
                      }
                    : undefined
                }
              />
            </AppCard>
          </TabsContent>

          <TabsContent value='invitations' className='space-y-4'>
            <AppCard title='Pending invitations' description={`${invitations.length} pending`}>
              <DataTable
                columns={invitationColumns}
                data={invitations}
                emptyMessage='No pending invitations.'
              />
            </AppCard>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
        <DialogContent>
          <form onSubmit={handleInvite}>
            <DialogHeader>
              <DialogTitle>Invite member</DialogTitle>
              <DialogDescription>
                Send an email invitation to join <strong>{currentWorkspace.name}</strong>.
              </DialogDescription>
            </DialogHeader>
            <Stack spacing={4} className='py-4'>
              <div className='space-y-2'>
                <Label htmlFor='invite-email'>Email address</Label>
                <Input
                  id='invite-email'
                  type='email'
                  placeholder='colleague@example.com'
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  autoFocus
                  required
                />
              </div>
              <div className='space-y-2'>
                <Label>Role</Label>
                <div className='flex gap-2'>
                  {(['member', 'admin'] as const).map((role) => (
                    <Button
                      key={role}
                      type='button'
                      size='sm'
                      variant={inviteRole === role ? 'default' : 'outline'}
                      onClick={() => setInviteRole(role)}
                      className='capitalize'>
                      {role}
                    </Button>
                  ))}
                </div>
              </div>
            </Stack>
            <DialogFooter>
              <Button
                type='button'
                variant='outline'
                onClick={() => setIsInviteOpen(false)}
                disabled={isSending}>
                Cancel
              </Button>
              <Button type='submit' disabled={isSending || !inviteEmail.trim()}>
                {isSending ? 'Sending…' : 'Send invitation'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  )
}
