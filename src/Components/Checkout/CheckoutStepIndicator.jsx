const STEPS = [
  { id: 'details', label: 'Details' },
  { id: 'payment', label: 'Payment' },
  { id: 'confirm', label: 'Confirm' },
]

export default function CheckoutStepIndicator({ showPayment = true }) {
  const steps = showPayment ? STEPS : STEPS.filter((step) => step.id !== 'payment')

  return (
    <nav
      aria-label="Checkout progress"
      className="flex items-center justify-center gap-2 rounded-xl border border-[#d4af37]/15 bg-white/60 px-3 py-2.5"
    >
      {steps.map((step, index) => (
        <div key={step.id} className="flex items-center gap-2">
          <span className="flex items-center gap-1.5">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#3d0a21] text-[10px] font-bold text-[#f7ead0]">
              {index + 1}
            </span>
            <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#514347]">
              {step.label}
            </span>
          </span>
          {index < steps.length - 1 ? (
            <span className="h-px w-4 bg-[#d4af37]/35 sm:w-6" aria-hidden />
          ) : null}
        </div>
      ))}
    </nav>
  )
}
