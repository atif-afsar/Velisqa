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
        inline-flex
        items-center
        justify-center
        py-[2px]
        px-[6px]
        text-[7px]
        sm:text-[7.5px]
        font-semibold
        uppercase
        tracking-[0.06em]
        rounded-sm
        border
        transition-all
        duration-200
        outline-none
        ${
          active
            ? 'bg-[#3d0a21] border-[#3d0a21] text-white'
            : 'bg-[#130006]/[0.03] border-transparent text-[#6e5d62] hover:bg-[#130006]/[0.06] hover:text-[#3d0a21]'
        }
        ${className}
      `}
    >
      <span>{label}</span>
      {count > 0 && (
        <span
          className={`
            ml-1
            text-[5.5px]
            font-bold
            tabular-nums
            ${active ? 'text-[#e5d5be]' : 'text-[#9c8e92]'}
          `}
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
        className={`
          -mx-1 
          flex 
          min-w-0 
          gap-2
          overflow-x-auto 
          px-1 
          [scrollbar-width:none] 
          sm:gap-3 
          lg:justify-center
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
        gap-2
        sm:gap-3 
        ${className}
      `}
    >
      {children}
    </div>
  )
}

