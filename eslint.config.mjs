import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTypescript from 'eslint-config-next/typescript';

// eslint-config-next 16 ships flat configs (with the React Compiler rules of react-hooks 7).
const config = [
  {
    ignores: ['node_modules/**', '.next/**', 'out/**', 'public/data/**', 'next-env.d.ts', 'Sources of Truth/**', 'qa-artifacts/**'],
  },
  ...nextVitals,
  ...nextTypescript,
  {
    rules: {
      '@next/next/no-img-element': 'off',
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },
];

export default config;
