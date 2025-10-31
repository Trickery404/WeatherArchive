import prettier from 'eslint-config-prettier';
import { fileURLToPath } from 'node:url';
import { includeIgnoreFile } from '@eslint/compat';
import js from '@eslint/js';
import svelte from 'eslint-plugin-svelte';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import svelteConfig from './svelte.config.js';

const gitignorePath = fileURLToPath(new URL('./.gitignore', import.meta.url));

/** @type {import('eslint').Linter.Config[]} */
export default [
	includeIgnoreFile(gitignorePath),

	js.configs.recommended,

	...tslint.configs.recommended,

	...svelte.configs['flat/recommended'],

	prettier,
	...svelte.configs.prettier,

	{
		files: ['**/*.svelte'],
		languageOptions: {
			parser: svelte.parser,
			parserOptions: {
				svelteConfig,
				svelteFeatures: { typed: true }
			},
			globals: { ...globals.browser, ...globals.node }
		}
	},

	{
		files: ['**/*.{ts,tsx}'],
		languageOptions: {
			parser: tslint.parser,
			parserOptions: {
				ecmaVersion: 'latest',
				sourceType: 'module'
			}
		}
	}
];
