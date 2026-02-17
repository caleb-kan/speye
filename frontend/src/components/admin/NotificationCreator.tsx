import { useMemo } from 'react'
import { useNotificationCreator } from '../../hooks/useNotificationCreator'
import { useIsAdmin } from '../../hooks/useIsAdmin'
import { useAutoClearMessage } from '../../hooks/useAutoClearMessage'
import { PAGE_LINKS } from '../../constants/admin'
import { SUCCESS_MESSAGE_DURATION_MS } from '../../constants/ui'

import { RecipientSelect } from './notificationCreator/RecipientSelect'
import { TypeSelect } from './notificationCreator/TypeSelect'
import { MessageInput } from './notificationCreator/MessageInput'
import { LinkSelect } from './notificationCreator/LinkSelect'
import { SendButton } from './notificationCreator/SendButton'

export function NotificationCreator() {
  const isAdmin = useIsAdmin()
  const {
    users,
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

  const availableLinks = useMemo(
    () => PAGE_LINKS.filter((p) => !p.adminOnly || isAdmin),
    [isAdmin]
  )

  const canSend = !sending && (isBroadcast || !!recipient) && !!message.trim()

  return (
    <div className="space-y-4">
      {/* Status Messages */}
      {successMessage && (
        <div className="p-2 bg-success/10 border border-success/20 rounded-lg text-xs text-success text-center">
          {successMessage}
        </div>
      )}
      {error && (
        <div className="p-2 bg-error/10 border border-error/20 rounded-lg text-xs text-error text-center">
          {error}
        </div>
      )}

      <RecipientSelect
        users={users}
        recipient={recipient}
        isBroadcast={isBroadcast}
        sending={sending}
        onRecipientChange={setRecipient}
        onBroadcastChange={setIsBroadcast}
      />

      <TypeSelect value={notificationType} onChange={setNotificationType} />

      <MessageInput value={message} sending={sending} onChange={setMessage} />

      <LinkSelect
        value={link}
        availableLinks={availableLinks}
        sending={sending}
        onChange={setLink}
      />

      <SendButton sending={sending} canSend={canSend} onClick={handleSend} />
    </div>
  )
}
