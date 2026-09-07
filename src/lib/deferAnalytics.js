/**
 * Deferred analytics tag loader.
 *
 * Loads GA4, GTM, Meta Pixel, Google Ads, and Microsoft Clarity after the
 * browser is idle, respecting user consent choices.
 *
 * Tags are loaded from environment variables — nothing is hard-coded.
 */

import { getConsent, hasConsentDecision } from './consent'
import { trackMetaPageView } from './metaPixel'

const GA4_ID = String(import.meta.env.VITE_GA4_MEASUREMENT_ID || '').trim()
const GTM_ID = String(import.meta.env.VITE_GTM_ID || '').trim()
const ADS_ID = String(import.meta.env.VITE_GOOGLE_ADS_ID || '').trim()
const META_PIXEL_ID = String(import.meta.env.VITE_META_PIXEL_ID || '').trim()
const CLARITY_ID = String(import.meta.env.VITE_CLARITY_ID || '').trim()

let analyticsLoaded = false
let advertisingLoaded = false

/**
 * Called once on app start. Loads tags immediately if consent is already
 * granted, otherwise waits for the consent-update event.
 */
export function deferAnalytics() {
  if (typeof window === 'undefined') return

  // Listen for future consent changes
  window.addEventListener('velisqa:consent-update', handleConsentUpdate)

  if (hasConsentDecision()) {
    scheduleLoad(false)
  }
  // If no decision yet, tags will load when ConsentBanner dispatches the event
}

function handleConsentUpdate() {
  const consent = getConsent() || {}
  // If either category is newly granted, load immediately without idle delay
  if ((consent.analytics && !analyticsLoaded) || (consent.advertising && !advertisingLoaded)) {
    scheduleLoad(true)
  }
}

function scheduleLoad(immediate = false) {
  const run = () => loadAllTags()

  if (immediate) {
    run()
  } else if ('requestIdleCallback' in window) {
    requestIdleCallback(run, { timeout: 2500 })
  } else {
    window.setTimeout(run, 1200)
  }
}

function loadAllTags() {
  const consent = getConsent() || {}

  // Always initialize dataLayer
  window.dataLayer = window.dataLayer || []

  // Analytics tags (GA4, GTM, Clarity) — require analytics consent
  if (consent.analytics && !analyticsLoaded) {
    analyticsLoaded = true
    loadGtag()
    loadGtm()
    loadClarity()
  }

  // Advertising tags (Meta Pixel, Google Ads config) — require advertising consent
  if (consent.advertising && !advertisingLoaded) {
    advertisingLoaded = true
    loadMetaPixel()
    loadGoogleAds()
  }
}

// ── Individual Tag Loaders ──────────────────────────────────

function loadGtag() {
  if (!GA4_ID || document.getElementById('velisqa-gtag')) return

  const script = document.createElement('script')
  script.id = 'velisqa-gtag'
  script.async = true
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA4_ID}`
  document.head.appendChild(script)

  window.dataLayer = window.dataLayer || []
  function gtag() {
    window.dataLayer.push(arguments)
  }
  window.gtag = gtag
  gtag('js', new Date())
  gtag('config', GA4_ID, { send_page_view: false }) // We fire page_view manually on SPA route changes
}

function loadGtm() {
  if (!GTM_ID || document.getElementById('velisqa-gtm')) return

  window.dataLayer = window.dataLayer || []
  window.dataLayer.push({ 'gtm.start': new Date().getTime(), event: 'gtm.js' })

  const script = document.createElement('script')
  script.id = 'velisqa-gtm'
  script.async = true
  script.src = `https://www.googletagmanager.com/gtm.js?id=${GTM_ID}`
  document.head.appendChild(script)
}

function loadGoogleAds() {
  if (!ADS_ID || typeof window.gtag !== 'function') return
  window.gtag('config', ADS_ID)
}

function loadMetaPixel() {
  if (!META_PIXEL_ID || document.getElementById('velisqa-meta-pixel')) return

  if (!window.fbq) {
    const fbq = function (...args) {
      if (fbq.callMethod) {
        fbq.callMethod(...args)
      } else {
        fbq.queue.push(args)
      }
    }
    fbq.push = fbq
    fbq.loaded = true
    fbq.version = '2.0'
    fbq.queue = []
    window.fbq = fbq
    window._fbq = fbq
  }

  const script = document.createElement('script')
  script.id = 'velisqa-meta-pixel'
  script.async = true
  script.src = 'https://connect.facebook.net/en_US/fbevents.js'
  document.head.appendChild(script)

  window.fbq('init', META_PIXEL_ID)
  trackMetaPageView()
}

function loadClarity() {
  if (!CLARITY_ID || document.getElementById('velisqa-clarity')) return

  const script = document.createElement('script')
  script.id = 'velisqa-clarity'
  script.async = true
  script.textContent = `
    (function(c,l,a,r,i,t,y){
      c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
      t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
      y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
    })(window,document,"clarity","script","${CLARITY_ID}");
  `
  document.head.appendChild(script)
}
