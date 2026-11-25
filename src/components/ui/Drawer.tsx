import { X } from 'lucide-react'
import { useEffect, useRef, type ReactNode } from 'react'
import { IconButton } from './Button'

interface DrawerProps {
  open: boolean
  onClose: () => void
  title: string
  closeLabel: string
  children: ReactNode
  footer?: ReactNode
}

/** Side panel built on the native <dialog>: focus trap, Esc to close and inert background for free. */
export function Drawer({ open, onClose, title, closeLabel, children, footer }: DrawerProps) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) {
      if (typeof dialog.showModal === 'function') dialog.showModal()
      else dialog.setAttribute('open', '')
    } else if (!open && dialog.open) {
      if (typeof dialog.close === 'function') dialog.close()
      else dialog.removeAttribute('open')
    }
  }, [open])

  return (
    <dialog
      ref={ref}
      aria-label={title}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      className="fixed inset-y-0 right-0 left-auto m-0 h-dvh max-h-dvh w-full max-w-lg border-l border-neutral-200 bg-white p-0 text-neutral-900 shadow-xl backdrop:bg-neutral-950/40 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-100"
    >
      {open && (
        <div className="flex h-full flex-col">
          <header className="flex items-center justify-between gap-3 border-b border-neutral-200 px-5 py-3 dark:border-neutral-800">
            <h2 className="text-base font-semibold">{title}</h2>
            <IconButton label={closeLabel} onClick={onClose} autoFocus>
              <X className="size-4" />
            </IconButton>
          </header>
          <div className="flex-1 overflow-y-auto px-5 py-5">{children}</div>
          {footer && <footer className="border-t border-neutral-200 px-5 py-3 dark:border-neutral-800">{footer}</footer>}
        </div>
      )}
    </dialog>
  )
}
