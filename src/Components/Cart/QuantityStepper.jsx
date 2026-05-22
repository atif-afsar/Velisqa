export default function QuantityStepper({ value, max, onChange, disabled = false, size = 'md' }) {
  const btnClass =
    size === 'sm'
      ? 'h-8 w-8 text-base'
      : 'h-10 w-10 text-lg'

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
    <div
      className={`inline-flex items-center rounded-full border border-[#847377]/25 bg-white ${disabled ? 'opacity-50' : ''}`}
      role="group"
      aria-label="Quantity"
    >
      <button
        type="button"
        disabled={disabled || value <= 1}
        onClick={() => change(-1)}
        className={`${btnClass} rounded-l-full font-medium text-[#514347] transition hover:bg-[#f9f5f0] disabled:cursor-not-allowed disabled:opacity-40`}
        aria-label="Decrease quantity"
      >
        −
      </button>
      <span className="min-w-[2rem] px-2 text-center text-sm font-semibold tabular-nums text-[#130006]">
        {value}
      </span>
      <button
        type="button"
        disabled={disabled || (max != null && value >= max)}
        onClick={() => change(1)}
        className={`${btnClass} rounded-r-full font-medium text-[#514347] transition hover:bg-[#f9f5f0] disabled:cursor-not-allowed disabled:opacity-40`}
        aria-label="Increase quantity"
      >
        +
      </button>
    </div>
  )
}
