import { createElement, lazy } from 'react'
import { matchPath } from 'react-router-dom'

/**
 * Code-split page whose chunk can be loaded ahead of rendering. Once loaded it renders
 * synchronously (no Suspense fallback), so a prerendered page never flashes blank.
 */
function lazyPage(factory) {
  let Loaded = null
  const load = () =>
    factory().then((m) => {
      Loaded = m.default
      return m
    })
  const Lazy = lazy(load)
  function Page(props) {
    return createElement(Loaded ?? Lazy, props)
  }
  Page.preload = () => (Loaded ? Promise.resolve() : load())
  return Page
}

export const About = lazyPage(() => import('./Pages/About'))
export const Collections = lazyPage(() => import('./Pages/Collections'))
export const Models = lazyPage(() => import('./Pages/Models'))
export const SEOLanding = lazyPage(() => import('./Pages/SEOLanding'))
export const Privacy = lazyPage(() => import('./Pages/Privacy'))
export const Terms = lazyPage(() => import('./Pages/Terms'))
export const Authenticity = lazyPage(() => import('./Pages/Authenticity'))
export const Shipping = lazyPage(() => import('./Pages/Shipping'))
export const ShippingDelivery = lazyPage(() => import('./Pages/ShippingDelivery'))
export const RefundCancellation = lazyPage(() => import('./Pages/RefundCancellation'))
export const Contact = lazyPage(() => import('./Pages/Contact'))
export const FAQ = lazyPage(() => import('./Pages/FAQ'))
export const Order = lazyPage(() => import('./Pages/Order'))
export const Login = lazyPage(() => import('./Pages/Login'))
export const AuthCallback = lazyPage(() => import('./Pages/AuthCallback'))
export const ResetPassword = lazyPage(() => import('./Pages/ResetPassword'))
export const AdminLogin = lazyPage(() => import('./Pages/AdminLogin'))
export const AdminHero = lazyPage(() => import('./Pages/AdminHero'))
export const AdminBulkProducts = lazyPage(() => import('./Pages/AdminBulkProducts'))
export const AdminHome = lazyPage(() => import('./Pages/AdminHome'))
export const AdminDashboard = lazyPage(() => import('./Pages/AdminDashboard'))
export const AdminCoupons = lazyPage(() => import('./Pages/AdminCoupons'))
export const ProductDetail = lazyPage(() => import('./Pages/ProductDetail'))
export const SearchResults = lazyPage(() => import('./Pages/SearchResults'))
export const Cart = lazyPage(() => import('./Pages/Cart'))
export const Checkout = lazyPage(() => import('./Pages/Checkout'))
export const Wishlist = lazyPage(() => import('./Pages/Wishlist'))
export const ManualPayment = lazyPage(() => import('./Pages/ManualPayment'))
export const ManualPaymentConfirmation = lazyPage(() => import('./Pages/ManualPaymentConfirmation'))
export const OrderTracking = lazyPage(() => import('./Pages/OrderTracking'))
export const AdminPayments = lazyPage(() => import('./Pages/AdminPayments'))
export const AdminOrders = lazyPage(() => import('./Pages/AdminOrders'))
export const AdminReviews = lazyPage(() => import('./Pages/AdminReviews'))
export const AdminReturns = lazyPage(() => import('./Pages/AdminReturns'))
export const MyOrders = lazyPage(() => import('./Pages/MyOrders'))
export const Founders = lazyPage(() => import('./Pages/Founders'))
export const AdminAnalytics = lazyPage(() => import('./Pages/AdminAnalytics'))
export const NotFound = lazyPage(() => import('./Pages/NotFound'))

/** Public, prerendered routes (in App's matching order) whose chunk loads before the first render. */
const PRELOAD_ROUTES = [
  ['/about', About],
  ['/collections', Collections],
  ['/collections/:slug', Collections],
  ['/product/:id', ProductDetail],
  ['/privacy', Privacy],
  ['/terms', Terms],
  ['/authenticity', Authenticity],
  ['/contact', Contact],
  ['/shipping-delivery', ShippingDelivery],
  ['/refund-cancellation', RefundCancellation],
  ['/faq', FAQ],
  ['/founders', Founders],
  ['/order', Order],
  ['/models', Models],
]

export function preloadRouteFor(pathname) {
  const hit = PRELOAD_ROUTES.find(([pattern]) => matchPath(pattern, pathname))
  if (hit) return hit[1].preload()
  // Single-segment URLs are SEO landing pages (or 404s, which SEOLanding renders).
  if (matchPath('/:slug', pathname)) return SEOLanding.preload()
  return Promise.resolve()
}
