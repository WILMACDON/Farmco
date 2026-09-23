import { Head } from '@inertiajs/react'
import { PublicLayout } from '@/components/layouts/public'

export default function Terms() {
  return (
    <PublicLayout>
      <Head title='Terms of Service' />
      <div className='mx-auto max-w-3xl px-6 py-16'>
        <h1 className='text-3xl font-bold tracking-tight'>Terms of Service</h1>
        <p className='mt-2 text-muted-foreground'>Last updated: February 15, 2026</p>

        <div className='mt-10 space-y-8 text-sm leading-7 text-muted-foreground'>
          <section className='space-y-3'>
            <h2 className='text-lg font-semibold text-foreground'>1. Acceptance of Terms</h2>
            <p>
              By accessing or using our service, you agree to be bound by these Terms of Service. If
              you do not agree to these terms, please do not use our service.
            </p>
          </section>

          <section className='space-y-3'>
            <h2 className='text-lg font-semibold text-foreground'>2. Description of Service</h2>
            <p>
              We provide a platform that allows users to manage their workspaces, collaborate with
              team members, and access various tools and features as described on our website.
            </p>
          </section>

          <section className='space-y-3'>
            <h2 className='text-lg font-semibold text-foreground'>3. User Accounts</h2>
            <p>
              You are responsible for maintaining the confidentiality of your account credentials
              and for all activities that occur under your account. You agree to notify us
              immediately of any unauthorized use of your account.
            </p>
          </section>

          <section className='space-y-3'>
            <h2 className='text-lg font-semibold text-foreground'>4. Acceptable Use</h2>
            <p>
              You agree not to use the service for any unlawful purpose or in any way that could
              damage, disable, or impair the service. You must not attempt to gain unauthorized
              access to any part of the service or its related systems.
            </p>
          </section>

          <section className='space-y-3'>
            <h2 className='text-lg font-semibold text-foreground'>5. Intellectual Property</h2>
            <p>
              The service and its original content, features, and functionality are owned by us and
              are protected by international copyright, trademark, and other intellectual property
              laws.
            </p>
          </section>

          <section className='space-y-3'>
            <h2 className='text-lg font-semibold text-foreground'>6. Termination</h2>
            <p>
              We may terminate or suspend your account and access to the service immediately,
              without prior notice, for conduct that we determine violates these terms or is harmful
              to other users, us, or third parties, or for any other reason at our sole discretion.
            </p>
          </section>

          <section className='space-y-3'>
            <h2 className='text-lg font-semibold text-foreground'>7. Limitation of Liability</h2>
            <p>
              In no event shall we be liable for any indirect, incidental, special, consequential,
              or punitive damages, including loss of profits, data, or other intangible losses,
              resulting from your use of the service.
            </p>
          </section>

          <section className='space-y-3'>
            <h2 className='text-lg font-semibold text-foreground'>8. Changes to Terms</h2>
            <p>
              We reserve the right to modify these terms at any time. We will notify users of any
              material changes by posting the updated terms on this page. Your continued use of the
              service after changes constitutes acceptance of the new terms.
            </p>
          </section>

          <section className='space-y-3'>
            <h2 className='text-lg font-semibold text-foreground'>9. Contact</h2>
            <p>
              If you have any questions about these Terms of Service, please contact us through our{' '}
              <a
                href='/contact'
                className='text-primary underline underline-offset-4 hover:text-primary/90'>
                contact page
              </a>
              .
            </p>
          </section>
        </div>
      </div>
    </PublicLayout>
  )
}
