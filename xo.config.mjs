// XO flat-config overrides for career-architect.
//
// Note: XO's config-discovery (cosmiconfig) stops at the first match, so
// `package.json#xo` would shadow this file. Keep XO config in this file only.
//
// Project-wide rule disables for this Next.js + bundler setup, plus a small
// file-level parser false-positive override for the sample data helper.

/** @type {import('xo').FlatXoConfig} */
const config = [
  // XO base options (formerly in package.json#xo)
  {
    space: 2,
    semicolon: true,
    prettier: false,
  },
  // Project-wide rule overrides
  {
    rules: {
      '@typescript-eslint/naming-convention': 'off',
      'react/react-in-jsx-scope': 'off',
      // Stylistic-only; the math expressions in animation code are intentional
      '@stylistic/no-mixed-operators': 'off',
      '@stylistic/operator-linebreak': 'off',
      '@stylistic/indent-binary-ops': 'off',
      '@stylistic/padding-line-between-statements': 'off',
      // TS path aliases (`@/...`) are resolved by Next.js bundler; no extension needed
      'import-x/extensions': 'off',
      // `e` for events is universal React convention
      'unicorn/prevent-abbreviations': 'off',
      // tsconfig target is es2017; toSorted/replaceAll are es2023
      'unicorn/no-array-sort': 'off',
      'unicorn/prefer-string-replace-all': 'off',
      // tsconfig target is es2017; RegExp v flag requires es2024
      'require-unicode-regexp': 'off',
      // Reduce is fine for typed accumulator patterns; readability call
      'unicorn/no-array-reduce': 'off',
      // String.fromCharCode is fine for BMP code points
      'unicorn/prefer-code-point': 'off',
      // Next.js font helpers (Inter, Roboto, ...) capitalized by convention
      'new-cap': 'off',
    },
  },
  // File-level overrides
  {
    files: ['src/lib/sample-data.ts'],
    rules: {
      // Map.entries() destructuring: XO resolver widens to any
      '@typescript-eslint/no-unsafe-assignment': 'off',
    },
  },
];

export default config;
