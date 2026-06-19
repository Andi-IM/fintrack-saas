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
        // High coverage targets for active critical pathway files
        'features/cash-flow/actions/cash_flow.ts': {
          statements: 80,
          functions: 80,
        },
        'lib/utils/transaction.ts': {
          statements: 80,
          functions: 80,
        },
        'features/cash-flow/hooks/use-cash-flow-controller.ts': {
          statements: 80,
          functions: 80,
        },
        // Low global threshold fallback for other components during rollout
        statements: 10,
        functions: 9,
      },
      include: [
        'features/**/*.ts',
        'features/**/*.tsx',
        'lib/utils/**/*.ts',
      ],
      exclude: [
        'features/**/__tests__/**',
      ],
    },
  },
})
