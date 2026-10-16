import { Link, useLocation } from 'react-router-dom'
import { SHOP_CATEGORIES, categoryPath } from '../data/shopCategories'
import { CONTACT_EMAIL, INSTAGRAM_URL, WHATSAPP_PHONE } from './SEO/siteConfig'
import { createWhatsAppLink } from './WhatsApp/whatsapp'
import NewsletterForm from './Common/NewsletterForm'
import { InstagramIcon, WhatsAppIcon } from './UI/Icons'

const HELP_LINKS = [
  { label: 'Contact us', to: '/contact' },
  { label: 'Track your order', to: '/account/orders' },
  { label: 'Shipping & delivery', to: '/shipping-delivery' },
  { label: 'Returns & refunds', to: '/refund-cancellation' },
  { label: 'FAQ', to: '/faq' },
]

const HOUSE_LINKS = [
  { label: 'Our story', to: '/about' },
  { label: 'Founders', to: '/founders' },
  { label: 'Authenticity', to: '/authenticity' },
  { label: 'Creators programme', to: '/models' },
]

const LEGAL_LINKS = [
  { label: 'Privacy', to: '/privacy' },
  { label: 'Terms', to: '/terms' },
  { label: 'Shipping', to: '/shipping-delivery' },
  { label: 'Refunds', to: '/refund-cancellation' },
]

/** Routes where the full footer is hidden (focused flows). */
const HIDDEN_PREFIXES = ['/admin', '/checkout', '/pay/']

function Column({ title, children }) {
  return (
    <div>
      <h2 className="eyebrow text-ink">{title}</h2>
      <ul className="mt-5 space-y-1">{children}</ul>
    </div>
  )
}

function FooterLink({ to, children }) {
  return (
    <li>
      <Link to={to} className="inline-flex min-h-9 items-center text-sm text-body transition-colors hover:text-accent-ink">
        {children}
      </Link>
    </li>
  )
}

export default function SiteFooter() {
  const { pathname } = useLocation()
  if (HIDDEN_PREFIXES.some((p) => pathname.startsWith(p))) return null
  // The homepage has its own newsletter band directly above the footer.
  const showNewsletter = pathname !== '/'

  return (
    <footer className="border-t border-line bg-mist" aria-labelledby="footer-heading">
      <h2 id="footer-heading" className="sr-only">
        Footer
      </h2>
      <div className="container-lux grid gap-12 py-16 md:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr] lg:gap-10 lg:py-20">
        <div className="max-w-sm">
          <p className="font-logo text-2xl uppercase text-ink">Velisqa</p>
          <p className="mt-4 text-sm leading-relaxed text-body">
            Modern jewellery, designed in India.{showNewsletter && ' Sign up for new collections, private previews and styling notes.'}
          </p>
          {showNewsletter && <NewsletterForm source="footer" className="mt-6" />}
          <div className="mt-2 flex items-center gap-1">
            <a
              href={INSTAGRAM_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="grid h-11 w-11 place-items-center text-ink hover:text-accent-ink"
              aria-label="Velisqa on Instagram"
            >
              <InstagramIcon size={20} />
            </a>
            <a
              href={createWhatsAppLink('Hi Velisqa!')}
              target="_blank"
              rel="noopener noreferrer"
              className="grid h-11 w-11 place-items-center text-ink hover:text-accent-ink"
              aria-label="Chat with Velisqa on WhatsApp"
            >
              <WhatsAppIcon size={20} />
            </a>
          </div>
        </div>

        <Column title="Shop">
          {SHOP_CATEGORIES.map((c) => (
            <FooterLink key={c.slug} to={categoryPath(c)}>
              {c.label}
            </FooterLink>
          ))}
          <FooterLink to="/collections?sort=newest">New arrivals</FooterLink>
          <FooterLink to="/collections">Shop all</FooterLink>
        </Column>

        <Column title="Help">
          {HELP_LINKS.map((l) => (
            <FooterLink key={l.label} to={l.to}>
              {l.label}
            </FooterLink>
          ))}
        </Column>

        <Column title="The house">
          {HOUSE_LINKS.map((l) => (
            <FooterLink key={l.label} to={l.to}>
              {l.label}
            </FooterLink>
          ))}
          <li className="pt-3 text-sm text-body">
            <a href={`mailto:${CONTACT_EMAIL}`} className="inline-flex min-h-9 items-center hover:text-accent-ink">
              {CONTACT_EMAIL}
            </a>
            <br />
            <a href={`tel:${WHATSAPP_PHONE}`} className="inline-flex min-h-9 items-center hover:text-accent-ink">
              {WHATSAPP_PHONE.replace(/^\+91/, '+91 ')}
            </a>
          </li>
        </Column>
      </div>

      <div className="border-t border-line">
        <div className="container-lux flex flex-col items-center justify-between gap-3 py-6 text-xs text-muted sm:flex-row">
          <p>© {new Date().getFullYear()} Velisqa Jewellery. All rights reserved.</p>
          <nav aria-label="Legal" className="flex flex-wrap justify-center gap-x-5">
            {LEGAL_LINKS.map((l) => (
              <Link key={l.label} to={l.to} className="inline-flex min-h-9 items-center hover:text-ink">
                {l.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </footer>
  )
}
