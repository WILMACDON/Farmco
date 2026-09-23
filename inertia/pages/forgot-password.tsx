import { AppLogo } from '@/components/app_logo'
import { PublicLayout } from '@/components/layouts/public'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Head, Link } from '@inertiajs/react'
import { useMutation } from '@tanstack/react-query'
import { useFormik } from 'formik'
import { toast } from 'sonner'

import { type ServerErrorResponse, serverErrorResponder } from '@/lib/error'
import api from '@/lib/http'

interface ForgotPasswordValues {
  email: string
}

export default function ForgotPassword() {
  const forgotPasswordMutation = useMutation({
    mutationFn: (values: ForgotPasswordValues) => api.post('/auth/forgot-password', values),
    onSuccess: () => {
      toast.success('Reset email sent!', {
        description: 'Please check your inbox for instructions.',
      })
    },
    onError: (err: ServerErrorResponse) => {
      const error = serverErrorResponder(err)
      toast.error(error || 'Failed to send reset email. Please try again.')
    },
  })

  const formik = useFormik<ForgotPasswordValues>({
    initialValues: {
      email: '',
    },
    onSubmit: (values) => {
      forgotPasswordMutation.mutate(values)
    },
  })

  return (
    <PublicLayout showFooter={false}>
      <Head title='Forgot Password' />
      <div className='flex min-h-svh items-center justify-center px-4 py-12'>
        <div className='w-full max-w-sm space-y-6 rounded-xl border bg-card p-6 shadow-sm'>
          <div className='flex justify-center'>
            <AppLogo />
          </div>

          <div className='text-center space-y-1'>
            <h1 className='text-xl font-semibold tracking-tight'>Forgot your password?</h1>
            <p className='text-sm text-muted-foreground'>
              Enter your email and we'll send you a reset link
            </p>
          </div>

          {forgotPasswordMutation.isSuccess ? (
            <div className='space-y-4 text-center'>
              <p className='text-sm text-muted-foreground'>
                We've sent a password reset link to <strong>{formik.values.email}</strong>
              </p>
              <Link
                href='/login'
                className='text-sm text-primary underline underline-offset-4 hover:text-primary/90'>
                Back to sign in
              </Link>
            </div>
          ) : (
            <form onSubmit={formik.handleSubmit} className='space-y-4'>
              <div className='space-y-2'>
                <Label htmlFor='email'>Email</Label>
                <Input
                  id='email'
                  name='email'
                  type='email'
                  value={formik.values.email}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  required
                  placeholder='you@example.com'
                />
              </div>

              <Button
                type='submit'
                className='w-full'
                isLoading={forgotPasswordMutation.isPending}
                loadingText='Sending…'>
                Send reset link
              </Button>
            </form>
          )}

          <p className='text-center text-sm text-muted-foreground'>
            Remember your password?{' '}
            <Link
              href='/login'
              className='text-primary underline underline-offset-4 hover:text-primary/90'>
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </PublicLayout>
  )
}
