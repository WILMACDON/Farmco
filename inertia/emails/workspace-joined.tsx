import { EmailHeading, EmailText, EmailWrapper } from '#emails/layout'
import type { Emails } from '#types/mails'

function WorkspaceJoined(props: Emails['workspace-joined']) {
  return (
    <EmailWrapper>
      <EmailHeading>Someone joined {props.workspaceName}</EmailHeading>
      <EmailText>Hi {props.inviterName || 'there'},</EmailText>
      <EmailText>
        <strong>{props.joinedUserName}</strong> ({props.joinedUserEmail}) accepted your invite and
        joined <strong>{props.workspaceName}</strong>.
      </EmailText>
    </EmailWrapper>
  )
}

export default WorkspaceJoined
