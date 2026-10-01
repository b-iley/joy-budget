import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  // Served from https://b-iley.github.io/joy-budget/, a subpath — every
  // asset/manifest/service-worker path below has to account for that instead
  // of assuming the site lives at the domain root.
  base: '/joy-budget/',
  build: {
    rollupOptions: {
      output: {
        // Two kinds of chunks should never be eagerly precached by the PWA
        // (below): (1) lucide-react's dynamic icon lookup (used for
        // user-defined custom category icons) statically references ~1600
        // possible icon modules, so Rollup emits a separate tiny chunk per
        // icon "just in case"; (2) pdfjs-dist, only used by the lazy-loaded
        // statement-upload page, is large on its own. Route both into a
        // shared "lazy" folder so the workbox globIgnores below can exclude
        // it in one place — otherwise every install/update eagerly downloads
        // ~1MB+ nobody asked for instead of fetching it on first real use.
        chunkFileNames: (chunkInfo) => {
          const isLazyOnDemand = chunkInfo.moduleIds.some(
            (id) => (id.includes('lucide-react') && id.includes('/icons/')) || id.includes('pdfjs-dist')
          )
          return isLazyOnDemand ? 'assets/lazy/[hash].js' : 'assets/[name]-[hash].js'
        },
      },
    },
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'Joy Family - 가계부',
        short_name: 'Joy Family',
        description: 'Joy Family 가계부 - 우리 가족 수입/지출 관리 앱',
        theme_color: '#4894FE',
        background_color: '#FFFFFF',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/joy-budget/',
        scope: '/joy-budget/',
        lang: 'ko',
        icons: [
          {
            src: '/joy-budget/icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/joy-budget/icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: '/joy-budget/icons/icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico}'],
        globIgnores: ['**/assets/lazy/**'],
      },
    }),
  ],
})
