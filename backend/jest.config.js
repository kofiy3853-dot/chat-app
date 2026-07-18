module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.js'],
  collectCoverageFrom: [
    'controllers/**/*.js',
    'middleware/**/*.js',
    'utils/**/*.js',
  ],
  coverageDirectory: 'coverage',
  setupFiles: ['<rootDir>/tests/setup.js'],
  setupFilesAfterFramework: ['<rootDir>/tests/setupAfterFramework.js'],
  clearMocks: true,
  restoreMocks: true,
  testTimeout: 10000,
  // uuid v9+ uses ESM exports — transform it for Jest CJS
  transformIgnorePatterns: [
    '/node_modules/(?!uuid/)',
  ],
  moduleNameMapper: {
    // Ensure all prisma client imports resolve to the same mock
    '^\\.\\./prisma/client$': '<rootDir>/tests/__mocks__/prisma/client.js',
    '^\\.\\./\\.\\./prisma/client$': '<rootDir>/tests/__mocks__/prisma/client.js',
    '^\\.\\./\\.\\./\\.\\./prisma/client$': '<rootDir>/tests/__mocks__/prisma/client.js',
    // Mock uuid to avoid ESM issues
    '^uuid$': '<rootDir>/tests/__mocks__/uuid.js',
    // Mock morphsdk to avoid ESM issues
    '^@morphllm/morphsdk$': '<rootDir>/tests/__mocks__/morphsdk.js',
  },
};
