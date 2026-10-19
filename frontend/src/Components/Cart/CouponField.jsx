import { useId, useState } from 'react'

/** Coupon entry used on the bag and checkout summaries. */
export default function CouponField({ coupon }) {
  const id = useId()
  const [value, setValue] = useState('')
  if (coupon.code) {
    return (
      <div className="flex items-center justify-between border border-dashed border-accent px-4 py-3 text-sm">
        <span>
          <span className="eyebrow text-accent-ink">{coupon.code}</span>
          <span className="ml-2 text-body">applied</span>
        </span>
        <button type="button" onClick={coupon.remove} className="min-h-9 text-xs text-muted underline underline-offset-4 hover:text-ink">
          Remove
        </button>
      </div>
    )
  }
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault()
        if (await coupon.apply(value)) setValue('')
      }}
    >
      <label htmlFor={id} className="field-label">
        Coupon code
      </label>
      <div className="flex">
        <input
          id={id}
          value={value}
          onChange={(e) => setValue(e.target.value.toUpperCase())}
          placeholder="Enter code"
          autoComplete="off"
          className="field min-w-0 flex-1 border-r-0 uppercase"
          aria-invalid={coupon.error ? true : undefined}
          aria-describedby={coupon.error ? `${id}-error` : undefined}
        />
        <button type="submit" disabled={!value.trim() || coupon.checking} className="btn btn-secondary min-h-12 shrink-0 px-5">
          Apply
        </button>
      </div>
      {coupon.error && (
        <p id={`${id}-error`} className="mt-1.5 text-xs text-danger" role="alert">
          {coupon.error}
        </p>
      )}
    </form>
  )
}
