import { useEffect, useId, useRef } from 'react'
import { createPortal } from 'react-dom'
import { CloseIcon } from './Icons'

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

const SIDE_CLASSES = {
  right: 'inset-y-0 right-0 h-full w-full max-w-[440px] drawer-in-right',
  left: 'inset-y-0 left-0 h-full w-full max-w-[400px] drawer-in-left',
  bottom: 'inset-x-0 bottom-0 max-h-[88vh] w-full drawer-in-bottom',
  center: 'left-1/2 top-1/2 w-[calc(100%-32px)] max-w-lg -translate-x-1/2 -translate-y-1/2 max-h-[88vh] pop-in',
}

/**
 * Accessible overlay panel used for the cart drawer, mobile menu, filters and modals.
 * Traps focus, closes on Escape / backdrop click, locks body scroll, restores focus.
 */
export default function Drawer({
  open,
  onClose,
  side = 'right',
  title,
  hideTitle = false,
  children,
  footer,
  className = '',
  bodyClassName = '',
  labelledBy,
}) {
  const panelRef = useRef(null)
  const generatedId = useId()
  const titleId = labelledBy || `${generatedId}-title`

  useEffect(() => {
    if (!open) return undefined
    const previouslyFocused = document.activeElement
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const panel = panelRef.current
    const first = panel?.querySelector(FOCUSABLE)
    ;(first || panel)?.focus({ preventScroll: true })

    function onKeyDown(event) {
      if (event.key === 'Escape') {
        event.stopPropagation()
        onClose?.()
        return
      }
      if (event.key !== 'Tab' || !panel) return
      const nodes = [...panel.querySelectorAll(FOCUSABLE)].filter((n) => n.offsetParent !== null)
      if (!nodes.length) return
      const firstNode = nodes[0]
      const lastNode = nodes[nodes.length - 1]
      if (event.shiftKey && document.activeElement === firstNode) {
        event.preventDefault()
        lastNode.focus()
      } else if (!event.shiftKey && document.activeElement === lastNode) {
        event.preventDefault()
        firstNode.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = prevOverflow
      if (previouslyFocused instanceof HTMLElement) previouslyFocused.focus({ preventScroll: true })
    }
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-[200]">
      <div className="absolute inset-0 bg-ink/40 fade-in" onClick={onClose} aria-hidden="true" />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        tabIndex={-1}
        className={`absolute flex flex-col bg-paper shadow-[0_0_60px_rgba(0,0,0,0.12)] outline-none ${SIDE_CLASSES[side]} ${className}`}
      >
        {title && (
          <div className={`flex min-h-16 shrink-0 items-center justify-between border-b border-line px-5 sm:px-6 ${hideTitle ? 'sr-only' : ''}`}>
            <h2 id={titleId} className="type-label text-ink">
              {title}
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="-mr-2 grid h-11 w-11 place-items-center text-ink transition-opacity hover:opacity-60"
              aria-label="Close"
            >
              <CloseIcon size={20} />
            </button>
          </div>
        )}
        <div className={`min-h-0 flex-1 overflow-y-auto overscroll-contain ${bodyClassName}`}>{children}</div>
        {footer && <div className="shrink-0 border-t border-line">{footer}</div>}
      </div>
    </div>,
    document.body,
  )
}
