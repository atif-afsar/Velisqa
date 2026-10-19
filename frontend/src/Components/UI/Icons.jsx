/* Thin-stroke inline SVG icon set (replaces the 1.1 MB Material Symbols font). */

function Svg({ size = 20, strokeWidth = 1.4, children, className = '', ...rest }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={className}
      {...rest}
    >
      {children}
    </svg>
  )
}

export const SearchIcon = (p) => (
  <Svg {...p}>
    <circle cx="11" cy="11" r="6.5" />
    <path d="m16 16 4.5 4.5" />
  </Svg>
)

export const HeartIcon = ({ filled = false, ...p }) => (
  <Svg {...p} fill={filled ? 'currentColor' : 'none'}>
    <path d="M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.3a4.3 4.3 0 0 1 7.5 2.5C19.5 15.4 12 20 12 20Z" />
  </Svg>
)

export const BagIcon = (p) => (
  <Svg {...p}>
    <path d="M5.5 8.5h13l-1 11.5h-11l-1-11.5Z" />
    <path d="M9 8.5V7a3 3 0 0 1 6 0v1.5" />
  </Svg>
)

export const UserIcon = (p) => (
  <Svg {...p}>
    <circle cx="12" cy="8" r="3.5" />
    <path d="M5 20c1.2-3.3 3.6-5 7-5s5.8 1.7 7 5" />
  </Svg>
)

export const MenuIcon = (p) => (
  <Svg {...p}>
    <path d="M3.5 7h17M3.5 12h17M3.5 17h17" />
  </Svg>
)

export const CloseIcon = (p) => (
  <Svg {...p}>
    <path d="M6 6l12 12M18 6 6 18" />
  </Svg>
)

export const ChevronDownIcon = (p) => (
  <Svg {...p}>
    <path d="m6 9 6 6 6-6" />
  </Svg>
)

export const ChevronRightIcon = (p) => (
  <Svg {...p}>
    <path d="m9 6 6 6-6 6" />
  </Svg>
)

export const ChevronLeftIcon = (p) => (
  <Svg {...p}>
    <path d="m15 6-6 6 6 6" />
  </Svg>
)

export const ArrowRightIcon = (p) => (
  <Svg {...p}>
    <path d="M4 12h15M14 7l5 5-5 5" />
  </Svg>
)

export const PlusIcon = (p) => (
  <Svg {...p}>
    <path d="M12 5v14M5 12h14" />
  </Svg>
)

export const MinusIcon = (p) => (
  <Svg {...p}>
    <path d="M5 12h14" />
  </Svg>
)

export const TruckIcon = (p) => (
  <Svg {...p}>
    <path d="M3 6.5h11v9H3zM14 9.5h4l3 3v3h-7" />
    <circle cx="7" cy="17.5" r="1.6" />
    <circle cx="17.5" cy="17.5" r="1.6" />
  </Svg>
)

export const ShieldIcon = (p) => (
  <Svg {...p}>
    <path d="M12 3.5 19 6v5.5c0 4.4-3 7.6-7 9-4-1.4-7-4.6-7-9V6l7-2.5Z" />
    <path d="m9 12 2 2 4-4" />
  </Svg>
)

export const ReturnIcon = (p) => (
  <Svg {...p}>
    <path d="M4 9h11a5 5 0 0 1 0 10H8" />
    <path d="m8 5-4 4 4 4" />
  </Svg>
)

export const GemIcon = (p) => (
  <Svg {...p}>
    <path d="M6.5 4h11L21 9l-9 11L3 9l3.5-5Z" />
    <path d="M3 9h18M9 4l3 16 3-16" />
  </Svg>
)

export const LockIcon = (p) => (
  <Svg {...p}>
    <rect x="5" y="10.5" width="14" height="10" rx="1" />
    <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" />
  </Svg>
)

export const SparkIcon = (p) => (
  <Svg {...p}>
    <path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M18 6l-2.5 2.5M8.5 15.5 6 18" />
  </Svg>
)

export const PinIcon = (p) => (
  <Svg {...p}>
    <path d="M12 21s7-4.5 7-11a7 7 0 1 0-14 0c0 6.5 7 11 7 11Z" />
    <circle cx="12" cy="10" r="2.3" />
  </Svg>
)

export const StarIcon = ({ filled = true, ...p }) => (
  <Svg {...p} fill={filled ? 'currentColor' : 'none'} strokeWidth={1.2}>
    <path d="m12 3.8 2.5 5.1 5.6.8-4 3.9.9 5.6-5-2.6-5 2.6.9-5.6-4-3.9 5.6-.8L12 3.8Z" />
  </Svg>
)

export const ZoomIcon = (p) => (
  <Svg {...p}>
    <circle cx="11" cy="11" r="6.5" />
    <path d="m16 16 4.5 4.5M11 8.5v5M8.5 11h5" />
  </Svg>
)

export const GiftIcon = (p) => (
  <Svg {...p}>
    <path d="M4 10h16v10H4zM3 7h18v3H3zM12 7v13" />
    <path d="M12 7c-1.5-3-5-3-5-1s3 1 5 1Zm0 0c1.5-3 5-3 5-1s-3 1-5 1Z" />
  </Svg>
)

export const InstagramIcon = (p) => (
  <Svg {...p}>
    <rect x="4" y="4" width="16" height="16" rx="4.5" />
    <circle cx="12" cy="12" r="3.6" />
    <circle cx="17" cy="7" r="0.6" fill="currentColor" />
  </Svg>
)

export const WhatsAppIcon = (p) => (
  <Svg {...p}>
    <path d="M4.5 19.5 5.6 16A7.8 7.8 0 1 1 8.2 18.6l-3.7.9Z" />
    <path d="M9.2 8.6c.2-.5.5-.5.8-.5h.5c.2 0 .4.1.5.4l.6 1.5c.1.2 0 .5-.1.6l-.4.5c-.1.2-.1.4 0 .6.5.9 1.3 1.7 2.3 2.2.2.1.4.1.6-.1l.5-.5c.2-.2.4-.2.6-.1l1.4.7c.2.1.3.3.3.5v.4c0 .7-.6 1.3-1.4 1.4-2.8.2-6.2-2.6-6.6-5.6 0-.7.2-1.5.4-2Z" />
  </Svg>
)

export const HomeIcon = (p) => (
  <Svg {...p}>
    <path d="M4 10.5 12 4l8 6.5V20h-5.5v-5.5h-5V20H4v-9.5Z" />
  </Svg>
)

export const GridIcon = (p) => (
  <Svg {...p}>
    <rect x="4" y="4" width="6.5" height="6.5" />
    <rect x="13.5" y="4" width="6.5" height="6.5" />
    <rect x="4" y="13.5" width="6.5" height="6.5" />
    <rect x="13.5" y="13.5" width="6.5" height="6.5" />
  </Svg>
)

export const TagIcon = (p) => (
  <Svg {...p}>
    <path d="M3.5 12.2V4.5a1 1 0 0 1 1-1h7.7l8.3 8.3a1 1 0 0 1 0 1.4l-7.3 7.3a1 1 0 0 1-1.4 0l-8.3-8.3Z" />
    <circle cx="8" cy="8" r="1.3" />
  </Svg>
)

export const CheckIcon = (p) => (
  <Svg {...p}>
    <path d="m5 12.5 4.5 4.5L19 7.5" />
  </Svg>
)
