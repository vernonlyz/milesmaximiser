import { defineConfig } from 'vitest/config'

// Engine tests are pure functions — no DOM or Vite plugins needed.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
