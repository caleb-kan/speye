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
    <div className="flex flex-col h-full gap-3 pb-1">
      {successMessage && (
        <div className="p-2 bg-success/10 border border-success/20 rounded-lg text-xs text-success text-center shrink-0">
          {successMessage}
        </div>
      )}
      {error && (
        <div className="p-2 bg-error/10 border border-error/20 rounded-lg text-xs text-error text-center shrink-0">
          {error}
        </div>
      )}

      {/* (shrink-0) for static components on resize */}
      <div className="shrink-0">
        <RecipientSelect
          users={users}
          recipient={recipient}
          isBroadcast={isBroadcast}
          sending={sending}
          onRecipientChange={setRecipient}
          onBroadcastChange={setIsBroadcast}
        />
      </div>

      <div className="shrink-0">
        <TypeSelect value={notificationType} onChange={setNotificationType} />
      </div>

      <div className="flex-1 min-h-[80px] flex flex-col [&>div]:flex-1 [&>div]:flex [&>div]:flex-col [&_textarea]:flex-1 [&_textarea]:resize-none">
        <MessageInput value={message} sending={sending} onChange={setMessage} />
      </div>

      <div className="shrink-0">
        <LinkSelect
          value={link}
          availableLinks={availableLinks}
          sending={sending}
          onChange={setLink}
        />
      </div>

      <div className="shrink-0 pt-1">
        <SendButton sending={sending} canSend={canSend} onClick={handleSend} />
      </div>
    </div>
  )
}
