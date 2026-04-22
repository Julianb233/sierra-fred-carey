import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  define: {
    // Force React to load its development CJS build which includes React.act()
    // Without this, Vite's production optimization strips act() and breaks @testing-library/react
    'process.env.NODE_ENV': '"test"',
  },
  test: {
    environment: 'jsdom',
    globals: true,
    env: {
      NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key',
      SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key',
      JWT_SECRET: 'test-jwt-secret-key-for-testing-purposes-only',
    },
    setupFiles: ['./vitest.setup.ts'],
    include: ['**/*.test.{ts,tsx}', '**/__tests__/**/*.{ts,tsx}'],
    // NOTE: '**/node_modules/**' (not just 'node_modules') to also exclude
    // funnel/node_modules/zod/**/*.test.ts — the Vite sub-project under
    // funnel/ ships zod's own test files that would otherwise run here.
    exclude: ['**/node_modules/**', '.next', 'dist', '.claude', 'funnel/**'],
    pool: 'threads',
    fileParallelism: false,
    maxWorkers: 2,
    minWorkers: 1,
    testTimeout: 30000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        '.next/',
        '**/*.config.*',
        '**/types/**',
      ],
      thresholds: {
        lines: 70,
        branches: 60,
        functions: 60,
        statements: 70,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
})
