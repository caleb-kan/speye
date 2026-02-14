import type { NotificationType } from '../../../types/database.ts'
import { PAGE_LINKS } from '../../../constants/admin.ts'
import { TypeSelect } from './TypeSelect.tsx'
import { MessageInput } from './MessageInput.tsx'
import { LinkSelect } from './LinkSelect.tsx'
import { SendButton } from './SendButton.tsx'

interface NotificationFormProps {
  notificationType: NotificationType
  message: string
  link: string
  isBroadcast: boolean
  sending: boolean
  canSend: boolean
  availableLinks: typeof PAGE_LINKS
  onTypeChange: (type: NotificationType) => void
  onMessageChange: (message: string) => void
  onLinkChange: (link: string) => void
  onSend: () => void
}

export function NotificationForm({
  notificationType,
  message,
  link,
  isBroadcast,
  sending,
  canSend,
  availableLinks,
  onTypeChange,
  onMessageChange,
  onLinkChange,
  onSend,
}: NotificationFormProps) {
  return (
    <>
      <TypeSelect
        value={notificationType}
        disabled={sending}
        onChange={onTypeChange}
      />

      <MessageInput
        value={message}
        disabled={sending}
        onChange={onMessageChange}
      />

      <LinkSelect
        value={link}
        disabled={sending}
        availableLinks={availableLinks}
        onChange={onLinkChange}
      />

      <SendButton
        sending={sending}
        isBroadcast={isBroadcast}
        canSend={canSend}
        onSend={onSend}
      />
    </>
  )
}
