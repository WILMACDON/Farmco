import type { SharedProps } from '@adonisjs/inertia/types'
import { router, useForm, usePage } from '@inertiajs/react'
import { Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { AppCard } from '@/components/ui/app-card'
import { Button } from '@/components/ui/button'
import { FormField } from '@/components/ui/form_field'
import { Input } from '@/components/ui/input'

export function WorkspaceTab() {
  const { currentWorkspaceId, workspaces, user } = usePage<SharedProps>().props
  // @ts-expect-error - workspaces type is inferred
  const currentWorkspace = workspaces.find((w: any) => w.id === currentWorkspaceId)

  const { data, setData, put, processing, errors } = useForm({
    name: currentWorkspace?.name || '',
  })

  if (!currentWorkspace) return null

  // @ts-expect-error - user type is inferred
  const isOwner = currentWorkspace.createdByUserId === user?.id

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    put(`/api/v1/workspaces/${currentWorkspace.id}`, {
      onSuccess: () => toast.success('Workspace updated successfully'),
      onError: () => toast.error('Failed to update workspace'),
    })
  }

  const handleDelete = () => {
    if (
      confirm(
        'Are you sure you want to delete this workspace? This action cannot be undone and will delete all data associated with this workspace.',
      )
    ) {
      router.delete(`/api/v1/workspaces/${currentWorkspace.id}`, {
        onSuccess: () => toast.success('Workspace deleted successfully'),
        onError: () => toast.error('Failed to delete workspace'),
      })
    }
  }

  return (
    <div className='space-y-6'>
      <AppCard title='Workspace Details' description='Manage your workspace name and settings.'>
        <form onSubmit={handleSubmit} className='space-y-4'>
          <FormField label='Workspace Name' error={errors.name}>
            <Input
              value={data.name}
              onChange={(e) => setData('name', e.target.value)}
              disabled={!isOwner}
            />
          </FormField>

          {isOwner && (
            <div className='flex justify-end'>
              <Button type='submit' isLoading={processing}>
                Save Changes
              </Button>
            </div>
          )}
        </form>
      </AppCard>

      {isOwner && (
        <AppCard
          title='Danger Zone'
          description='Irreversible actions for this workspace.'
          className='border-destructive/20'>
          <div className='flex items-center justify-between'>
            <div>
              <h4 className='font-medium text-destructive'>Delete Workspace</h4>
              <p className='text-sm text-muted-foreground'>
                Permanently delete this workspace and all its data.
              </p>
            </div>
            <Button variant='destructive' onClick={handleDelete}>
              <Trash2 className='mr-2 h-4 w-4' />
              Delete Workspace
            </Button>
          </div>
        </AppCard>
      )}
    </div>
  )
}
