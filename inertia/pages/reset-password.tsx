import { Link, router } from '@inertiajs/react'
import { useMutation } from '@tanstack/react-query'
import { useFormik } from 'formik'
import { toast } from 'sonner'
import * as yup from 'yup'
import { AuthShell } from '@/components/auth/auth_shell'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { type ServerErrorResponse, serverErrorResponder } from '@/lib/error'
import api from '@/lib/http'

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
    <AuthShell
      title='Reset Password'
      heading='Reset your password'
      description='Enter your new password below'
      footer={
        <p className='text-center text-sm text-muted-foreground'>
          <Link
            href='/login'
            className='text-primary underline underline-offset-4 hover:text-primary/90'>
            Back to sign in
          </Link>
        </p>
      }>
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
              formik.touched.newPassword && formik.errors.newPassword ? 'border-destructive' : ''
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

        <Button type='submit' className='w-full' isLoading={isPending} loadingText='Resetting…'>
          Reset password
        </Button>
      </form>
    </AuthShell>
  )
}
