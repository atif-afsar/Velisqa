const pillBase =
  'inline-flex shrink-0 items-center rounded-full border px-3 py-1 text-[11px] font-normal leading-none transition-colors sm:px-3.5 sm:py-1.5 sm:text-[12px]'

const pillActive = 'border-transparent bg-[#130006] text-white'
const pillInactive =
  'border-black/6 bg-[#f5f5f5] text-[#333] hover:border-black/10 hover:bg-[#ececec]'

export function CategoryPill({ active, onClick, label, count, className = '' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`${pillBase} ${active ? pillActive : pillInactive} ${className}`}
    >
      {label}
      {count > 0 && (
        <span
          className={`ml-1.5 tabular-nums ${active ? 'text-white/60' : 'text-[#888]'}`}
        >
          {count}
        </span>
      )}
    </button>
  )
}

export function CategoryPillRow({ children, scrollable = false, className = '' }) {
  if (scrollable) {
    return (
      <div
        className={`-mx-1 flex min-w-0 gap-1.5 overflow-x-auto px-1 [scrollbar-width:none] sm:gap-2 [&::-webkit-scrollbar]:hidden ${className}`}
      >
        {children}
      </div>
    )
  }

  return (
    <div
      className={`flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 ${className}`}
    >
      {children}
    </div>
  )
}
