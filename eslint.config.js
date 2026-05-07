// Flat config — enforces project conventions per spec §11.
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const tsParser = require('@typescript-eslint/parser');
const tsPlugin = require('@typescript-eslint/eslint-plugin');

module.exports = defineConfig([
  expoConfig,
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: tsParser,
      parserOptions: { project: false },
    },
    plugins: { '@typescript-eslint': tsPlugin },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      'no-else-return': ['error', { allowElseIf: false }],
      'no-console': 'error',
      'no-restricted-syntax': [
        'error',
        {
          selector: 'IfStatement > BlockStatement > IfStatement[alternate]',
          message: 'Prefer early returns over else branches.',
        },
        {
          selector: 'ConditionalExpression > ConditionalExpression',
          message: 'No nested ternaries — use early returns or switch.',
        },
      ],
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/services/logger', '@/services/logger'],
              importNames: ['default'],
              message: 'Import the named `logger` export, not default.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/services/logger.ts'],
    rules: { 'no-console': 'off' },
  },
  {
    ignores: ['dist/*', 'node_modules/*', '.expo/*', 'supabase/functions/**', 'ios/*', 'android/*'],
  },
]);
