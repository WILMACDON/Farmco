import { EmailButton, EmailHeading, EmailLink, EmailText, EmailWrapper } from '#emails/layout'
import type { Emails } from '#types/mails'

function WorkspaceInvite(props: Emails['workspace-invite']) {
  return (
    <EmailWrapper>
      <EmailHeading>You've been invited to join {props.workspaceName}</EmailHeading>
      <EmailText>Hi there,</EmailText>
      <EmailText>
        {props.inviterName} invited you to join the workspace <strong>{props.workspaceName}</strong>
        .
      </EmailText>
      <EmailText>Use the button below to join and create your password.</EmailText>
      <EmailButton href={props.url}>Join workspace</EmailButton>
      <EmailText>
        If the button doesn&apos;t work, copy and paste this link into your browser:
      </EmailText>
      <EmailLink href={props.url}>{props.url}</EmailLink>
      <EmailText>
        If you weren&apos;t expecting this invite, you can safely ignore this email.
      </EmailText>
    </EmailWrapper>
  )
}

export default WorkspaceInvite
