import { useMemo } from 'react'
import { useNotificationCreator } from '../../../hooks/useNotificationCreator.ts'
import { useIsAdmin } from '../../../hooks/useIsAdmin.ts'
import { useAutoClearMessage } from '../../../hooks/useAutoClearMessage.ts'
import { AlertMessages } from '../../ui/AlertMessages.tsx'
import { RecipientSelect } from './RecipientSelect.tsx'
import { NotificationForm } from './NotificationForm.tsx'
import { SUCCESS_MESSAGE_DURATION_MS } from '../../../constants/ui.ts'
import { PAGE_LINKS } from '../../../constants/admin.ts'

export function NotificationCreator() {
  const isAdmin = useIsAdmin()
  const availableLinks = useMemo(
    () => PAGE_LINKS.filter((p) => !p.adminOnly || isAdmin),
    [isAdmin]
  )
  const {
    users,
    loadingUsers,
    recipient,
    setRecipient,
    isBroadcast,
    setIsBroadcast,
    notificationType,
    setNotificationType,
    message,
    setMessage,
    link,
    setLink,
    sending,
    successMessage,
    setSuccessMessage,
    error,
    setError,
    handleSend,
  } = useNotificationCreator()

  useAutoClearMessage(
    successMessage,
    setSuccessMessage,
    SUCCESS_MESSAGE_DURATION_MS
  )
  useAutoClearMessage(error, setError, SUCCESS_MESSAGE_DURATION_MS)

  const canSend = !sending && (isBroadcast || !!recipient) && !!message.trim()

  return (
    <div className="space-y-4">
      <AlertMessages successMessage={successMessage} errorMessage={error} />

      <RecipientSelect
        users={users}
        recipient={recipient}
        isBroadcast={isBroadcast}
        disabled={sending || loadingUsers}
        onRecipientChange={setRecipient}
        onBroadcastChange={setIsBroadcast}
      />

      <NotificationForm
        notificationType={notificationType}
        message={message}
        link={link}
        isBroadcast={isBroadcast}
        sending={sending}
        canSend={canSend}
        availableLinks={availableLinks}
        onTypeChange={setNotificationType}
        onMessageChange={setMessage}
        onLinkChange={setLink}
        onSend={handleSend}
      />
    </div>
  )
}
