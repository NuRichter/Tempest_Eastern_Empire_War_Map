import type { Config } from 'tailwindcss';

/**
 * Palette discipline (brief §42): archival, cartographic, desaturated.
 * No neon, no video-game saturation. Every colour is a muted pigment
 * drawn from printed military atlases and aged chart paper.
 */
const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          900: '#0a0d0e',
          850: '#0f1315',
          800: '#14191b',
          700: '#1b2124',
          600: '#242b2f',
          500: '#323a3f',
          400: '#4a545a',
        },
        chart: {
          paper: '#cdc4b0',
          vellum: '#b6ab93',
          rule: '#5c5a4e',
          faint: '#7d7a6c',
        },
        empire: {
          DEFAULT: '#8c3a31',
          deep: '#5e2721',
          pale: '#b4685c',
        },
        tempest: {
          DEFAULT: '#3f6b5a',
          deep: '#2a4a3d',
          pale: '#6d9b87',
        },
        dwargon: {
          DEFAULT: '#4b5f73',
          deep: '#33424f',
          pale: '#7d95aa',
        },
        neutralstate: {
          DEFAULT: '#8a7844',
          deep: '#5e5230',
        },
        unknown: {
          DEFAULT: '#6b6b63',
          deep: '#48483f',
        },
        brass: '#a08a52',
      },
      fontFamily: {
        atlas: [
          'Iowan Old Style',
          'Palatino Linotype',
          'Book Antiqua',
          'Palatino',
          'Georgia',
          'Cambria',
          'serif',
        ],
        ui: [
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'sans-serif',
        ],
        figure: [
          'ui-monospace',
          'SFMono-Regular',
          'SF Mono',
          'Cascadia Mono',
          'Menlo',
          'Consolas',
          'monospace',
        ],
      },
      fontSize: {
        micro: ['10px', { lineHeight: '14px', letterSpacing: '0.02em' }],
        tiny: ['11px', { lineHeight: '15px' }],
      },
      boxShadow: {
        panel: '0 18px 48px -18px rgba(0,0,0,0.85)',
      },
      transitionTimingFunction: {
        camera: 'cubic-bezier(0.22, 0.61, 0.36, 1)',
      },
    },
  },
  plugins: [],
};

export default config;
