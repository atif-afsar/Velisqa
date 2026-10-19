import { useId } from 'react'

/** Labelled text input with optional hint / error, wired for screen readers. */
export default function Field({ label, hint, error, id, prefix, className = '', inputClassName = '', as = 'input', ...inputProps }) {
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
      {prefix ? (
        <div className={`field flex items-center gap-2 !py-0 focus-within:border-ink ${error ? '!border-danger' : ''}`}>
          <span className="shrink-0 border-r border-line pr-2 text-body" aria-hidden="true">
            {prefix}
          </span>
          <Control
            id={fieldId}
            aria-invalid={error ? true : undefined}
            aria-describedby={describedBy}
            className={`min-h-[46px] w-full min-w-0 bg-transparent text-[16px] outline-none focus-visible:outline-none ${inputClassName}`}
            {...inputProps}
          />
        </div>
      ) : (
        <Control
          id={fieldId}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={`field ${error ? '!border-danger' : ''} ${inputClassName}`}
          {...inputProps}
        />
      )}
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
