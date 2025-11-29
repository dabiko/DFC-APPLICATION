// For more info, see https://github.com/storybookjs/eslint-plugin-storybook#configuration-flat-config-format
import storybook from "eslint-plugin-storybook";

import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import prettier from 'eslint-plugin-prettier'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist', 'node_modules', 'coverage', 'build', '.storybook-build', 'storybook-static']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
    },
    plugins: {
      prettier,
    },
    rules: {
      // React Refresh
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],

      // TypeScript specific rules
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
          destructuredArrayIgnorePattern: '^_',
          ignoreRestSiblings: true,
        },
      ],
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-non-null-assertion': 'warn',

      // General rules
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'prefer-const': 'error',
      'no-var': 'error',
      'no-control-regex': 'warn',
      'no-case-declarations': 'error',
      'no-useless-escape': 'warn',

      // React Hooks rules - temporarily warn instead of error
      'react-hooks/exhaustive-deps': 'warn',
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/rules-of-hooks': 'error',
      // Temporarily warn for these new strict rules - to be fixed later
      'react-hooks/purity': 'warn',
      'react-hooks/static-components': 'warn',
      // React Compiler memoization warnings
      'react-hooks/preserve-manual-memoization': 'warn',

      // Prettier integration
      'prettier/prettier': 'error',
    },
  },
  // Storybook-specific configuration
  {
    files: ['**/*.stories.{ts,tsx}'],
    rules: {
      // Allow React Hooks in Storybook render functions
      'react-hooks/rules-of-hooks': 'off',

      // Allow any types in stories for demonstration purposes
      '@typescript-eslint/no-explicit-any': 'off',

      // Allow console.log in stories for demonstration
      'no-console': 'off',

      // Storybook stories don't need to be exported as components
      'react-refresh/only-export-components': 'off',
    },
  },
  // Component files - allow empty interfaces for prop types
  {
    files: ['src/components/**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-empty-object-type': 'off',
    },
  },
])
