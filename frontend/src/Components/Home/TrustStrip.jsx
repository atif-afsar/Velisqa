import { Link } from 'react-router-dom'
import { GemIcon, GiftIcon, LockIcon, ReturnIcon, TruckIcon } from '../UI/Icons'

const ITEMS = [
  { icon: GemIcon, title: 'Skin-safe finish', text: 'Made to be worn every day', to: '/authenticity' },
  { icon: TruckIcon, title: 'Free shipping', text: 'On all prepaid orders in India', to: '/shipping-delivery' },
  { icon: ReturnIcon, title: '5-day returns', text: 'Simple, tracked returns', to: '/refund-cancellation' },
  { icon: LockIcon, title: 'Secure payment', text: 'UPI, cards, net banking or COD', to: '/faq' },
  { icon: GiftIcon, title: 'Gift-ready', text: 'Gift wrap at checkout', to: '/faq' },
]

/** "Shop with confidence": materials, shipping, returns, payment and gifting. */
export default function TrustStrip({ className = '' }) {
  return (
    <section aria-labelledby="confidence-heading" className={`border-y border-line bg-mist ${className}`}>
      <div className="container-lux py-12 lg:py-16">
        <h2 id="confidence-heading" className="text-center font-serif text-[1.75rem] leading-tight text-ink sm:text-[2.25rem]">
          Shop with confidence
        </h2>
        <ul className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:mt-10 lg:grid-cols-5 lg:gap-5">
          {ITEMS.map(({ icon: Icon, title, text, to }) => (
            <li key={title} className="last:col-span-2 sm:last:col-span-1">
              <Link to={to} className="group flex h-full flex-col items-center bg-paper px-3 py-6 text-center transition-shadow hover:shadow-[0_6px_24px_rgba(0,0,0,0.06)]">
                <Icon size={28} strokeWidth={1.1} className="text-ink transition-colors group-hover:text-accent-ink" />
                <span className="eyebrow mt-4 text-ink">{title}</span>
                <span className="mt-1.5 text-[0.8125rem] leading-snug text-muted">{text}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
