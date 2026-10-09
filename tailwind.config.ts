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
        // Interface tokens are CSS variables (globals.css) so the whole UI can
        // switch between the dark and the light theme; faction colours are fixed.
        ink: {
          950: 'rgb(var(--ink-950) / <alpha-value>)',
          900: 'rgb(var(--ink-900) / <alpha-value>)',
          850: 'rgb(var(--ink-850) / <alpha-value>)',
          800: 'rgb(var(--ink-800) / <alpha-value>)',
          700: 'rgb(var(--ink-700) / <alpha-value>)',
          600: 'rgb(var(--ink-600) / <alpha-value>)',
          500: 'rgb(var(--ink-500) / <alpha-value>)',
          400: 'rgb(var(--ink-400) / <alpha-value>)',
        },
        fg: {
          DEFAULT: 'rgb(var(--fg) / <alpha-value>)',
          2: 'rgb(var(--fg-2) / <alpha-value>)',
          3: 'rgb(var(--fg-3) / <alpha-value>)',
        },
        accent: { DEFAULT: 'rgb(var(--accent) / <alpha-value>)', dim: 'rgb(var(--accent-dim) / <alpha-value>)' },
        alert: 'rgb(var(--alert) / <alpha-value>)',
        empire: { DEFAULT: '#c9473d', deep: '#5c1914', pale: '#ee9086' },
        tempest: { DEFAULT: '#2f9e7e', deep: '#0f4636', pale: '#86d8bd' },
        dwargon: { DEFAULT: '#5b8fd8', deep: '#1c365e', pale: '#a9c8f2' },
        neutralstate: { DEFAULT: '#c29a45', deep: '#57421a', pale: '#e6cc91' },
        unknown: { DEFAULT: '#878f93', deep: '#363c40', pale: '#c3c9cc' },
        prov: {
          canon: 'rgb(var(--prov-canon) / <alpha-value>)',
          visual: 'rgb(var(--prov-visual) / <alpha-value>)',
          inferred: 'rgb(var(--prov-inferred) / <alpha-value>)',
          recon: 'rgb(var(--prov-recon) / <alpha-value>)',
          unresolved: 'rgb(var(--prov-unresolved) / <alpha-value>)',
        },
      },
      fontFamily: {
        ui: ['var(--font-ui)', 'system-ui', 'Segoe UI', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'Consolas', 'monospace'],
        display: ['var(--font-display)', 'Georgia', 'serif'],
        cine: ['var(--font-cine)', 'var(--font-display)', 'Georgia', 'serif'],
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
        panel: 'var(--shadow-panel)',
      },
      transitionTimingFunction: {
        out: 'cubic-bezier(0.22, 0.61, 0.36, 1)',
      },
    },
  },
  plugins: [],
};

export default config;
