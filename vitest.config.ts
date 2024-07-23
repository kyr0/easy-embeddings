import { defineConfig } from 'vitest/config'

export default defineConfig({
  base: '/',
  test: {
    browser: {
      provider: 'playwright',
      enabled: true,
      name: 'chromium',
    },
    exclude: ["transformers.js/**/*", "node_modules/**/*"],
  },
})