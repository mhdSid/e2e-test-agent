import { defineConfig } from '@playwright/test'

// Per-package Playwright config: this app owns its generated specs, dev server and port.
// Other packages (vue-app-1..n) carry their own config with their own port.
const BASE_URL = process.env.E2E_BASE_URL ?? 'http://localhost:5173'

export default defineConfig({
  testDir: 'test/integration/__playwright',
  testMatch: '**/*.spec.ts',
  use: { baseURL: BASE_URL },
  webServer: {
    command: 'yarn dev --port 5173 --strictPort',
    url: BASE_URL,
    reuseExistingServer: true
  }
})
