import type { Config } from 'jest';

const config: Config = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testRegex: '.*\\.spec\\.ts$',
  transform: { '^.+\\.(t|j)s$': 'ts-jest' },
  collectCoverageFrom: [
    'src/**/*.(t|j)s',
    '!src/**/*.spec.ts',
    '!src/**/*.e2e-spec.ts',
    '!src/**/index.ts',
    '!src/**/*.module.ts',
  ],
  coverageDirectory: './coverage',
  coverageThreshold: {
    global: {
      branches: 0,
      functions: 0,
      lines: 0,
      statements: 0,
    },
    './src/modules/contactos/': {
      branches: 70,
      functions: 80,
      lines: 80,
      statements: 80,
    },
    './src/modules/plantillas/': {
      branches: 70,
      functions: 80,
      lines: 80,
      statements: 80,
    },
    './src/modules/documentos/': {
      lines: 80,
      functions: 80,
      branches: 60,
      statements: 80,
    },
    './src/modules/eventos/': {
      lines: 80,
      functions: 80,
      branches: 60,
      statements: 80,
    },
    './src/modules/facturacion/': {
      lines: 80,
      functions: 80,
      branches: 60,
      statements: 80,
    },
  },
  testEnvironment: 'node',
  // MongoMemoryServer.create() downloads the mongod binary on a cold CI cache,
  // which routinely exceeds Jest's default 5s hook timeout. Give beforeAll
  // hooks and tests enough headroom so the first suite to trigger the download
  // doesn't fail (e.g. soft-delete.plugin.spec.ts).
  testTimeout: 30000,
  setupFiles: ['<rootDir>/test/setup-unit.ts'],
  moduleNameMapper: {
    '^@lexscribe/(.*)$': '<rootDir>/../../packages/$1/src',
  },
};
export default config;
