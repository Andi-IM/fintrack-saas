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
    reporters: ['default', 'junit'],
    outputFile: {
      junit: './report.junit.xml',
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      thresholds: {
        // High coverage targets for critical pathways
        'lib/actions/**/*.ts': {
          statements: 80,
          functions: 80,
        },
        'lib/utils/**/*.ts': {
          statements: 80,
          functions: 80,
        },
        'components/transactions/**/*.tsx': {
          statements: 80,
          functions: 80,
        },
        // Low global threshold fallback for other components during rollout
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
