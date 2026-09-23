import type { RawBlogAuthor } from '#types/model-types'
import type { Column } from '@/components/dashboard/data-table'
import { DataTable } from '@/components/dashboard/data-table'
import { DashboardLayout } from '@/components/dashboard/layout'
import { PageHeader } from '@/components/dashboard/page_header'
import { AppCard } from '@/components/ui/app-card'
import { BaseModal } from '@/components/ui/base-modal'
import { Button } from '@/components/ui/button'
import { FormField } from '@/components/ui/form_field'
import { Input } from '@/components/ui/input'
import { SimpleGrid } from '@/components/ui/simplegrid'
import { Stack } from '@/components/ui/stack'
import { Textarea } from '@/components/ui/textarea'
import type { SharedProps } from '@adonisjs/inertia/types'
import { Head, router, useForm } from '@inertiajs/react'
import { Plus, Trash2 } from 'lucide-react'

interface BlogAdminAuthorsProps extends SharedProps {
  authors: RawBlogAuthor[]
}

const authorColumns: Column<RawBlogAuthor>[] = [
  {
    key: 'name',
    header: 'Name',
    cell: (row) => <div className='font-medium'>{row.name}</div>,
  },
  {
    key: 'slug',
    header: 'Slug',
    cell: (row) => <div className='text-muted-foreground'>/{row.slug}</div>,
  },
  {
    key: 'email',
    header: 'Email',
    cell: (row) => <div className='text-muted-foreground'>{row.email || '—'}</div>,
  },
  {
    key: 'actions',
    header: 'Actions',
    cell: (row) => (
      <div className='text-right'>
        <Button
          variant='ghost'
          size='icon'
          className='text-destructive hover:text-destructive'
          onClick={() => {
            if (
              !confirm(
                'Delete this author? Posts will keep working (author will be removed from posts).',
              )
            )
              return
            router.delete(`/admin/blog/authors/${row.id}`, { preserveScroll: true })
          }}>
          <Trash2 className='h-4 w-4' />
        </Button>
      </div>
    ),
  },
]

export default function BlogAdminAuthors({ authors }: BlogAdminAuthorsProps) {
  const { data, setData, post, processing, errors, reset } = useForm({
    name: '',
    email: '',
    avatarUrl: '',
    bio: '',
  })

  return (
    <DashboardLayout>
      <Head title='Blog authors' />
      <div className='space-y-6'>
        <PageHeader
          backHref='/admin/blog'
          title='Authors'
          description='Create and manage blog authors (separate from app users).'
          actions={
            <BaseModal
              title='New author'
              description='Slug is generated automatically.'
              trigger={<Button leftIcon={<Plus />}>Add author</Button>}
              primaryText='Create author'
              secondaryText='Cancel'
              primaryVariant='default'
              secondaryVariant='outline'
              isLoading={processing}
              primaryDisabled={processing}
              onSecondaryAction={() => reset()}
              onPrimaryAction={async () => {
                post('/admin/blog/authors', {
                  preserveScroll: true,
                  onSuccess: () => {
                    reset()
                  },
                })
              }}>
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  post('/admin/blog/authors', {
                    preserveScroll: true,
                    onSuccess: () => {
                      reset()
                    },
                  })
                }}>
                <Stack spacing={4}>
                  <SimpleGrid cols={{ base: 1, md: 2 }} spacing={4}>
                    <FormField
                      label='Name'
                      htmlFor='name'
                      required
                      error={errors.name}
                      className='md:col-span-2'>
                      <Input
                        id='name'
                        value={data.name}
                        onChange={(e) => setData('name', e.target.value)}
                        required
                      />
                    </FormField>
                    <FormField label='Email (optional)' htmlFor='email' error={errors.email}>
                      <Input
                        id='email'
                        value={data.email}
                        onChange={(e) => setData('email', e.target.value)}
                      />
                    </FormField>
                    <FormField
                      label='Avatar URL (optional)'
                      htmlFor='avatarUrl'
                      error={errors.avatarUrl}>
                      <Input
                        id='avatarUrl'
                        value={data.avatarUrl}
                        onChange={(e) => setData('avatarUrl', e.target.value)}
                        placeholder='https://...'
                      />
                    </FormField>
                    <FormField
                      label='Bio (optional)'
                      htmlFor='bio'
                      error={errors.bio}
                      className='md:col-span-2'>
                      <Textarea
                        id='bio'
                        value={data.bio}
                        onChange={(e) => setData('bio', e.target.value)}
                        rows={4}
                      />
                    </FormField>
                  </SimpleGrid>
                </Stack>
              </form>
            </BaseModal>
          }
        />

        <AppCard title='All authors' description={`${authors.length} total`}>
          <DataTable columns={authorColumns} data={authors} emptyMessage='No authors yet.' />
        </AppCard>
      </div>
    </DashboardLayout>
  )
}
