import { useState, useRef, useEffect } from 'react'

export default function CustomSelect({ value, onChange, options, className = '' }) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef(null)

  const selectedOption = options.find((opt) => opt.value === value) || options[0]

  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div ref={containerRef} className={`relative inline-block text-left ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex py-[2px] px-[6px] sm:py-[3px] sm:px-[8px] items-center justify-between gap-1 rounded-sm border border-[#847377]/20 bg-white text-[7px] sm:text-[7.5px] font-semibold uppercase tracking-[0.06em] text-[#514347] shadow-sm outline-none transition-all hover:border-[#3d0a21]/30 active:scale-[0.98]"
      >
        <span>{selectedOption ? selectedOption.label : ''}</span>
        <svg
          className={`h-2.5 w-2.5 text-[#847377] transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 z-50 mt-1 w-44 origin-top-right rounded-sm border border-[#d4af37]/20 bg-white p-1 shadow-[0_6px_20px_rgba(61,10,33,0.08)] outline-none">
          <div className="space-y-0.5" role="none">
            {options.map((option) => {
              const isSelected = option.value === value
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    onChange(option.value)
                    setIsOpen(false)
                  }}
                  className={`flex w-full items-center px-3 py-1.5 text-left text-[11px] transition-colors rounded-sm font-medium ${
                    isSelected
                      ? 'bg-[#3d0a21] text-[#fdf9f4]'
                      : 'text-[#514347] hover:bg-[#3d0a21]/5 hover:text-[#3d0a21]'
                  }`}
                  role="menuitem"
                >
                  {option.label}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
