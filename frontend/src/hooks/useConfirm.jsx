import { useCallback, useState } from 'react'
import ConfirmDialog from '../Components/UI/ConfirmDialog'

export function useConfirm() {
  const [dialog, setDialog] = useState(null)

  const confirm = useCallback((options) => {
    return new Promise((resolve) => {
      setDialog({ ...options, resolve })
    })
  }, [])

  const close = useCallback((result) => {
    setDialog((current) => {
      current?.resolve(result)
      return null
    })
  }, [])

  const ConfirmDialogElement = dialog ? (
    <ConfirmDialog
      open
      title={dialog.title}
      message={dialog.message}
      confirmLabel={dialog.confirmLabel}
      cancelLabel={dialog.cancelLabel}
      variant={dialog.variant}
      onConfirm={() => close(true)}
      onCancel={() => close(false)}
    />
  ) : null

  return { confirm, ConfirmDialog: ConfirmDialogElement }
}
