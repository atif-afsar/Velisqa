import { useId } from 'react'

/** Labelled text input with optional hint / error, wired for screen readers. */
export default function Field({ label, hint, error, id, className = '', inputClassName = '', as = 'input', ...inputProps }) {
  const generated = useId()
  const fieldId = id || generated
  const describedBy = error ? `${fieldId}-error` : hint ? `${fieldId}-hint` : undefined
  const Control = as
  return (
    <div className={className}>
      {label && (
        <label htmlFor={fieldId} className="field-label">
          {label}
        </label>
      )}
      <Control
        id={fieldId}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={`field ${error ? '!border-danger' : ''} ${inputClassName}`}
        {...inputProps}
      />
      {error ? (
        <p id={`${fieldId}-error`} className="mt-1.5 text-xs text-danger" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p id={`${fieldId}-hint`} className="mt-1.5 text-xs text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  )
}
