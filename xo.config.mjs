// XO flat-config overrides for career-architect.
//
// Note: XO's config-discovery (cosmiconfig) stops at the first match, so
// `package.json#xo` would shadow this file. Keep XO config in this file only.
//
// Project-wide rule disables (false positives for this Next.js + bundler setup),
// then targeted file-level disables for the canvas/animation modules where
// XO's TS-resolver mis-infers any-typed values. `tsc --noEmit` remains the
// authoritative type-safety gate.

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
    files: ['src/components/ui/extreme-effects.tsx'],
    rules: {
      // useMemo + canvas particle objects: XO TS-resolver widens to any,
      // but tsc --noEmit is clean. Real type safety is enforced by tsc.
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/restrict-plus-operands': 'off',
    },
  },
  {
    files: ['src/lib/sample-data.ts'],
    rules: {
      // Map.entries() destructuring: XO resolver widens to any
      '@typescript-eslint/no-unsafe-assignment': 'off',
    },
  },
];

export default config;
