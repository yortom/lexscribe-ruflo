import type { Config } from 'jest';

const config: Config = {
  rootDir: '.',
  testRegex: '.*\\.e2e-spec\\.ts$',
  transform: { '^.+\\.(t|j)s$': 'ts-jest' },
  moduleFileExtensions: ['ts', 'js', 'json'],
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/test/setup-e2e.ts'],
  testTimeout: 30000,
  moduleNameMapper: {
    '^@lexscribe/(.*)$': '<rootDir>/../../packages/$1/src',
  },
};
export default config;
