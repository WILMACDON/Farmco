import { Head, router } from '@inertiajs/react'
import { useMutation } from '@tanstack/react-query'
import { useFormik } from 'formik'
import { Building2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Stack } from '@/components/ui/stack'
import { type ServerErrorResponse, serverErrorResponder } from '@/lib/error'
import api from '@/lib/http'

export default function Onboarding() {
  const { mutate, isPending } = useMutation({
    mutationFn: (values: { name: string }) => api.post('/workspaces/onboard', values),
    onSuccess: (response) => {
      toast.success('Workspace created!')
      const data = (response.data as { data?: { redirectTo?: string } }).data
      router.visit(data?.redirectTo || '/dashboard')
    },
    onError: (err: ServerErrorResponse) => {
      toast.error(serverErrorResponder(err) || 'Failed to create workspace')
    },
  })

  const formik = useFormik<{ name: string }>({
    initialValues: { name: '' },
    onSubmit: (values) => mutate(values),
  })

  return (
    <>
      <Head title='Set up your workspace' />
      <div className='flex min-h-screen items-center justify-center bg-background px-4'>
        <Card className='w-full max-w-md'>
          <CardHeader className='text-center'>
            <div className='mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10'>
              <Building2 className='h-6 w-6 text-primary' />
            </div>
            <CardTitle className='text-2xl'>Create your workspace</CardTitle>
            <CardDescription>
              A workspace is where you and your team collaborate. You can always rename it later.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={formik.handleSubmit}>
              <Stack spacing={4}>
                <div className='space-y-2'>
                  <Label htmlFor='name'>Workspace name</Label>
                  <Input
                    id='name'
                    name='name'
                    placeholder='Acme Inc.'
                    value={formik.values.name}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    autoFocus
                    required
                  />
                </div>
                <Button type='submit' className='w-full' disabled={isPending}>
                  {isPending ? 'Creating...' : 'Continue'}
                </Button>
              </Stack>
            </form>
          </CardContent>
        </Card>
      </div>
    </>
  )
}
