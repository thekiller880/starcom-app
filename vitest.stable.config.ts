import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react-swc';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/setupVitest.ts',
    include: [
      'src/**/*.test.ts',
      'src/**/*.test.tsx',
      'src/**/*.vitest.ts',
      'test/**/*.test.ts',
      'test/**/*.test.tsx',
      'test/**/*.vitest.ts'
    ],
    exclude: [
      'node_modules',
      'dist',
      'src/testing/playwright/**',
      'tests/e2e/**',
      'tests/visual/**',
      '**/*.integration.test.*',
      '**/*.e2e.test.*',
      '**/*.perf.test.*',
      '**/*.performance.test.*',
      '**/*.stress.test.*',
      '**/*.load.test.*',
      '**/*.benchmark.test.*',
      '**/*Aggressive*.test.*',
      '**/*UltraAggressive*.test.*',
      '**/*.robust.test.*',
      'src/components/Auth/TokenGatedPage.test.tsx',
      'src/components/Auth/WalletStatus.*.test.tsx',
      'src/components/Auth/Web3Login.*.test.tsx'
    ],
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: false,
        minForks: 1,
        maxForks: 2
      }
    },
    isolate: true,
    testTimeout: 15000,
    hookTimeout: 15000,
    teardownTimeout: 15000,
    maxConcurrency: 2,
    sequence: {
      shuffle: false,
      concurrent: false
    },
    passWithNoTests: true
  },
  esbuild: {
    target: 'node14'
  },
  optimizeDeps: {
    exclude: ['@vanilla-extract/sprinkles']
  }
});
