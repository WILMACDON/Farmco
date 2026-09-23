import { AppLogo } from '@/components/app_logo'
import { PublicLayout } from '@/components/layouts/public'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { type ServerErrorResponse, serverErrorResponder } from '@/lib/error'
import api from '@/lib/http'
import { Head, Link, router } from '@inertiajs/react'
import { useMutation } from '@tanstack/react-query'
import { useFormik } from 'formik'
import { toast } from 'sonner'
import * as yup from 'yup'

interface ResetPasswordValues {
  token: string
  newPassword: string
  confirmPassword: string
}

const resetPasswordSchema = yup.object({
  token: yup.string().required('Reset token is required'),
  newPassword: yup
    .string()
    .required('Password is required')
    .min(8, 'Password must be at least 8 characters long'),
  confirmPassword: yup
    .string()
    .required('Please confirm your password')
    .oneOf([yup.ref('newPassword')], 'Passwords must match'),
})

export default function ResetPassword({ qs }: { qs: { token: string } }) {
  const { token } = qs

  const formik = useFormik<ResetPasswordValues>({
    initialValues: {
      token: token || '',
      newPassword: '',
      confirmPassword: '',
    },
    validationSchema: resetPasswordSchema,
    onSubmit: (values) => {
      resetPasswordMutation(values)
    },
  })

  const { mutate: resetPasswordMutation, isPending } = useMutation({
    mutationFn: (values: { token: string; newPassword: string }) =>
      api.post('/auth/reset-password', values),
    onSuccess: () => {
      toast.success('Password reset successfully!', {
        description: 'Redirecting to login...',
      })
      setTimeout(() => router.visit('/login'), 1000)
    },
    onError: (err: ServerErrorResponse) => {
      const error = serverErrorResponder(err)
      toast.error(error || 'Failed to reset password. Please try again.')
    },
  })

  return (
    <PublicLayout showFooter={false}>
      <Head title='Reset Password' />
      <div className='flex min-h-svh items-center justify-center px-4 py-12'>
        <div className='w-full max-w-sm space-y-6 rounded-xl border bg-card p-6 shadow-sm'>
          <div className='flex justify-center'>
            <AppLogo />
          </div>

          <div className='text-center space-y-1'>
            <h1 className='text-xl font-semibold tracking-tight'>Reset your password</h1>
            <p className='text-sm text-muted-foreground'>Enter your new password below</p>
          </div>

          <form onSubmit={formik.handleSubmit} className='space-y-4'>
            {!token && (
              <Alert variant='destructive'>
                <AlertDescription>
                  No reset token provided. Please use the link from your email.
                </AlertDescription>
              </Alert>
            )}

            <div className='space-y-2'>
              <Label htmlFor='newPassword'>New password</Label>
              <Input
                id='newPassword'
                type='password'
                {...formik.getFieldProps('newPassword')}
                placeholder='••••••••'
                className={
                  formik.touched.newPassword && formik.errors.newPassword
                    ? 'border-destructive'
                    : ''
                }
              />
              {formik.touched.newPassword && formik.errors.newPassword && (
                <p className='text-sm text-destructive'>{formik.errors.newPassword}</p>
              )}
            </div>

            <div className='space-y-2'>
              <Label htmlFor='confirmPassword'>Confirm password</Label>
              <Input
                id='confirmPassword'
                type='password'
                {...formik.getFieldProps('confirmPassword')}
                placeholder='••••••••'
                className={
                  formik.touched.confirmPassword && formik.errors.confirmPassword
                    ? 'border-destructive'
                    : ''
                }
              />
              {formik.touched.confirmPassword && formik.errors.confirmPassword && (
                <p className='text-sm text-destructive'>{formik.errors.confirmPassword}</p>
              )}
            </div>

            <Button
              type='submit'
              className='w-full'
              isLoading={isPending}
              loadingText='Resetting…'>
              Reset password
            </Button>
          </form>

          <p className='text-center text-sm text-muted-foreground'>
            <Link
              href='/login'
              className='text-primary underline underline-offset-4 hover:text-primary/90'>
              Back to sign in
            </Link>
          </p>
        </div>
      </div>
    </PublicLayout>
  )
}
