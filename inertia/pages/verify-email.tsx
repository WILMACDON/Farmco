import { Head, Link } from '@inertiajs/react'
import { PublicLayout } from '@/components/layouts/public'
import { TokenVerificationShell } from '@/components/auth/token_verification_shell'
import { Button } from '@/components/ui/button'

export default function VerifyEmail({ qs }: { qs: { token: string } }) {
  const token = qs?.token

  return (
    <PublicLayout>
      <Head title='Verify Email - Friars Technologies' />
      <TokenVerificationShell
        token={token}
        endpoint='/auth/verify-email'
        pendingTitle='Verifying Your Email'
        successTitle='Email Verified!'
        errorTitle='Verification Failed'
        pendingDescription='Please wait while we verify your email address...'
        successDescription='Your email has been successfully verified! You can now access all features.'
        successToastTitle='Email verified!'
        successToastDescription='You can now access all features.'
        errorToastTitle='Verification failed'
        errorToastDescriptionFallback='Please request a new verification email.'
        redirectTo='/login'
        redirectDelayMs={2000}
        errorHints={[
          'The verification link has expired',
          'The link has already been used',
          'The link is invalid or corrupted',
        ]}
        errorActions={
          <div className='flex flex-col sm:flex-row items-center justify-center gap-3'>
            <Button variant='outline' asChild className='w-full sm:w-auto'>
              <Link href='/login'>Go to Login</Link>
            </Button>
            <Button variant='ghost' asChild className='w-full sm:w-auto'>
              <Link href='/signup'>Create New Account</Link>
            </Button>
          </div>
        }
      />
    </PublicLayout>
  )
}
