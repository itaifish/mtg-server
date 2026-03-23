import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';
import prettier from 'eslint-plugin-prettier';

export default [
	{
		files: ['src/**/*.ts'],
		languageOptions: {
			parser: tsparser,
			parserOptions: {
				project: './tsconfig.json',
				sourceType: 'module',
			},
		},
		plugins: {
			'@typescript-eslint': tseslint,
			prettier,
		},
		rules: {
			...tseslint.configs.recommended.rules,
			'prettier/prettier': 'error',
		},
	},
	{
		ignores: ['node_modules', 'dist', 'mtg-client', '*.js', '*.d.ts'],
	},
];
