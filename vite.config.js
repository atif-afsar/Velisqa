import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

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
    port: 5173,
  },
  build: {
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
          if (id.includes('@supabase')) return 'supabase'
          return 'vendor'
        },
      },
    },
  },
})
