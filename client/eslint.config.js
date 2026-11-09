import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import { defineConfig, globalIgnores } from 'eslint/config';

// Custom plugin to properly mark JSX component identifiers as used in ESLint's scope manager
const jsxUsesVarsPlugin = {
  rules: {
    'jsx-uses-vars': {
      meta: {
        type: 'problem',
        docs: {
          description: 'Mark variables used in JSX as used in ESLint scope analysis',
        },
        schema: [],
      },
      create(context) {
        return {
          JSXOpeningElement(node) {
            let target = node.name;
            while (target.type === 'JSXMemberExpression') {
              target = target.object;
            }
            if (target.type === 'JSXIdentifier') {
              context.sourceCode.markVariableAsUsed(target.name);
            }
          },
        };
      },
    },
  },
};

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx}'],
    plugins: {
      'jsx-detection': jsxUsesVarsPlugin,
    },
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    rules: {
      'jsx-detection/jsx-uses-vars': 'error',
      'react-hooks/set-state-in-effect': 'off',
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    },
  },
]);
