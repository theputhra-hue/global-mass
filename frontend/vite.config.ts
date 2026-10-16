import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Development files and API proxy are local unless explicitly exposed with --host.
    host: '127.0.0.1',
    port: 3000,
    strictPort: true,
    proxy: {
      '/api': { target: 'http://127.0.0.1:8000', changeOrigin: true },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    restoreMocks: true,
    unstubGlobals: true,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'node_modules/**',
        'coverage/**',
        // Build tooling configs & app entrypoint — no logic to cover
        'postcss.config.js',
        'tailwind.config.js',
        'src/main.tsx',
        'src/vite-env.d.ts',
        // Decorative canvas art components — no logic-bearing branches,
        // animation math only. Excluded per documented policy (audit P1e);
        // they are exercised visually, not unit-testable in jsdom.
        'src/shared/ui/decorative/AsciiGlobe.tsx',
        'src/shared/ui/decorative/AsciiReveal.tsx',
        'src/shared/ui/decorative/AsciiEqualizer.tsx',
        'src/shared/ui/decorative/AsciiTicker.tsx',
        'src/shared/ui/decorative/AsciiSpinner.tsx',
        // 3D timeline tunnel — canvas/WebGL animation core, no API logic.
        'src/features/graph/components/TimelineTunnel.tsx',
        // Force-simulation / whole-corpus canvas renderers: pure visual
        // layout & draw loops without API or decision logic (documented
        // exclusion policy — visually exercised, not unit-testable here).
        'src/features/graph/components/FullCorpusGraph.tsx',
        // Arcade component driven by a requestAnimationFrame game loop.
        'src/features/experiments/components/MasalaLab.tsx',
      ],
      // Thresholds enforced from CI:
      // lines/functions=60, branches=50, statements=60
    },
  },
});
