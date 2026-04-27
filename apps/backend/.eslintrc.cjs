module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: { project: ['tsconfig.json', 'tsconfig.test.json'], sourceType: 'module' },
  plugins: ['@typescript-eslint'],
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended'],
  env: { node: true, jest: true },
  ignorePatterns: ['dist', 'node_modules'],
};
