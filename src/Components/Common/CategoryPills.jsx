import { formatInr } from '../../lib/cartStock'

export function CategoryPill({ active, onClick, label, count, className = '' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`
        relative
        shrink-0
        py-2.5
        px-1
        text-[9px]
        font-medium
        uppercase
        tracking-[0.18em]
        transition-colors
        duration-200
        outline-none
        ${active ? 'text-[#3d0a21]' : 'text-[#81777a] hover:text-[#3d0a21]'}
        ${className}
      `}
    >
      {label}
      {count > 0 && (
        <sup
          className={`
            ml-1
            text-[6px]
            tabular-nums
            ${active ? 'text-[#b18d50]' : 'text-[#aaa2a3]'}
          `}
        >
          {count}
        </sup>
      )}
      <span
        className={`
          pointer-events-none
          absolute
          bottom-[-4px]
          left-0
          h-[1.5px]
          bg-[#b18d50]
          transition-all
          duration-200
          ${active ? 'w-full' : 'w-0'}
        `}
      />
    </button>
  )
}

export function CategoryPillRow({ children, scrollable = false, className = '' }) {
  if (scrollable) {
    return (
      <div
        className={`
          -mx-1 
          flex 
          min-w-0 
          gap-6 
          overflow-x-auto 
          px-1 
          [scrollbar-width:none] 
          sm:gap-9 
          [&::-webkit-scrollbar]:hidden 
          ${className}
        `}
      >
        {children}
      </div>
    )
  }

  return (
    <div
      className={`
        flex 
        flex-wrap 
        items-center 
        justify-center 
        gap-6 
        sm:gap-9 
        ${className}
      `}
    >
      {children}
    </div>
  )
}
