import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['vite.svg'],
      manifest: {
        name: 'sp(eye) - Adaptive Speed Reading',
        short_name: 'sp(eye)',
        description:
          'An adaptive speed reading platform with eye-tracking technology',
        theme_color: '#1a1a2e',
        background_color: '#1a1a2e',
        display: 'standalone',
        start_url: './?source=pwa',
        scope: './',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        globIgnores: ['**/models/**'],
        navigateFallback: 'index.html',
        navigateFallbackDenylist: [/^\/rest\/v1\//, /^\/auth\//],
        runtimeCaching: [
          {
            urlPattern:
              /^https:\/\/cdn\.jsdelivr\.net\/npm\/(@mediapipe|@tensorflow)/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'tf-models',
              expiration: { maxAgeSeconds: 90 * 24 * 60 * 60 },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-stylesheets',
              expiration: { maxAgeSeconds: 365 * 24 * 60 * 60 },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-webfonts',
              expiration: { maxAgeSeconds: 365 * 24 * 60 * 60 },
            },
          },
          // Supabase Storage (avatars, user uploads) — NetworkFirst so updates are reflected promptly; falls back to cache when offline.
          {
            urlPattern: /\/storage\/v1\//,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-storage',
              networkTimeoutSeconds: 5,
              expiration: { maxAgeSeconds: 7 * 24 * 60 * 60, maxEntries: 100 },
            },
          },
          {
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'images',
              expiration: { maxAgeSeconds: 30 * 24 * 60 * 60, maxEntries: 60 },
            },
          },
          {
            urlPattern: /\/rest\/v1\//,
            handler: 'NetworkOnly',
          },
        ],
      },
    }),
  ],
  base: './',
  envDir: '../',
  resolve: {
    alias: {
      webgazer: path.resolve(__dirname, 'src/lib/webgazer-local/src/index.mjs'),
    },
  },
  optimizeDeps: {
    include: [
      '@tensorflow/tfjs',
      '@tensorflow-models/face-landmarks-detection',
      'localforage',
      'regression',
    ],
  },
})
