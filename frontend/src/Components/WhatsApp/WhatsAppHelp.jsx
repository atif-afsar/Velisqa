import { useLocation } from 'react-router-dom'
import { createWhatsAppLink } from './whatsapp'
import { WhatsAppIcon } from '../UI/Icons'
import { analytics } from '../../lib/analytics'

const SHOW_ON = [/^\/product\//, /^\/cart$/, /^\/checkout$/]

/** "Questions? Chat with us" — product, bag and checkout pages; always above any sticky CTA bar. */
export default function WhatsAppHelp() {
  const { pathname } = useLocation()
  if (!SHOW_ON.some((re) => re.test(pathname))) return null
  const message = pathname.startsWith('/product/')
    ? `Hi Velisqa, I have a question about this piece: ${typeof window !== 'undefined' ? window.location.href : ''}`
    : 'Hi Velisqa, I have a question about my order.'
  return (
    <a
      href={createWhatsAppLink(message)}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => analytics.contact('whatsapp')}
      className={`${pathname.startsWith('/product/') ? 'whatsapp-on-product ' : ''}floating-above-cta fixed right-3 z-[55] flex h-12 items-center gap-2 rounded-full bg-[#1f8f4e] px-4 text-sm font-medium text-white shadow-lg transition-transform hover:scale-[1.03] lg:right-6`}
      aria-label="Questions? Chat with us on WhatsApp"
    >
      <WhatsAppIcon size={20} />
      <span className="hidden sm:inline">Questions? Chat with us</span>
    </a>
  )
}
