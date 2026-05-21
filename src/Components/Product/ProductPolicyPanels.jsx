import { Link } from 'react-router-dom'
import { PRODUCT_POLICY_SECTIONS } from '../../lib/productPolicies'

const iconPaths = {
  truck: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.5}
      d="M8 17h8M3 9h12l3 4v5H3V9zM16 9V6a1 1 0 00-1-1H6a1 1 0 00-1 1v3"
    />
  ),
  shield: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.5}
      d="M12 3l7 4v5c0 4.2-2.9 7.4-7 9-4.1-1.6-7-4.8-7-9V7l7-4z"
    />
  ),
  sparkle: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.5}
      d="M12 3v3m0 12v3M3 12h3m12 0h3M5.6 5.6l2.1 2.1m8.6 8.6l2.1 2.1M18.4 5.6l-2.1 2.1M7.9 16.1l-2.1 2.1"
    />
  ),
  chat: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.5}
      d="M8 10h8M8 14h5M6 18l-2 2V6a2 2 0 012-2h12a2 2 0 012 2v8a2 2 0 01-2 2H8z"
    />
  ),
}

export default function ProductPolicyPanels() {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {PRODUCT_POLICY_SECTIONS.map((section) => (
        <div
          key={section.id}
          className="rounded-xl border border-[#d4af37]/20 bg-[#fbf7f1] p-5 shadow-[0_12px_36px_-24px_rgba(19,0,6,0.2)]"
        >
          <div className="mb-3 flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#3d0a21]/8 text-[#3d0a21]">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                {iconPaths[section.icon]}
              </svg>
            </span>
            <h3 className="font-serif text-lg text-[#130006]">{section.title}</h3>
          </div>
          <ul className="space-y-2 text-sm leading-relaxed text-[#514347]">
            {section.items.map((item) => (
              <li key={item} className="flex gap-2">
                <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-[#d4af37]" aria-hidden />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
      <p className="sm:col-span-2 text-center text-xs text-[#847377]">
        Full terms on{' '}
        <Link to="/shipping-returns" className="text-[#6f334a] underline-offset-2 hover:underline">
          Shipping &amp; Returns
        </Link>
        .
      </p>
    </div>
  )
}
