import { Head, Link, useForm } from '@inertiajs/react'
import { Save } from 'lucide-react'
import { DashboardLayout } from '@/components/dashboard/layout'
import { PageHeader } from '@/components/dashboard/page_header'
import { AppCard } from '@/components/ui/app-card'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { FormField } from '@/components/ui/form_field'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

interface Plan {
  id: string
  name: string
  description: string | null
  priceMonthly: number
  priceYearly: number
  features: string[] | null
  isActive: boolean
  isRecommended: boolean
}

export default function EditPlan({ plan }: { plan: Plan }) {
  const { data, setData, put, processing, errors, transform } = useForm({
    name: plan.name,
    description: plan.description || '',
    priceMonthly: plan.priceMonthly.toString(),
    priceYearly: plan.priceYearly.toString(),
    features: plan.features ? plan.features.join('\n') : '',
    isActive: plan.isActive,
    isRecommended: plan.isRecommended || false,
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    transform((data) => ({
      ...data,
      features: data.features
        .split('\n')
        .map((f) => f.trim())
        .filter((f) => f !== ''),
      priceMonthly: Number(data.priceMonthly),
      priceYearly: Number(data.priceYearly),
    }))

    put(`/admin/plans/${plan.id}`)
  }

  return (
    <DashboardLayout>
      <Head title={`Edit Plan: ${plan.name}`} />
      <div className='space-y-6'>
        <PageHeader
          backHref='/admin/plans'
          title='Edit Plan'
          description={`Update details for ${plan.name}.`}
        />

        <AppCard title='Plan Details'>
          <form onSubmit={handleSubmit} className='space-y-6'>
            <div className='grid gap-4 md:grid-cols-2'>
              <FormField label='Name' error={errors.name} className='md:col-span-2'>
                <Input
                  value={data.name}
                  onChange={(e) => setData('name', e.target.value)}
                  placeholder='Pro Plan'
                />
              </FormField>

              <FormField label='Description' error={errors.description} className='md:col-span-2'>
                <Input
                  value={data.description}
                  onChange={(e) => setData('description', e.target.value)}
                  placeholder='For growing teams'
                />
              </FormField>

              <FormField label='Monthly Price ($)' error={errors.priceMonthly}>
                <Input
                  type='number'
                  min='0'
                  step='0.01'
                  value={data.priceMonthly}
                  onChange={(e) => setData('priceMonthly', e.target.value)}
                />
              </FormField>

              <FormField label='Yearly Price ($)' error={errors.priceYearly}>
                <Input
                  type='number'
                  min='0'
                  step='0.01'
                  value={data.priceYearly}
                  onChange={(e) => setData('priceYearly', e.target.value)}
                />
              </FormField>

              <FormField
                label='Features'
                description='Enter one feature per line.'
                error={errors.features}
                className='md:col-span-2'>
                <Textarea
                  value={data.features}
                  onChange={(e) => setData('features', e.target.value)}
                  rows={5}
                />
              </FormField>

              <div className='flex items-center gap-2 md:col-span-2'>
                <Checkbox
                  id='isActive'
                  checked={data.isActive}
                  onCheckedChange={(checked) => setData('isActive', !!checked)}
                />
                <label
                  htmlFor='isActive'
                  className='text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70'>
                  Active
                </label>
              </div>

              <div className='flex items-center gap-2 md:col-span-2'>
                <Checkbox
                  id='isRecommended'
                  checked={data.isRecommended}
                  onCheckedChange={(checked) => setData('isRecommended', !!checked)}
                />
                <label
                  htmlFor='isRecommended'
                  className='text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70'>
                  Recommended Plan
                </label>
              </div>
            </div>

            <div className='flex justify-end gap-2'>
              <Button variant='outline' asChild>
                <Link href='/admin/plans'>Cancel</Link>
              </Button>
              <Button type='submit' isLoading={processing} leftIcon={<Save className='h-4 w-4' />}>
                Save Changes
              </Button>
            </div>
          </form>
        </AppCard>
      </div>
    </DashboardLayout>
  )
}
