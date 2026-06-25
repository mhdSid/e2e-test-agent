import { defineConfig } from '@playwright/test'

const BASE_URL = process.env.E2E_BASE_URL ?? 'http://localhost:5173'

// Playwright runs ONLY the generated specs under test/integration/__playwright.
export default defineConfig({
  testDir: 'packages/vue-app/test/integration/__playwright',
  testMatch: '**/*.spec.ts',
  use: { baseURL: BASE_URL },
  webServer: {
    command: 'yarn workspace vue-app dev --port 5173',
    url: BASE_URL,
    reuseExistingServer: true
  }
})
