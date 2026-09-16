import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/pwa',
  workers: 1,
  fullyParallel: false,
  retries: 0,
  timeout: 30_000,
  reporter: [['list'], ['html', { outputFolder: 'pwa-report', open: 'never' }]],
  outputDir: 'pwa-test-results',
  use: {
    baseURL: 'http://127.0.0.1:5184',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'npm run build && node tests/pwa/server.mjs',
    url: 'http://127.0.0.1:5184',
    reuseExistingServer: false,
    timeout: 180_000,
    env: {
      VITE_BASE_PATH: '/',
      VITE_SUPABASE_URL: 'http://localhost:54323',
      VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY: 'test-anon-key',
    },
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
})
