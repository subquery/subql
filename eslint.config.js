const {defineConfig, globalIgnores} = require('eslint/config');

const globals = require('globals');
const tsParser = require('@typescript-eslint/parser');
const typescriptEslint = require('@typescript-eslint/eslint-plugin');
const headers = require('eslint-plugin-headers');
const importX = require('eslint-plugin-import-x');
const sortDestructureKeys = require('eslint-plugin-sort-destructure-keys');
const jest = require('eslint-plugin-jest');
const eslintConfigPrettier = require('eslint-config-prettier');

const js = require('@eslint/js');

module.exports = defineConfig([
  js.configs.recommended,
  {
    files: ['**/*.ts'],
    languageOptions: {
      globals: {
        ...globals.node,
      },

      parser: tsParser,

      parserOptions: {
        tsconfigRootDir: __dirname,
        project: true,
        warnOnUnsupportedTypeScriptVersion: false,
      },
    },

    plugins: {
      headers,
      import: importX,
      'sort-destructure-keys': sortDestructureKeys,
      '@typescript-eslint': typescriptEslint,
    },

    rules: {
      ...typescriptEslint.configs['recommended'].rules,
      ...typescriptEslint.configs['recommended-type-checked'].rules,
      'require-await': 'off',
      '@typescript-eslint/require-await': 'error',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/no-unsafe-enum': 'off',
      '@typescript-eslint/no-unnecessary-type-assertion': 'off',
      '@typescript-eslint/restrict-plus-operands': 'off',
      '@typescript-eslint/restrict-template-expressions': 'off',
      '@typescript-eslint/no-unsafe-enum-comparison': 'off',
      '@typescript-eslint/no-base-to-string': 'off',
      '@typescript-eslint/unbound-method': 'warn',
      '@typescript-eslint/no-floating-promises': 'warn',
      '@typescript-eslint/explicit-module-boundary-types': 'warn',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-require-imports': 'warn',
      '@typescript-eslint/no-unused-vars': 'warn',
      '@typescript-eslint/ban-ts-comment': 'warn',
      '@typescript-eslint/no-inferrable-types': 'warn',
      '@typescript-eslint/await-thenable': 'error',
      '@typescript-eslint/dot-notation': 'error',
      '@typescript-eslint/no-non-null-assertion': 'error',

      '@typescript-eslint/explicit-member-accessibility': [
        'error',
        {
          accessibility: 'no-public',
        },
      ],

      '@typescript-eslint/no-namespace': [
        'error',
        {
          allowDeclarations: true,
        },
      ],

      '@typescript-eslint/promise-function-async': [
        'error',
        {
          checkArrowFunctions: false,
        },
      ],

      complexity: ['error', 20],
      curly: ['error', 'multi-line'],
      'default-case': 'error',
      eqeqeq: ['error', 'always'],
      'import/no-extraneous-dependencies': 'off',

      'import/order': [
        'error',
        {
          alphabetize: {
            order: 'asc',
            caseInsensitive: true,
          },
        },
      ],

      'headers/header-format': [
        'error',
        {
          source: 'string',
          style: 'line',
          variables: {
            year: '2020-2025',
          },
          patterns: {
            year: {
              pattern: '\\d{4}(-\\d{4})?',
              defaultValue: '2020-2025',
            },
          },
          content: 'Copyright {year} SubQuery Pte Ltd authors & contributors\nSPDX-License-Identifier: GPL-3.0',
        },
      ],

      'sort-destructure-keys/sort-destructure-keys': [
        2,
        {
          caseSensitive: true,
        },
      ],

      'no-undef': 'off', //https://typescript-eslint.io/troubleshooting/faqs/eslint/#i-get-errors-from-the-no-undef-rule-about-global-variables-not-being-defined-even-though-there-are-no-typescript-errors
      'no-console': 'off',
      'no-duplicate-imports': 'error',
      'no-return-await': 'error',
      'no-undef-init': 'error',
      'prefer-template': 'error',
      'use-isnan': 'error',
      ...eslintConfigPrettier.rules,
    },

    settings: {
      'import/extensions': ['.js', '.ts'],

      'import/parsers': {
        '@typescript-eslint/parser': ['.ts', '.tsx'],
      },
    },
  },
  {
    files: ['**/*.test.ts', '**/*.spec.ts'],

    plugins: {
      jest,
    },

    languageOptions: {
      globals: {
        ...globals.jest,
      },
    },

    rules: {
      ...jest.configs['flat/recommended'].rules,
      '@typescript-eslint/no-non-null-assertion': 'off',
    },
  },
  globalIgnores([
    'build/**/*',
    'api_docs/**/*',
    '**/node_modules/**/*',
    '**/test/**/*',
    'scripts/*',
    'packages/**/dist/**/*',
    'packages/**/lib/**/*',
    '**/.eslintrc.js',
    '**/*.proto',
    '**/*.ts.snap',
    '**/sourcemap-test-*.js',
    '**/*.js',
    'packages/cli/graphql-codegen.ts',
    'packages/cli/src/controller/network/__graphql__/**/*',
  ]),
]);
