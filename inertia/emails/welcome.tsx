import { EmailHeading, EmailText, EmailWrapper } from '#emails/layout'
import type { Emails } from '#types/mails'

function Welcome(props: Emails['welcome']) {
  return (
    <EmailWrapper>
      <EmailHeading>Welcome to Farmco</EmailHeading>
      <EmailText>Hi {props.fullName || 'there'},</EmailText>
      <EmailText>
        Your account is ready. Use Farmco to record birds, eggs, and feed, and keep a clear log of
        every change.
      </EmailText>
      <EmailText>
        If you need help getting set up, reply to this email and we will sort it out.
      </EmailText>
      <EmailText>Welcome aboard.</EmailText>
    </EmailWrapper>
  )
}

export default Welcome
