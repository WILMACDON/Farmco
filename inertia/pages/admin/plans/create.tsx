import { Head, Link, useForm } from '@inertiajs/react'
import { Save } from 'lucide-react'
import { DashboardLayout } from '@/components/dashboard/layout'
import { PageHeader } from '@/components/dashboard/page_header'
import { AppCard } from '@/components/ui/app-card'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { FormField } from '@/components/ui/form_field'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'

export default function CreatePlan() {
  const { data, setData, post, processing, errors, transform } = useForm({
    name: '',
    description: '',
    priceMonthly: '',
    priceYearly: '',
    currency: 'usd',
    features: '',
    isActive: true,
    isRecommended: false,
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    transform((data) => ({
      ...data,
      priceMonthly: Number(data.priceMonthly),
      priceYearly: Number(data.priceYearly),
      features: data.features
        .split('\n')
        .map((f) => f.trim())
        .filter((f) => f !== ''),
    }))

    post('/admin/plans')
  }

  return (
    <DashboardLayout>
      <Head title='Create Plan' />
      <div className='space-y-6'>
        <PageHeader
          backHref='/admin/plans'
          title='Create Plan'
          description='Add a new subscription plan.'
        />

        <AppCard title='Plan Details'>
          <form onSubmit={handleSubmit} className='space-y-6'>
            <div className='grid gap-4 md:grid-cols-2'>
              <FormField label='Name' error={errors.name}>
                <Input
                  value={data.name}
                  onChange={(e) => setData('name', e.target.value)}
                  placeholder='Pro Plan'
                />
              </FormField>

              <FormField label='Description' error={errors.description}>
                <Input
                  value={data.description}
                  onChange={(e) => setData('description', e.target.value)}
                  placeholder='For growing teams'
                />
              </FormField>

              <FormField label='Currency' error={errors.currency}>
                <Select
                  value={data.currency}
                  onValueChange={(value) => setData('currency', value || 'usd')}>
                  <SelectTrigger>
                    <SelectValue placeholder='Select currency' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='usd'>USD ($)</SelectItem>
                    <SelectItem value='gbp'>GBP (£)</SelectItem>
                    <SelectItem value='eur'>EUR (€)</SelectItem>
                  </SelectContent>
                </Select>
              </FormField>

              <div className='grid grid-cols-2 gap-4 md:col-span-2'>
                <FormField label='Monthly Price' error={errors.priceMonthly}>
                  <Input
                    type='number'
                    min='0'
                    step='0.01'
                    value={data.priceMonthly}
                    onChange={(e) => setData('priceMonthly', e.target.value)}
                  />
                </FormField>

                <FormField label='Yearly Price' error={errors.priceYearly}>
                  <Input
                    type='number'
                    min='0'
                    step='0.01'
                    value={data.priceYearly}
                    onChange={(e) => setData('priceYearly', e.target.value)}
                  />
                </FormField>
              </div>

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
                Create Plan
              </Button>
            </div>
          </form>
        </AppCard>
      </div>
    </DashboardLayout>
  )
}
