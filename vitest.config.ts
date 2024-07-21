import { defineConfig } from 'vitest/config'

export default defineConfig({
  base: '/',
  test: {
    browser: {
      provider: 'playwright', // or 'webdriverio'
      enabled: true,
      name: 'chromium', // browser name is required
    },
    exclude: ["transformers.js/**/*", "node_modules/**/*"],
  },
})