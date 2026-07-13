import { Link } from 'react-router-dom'

const TRUST_ITEMS = [
  { label: 'Easy returns', href: '/refund-cancellation' },
  { label: 'Authenticity', href: '/authenticity' },
]

export default function ProductDetailTrust({ soldOut }) {
  return (
    <ul className="flex flex-col gap-2 border-y border-[#130006]/8 py-4 text-sm text-[#514347]">
      <li className="flex items-center gap-2">
        <span
          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] ${
            soldOut ? 'bg-[#c9a75a]/20 text-[#8a6b1f]' : 'bg-emerald-600/15 text-emerald-800'
          }`}
          aria-hidden
        >
          {soldOut ? '—' : '✓'}
        </span>
        <span className={soldOut ? 'text-[#8a6b1f]' : 'font-medium text-[#130006]'}>
          {soldOut ? 'Out of stock — enquire this product on WhatsApp' : 'In stock — ready to ship'}
        </span>
      </li>
      {TRUST_ITEMS.map(({ label, href }) => (
        <li key={label}>
          <Link to={href} className="flex items-center gap-2 transition hover:text-[#6f334a]">
            <span className="text-[#d4af37]" aria-hidden>
              ◆
            </span>
            {label}
          </Link>
        </li>
      ))}
    </ul>
  )
}
