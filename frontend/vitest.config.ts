import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    alias: {
      '@': path.resolve(__dirname, './'),
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      thresholds: {
        // Enforce progressive safety thresholds globally across core files
        perFile: false,
        autoUpdate: false,
        statements: 10,
        functions: 9,
      },
      include: [
        'lib/actions/**/*.ts',
        'lib/utils/**/*.ts',
        'components/transactions/**/*.tsx',
      ],
      exclude: [
        'components/transactions/__tests__/**',
      ],
    },
  },
})
