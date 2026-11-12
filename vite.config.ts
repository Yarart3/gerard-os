/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// GitHub Pages sirve el repo en /gerard-os/
export default defineConfig(({ command, isPreview }) => {
  // `vite preview` sirve el build, que usa la misma base que producción
  const base = command === 'build' || isPreview ? '/gerard-os/' : '/'
  return {
    base,
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.svg', 'apple-touch-icon-180x180.png'],
        manifest: {
          name: 'Gerard OS',
          short_name: 'Gerard OS',
          description: 'Hub personal: Hoy, Gym, Agenda, Inglés y Personal',
          lang: 'es',
          theme_color: '#F2F2F7',
          background_color: '#F2F2F7',
          display: 'standalone',
          id: base,
          start_url: base,
          scope: base,
          orientation: 'any',
          categories: ['productivity', 'lifestyle'],
          icons: [
            { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
            { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
            { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
            { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
          runtimeCaching: [
            {
              // Lectura offline: GETs a la API REST de Supabase, red primero y caché si no hay red
              urlPattern: ({ url, request }) =>
                request.method === 'GET' &&
                url.hostname.endsWith('.supabase.co') &&
                url.pathname.startsWith('/rest/'),
              handler: 'NetworkFirst',
              options: {
                cacheName: 'supabase-rest',
                networkTimeoutSeconds: 4,
                expiration: { maxEntries: 300, maxAgeSeconds: 60 * 60 * 24 * 7 },
              },
            },
          ],
        },
      }),
    ],
    build: {
      rolldownOptions: {
        output: {
          // Vendors separados: se cachean aparte y Recharts (solo Gym) no pesa en la carga inicial.
          codeSplitting: {
            groups: [
              { name: 'react', test: /node_modules\/(react|react-dom|scheduler)\//, priority: 40 },
              {
                name: 'recharts',
                test: /node_modules\/(recharts|d3-[^/]+|victory-vendor|internmap|decimal\.js-light|immer|@reduxjs|redux|reselect|react-redux|es-toolkit|eventemitter3|tiny-invariant)\//,
                priority: 30,
              },
              { name: 'supabase', test: /node_modules\/@supabase\//, priority: 20 },
              {
                name: 'router',
                test: /node_modules\/(react-router|react-router-dom|@remix-run)\//,
                priority: 20,
              },
              { name: 'query', test: /node_modules\/@tanstack\//, priority: 20 },
              { name: 'zod', test: /node_modules\/zod\//, priority: 20 },
            ],
          },
        },
      },
    },
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.ts'],
      // Los tests nunca usan el Supabase real: valores ficticios para que no dependan de .env.local (en CI no existe).
      env: { VITE_SUPABASE_URL: 'http://localhost:54321', VITE_SUPABASE_ANON_KEY: 'test-anon-key' },
      css: { modules: { classNameStrategy: 'non-scoped' } },
    },
  }
})
