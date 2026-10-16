import { Link } from 'react-router-dom'
import { GemIcon, GiftIcon, LockIcon, ReturnIcon, TruckIcon } from '../UI/Icons'

const ITEMS = [
  { icon: GemIcon, title: 'Skin-safe finish', text: 'Made to be worn every day', to: '/authenticity' },
  { icon: TruckIcon, title: 'Free shipping', text: 'On all prepaid orders in India', to: '/shipping-delivery' },
  { icon: ReturnIcon, title: '5-day returns', text: 'Simple, tracked returns', to: '/refund-cancellation' },
  { icon: LockIcon, title: 'Secure payment', text: 'UPI, cards & net banking via Razorpay', to: '/faq' },
  { icon: GiftIcon, title: 'Gift-ready', text: 'Gift wrap at checkout', to: '/faq' },
]

/** Materials, shipping, returns, payment and gifting reassurance. */
export default function TrustStrip({ className = '' }) {
  return (
    <section aria-label="Why shop with Velisqa" className={`border-y border-line ${className}`}>
      <ul className="container-lux grid grid-cols-2 gap-x-6 gap-y-8 py-12 sm:grid-cols-3 lg:grid-cols-5 lg:py-14">
        {ITEMS.map(({ icon: Icon, title, text, to }) => (
          <li key={title} className="last:col-span-2 last:sm:col-span-1">
            <Link to={to} className="group flex flex-col items-center text-center">
              <Icon size={26} strokeWidth={1.1} className="text-ink transition-colors group-hover:text-accent" />
              <span className="eyebrow mt-4 text-ink">{title}</span>
              <span className="mt-1.5 text-sm text-muted">{text}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
