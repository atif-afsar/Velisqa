/** Load GTM/gtag after idle so they do not compete with first paint and hydration. */
export function deferAnalytics() {
  if (typeof window === 'undefined') return

  const run = () => {
    loadGtag()
    loadGtm()
  }

  if ('requestIdleCallback' in window) {
    requestIdleCallback(run, { timeout: 2500 })
  } else {
    window.setTimeout(run, 1200)
  }
}

function loadGtag() {
  if (document.getElementById('velisqa-gtag')) return

  const gtagScript = document.createElement('script')
  gtagScript.id = 'velisqa-gtag'
  gtagScript.async = true
  gtagScript.src = 'https://www.googletagmanager.com/gtag/js?id=G-Z6J5SYNRPD'
  document.head.appendChild(gtagScript)

  window.dataLayer = window.dataLayer || []
  function gtag() {
    window.dataLayer.push(arguments)
  }
  window.gtag = gtag
  gtag('js', new Date())
  gtag('config', 'G-Z6J5SYNRPD')
}

function loadGtm() {
  if (document.getElementById('velisqa-gtm')) return

  window.dataLayer = window.dataLayer || []
  window.dataLayer.push({ 'gtm.start': new Date().getTime(), event: 'gtm.js' })

  const script = document.createElement('script')
  script.id = 'velisqa-gtm'
  script.async = true
  script.src = 'https://www.googletagmanager.com/gtm.js?id=GTM-MX7RN85B'
  document.head.appendChild(script)
}
