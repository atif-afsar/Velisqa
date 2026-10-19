import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    rules: {
      // React Compiler performance hints. The flagged effects are intentional fetch-on-mount /
      // reset patterns that behave correctly, so they are surfaced as warnings, not failures.
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/purity': 'warn',
    },
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
  },
  {
    // Context modules export their provider together with the matching hook.
    files: ['src/context/**/*.jsx'],
    rules: { 'react-refresh/only-export-components': 'off' },
  },
])
