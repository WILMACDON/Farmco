import { router, usePage } from '@inertiajs/react'
import { Building2, Check, ChevronsUpDown, Plus } from 'lucide-react'
import { useState } from 'react'
import type { RawWorkspace } from '#types/model-types'
import { Button } from '@/components/ui/button'
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import api from '@/lib/http'
import { cn } from '@/lib/utils'

interface WorkspaceSwitcherProps {
  collapsed?: boolean
}

export function WorkspaceSwitcher({ collapsed = false }: WorkspaceSwitcherProps) {
  const page = usePage()
  const workspaces = (page.props.workspaces ?? []) as RawWorkspace[]
  const currentWorkspaceId = page.props.currentWorkspaceId as string | null

  const currentWorkspace = workspaces.find((w) => w.id === currentWorkspaceId) ?? workspaces[0]

  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [newName, setNewName] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [isSwitching, setIsSwitching] = useState(false)

  async function handleSwitch(workspaceId: string) {
    if (workspaceId === currentWorkspaceId) return
    setIsSwitching(true)
    try {
      await api.post('/workspaces/switch', { workspaceId })
      router.reload()
    } finally {
      setIsSwitching(false)
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!newName.trim()) return
    setIsCreating(true)
    try {
      const { data } = await api.post<{ data: { workspace: RawWorkspace } }>('/workspaces', {
        name: newName.trim(),
      })
      setNewName('')
      setIsCreateOpen(false)
      // Switch to the newly created workspace
      await api.post('/workspaces/switch', { workspaceId: data.data.workspace.id })
      router.reload()
    } finally {
      setIsCreating(false)
    }
  }

  const initial = currentWorkspace?.name?.charAt(0)?.toUpperCase() ?? 'W'

  if (collapsed) {
    return (
      <>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type='button'
              title={currentWorkspace?.name ?? 'Switch workspace'}
              className='mx-auto flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors font-semibold text-sm'>
              {initial}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side='right' align='start' sideOffset={10} className='w-56'>
            {workspaces.map((ws) => (
              <DropdownMenuItem
                key={ws.id}
                disabled={isSwitching}
                onClick={() => handleSwitch(ws.id)}
                className='cursor-pointer'>
                <Building2 className='h-4 w-4' />
                <span className='flex-1 truncate'>{ws.name}</span>
                {ws.id === currentWorkspace?.id && <Check className='h-4 w-4 text-primary' />}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setIsCreateOpen(true)} className='cursor-pointer'>
              <Plus className='h-4 w-4' />
              Create workspace
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <CreateWorkspaceDialog
          open={isCreateOpen}
          onOpenChange={setIsCreateOpen}
          name={newName}
          onNameChange={setNewName}
          onSubmit={handleCreate}
          isCreating={isCreating}
        />
      </>
    )
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type='button'
            className={cn(
              'w-full rounded-md px-2 py-2 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors',
              'flex items-center gap-2 text-left',
            )}>
            <div className='flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary'>
              <Building2 className='h-4 w-4' />
            </div>
            <div className='flex-1 overflow-hidden'>
              <p className='truncate text-[13px] font-medium leading-4'>
                {currentWorkspace?.name ?? 'Select workspace'}
              </p>
            </div>
            <ChevronsUpDown className='h-4 w-4 text-muted-foreground shrink-0' />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent side='right' align='start' sideOffset={10} className='w-64'>
          <div className='px-2 py-1.5 text-xs font-medium text-muted-foreground'>Workspaces</div>
          {workspaces.map((ws) => (
            <DropdownMenuItem
              key={ws.id}
              disabled={isSwitching}
              onClick={() => handleSwitch(ws.id)}
              className='cursor-pointer'>
              <Building2 className='h-4 w-4' />
              <span className='flex-1 truncate'>{ws.name}</span>
              {ws.id === currentWorkspace?.id && <Check className='h-4 w-4 text-primary' />}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setIsCreateOpen(true)} className='cursor-pointer'>
            <Plus className='h-4 w-4' />
            Create workspace
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <CreateWorkspaceDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        name={newName}
        onNameChange={setNewName}
        onSubmit={handleCreate}
        isCreating={isCreating}
      />
    </>
  )
}

interface CreateWorkspaceDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  name: string
  onNameChange: (name: string) => void
  onSubmit: (e: React.FormEvent) => void
  isCreating: boolean
}

function CreateWorkspaceDialog({
  open,
  onOpenChange,
  name,
  onNameChange,
  onSubmit,
  isCreating,
}: CreateWorkspaceDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={onSubmit}>
          <DialogHeader>
            <DialogTitle>Create workspace</DialogTitle>
            <DialogDescription>
              Add a new workspace to organize your projects and collaborate with others.
            </DialogDescription>
          </DialogHeader>
          <div className='py-4'>
            <Label htmlFor='workspace-name'>Workspace name</Label>
            <Input
              id='workspace-name'
              placeholder='e.g. Acme Corp'
              value={name}
              onChange={(e) => onNameChange(e.target.value)}
              autoFocus
              className='mt-2'
            />
          </div>
          <DialogFooter>
            <Button
              type='button'
              variant='outline'
              onClick={() => onOpenChange(false)}
              disabled={isCreating}>
              Cancel
            </Button>
            <Button type='submit' disabled={isCreating || !name.trim()}>
              {isCreating ? 'Creating…' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
