import { useEffect, useRef } from 'react'

const activeDialogs: HTMLElement[] = []

function topDialog(): HTMLElement | undefined {
  return activeDialogs.reduce<HTMLElement | undefined>((top, dialog) => {
    if (top && dialog.contains(top)) return top
    return dialog
  }, undefined)
}

function focusableElements(dialog: HTMLElement): HTMLElement[] {
  return Array.from(
    dialog.querySelectorAll<HTMLElement>(
      'button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]'
    )
  ).filter(
    (element) =>
      element.tabIndex >= 0 &&
      !element.matches(':disabled') &&
      !element.closest('[hidden], [aria-hidden="true"], [inert]')
  )
}

export function useDialogFocus(isOpen: boolean) {
  const dialogRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!isOpen || !dialog) return
    const previousFocus = document.activeElement
    activeDialogs.push(dialog)

    const focusFirst = () => (focusableElements(dialog)[0] ?? dialog).focus()
    if (topDialog() === dialog) focusFirst()

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Tab' || topDialog() !== dialog) return
      const elements = focusableElements(dialog)
      const first = elements[0] ?? dialog
      const last = elements.at(-1) ?? dialog
      if (
        !dialog.contains(document.activeElement) ||
        (event.shiftKey && document.activeElement === first) ||
        (!event.shiftKey && document.activeElement === last)
      ) {
        event.preventDefault()
        ;(event.shiftKey ? last : first).focus()
      }
    }
    const handleFocusIn = (event: FocusEvent) => {
      if (
        topDialog() === dialog &&
        event.target instanceof Node &&
        !dialog.contains(event.target)
      ) {
        focusFirst()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('focusin', handleFocusIn)
    return () => {
      activeDialogs.splice(activeDialogs.indexOf(dialog), 1)
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('focusin', handleFocusIn)
      const remainingDialog = topDialog()
      if (
        previousFocus instanceof HTMLElement &&
        previousFocus.isConnected &&
        (!remainingDialog || remainingDialog.contains(previousFocus))
      ) {
        previousFocus.focus()
      } else if (
        remainingDialog &&
        !remainingDialog.contains(document.activeElement)
      ) {
        ;(focusableElements(remainingDialog)[0] ?? remainingDialog).focus()
      }
    }
  }, [isOpen])

  return dialogRef
}
