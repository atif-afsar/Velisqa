import { MinusIcon, PlusIcon } from '../UI/Icons'

/** Quantity control. Going below 1 calls onChange(0) so carts can treat it as "remove". */
export default function QuantityStepper({ value, max, onChange, disabled = false, size = 'md' }) {
  const btnClass = size === 'sm' ? 'h-10 w-10' : 'h-11 w-11'

  function change(delta) {
    const next = value + delta
    if (next < 1) {
      onChange(0)
      return
    }
    if (max != null && next > max) return
    onChange(next)
  }

  return (
    <div className={`inline-flex items-center border border-line-strong ${disabled ? 'opacity-50' : ''}`} role="group" aria-label="Quantity">
      <button
        type="button"
        disabled={disabled || value <= 1}
        onClick={() => change(-1)}
        className={`${btnClass} grid place-items-center text-ink transition hover:bg-mist disabled:cursor-not-allowed disabled:opacity-35`}
        aria-label="Decrease quantity"
      >
        <MinusIcon size={14} />
      </button>
      <span className="min-w-8 text-center text-sm tabular-nums text-ink" aria-live="polite">
        {value}
      </span>
      <button
        type="button"
        disabled={disabled || (max != null && value >= max)}
        onClick={() => change(1)}
        className={`${btnClass} grid place-items-center text-ink transition hover:bg-mist disabled:cursor-not-allowed disabled:opacity-35`}
        aria-label="Increase quantity"
      >
        <PlusIcon size={14} />
      </button>
    </div>
  )
}
