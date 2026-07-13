const BADGES = [
  {
    label: 'Free Shipping',
    icon: (
      <>
        <path d="M3 7h11v8H3z" />
        <path d="M14 10h4l3 3v2h-7" />
        <circle cx="7" cy="17" r="1.6" />
        <circle cx="17.5" cy="17" r="1.6" />
      </>
    ),
  },
  {
    label: 'Skin Safe Jewellery',
    icon: (
      <>
        <path d="M12 3l7 3v5c0 4.2-2.9 7.4-7 9-4.1-1.6-7-4.8-7-9V6l7-3z" />
        <path d="M9 12l2 2 4-4" />
      </>
    ),
  },
  {
    label: 'High Quality Product',
    icon: (
      <>
        <path d="M6 3h12l3 5-9 13L3 8z" />
        <path d="M3 8h18M9 3l3 5 3-5M8 8l4 13 4-13" />
      </>
    ),
  },
]

export default function ProductTrustBadges() {
  return (
    <div className="mt-6 rounded-xl bg-[#ece4d5] px-4 py-6 sm:px-6 sm:py-8">
      <ul className="grid grid-cols-3 gap-3 sm:gap-6">
        {BADGES.map(({ label, icon }) => (
          <li key={label} className="flex flex-col items-center gap-3 text-center">
            <svg
              className="h-8 w-8 text-[#130006] sm:h-9 sm:w-9"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.4}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              {icon}
            </svg>
            <span className="text-xs font-medium leading-snug text-[#130006] sm:text-sm">
              {label}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
