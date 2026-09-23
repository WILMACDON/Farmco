import type { SharedProps } from '@adonisjs/inertia/types'
import { Head, router, useForm } from '@inertiajs/react'
import { Plus, Trash2 } from 'lucide-react'
import type { RawBlogCategory } from '#types/model-types'
import { type Column, DataTable } from '@/components/dashboard/data-table'
import { DashboardLayout } from '@/components/dashboard/layout'
import { PageHeader } from '@/components/dashboard/page_header'
import { AppCard } from '@/components/ui/app-card'
import { BaseModal } from '@/components/ui/base-modal'
import { Button } from '@/components/ui/button'
import { FormField } from '@/components/ui/form_field'
import { Input } from '@/components/ui/input'
import { Stack } from '@/components/ui/stack'
import { Textarea } from '@/components/ui/textarea'

const categoryColumns: Column<RawBlogCategory>[] = [
  {
    key: 'name',
    header: 'Name',
    cell: (row: RawBlogCategory) => <div className='font-medium'>{row.name}</div>,
  },
  {
    key: 'slug',
    header: 'Slug',
    cell: (row: RawBlogCategory) => <div className='text-muted-foreground'>/{row.slug}</div>,
  },
  {
    key: 'actions',
    header: 'Actions',
    cell: (row: RawBlogCategory) => (
      <div className='text-right'>
        <Button
          variant='ghost'
          size='icon'
          className='text-destructive hover:text-destructive'
          onClick={() => {
            if (
              !confirm('Delete this category? Posts will keep working (category will be cleared).')
            )
              return
            router.delete(`/admin/blog/categories/${row.id}`, { preserveScroll: true })
          }}>
          <Trash2 className='h-4 w-4' />
        </Button>
      </div>
    ),
  },
]

interface BlogAdminCategoriesProps extends SharedProps {
  categories: RawBlogCategory[]
}

export default function BlogAdminCategories({ categories }: BlogAdminCategoriesProps) {
  const { data, setData, post, processing, errors, reset } = useForm({
    name: '',
    description: '',
  })

  return (
    <DashboardLayout>
      <Head title='Blog categories' />
      <div className='space-y-6'>
        <PageHeader
          backHref='/admin/blog'
          title='Categories'
          description='Create and manage blog categories.'
          actions={
            <BaseModal
              title='New category'
              description='Slug is generated automatically.'
              trigger={<Button leftIcon={<Plus />}>Add category</Button>}
              primaryText='Create category'
              secondaryText='Cancel'
              primaryVariant='default'
              secondaryVariant='outline'
              isLoading={processing}
              primaryDisabled={processing}
              onSecondaryAction={() => reset()}
              onPrimaryAction={async () => {
                post('/admin/blog/categories', {
                  preserveScroll: true,
                  onSuccess: () => {
                    reset()
                  },
                })
              }}>
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  post('/admin/blog/categories', {
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
                  <FormField label='Description' htmlFor='description' error={errors.description}>
                    <Textarea
                      id='description'
                      value={data.description}
                      onChange={(e) => setData('description', e.target.value)}
                      rows={3}
                    />
                  </FormField>
                </Stack>
              </form>
            </BaseModal>
          }
        />

        <AppCard title='All categories' description={`${categories.length} total`}>
          <DataTable
            columns={categoryColumns}
            data={categories}
            emptyMessage='No categories yet.'
          />
        </AppCard>
      </div>
    </DashboardLayout>
  )
}
