import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Local dev server port and the API it proxies to (the browser tests use their own pair).
const DEV_PORT = Number(globalThis.process?.env?.VELISQA_DEV_PORT || 5173)
const DEV_API = globalThis.process?.env?.VELISQA_DEV_API || 'http://localhost:5000'

/** Fonts needed for first paint (body sans + heading serif). */
const CRITICAL_FONTS = [/inter-var-[\w-]+\.woff2$/, /cormorant-500-[\w-]+\.woff2$/]

/** Injects <link rel="preload"> for the hashed critical font files at build time. */
function preloadCriticalFonts() {
  return {
    name: 'velisqa-preload-critical-fonts',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler(_html, ctx) {
        if (!ctx.bundle) return []
        return Object.keys(ctx.bundle)
          .filter((file) => CRITICAL_FONTS.some((re) => re.test(file)))
          .map((file) => ({
            tag: 'link',
            attrs: { rel: 'preload', as: 'font', type: 'font/woff2', href: `/${file}`, crossorigin: '' },
            injectTo: 'head-prepend',
          }))
      },
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), preloadCriticalFonts()],
  server: {
    host: true,
    port: DEV_PORT,
    strictPort: DEV_PORT !== 5173,
    // Dev only: the storefront calls /api/v1 on its own origin and Vite forwards it to the local API,
    // so the site works from localhost, 127.0.0.1 or a phone on the LAN without CORS changes.
    // The Origin header is pinned to the allow-listed dev origin for the API's CSRF check.
    proxy: {
      '/api': {
        target: DEV_API,
        configure(proxy) {
          proxy.on('proxyReq', (req) => {
            if (req.getHeader('origin')) req.setHeader('origin', `http://localhost:${DEV_PORT}`)
          })
        },
      },
    },
  },
  build: {
    // Read by scripts/prerender.mjs to preload each page's chunk (then deleted from dist).
    manifest: true,
    cssCodeSplit: true,
    minify: 'oxc',
    modulePreload: {
      polyfill: false,
    },
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined
          if (id.includes('react') || id.includes('react-router-dom')) return 'react'
          return 'vendor'
        },
      },
    },
  },
})
