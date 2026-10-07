import type { Config } from 'tailwindcss';

/**
 * Design tokens. Mirrors src/lib/palette.ts; DESIGN.md is the contract.
 * Dark cartographic war room: the map carries the colour, the interface stays
 * quiet, and faction pigments are reserved for things that belong to a side.
 */
const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          950: '#06090b',
          900: '#090d10',
          850: '#0c1114',
          800: '#0f1519',
          700: '#151d22',
          600: '#1c262c',
          500: '#26323a',
          400: '#3a4a54',
        },
        fg: {
          DEFAULT: '#e3e7e8',
          2: '#a7b1b5',
          3: '#7d898e',
        },
        accent: { DEFAULT: '#d4ab57', dim: '#8f7440' },
        alert: '#e0614f',
        empire: { DEFAULT: '#c9473d', deep: '#5c1914', pale: '#ee9086' },
        tempest: { DEFAULT: '#2f9e7e', deep: '#0f4636', pale: '#86d8bd' },
        dwargon: { DEFAULT: '#5b8fd8', deep: '#1c365e', pale: '#a9c8f2' },
        neutralstate: { DEFAULT: '#c29a45', deep: '#57421a', pale: '#e6cc91' },
        unknown: { DEFAULT: '#878f93', deep: '#363c40', pale: '#c3c9cc' },
        prov: {
          canon: '#cfe5dc',
          visual: '#8fc9b6',
          inferred: '#d9b56a',
          recon: '#c79a4e',
          unresolved: '#e0614f',
        },
      },
      fontFamily: {
        ui: ['var(--font-ui)', 'system-ui', 'Segoe UI', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'Consolas', 'monospace'],
        display: ['var(--font-display)', 'Georgia', 'serif'],
      },
      fontSize: {
        '2xs': ['10.5px', { lineHeight: '14px', letterSpacing: '0.02em' }],
        xs: ['12px', { lineHeight: '16px' }],
        sm: ['13px', { lineHeight: '18px' }],
        base: ['14px', { lineHeight: '20px' }],
      },
      letterSpacing: {
        label: '0.08em',
      },
      boxShadow: {
        panel: '0 1px 0 rgba(255,255,255,0.03) inset, 0 12px 32px -12px rgba(0,0,0,0.7)',
      },
      transitionTimingFunction: {
        out: 'cubic-bezier(0.22, 0.61, 0.36, 1)',
      },
    },
  },
  plugins: [],
};

export default config;
