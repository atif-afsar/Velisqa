import { Link } from 'react-router-dom'
import SEOHead from '../Components/SEO/SEOHead'
import { SHOP_CATEGORIES, categoryPath } from '../data/shopCategories'

/** 404 — noindex, with the main ways back into the shop. */
export default function NotFound() {
  return (
    <main className="page-offset-nav min-h-[70svh] bg-paper text-ink">
      <SEOHead title="Page not found | Velisqa" description="This page could not be found." noindex />
      <div className="container-lux py-20 text-center lg:py-28">
        <p className="eyebrow text-muted">404</p>
        <h1 className="type-display mt-4">This page has moved on</h1>
        <p className="mx-auto mt-4 max-w-md text-body">The link may be old or mistyped. Here are some places to start instead.</p>
        <ul className="mx-auto mt-10 flex max-w-xl flex-wrap justify-center gap-2">
          {SHOP_CATEGORIES.map((c) => (
            <li key={c.slug}>
              <Link to={categoryPath(c)} className="inline-flex min-h-10 items-center rounded-full border border-line-strong px-4 text-sm text-ink hover:border-ink">
                {c.label}
              </Link>
            </li>
          ))}
        </ul>
        <Link to="/collections" className="btn btn-primary mt-10">
          Shop all jewellery
        </Link>
      </div>
    </main>
  )
}
