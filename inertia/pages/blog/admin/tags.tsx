import type { RawBlogTag } from '#types/model-types'
import { DataTable, type Column } from '@/components/dashboard/data-table'
import { DashboardLayout } from '@/components/dashboard/layout'
import { PageHeader } from '@/components/dashboard/page_header'
import { AppCard } from '@/components/ui/app-card'
import { BaseModal } from '@/components/ui/base-modal'
import { Button } from '@/components/ui/button'
import { FormField } from '@/components/ui/form_field'
import { Input } from '@/components/ui/input'
import { Stack } from '@/components/ui/stack'
import type { SharedProps } from '@adonisjs/inertia/types'
import { Head, router, useForm } from '@inertiajs/react'
import { Plus, Trash2 } from 'lucide-react'

const tagColumns: Column<RawBlogTag>[] = [
  {
    key: 'name',
    header: 'Name',
    cell: (row: RawBlogTag) => <div className="font-medium">{row.name}</div>,
  },
  {
    key: 'slug',
    header: 'Slug',
    cell: (row: RawBlogTag) => <div className="text-muted-foreground">/{row.slug}</div>,
  },
  {
    key: 'actions',
    header: 'Actions',
    cell: (row: RawBlogTag) => (
      <div className="text-right">
        <Button
          variant="ghost"
          size="icon"
          className="text-destructive hover:text-destructive"
          onClick={() => {
            if (!confirm('Delete this tag?')) return
            router.delete(`/admin/blog/tags/${row.id}`, { preserveScroll: true })
          }}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    ),
  },
]

interface BlogAdminTagsProps extends SharedProps {
  tags: RawBlogTag[]
}

export default function BlogAdminTags({ tags }: BlogAdminTagsProps) {
  const { data, setData, post, processing, errors, reset } = useForm({
    name: '',
  })

  return (
    <DashboardLayout>
      <Head title='Blog tags' />
      <div className='space-y-6'>
        <PageHeader
          backHref='/admin/blog'
          title='Tags'
          description='Create and manage tags.'
          actions={
            <BaseModal
              title='New tag'
              description='Slug is generated automatically.'
              trigger={<Button leftIcon={<Plus />}>Add tag</Button>}
              primaryText='Create tag'
              secondaryText='Cancel'
              primaryVariant='default'
              secondaryVariant='outline'
              isLoading={processing}
              primaryDisabled={processing}
              onSecondaryAction={() => reset()}
              onPrimaryAction={async () => {
                post('/admin/blog/tags', {
                  preserveScroll: true,
                  onSuccess: () => {
                    reset()
                  },
                })
              }}>
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  post('/admin/blog/tags', {
                    preserveScroll: true,
                    onSuccess: () => {
                      reset()
                    },
                  })
                }}>
                <Stack spacing={4}>
                  <FormField label='Name' htmlFor='name' required error={errors.name}>
                    <Input
                      id='name'
                      value={data.name}
                      onChange={(e) => setData('name', e.target.value)}
                      required
                    />
                  </FormField>
                </Stack>
              </form>
            </BaseModal>
          }
        />

        <AppCard title='All tags' description={`${tags.length} total`}>
          <DataTable
            columns={tagColumns}
            data={tags}
            emptyMessage='No tags yet.'
          />
        </AppCard>
      </div>
    </DashboardLayout>
  )
}
