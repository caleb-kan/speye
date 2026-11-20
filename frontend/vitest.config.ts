/// <reference types="vitest" />
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: './',
  envDir: '../',
  test: {
    globals: true,
    environment: 'jsdom',
    // Node 25+ defines its own localStorage global, which hides jsdom's.
    execArgv: ['--no-experimental-webstorage'],
    setupFiles: ['./src/tests/setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx,js,jsx}'],
    exclude: ['**/node_modules/**', 'e2e/**', '**/e2e/**'],
    alias: {
      webgazer: path.resolve(
        import.meta.dirname,
        './src/tests/helpers/webgazer.ts'
      ),
    },
  },
})
